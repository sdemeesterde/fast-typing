use miniredis::BufferedClient;
use serde::{Deserialize, Serialize};
use sqlx::SqlitePool;
use tokio::sync::broadcast;
use uuid::Uuid;

use crate::routes::events::event::{ConnectionsEvent, RankingEvent};

/// Shared application state injected into every handler via `web::Data`.
pub struct AppState {
    pub redis: BufferedClient,
    pub ranking_tx: broadcast::Sender<RankingEvent>,
    pub connections_tx: broadcast::Sender<ConnectionsEvent>,
    pub db_pool: SqlitePool,
}

/// Request body for POST /connection.
#[derive(Debug, Deserialize)]
pub struct ConnectionRequest {
    pub username: String,
}

/// Response body for POST /connection.
#[derive(Debug, Serialize)]
pub struct ConnectionResponse {
    pub token: Uuid,
}

/// Request body for SSE GET.
/// As for POST /heartbeat
#[derive(Debug, Deserialize)]
pub struct AuthBody {
    pub username: String,
    pub token: Uuid,
}

/// Request body for POST /scores.
#[derive(Debug, Deserialize)]
pub struct ScoreRequest {
    pub username: String,
    pub token: Uuid,
    pub score: u64,
}
