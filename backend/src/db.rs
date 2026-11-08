use anyhow::Result;
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct BuildRecord {
    pub uuid: String,
    pub status: BuildStatus,
    pub os: String,
    pub arch: String,
    pub custom: Option<String>,
    pub callback_token: String,
    pub created_at: DateTime<Utc>,
    pub files: Option<Vec<String>>,
    pub message: Option<String>,
    pub github_run_id: Option<String>,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum BuildStatus {
    Pending,
    Building,
    Completed,
    Failed,
}

#[derive(Clone)]
pub struct Database {
    builds: Arc<RwLock<HashMap<String, BuildRecord>>>,
    file_path: String,
}

impl Database {
    pub fn new(file_path: &str) -> Result<Self> {
        let builds = if std::path::Path::new(file_path).exists() {
            let content = std::fs::read_to_string(file_path)?;
            serde_json::from_str(&content).unwrap_or_default()
        } else {
            HashMap::new()
        };
        Ok(Self {
            builds: Arc::new(RwLock::new(builds)),
            file_path: file_path.to_string(),
        })
    }

    async fn persist(&self) {
        let builds = self.builds.read().await;
        if let Ok(content) = serde_json::to_string(&*builds) {
            let _ = std::fs::write(&self.file_path, content);
        }
    }

    pub async fn insert(&self, record: BuildRecord) {
        let mut builds = self.builds.write().await;
        builds.insert(record.uuid.clone(), record);
        drop(builds);
        self.persist().await;
    }

    pub async fn get(&self, uuid: &str) -> Option<BuildRecord> {
        let builds = self.builds.read().await;
        builds.get(uuid).cloned()
    }

    pub async fn update_status(&self, uuid: &str, status: BuildStatus, message: Option<String>, files: Option<Vec<String>>) {
        let mut builds = self.builds.write().await;
        if let Some(record) = builds.get_mut(uuid) {
            record.status = status;
            if message.is_some() { record.message = message; }
            if files.is_some() { record.files = files; }
        }
        drop(builds);
        self.persist().await;
    }

    pub async fn update_run_id(&self, uuid: &str, run_id: String) {
        let mut builds = self.builds.write().await;
        if let Some(record) = builds.get_mut(uuid) {
            record.github_run_id = Some(run_id);
        }
        drop(builds);
        self.persist().await;
    }

    pub async fn list(&self) -> Vec<BuildRecord> {
        let builds = self.builds.read().await;
        let mut list: Vec<BuildRecord> = builds.values().cloned().collect();
        list.sort_by_key(|a| std::cmp::Reverse(a.created_at));
        list
    }
}
