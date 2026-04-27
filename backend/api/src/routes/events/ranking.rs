use std::{pin::Pin, time::Duration};

use actix_web::{get, web};
use actix_web_lab::sse::{Data, Event, Sse};
use futures_util::{StreamExt, stream};
use tokio_stream::{
    Stream,
    wrappers::{BroadcastStream, errors::BroadcastStreamRecvError},
};

use crate::{
    errors::AppError,
    models::{AppState, AuthBody},
    services::{leaderboard::get_ranking_snapshot, token::check_token},
};

type RankingStream = Pin<Box<dyn Stream<Item = Result<Event, AppError>>>>;

#[get("/api/events/ranking")]
pub async fn ranking(
    state: web::Data<AppState>,
    body: web::Query<AuthBody>,
) -> Result<Sse<RankingStream>, AppError> {
    let req = body.into_inner();
    let username = req.username;
    let token = req.token;

    // Auth check
    if !check_token(&state.redis, token, username.clone()).await? {
        return Err(AppError::Unauthorized);
    }

    let rx = state.ranking_tx.subscribe();
    let redis = state.redis.clone();

    let initial = {
        let redis = redis.clone();
        let username = username.clone();
        stream::once(async move {
            let snapshot = get_ranking_snapshot(&redis, &username).await?;
            Ok(Event::Data(Data::new_json(&snapshot)?.event("snapshot")))
        })
        .boxed_local()
    };

    let updates = {
        let redis = redis.clone();
        let username = username.clone();
        BroadcastStream::new(rx)
            .filter_map(move |msg| {
                let redis = redis.clone();
                let username = username.clone();
                async move {
                    match msg {
                        Ok(update) => {
                            tracing::info!("broadcasting update");
                            Some(Ok(Event::Data(
                                Data::new_json(&update).ok()?.event("update"),
                            )))
                        }
                        Err(BroadcastStreamRecvError::Lagged(n)) => {
                            tracing::warn!("lagged by {n}");
                            let snapshot = get_ranking_snapshot(&redis, &username).await.ok()?;
                            Some(Ok(Event::Data(
                                Data::new_json(&snapshot).ok()?.event("snapshot"),
                            )))
                        }
                    }
                }
            })
            .boxed_local()
    };

    let body: RankingStream = stream::select_all([initial, updates]).boxed_local();

    tracing::info!("SSE connection established for ranking");
    Ok(Sse::from_stream(body)
        .with_keep_alive(Duration::from_secs(15))
        .with_retry_duration(Duration::from_secs(5)))
}
