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
//!
//! Supabase (if all set, overrides file/jsonl for CMS + leads + uploads):
//!   SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_JWT_SECRET
//!   Optional: copy `backend/.env.example` → `backend/.env` (.gitignored) — loaded via dotenvy at startup.
//!   Never put the service role key or JWT secret in the Vite frontend.
//!
//! Admin sign-in sends **password only** from the client; `MHW_ADMIN_EMAIL` (default
//! admin@mattwoodworks.local) must match the Supabase Auth user (or local dev user).

use axum::{
    body::Bytes,
    extract::State,
    http::{header::AUTHORIZATION, HeaderMap, StatusCode},
    routing::{get, patch, post, put},
    Json, Router,
};
use base64::{engine::general_purpose::STANDARD, Engine as _};
extern crate bcrypt;
use jsonwebtoken::{decode, encode, Algorithm, DecodingKey, EncodingKey, Header, Validation};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::{
    fs,
    path::{Path, PathBuf},
    time::{SystemTime, UNIX_EPOCH},
};
use tower_http::{
    cors::CorsLayer,
    normalize_path::NormalizePathLayer,
};

mod mailer;
mod supabase;

#[derive(Clone)]
struct AppState {
    sb: Option<supabase::Supabase>,
    db: Option<supabase::DbClient>,
    mailer: Option<mailer::Mailer>,
    /// Admin email from MHW_ADMIN_EMAIL
    admin_email: String,
    /// Admin password from MHW_ADMIN_PASSWORD
    admin_password: String,
    /// Secret for signing/verifying local JWTs (MHW_JWT_SECRET or SUPABASE_JWT_SECRET)
    jwt_secret: String,
    site_file: PathBuf,
    upload_dir: PathBuf,
    estimates_file: PathBuf,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
struct Session {
    email: String,
    role: String,
}

#[derive(Deserialize)]
struct LoginBody {
    password: String,
}

fn admin_login_email() -> String {
    std::env::var("MHW_ADMIN_EMAIL")
        .unwrap_or_else(|_| "admin@mattwoodworks.local".into())
        .to_lowercase()
}

fn local_jwt_secret() -> String {
    std::env::var("MHW_JWT_SECRET")
        .or_else(|_| std::env::var("SUPABASE_JWT_SECRET"))
        .unwrap_or_else(|_| "local-dev-secret-change-me".into())
}

#[derive(Serialize, Deserialize)]
struct LocalClaims {
    sub: String,
    email: String,
    role: String,
    iat: u64,
    exp: u64,
}

fn issue_local_jwt(email: &str, role: &str, secret: &str) -> Result<String, String> {
    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs();
    let claims = LocalClaims {
        sub: email.to_string(),
        email: email.to_string(),
        role: role.to_string(),
        iat: now,
        exp: now + 60 * 60 * 24,
    };
    encode(
        &Header::new(Algorithm::HS256),
        &claims,
        &EncodingKey::from_secret(secret.as_bytes()),
    )
    .map_err(|e| e.to_string())
}

fn verify_local_jwt(token: &str, secret: &str) -> Result<Session, String> {
    let mut val = Validation::new(Algorithm::HS256);
    val.validate_exp = true;
    let data = decode::<LocalClaims>(
        token,
        &DecodingKey::from_secret(secret.as_bytes()),
        &val,
    )
    .map_err(|e| e.to_string())?;
    Ok(Session {
        email: data.claims.email,
        role: data.claims.role,
    })
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

fn bearer_token(headers: &HeaderMap) -> Result<String, (StatusCode, String)> {
    let raw = headers
        .get(AUTHORIZATION)
        .and_then(|v| v.to_str().ok())
        .ok_or((StatusCode::UNAUTHORIZED, "Unauthorized".into()))?;
    raw.strip_prefix("Bearer ")
        .map(|s| s.trim().to_string())
        .ok_or((StatusCode::UNAUTHORIZED, "Unauthorized".into()))
}

/// Verify a JWT and return the session. Handles three cases:
///   1. Our locally-issued JWT (role claim = "admin") — trust directly.
///   2. GoTrue JWT (role claim = "authenticated") — fetch profile for admin check.
///   3. No Supabase at all — verify against local secret.
async fn require_admin_session(
    state: &AppState,
    headers: &HeaderMap,
) -> Result<Session, (StatusCode, String)> {
    let token = bearer_token(headers)?;

    // Always try local JWT first — covers bcrypt login and pure local mode.
    if let Ok(session) = verify_local_jwt(&token, &state.jwt_secret) {
        if !session.role.eq_ignore_ascii_case("admin") {
            return Err((StatusCode::FORBIDDEN, "Forbidden".into()));
        }
        return Ok(session);
    }

    // GoTrue JWT path: role is "authenticated", need profile lookup for admin check.
    if let Some(ref sb) = state.sb {
        let claims = sb
            .verify_access_token(&token)
            .map_err(|e| (StatusCode::UNAUTHORIZED, e))?;
        let (email, role) = sb
            .fetch_profile(&claims.sub)
            .await
            .map_err(|e| (StatusCode::UNAUTHORIZED, e))?;
        if !role.trim().eq_ignore_ascii_case("admin") {
            return Err((StatusCode::FORBIDDEN, "Forbidden".into()));
        }
        let email = if email.is_empty() {
            claims.email.unwrap_or_default()
        } else {
            email
        };
        return Ok(Session { email, role });
    }

    Err((StatusCode::UNAUTHORIZED, "Unauthorized".into()))
}

async fn health() -> Json<Value> {
    Json(serde_json::json!({ "ok": true }))
}

async fn get_site_content(State(state): State<AppState>) -> Result<Json<Value>, (StatusCode, String)> {
    if let Some(ref db) = state.db {
        let v = db
            .get_site_content()
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e))?;
        return Ok(Json(v));
    }
    if let Some(ref sb) = state.sb {
        let v = sb
            .get_site_content()
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e))?;
        return Ok(Json(v));
    }
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
    let email = state.admin_email.clone();

    // 1. Try Supabase admin_users table (bcrypt hash) if DbClient is available.
    if let Some(ref db) = state.db {
        if let Ok(Some((hash, role))) = db.fetch_admin_hash(&email).await {
            let ok = bcrypt::verify(&body.password, &hash).unwrap_or(false);
            if !ok {
                return Err((StatusCode::UNAUTHORIZED, "Invalid password.".into()));
            }
            if !role.eq_ignore_ascii_case("admin") {
                return Err((StatusCode::FORBIDDEN, "Admin access only.".into()));
            }
            let token = issue_local_jwt(&email, &role, &state.jwt_secret)
                .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e))?;
            return Ok(Json(LoginResponse { token, role }));
        }
    }

    // 2. Try GoTrue (if full Supabase mode).
    if let Some(ref sb) = state.sb {
        let token = match sb.sign_in_password(&email, &body.password).await {
            Ok(t) => t,
            Err(_) => sb
                .sign_in_local_fallback(&email, &body.password, &state.admin_password)
                .await
                .map_err(|e| (StatusCode::UNAUTHORIZED, e))?,
        };
        let claims = sb
            .verify_access_token(&token)
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e))?;
        let (_email, role) = sb.fetch_profile(&claims.sub).await.map_err(|e| {
            (StatusCode::UNAUTHORIZED, e)
        })?;
        if !role.trim().eq_ignore_ascii_case("admin") {
            return Err((StatusCode::FORBIDDEN, "Admin access only.".into()));
        }
        return Ok(Json(LoginResponse { token, role }));
    }

    // 3. Local plaintext fallback (dev only, no Supabase).
    if body.password != state.admin_password {
        return Err((StatusCode::UNAUTHORIZED, "Invalid password.".into()));
    }
    let token = issue_local_jwt(&email, "admin", &state.jwt_secret)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e))?;
    Ok(Json(LoginResponse {
        token,
        role: "admin".into(),
    }))
}

