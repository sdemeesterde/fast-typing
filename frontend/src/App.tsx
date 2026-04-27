import { useConnection } from "./hooks/useConnection.ts";
import { useConnectionEvents } from "./hooks/useConnectionEvents.ts";
import { useDarkMode } from "./hooks/useDarkMode.ts";
import { useIsMobile } from "./hooks/useIsMobile.ts";
import { useGameEngine } from "./hooks/useGameEngine.ts";
import { useGameSettings } from "./hooks/useGameSettings.ts";
import { useRankingEvents } from "./hooks/useRankingEvents.ts";
import { useSubmitScore } from "./hooks/useSubmitScore.ts";

import { BottomBar } from "./components/layout/BottomBar.tsx";
import { GameArea } from "./components/layout/GameArea.tsx";
import { GameLayout } from "./components/layout/GameLayout.tsx";
import { LeftPanel } from "./components/layout/LeftPanel.tsx";
import { MobileBlocker } from "./components/ui/MobileBlocker.tsx";
import { RightPanel } from "./components/layout/RightPanel.tsx";
import { TopBar } from "./components/layout/TopBar.tsx";

import type { GameState } from "./types/game.ts";

import { useRef, useState } from "react";

function App() {
  const [darkMode, setDarkMode] = useDarkMode();

  const [gameState, setGameState] = useState<GameState>("enterName");
  const gameScoreRef = useRef(0);

  const connection = useConnection(gameScoreRef, setGameState);
  const gameSetting = useGameSettings();
  const submitScore = useSubmitScore(connection.state);

  const [gameInstance, gameScore, gameHistory] = useGameEngine(
    gameScoreRef,
    gameState,
    setGameState,
    gameSetting,
    submitScore,
  );

  let liveCnt = useConnectionEvents(connection);
  const ranking = useRankingEvents(connection, gameScoreRef);

  if (useIsMobile()) {
    return <MobileBlocker />;
  } else {
    return (
      <GameLayout
        connection={connection}
        gameState={gameState}
        setGameState={setGameState}
      >
        <TopBar
          liveCnt={liveCnt}
          connection={connection}
          gameState={gameState}
          gameScore={gameScore}
          darkMode={darkMode}
          setDarkMode={setDarkMode}
        />
        <LeftPanel
          connection={connection}
          gameScore={gameScore}
          ranking={ranking}
        />
        <GameArea
          gameSetting={gameSetting}
          gameState={gameState}
          gameInstance={gameInstance}
          darkMode={darkMode}
        />
        <RightPanel gameHistory={gameHistory} />
        <BottomBar />
      </GameLayout>
    );
  }
}

export default App;
