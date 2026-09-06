"use client";

import { useEffect } from "react";
import type { Dispatch } from "react";
import type { EditorAction, EditorState } from "./editorReducer";

/**
 * Atajos de teclado del editor — docs/level-editor-plan.md §5.6. Fase 4 solo
 * cablea los que ya tienen un efecto observable (deshacer/rehacer/guardar/
 * cancelar): el resto de la lista (`W`, `B`, `Ctrl+D`, flechas para mover…)
 * se activa recién cuando su herramienta exista (Fase 5+) — no tiene sentido
 * escuchar una tecla que no hace nada todavía.
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
      if (e.key === "Escape") {
        dispatch({ type: "DRAFT_CANCEL" });
        dispatch({ type: "SELECT", selection: { kind: "none" } });
        return;
      }
      if (e.key.toLowerCase() === "v" && !ctrl) {
        dispatch({ type: "SET_TOOL", tool: { kind: "select" } });
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [state.playtestSessionId, dispatch, onSave]);
}
