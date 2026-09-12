"use client";

import { useEffect, useRef } from "react";

/**
 * Entrada de teclado para minijuegos arcade (Fase 36, docs/plan-
 * minijuegos-retro.md) — deliberadamente NO reutiliza `useKeyboardMovement`
 * (`src/lib/level/runtime/useKeyboardMovement.ts`): ese hook calcula un
 * punto objetivo sobre la malla de navegación del mundo abierto (`walkTo`/
 * `nearestWalkablePoint`) y no tiene sentido para un juego de grilla propia.
 *
 * Cada tecla dispara su handler UNA vez por pulsación (`e.repeat` descarta
 * la auto-repetición del sistema operativo) — el ritmo de movimiento lo
 * decide el propio bucle de juego (`useGameLoop`), no la repetición del
 * teclado. `enabled: false` desactiva el listener por completo (mismo
 * criterio que ya usa el resto del proyecto para no robarle el foco a un
 * `<input>`/`<textarea>` ni interferir mientras hay otro control activo).
 */
type ArrowKeyHandlers = Partial<Record<"up" | "down" | "left" | "right" | "action", () => void>>;

const KEY_TO_DIRECTION: Record<string, keyof ArrowKeyHandlers> = {
  ArrowUp: "up",
  KeyW: "up",
  ArrowDown: "down",
  KeyS: "down",
  ArrowLeft: "left",
  KeyA: "left",
  ArrowRight: "right",
  KeyD: "right",
  Space: "action",
};

function isTypingTarget(el: EventTarget | null): boolean {
  const tag = (el as HTMLElement | null)?.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
}

export function useArrowKeys(handlers: ArrowKeyHandlers, opts: { enabled: boolean }) {
  const handlersRef = useRef(handlers);
  useEffect(() => {
    handlersRef.current = handlers;
  });

  useEffect(() => {
    if (!opts.enabled) return;

    function onKeyDown(e: KeyboardEvent) {
      const direction = KEY_TO_DIRECTION[e.code];
      if (!direction || e.repeat || isTypingTarget(e.target)) return;
      const handler = handlersRef.current[direction];
      if (!handler) return;
      e.preventDefault();
      handler();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [opts.enabled]);
}
