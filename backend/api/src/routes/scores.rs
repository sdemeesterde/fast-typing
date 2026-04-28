use std::cmp;

use actix_web::{HttpResponse, post, web};

use crate::{
    MAX_LEADERBOARD_SIZE, SCORES_KEY,
    db::scores::upsert_best_score,
    errors::AppError,
    models::{AppState, ScoreRequest},
    routes::events::event::RankingEvent,
    services::{
        leaderboard::{get_score, get_user_rank},
        token::check_token,
    },
};

/// POST /scores
///
/// Submits a score for the connection owner.
/// If the score is not better than current best one, it is ignored.
#[post("/api/scores")]
pub async fn submit_score(
    state: web::Data<AppState>,
    body: web::Json<ScoreRequest>,
) -> Result<HttpResponse, AppError> {
    let req = body.into_inner();

    let username = req.username;
    let score = req.score;
    let token = req.token;

    // Client provided the wrong token
    if !check_token(&state.redis, token, username.clone()).await? {
        return Err(AppError::Unauthorized);
    }

    let old_best_score = get_score(&state.redis, &username).await?;
    // Ignore scores that are lower than current best score.
    if score < old_best_score {
        return Ok(HttpResponse::Ok().finish());
    }

    let len = state.redis.zlength(SCORES_KEY).await.unwrap_or(0) as i64;

    // ------------------------------------------------------------------
    // -                       Simple anti cheat logic                  -
    // ------------------------------------------------------------------
    // Max speed is ~300 WPM (Word per minute)
    // Being conservative and taking into account speed burst, let's assume:
    // Maximum human speed: 45 char / second.
    //
    // Assuming a put every 300ms, one delta score increase
    // cannot exceed 15 char.
    const MAX_KEYSTROKE_PS: u64 = 15;
    if (len < MAX_LEADERBOARD_SIZE) && (score - old_best_score) >= MAX_KEYSTROKE_PS {
        return Err(AppError::BadRequest);
    } else if len == MAX_LEADERBOARD_SIZE
        && let Ok(Some((last_score, _))) = state
            .redis
            .zrange(SCORES_KEY, 0, u64::MAX, false, Some(0), Some(1))
            .await
            .map(|v| v.first().cloned())
    {
        let optimistic_score = cmp::max(old_best_score, last_score);
        // Does not qualify to enter the ranking
        if score < optimistic_score {
            return Ok(HttpResponse::Ok().finish());
        }
        if (score - optimistic_score) > MAX_KEYSTROKE_PS {
            return Err(AppError::BadRequest);
        }
    }
    // ------------------------------------------------------------------

    // SQLite insert for persistent data
    if let Err(e) = upsert_best_score(&state.db_pool, &username, score as i64).await {
        tracing::warn!("sqlite insert of score failed: {e}");
    }

    let old_rank = get_user_rank(&state.redis, &username).await?;

    let entry = (score, username.clone());
    let _ = state.redis.zadd(SCORES_KEY, vec![entry]).await;

    // Evict the worst score if we are over the cap
    if len > MAX_LEADERBOARD_SIZE
        && let Ok(Some((_, remove_username))) = state
            .redis
            .zrange(SCORES_KEY, 0, u64::MAX, false, Some(0), Some(1))
            .await
            .map(|v| v.first().cloned())
    {
        match state
            .redis
            .zrem(SCORES_KEY, vec![remove_username.clone()])
            .await
        {
            Ok(1) => (),
            Ok(n) => tracing::warn!("zrem expected output = 1, but got: {n}"),
            Err(e) => tracing::warn!("zrem failed: {e}"),
        };
        if username == remove_username {
            return Ok(HttpResponse::Ok().finish());
        }
    }

    let new_rank = get_user_rank(&state.redis, &username).await?;

    let ranking_event = RankingEvent {
        old: (old_best_score, old_rank, username.clone()),
        new: (score, new_rank, username.clone()),
    };
    if let Err(e) = state.ranking_tx.send(ranking_event) {
        tracing::warn!("connections broadcast failed: {e}");
    }

    tracing::info!(
        %username,
        %score,
        "score submitted"
    );

    Ok(HttpResponse::Ok().finish())
}
