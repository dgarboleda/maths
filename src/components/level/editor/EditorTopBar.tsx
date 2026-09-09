"use client";

import { useRef } from "react";
import Link from "next/link";
import { ArrowLeft, Play, Sparkles } from "lucide-react";
import { useLevelEditor } from "./LevelEditorProvider";

const SAVE_LABEL: Record<string, string> = {
  idle: "",
  saving: "Guardando…",
  saved: "Guardado ✓",
  error: "Error al guardar",
};

/** Barra superior — docs/level-editor-plan.md §5.1. "▶ Probar" queda
 *  deshabilitado hasta que exista el runtime del nivel (Fase 9) y el Play
 *  Test (Fase 11): mostrarlo activo ahora prometería algo que todavía no
 *  hace nada. */
export function EditorTopBar() {
  const { state, dispatch, saveNow } = useLevelEditor();
  const inputRef = useRef<HTMLInputElement>(null);

  function commitName() {
    const el = inputRef.current;
    if (!el) return;
    const trimmed = el.value.trim();
    if (trimmed !== "" && trimmed !== state.level.name) {
      dispatch({ type: "SET_LEVEL_FIELD", patch: { name: trimmed } });
    } else {
      el.value = state.level.name;
    }
  }

  return (
    <header className="flex min-h-14 items-center gap-3 border-b border-indigo-500/20 bg-slate-900/60 px-3 sm:px-4">
      <Link href="/panel/editor" className="flex items-center gap-1.5 text-sm font-bold text-slate-300 hover:text-white">
        <ArrowLeft className="size-4" aria-hidden="true" />
        <span className="hidden sm:inline">Math Quest · Editor</span>
      </Link>

      {/* `key`: si el nombre cambia por fuera (undo/redo, hidratación,
          recuperar borrador) React remonta el input y adopta el nuevo
          `defaultValue` — sin eso hace falta sincronizar con un efecto,
          que dispara `set-state-in-effect` para un valor que además es un
          input no controlado (no tiene sentido controlarlo por estado). */}
      <input
        key={state.level.name}
        ref={inputRef}
        aria-label="Nombre del nivel"
        defaultValue={state.level.name}
        onBlur={commitName}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          if (e.key === "Escape" && inputRef.current) inputRef.current.value = state.level.name;
        }}
        className="min-w-0 flex-1 rounded-lg border border-transparent bg-transparent px-2 py-1 text-sm font-bold text-white hover:border-indigo-500/25 hover:bg-slate-800/60 focus:border-cyan-400/50 focus:bg-slate-800/60 focus:outline-none sm:max-w-xs"
      />

      <button
        type="button"
        onClick={() => dispatch({ type: "SELECT", selection: { kind: "level" } })}
        aria-pressed={state.selection.kind === "level"}
        title="Fondo y profundidad de la escena"
        className={`flex min-h-9 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-bold ${
          state.selection.kind === "level"
            ? "border-cyan-400/50 bg-cyan-500/15 text-cyan-200"
            : "border-indigo-500/25 bg-slate-800/60 text-slate-300 hover:bg-slate-800"
        }`}
      >
        <Sparkles className="size-3.5" aria-hidden="true" />
        <span className="hidden sm:inline">Escena</span>
      </button>

      <span role="status" className="hidden text-xs font-semibold text-slate-400 sm:inline">
        {SAVE_LABEL[state.saveState]}
      </span>

      <button
        type="button"
        onClick={() => void saveNow()}
        disabled={state.saveState === "saving"}
        className="flex min-h-9 items-center rounded-lg border border-indigo-500/25 bg-slate-800/60 px-3 text-xs font-bold text-slate-100 hover:bg-slate-800 disabled:opacity-40"
      >
        Guardar
      </button>

      <button
        type="button"
        disabled
        title="Disponible cuando el Play Test esté implementado"
        className="flex min-h-9 items-center gap-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-fuchsia-600 px-3 text-xs font-bold text-white opacity-40"
      >
        <Play className="size-3.5" aria-hidden="true" />
        Probar
      </button>
    </header>
  );
}
