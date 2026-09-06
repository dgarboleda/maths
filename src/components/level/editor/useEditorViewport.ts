"use client";

import { useCallback, useRef } from "react";
import type { Vec2 } from "@/lib/level/schema";
import type { EditorViewport } from "./editorReducer";

const MIN_ZOOM = 0.25;
const MAX_ZOOM = 4;

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/**
 * Zoom/pan del canvas del editor — docs/level-editor-plan.md §5.4. `stageRef`
 * se cuelga del div que recibe la transform CSS (`translate(panX,panY)
 * scale(zoom)`); `screenToImagePercent` lee su `getBoundingClientRect()' YA
 * transformado, así que no hace falta invertir la matriz a mano — mismo
 * truco que ya usa `WalkDebugOverlay.pointFromEvent` sobre un contenedor sin
 * transformar.
 */
export function useEditorViewport(viewport: EditorViewport, setViewport: (patch: Partial<EditorViewport>) => void) {
  const stageRef = useRef<HTMLDivElement | null>(null);

  const zoomBy = useCallback(
    (factor: number, anchor?: { clientX: number; clientY: number }) => {
      const nextZoom = clamp(viewport.zoom * factor, MIN_ZOOM, MAX_ZOOM);
      if (nextZoom === viewport.zoom) return;
      const el = stageRef.current;
      if (!anchor || !el) {
        setViewport({ zoom: nextZoom });
        return;
      }
      // Mantiene el punto bajo el cursor fijo en pantalla mientras hace zoom
      // (en vez de que todo el escenario "salte" hacia la esquina 0,0).
      const rect = el.getBoundingClientRect();
      const ratio = nextZoom / viewport.zoom;
      const offsetX = anchor.clientX - rect.left;
      const offsetY = anchor.clientY - rect.top;
      setViewport({
        zoom: nextZoom,
        panX: viewport.panX - offsetX * (ratio - 1),
        panY: viewport.panY - offsetY * (ratio - 1),
      });
    },
    [viewport, setViewport],
  );

  const panBy = useCallback(
    (dx: number, dy: number) => setViewport({ panX: viewport.panX + dx, panY: viewport.panY + dy }),
    [viewport, setViewport],
  );

  const resetViewport = useCallback(() => setViewport({ zoom: 1, panX: 0, panY: 0 }), [setViewport]);

  const screenToImagePercent = useCallback((clientX: number, clientY: number): Vec2 => {
    const el = stageRef.current;
    if (!el) return { x: 0, y: 0 };
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return { x: 0, y: 0 };
    return {
      x: clamp(round1(((clientX - rect.left) / rect.width) * 100), 0, 100),
      y: clamp(round1(((clientY - rect.top) / rect.height) * 100), 0, 100),
    };
  }, []);

  const imagePercentToScreen = useCallback((p: Vec2): { x: number; y: number } => {
    const el = stageRef.current;
    if (!el) return { x: 0, y: 0 };
    const rect = el.getBoundingClientRect();
    return { x: rect.left + (p.x / 100) * rect.width, y: rect.top + (p.y / 100) * rect.height };
  }, []);

  return { stageRef, zoomBy, panBy, resetViewport, screenToImagePercent, imagePercentToScreen, MIN_ZOOM, MAX_ZOOM };
}

/** `snapToGrid` se aplica solo si `state.snap` — nunca a un vértice que se
 *  está afinando con la herramienta "editar vértices" mientras se pulsa Alt
 *  (esa exclusión la decide el llamador, este helper solo redondea). */
export function snapToGrid(p: Vec2, sizePct: number): Vec2 {
  if (sizePct <= 0) return p;
  return { x: Math.round(p.x / sizePct) * sizePct, y: Math.round(p.y / sizePct) * sizePct };
}
