pub mod db;

pub mod errors;

pub mod models;

pub mod routes;

pub mod services;

use std::time::Duration;

/// Redis key constants used across our API.
pub const SCORES_KEY: &str = "typing-game-score-z";
pub const TOKEN_TTL: Duration = Duration::from_secs(60);
pub const MAX_LEADERBOARD_SIZE: i64 = 1_000_000;
