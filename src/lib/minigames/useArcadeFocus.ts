"use client";

import { useEffect, useRef } from "react";

/** Al empezar o reanudar, muestra el problema y el tablero. El botón externo
 * de reanudar puede haber desplazado el juego fuera de la pantalla móvil.
 * Pausar o mover al personaje no desplaza la vista. */
export function useArcadeFocus(playing: boolean, paused = false) {
  const prompt = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    if (!playing || paused) return;
    prompt.current?.focus({ preventScroll: true });
    prompt.current?.scrollIntoView?.({ block: "start", behavior: "instant" });
  }, [playing, paused]);
  return prompt;
}
