import { useMemo, useRef, useState } from "react";
import type { GameSetting } from "../types/game";

const BTM_MARGIN = 8;
const FIRE_ICON_SIZE = 30;

export function useGameSettings(): GameSetting {
  const ref = useRef<HTMLDivElement | null>(null);
  const [layoutHeight, setLayoutHeight] = useState<number>(0);

  const callbackRef = (node: HTMLDivElement | null) => {
    if (!node) return;

    ref.current = node;

    const observer = new ResizeObserver((entries) => {
      const height = entries[0]?.contentRect.height;
      if (height) setLayoutHeight(height);
    });

    observer.observe(node);

    const initialHeight = node.getBoundingClientRect().height;
    if (initialHeight) setLayoutHeight(initialHeight);
  };

  return useMemo(
    () => ({
      ref,
      callbackRef,
      layoutHeight,
      maxDisplayTime: 22,
      speedIncrease: 1.15,
      hurdleScore: 40,
      yLimit: layoutHeight - BTM_MARGIN - 2 * FIRE_ICON_SIZE,
      yGap: 50,
      fireIconSize: FIRE_ICON_SIZE,
      fireGap: 8,
      btmMargin: BTM_MARGIN,
    }),
    [layoutHeight],
  );
}