async fn admin_me(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> Result<Json<MeResponse>, (StatusCode, String)> {
    let s = require_admin_session(&state, &headers).await?;
    Ok(Json(MeResponse { email: s.email, role: s.role }))
}

async fn put_site_content(
    State(state): State<AppState>,
    headers: HeaderMap,
    body: Bytes,
) -> Result<Json<Value>, (StatusCode, String)> {
    require_admin_session(&state, &headers).await?;
    let v: Value = serde_json::from_slice(&body).map_err(|_| {
        (
            StatusCode::BAD_REQUEST,
            "Invalid JSON.".into(),
        )
    })?;
    if let Some(ref db) = state.db {
        db.upsert_site_content(&v)
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e))?;
        return Ok(Json(serde_json::json!({ "ok": true })));
    }
    if let Some(ref sb) = state.sb {
        sb.patch_site_content(&v)
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e))?;
        return Ok(Json(serde_json::json!({ "ok": true })));
    }
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

fn upload_content_type(filename: &str) -> &'static str {
    let lower = filename.to_lowercase();
    if lower.ends_with(".png") {
        "image/png"
    } else if lower.ends_with(".jpg") || lower.ends_with(".jpeg") {
        "image/jpeg"
    } else if lower.ends_with(".webp") {
        "image/webp"
    } else if lower.ends_with(".gif") {
        "image/gif"
    } else {
        "application/octet-stream"
    }
}

