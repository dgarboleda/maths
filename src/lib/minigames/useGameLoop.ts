"use client";

import { useEffect, useRef } from "react";

/**
 * Bucle de juego compartido por los minijuegos arcade (Fase 36,
 * docs/plan-minijuegos-retro.md) — Snake, y los que sigan en fases
 * posteriores. Envuelve `requestAnimationFrame` con un acumulador de
 * delta-time en vez de que cada juego reimplemente el mismo `useEffect`.
 *
 * Se pausa por completo mientras la pestaña está oculta (`document.hidden`):
 * sin esto, `dtMs` acumularía todo el tiempo que la pestaña estuvo en
 * background y el primer tick al volver movería la serpiente/pelota/enemigo
 * varias celdas de golpe.
 */
export function useGameLoop(onTick: (dtMs: number) => void, opts: { running: boolean }) {
  const onTickRef = useRef(onTick);
  useEffect(() => {
    onTickRef.current = onTick;
  });

  useEffect(() => {
    if (!opts.running) return;

    let frameId: number;
    let last: number | null = null;

    function step(now: number) {
      if (!document.hidden) {
        if (last !== null) onTickRef.current(now - last);
        last = now;
      } else {
        last = null; // al volver de background, el próximo tick arranca en 0
      }
      frameId = requestAnimationFrame(step);
    }
    frameId = requestAnimationFrame(step);

    return () => cancelAnimationFrame(frameId);
  }, [opts.running]);
}
