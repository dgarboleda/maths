"use client";

import { useEffect, useRef } from "react";
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp } from "lucide-react";

/**
 * Control direccional táctil — docs/scene-25d-plan.md §G.2/§J/§N Paso 7.
 * Complementa el tap-en-el-suelo (que ya funciona y sigue siendo la
 * interacción principal en móvil) para quien quiera control explícito de
 * precisión, o simplemente prefiera botones. Llama al MISMO `onMove(dx, dy)`
 * que ya usa `useKeyboardMovement` — no hay un segundo camino de movimiento,
 * solo un segundo input sobre el mismo mecanismo.
 *
 * Visible solo por debajo de `lg` (mismo breakpoint que ya usa el resto del
 * proyecto para "tablet/móvil" — docs/level-editor-plan.md §5.1). Oculto en
 * desktop, donde ya existe el teclado.
 */
const STEP_PCT = 5;
const REPEAT_MS = 160;

const BUTTON_CLASS =
  "pointer-events-auto flex size-11 items-center justify-center rounded-full border border-indigo-500/30 bg-slate-900/70 text-slate-100 shadow-lg active:bg-slate-800 active:scale-95";

export function TouchDPad({ onMove }: { onMove: (dx: number, dy: number) => void }) {
  const timerRef = useRef<number | null>(null);

  function stop() {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }
  function start(dx: number, dy: number) {
    stop();
    onMove(dx, dy);
    timerRef.current = window.setInterval(() => onMove(dx, dy), REPEAT_MS);
  }

  useEffect(() => stop, []); // limpia el intervalo si el D-pad se desmonta con un botón presionado

  return (
    <div aria-label="Control de movimiento" className="pointer-events-none absolute bottom-4 left-4 z-30 lg:hidden">
      <div className="grid w-[132px] grid-cols-3 grid-rows-3 place-items-center gap-1">
        <span />
        <button
          type="button"
          aria-label="Mover arriba"
          className={BUTTON_CLASS}
          onPointerDown={() => start(0, -STEP_PCT)}
          onPointerUp={stop}
          onPointerLeave={stop}
          onPointerCancel={stop}
        >
          <ChevronUp className="size-5" aria-hidden="true" />
        </button>
        <span />

        <button
          type="button"
          aria-label="Mover a la izquierda"
          className={BUTTON_CLASS}
          onPointerDown={() => start(-STEP_PCT, 0)}
          onPointerUp={stop}
          onPointerLeave={stop}
          onPointerCancel={stop}
        >
          <ChevronLeft className="size-5" aria-hidden="true" />
        </button>
        <span />
        <button
          type="button"
          aria-label="Mover a la derecha"
          className={BUTTON_CLASS}
          onPointerDown={() => start(STEP_PCT, 0)}
          onPointerUp={stop}
          onPointerLeave={stop}
          onPointerCancel={stop}
        >
          <ChevronRight className="size-5" aria-hidden="true" />
        </button>

        <span />
        <button
          type="button"
          aria-label="Mover abajo"
          className={BUTTON_CLASS}
          onPointerDown={() => start(0, STEP_PCT)}
          onPointerUp={stop}
          onPointerLeave={stop}
          onPointerCancel={stop}
        >
          <ChevronDown className="size-5" aria-hidden="true" />
        </button>
        <span />
      </div>
    </div>
  );
}
