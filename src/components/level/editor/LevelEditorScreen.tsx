"use client";

import { useLevelEditor } from "./LevelEditorProvider";
import { useEditorHotkeys } from "./useEditorHotkeys";
import { EditorTopBar } from "./EditorTopBar";
import { EditorBottomBar } from "./EditorBottomBar";
import { EditorCanvas } from "./EditorCanvas";

/**
 * Shell de 5 zonas del editor — docs/level-editor-plan.md §5.1. Toolbox y
 * PropertyPanel quedan como columnas vacías hasta que Fase 5/6 las llenen
 * (`EditorToolbox`, `EditorPropertyPanel`) — la estructura de grilla no
 * necesita reescribirse cuando eso pase, solo dejar de estar vacía.
 */
export function LevelEditorScreen() {
  const { state, dispatch, loading, saveNow, draftRecovery, applyDraftRecovery, dismissDraftRecovery } = useLevelEditor();
  useEditorHotkeys({ state, dispatch, onSave: () => void saveNow() });

  if (loading) {
    return (
      <div className="flex h-dvh items-center justify-center bg-slate-950">
        <p role="status" className="text-indigo-200">
          Cargando nivel…
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-dvh flex-col bg-slate-950">
      <EditorTopBar />

      {draftRecovery && (
        <div role="status" className="flex flex-wrap items-center gap-2 border-b border-amber-500/30 bg-amber-950/40 px-4 py-2 text-xs text-amber-200">
          <span>Hay cambios locales sin guardar más recientes que el servidor.</span>
          <button type="button" onClick={applyDraftRecovery} className="rounded-md bg-amber-500/20 px-2 py-1 font-bold hover:bg-amber-500/30">
            Recuperar
          </button>
          <button type="button" onClick={dismissDraftRecovery} className="rounded-md px-2 py-1 font-bold hover:bg-amber-500/20">
            Descartar
          </button>
        </div>
      )}

      <div className="flex min-h-0 flex-1">
        <aside className="hidden w-56 shrink-0 border-r border-indigo-500/20 bg-slate-900/40 p-3 text-xs text-slate-500 lg:block">
          Herramientas — próximamente
        </aside>

        <main className="min-w-0 flex-1">
          <EditorCanvas />
        </main>

        <aside className="hidden w-64 shrink-0 border-l border-indigo-500/20 bg-slate-900/40 p-3 text-xs text-slate-500 lg:block">
          Propiedades — próximamente
        </aside>
      </div>

      <EditorBottomBar />
    </div>
  );
}
