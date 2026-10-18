"use client";

import { useEffect, useState } from "react";

/** Refresca la disponibilidad del repaso también al volver a la pestaña. */
export function useLearningClock(): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const tick = () => setNow(Date.now());
    const interval = window.setInterval(tick, 60_000);
    window.addEventListener("focus", tick);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", tick);
    };
  }, []);
  return now;
}
