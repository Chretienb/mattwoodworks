//! MHW API — Axum server matching the frontend `/api` contract (same as dev-api.mjs).
//!
//! From repo root: `cd backend && cargo run`
//! Defaults write next to frontend: `../frontend/site-content.json`, uploads, estimates jsonl.
//!
//! Env overrides:
//!   MHW_BIND (default 127.0.0.1:8080)
//!   MHW_SITE_CONTENT (path to site-content.json)
//!   MHW_UPLOAD_DIR (path to public uploads folder)
//!   MHW_ESTIMATES_FILE (path to estimate_requests.jsonl)
//!   MHW_ADMIN_EMAIL / MHW_ADMIN_PASSWORD (defaults: admin@mattwoodworks.local / devpassword)

use axum::{
    body::Bytes,
    extract::State,
    http::{header::AUTHORIZATION, HeaderMap, StatusCode},
    routing::{get, post, put},
    Json, Router,
};
use base64::{engine::general_purpose::STANDARD, Engine as _};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::{
    collections::HashMap,
    fs,
    path::{Path, PathBuf},
    sync::{Arc, Mutex},
};
use tower_http::cors::CorsLayer;

#[derive(Clone)]
struct AppState {
    sessions: Arc<Mutex<HashMap<String, Session>>>,
    users: Arc<HashMap<String, UserRecord>>,
    site_file: PathBuf,
    upload_dir: PathBuf,
    estimates_file: PathBuf,
}

#[derive(Clone)]
struct Session {
    email: String,
    role: String,
}

#[derive(Clone)]
struct UserRecord {
    password: String,
    email: String,
    role: String,
}

#[derive(Deserialize)]
struct LoginBody {
    email: String,
    password: String,
}

#[derive(Serialize)]
struct LoginResponse {
    token: String,
    role: String,
}

#[derive(Serialize)]
struct MeResponse {
    email: String,
    role: String,
}

#[derive(Deserialize)]
struct UploadBody {
    filename: String,
    #[serde(rename = "base64")]
    b64: String,
}

#[derive(Serialize)]
struct UploadResponse {
    url: String,
}

#[derive(Deserialize, Serialize)]
struct EstimateBody {
    first_name: Option<String>,
    last_name: Option<String>,
    email: String,
    phone: Option<String>,
    project_type: Option<String>,
    message: Option<String>,
    #[serde(default = "default_source")]
    source: String,
}

fn default_source() -> String {
    "website".into()
}

fn project_root_relative(path: &str) -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR")).join(path)
}

fn data_dir() -> PathBuf {
    std::env::var("MHW_DATA_DIR")
        .map(PathBuf::from)
        .unwrap_or_else(|_| project_root_relative("../frontend"))
}

fn site_content_path() -> PathBuf {
    std::env::var("MHW_SITE_CONTENT")
        .map(PathBuf::from)
        .unwrap_or_else(|_| data_dir().join("site-content.json"))
}

fn upload_dir_path() -> PathBuf {
    std::env::var("MHW_UPLOAD_DIR")
        .map(PathBuf::from)
        .unwrap_or_else(|_| data_dir().join("public/images/uploads"))
}

fn estimates_path() -> PathBuf {
    std::env::var("MHW_ESTIMATES_FILE")
        .map(PathBuf::from)
        .unwrap_or_else(|_| data_dir().join("estimate_requests.jsonl"))
}

fn admin_users() -> HashMap<String, UserRecord> {
    let email = std::env::var("MHW_ADMIN_EMAIL")
        .unwrap_or_else(|_| "admin@mattwoodworks.local".into())
        .to_lowercase();
    let password = std::env::var("MHW_ADMIN_PASSWORD").unwrap_or_else(|_| "devpassword".into());
    let canonical = email.clone();
    HashMap::from([(
        email,
        UserRecord {
            password,
            email: canonical,
            role: "admin".into(),
        },
    )])
}

fn safe_upload_basename(name: &str) -> Option<String> {
    let base = Path::new(name)
        .file_name()
        .and_then(|s| s.to_str())?
        .chars()
        .filter(|c| c.is_ascii_alphanumeric() || *c == '.' || *c == '_' || *c == '-')
        .collect::<String>();
    if base.is_empty() || base.len() > 180 {
        return None;
    }
    let lower = base.to_lowercase();
    if !lower.ends_with(".png")
        && !lower.ends_with(".jpg")
        && !lower.ends_with(".jpeg")
        && !lower.ends_with(".webp")
        && !lower.ends_with(".gif")
    {
        return None;
    }
    Some(base)
}

fn session_from_headers(
    state: &AppState,
    headers: &HeaderMap,
) -> Result<Session, (StatusCode, &'static str)> {
    let raw = headers
        .get(AUTHORIZATION)
        .and_then(|v| v.to_str().ok())
        .ok_or((StatusCode::UNAUTHORIZED, "Unauthorized"))?;
    let token = raw
        .strip_prefix("Bearer ")
        .ok_or((StatusCode::UNAUTHORIZED, "Unauthorized"))?
        .trim();
    let sessions = state.sessions.lock().unwrap();
    sessions
        .get(token)
        .cloned()
        .ok_or((StatusCode::UNAUTHORIZED, "Unauthorized"))
}

async fn health() -> Json<Value> {
    Json(serde_json::json!({ "ok": true }))
}

async fn get_site_content(State(state): State<AppState>) -> Result<Json<Value>, (StatusCode, String)> {
    let raw = fs::read_to_string(&state.site_file).unwrap_or_default();
    if raw.trim().is_empty() {
        return Ok(Json(Value::Object(Default::default())));
    }
    let v: Value = serde_json::from_str(&raw).map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            format!("Corrupt site JSON: {e}"),
        )
    })?;
    Ok(Json(v))
}

