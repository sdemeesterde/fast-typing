use miniredis::BufferedClient;

use crate::{SCORES_KEY, errors::AppError, routes::events::event::RankingSnapshot};

/// Retrieve top 10 in decreaseing order.
pub async fn get_top10_ranking(redis: &BufferedClient) -> Result<Vec<(u64, String)>, AppError> {
    match redis
        .zrange(SCORES_KEY, 0, u64::MAX, true, Some(0), Some(10))
        .await
    {
        Ok(top10) => Ok(top10),
        Err(e) => Err(AppError::Redis(format!("zrange failed: {e}"))),
    }
}

/// Returns the ranking of the given connection.
/// If no ranking is done yet, returns None as its score.
pub async fn get_user_rank(
    redis: &BufferedClient,
    username: &str,
) -> Result<Option<u64>, AppError> {
    match redis.zrank(SCORES_KEY, username, true).await {
        Ok(Some(r)) => Ok(Some(r as u64)),
        Ok(None) => Ok(None),
        Err(e) => Err(AppError::Redis(format!("zrank failed: {e}"))),
    }
}

/// Returns the score of the give username.
/// If no score exists, returns the default score: 0.
pub async fn get_score(redis: &BufferedClient, username: &str) -> Result<u64, AppError> {
    match redis.zscore(SCORES_KEY, username).await {
        Ok(Some(s)) => Ok(s as u64),
        Ok(None) => Ok(0),
        Err(e) => Err(AppError::Redis(format!("zscore failed: {e}"))),
    }
}

pub async fn get_ranking_snapshot(
    redis: &BufferedClient,
    username: &str,
) -> Result<RankingSnapshot, AppError> {
    Ok(RankingSnapshot {
        top10: get_top10_ranking(redis).await?,
        user_rank: get_user_rank(redis, username).await?,
        user_score: get_score(redis, username).await?,
    })
}
