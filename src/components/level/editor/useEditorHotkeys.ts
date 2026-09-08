"use client";

import { useEffect } from "react";
import type { Dispatch } from "react";
import type { EditorAction, EditorState } from "./editorReducer";

/**
 * Atajos de teclado del editor — docs/level-editor-plan.md §5.6. Solo se
 * cablean los que ya tienen un efecto observable en la fase actual: el
 * resto de la lista (flechas para mover…) se activa recién cuando su
 * herramienta exista (Fase 7+).
 *
 * Se desactiva con el foco en un campo de texto, y durante el Play Test
 * (Fase 11): el juego real tiene sus propios controles.
 */
export function useEditorHotkeys(params: { state: EditorState; dispatch: Dispatch<EditorAction>; onSave: () => void }): void {
  const { state, dispatch, onSave } = params;

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
      if (ctrl) return; // el resto son atajos de una sola tecla
      const key = e.key.toLowerCase();
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
        }
        return;
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [state.playtestSessionId, state.selection, dispatch, onSave]);
}
