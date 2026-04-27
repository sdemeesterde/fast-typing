import { useEffect, useMemo, useRef, useState } from "react";
import { useSse } from "./useSse";
import type {
  RankingSnapshot,
  RankingState,
  RankingUpdate,
} from "../types/api";
import type { UseConnectionReturn } from "./useConnection";

function normaliseSnapshot(snapshot: RankingSnapshot): RankingState {
  return {
    top10: snapshot.top10.map(([score, name]: [number, string]) => ({
      score,
      name,
    })),
    user_rank: snapshot.user_rank,
    user_score: snapshot.user_score,
  };
}

function applyUpdate(
  username: string | undefined,
  gameScoreRef: React.RefObject<number>,
  prev: RankingState,
  update: RankingUpdate,
): RankingState {
  const [oldScore, oldRank, oldName] = update.old;
  const [newScore, newRank, newName] = update.new;

  let newTop10 = [...prev.top10];

  // Remove old entry if it was in top10
  if (oldRank !== null && oldRank < 10) {
    newTop10.splice(oldRank, 1);
  }
  // And add the entry back again with new score
  if (newRank !== null && newRank < 10) {
    newTop10.splice(newRank, 0, {
      score: newScore,
      name: newName,
    });
  }

  // Update current user ranking
  let newUserRank = prev.user_rank;
  if (username && oldName === username) {
    newUserRank = newRank;
  }
  // The update indicate that a competing user has overtaken current user.
  if (
    newUserRank !== null &&
    oldScore < gameScoreRef.current &&
    newScore > gameScoreRef.current
  ) {
    newUserRank--;
  }

  return {
    top10: newTop10,
    user_rank: newUserRank,
    user_score: gameScoreRef.current,
  };
}

export function useRankingEvents(
  connection: UseConnectionReturn,
  gameScoreRef: React.RefObject<number>,
): RankingState | null {
  const [ranking, setRanking] = useState<RankingState | null>(null);

  const usernameRef = useRef(connection.state?.username);

  useEffect(() => {
    usernameRef.current = connection.state?.username;
  }, [connection.state?.username]);

  const handlers = useMemo(
    () => ({
      snapshot: (data: unknown) => {
        setRanking(normaliseSnapshot(data as RankingSnapshot));
      },
      update: (data: unknown) => {
        setRanking((prev) =>
          prev
            ? applyUpdate(
                usernameRef.current,
                gameScoreRef,
                prev,
                data as RankingUpdate,
              )
            : prev,
        );
      },
    }),
    [usernameRef],
  );

  useSse({
    connection,
    path: "/events/ranking",
    handlers,
  });

  return ranking;
}
