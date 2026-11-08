use anyhow::Result;
use axum::{
    routing::{get, post},
    Router,
};
use std::sync::Arc;
use tower_http::{
    cors::CorsLayer,
    services::{ServeDir, ServeFile},
};

mod api;
mod db;
mod github;
mod signing;
mod storage;

pub struct AppState {
    pub signing: signing::SigningService,
    pub db: db::Database,
    pub storage: storage::Storage,
    pub github: github::GitHubClient,
    pub backend_url: String,
}

#[tokio::main]
async fn main() -> Result<()> {
    tracing_subscriber::fmt::init();

    let port: u16 = std::env::var("PORT").unwrap_or_else(|_| "3000".into()).parse()?;
    let backend_url = std::env::var("BACKEND_URL").unwrap_or_else(|_| format!("http://localhost:{}", port));
    let github_token = std::env::var("GITHUB_TOKEN").unwrap_or_else(|_| "".into());
    let generator_repo = std::env::var("GENERATOR_REPO").unwrap_or_else(|_| "databk/rustdesk-generator".into());
    let generator_ref = std::env::var("GENERATOR_REF").unwrap_or_else(|_| "main".into());
    let data_dir = std::env::var("DATA_DIR").unwrap_or_else(|_| "./data".into());
    let static_dir = std::env::var("STATIC_DIR").unwrap_or_else(|_| "./frontend/out".into());

    let signing = signing::SigningService::from_env()?;
    let db = db::Database::new(&format!("{}/builds.json", data_dir))?;
    let storage = storage::Storage::new(&data_dir)?;
    let github = github::GitHubClient::new(github_token, generator_repo, generator_ref);

    let state = Arc::new(AppState {
        signing,
        db,
        storage,
        github,
        backend_url,
    });

    let serve_dir = ServeDir::new(&static_dir)
        .fallback(ServeFile::new(format!("{}/index.html", static_dir)));

    let app = Router::new()
        .route("/api/trigger", post(api::trigger))
        .route("/api/build/:id", get(api::get_build))
        .route("/api/build/:id/config", get(api::get_config))
        .route("/api/build/:id/logo/:name", get(api::get_logo))
        .route("/api/build/:id/callback", post(api::callback))
        .route("/api/upload-logo", post(api::upload_logo))
        .route("/api/download/:id/:filename", get(api::download))
        .fallback_service(serve_dir)
        .layer(CorsLayer::permissive())
        .with_state(state);

    let listener = tokio::net::TcpListener::bind(format!("0.0.0.0:{}", port)).await?;
    tracing::info!("Server running on port {}", port);
    axum::serve(listener, app).await?;

    Ok(())
}
