"use client";

import { useEffect, useState } from "react";

/**
 * Current time (epoch ms) that re-renders every `intervalMs`. Keeps render
 * pure — components read `now` instead of calling Date.now() while rendering.
 */
export function useNow(intervalMs = 60_000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(timer);
  }, [intervalMs]);
  return now;
}
