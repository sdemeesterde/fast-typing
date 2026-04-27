use actix_web::{HttpResponse, post, web};
use bytes::Bytes;

use crate::{
    TOKEN_TTL,
    errors::AppError,
    models::{AppState, AuthBody},
    routes::events::event::ConnectionsEvent,
    services::{connections::get_connections_cnt, token::check_token},
};

/// POST /heartbeat
///
/// Post a keep alive connection.
/// The client is expected to send it every 19secs.
#[post("/api/heartbeat")]
pub async fn heartbeat(
    state: web::Data<AppState>,
    body: web::Json<AuthBody>,
) -> Result<HttpResponse, AppError> {
    let req = body.into_inner();

    let username = req.username;
    let token = req.token;

    // Auth check
    if !check_token(&state.redis, token, username.clone()).await? {
        return Err(AppError::Unauthorized);
    }

    // Update TTL by reinserting (username - token) pair
    state
        .redis
        .set_expires(
            &username,
            Bytes::copy_from_slice(token.as_bytes()),
            TOKEN_TTL,
        )
        .await
        .map_err(|e| AppError::Redis(format!("SET failed: {e}")))?;

    let connections_cnt = get_connections_cnt(&state.redis).await?;

    // Broadcast event: one new live player
    let connection_event = ConnectionsEvent { connections_cnt };
    if let Err(e) = state.connections_tx.send(connection_event) {
        tracing::warn!("connections broadcast failed: {e}");
    }

    tracing::info!(%username, "updating ttl");

    Ok(HttpResponse::NoContent().finish())
}
