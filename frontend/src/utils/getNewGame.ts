import type { GameInstance } from "../types/game";
import { getNextRandomWord } from "./getNextRandomWord";

export function getNewGame(): GameInstance {
  let word = getNextRandomWord(0);
  return {
    currWordId: 0,
    words: [{ ...word, cursorIdx: 0 }],
  };
}
