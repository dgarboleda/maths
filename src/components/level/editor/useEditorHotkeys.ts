"use client";

import { useEffect } from "react";
import type { Dispatch } from "react";
import type { EditorAction, EditorState } from "./editorReducer";
import { useStartPlaytest } from "./usePlaytestGate";

function clampPct(n: number): number {
  return Math.min(100, Math.max(0, Math.round(n * 10) / 10));
}

/**
 * Atajos de teclado del editor — docs/level-editor-plan.md §5.6/§17 Fase 13
 * (K8, modo teclado del canvas).
 *
 * Se desactiva con el foco en un campo de texto, y durante el Play Test
 * (Fase 11): el juego real tiene sus propios controles.
 *
 * `Tab`/`Shift+Tab` recorren las entidades del nivel — pero solo cuando NO
 * hay ningún elemento enfocado (`document.activeElement === document.body`,
 * el estado por defecto de la página): así ayudan a un usuario de teclado a
 * llegar a una entidad sin clic, sin secuestrar el `Tab` normal una vez que
 * el foco ya está en un botón/campo real (eso sería una trampa de foco,
 * justo lo que WCAG 2.1.2 prohíbe — criterio A11).
 */
export function useEditorHotkeys(params: { state: EditorState; dispatch: Dispatch<EditorAction>; onSave: () => void }): void {
  const { state, dispatch, onSave } = params;
  const playtest = useStartPlaytest();

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      const inField = target?.tagName === "INPUT" || target?.tagName === "TEXTAREA" || target?.isContentEditable;
      if (inField || state.playtestSessionId !== null) return;

      const ctrl = e.ctrlKey || e.metaKey;

      if (ctrl && !e.shiftKey && e.key.toLowerCase() === "z") {
        e.preventDefault();
        dispatch({ type: "UNDO" });
        return;
      }
      if (ctrl && e.shiftKey && e.key.toLowerCase() === "z") {
        e.preventDefault();
        dispatch({ type: "REDO" });
        return;
      }
      if (ctrl && e.key.toLowerCase() === "s") {
        e.preventDefault();
        onSave();
        return;
      }
      if (ctrl && e.key.toLowerCase() === "d" && state.selection.kind === "entity") {
        e.preventDefault();
        dispatch({ type: "DUPLICATE_ENTITY", id: state.selection.id });
        return;
      }
      if (e.key === "Escape") {
        dispatch({ type: "DRAFT_CANCEL" });
        dispatch({ type: "SET_TOOL", tool: { kind: "select" } });
        dispatch({ type: "SELECT", selection: { kind: "none" } });
        return;
      }
      if (e.key === "Tab" && !ctrl) {
        if (target !== document.body || state.level.entities.length === 0) return; // no atrapar el Tab normal si algo real ya tiene foco
        e.preventDefault();
        const ids = state.level.entities.map((en) => en.id);
        const currentIndex = state.selection.kind === "entity" ? ids.indexOf(state.selection.id) : -1;
        const dir = e.shiftKey ? -1 : 1;
        const nextIndex = (((currentIndex + dir) % ids.length) + ids.length) % ids.length;
        dispatch({ type: "SELECT", selection: { kind: "entity", id: ids[nextIndex] } });
        return;
      }
      if (ctrl) return; // el resto son atajos de una sola tecla

      const selection = state.selection;
      if ((e.key === "ArrowUp" || e.key === "ArrowDown" || e.key === "ArrowLeft" || e.key === "ArrowRight") && selection.kind === "entity") {
        const entity = state.level.entities.find((en) => en.id === selection.id);
        if (!entity) return;
        e.preventDefault();
        const step = e.shiftKey ? 0.1 : 0.5;
        const dx = e.key === "ArrowLeft" ? -step : e.key === "ArrowRight" ? step : 0;
        const dy = e.key === "ArrowUp" ? -step : e.key === "ArrowDown" ? step : 0;
        dispatch({
          type: "UPDATE_ENTITY",
          id: entity.id,
          patch: { position: { x: clampPct(entity.position.x + dx), y: clampPct(entity.position.y + dy) } },
        });
        return;
      }

      const key = e.key.toLowerCase();
      if (key === "p") {
        playtest.start();
        return;
      }
      if (key === "v") {
        dispatch({ type: "SET_TOOL", tool: { kind: "select" } });
        return;
      }
      if (key === "w") {
        dispatch({ type: "SET_TOOL", tool: { kind: "drawPolygon", role: "walkable" } });
        return;
      }
      if (key === "b") {
        dispatch({ type: "SET_TOOL", tool: { kind: "drawPolygon", role: "blocked" } });
        return;
      }
      if (e.key === "Delete" || e.key === "Backspace") {
        if (state.selection.kind === "polygon") {
          dispatch({ type: "DELETE_POLYGON", role: state.selection.role, id: state.selection.id });
        } else if (state.selection.kind === "exit") {
          dispatch({ type: "DELETE_EXIT", id: state.selection.id });
        } else if (state.selection.kind === "entity") {
          dispatch({ type: "DELETE_ENTITY", id: state.selection.id });
        } else if (state.selection.kind === "zone") {
          dispatch({ type: "DELETE_ZONE", id: state.selection.id });
        } else if (state.selection.kind === "dialog") {
          dispatch({ type: "DELETE_DIALOG", id: state.selection.id });
        } else if (state.selection.kind === "event") {
          dispatch({ type: "DELETE_EVENT", id: state.selection.id });
        }
        return;
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [state.playtestSessionId, state.selection, state.level.entities, dispatch, onSave, playtest]);
}
