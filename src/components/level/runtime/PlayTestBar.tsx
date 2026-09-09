"use client";

import { RotateCcw, X } from "lucide-react";

/**
 * Barra del Play Test — docs/level-editor-plan.md §11.3. Puramente de
 * presentación: no despacha nada del `editorReducer` (`src/components/level/
 * runtime/**` no puede importar de `editor/**`, regla ESLint de esta misma
 * fase) — quien la monta (`LevelEditorScreen`) le pasa `onReset`/`onExit` ya
 * resueltos contra el estado del editor.
 */
export function PlayTestBar({ onReset, onExit }: { onReset: () => void; onExit: () => void }) {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-30 flex justify-end p-2 sm:p-3">
      <div className="world-hud-panel pointer-events-auto flex min-h-11 items-center gap-1.5 rounded-full py-1.5 pl-3 pr-1.5 text-sm font-semibold text-slate-100">
        <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-amber-300">
          <span aria-hidden="true" className="anim-blink">
            ▮
          </span>
          Modo prueba
        </span>
        <button
          type="button"
          onClick={onReset}
          className="ml-2 flex min-h-8 items-center gap-1 rounded-full bg-slate-800/80 px-2.5 text-xs font-bold hover:bg-slate-700"
        >
          <RotateCcw className="size-3.5" aria-hidden="true" />
          Reset
        </button>
        <button
          type="button"
          onClick={onExit}
          className="flex min-h-8 items-center gap-1 rounded-full bg-slate-800/80 px-2.5 text-xs font-bold hover:bg-slate-700"
        >
          <X className="size-3.5" aria-hidden="true" />
          Salir
        </button>
      </div>
    </div>
  );
}
