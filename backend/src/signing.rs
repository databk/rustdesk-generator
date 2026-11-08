use anyhow::{Context, Result};
use base64::{engine::general_purpose::STANDARD as B64, Engine};
use ed25519_dalek::{Signer, SigningKey, VerifyingKey};
use rand::rngs::OsRng;
use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;

#[derive(Clone)]
pub struct SigningService {
    signing_key: SigningKey,
    verifying_key: VerifyingKey,
}

#[derive(Serialize, Deserialize, Clone, Debug, Default)]
pub struct CustomConfig {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub app_name: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub password: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub salt: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub conn_type: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub disable_installation: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub disable_settings: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub disable_account: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub disable_ab: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub disable_tcp_listen: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub override_settings: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub default_settings: Option<String>,
}

impl CustomConfig {
    pub fn to_kebab_json(&self) -> BTreeMap<String, serde_json::Value> {
        let mut map = BTreeMap::new();
        if let Some(v) = &self.app_name { map.insert("app-name".into(), serde_json::Value::String(v.clone())); }
        if let Some(v) = &self.password { map.insert("password".into(), serde_json::Value::String(v.clone())); }
        if let Some(v) = &self.salt { map.insert("salt".into(), serde_json::Value::String(v.clone())); }
        if let Some(v) = &self.conn_type { map.insert("conn-type".into(), serde_json::Value::String(v.clone())); }
        if let Some(v) = self.disable_installation { map.insert("disable-installation".into(), serde_json::Value::Bool(v)); }
        if let Some(v) = self.disable_settings { map.insert("disable-settings".into(), serde_json::Value::Bool(v)); }
        if let Some(v) = self.disable_account { map.insert("disable-account".into(), serde_json::Value::Bool(v)); }
        if let Some(v) = self.disable_ab { map.insert("disable-ab".into(), serde_json::Value::Bool(v)); }
        if let Some(v) = self.disable_tcp_listen { map.insert("disable-tcp-listen".into(), serde_json::Value::Bool(v)); }
        if let Some(v) = &self.override_settings { map.insert("override-settings".into(), serde_json::Value::String(v.clone())); }
        if let Some(v) = &self.default_settings { map.insert("default-settings".into(), serde_json::Value::String(v.clone())); }
        map
    }
}

impl SigningService {
    pub fn from_env() -> Result<Self> {
        let private_key_b64 = std::env::var("ED25519_PRIVATE_KEY");
        let public_key_b64 = std::env::var("ED25519_PUBLIC_KEY");

        match (private_key_b64, public_key_b64) {
            (Ok(priv_b64), Ok(pub_b64)) => {
                let priv_bytes = B64.decode(priv_b64).context("Invalid private key base64")?;
                let priv_arr: &[u8; 32] = priv_bytes.as_slice().try_into().map_err(|_| anyhow::anyhow!("Invalid private key length"))?;
                let signing_key = SigningKey::from_bytes(priv_arr);
                let verifying_key = signing_key.verifying_key();
                let expected_pub = B64.encode(verifying_key.to_bytes());
                if expected_pub != pub_b64 {
                    tracing::warn!("Public key mismatch: expected {}, got {}", expected_pub, pub_b64);
                }
                Ok(Self { signing_key, verifying_key })
            }
            _ => {
                tracing::warn!("No ED25519 keys in env, generating new key pair");
                let mut rng = OsRng;
                let signing_key = SigningKey::generate(&mut rng);
                let verifying_key = signing_key.verifying_key();
                tracing::info!("Generated new key pair");
                tracing::info!("Private key (base64): {}", B64.encode(signing_key.to_bytes()));
                tracing::info!("Public key (base64): {}", B64.encode(verifying_key.to_bytes()));
                Ok(Self { signing_key, verifying_key })
            }
        }
    }

    pub fn generate_signed_custom_txt(&self, custom: &CustomConfig) -> String {
        let kebab = custom.to_kebab_json();
        let message = serde_json::to_vec(&kebab).unwrap_or_default();
        let signature = self.signing_key.sign(&message);
        let mut signed_message = signature.to_vec();
        signed_message.extend_from_slice(&message);
        B64.encode(&signed_message)
    }

    pub fn get_public_key_base64(&self) -> String {
        B64.encode(self.verifying_key.to_bytes())
    }
}
