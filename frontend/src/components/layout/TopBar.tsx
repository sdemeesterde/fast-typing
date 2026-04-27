import { FaMoon, FaRegUser, FaSun } from "react-icons/fa";
import { MdLogout } from "react-icons/md";
import { CgMediaLive } from "react-icons/cg";
import type { GameState } from "../../types/game";
import type { UseConnectionReturn } from "../../hooks/useConnection";

type TopBarProps = {
  liveCnt: number;
  connection: UseConnectionReturn;
  gameState: GameState;
  gameScore: number;
  darkMode: boolean;
  setDarkMode: React.Dispatch<React.SetStateAction<boolean>>;
};

export function TopBar({
  liveCnt,
  connection,
  gameState,
  gameScore,
  darkMode,
  setDarkMode,
}: TopBarProps) {
  const isNotLoginScreen =
    gameState !== "enterName" && gameState !== "enterNameAfterLogout";
  return (
    <header
      className="relative col-span-3 flex items-center px-4 h-16 border 
            bg-white border-gray-300
            dark:bg-[#292524] dark:border-[#44403c]"
    >
      {/* Left side */}
      {isNotLoginScreen && (
        <div className="flex items-center gap-2">
          <FaRegUser />

          <span>{connection.state?.username}</span>

          <span className="text-gray-400 mx-1">|</span>

          <div
            className="flex items-center gap-2
               px-3 py-2
               rounded-full
               border border-gray-300
               bg-white
               dark:bg-[#292524] dark:border-[#44403c]
               shadow-sm"
          >
            <CgMediaLive />
            <span>Live {liveCnt}</span>
          </div>
        </div>
      )}
      {/* Middle */}
      <div className="absolute left-1/2 -translate-x-1/2">
        <div
          className="px-4 py-1
             rounded-full
             border border-gray-300
             bg-white
             dark:bg-[#292524] dark:border-[#44403c]
             shadow-sm
             text-lg font-semibold tabular-nums"
        >
          Score {gameScore}
        </div>
      </div>
      {/* Right side */}
      {isNotLoginScreen && (
        <div className="ml-auto flex items-center gap-3">
          {/* Dark mode toggle */}
          <button
            onClick={(e) => {
              setDarkMode((d) => !d);
              e.currentTarget.blur();
            }}
            className="flex items-center justify-center
               w-10 h-10
               rounded-lg
               border border-gray-300
               bg-white
               dark:bg-[#292524] dark:border-[#44403c]
               shadow-sm
               hover:shadow-md hover:-translate-y-[1px]
               active:translate-y-[1px] active:shadow-inner
               transition-all duration-100"
          >
            {darkMode ? <FaSun /> : <FaMoon />}
          </button>

          {/* Logout button */}
          <button
            onClick={() => {
              connection.logout();
            }}
            className="flex items-center gap-2
               px-3 py-2
               rounded-lg
               border border-gray-300
               bg-white
               dark:bg-[#292524] dark:border-[#44403c]
               shadow-sm
               hover:shadow-md hover:-translate-y-[1px]
               active:translate-y-[1px] active:shadow-inner
               transition-all duration-100"
          >
            <MdLogout />
            <span>Log out</span>
          </button>
        </div>
      )}
    </header>
  );
}
