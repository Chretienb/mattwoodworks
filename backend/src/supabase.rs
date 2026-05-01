//! Supabase REST + Auth helpers (PostgREST, GoTrue, Storage).
//!
//! `DbClient` — lightweight PostgREST client (URL + service role only).
//!   Requires: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
//!   Used for estimate inserts even when full auth mode is off.
//!
//! `Supabase` — full client (auth + CMS + storage).
//!   Requires all four SUPABASE_* vars including anon key + JWT secret.

use jsonwebtoken::{decode, DecodingKey, Validation, Algorithm};
use serde::Deserialize;
use serde_json::Value;

const SITE_ROW_ID: i32 = 1;
pub const STORAGE_BUCKET: &str = "site-media";

// Shared response types used by both DbClient and Supabase.
#[derive(Deserialize)]
struct SiteContentRow {
    content: Value,
}

// ---------------------------------------------------------------------------
// DbClient — PostgREST only (URL + service role). No auth needed.
// ---------------------------------------------------------------------------

#[derive(Clone)]
pub struct DbClient {
    url: String,
    service: String,
    client: reqwest::Client,
}

impl DbClient {
    /// Returns `Some` if `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set.
    pub fn from_env() -> Option<Self> {
        let url = std::env::var("SUPABASE_URL")
            .ok()?
            .trim_end_matches('/')
            .to_string();
        let service = std::env::var("SUPABASE_SERVICE_ROLE_KEY").ok()?;
        if url.is_empty() || service.is_empty() {
            return None;
        }
        Some(Self {
            url,
            service,
            client: reqwest::Client::new(),
        })
    }

    pub async fn fetch_estimates(&self, limit: u32) -> Result<Vec<Value>, String> {
        let url = format!(
            "{}/rest/v1/estimate_requests?select=id,created_at,first_name,last_name,email,phone,project_type,message,source,status,notes,quote_amount,quote_sent_at,quote_accepted,follow_up_at,responded_at&order=created_at.desc&limit={}",
            self.url, limit
        );
        let res = self
            .client
            .get(&url)
            .header("apikey", &self.service)
            .header("authorization", format!("Bearer {}", self.service))
            .send()
            .await
            .map_err(|e| e.to_string())?;
        if !res.status().is_success() {
            let status = res.status();
            let t = res.text().await.unwrap_or_default();
            return Err(format!("fetch estimates failed: {status} {t}"));
        }
        let rows: Vec<Value> = res.json().await.map_err(|e| e.to_string())?;
        Ok(rows)
    }

    pub async fn get_site_content(&self) -> Result<Value, String> {
        let url = format!(
            "{}/rest/v1/site_content?select=content&id=eq.{}",
            self.url, SITE_ROW_ID
        );
        let res = self
            .client
            .get(&url)
            .header("apikey", &self.service)
            .header("authorization", format!("Bearer {}", self.service))
            .send()
            .await
            .map_err(|e| e.to_string())?;
        if !res.status().is_success() {
            let status = res.status();
            let t = res.text().await.unwrap_or_default();
            return Err(format!("site_content read failed: {status} {t}"));
        }
        let rows: Vec<SiteContentRow> = res.json().await.map_err(|e| e.to_string())?;
        Ok(rows
            .into_iter()
            .next()
            .map(|r| r.content)
            .unwrap_or_else(|| Value::Object(Default::default())))
    }

    pub async fn upsert_site_content(&self, content: &Value) -> Result<(), String> {
        let url = format!("{}/rest/v1/site_content?id=eq.{}", self.url, SITE_ROW_ID);
        let res = self
            .client
            .patch(&url)
            .header("apikey", &self.service)
            .header("authorization", format!("Bearer {}", self.service))
            .header("content-type", "application/json")
            .header("prefer", "return=minimal")
            .json(&serde_json::json!({ "content": content }))
            .send()
            .await
            .map_err(|e| e.to_string())?;
        if !res.status().is_success() {
            let status = res.status();
            let t = res.text().await.unwrap_or_default();
            return Err(format!("site_content write failed: {status} {t}"));
        }
        Ok(())
    }

    pub async fn storage_upload(
        &self,
        object_path: &str,
        bytes: Vec<u8>,
        content_type: &str,
    ) -> Result<String, String> {
        let url = format!(
            "{}/storage/v1/object/{}/{}",
            self.url, STORAGE_BUCKET, object_path
        );
        let res = self
            .client
            .post(&url)
            .header("apikey", &self.service)
            .header("authorization", format!("Bearer {}", self.service))
            .header("content-type", content_type)
            .body(bytes)
            .send()
            .await
            .map_err(|e| e.to_string())?;
        if !res.status().is_success() {
            let status = res.status();
            let t = res.text().await.unwrap_or_default();
            return Err(format!("storage upload failed: {status} {t}"));
        }
        Ok(format!(
            "{}/storage/v1/object/public/{}/{}",
            self.url, STORAGE_BUCKET, object_path
        ))
    }

