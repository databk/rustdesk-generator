use crate::{db::{BuildRecord, BuildStatus}, github, signing::CustomConfig, AppState};
use axum::{
    extract::{Multipart, Path, State},
    http::{header, HeaderMap, StatusCode},
    response::{IntoResponse, Json, Response},
};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use uuid::Uuid;

#[derive(Deserialize)]
pub struct TriggerRequest {
    pub os: String,
    pub arch: Option<String>,
    #[serde(default)]
    pub custom: CustomConfig,
    #[allow(dead_code)]
    pub turnstile_token: Option<String>,
}

#[derive(Serialize)]
pub struct TriggerResponse {
    pub uuid: String,
    pub status: String,
    pub message: String,
}

#[derive(Serialize)]
pub struct ConfigResponse {
    pub custom_txt: String,
    pub public_key: String,
    pub logos: Vec<String>,
}

pub async fn trigger(
    State(state): State<Arc<AppState>>,
    Json(req): Json<TriggerRequest>,
) -> Result<Json<TriggerResponse>, (StatusCode, String)> {
    let uuid = Uuid::new_v4().to_string();
    let callback_token = Uuid::new_v4().to_string();
    let backend_url = format!("{}/api/build/{}", state.backend_url, uuid);

    let workflow_file = github::resolve_workflow_file(&req.os, req.arch.as_deref().unwrap_or(""))
        .map_err(|e| (StatusCode::BAD_REQUEST, e.to_string()))?;

    let custom_json = serde_json::to_string(&req.custom).ok();

    let record = BuildRecord {
        uuid: uuid.clone(),
        status: BuildStatus::Pending,
        os: req.os.clone(),
        arch: req.arch.clone().unwrap_or_default(),
        custom: custom_json,
        callback_token: callback_token.clone(),
        created_at: chrono::Utc::now(),
        files: None,
        message: None,
        github_run_id: None,
    };
    state.db.insert(record).await;

    match state.github.trigger_workflow(&workflow_file, &uuid, &backend_url, &callback_token).await {
        Ok(run_id) => {
            if let Some(id) = run_id {
                state.db.update_run_id(&uuid, id).await;
            }
            Ok(Json(TriggerResponse {
                uuid,
                status: "pending".into(),
                message: "Build submitted".into(),
            }))
        }
        Err(e) => {
            state.db.update_status(&uuid, BuildStatus::Failed, Some(e.to_string()), None).await;
            Err((StatusCode::BAD_GATEWAY, e.to_string()))
        }
    }
}

pub async fn get_config(
    State(state): State<Arc<AppState>>,
    Path(id): Path<String>,
    headers: HeaderMap,
) -> Result<Json<ConfigResponse>, (StatusCode, String)> {
    let callback_token = headers
        .get("X-Callback-Token")
        .and_then(|v| v.to_str().ok())
        .ok_or((StatusCode::UNAUTHORIZED, "Missing callback token".into()))?;

    let record = state.db.get(&id).await
        .ok_or((StatusCode::NOT_FOUND, "Build not found".into()))?;

    if record.callback_token != callback_token {
        return Err((StatusCode::UNAUTHORIZED, "Invalid callback token".into()));
    }

    let custom: CustomConfig = record.custom
        .as_deref()
        .and_then(|s| serde_json::from_str(s).ok())
        .unwrap_or_default();

    let custom_txt = state.signing.generate_signed_custom_txt(&custom);
    let public_key = state.signing.get_public_key_base64();
    let logos = state.storage.list_logos();

    Ok(Json(ConfigResponse {
        custom_txt,
        public_key,
        logos,
    }))
}

pub async fn get_logo(
    State(state): State<Arc<AppState>>,
    Path((id, name)): Path<(String, String)>,
    headers: HeaderMap,
) -> Result<Response, (StatusCode, String)> {
    let callback_token = headers
        .get("X-Callback-Token")
        .and_then(|v| v.to_str().ok())
        .ok_or((StatusCode::UNAUTHORIZED, "Missing callback token".into()))?;

    let record = state.db.get(&id).await
        .ok_or((StatusCode::NOT_FOUND, "Build not found".into()))?;
    if record.callback_token != callback_token {
        return Err((StatusCode::UNAUTHORIZED, "Invalid callback token".into()));
    }

    let path = state.storage.get_logo_path(&name)
        .ok_or((StatusCode::NOT_FOUND, "Logo not found".into()))?;
    let data = std::fs::read(&path).map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let mime = guess_mime(&name);
    Ok((
        StatusCode::OK,
        [(header::CONTENT_TYPE, mime)],
        data,
    ).into_response())
}

