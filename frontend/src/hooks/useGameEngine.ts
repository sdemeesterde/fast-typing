import React, { useEffect, useRef, useState } from "react";
import { getNewGame } from "../utils/getNewGame";
import { getNextRandomWord } from "../utils/getNextRandomWord";

import type {
  GameHistory,
  GameInstance,
  GameScore,
  GameSetting,
  GameState,
  HistoryEntry,
} from "../types/game";
import type { UseSubmitScoreReturn } from "./useSubmitScore";

export function useGameEngine(
  gameScoreRef: React.RefObject<number>,
  gameState: GameState,
  setGameState: React.Dispatch<React.SetStateAction<GameState>>,
  gameSetting: GameSetting,
  scoreSubmit: UseSubmitScoreReturn,
): [GameInstance, GameScore, GameHistory] {
  const gameRef = useRef<GameInstance>(getNewGame());
  const [gameInstance, setGameInstance] = useState<GameInstance>(
    gameRef.current,
  );
  const [gameScore, setGameScore] = useState(gameScoreRef.current);
  const [gameHistory, setGameHistory] = useState<GameHistory>([]);

  useEffect(() => {
    setGameScore(gameScoreRef.current);
  }, [gameScoreRef]);

  const gameSettingRef = useRef(gameSetting);
  gameSettingRef.current = gameSetting; // synchronous during render

  // In case of a logout, login, sumbitScore must be updated.
  const submitRef = useRef(scoreSubmit);
  useEffect(() => {
    submitRef.current = scoreSubmit;
  }, [scoreSubmit]);

  // Only send connection score improvement to spare the backend.
  const bestSentScore = useRef(-1);
  useEffect(() => {
    const interval = setInterval(() => {
      const currentScore = gameScoreRef.current;

      if (currentScore > bestSentScore.current) {
        bestSentScore.current = currentScore;
        submitRef.current.submitScore(currentScore);
      }
    }, 300);

    return () => clearInterval(interval);
  }, []);

  // -----------------------------
  // Typing handler: cursor logic
  // -----------------------------
  const handleTyping = (key: string) => {
    if (key.length !== 1) return;

    const game = gameRef.current;

    if (game.currWordId == game.words.length) return;

    const currWord = game.words[game.currWordId];
    const expected = currWord.text[currWord.cursorIdx]?.toLowerCase();

    if (key !== expected) {
      currWord.errorAt = performance.now();
      return;
    }

    currWord.cursorIdx += 1;
    gameScoreRef.current += 1;
    setGameScore(gameScoreRef.current);

    // Move to next word
    if (currWord.cursorIdx === currWord.text.length) {
      game.currWordId++;
      if (game.currWordId == game.words.length) {
        game.words.push(getNextRandomWord(game.currWordId));
      }
      game.words[game.currWordId].cursorIdx = 0;
    }
  };

  // ------------------------
  // Keyboard listener
  // ------------------------
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();

      if (gameState === "enterNameAfterLogout") {
        // In case of a logout, make sure the game is reset
        gameRef.current = getNewGame();
        // Trigger clean up of the old game on the UI.
        setGameInstance(gameRef.current);
        // Reset heuristic
        bestSentScore.current = -1;
        // Reset history
        setGameHistory([]);
        return;
      }

      if (key === "escape") {
        setGameState("pause");
        return;
      }

      if (key === "k" && ["ready", "gameOver", "pause"].includes(gameState)) {
        setGameState("playing");
        return;
      }

      if (gameState === "playing") {
        handleTyping(key);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [gameState]);

  // ------------------------
  // Game loop
  // ------------------------
  useEffect(() => {
    if (gameState !== "playing") return;
    if (!gameSetting.layoutHeight) return;

    let animationFrame: number;
    let lastTime = performance.now();

    const loop = () => {
      const currentTime = performance.now();
      const deltaTime = (currentTime - lastTime) / 1_000;
      lastTime = currentTime;

      const game = gameRef.current;
      const setting = gameSettingRef.current;

      const difficulty =
        setting.speedIncrease **
        Math.floor(gameScoreRef.current / setting.hurdleScore);

      // % of total height to advance this frame
      const yPcntIncrease =
        (1 / setting.maxDisplayTime) * difficulty * deltaTime * 100;

      for (let i = game.currWordId; i < game.words.length; i++) {
        game.words[i].yPcnt += yPcntIncrease;
      }

      // Spawn logic
      const lastWord = game.words[game.words.length - 1];
      if (
        lastWord.yPcnt > 8 &&
        (lastWord.yPcnt / 100) * setting.yLimit > setting.minYGap
      ) {
        game.words.push(getNextRandomWord(game.words.length));
      }

      // Game over check
      if (game.words[game.currWordId].yPcnt >= 100) {
        // Send the final score for fresh up-to-date ranking.
        // Only if it improves best sent score.
        if (bestSentScore.current < gameScoreRef.current) {
          submitRef.current.submitScore(gameScoreRef.current);
        }
        let newHistoryEntry: HistoryEntry = {
          time: new Date(),
          score: gameScoreRef.current,
        };
        setGameHistory((prev) => [...prev, newHistoryEntry]);
        setGameState("gameOver");
        gameRef.current = getNewGame();
        gameScoreRef.current = 0;
        setGameScore(gameScoreRef.current);
        return; // Don't schedule next frame
      }

      setGameInstance({ ...game, words: [...game.words] });
      animationFrame = requestAnimationFrame(loop);
    };

    animationFrame = requestAnimationFrame(loop);

    return () => cancelAnimationFrame(animationFrame);
  }, [gameState, gameSetting]);

  return [gameInstance, gameScore, gameHistory];
}
