"use client";

import { useEffect, useState } from "react";
import { useFamily } from "@/components/family/FamilyProvider";
import { getFirebase } from "@/lib/firebase";
import { useSoundPreference } from "@/lib/useSoundPreference";
import type { SkillProgress } from "@/lib/types";
import type { LevelDefinition } from "@/lib/level/schema";
import { LevelRuntime } from "@/components/level/runtime/LevelRuntime";
import { PlayTestBar } from "@/components/level/runtime/PlayTestBar";
import { useLevelEditor } from "./LevelEditorProvider";
import { useEditorHotkeys } from "./useEditorHotkeys";
import { EditorTopBar } from "./EditorTopBar";
import { EditorBottomBar } from "./EditorBottomBar";
import { EditorCanvas } from "./EditorCanvas";
import { EditorToolbox } from "./EditorToolbox";
import { EditorPropertyPanel } from "./EditorPropertyPanel";
import { ZoneEditor } from "./ZoneEditor";
import { DialogEditor } from "./DialogEditor";
import { MissionEditor } from "./MissionEditor";
import { EventChainEditor } from "./EventChainEditor";
import { IssuesPanel } from "./IssuesPanel";
import { DepthPanel } from "./DepthPanel";

/**
 * Play Test (Fase 11, §11.2 del plan): monta el mismo `LevelRuntime` que el
 * juego real, en `sandbox`, con el `progressBySkill` real del hijo
 * seleccionado en el panel familiar (para que los prerrequisitos se
 * comporten igual que jugando de verdad) — pero sin escribir nada en
 * Firestore. Vive en `editor/` (no en `runtime/`) precisamente porque
 * necesita `useFamily`: `src/components/level/runtime/**` no puede importar
 * nada de `editor/**`, así que es este lado quien reúne los datos y se los
 * pasa a `LevelRuntime`/`PlayTestBar` ya resueltos.
 */
function PlaytestStage({ level, sessionId, onReset, onExit }: { level: LevelDefinition; sessionId: number; onReset: () => void; onExit: () => void }) {
  const { parentId, selectedChildId, selectedChild } = useFamily();
  const [progressBySkill, setProgressBySkill] = useState<Record<string, SkillProgress> | null>(null);
  const [soundOn] = useSoundPreference();

  useEffect(() => {
    if (!parentId || !selectedChildId) return;
    let cancelled = false;
    getFirebase()
      .then(({ db, firestore: { collection, getDocs } }) =>
        getDocs(collection(db, "parents", parentId, "children", selectedChildId, "skillsProgress")),
      )
      .then((snap) => {
        if (cancelled) return;
        const map: Record<string, SkillProgress> = {};
        snap.forEach((d) => (map[d.id] = d.data() as SkillProgress));
        setProgressBySkill(map);
      })
      .catch((err) => console.error("No se pudo cargar el progreso para el Play Test", err));
    return () => {
      cancelled = true;
    };
  }, [parentId, selectedChildId]);

  if (!parentId || !selectedChild || !progressBySkill) {
    return (
      <div className="flex h-full items-center justify-center">
        <p role="status" className="text-indigo-200">
          Preparando el Play Test…
        </p>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full">
      <LevelRuntime
        key={sessionId}
        level={level}
        parentId={parentId}
        childId={selectedChild.id}
        childName={selectedChild.name}
        progressBySkill={progressBySkill}
        soundOn={soundOn}
        sandbox
        onExit={onExit}
      />
      <PlayTestBar onReset={onReset} onExit={onExit} />
    </div>
  );
}

/**
 * Shell de 5 zonas del editor — docs/level-editor-plan.md §5.1. El panel de
 * propiedades del elemento seleccionado queda como placeholder hasta Fase 6
 * (`EditorPropertyPanel`) — la estructura de grilla no necesita
 * reescribirse cuando eso pase, solo dejar de estar vacía.
 */
export function LevelEditorScreen() {
  const {
    state,
    dispatch,
    loading,
    saveNow,
    draftRecovery,
    applyDraftRecovery,
    dismissDraftRecovery,
    conflict,
    reloadFromConflict,
    dismissConflict,
  } = useLevelEditor();
  useEditorHotkeys({ state, dispatch, onSave: () => void saveNow() });
  const inPlaytest = state.playtestSessionId !== null;

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

      {draftRecovery && !inPlaytest && (
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
        {inPlaytest ? (
          <main className="min-w-0 flex-1 p-3">
            <PlaytestStage
              level={state.level}
              sessionId={state.playtestSessionId ?? 0}
              onReset={() => dispatch({ type: "START_PLAYTEST" })}
              onExit={() => dispatch({ type: "STOP_PLAYTEST" })}
            />
          </main>
        ) : (
          <>
            <aside className="hidden w-56 shrink-0 overflow-y-auto border-r border-indigo-500/20 bg-slate-900/40 p-3 lg:block">
              <EditorToolbox />
            </aside>

            <main className="min-w-0 flex-1">
              <EditorCanvas />
            </main>

            <aside className="hidden w-64 shrink-0 overflow-y-auto border-l border-indigo-500/20 bg-slate-900/40 p-3 lg:block">
              <h2 className="mb-2 px-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">Problemas</h2>
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
              {state.selection.kind === "mission" && (
                <div className="mt-4 border-t border-indigo-500/10 pt-4">
                  <MissionEditor />
                </div>
              )}
              {state.selection.kind === "event" && (
                <div className="mt-4 border-t border-indigo-500/10 pt-4">
                  <EventChainEditor />
                </div>
              )}
              {state.selection.kind === "level" && (
                <div className="mt-4 border-t border-indigo-500/10 pt-4">
                  <DepthPanel />
                </div>
              )}
            </aside>
          </>
        )}
      </div>

      {!inPlaytest && <EditorBottomBar />}

      {conflict && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/80 p-4">
          <div role="alertdialog" aria-modal="true" aria-labelledby="conflicto-titulo" className="w-full max-w-md rounded-2xl border border-amber-500/30 bg-slate-900 p-5">
            <h2 id="conflicto-titulo" className="text-sm font-bold text-amber-200">
              Se guardó una versión más nueva desde otra sesión
            </h2>
            <p className="mt-2 text-xs leading-relaxed text-slate-300">{conflict.message}</p>
            <p className="mt-2 text-xs leading-relaxed text-slate-400">
              Tus cambios locales no se guardaron. Recargá para ver la versión del servidor (perdés lo que editaste acá desde el último guardado), o seguí editando y volvé a intentar guardar más tarde.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={dismissConflict}
                className="rounded-lg px-3 py-2 text-xs font-bold text-slate-300 hover:bg-slate-800"
              >
                Seguir editando
              </button>
              <button
                type="button"
                onClick={() => void reloadFromConflict()}
                className="rounded-lg bg-gradient-to-r from-violet-600 to-fuchsia-600 px-3 py-2 text-xs font-bold text-white"
              >
                Recargar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
