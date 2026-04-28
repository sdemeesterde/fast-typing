export interface Word {
  id: number;
  text: string;
  yPcnt: number;
  // Player cursor
  cursorIdx: number;
  errorAt: number | undefined;
}

export type GameState =
  | "enterName"
  | "enterNameAfterLogout"
  | "ready"
  | "playing"
  | "pause"
  | "gameOver";

export interface GameSetting {
  ref: React.RefObject<HTMLDivElement | null>;

  callbackRef: (node: HTMLDivElement | null) => void;
  layoutHeight: number;
  // Corresponds to the time in s a word takes to scroll down the entire GameArea
  maxDisplayTime: number;
  // Factor by which the speed is increased, i.e., 1.1 to increase speed by 10%
  speedIncrease: number;
  // Each `hurdleScore`, the speedIncrease is multiplied by itself
  // After 3 hurdleScore, speedIncrease is powered by 3 (speedIncrease ** 3)
  hurdleScore: number;
  // The limit for the words
  yLimit: number;
  // y Gap between two words displayed
  minYGap: number;
  fireIconSize: number;
  fireGap: number;
  btmMargin: number;
}

// Ids correspond to index in words array.
// As well as the key identifier for React.
export interface GameInstance {
  currWordId: number; // Player current word focus
  words: Word[];
}

export type GameScore = number;

export interface HistoryEntry {
  time: Date;
  score: number;
}
export type GameHistory = HistoryEntry[];
