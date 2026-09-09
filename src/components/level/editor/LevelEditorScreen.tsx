"use client";

import { useLevelEditor } from "./LevelEditorProvider";
import { useEditorHotkeys } from "./useEditorHotkeys";
import { EditorTopBar } from "./EditorTopBar";
import { EditorBottomBar } from "./EditorBottomBar";
import { EditorCanvas } from "./EditorCanvas";
import { EditorToolbox } from "./EditorToolbox";
import { EditorPropertyPanel } from "./EditorPropertyPanel";
import { ZoneEditor } from "./ZoneEditor";
import { DialogEditor } from "./DialogEditor";
import { EventChainEditor } from "./EventChainEditor";
import { IssuesPanel } from "./IssuesPanel";

/**
 * Shell de 5 zonas del editor — docs/level-editor-plan.md §5.1. El panel de
 * propiedades del elemento seleccionado queda como placeholder hasta Fase 6
 * (`EditorPropertyPanel`) — la estructura de grilla no necesita
 * reescribirse cuando eso pase, solo dejar de estar vacía.
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
        <aside className="hidden w-56 shrink-0 overflow-y-auto border-r border-indigo-500/20 bg-slate-900/40 p-3 lg:block">
          <EditorToolbox />
        </aside>

        <main className="min-w-0 flex-1">
          <EditorCanvas />
        </main>

        <aside className="hidden w-64 shrink-0 overflow-y-auto border-l border-indigo-500/20 bg-slate-900/40 p-3 lg:block">
          <h2 className="mb-2 px-1 text-[10px] font-bold uppercase tracking-widest text-slate-500">Problemas</h2>
          <IssuesPanel />
          {state.selection.kind === "entity" && (
            <div className="mt-4 border-t border-indigo-500/10 pt-4">
              <EditorPropertyPanel />
            </div>
          )}
          {state.selection.kind === "zone" && (
            <div className="mt-4 border-t border-indigo-500/10 pt-4">
              <ZoneEditor />
            </div>
          )}
          {state.selection.kind === "dialog" && (
            <div className="mt-4 border-t border-indigo-500/10 pt-4">
              <DialogEditor />
            </div>
          )}
          {state.selection.kind === "event" && (
            <div className="mt-4 border-t border-indigo-500/10 pt-4">
              <EventChainEditor />
            </div>
          )}
        </aside>
      </div>

      <EditorBottomBar />
    </div>
  );
}
