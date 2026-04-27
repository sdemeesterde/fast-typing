import type { UseConnectionReturn } from "../../hooks/useConnection";
import type { RankingState } from "../../types/api";
import type { GameScore } from "../../types/game";

type LeftPanelProps = {
  connection: UseConnectionReturn;
  gameScore: GameScore;
  ranking: RankingState | null;
};

export function LeftPanel({ connection, gameScore, ranking }: LeftPanelProps) {
  const userIsInTop10 =
    (ranking?.user_rank && ranking?.user_rank < 10) ||
    (ranking &&
      ranking.top10.find(
        (e) => connection.state && e.name == connection.state.username,
      )?.name === connection.state?.username);
  return (
    <aside
      className="flex flex-col p-2 gap-3 border
                 bg-white border-gray-300
                 dark:bg-[#292524] dark:text-[#e7e5e4] dark:border-[#44403c]
                 h-full min-h-0"
    >
      {/* Leaderboard: only display the ranking if there is data */}
      {ranking && (
        <div className="flex flex-col items-center gap-4 h-full min-h-0">
          <h2 className="text-lg font-semibold text-center shrink-0">
            Leaderboard
          </h2>

          <div className="flex-1 min-h-0 w-full max-w-xs overflow-y-auto">
            {/* Score list */}
            <div className="flex-1 min-h-0 w-full text-base max-w-xs">
              {ranking.top10.slice(0, 10).map((entry, index) => {
                const isCurrent = entry.name === connection.state?.username;

                return (
                  <div
                    key={index}
                    className={`flex items-center justify-between px-3 py-2 rounded min-h-[28px]
                ${
                  isCurrent
                    ? "bg-yellow-100 dark:bg-yellow-900/40"
                    : index % 2 === 0
                      ? "bg-black/[0.06] dark:bg-white/[0.08]"
                      : ""
                }
              `}
                  >
                    {/* Rank */}
                    <span className="w-6 text-gray-500 text-sm">
                      {index + 1}.
                    </span>

                    {/* Name (truncate + hover) */}
                    <span
                      className="flex-1 min-w-0 truncate"
                      title={entry.name}
                    >
                      {entry.name}
                    </span>

                    {/* Score (fixed width, right aligned) */}
                    <span className="w-14 text-right tabular-nums font-medium">
                      {entry.score}
                    </span>
                  </div>
                );
              })}

              {/* Current player is NOT in top 10 */}
              {/* Here we rely on the ranking provided by server */}
              {!userIsInTop10 && (
                <>
                  <div className="border-t border-gray-300 dark:border-[#44403c] my-2" />

                  <div className="flex items-center justify-between gap-2 px-2 py-1 rounded bg-yellow-100 dark:bg-yellow-900/40">
                    <span className="w-5 text-gray-500">
                      {ranking.user_rank === null || ranking.user_score === 0
                        ? "-"
                        : ranking.user_rank + 1}
                      .
                    </span>
                    <span className="w-14 text-right tabular-nums font-medium">
                      {/* UI optimistic does not wait for server SSE */}
                      {Math.max(ranking.user_score, gameScore)}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
