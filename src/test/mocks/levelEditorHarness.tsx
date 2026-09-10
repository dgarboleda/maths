import { createContext, useContext, useReducer, type Dispatch, type ReactNode } from "react";
import { createEmptyLevel } from "@/lib/level/defaults";
import type { LevelDefinition } from "@/lib/level/schema";
import { createInitialEditorState, editorReducer, type EditorAction, type EditorState } from "@/components/level/editor/editorReducer";

/**
 * Arnés de prueba para `useLevelEditor()` — usa el `editorReducer` REAL
 * (client-only, sin Firestore) en vez de `LevelEditorProvider` (que carga y
 * guarda vía `useLevelDoc`/Firestore). Los componentes del editor solo leen
 * `state`/`dispatch` del contexto — nunca `LevelEditorProvider` directo —
 * así que mockear el módulo con este Provider alcanza para ejercitar
 * Toolbox/PropertyPanel/atajos de teclado/deshacer-rehacer de verdad, sin
 * mockear Firebase.
 *
 * Uso en un test:
 * ```ts
 * vi.mock("@/components/level/editor/LevelEditorProvider", async () => {
 *   const harness = await import("@/test/mocks/levelEditorHarness");
 *   return { LevelEditorProvider: harness.TestLevelEditorProvider, useLevelEditor: harness.useTestLevelEditor };
 * });
 * ```
 */

export function emptyTestLevel(): LevelDefinition {
  return createEmptyLevel("padre-de-prueba", "Nivel de prueba", {
    src: "/illustrations/city-central.webp",
    width: 1600,
    height: 907,
    alt: "Fondo de prueba",
    projection: "flat",
  });
}

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
  conflict: null;
  reloadFromConflict: () => Promise<void>;
  dismissConflict: () => void;
}

const Ctx = createContext<LevelEditorContextValue | null>(null);

export function TestLevelEditorProvider({
  children,
  level,
  draftRecovery = null,
  onApplyDraftRecovery,
  onDismissDraftRecovery,
  onSaveNow,
}: {
  children: ReactNode;
  level?: LevelDefinition;
  draftRecovery?: DraftRecovery | null;
  onApplyDraftRecovery?: () => void;
  onDismissDraftRecovery?: () => void;
  onSaveNow?: () => void;
}) {
  const [state, dispatch] = useReducer(editorReducer, level ?? emptyTestLevel(), createInitialEditorState);

  return (
    <Ctx.Provider
      value={{
        state,
        dispatch,
        levelId: "nivel-de-prueba",
        loading: false,
        saveNow: async () => {
          onSaveNow?.();
          dispatch({ type: "SET_SAVE_STATE", state: "saved" });
        },
        draftRecovery,
        applyDraftRecovery: () => onApplyDraftRecovery?.(),
        dismissDraftRecovery: () => onDismissDraftRecovery?.(),
        conflict: null,
        reloadFromConflict: async () => {},
        dismissConflict: () => {},
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useTestLevelEditor(): LevelEditorContextValue {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useTestLevelEditor debe usarse dentro de TestLevelEditorProvider");
  return ctx;
}
