import { useCallback, useState } from "react";
import { apiClient } from "../utils/apiClient";
import type { ConnectionState, ScoreRequest } from "../types/api";

export interface UseSubmitScoreReturn {
  submitScore: (score: number) => Promise<void>;
  isSubmitting: boolean;
  error: string | null;
}

export function useSubmitScore(
  connection: ConnectionState | null,
): UseSubmitScoreReturn {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submitScore = useCallback(
    async (score: number) => {
      if (!connection) return;

      setIsSubmitting(true);
      setError(null);

      try {
        await apiClient.post<void>("/scores", {
          username: connection.username,
          token: connection.token,
          score,
        } satisfies ScoreRequest);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to submit score";
        setError(message);
        // A score submission failure should never crash the game.
      } finally {
        setIsSubmitting(false);
      }
    },
    [connection],
  );

  return { submitScore, isSubmitting, error };
}
