"use client";

import { createContext, useCallback, useContext, useEffect, useReducer, useState, type Dispatch, type ReactNode } from "react";
import { useFamily } from "@/components/family/FamilyProvider";
import { useLevelDoc } from "@/lib/level/persistence/useLevelDoc";
import { StaleLevelError } from "@/lib/level/persistence/levelRepository";
import { clearDraft, loadDraft } from "@/lib/level/persistence/draftCache";
import { createEmptyLevel } from "@/lib/level/defaults";
import { validateLevel } from "@/lib/level/validate";
import type { LevelDefinition } from "@/lib/level/schema";
import { createInitialEditorState, editorReducer, type EditorAction, type EditorState } from "./editorReducer";
import { useAutosave } from "./useAutosave";

/** Placeholder mientras el nivel real todavía no cargó de Firestore — nunca
 *  se persiste, solo evita que `EditorState.level` tenga que ser nullable. */
const PLACEHOLDER_LEVEL = createEmptyLevel("", "", { src: "", width: 1, height: 1, alt: "", projection: "flat" });

interface DraftRecovery {
  savedAt: number;
  level: LevelDefinition;
}

interface LevelEditorContextValue {
  state: EditorState;
  dispatch: Dispatch<EditorAction>;
  levelId: string;
  loading: boolean;
  saveNow: () => Promise<void>;
  draftRecovery: DraftRecovery | null;
  applyDraftRecovery: () => void;
  dismissDraftRecovery: () => void;
  /** `StaleLevelError` de un guardado reciente (Fase 13, §10.4/T6): otra
   *  sesión guardó una versión más nueva mientras se editaba acá. `null` sin
   *  conflicto pendiente. */
  conflict: StaleLevelError | null;
  reloadFromConflict: () => Promise<void>;
  dismissConflict: () => void;
}

const Ctx = createContext<LevelEditorContextValue | null>(null);

/**
 * Estado local de arranque del Provider (hidratación + borrador local
 * pendiente de recuperar) — deliberadamente en un `useReducer` propio y NO
 * en `useState`: solo un `dispatch` puede escribirse de forma síncrona
 * dentro de un efecto sin disparar cascadas de render (regla `react-hooks/
 * set-state-in-effect`); un `useState` normal ahí no pasa el lint.
 */
interface BootState {
  hydrated: boolean;
  draftRecovery: DraftRecovery | null;
}
type BootAction = { type: "HYDRATE"; draftRecovery: DraftRecovery | null } | { type: "CLEAR_DRAFT_RECOVERY" };

function bootReducer(state: BootState, action: BootAction): BootState {
  switch (action.type) {
    case "HYDRATE":
      return { hydrated: true, draftRecovery: action.draftRecovery };
    case "CLEAR_DRAFT_RECOVERY":
      return { ...state, draftRecovery: null };
  }
}

/**
 * Carga el nivel, monta el reducer del editor y conecta el autosave — la
 * capa que junta persistencia (Fase 3) con el estado del editor (§5.2). No
 * renderiza nada del canvas/UI: eso es `LevelEditorScreen`.
 */
