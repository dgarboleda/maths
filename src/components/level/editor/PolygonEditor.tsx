"use client";

import { useEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from "react";
import { closestPointOnSegment, pointInPolygon } from "@/lib/world/navmesh";
import { newEntityId, newExitId, newPolygonId } from "@/lib/level/ids";
import { createEntityDefaults, getEntityType } from "@/lib/level/entities";
import type { NavPolygon, Vec2 } from "@/lib/level/schema";
import { findSelectedPolygon } from "./editorReducer";
import { useLevelEditor } from "./LevelEditorProvider";
import { snapToGrid } from "./useEditorViewport";

/**
 * Edición interactiva de polígonos de navegación — docs/level-editor-plan.md
 * §6.3. Port directo de `WalkDebugOverlay.tsx`, con tres diferencias: opera
 * sobre cualquier `NavPolygon` de `walkable[]`/`blocked[]` (no un único
 * `WalkableArea`), no tiene estado propio del contenido (despacha al
 * reducer del editor en vez de guardar un `draft` local), y usa
 * `screenToImagePercent` de `useEditorViewport` (con zoom/pan) en vez de
 * medir el contenedor a mano.
 *
 * Los handles "+" de punto medio solo se pintan para el polígono
 * SELECCIONADO (docs/level-editor-plan.md §14 P6) — con muchos polígonos en
 * pantalla, pintarlos todos (como hace `WalkDebugOverlay`, que solo maneja
 * 1-2 anillos) sería caro y confuso.
 */

type DragTarget = { role: "walkable" | "blocked"; id: string; index: number };

function nearestEdge(p: Vec2, poly: Vec2[]): { edgeIndex: number; dist: number; point: Vec2 } | null {
  let best: { edgeIndex: number; dist: number; point: Vec2 } | null = null;
  poly.forEach((a, i) => {
    const b = poly[(i + 1) % poly.length];
    const c = closestPointOnSegment(p, a, b);
    const d = Math.hypot(c.x - p.x, c.y - p.y);
    if (!best || d < best.dist) best = { edgeIndex: i, dist: d, point: c };
  });
  return best;
}

function edgeMidpoints(poly: Vec2[]): { edgeIndex: number; point: Vec2 }[] {
  return poly.map((a, i) => {
    const b = poly[(i + 1) % poly.length];
    return { edgeIndex: i, point: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 } };
  });
}

function polygonAt(
  point: Vec2,
  walkable: NavPolygon[],
  blocked: NavPolygon[],
): { role: "walkable" | "blocked"; id: string } | null {
  for (let i = blocked.length - 1; i >= 0; i--) {
    if (pointInPolygon(point, blocked[i].points)) return { role: "blocked", id: blocked[i].id };
  }
  for (let i = walkable.length - 1; i >= 0; i--) {
    if (pointInPolygon(point, walkable[i].points)) return { role: "walkable", id: walkable[i].id };
  }
  return null;
}

