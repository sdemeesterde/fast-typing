import type { Word } from "../types/game.ts";
import { words } from "../../data/words.ts";

export function getNextRandomWord(next_id: number): Word {
  let word = words[Math.floor(Math.random() * words.length)];
  return {
    id: next_id + 1,
    text: word,
    yPcnt: 0,
    cursorIdx: -1,
    errorAt: undefined,
  };
}