async fn upload_image(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(body): Json<UploadBody>,
) -> Result<Json<UploadResponse>, (StatusCode, String)> {
    require_admin_session(&state, &headers).await?;
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
    let dest_name = format!("{}-{fn_safe}", chrono_like_ts());
    let ct = upload_content_type(&fn_safe);
    if let Some(ref db) = state.db {
        let url = db
            .storage_upload(&dest_name, buf, ct)
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e))?;
        return Ok(Json(UploadResponse { url }));
    }
    if let Some(ref sb) = state.sb {
        let url = sb
            .storage_upload(&dest_name, buf, ct)
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e))?;
        return Ok(Json(UploadResponse { url }));
    }
    fs::create_dir_all(&state.upload_dir).map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            e.to_string(),
        )
    })?;
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

async fn admin_estimates(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> Result<Json<Value>, (StatusCode, String)> {
    require_admin_session(&state, &headers).await?;

    if let Some(ref db) = state.db {
        let rows = db
            .fetch_estimates(200)
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e))?;
        return Ok(Json(serde_json::json!(rows)));
    }
    if let Some(ref sb) = state.sb {
        let rows = sb
            .fetch_estimates(200)
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e))?;
        return Ok(Json(serde_json::json!(rows)));
    }

    // Local: parse jsonl
    let raw = fs::read_to_string(&state.estimates_file).unwrap_or_default();
    let mut rows: Vec<Value> = raw
        .lines()
        .filter_map(|l| serde_json::from_str(l).ok())
        .collect();
    rows.reverse();
    Ok(Json(serde_json::json!(rows)))
}

async fn patch_estimate(
    State(state): State<AppState>,
    headers: HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
    Json(body): Json<Value>,
) -> Result<Json<Value>, (StatusCode, String)> {
    require_admin_session(&state, &headers).await?;

    // Strip any fields that should not be user-controlled.
    let mut patch = serde_json::Map::new();
    for key in ["status","notes","quote_amount","quote_sent_at","quote_accepted","follow_up_at","responded_at"] {
        if let Some(v) = body.get(key) {
            patch.insert(key.to_string(), v.clone());
        }
    }
    let patch = Value::Object(patch);

    if let Some(ref db) = state.db {
        db.update_estimate(&id, &patch)
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e))?;
        return Ok(Json(serde_json::json!({"ok": true})));
    }
    if let Some(ref sb) = state.sb {
        sb.update_estimate_row(&id, &patch)
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e))?;
        return Ok(Json(serde_json::json!({"ok": true})));
    }

    Err((StatusCode::SERVICE_UNAVAILABLE, "No database configured".into()))
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

    // Save the estimate — Supabase (db or full sb) wins, else local jsonl.
    let row = serde_json::to_value(&body)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let saved_to_supabase = if let Some(ref db) = state.db {
        db.insert_estimate(&row)
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e))?;
        true
    } else if let Some(ref sb) = state.sb {
        sb.insert_estimate_row(row.clone())
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e))?;
        true
    } else {
        false
    };

    if !saved_to_supabase {
        if let Some(parent) = state.estimates_file.parent() {
            fs::create_dir_all(parent).map_err(|e| {
                (StatusCode::INTERNAL_SERVER_ERROR, e.to_string())
            })?;
        }
        let line = serde_json::to_string(&body).map_err(|e| {
            (StatusCode::INTERNAL_SERVER_ERROR, e.to_string())
        })?;
        use std::io::Write;
        let mut f = fs::OpenOptions::new()
            .create(true)
            .append(true)
            .open(&state.estimates_file)
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
        writeln!(f, "{line}").map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    }

    // Fire-and-forget email notification to admin (non-blocking, never fails the request).
    if let Some(ref m) = state.mailer {
        let m = m.clone();
        let first = body.first_name.clone().unwrap_or_default();
        let last  = body.last_name.clone().unwrap_or_default();
        let em    = body.email.clone();
        let ph    = body.phone.clone().unwrap_or_default();
        let pt    = body.project_type.clone().unwrap_or_default();
        let msg   = body.message.clone().unwrap_or_default();
        tokio::spawn(async move {
            m.send_estimate_notification(&first, &last, &em, &ph, &pt, &msg).await;
        });
    }

    Ok(StatusCode::CREATED)
}