    /// Fetch the bcrypt hash for `email` from `public.admin_users`.
    pub async fn fetch_admin_hash(&self, email: &str) -> Result<Option<(String, String)>, String> {
        let url = format!(
            "{}/rest/v1/admin_users?email=eq.{}&select=email,password_hash,role&limit=1",
            self.url,
            urlencoding::encode(email)
        );
        let res = self
            .client
            .get(&url)
            .header("apikey", &self.service)
            .header("authorization", format!("Bearer {}", self.service))
            .send()
            .await
            .map_err(|e| e.to_string())?;
        if !res.status().is_success() {
            return Ok(None);
        }
        #[derive(serde::Deserialize)]
        struct Row { password_hash: String, role: String }
        let rows: Vec<Row> = res.json().await.map_err(|e| e.to_string())?;
        Ok(rows.into_iter().next().map(|r| (r.password_hash, r.role)))
    }

    /// Insert or update the admin record with a fresh bcrypt hash.
    pub async fn upsert_admin(&self, email: &str, password_hash: &str, role: &str) -> Result<(), String> {
        let url = format!("{}/rest/v1/admin_users", self.url);
        let res = self
            .client
            .post(&url)
            .header("apikey", &self.service)
            .header("authorization", format!("Bearer {}", self.service))
            .header("content-type", "application/json")
            .header("prefer", "resolution=merge-duplicates,return=minimal")
            .json(&serde_json::json!({
                "email": email,
                "password_hash": password_hash,
                "role": role,
            }))
            .send()
            .await
            .map_err(|e| e.to_string())?;
        if !res.status().is_success() {
            let status = res.status();
            let t = res.text().await.unwrap_or_default();
            return Err(format!("upsert admin failed: {status} {t}"));
        }
        Ok(())
    }

    pub async fn update_estimate(&self, id: &str, patch: &Value) -> Result<(), String> {
        let url = format!(
            "{}/rest/v1/estimate_requests?id=eq.{}",
            self.url,
            urlencoding::encode(id)
        );
        let res = self
            .client
            .patch(&url)
            .header("apikey", &self.service)
            .header("authorization", format!("Bearer {}", self.service))
            .header("content-type", "application/json")
            .header("prefer", "return=minimal")
            .json(patch)
            .send()
            .await
            .map_err(|e| e.to_string())?;
        if !res.status().is_success() {
            let status = res.status();
            let t = res.text().await.unwrap_or_default();
            return Err(format!("update estimate failed: {status} {t}"));
        }
        Ok(())
    }

    pub async fn insert_estimate(&self, row: &Value) -> Result<(), String> {
        let url = format!("{}/rest/v1/estimate_requests", self.url);
        let res = self
            .client
            .post(&url)
            .header("apikey", &self.service)
            .header("authorization", format!("Bearer {}", self.service))
            .header("content-type", "application/json")
            .header("prefer", "return=minimal")
            .json(row)
            .send()
            .await
            .map_err(|e| e.to_string())?;
        if !res.status().is_success() {
            let status = res.status();
            let t = res.text().await.unwrap_or_default();
            return Err(format!("estimate insert failed: {status} {t}"));
        }
        Ok(())
    }
}

// ---------------------------------------------------------------------------
// Supabase — full client (auth + DB + storage)
// ---------------------------------------------------------------------------

#[derive(Clone)]
pub struct Supabase {
    pub url: String,
    anon: String,
    service: String,
    jwt_secret: String,
    client: reqwest::Client,
}

#[derive(Deserialize)]
struct PasswordGrantResponse {
    access_token: String,
}

#[derive(Deserialize)]
pub struct JwtClaims {
    pub sub: String,
    pub email: Option<String>,
}

impl Supabase {
    pub fn from_env() -> Option<Self> {
        let url = std::env::var("SUPABASE_URL")
            .ok()?
            .trim_end_matches('/')
            .to_string();
        if url.is_empty() {
            return None;
        }
        let anon = std::env::var("SUPABASE_ANON_KEY").ok()?;
        let service = std::env::var("SUPABASE_SERVICE_ROLE_KEY").ok()?;
        let jwt_secret = std::env::var("SUPABASE_JWT_SECRET").ok()?;
        if anon.is_empty() || service.is_empty() || jwt_secret.is_empty() {
            return None;
        }
        Some(Self {
            url,
            anon,
            service,
            jwt_secret,
            client: reqwest::Client::new(),
        })
    }