export function PolygonEditor({ screenToImagePercent }: { screenToImagePercent: (clientX: number, clientY: number) => Vec2 }) {
  const { state, dispatch } = useLevelEditor();
  const [dragging, setDragging] = useState<DragTarget | null>(null);
  // Si el arrastre en curso nació de agarrar un "+" (inserta-y-arrastra), acá
  // queda su origen — si el gesto termina sin mover el punto de verdad, se
  // revierte el insert (mismo criterio que WalkDebugOverlay.tsx:95-98).
  const pendingInsertRef = useRef<(DragTarget & { origin: Vec2 }) | null>(null);
  // Última posición real del puntero durante el arrastre — el efecto de abajo
  // se crea una sola vez por gesto (deps: [dragging]) y NO se recrea en cada
  // `MOVE_VERTEX`, así que `state.level` en su clausura queda desactualizado;
  // `onUp` debe comparar contra esto, no contra el estado releído.
  const lastPointRef = useRef<Vec2 | null>(null);

  const toPoint = (clientX: number, clientY: number): Vec2 => {
    const p = screenToImagePercent(clientX, clientY);
    return state.snap ? snapToGrid(p, state.grid.sizePct) : p;
  };

  useEffect(() => {
    if (!dragging) return;
    function onMove(e: PointerEvent) {
      const point = toPoint(e.clientX, e.clientY);
      lastPointRef.current = point;
      dispatch({ type: "MOVE_VERTEX", role: dragging!.role, id: dragging!.id, index: dragging!.index, point });
    }
    function onUp() {
      const pending = pendingInsertRef.current;
      pendingInsertRef.current = null;
      if (pending && pending.role === dragging!.role && pending.id === dragging!.id && pending.index === dragging!.index) {
        const current = lastPointRef.current ?? pending.origin;
        if (Math.hypot(current.x - pending.origin.x, current.y - pending.origin.y) < 0.3) {
          dispatch({ type: "DELETE_VERTEX", role: pending.role, id: pending.id, index: pending.index });
        }
      }
      lastPointRef.current = null;
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

  function onVertexPointerDown(role: "walkable" | "blocked", id: string, index: number, shiftKey: boolean, e: React.PointerEvent) {
    e.stopPropagation();
    if (shiftKey) {
      dispatch({ type: "DELETE_VERTEX", role, id, index });
      return;
    }
    pendingInsertRef.current = null;
    dispatch({ type: "BEGIN_GESTURE" });
    setDragging({ role, id, index });
  }

  function onMidpointPointerDown(role: "walkable" | "blocked", id: string, edgeIndex: number, point: Vec2, e: React.PointerEvent) {
    e.stopPropagation();
    dispatch({ type: "BEGIN_GESTURE" });
    dispatch({ type: "INSERT_VERTEX", role, id, edgeIndex, point });
    const index = edgeIndex + 1;
    pendingInsertRef.current = { role, id, index, origin: point };
    setDragging({ role, id, index });
  }

  function closeDraft() {
    if (!state.drafting || state.drafting.points.length < 3 || state.drafting.role === "zone") return;
    const role = state.drafting.role;
    const polygon: NavPolygon = { id: newPolygonId(), points: state.drafting.points, initiallyEnabled: true };
    dispatch({ type: "ADD_POLYGON", role, polygon });
    dispatch({ type: "DRAFT_CANCEL" });
    dispatch({ type: "SET_TOOL", tool: { kind: "select" } });
  }

  function onContainerClick(e: ReactMouseEvent<HTMLDivElement>) {
    const point = toPoint(e.clientX, e.clientY);
    const { tool } = state;

    if (tool.kind === "setSpawn") {
      dispatch({ type: "SET_SPAWN", point });
      dispatch({ type: "SET_TOOL", tool: { kind: "select" } });
      return;
    }

    if (tool.kind === "setExit") {
      const id = newExitId();
      const half = 1.5;
      dispatch({
        type: "ADD_EXIT",
        exit: {
          id,
          label: "Salida",
          targetHref: "/panel",
          polygon: [
            { x: point.x - half, y: point.y - half },
            { x: point.x + half, y: point.y - half },
            { x: point.x + half, y: point.y + half },
            { x: point.x - half, y: point.y + half },
          ],
        },
      });
      dispatch({ type: "SELECT", selection: { kind: "exit", id } });
      dispatch({ type: "SET_TOOL", tool: { kind: "select" } });
      return;
    }

    if (tool.kind === "drawPolygon") {
      if (!state.drafting) dispatch({ type: "DRAFT_START", role: tool.role });
      dispatch({ type: "DRAFT_ADD_POINT", point });
      return;
    }

    if (tool.kind === "placeEntity") {
      const typeDef = getEntityType(tool.entityType);
      dispatch({
        type: "ADD_ENTITY",
        entity: { id: newEntityId(), type: typeDef.id, name: typeDef.label, position: point, ...createEntityDefaults(typeDef) },
      });
      dispatch({ type: "SET_TOOL", tool: { kind: "select" } });
      return;
    }

    if (tool.kind === "pickStandPoint") {
      const entity = state.level.entities.find((e) => e.id === tool.entityId);
      if (entity) dispatch({ type: "UPDATE_ENTITY", id: entity.id, patch: { interaction: { ...entity.interaction, standPoint: point } } });
      dispatch({ type: "SET_TOOL", tool: { kind: "select" } });
      return;
    }

    const hit = polygonAt(point, state.level.navigation.walkablePolygons, state.level.navigation.blockedPolygons);
    dispatch({ type: "SELECT", selection: hit ? { kind: "polygon", role: hit.role, id: hit.id } : { kind: "none" } });
  }

  function onContainerDoubleClick(e: ReactMouseEvent<HTMLDivElement>) {
    if (state.tool.kind !== "select") return;
    const selected = findSelectedPolygon(state.level, state.selection);
    if (!selected) return;
    const point = toPoint(e.clientX, e.clientY);
    const nearest = nearestEdge(point, selected.polygon.points);
    if (!nearest || nearest.dist > 4) return;
    dispatch({ type: "INSERT_VERTEX", role: selected.role, id: selected.polygon.id, edgeIndex: nearest.edgeIndex, point: nearest.point });
  }

  const selected = findSelectedPolygon(state.level, state.selection);
  const selectedColor = selected?.role === "walkable" ? "#22c55e" : "#f43f5e";

  return (
    <>
      <div
        className="absolute inset-0"
        style={{
          cursor: state.tool.kind === "drawPolygon" || state.tool.kind === "placeEntity" || state.tool.kind === "pickStandPoint" ? "crosshair" : "default",
        }}
        onClick={onContainerClick}
        onDoubleClick={onContainerDoubleClick}
      >
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 size-full">
          {selected &&
            selected.polygon.points.map((p, i) => (
              <circle
                key={`v-${i}`}
                cx={p.x}
                cy={p.y}
                r="0.9"
                fill={selectedColor}
                stroke="#0f172a"
                strokeWidth="0.15"
                style={{ cursor: dragging ? "grabbing" : "grab" }}
                onPointerDown={(e) => onVertexPointerDown(selected.role, selected.polygon.id, i, e.shiftKey, e)}
              />
            ))}

          {selected &&
            edgeMidpoints(selected.polygon.points).map(({ edgeIndex, point }) => (
              <g key={`m-${edgeIndex}`} style={{ cursor: "crosshair" }}>
                <circle
                  cx={point.x}
                  cy={point.y}
                  r="1.6"
                  fill="transparent"
                  style={{ pointerEvents: "all" }}
                  onPointerDown={(e) => onMidpointPointerDown(selected.role, selected.polygon.id, edgeIndex, point, e)}
                />
                <circle cx={point.x} cy={point.y} r="0.55" fill="#f8fafc" fillOpacity="0.55" stroke="#0f172a" strokeWidth="0.12" pointerEvents="none" />
              </g>
            ))}

          {state.drafting && state.drafting.points.length > 0 && (
            <>
              <polyline
                points={state.drafting.points.map((p) => `${p.x},${p.y}`).join(" ")}
                fill="none"
                stroke={state.drafting.role === "blocked" ? "#f43f5e" : "#22c55e"}
                strokeDasharray="1 1"
                strokeWidth="0.3"
              />
              {state.drafting.points.map((p, i) => (
                <circle key={`d-${i}`} cx={p.x} cy={p.y} r="0.7" fill="#fde047" />
              ))}
            </>
          )}
        </svg>
      </div>

      {state.drafting && (
        <div
          className="pointer-events-auto fixed left-2 top-20 z-50 flex items-center gap-1.5 rounded-lg bg-black/85 px-2.5 py-2 font-mono text-[10px] text-lime-300"
          onClick={(e) => e.stopPropagation()}
          onDoubleClick={(e) => e.stopPropagation()}
        >
          <span className="font-bold text-lime-200">dibujando: {state.drafting.points.length} pts</span>
          <button
            type="button"
            disabled={state.drafting.points.length < 3}
            className="rounded bg-emerald-600 px-1.5 py-0.5 text-white disabled:opacity-40"
            onClick={closeDraft}
          >
            Cerrar
          </button>
          <button type="button" className="rounded bg-slate-600 px-1.5 py-0.5 text-white" onClick={() => dispatch({ type: "DRAFT_CANCEL" })}>
            Cancelar
          </button>
        </div>
      )}
    </>
  );
}