#[tokio::main]
async fn main() {
    dotenvy::dotenv().ok();

    let site_file = site_content_path();
    let upload_dir = upload_dir_path();
    let estimates_file = estimates_path();

    let sb = supabase::Supabase::from_env();
    let db = supabase::DbClient::from_env();
    let ml = mailer::Mailer::from_env();

    let admin_email = std::env::var("MHW_ADMIN_EMAIL")
        .unwrap_or_else(|_| "admin@mattwoodworks.local".into())
        .to_lowercase();
    let admin_password = std::env::var("MHW_ADMIN_PASSWORD")
        .unwrap_or_else(|_| "devpassword".into());

    // On startup: if DbClient is available and MHW_ADMIN_PASSWORD is set,
    // seed the admin_users table with a fresh bcrypt hash (upsert — safe to repeat).
    if let Some(ref db_ref) = db {
        if !admin_password.is_empty() && admin_password != "devpassword" {
            match bcrypt::hash(&admin_password, bcrypt::DEFAULT_COST) {
                Ok(hash) => {
                    if let Err(e) = db_ref.upsert_admin(&admin_email, &hash, "admin").await {
                        eprintln!("  [warn] could not seed admin_users: {e}");
                    }
                }
                Err(e) => eprintln!("  [warn] bcrypt hash failed: {e}"),
            }
        }
    }

    let state = AppState {
        sb,
        db,
        mailer: ml,
        admin_email,
        admin_password,
        jwt_secret: local_jwt_secret(),
        site_file: site_file.clone(),
        upload_dir: upload_dir.clone(),
        estimates_file: estimates_file.clone(),
    };

    let supabase_mode = state.sb.is_some();
    let db_active     = state.db.is_some();
    let mailer_active = state.mailer.is_some();

    let app = Router::new()
        .route("/health", get(health))
        .route("/api/site/content", get(get_site_content))
        .route("/api/auth/login", post(login))
        .route("/api/admin/me", get(admin_me))
        .route("/api/admin/site-content", put(put_site_content))
        .route("/api/admin/upload-image", post(upload_image))
        .route("/api/admin/estimates", get(admin_estimates))
        .route("/api/admin/estimates/:id", patch(patch_estimate))
        .route("/api/estimate-requests", post(post_estimate))
        // CORS outermost so failed upstream responses still get Access-Control-* headers.
        .layer(NormalizePathLayer::trim_trailing_slash())
        .layer(CorsLayer::permissive())
        .with_state(state);

    // Render sets PORT; MHW_BIND overrides everything; fallback to 0.0.0.0:PORT or local default.
    let bind = std::env::var("MHW_BIND").unwrap_or_else(|_| {
        let port = std::env::var("PORT").unwrap_or_else(|_| "8080".into());
        format!("0.0.0.0:{port}")
    });
    let listener = tokio::net::TcpListener::bind(&bind)
        .await
        .unwrap_or_else(|e| panic!("bind {bind}: {e}"));

    let notify_email = std::env::var("ADMIN_NOTIFY_EMAIL").unwrap_or_default();
    eprintln!("mhw-api listening on http://{bind}");
    if supabase_mode {
        eprintln!("  mode:         Supabase (auth + CMS + estimates + storage)");
        eprintln!(
            "  admin email:  {} (must match Auth user; password-only login)",
            admin_login_email()
        );
    } else if db_active {
        eprintln!("  site content: Supabase → site_content table");
        eprintln!("  uploads:      Supabase Storage → {}", supabase::STORAGE_BUCKET);
        eprintln!("  estimates:    Supabase → estimate_requests table");
    } else {
        eprintln!("  site content: {}", site_file.display());
        eprintln!("  uploads:      {}", upload_dir.display());
        eprintln!("  estimates:    {}", estimates_file.display());
    }
    if mailer_active {
        eprintln!("  notifications: email → {notify_email}");
    } else {
        eprintln!("  notifications: disabled (set SMTP_HOST/PORT/USER/PASS/FROM + ADMIN_NOTIFY_EMAIL to enable)");
    }

    axum::serve(listener, app).await.unwrap();
}
