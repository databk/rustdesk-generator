use anyhow::{Context, Result};
use serde::{Deserialize, Serialize};

#[derive(Clone)]
pub struct GitHubClient {
    token: String,
    repo: String,
    ref_name: String,
}

#[derive(Serialize)]
struct DispatchRequest {
    r#ref: String,
    inputs: DispatchInputs,
}

#[derive(Serialize)]
struct DispatchInputs {
    #[serde(rename = "build-id")]
    build_id: String,
    #[serde(rename = "backend-url")]
    backend_url: String,
    #[serde(rename = "callback-token")]
    callback_token: String,
}

#[derive(Deserialize)]
struct DispatchResponse {
    workflow_run_id: Option<i64>,
}

impl GitHubClient {
    pub fn new(token: String, repo: String, ref_name: String) -> Self {
        Self { token, repo, ref_name }
    }

    pub async fn trigger_workflow(
        &self,
        workflow_file: &str,
        build_id: &str,
        backend_url: &str,
        callback_token: &str,
    ) -> Result<Option<String>> {
        let url = format!(
            "https://api.github.com/repos/{}/actions/workflows/{}/dispatches",
            self.repo, workflow_file
        );

        let body = DispatchRequest {
            r#ref: self.ref_name.clone(),
            inputs: DispatchInputs {
                build_id: build_id.to_string(),
                backend_url: backend_url.to_string(),
                callback_token: callback_token.to_string(),
            },
        };

        let client = reqwest::Client::new();
        let resp = client
            .post(&url)
            .header("Authorization", format!("Bearer {}", self.token))
            .header("Accept", "application/vnd.github+json")
            .header("X-GitHub-Api-Version", "2026-03-10")
            .json(&body)
            .send()
            .await
            .context("Failed to send GitHub dispatch request")?;

        if !resp.status().is_success() {
            let status = resp.status();
            let text = resp.text().await.unwrap_or_default();
            anyhow::bail!("GitHub dispatch failed: {} {}", status, text);
        }

        let dispatch_resp: DispatchResponse = resp.json().await.unwrap_or(DispatchResponse { workflow_run_id: None });
        Ok(dispatch_resp.workflow_run_id.map(|id| id.to_string()))
    }
}

pub fn resolve_workflow_file(os: &str, arch: &str) -> Result<String> {
    if os == "all" {
        return Ok("flutter-build.yml".into());
    }
    let key = format!("{}/{}", os, arch);
    let map: &[(&str, &str)] = &[
        ("windows/x86_64", "windows-x86_64.yml"),
        ("windows/x86", "windows-x86.yml"),
        ("windows/aarch64", "windows-aarch64.yml"),
        ("linux/x86_64", "linux-x86_64.yml"),
        ("linux/aarch64", "linux-aarch64.yml"),
        ("linux/armv7", "linux-armv7.yml"),
        ("macos/x86_64", "macos-x86_64.yml"),
        ("macos/aarch64", "macos-aarch64.yml"),
        ("android/aarch64", "android-aarch64.yml"),
        ("android/armv7", "android-armv7.yml"),
        ("android/x86_64", "android-x86_64.yml"),
        ("android/universal", "android-universal.yml"),
        ("ios/aarch64", "ios-aarch64.yml"),
    ];
    for (k, v) in map {
        if *k == key {
            return Ok(v.to_string());
        }
    }
    anyhow::bail!("Unsupported target: {}", key);
}
