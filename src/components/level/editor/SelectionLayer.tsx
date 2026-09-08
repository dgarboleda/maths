"use client";

import { useEffect, useRef, useState } from "react";
import type { Vec2 } from "@/lib/level/schema";
import { useLevelEditor } from "./LevelEditorProvider";
import { snapToGrid } from "./useEditorViewport";

type Drag = "position" | "standPoint";

/**
 * Handles interactivos de la entidad seleccionada — arrastrar para mover su
 * posición, y (si es interactuable) un handle secundario para fijar/mover
 * `interaction.standPoint`. Mismo patrón que `PolygonEditor.tsx`: efecto con
 * listeners a nivel de `window`, coalescido en un solo `BEGIN_GESTURE`.
 * `EntityLayer` (solo lectura + clic para seleccionar) es el análogo de
 * `NavigationLayer` acá — esta es la mitad "editar" de ese mismo par.
 */
export function SelectionLayer({ screenToImagePercent }: { screenToImagePercent: (clientX: number, clientY: number) => Vec2 }) {
  const { state, dispatch } = useLevelEditor();
  const [dragging, setDragging] = useState<Drag | null>(null);
  const draggingRef = useRef<Drag | null>(null);

  const { selection } = state;
  const entity = selection.kind === "entity" ? state.level.entities.find((e) => e.id === selection.id) : undefined;

  const toPoint = (clientX: number, clientY: number): Vec2 => {
    const p = screenToImagePercent(clientX, clientY);
    return state.snap ? snapToGrid(p, state.grid.sizePct) : p;
  };

  useEffect(() => {
    if (!dragging || !entity) return;
    function onMove(e: PointerEvent) {
      const point = toPoint(e.clientX, e.clientY);
      if (draggingRef.current === "position") {
        dispatch({ type: "UPDATE_ENTITY", id: entity!.id, patch: { position: point } });
      } else {
        dispatch({ type: "UPDATE_ENTITY", id: entity!.id, patch: { interaction: { ...entity!.interaction, standPoint: point } } });
      }
    }
    function onUp() {
      dispatch({ type: "END_GESTURE" });
      setDragging(null);
    }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dragging]);

  if (!entity) return null;

  function beginDrag(which: Drag, e: React.PointerEvent) {
    e.stopPropagation();
    draggingRef.current = which;
    dispatch({ type: "BEGIN_GESTURE" });
    setDragging(which);
  }

  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 size-full">
      {entity.interaction.mode !== "none" && entity.interaction.standPoint && (
        <>
          <line
            x1={entity.position.x}
            y1={entity.position.y}
            x2={entity.interaction.standPoint.x}
            y2={entity.interaction.standPoint.y}
            stroke="#fbbf24"
            strokeWidth="0.25"
            strokeDasharray="1 1"
          />
          <circle
            cx={entity.interaction.standPoint.x}
            cy={entity.interaction.standPoint.y}
            r="1.4"
            fill="#fbbf24"
            stroke="#0f172a"
            strokeWidth="0.2"
            style={{ cursor: "grab", pointerEvents: "all" }}
            onPointerDown={(e) => beginDrag("standPoint", e)}
          />
        </>
      )}
      <circle
        cx={entity.position.x}
        cy={entity.position.y}
        r="1.8"
        fill="transparent"
        stroke="#22d3ee"
        strokeWidth="0.3"
        strokeDasharray="0.8 0.6"
        style={{ cursor: dragging === "position" ? "grabbing" : "grab", pointerEvents: "all" }}
        onPointerDown={(e) => beginDrag("position", e)}
      />
    </svg>
  );
}
