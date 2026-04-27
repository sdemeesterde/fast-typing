use std::{pin::Pin, time::Duration};

use actix_web::{get, web};
use actix_web_lab::sse::{Data, Event, Sse};
use futures_util::{StreamExt, stream};
use miniredis::BufferedClient;
use tokio::sync::broadcast;
use tokio_stream::{Stream, wrappers::BroadcastStream};

use crate::{
    errors::AppError,
    models::{AppState, AuthBody},
    routes::events::event::ConnectionsEvent,
    services::{connections::get_connections_cnt, token::check_token},
};

/// Hybrid model to post number of connections to clients.
/// - Routine task posting current count every 30secs (Present function)
/// - Pushes on events (creation of connection, reception of closing connection relying on best-effort)
pub async fn connections_broadcast_routine(
    connections_tx: broadcast::Sender<ConnectionsEvent>,
    redis: BufferedClient,
) {
    tokio::spawn(async move {
        let mut interval = tokio::time::interval(Duration::from_secs(30));

        loop {
            tokio::select! {
                _ = interval.tick() => {
                    match get_connections_cnt(&redis).await {
                        Ok(connections_cnt) => {
                            let _ = connections_tx.send(ConnectionsEvent {connections_cnt});
                        },
                        Err(_) => {
                            tracing::warn!("Get connections cnt failed for connections broadcast routine task.");
                        }
                    }
                }

                _ = tokio::signal::ctrl_c() => {
                    tracing::info!("Shutting connections count broadcaster");
                    break;
                }
            }
        }
    });
}

type ConnectionsStream = Pin<Box<dyn Stream<Item = Result<Event, AppError>>>>;

#[get("/api/events/connections")]
pub async fn connection_count(
    state: web::Data<AppState>,
    body: web::Query<AuthBody>,
) -> Result<Sse<ConnectionsStream>, AppError> {
    let req = body.into_inner();
    let username = req.username;
    let token = req.token;

    // Auth check
    if !check_token(&state.redis, token, username.clone()).await? {
        return Err(AppError::Unauthorized);
    }

    let rx = state.connections_tx.subscribe();

    let initial = {
        stream::once(async move {
            let connections = get_connections_cnt(&state.redis).await?;
            Ok(Event::Data(
                Data::new_json(connections)?.event("connections"),
            ))
        })
        .boxed_local()
    };

    let updates = BroadcastStream::new(rx)
        .filter_map(|msg| async move {
            msg.ok().map(|connections_data: ConnectionsEvent| {
                Ok::<_, AppError>(Event::Data(
                    Data::new(connections_data.connections_cnt.to_string()).event("connections"),
                ))
            })
        })
        .boxed_local();

    let body: ConnectionsStream = stream::select_all([initial, updates]).boxed_local();

    tracing::info!("SSE connection established for connections");
    Ok(Sse::from_stream(body)
        .with_keep_alive(Duration::from_secs(15))
        .with_retry_duration(Duration::from_secs(3)))
}
