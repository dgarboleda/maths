"use client";

import { useEffect, useRef } from "react";
import type { Vec2 } from "@/lib/level/schema";
import type { Pose } from "./useAlexMovement";

/**
 * Movimiento por teclado — docs/scene-25d-plan.md §G.2/§N Paso 6. Deliberada-
 * mente NO es un motor de velocidad/aceleración nuevo: cada pulsación (y
 * cada repetición mientras se mantiene apretada) calcula un punto objetivo
 * un poco más allá de la pose actual en la dirección presionada, lo corrige
 * al punto transitable más cercano (mismo `nearestWalkablePoint` que ya usa
 * el clic) y llama al MISMO `walkTo` — el pathfinding, la malla de
 * navegación y la animación de `useAlexMovement` no cambian una línea.
 *
 * Se desactiva por completo (`enabled: false`) mientras hay un overlay
 * abierto (diálogo/desafío) — mismo criterio que ya usa `useEditorHotkeys`
 * para no robarle el foco a un `<input>`/`<textarea>` ni interferir con la
 * interacción que sí necesita el teclado en ese momento.
 */
const STEP_PCT = 5;
const REPEAT_MS = 160;

const KEY_DIRECTIONS: Record<string, Vec2> = {
  ArrowUp: { x: 0, y: -1 },
  ArrowDown: { x: 0, y: 1 },
  ArrowLeft: { x: -1, y: 0 },
  ArrowRight: { x: 1, y: 0 },
  KeyW: { x: 0, y: -1 },
  KeyS: { x: 0, y: 1 },
  KeyA: { x: -1, y: 0 },
  KeyD: { x: 1, y: 0 },
};

export function useKeyboardMovement(opts: {
  enabled: boolean;
  pose: Pose;
  nearestWalkablePoint: (p: Vec2) => Vec2;
  walkTo: (target: Vec2) => number;
}) {
  const optsRef = useRef(opts);
  useEffect(() => {
    optsRef.current = opts;
  });

  useEffect(() => {
    if (!opts.enabled) return;

    const held = new Set<string>();
    let timer: number | null = null;

    function step() {
      const dirs = [...held].map((code) => KEY_DIRECTIONS[code]).filter((d): d is Vec2 => !!d);
      if (dirs.length === 0) return;
      const dx = dirs.reduce((s, d) => s + d.x, 0);
      const dy = dirs.reduce((s, d) => s + d.y, 0);
      if (dx === 0 && dy === 0) return; // p. ej. Arriba+Abajo a la vez, se cancelan
      const len = Math.hypot(dx, dy) || 1;
      const { pose, nearestWalkablePoint, walkTo } = optsRef.current;
      const raw = { x: pose.x + (dx / len) * STEP_PCT, y: pose.y + (dy / len) * STEP_PCT };
      walkTo(nearestWalkablePoint(raw));
    }

    function isTypingTarget(el: EventTarget | null): boolean {
      const tag = (el as HTMLElement | null)?.tagName;
      return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
    }

    function onKeyDown(e: KeyboardEvent) {
      if (!(e.code in KEY_DIRECTIONS) || isTypingTarget(e.target)) return;
      e.preventDefault();
      if (held.has(e.code)) return;
      held.add(e.code);
      step(); // primer paso inmediato, sin esperar el intervalo
      if (timer === null) timer = window.setInterval(step, REPEAT_MS);
    }
    function onKeyUp(e: KeyboardEvent) {
      held.delete(e.code);
      if (held.size === 0 && timer !== null) {
        window.clearInterval(timer);
        timer = null;
      }
    }
    function onBlur() {
      held.clear();
      if (timer !== null) {
        window.clearInterval(timer);
        timer = null;
      }
    }

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
      if (timer !== null) window.clearInterval(timer);
    };
  }, [opts.enabled]);
}
