use anyhow::Result;
use std::path::PathBuf;

#[derive(Clone)]
pub struct Storage {
    base_dir: PathBuf,
}

impl Storage {
    pub fn new(base_dir: &str) -> Result<Self> {
        let base = PathBuf::from(base_dir);
        std::fs::create_dir_all(&base)?;
        std::fs::create_dir_all(base.join("builds"))?;
        std::fs::create_dir_all(base.join("logos"))?;
        Ok(Self { base_dir: base })
    }

    pub fn build_dir(&self, uuid: &str) -> PathBuf {
        let dir = self.base_dir.join("builds").join(uuid);
        std::fs::create_dir_all(&dir).ok();
        dir
    }

    pub fn save_build_file(&self, uuid: &str, filename: &str, data: &[u8]) -> Result<PathBuf> {
        let dir = self.build_dir(uuid);
        let path = dir.join(filename);
        std::fs::write(&path, data)?;
        Ok(path)
    }

    pub fn get_build_file_path(&self, uuid: &str, filename: &str) -> Option<PathBuf> {
        let path = self.base_dir.join("builds").join(uuid).join(filename);
        if path.exists() { Some(path) } else { None }
    }

    pub fn list_build_files(&self, uuid: &str) -> Vec<String> {
        let dir = self.base_dir.join("builds").join(uuid);
        if !dir.exists() { return vec![]; }
        std::fs::read_dir(&dir)
            .map(|entries| {
                entries
                    .filter_map(|e| e.ok())
                    .filter_map(|e| {
                        let name = e.file_name().to_string_lossy().to_string();
                        if e.file_type().map(|t| t.is_file()).unwrap_or(false) {
                            Some(name)
                        } else {
                            None
                        }
                    })
                    .collect()
            })
            .unwrap_or_default()
    }

    pub fn save_logo(&self, filename: &str, data: &[u8]) -> Result<PathBuf> {
        let path = self.base_dir.join("logos").join(filename);
        std::fs::write(&path, data)?;
        Ok(path)
    }

    pub fn get_logo_path(&self, filename: &str) -> Option<PathBuf> {
        let path = self.base_dir.join("logos").join(filename);
        if path.exists() { Some(path) } else { None }
    }

    pub fn list_logos(&self) -> Vec<String> {
        let dir = self.base_dir.join("logos");
        if !dir.exists() { return vec![]; }
        std::fs::read_dir(&dir)
            .map(|entries| {
                entries
                    .filter_map(|e| e.ok())
                    .filter_map(|e| {
                        let name = e.file_name().to_string_lossy().to_string();
                        if e.file_type().map(|t| t.is_file()).unwrap_or(false) {
                            Some(name)
                        } else {
                            None
                        }
                    })
                    .collect()
            })
            .unwrap_or_default()
    }
}