pub async fn callback(
    State(state): State<Arc<AppState>>,
    Path(id): Path<String>,
    headers: HeaderMap,
    mut multipart: Multipart,
) -> Result<StatusCode, (StatusCode, String)> {
    let callback_token = headers
        .get("X-Callback-Token")
        .and_then(|v| v.to_str().ok())
        .ok_or((StatusCode::UNAUTHORIZED, "Missing callback token".into()))?;

    let record = state.db.get(&id).await
        .ok_or((StatusCode::NOT_FOUND, "Build not found".into()))?;
    if record.callback_token != callback_token {
        return Err((StatusCode::UNAUTHORIZED, "Invalid callback token".into()));
    }

    let mut status = String::new();
    let mut message: Option<String> = None;
    let mut saved_files: Vec<String> = Vec::new();

    while let Some(field) = multipart.next_field().await
        .map_err(|e| (StatusCode::BAD_REQUEST, e.to_string()))?
    {
        let field_name = field.name().unwrap_or("").to_string();
        match field_name.as_str() {
            "status" => {
                status = field.text().await.map_err(|e| (StatusCode::BAD_REQUEST, e.to_string()))?;
            }
            "message" => {
                message = Some(field.text().await.map_err(|e| (StatusCode::BAD_REQUEST, e.to_string()))?);
            }
            "files" => {
                let filename = field.file_name().unwrap_or("unknown").to_string();
                let data = field.bytes().await.map_err(|e| (StatusCode::BAD_REQUEST, e.to_string()))?;
                state.storage.save_build_file(&id, &filename, &data)
                    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
                saved_files.push(filename);
            }
            _ => {}
        }
    }

    let new_status = match status.as_str() {
        "completed" => BuildStatus::Completed,
        "failed" => BuildStatus::Failed,
        "building" => BuildStatus::Building,
        _ => return Err((StatusCode::BAD_REQUEST, "Invalid status".into())),
    };

    let files = if saved_files.is_empty() { None } else { Some(saved_files) };
    state.db.update_status(&id, new_status, message, files).await;

    Ok(StatusCode::OK)
}

#[derive(Serialize)]
pub struct BuildStatusResponse {
    pub uuid: String,
    pub status: String,
    pub os: String,
    pub arch: String,
    pub created_at: String,
    pub files: Vec<String>,
    pub message: Option<String>,
}

pub async fn get_build(
    State(state): State<Arc<AppState>>,
    Path(id): Path<String>,
) -> Result<Json<BuildStatusResponse>, (StatusCode, String)> {
    let record = state.db.get(&id).await
        .ok_or((StatusCode::NOT_FOUND, "Build not found".into()))?;
    Ok(Json(BuildStatusResponse {
        uuid: record.uuid,
        status: format!("{:?}", record.status).to_lowercase(),
        os: record.os,
        arch: record.arch,
        created_at: record.created_at.to_rfc3339(),
        files: record.files.unwrap_or_default(),
        message: record.message,
    }))
}

pub async fn upload_logo(
    State(state): State<Arc<AppState>>,
    mut multipart: Multipart,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    while let Some(field) = multipart.next_field().await
        .map_err(|e| (StatusCode::BAD_REQUEST, e.to_string()))?
    {
        if field.name() == Some("logo") {
            let filename = field.file_name().unwrap_or("logo.png").to_string();
            let data = field.bytes().await.map_err(|e| (StatusCode::BAD_REQUEST, e.to_string()))?;
            state.storage.save_logo(&filename, &data)
                .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
            return Ok(Json(serde_json::json!({ "filename": filename })));
        }
    }
    Err((StatusCode::BAD_REQUEST, "No logo field found".into()))
}

pub async fn download(
    State(state): State<Arc<AppState>>,
    Path((id, filename)): Path<(String, String)>,
) -> Result<Response, (StatusCode, String)> {
    let path = state.storage.get_build_file_path(&id, &filename)
        .ok_or((StatusCode::NOT_FOUND, "File not found".into()))?;
    let data = std::fs::read(&path).map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let mime = guess_mime(&filename);
    let disposition = format!("attachment; filename=\"{}\"", filename);
    Ok((
        StatusCode::OK,
        [
            (header::CONTENT_TYPE, mime),
            (header::CONTENT_DISPOSITION, disposition.as_str()),
        ],
        data,
    ).into_response())
}

fn guess_mime(filename: &str) -> &'static str {
    let ext = filename.rsplit('.').next().unwrap_or("");
    match ext {
        "apk" => "application/vnd.android.package-archive",
        "exe" => "application/x-msdownload",
        "msi" => "application/x-msi",
        "dmg" => "application/x-apple-diskimage",
        "deb" => "application/x-debian-package",
        "rpm" => "application/x-rpm",
        "zip" => "application/zip",
        "flatpak" => "application/vnd.flatpak",
        "png" => "image/png",
        "jpg" | "jpeg" => "image/jpeg",
        "svg" => "image/svg+xml",
        "ico" => "image/x-icon",
        _ => "application/octet-stream",
    }
}
