"use client";

import { useEffect, useState } from "react";

/** Current time, refreshed every 30 s so relative timestamps stay fresh. */
export function useNow(interval = 30_000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), interval);
    return () => clearInterval(t);
  }, [interval]);
  return now;
}
