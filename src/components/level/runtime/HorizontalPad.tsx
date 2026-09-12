"use client";

import { useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

/**
 * Control táctil horizontal — Fase 40 (docs/plan-minijuegos-retro.md),
 * planificado desde la Fase 36 y construido recién ahora que Math Invaders
 * lo necesita (junto con Math Breakout, Fase 41, sus únicos dos
 * consumidores previstos). Mismo patrón que `TouchDPad.tsx` (repetición por
 * `setInterval` mientras se mantiene el botón), pero para juegos de un solo
 * eje: nave/paleta que solo se mueve izquierda-derecha, más un botón de
 * acción opcional (disparo).
 *
 * A diferencia de las flechas de teclado (que no repiten disparo:
 * `useArrowKeys` descarta `e.repeat`), el botón de acción táctil tampoco
 * repite — un disparo por toque, para no premiar el dedo que sabe mantener
 * apretado por sobre el que apunta bien.
 */
const REPEAT_MS = 160;

const BUTTON_CLASS =
  "pointer-events-auto flex size-11 items-center justify-center rounded-full border border-indigo-500/30 bg-slate-900/70 text-slate-100 shadow-lg active:bg-slate-800 active:scale-95";

export function HorizontalPad({
  onLeft,
  onRight,
  onAction,
  actionLabel = "Disparar",
}: {
  onLeft: () => void;
  onRight: () => void;
  /** Sin `onAction`, no se pinta el botón de acción (p. ej. Breakout no dispara). */
  onAction?: () => void;
  actionLabel?: string;
}) {
  const timerRef = useRef<number | null>(null);

  function stop() {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }
  function startRepeating(fn: () => void) {
    stop();
    fn();
    timerRef.current = window.setInterval(fn, REPEAT_MS);
  }

  useEffect(() => stop, []);

  return (
    <div aria-label="Control horizontal" className="pointer-events-none absolute inset-x-4 bottom-4 z-30 flex items-center justify-between lg:hidden">
      <div className="flex gap-2">
        <button
          type="button"
          aria-label="Mover a la izquierda"
          className={BUTTON_CLASS}
          onPointerDown={() => startRepeating(onLeft)}
          onPointerUp={stop}
          onPointerLeave={stop}
          onPointerCancel={stop}
        >
          <ChevronLeft className="size-5" aria-hidden="true" />
        </button>
        <button
          type="button"
          aria-label="Mover a la derecha"
          className={BUTTON_CLASS}
          onPointerDown={() => startRepeating(onRight)}
          onPointerUp={stop}
          onPointerLeave={stop}
          onPointerCancel={stop}
        >
          <ChevronRight className="size-5" aria-hidden="true" />
        </button>
      </div>
      {onAction && (
        <button
          type="button"
          aria-label={actionLabel}
          className="pointer-events-auto rounded-full border border-red-400/40 bg-red-600/80 px-5 py-3 text-xs font-bold uppercase tracking-wide text-white shadow-lg active:bg-red-700"
          onPointerDown={onAction}
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
