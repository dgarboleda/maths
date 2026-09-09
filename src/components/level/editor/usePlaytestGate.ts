"use client";

import { useFamily } from "@/components/family/FamilyProvider";
import { validateLevel } from "@/lib/level/validate";
import { targetToSelection } from "./IssuesPanel";
import { useLevelEditor } from "./LevelEditorProvider";

/**
 * Lógica compartida del botón "Probar" (`EditorTopBar` y `EditorBottomBar`)
 * — docs/level-editor-plan.md §11.3: revalida el nivel justo antes de
 * entrar; si hay errores, NO entra a Play Test y selecciona el primero para
 * que se vea en el panel de propiedades/`IssuesPanel`. También bloquea la
 * entrada si el padre-autor todavía no tiene ningún hijo: el Play Test usa
 * el `progressBySkill` real de un hijo (§11.2) — no hay progreso "de
 * mentira" con el que probar los prerrequisitos.
 */
export function useStartPlaytest(): { start: () => void; disabled: boolean; reason: string | null } {
  const { state, dispatch } = useLevelEditor();
  const { children } = useFamily();

  const inPlaytest = state.playtestSessionId !== null;
  const reason = inPlaytest
    ? null
    : children.length === 0
      ? "Añade al menos un hijo en el panel familiar para poder probar el nivel."
      : state.issues.some((issue) => issue.severity === "error")
        ? "Corrige los problemas señalados antes de probar el nivel."
        : null;

  function start() {
    if (inPlaytest) return;
    const issues = validateLevel(state.level);
    dispatch({ type: "SET_ISSUES", issues });
    const firstError = issues.find((issue) => issue.severity === "error");
    if (firstError) {
      dispatch({ type: "SELECT", selection: targetToSelection(firstError.target, state.level) });
      return;
    }
    if (children.length === 0) return;
    dispatch({ type: "START_PLAYTEST" });
  }

  return { start, disabled: inPlaytest || reason !== null, reason };
}
