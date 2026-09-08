"use client";

import { AlertTriangle, CircleAlert, CircleCheck } from "lucide-react";
import type { LevelIssue, LevelIssueTarget } from "@/lib/level/schema";
import type { Selection } from "./editorReducer";
import { useLevelEditor } from "./LevelEditorProvider";

/** `LevelIssueTarget` no sabe si un polígono es transitable o bloqueado (el
 *  esquema de validación es agnóstico de la UI del editor, ver schema.ts) —
 *  acá sí importa para armar la `Selection` real, así que se busca en las
 *  dos listas. */
function targetToSelection(target: LevelIssueTarget | undefined, level: import("@/lib/level/schema").LevelDefinition): Selection {
  if (!target) return { kind: "none" };
  switch (target.kind) {
    case "polygon": {
      if (!target.id) return { kind: "none" };
      if (level.navigation.walkablePolygons.some((p) => p.id === target.id)) return { kind: "polygon", role: "walkable", id: target.id };
      if (level.navigation.blockedPolygons.some((p) => p.id === target.id)) return { kind: "polygon", role: "blocked", id: target.id };
      return { kind: "none" };
    }
    case "entity":
    case "zone":
    case "dialog":
    case "challenge":
    case "mission":
    case "event":
    case "exit":
      return target.id ? { kind: target.kind, id: target.id } : { kind: "none" };
    case "spawn":
      return { kind: "spawn" };
    case "level":
    case "background":
      return { kind: "level" };
    default:
      return { kind: "none" };
  }
}

/** Lista de problemas de `validateLevel` — docs/level-editor-plan.md §5.1.
 *  Un `error` bloquea el Play Test (Fase 11); un `warning` solo informa. Clic
 *  en cualquiera de los dos selecciona el elemento correspondiente. */
export function IssuesPanel() {
  const { state, dispatch } = useLevelEditor();

  if (state.issues.length === 0) {
    return (
      <p className="flex items-center gap-1.5 rounded-lg border border-emerald-500/20 bg-emerald-950/20 px-2 py-2 text-[11px] font-bold text-emerald-300">
        <CircleCheck className="size-3.5 shrink-0" aria-hidden="true" />
        Sin problemas
      </p>
    );
  }

  function select(issue: LevelIssue) {
    dispatch({ type: "SELECT", selection: targetToSelection(issue.target, state.level) });
  }

  return (
    <ul className="space-y-1.5">
      {state.issues.map((issue, i) => (
        <li key={i}>
          <button
            type="button"
            onClick={() => select(issue)}
            className={`flex w-full items-start gap-1.5 rounded-lg border px-2 py-1.5 text-left text-[11px] leading-snug ${
              issue.severity === "error"
                ? "border-rose-500/30 bg-rose-950/30 text-rose-200 hover:bg-rose-950/50"
                : "border-amber-500/30 bg-amber-950/20 text-amber-200 hover:bg-amber-950/40"
            }`}
          >
            {issue.severity === "error" ? (
              <CircleAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
            ) : (
              <AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
            )}
            <span>{issue.message}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}
