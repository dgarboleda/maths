"use client";

import { useSyncExternalStore } from "react";
import { Bug, Grid3x3, HelpCircle, Layers, Magnet, Minus, Plus, Play, Sparkles } from "lucide-react";
import { simplifyPolygon } from "@/lib/world/navmesh";
import { IconButton } from "@/components/ui/IconButton";
import { Tooltip } from "@/components/ui/Tooltip";
import { findSelectedPolygon } from "./editorReducer";
import { useLevelEditor } from "./LevelEditorProvider";
import { useStartPlaytest } from "./usePlaytestGate";
import { help } from "./helpText";
import { toggleHelpOverlay } from "./helpOverlayStore";
import { getLayersToolboxOpen, subscribeLayersToolbox, toggleLayersToolbox } from "./layersToolboxStore";

/** Barra inferior — docs/level-editor-plan.md §5.1. */
export function EditorBottomBar() {
  const { state, dispatch } = useLevelEditor();
  const selectedPolygon = findSelectedPolygon(state.level, state.selection);
  const playtest = useStartPlaytest();
  const layersToolboxOpen = useSyncExternalStore(subscribeLayersToolbox, getLayersToolboxOpen, () => false);

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
        <IconButton icon={Minus} label="Alejar" tooltip={help("bottombar.zoomOut").text} side="top" onClick={() => zoomStep(1 / 1.25)} />
        <span className="w-10 text-center font-bold tabular-nums">{Math.round(state.viewport.zoom * 100)}%</span>
        <IconButton icon={Plus} label="Acercar" tooltip={help("bottombar.zoomIn").text} side="top" onClick={() => zoomStep(1.25)} />
      </div>

      <IconButton
        icon={Grid3x3}
        label="Grid"
        tooltip={help("bottombar.grid").text}
        side="top"
        showLabel
        active={state.grid.visible}
        onClick={() => dispatch({ type: "TOGGLE_GRID" })}
      />

      <IconButton
        icon={Magnet}
        label="Snap"
        tooltip={help("bottombar.snap").text}
        side="top"
        showLabel
        active={state.snap}
        onClick={() => dispatch({ type: "TOGGLE_SNAP" })}
      />

      <IconButton
        icon={Bug}
        label="Debug"
        tooltip={help("bottombar.debug").text}
        side="top"
        showLabel
        active={state.debugNav}
        onClick={() => dispatch({ type: "TOGGLE_DEBUG_NAV" })}
      />

      <IconButton
        icon={Layers}
        label="Capas"
        tooltip={help("bottombar.layers").text}
        side="top"
        showLabel
        active={layersToolboxOpen}
        onClick={toggleLayersToolbox}
      />

      {selectedPolygon && (
        <>
          <span className="rounded-md bg-slate-800/60 px-2 py-1 font-bold tabular-nums text-slate-300">
            {selectedPolygon.polygon.points.length} vértices
          </span>
          {simplifiable && <IconButton icon={Sparkles} label="Simplificar" tooltip={help("bottombar.simplify").text} side="top" showLabel onClick={simplifySelected} />}
        </>
      )}

      <div className="ml-auto flex items-center gap-1.5">
        <IconButton icon={HelpCircle} label="Ver atajos de teclado" shortcut="?" side="top" onClick={toggleHelpOverlay} />

        <Tooltip content={playtest.reason ?? help("bottombar.play").text} shortcut={help("bottombar.play").shortcut} side="top">
          <button
            type="button"
            aria-label="Probar nivel"
            onClick={playtest.start}
            disabled={playtest.disabled}
            className="flex items-center gap-1.5 rounded-md px-2 py-1 font-bold hover:bg-slate-800 disabled:opacity-40"
          >
            <Play className="size-3.5" aria-hidden="true" />
            Probar nivel
          </button>
        </Tooltip>
      </div>
    </footer>
  );
}
