"use client";

import { RotateCcw, X } from "lucide-react";

/**
 * Barra del Play Test — docs/level-editor-plan.md §11.3. Puramente de
 * presentación: no despacha nada del `editorReducer` (`src/components/level/
 * runtime/**` no puede importar de `editor/**`, regla ESLint de esta misma
 * fase) — quien la monta (`LevelEditorScreen`) le pasa `onReset`/`onExit` ya
 * resueltos contra el estado del editor.
 *
 * Fase 26 (docs/plan-salto-producto.md §4.1): antes decía solo "Modo
 * prueba", sin decir con el progreso de qué hijo se está probando. Ahora
 * nombra al hijo actual y, si hay más de uno, deja elegir otro — sin
 * `useFamily` acá (misma regla de arriba): quien la monta ya resolvió la
 * lista y pasa `onSelectChild` armado contra `setSelectedChildId` +
 * `onReset` (cambiar de hijo remonta el runtime, mismo mecanismo que
 * "Reset" — un Play Test a mitad de partida con el progreso de otro hijo
 * dejaría el estado a medio camino sin sentido).
 */
export function PlayTestBar({
  childId,
  childName,
  otherChildren,
  onSelectChild,
  onReset,
  onExit,
}: {
  childId: string;
  childName: string;
  /** Los demás hijos de la familia (sin el actual) — vacío u omitido si el
   *  padre solo tiene un hijo, y no hace falta ningún selector. */
  otherChildren?: { id: string; name: string }[];
  onSelectChild?: (childId: string) => void;
  onReset: () => void;
  onExit: () => void;
}) {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-30 flex justify-end p-2 sm:p-3">
      <div className="world-hud-panel pointer-events-auto flex min-h-11 items-center gap-1.5 rounded-full py-1.5 pl-3 pr-1.5 text-sm font-semibold text-slate-100">
        <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-amber-300">
          <span aria-hidden="true" className="anim-blink">
            ▮
          </span>
          Modo prueba
        </span>
        {otherChildren && otherChildren.length > 0 && onSelectChild ? (
          <>
            <span id="playtest-como-label" className="sr-only">
              Probar como
            </span>
            <select
              aria-labelledby="playtest-como-label"
              value={childId}
              onChange={(e) => onSelectChild(e.target.value)}
              className="ml-1 rounded-full border-none bg-slate-800/80 px-2 py-1 text-xs font-bold text-slate-100 hover:bg-slate-700"
            >
              <option value={childId}>{childName}</option>
              {otherChildren.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </>
        ) : (
          <span className="text-xs font-bold text-slate-300">como {childName}</span>
        )}
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
