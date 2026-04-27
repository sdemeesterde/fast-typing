use serde::Serialize;

/// SSE event: Initial (snapshot) ranking event
#[derive(Clone, Debug, Serialize)]
pub struct RankingSnapshot {
    pub top10: Vec<(u64, String)>, // (score, username) in decreasing order based on score.
    pub user_rank: Option<u64>,
    pub user_score: u64, // The default score is there, so no need of Option<..>
}

/// SSE event: rankings
#[derive(Clone, Debug, Serialize)]
pub struct RankingEvent {
    pub old: (u64, Option<u64>, String), // (score, rank, username)
    pub new: (u64, Option<u64>, String),
}

/// SSE events: connections
#[derive(Clone, Debug, Serialize)]
pub struct ConnectionsEvent {
    pub connections_cnt: usize,
}