export function LevelEditorProvider({ levelId, children }: { levelId: string; children: ReactNode }) {
  const { parentId } = useFamily();
  const { level: loadedLevel, loading, save, reload } = useLevelDoc(parentId, levelId);
  const [state, dispatch] = useReducer(editorReducer, PLACEHOLDER_LEVEL, createInitialEditorState);
  const [boot, bootDispatch] = useReducer(bootReducer, { hydrated: false, draftRecovery: null });
  const [conflict, setConflict] = useState<StaleLevelError | null>(null);

  useEffect(() => {
    if (!loadedLevel || boot.hydrated) return;
    dispatch({ type: "HYDRATE_LEVEL", level: loadedLevel });
    const draft = loadDraft(levelId);
    bootDispatch({ type: "HYDRATE", draftRecovery: draft && draft.savedAt > loadedLevel.metadata.updatedAt ? draft : null });
  }, [loadedLevel, levelId, boot.hydrated]);

  // Validación en vivo: IssuesPanel siempre refleja el nivel tal como está
  // en pantalla, no solo lo que había al último guardar.
  useEffect(() => {
    if (!boot.hydrated) return;
    dispatch({ type: "SET_ISSUES", issues: validateLevel(state.level) });
  }, [state.level, boot.hydrated]);

  const saveNow = useCallback(async () => {
    dispatch({ type: "SET_SAVE_STATE", state: "saving" });
    try {
      const issues = validateLevel(state.level);
      dispatch({ type: "SET_ISSUES", issues });
      const saved = await save(state.level);
      // Sincroniza version/metadata del servidor SIN pisar el historial de
      // undo — guardar no es una edición del usuario (ver editorReducer).
      dispatch({ type: "SYNC_SAVED_LEVEL", level: saved });
      dispatch({ type: "SET_SAVE_STATE", state: "saved" });
      clearDraft(levelId);
    } catch (err) {
      if (err instanceof StaleLevelError) {
        // No es un error de guardado cualquiera: alguien más ya guardó una
        // versión más nueva. `saveState` vuelve a "idle" (no "error") porque
        // el diálogo de conflicto, no el indicador chico de la barra
        // superior, es quien tiene que llevar esta noticia.
        dispatch({ type: "SET_SAVE_STATE", state: "idle" });
        setConflict(err);
        return;
      }
      dispatch({ type: "SET_SAVE_STATE", state: "error", error: err instanceof Error ? err.message : String(err) });
    }
    // `state.level` cambia en cada mutación — `saveNow` se recrea cada vez para
    // que el autosave (más abajo) siempre guarde el contenido más reciente.
  }, [save, state.level, levelId]);

  useAutosave({
    levelId,
    level: state.level,
    dirty: state.dirty,
    // Con un conflicto pendiente, el autosave no debe reintentar solo: cada
    // intento repetiría el mismo StaleLevelError y reabriría el diálogo.
    paused: state.playtestSessionId !== null || !boot.hydrated || conflict !== null,
    onAutosave: saveNow,
  });

  const reloadFromConflict = useCallback(async () => {
    const fresh = await reload();
    if (fresh) dispatch({ type: "HYDRATE_LEVEL", level: fresh });
    clearDraft(levelId);
    setConflict(null);
  }, [reload, levelId]);

  const dismissConflict = useCallback(() => setConflict(null), []);

  // `beforeunload` (Fase 13, §10.5): solo avisa con cambios sin guardar de
  // verdad (`dirty`) — el borrador local ya los protege de una pestaña
  // cerrada de golpe, esto es la señal nativa del navegador para que el
  // padre no la cierre sin querer a mitad de una edición.
  useEffect(() => {
    if (!state.dirty) return;
    function onBeforeUnload(e: BeforeUnloadEvent) {
      e.preventDefault();
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [state.dirty]);

  const applyDraftRecovery = useCallback(() => {
    if (!boot.draftRecovery) return;
    dispatch({ type: "REPLACE_LEVEL", level: boot.draftRecovery.level });
    bootDispatch({ type: "CLEAR_DRAFT_RECOVERY" });
  }, [boot.draftRecovery]);

  const dismissDraftRecovery = useCallback(() => {
    clearDraft(levelId); // el padre rechazó ese borrador: no tiene sentido ofrecerlo de nuevo
    bootDispatch({ type: "CLEAR_DRAFT_RECOVERY" });
  }, [levelId]);

  return (
    <Ctx.Provider
      value={{
        state,
        dispatch,
        levelId,
        loading: loading || !boot.hydrated,
        saveNow,
        draftRecovery: boot.draftRecovery,
        applyDraftRecovery,
        dismissDraftRecovery,
        conflict,
        reloadFromConflict,
        dismissConflict,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useLevelEditor(): LevelEditorContextValue {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useLevelEditor debe usarse dentro de LevelEditorProvider");
  return ctx;
}
