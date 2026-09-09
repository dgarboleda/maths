"use client";

import { Bug, Grid3x3, Magnet, Minus, Plus, Play } from "lucide-react";
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
        <span className="rounded-md bg-slate-800/60 px-2 py-1 font-bold tabular-nums text-slate-300">
          {selectedPolygon.polygon.points.length} vértices
        </span>
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
