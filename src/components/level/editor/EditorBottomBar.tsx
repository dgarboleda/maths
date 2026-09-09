"use client";

import { Bug, Grid3x3, Magnet, Minus, Plus, Play, Sparkles } from "lucide-react";
import { simplifyPolygon } from "@/lib/world/navmesh";
import { findSelectedPolygon } from "./editorReducer";
import { useLevelEditor } from "./LevelEditorProvider";
import { useStartPlaytest } from "./usePlaytestGate";

/** Barra inferior — docs/level-editor-plan.md §5.1. */
export function EditorBottomBar() {
  const { state, dispatch } = useLevelEditor();
  const selectedPolygon = findSelectedPolygon(state.level, state.selection);
  const playtest = useStartPlaytest();

  function zoomStep(factor: number) {
    dispatch({ type: "SET_VIEWPORT", viewport: { zoom: state.viewport.zoom * factor } });
  }

  function simplifySelected() {
    if (!selectedPolygon) return;
    const points = simplifyPolygon(selectedPolygon.polygon.points);
    if (points.length === selectedPolygon.polygon.points.length) return; // nada que quitar
    dispatch({ type: "UPDATE_POLYGON", role: selectedPolygon.role, id: selectedPolygon.polygon.id, patch: { points } });
  }

  const simplifiable = selectedPolygon
    ? simplifyPolygon(selectedPolygon.polygon.points).length < selectedPolygon.polygon.points.length
    : false;

  return (
    <footer className="flex min-h-11 flex-wrap items-center gap-3 border-t border-indigo-500/20 bg-slate-900/60 px-3 text-xs text-slate-300 sm:px-4">
      <div className="flex items-center gap-1.5">
        <button type="button" onClick={() => zoomStep(1 / 1.25)} aria-label="Alejar" className="rounded-md p-1 hover:bg-slate-800">
          <Minus className="size-3.5" aria-hidden="true" />
        </button>
        <span className="w-10 text-center font-bold tabular-nums">{Math.round(state.viewport.zoom * 100)}%</span>
        <button type="button" onClick={() => zoomStep(1.25)} aria-label="Acercar" className="rounded-md p-1 hover:bg-slate-800">
          <Plus className="size-3.5" aria-hidden="true" />
        </button>
      </div>

      <button
        type="button"
        aria-pressed={state.grid.visible}
        onClick={() => dispatch({ type: "TOGGLE_GRID" })}
        className={`flex items-center gap-1.5 rounded-md px-2 py-1 font-bold ${state.grid.visible ? "bg-cyan-500/15 text-cyan-300" : "hover:bg-slate-800"}`}
      >
        <Grid3x3 className="size-3.5" aria-hidden="true" />
        Grid
      </button>

      <button
        type="button"
        aria-pressed={state.snap}
        onClick={() => dispatch({ type: "TOGGLE_SNAP" })}
        className={`flex items-center gap-1.5 rounded-md px-2 py-1 font-bold ${state.snap ? "bg-cyan-500/15 text-cyan-300" : "hover:bg-slate-800"}`}
      >
        <Magnet className="size-3.5" aria-hidden="true" />
        Snap
      </button>

      <button
        type="button"
        aria-pressed={state.debugNav}
        onClick={() => dispatch({ type: "TOGGLE_DEBUG_NAV" })}
        className={`flex items-center gap-1.5 rounded-md px-2 py-1 font-bold ${state.debugNav ? "bg-cyan-500/15 text-cyan-300" : "hover:bg-slate-800"}`}
      >
        <Bug className="size-3.5" aria-hidden="true" />
        Debug
      </button>

      {selectedPolygon && (
        <>
          <span className="rounded-md bg-slate-800/60 px-2 py-1 font-bold tabular-nums text-slate-300">
            {selectedPolygon.polygon.points.length} vértices
          </span>
          {simplifiable && (
            <button
              type="button"
              onClick={simplifySelected}
              title="Quita vértices colineales o duplicados sin cambiar la forma"
              className="flex items-center gap-1.5 rounded-md px-2 py-1 font-bold text-slate-300 hover:bg-slate-800"
            >
              <Sparkles className="size-3.5" aria-hidden="true" />
              Simplificar
            </button>
          )}
        </>
      )}

      <button
        type="button"
        onClick={playtest.start}
        disabled={playtest.disabled}
        title={playtest.reason ?? undefined}
        className="ml-auto flex items-center gap-1.5 rounded-md px-2 py-1 font-bold hover:bg-slate-800 disabled:opacity-40"
      >
        <Play className="size-3.5" aria-hidden="true" />
        Probar nivel
      </button>
    </footer>
  );
}
