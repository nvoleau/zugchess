"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Observes a wrapper div's width and returns a clamped board size.
 * Use `wrapperRef` on an outer `width:100%/maxWidth:maxSize` div;
 * `effectiveSize` is the actual px to feed into the chessground container.
 */
export function useResizeBoardSize(maxSize: number) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [effectiveSize, setEffectiveSize] = useState(maxSize);

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const clamp = (w: number) => Math.floor(Math.min(w, maxSize));
    const ro = new ResizeObserver(([entry]) => {
      if (entry) setEffectiveSize(clamp(entry.contentRect.width));
    });
    ro.observe(el);
    setEffectiveSize(clamp(el.clientWidth || maxSize));
    return () => ro.disconnect();
  }, [maxSize]);

  return { wrapperRef, effectiveSize };
}
