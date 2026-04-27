export const API_BASE =
  import.meta.env.VITE_API_URL ?? "https://fast-typing.be/api";

export interface ConnectionState {
  username: string;
  token: string;
}

// -- Ranking SSE ---------------------------------
export interface RankingEntry {
  score: number;
  name: string;
}

export interface RankingState {
  top10: RankingEntry[]; // Vec<(u64, String)>
  user_rank: number | null; // Option<u64>
  user_score: number;
}

export interface RankingSnapshot {
  top10: [number, string][]; // Vec<(u64, String)>
  user_rank: number | null; // Option<u64>, matching name with rust API
  user_score: number;
}

type RankingTuple = [score: number, rank: number | null, username: string];

export interface RankingUpdate {
  old: RankingTuple;
  new: RankingTuple;
}
// Discriminated union matching what the server actually emits
export type RankingMessage =
  | { type: "snapshot"; data: RankingSnapshot }
  | { type: "update"; data: RankingUpdate };

// -- Connections SSE -----------------------------
export type ConnectionsUpdate = number;

export type ConnectionsMessage = { type: "update"; data: ConnectionsUpdate };

export interface ConnectionRequest {
  username: string;
}

export interface ConnectionResponse {
  token: string;
}

export interface Heartbeat {
  username: string;
  token: string;
}

// -- REST - score
export interface ScoreRequest {
  username: string;
  token: string;
  score: number;
}

// Generic API error
export type ApiErrorCode =
  | "USERNAME_TAKEN"
  | "CONNECTION_NOT_FOUND"
  | "UNAUTHORIZED"
  | "TOKEN_ERROR"
  | "BAD_REQUEST"
  | "INTERNAL_ERROR"
  | "UNKOWN_ERROR";

export function isApiErrorCode(code: any): code is ApiErrorCode {
  return [
    "USERNAME_TAKEN",
    "CONNECTION_NOT_FOUND",
    "UNAUTHORIZED",
    "TOKEN_ERROR",
    "BAD_REQUEST",
    "INTERNAL_ERROR",
    "UNKOWN_ERROR",
  ].includes(code);
}

export class ApiError extends Error {
  public readonly status: number;
  public readonly code: string;

  constructor(status: number, message: string, code: string) {
    super(message);
    this.status = status;
    this.code = code;
    this.name = "ApiError";
  }
}
