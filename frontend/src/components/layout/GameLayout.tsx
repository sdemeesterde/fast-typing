import type { UseConnectionReturn } from "../../hooks/useConnection";
import type { GameState } from "../../types/game";
import { NameForm } from "../ui/NameForm";

type GameLayoutProps = {
  connection: UseConnectionReturn;
  gameState: GameState;
  setGameState: React.Dispatch<React.SetStateAction<GameState>>;
  children: React.ReactNode;
};

export function GameLayout({
  connection,
  gameState,
  setGameState,
  children,
}: GameLayoutProps) {
  const isLoginScreen =
    gameState === "enterName" || gameState === "enterNameAfterLogout";
  return (
    <div
      className={`grid h-screen w-screen overflow-hidden
      grid-rows-[auto_1fr_auto]
      grid-cols-[200px_1fr_200px]
      gap-2 p-2
      transition-colors duration-300
      bg-[#f5f5f4] text-[#1c1917]
      dark:bg-[#1c1917] dark:text-[#f5f5f4]
    `}
    >
      {/* Overlay */}
      {isLoginScreen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center
               bg-black/40 backdrop-blur-sm pointer-events-auto"
        >
          <NameForm
            connection={connection}
            onContinue={() => setGameState("ready")}
          />
        </div>
      )}
      {gameState !== "playing" && !isLoginScreen && (
        <div className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none">
          <div
            className="p-6 rounded-lg border text-center
                 bg-white text-black border-gray-300
                 dark:bg-[#1c1917] dark:text-[#f5f5f4] dark:border-[#57534e]"
          >
            {gameState === "ready" && (
              <p className="text-2xl font-semibold">Press "K" to play</p>
            )}
            {gameState === "pause" && (
              <p className="text-2xl font-semibold">Press "K" to resume</p>
            )}
            {gameState === "gameOver" && (
              <>
                <p className="text-2xl font-semibold">Game over</p>
                <p className="mt-2">Press "K" to play again</p>
              </>
            )}
          </div>
        </div>
      )}{" "}
      {/* Main layout content */}
      {children}
    </div>
  );
}
