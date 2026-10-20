"use client";

import { useEffect, useRef } from "react";

/** Al empezar, muestra el problema y el tablero en vez de dejar los controles
 * bajo el pliegue de la clase. Pausar o mover al personaje no desplaza la vista. */
export function useArcadeFocus(playing: boolean) {
  const prompt = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    if (!playing) return;
    prompt.current?.focus({ preventScroll: true });
    prompt.current?.scrollIntoView?.({ block: "start", behavior: "instant" });
  }, [playing]);
  return prompt;
}