    pub async fn sign_in_password(&self, email: &str, password: &str) -> Result<String, String> {
        let url = format!("{}/auth/v1/token?grant_type=password", self.url);
        let res = self
            .client
            .post(&url)
            .header("apikey", &self.anon)
            .header("Content-Type", "application/json")
            .json(&serde_json::json!({
                "email": email.trim(),
                "password": password,
            }))
            .send()
            .await
            .map_err(|e| e.to_string())?;
        if !res.status().is_success() {
            let t = res.text().await.unwrap_or_default();
            return Err(if t.is_empty() {
                "Invalid email or password.".into()
            } else {
                t
            });
        }
        let body: PasswordGrantResponse = res.json().await.map_err(|e| e.to_string())?;
        Ok(body.access_token)
    }

    /// Look up the profile by email, verify password matches MHW_ADMIN_PASSWORD,
    /// then issue a Supabase-compatible JWT locally (GoTrue bypass for when auth API is down).
    pub async fn sign_in_local_fallback(
        &self,
        email: &str,
        password: &str,
        admin_password: &str,
    ) -> Result<String, String> {
        if password != admin_password {
            return Err("Invalid password.".into());
        }
        // Find the user's UUID from the profiles table by email.
        let url = format!(
            "{}/rest/v1/profiles?email=eq.{}&select=id,role",
            self.url,
            urlencoding::encode(email)
        );
        let res = self
            .client
            .get(&url)
            .header("apikey", &self.service)
            .header("authorization", format!("Bearer {}", self.service))
            .send()
            .await
            .map_err(|e| e.to_string())?;
        if !res.status().is_success() {
            return Err("Profile lookup failed.".into());
        }
        #[derive(Deserialize)]
        struct Row { id: String, role: String }
        let rows: Vec<Row> = res.json().await.map_err(|e| e.to_string())?;
        let row = rows.into_iter().next()
            .ok_or_else(|| format!("No profile found for {email}. Add a row in public.profiles."))?;
        if !row.role.eq_ignore_ascii_case("admin") {
            return Err("Account does not have admin role.".into());
        }
        // Issue a Supabase-compatible JWT signed with our JWT secret.
        use jsonwebtoken::{encode, Algorithm, EncodingKey, Header};
        use std::time::{SystemTime, UNIX_EPOCH};
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs();
        #[derive(serde::Serialize)]
        struct Claims<'a> {
            aud: &'a str,
            exp: u64,
            iat: u64,
            iss: String,
            sub: String,
            email: String,
            role: &'a str,
        }
        let claims = Claims {
            aud: "authenticated",
            exp: now + 60 * 60 * 24,
            iat: now,
            iss: format!("{}/auth/v1", self.url),
            sub: row.id,
            email: email.to_string(),
            role: "authenticated",
        };
        encode(
            &Header::new(Algorithm::HS256),
            &claims,
            &EncodingKey::from_secret(self.jwt_secret.as_bytes()),
        )
        .map_err(|e| e.to_string())
    }

    pub fn verify_access_token(&self, token: &str) -> Result<JwtClaims, String> {
        let mut val = Validation::new(Algorithm::HS256);
        val.validate_aud = false;
        let key = DecodingKey::from_secret(self.jwt_secret.as_bytes());
        let data = decode::<JwtClaims>(token, &key, &val)
            .map_err(|_| "Invalid or expired session.".to_string())?;
        Ok(data.claims)
    }

    /// Returns (email, role) from `profiles` using service role.
    pub async fn fetch_profile(&self, user_id: &str) -> Result<(String, String), String> {
        let url = format!(
            "{}/rest/v1/profiles?id=eq.{}&select=email,role",
            self.url, user_id
        );
        let res = self
            .client
            .get(&url)
            .header("apikey", &self.service)
            .header("authorization", format!("Bearer {}", self.service))
            .send()
            .await
            .map_err(|e| e.to_string())?;
        if !res.status().is_success() {
            return Err(format!("profile lookup failed: {}", res.status()));
        }
        let rows: Vec<ProfileRow> = res.json().await.map_err(|e| e.to_string())?;
        let row = rows
            .into_iter()
            .next()
            .ok_or_else(|| "Profile not found.".to_string())?;
        Ok((row.email.unwrap_or_default(), row.role))
    }

    pub async fn get_site_content(&self) -> Result<Value, String> {
        let url = format!(
            "{}/rest/v1/site_content?select=content&id=eq.{}",
            self.url, SITE_ROW_ID
        );
        let res = self
            .client
            .get(&url)
            .header("apikey", &self.anon)
            .header("authorization", format!("Bearer {}", self.anon))
            .send()
            .await
            .map_err(|e| e.to_string())?;
        if !res.status().is_success() {
            return Err(format!("site_content read failed: {}", res.status()));
        }
        let rows: Vec<SiteContentRow> = res.json().await.map_err(|e| e.to_string())?;
        let content = rows
            .into_iter()
            .next()
            .map(|r| r.content)
            .unwrap_or_else(|| Value::Object(Default::default()));
        Ok(content)
    }

    pub async fn patch_site_content(&self, content: &Value) -> Result<(), String> {
        let url = format!("{}/rest/v1/site_content?id=eq.{}", self.url, SITE_ROW_ID);
        let res = self
            .client
            .patch(&url)
            .header("apikey", &self.service)
            .header("authorization", format!("Bearer {}", self.service))
            .header("content-type", "application/json")
            .header("prefer", "return=minimal")
            .json(&serde_json::json!({ "content": content }))
            .send()
            .await
            .map_err(|e| e.to_string())?;
        if !res.status().is_success() {
            let status = res.status();
            let t = res.text().await.unwrap_or_default();
            return Err(format!("site_content write failed: {} {t}", status));
        }
        Ok(())
    }

    pub async fn fetch_estimates(&self, limit: u32) -> Result<Vec<Value>, String> {
        let url = format!(
            "{}/rest/v1/estimate_requests?select=id,created_at,first_name,last_name,email,phone,project_type,message,source,status,notes,quote_amount,quote_sent_at,quote_accepted,follow_up_at,responded_at&order=created_at.desc&limit={}",
            self.url, limit
        );
        let res = self
            .client
            .get(&url)
            .header("apikey", &self.service)
            .header("authorization", format!("Bearer {}", self.service))
            .send()
            .await
            .map_err(|e| e.to_string())?;
        if !res.status().is_success() {
            let status = res.status();
            let t = res.text().await.unwrap_or_default();
            return Err(format!("fetch estimates failed: {status} {t}"));
        }
        let rows: Vec<Value> = res.json().await.map_err(|e| e.to_string())?;
        Ok(rows)
    }

    pub async fn insert_estimate_row(&self, row: Value) -> Result<(), String> {
        let url = format!("{}/rest/v1/estimate_requests", self.url);
        let res = self
            .client
            .post(&url)
            .header("apikey", &self.service)
            .header("authorization", format!("Bearer {}", self.service))
            .header("content-type", "application/json")
            .header("prefer", "return=minimal")
            .json(&row)
            .send()
            .await
            .map_err(|e| e.to_string())?;
        if !res.status().is_success() {
            let status = res.status();
            let t = res.text().await.unwrap_or_default();
            return Err(format!("estimate insert failed: {} {t}", status));
        }
        Ok(())
    }

    pub async fn update_estimate_row(&self, id: &str, patch: &Value) -> Result<(), String> {
        let url = format!(
            "{}/rest/v1/estimate_requests?id=eq.{}",
            self.url,
            urlencoding::encode(id)
        );
        let res = self
            .client
            .patch(&url)
            .header("apikey", &self.service)
            .header("authorization", format!("Bearer {}", self.service))
            .header("content-type", "application/json")
            .header("prefer", "return=minimal")
            .json(patch)
            .send()
            .await
            .map_err(|e| e.to_string())?;
        if !res.status().is_success() {
            let status = res.status();
            let t = res.text().await.unwrap_or_default();
            return Err(format!("estimate update failed: {status} {t}"));
        }
        Ok(())
    }

    /// Returns **public** object URL.
    pub async fn storage_upload(
        &self,
        object_path: &str,
        bytes: Vec<u8>,
        content_type: &str,
    ) -> Result<String, String> {
        let url = format!(
            "{}/storage/v1/object/{}/{}",
            self.url, STORAGE_BUCKET, object_path
        );
        let res = self
            .client
            .post(&url)
            .header("apikey", &self.service)
            .header("authorization", format!("Bearer {}", self.service))
            .header("content-type", content_type)
            .body(bytes)
            .send()
            .await
            .map_err(|e| e.to_string())?;
        if !res.status().is_success() {
            let status = res.status();
            let t = res.text().await.unwrap_or_default();
            return Err(format!("storage upload failed: {} {t}", status));
        }
        Ok(format!(
            "{}/storage/v1/object/public/{}/{}",
            self.url, STORAGE_BUCKET, object_path
        ))
    }
}

#[derive(Deserialize)]
struct ProfileRow {
    email: Option<String>,
    role: String,
}
