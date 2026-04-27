import { Icon } from "@iconify/react";
import type {
  GameInstance,
  GameSetting,
  GameState,
  Word,
} from "../../types/game";
import { useLayoutEffect, useRef, useState, memo } from "react";

type FireRowProps = {
  fireIconSize: number;
  fireGap: number;
  btmMargin: number;
};

const FireRow = memo(function FireRow({
  fireIconSize,
  fireGap,
  btmMargin,
}: FireRowProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [count, setCount] = useState(0);

  useLayoutEffect(() => {
    const update = () => {
      if (!ref.current) return;
      const totalItemWidth = fireIconSize + fireGap;
      const next = Math.floor(
        (ref.current.offsetWidth + fireGap) / totalItemWidth,
      );
      setCount((prev) => (prev === next ? prev : next));
    };

    update();
    const ro = new ResizeObserver(update);
    if (ref.current) ro.observe(ref.current);
    return () => ro.disconnect();
    // fireIconSize / fireGap are constants in practice; listed for correctness.
  }, [fireIconSize, fireGap]);

  return (
    <div
      ref={ref}
      className="absolute left-10 right-10 grid"
      style={{
        bottom: `${btmMargin}px`,
        gridTemplateColumns: `repeat(${count}, ${fireIconSize}px)`,
        gap: `${fireGap}px`,
        justifyContent: "center",
      }}
    >
      {Array.from({ length: count }).map((_, i) => (
        <Icon
          key={i}
          icon="fxemoji:fire"
          width={fireIconSize}
          height={fireIconSize}
        />
      ))}
    </div>
  );
});

type WordItemProps = {
  word: Word;
  darkMode: boolean;
  yLimit: number;
};

function WordItem({ word, darkMode, yLimit }: WordItemProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Apply yPcnt imperatively every render without scheduling a new one.
  // useLayoutEffect runs synchronously after DOM mutation (no visual lag).
  useLayoutEffect(() => {
    if (!containerRef.current) return;
    const y = (word.yPcnt / 100) * yLimit;
    containerRef.current.style.transform = `translateX(-50%) translateY(${y}px)`;
  });

  return (
    <div
      ref={containerRef}
      className="absolute text-xl font-semibold tracking-wider"
      style={{ left: "50%", willChange: "transform" }}
    >
      {word.text.split("").map((char, i) => (
        <WordChar
          key={i}
          char={char}
          index={i}
          cursorIdx={word.cursorIdx}
          errorAt={word.errorAt}
          darkMode={darkMode}
        />
      ))}
    </div>
  );
}

type WordCharProps = {
  char: string;
  index: number;
  cursorIdx: number;
  errorAt: number | undefined;
  darkMode: boolean;
};

function WordChar({
  char,
  index,
  cursorIdx,
  errorAt,
  darkMode,
}: WordCharProps) {
  const isTyped = index < cursorIdx;
  const isCurrent = index === cursorIdx;
  const isPending = !isCurrent && index > cursorIdx;
  const isError = isCurrent && !!errorAt && performance.now() - errorAt < 150;

  let colorClass: string;
  if (isTyped) colorClass = "text-[#6fb307]";
  else if (isCurrent) colorClass = "text-[#21a4de]";
  else if (isPending)
    colorClass = darkMode ? "text-[#d6d3d1]" : "text-[#3d3632]";
  else colorClass = "";

  return (
    <span
      className={`inline-flex leading-none px-[1px] ${colorClass} ${isError ? "error-flicker" : ""}`}
    >
      {char}
    </span>
  );
}

type WordListProps = {
  gameInstance: GameInstance;
  darkMode: boolean;
  yLimit: number;
};

const WordList = memo(function WordList({
  gameInstance,
  darkMode,
  yLimit,
}: WordListProps) {
  return (
    <>
      {gameInstance.words.slice(gameInstance.currWordId).map((word) => (
        <WordItem
          key={word.id}
          word={word}
          darkMode={darkMode}
          yLimit={yLimit}
        />
      ))}
    </>
  );
});

// ---------------------------------------------------------------------------
// GameArea
// ---------------------------------------------------------------------------
type GameAreaProps = {
  gameSetting: GameSetting;
  gameState: GameState;
  gameInstance: GameInstance;
  darkMode: boolean;
};

export function GameArea({
  gameSetting,
  gameState,
  gameInstance,
  darkMode,
}: GameAreaProps) {
  const isLoginScreen =
    gameState === "enterName" || gameState === "enterNameAfterLogout";
  const isBlurred = gameState !== "playing";

  return (
    <main className="relative overflow-hidden transition border bg-white border-gray-300 dark:bg-[#1c1917] dark:border-[#44403c]">
      <div
        ref={gameSetting.callbackRef}
        className={`w-full h-full relative transition-filter duration-300 ${isBlurred ? "bg-black/20 blur-sm" : ""}`}
      >
        {!isLoginScreen && (
          <WordList
            gameInstance={gameInstance}
            darkMode={darkMode}
            yLimit={gameSetting.yLimit}
          />
        )}

        <FireRow
          fireIconSize={gameSetting.fireIconSize}
          fireGap={gameSetting.fireGap}
          btmMargin={gameSetting.btmMargin}
        />
      </div>
    </main>
  );
}