async fn login(
    State(state): State<AppState>,
    Json(body): Json<LoginBody>,
) -> Result<Json<LoginResponse>, (StatusCode, String)> {
    let email = body.email.trim().to_lowercase();
    let user = state
        .users
        .get(&email)
        .filter(|u| u.password == body.password)
        .ok_or((StatusCode::UNAUTHORIZED, "Invalid email or password.".into()))?;
    let token = uuid::Uuid::new_v4().to_string();
    state.sessions.lock().unwrap().insert(
        token.clone(),
        Session {
            email: user.email.clone(),
            role: user.role.clone(),
        },
    );
    Ok(Json(LoginResponse {
        token,
        role: user.role.clone(),
    }))
}

async fn admin_me(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> Result<Json<MeResponse>, (StatusCode, String)> {
    let s = session_from_headers(&state, &headers).map_err(|(c, m)| (c, m.into()))?;
    Ok(Json(MeResponse {
        email: s.email,
        role: s.role,
    }))
}

async fn put_site_content(
    State(state): State<AppState>,
    headers: HeaderMap,
    body: Bytes,
) -> Result<Json<Value>, (StatusCode, String)> {
    session_from_headers(&state, &headers).map_err(|(c, m)| (c, m.into()))?;
    let v: Value = serde_json::from_slice(&body).map_err(|_| {
        (
            StatusCode::BAD_REQUEST,
            "Invalid JSON.".into(),
        )
    })?;
    if let Some(parent) = state.site_file.parent() {
        fs::create_dir_all(parent).map_err(|e| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                e.to_string(),
            )
        })?;
    }
    fs::write(
        &state.site_file,
        serde_json::to_string_pretty(&v).unwrap().as_bytes(),
    )
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    Ok(Json(serde_json::json!({ "ok": true })))
}

async fn upload_image(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(body): Json<UploadBody>,
) -> Result<Json<UploadResponse>, (StatusCode, String)> {
    session_from_headers(&state, &headers).map_err(|(c, m)| (c, m.into()))?;
    let fn_safe = safe_upload_basename(&body.filename)
        .ok_or((StatusCode::BAD_REQUEST, "Bad filename.".into()))?;
    let b64 = body
        .b64
        .strip_prefix("data:")
        .and_then(|s| s.split_once(',').map(|(_, r)| r))
        .unwrap_or(&body.b64);
    let buf = STANDARD
        .decode(b64.replace(['\n', '\r'], ""))
        .map_err(|_| (StatusCode::BAD_REQUEST, "Invalid base64.".into()))?;
    if buf.is_empty() || buf.len() > 12 * 1024 * 1024 {
        return Err((
            StatusCode::BAD_REQUEST,
            "Invalid or too large image.".into(),
        ));
    }
    fs::create_dir_all(&state.upload_dir).map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            e.to_string(),
        )
    })?;
    let dest_name = format!("{}-{fn_safe}", chrono_like_ts());
    let dest = state.upload_dir.join(&dest_name);
    fs::write(&dest, &buf).map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    Ok(Json(UploadResponse {
        url: format!("/images/uploads/{dest_name}"),
    }))
}

fn chrono_like_ts() -> u128 {
    use std::time::{SystemTime, UNIX_EPOCH};
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis())
        .unwrap_or(0)
}

async fn post_estimate(
    State(state): State<AppState>,
    Json(body): Json<EstimateBody>,
) -> Result<StatusCode, (StatusCode, String)> {
    let email = body.email.trim();
    if email.len() < 3 {
        return Err((StatusCode::BAD_REQUEST, "Email required.".into()));
    }
    if body.message.as_ref().map(|m| m.len()).unwrap_or(0) > 20_000 {
        return Err((StatusCode::BAD_REQUEST, "Message too long.".into()));
    }
    if let Some(parent) = state.estimates_file.parent() {
        fs::create_dir_all(parent).map_err(|e| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                e.to_string(),
            )
        })?;
    }
    let line = serde_json::to_string(&body).map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            e.to_string(),
        )
    })?;
    use std::io::Write;
    let mut f = fs::OpenOptions::new()
        .create(true)
        .append(true)
        .open(&state.estimates_file)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    writeln!(f, "{line}").map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    Ok(StatusCode::CREATED)
}

#[tokio::main]
async fn main() {
    let site_file = site_content_path();
    let upload_dir = upload_dir_path();
    let estimates_file = estimates_path();

    let state = AppState {
        sessions: Arc::new(Mutex::new(HashMap::new())),
        users: Arc::new(admin_users()),
        site_file: site_file.clone(),
        upload_dir: upload_dir.clone(),
        estimates_file: estimates_file.clone(),
    };

    let app = Router::new()
        .route("/health", get(health))
        .route("/api/site/content", get(get_site_content))
        .route("/api/auth/login", post(login))
        .route("/api/admin/me", get(admin_me))
        .route("/api/admin/site-content", put(put_site_content))
        .route("/api/admin/upload-image", post(upload_image))
        .route("/api/estimate-requests", post(post_estimate))
        .layer(CorsLayer::permissive())
        .with_state(state);

    let bind = std::env::var("MHW_BIND").unwrap_or_else(|_| "127.0.0.1:8080".into());
    let listener = tokio::net::TcpListener::bind(&bind)
        .await
        .unwrap_or_else(|e| panic!("bind {bind}: {e}"));

    eprintln!("mhw-api listening on http://{bind}");
    eprintln!("  site content: {}", site_file.display());
    eprintln!("  uploads:      {}", upload_dir.display());
    eprintln!("  estimates:    {}", estimates_file.display());

    axum::serve(listener, app).await.unwrap();
}
