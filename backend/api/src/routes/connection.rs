use actix_web::{HttpResponse, delete, post, web};
use bytes::Bytes;
use uuid::Uuid;

use crate::{
    TOKEN_TTL,
    errors::AppError,
    models::{AppState, ConnectionRequest, ConnectionResponse},
    routes::events::event::ConnectionsEvent,
    services::{
        connections::get_connections_cnt,
        token::{check_token, token_exists},
    },
};

/// POST /api/connection
///
/// Claims a username. If available, client receive its uuid token
/// as its credentials that will be required for any subsequent
/// request.
#[post("/api/connection")]
pub async fn create_connection(
    state: web::Data<AppState>,
    body: web::Json<ConnectionRequest>,
) -> Result<HttpResponse, AppError> {
    let username = body.into_inner().username;
    let token = Uuid::new_v4();

    if token_exists(&state.redis, username.clone()).await? {
        tracing::info!(%username, "username already taken.");
        return Err(AppError::UsernameTaken);
    }

    // UI enforces a maximum length of 30
    if username.len() > 30 {
        return Err(AppError::BadRequest);
    }

    // Store connection username - token (uuid)
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

    tracing::info!(%username, "connection created");

    Ok(HttpResponse::Created().json(ConnectionResponse { token }))
}

/// This is a best effort approach. It's not garanteed that the client will send
/// this delete request. But if it does then, let's use it and not wait for the TTL routine.
///
/// DELETE /api/connection/{token}
///
/// Releases the username and closes the connection.
/// Called via `navigator.sendBeacon` on tab unload.
/// Or called manually if user click on "logout".
#[delete("/api/connection/{username}/{token}")]
pub async fn delete_connection(
    state: web::Data<AppState>,
    path: web::Path<(String, Uuid)>,
) -> Result<HttpResponse, AppError> {
    let (username, token) = path.into_inner();

    // Client provided the wrong token
    if !check_token(&state.redis, token, username.clone()).await? {
        return Err(AppError::Unauthorized);
    }

    // Delete the username - token (uuid) to release the username
    let _ = state
        .redis
        .del(vec![(username.to_string())])
        .await
        .map_err(|e| AppError::Redis(format!("DEL failed: {e}")))?;

    let connections_cnt = get_connections_cnt(&state.redis).await?;

    // Broadcast event: one less user connected
    let connection_event = ConnectionsEvent { connections_cnt };
    if let Err(e) = state.connections_tx.send(connection_event) {
        tracing::warn!("connections broadcast failed: {e}");
    }

    tracing::info!(%username, "connection released");
    Ok(HttpResponse::NoContent().finish())
}
