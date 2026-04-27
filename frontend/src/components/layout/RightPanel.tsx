import type { GameHistory } from "../../types/game";
import { FaQuestionCircle } from "react-icons/fa";

type RightPanelProps = {
  gameHistory: GameHistory;
};

export function RightPanel({ gameHistory }: RightPanelProps) {
  const formatTimeAgo = (date: Date) => {
    const diff = Math.floor((Date.now() - date.getTime()) / 1000);

    const min = Math.floor(diff / 60);
    if (min < 60) return `${min}m ago`;

    const h = Math.floor(min / 60);
    return `${h}h ago`;
  };
  return (
    <aside
      className="flex flex-col items-center gap-3 p-2 border
             bg-white border-gray-300
             dark:bg-[#292524] dark:text-[#e7e5e4] dark:border-[#44403c]
             h-full min-h-0"
    >
      <div className="flex flex-col items-center gap-3 w-full h-full min-h-0">
        {/* History */}
        <div className="flex items-center gap-1 shrink-0">
          <h2 className="text-lg font-semibold">History</h2>

          <div className="relative group cursor-help p-1 rounded hover:bg-black/5 dark:hover:bg-white/10">
            <FaQuestionCircle className="text-gray-400 w-4 h-4" />

            <div
              className="absolute left-1/2 -translate-x-1/2 mt-2 w-52 text-xs
                     opacity-0 group-hover:opacity-100 transition
                     bg-black text-white rounded px-2 py-1 shadow-lg pointer-events-none"
            >
              Only the history of the current connexion is displayed.
            </div>
          </div>
        </div>

        {/* Scrollable list */}
        <div className="flex-1 min-h-0 w-full max-w-xs overflow-y-auto pr-1">
          <div className="flex flex-col gap-2 text-sm">
            {gameHistory.map((entry, index) => (
              <div
                key={entry.time.getTime()}
                className={`flex items-center justify-between gap-2 px-2 py-1 rounded
              ${index % 2 === 0 ? "bg-black/[0.06] dark:bg-white/[0.08]" : ""}
            `}
              >
                <span className="w-5 text-gray-500">{index + 1}.</span>

                <span className="flex-1 min-w-0 truncate text-gray-500">
                  {formatTimeAgo(entry.time)}
                </span>

                <span className="w-14 text-right tabular-nums font-medium">
                  {entry.score}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </aside>
  );
}
