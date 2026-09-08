"use client";

import { Plus, Trash2 } from "lucide-react";
import type { LevelDialogLine } from "@/lib/level/schema";
import { useLevelEditor } from "./LevelEditorProvider";

const LABEL_CLASS = "mb-1 block text-[11px] font-bold text-slate-400";
const INPUT_CLASS = "w-full rounded-md border border-indigo-500/20 bg-slate-950/60 px-2 py-1.5 text-slate-100 outline-none focus:border-cyan-400/50";

/**
 * Editor de líneas de diálogo — docs/level-editor-plan.md §7 (Fase 7). Cada
 * línea tiene un hablante (una entidad del nivel, o `null` = narrador) y un
 * retrato opcional, mismo modelo que `LevelDialogLine` (§4). Se guarda con
 * el mismo patrón que el resto del editor: cada cambio despacha de una,
 * sin estado local propio del contenido.
 */
export function DialogEditor() {
  const { state, dispatch } = useLevelEditor();
  const { selection } = state;
  if (selection.kind !== "dialog") return null;
  const dialog = state.level.dialogs.find((d) => d.id === selection.id);
  if (!dialog) return null;

  function updateLine(index: number, patch: Partial<LevelDialogLine>) {
    const lines = dialog!.lines.map((l, i) => (i === index ? { ...l, ...patch } : l));
    dispatch({ type: "UPDATE_DIALOG", id: dialog!.id, patch: { lines } });
  }

  function addLine() {
    const lines = [...dialog!.lines, { speakerEntityId: null, text: "" }];
    dispatch({ type: "UPDATE_DIALOG", id: dialog!.id, patch: { lines } });
  }

  function removeLine(index: number) {
    dispatch({ type: "UPDATE_DIALOG", id: dialog!.id, patch: { lines: dialog!.lines.filter((_, i) => i !== index) } });
  }

  return (
    <div className="space-y-3 text-xs">
      <div className="flex items-center gap-2">
        <h2 className="min-w-0 flex-1 truncate text-[13px] font-bold text-slate-100">Diálogo</h2>
        <button
          type="button"
          aria-label="Eliminar diálogo"
          onClick={() => dispatch({ type: "DELETE_DIALOG", id: dialog.id })}
          className="rounded-md p-1.5 text-rose-400 hover:bg-rose-500/10"
        >
          <Trash2 className="size-4" aria-hidden="true" />
        </button>
      </div>

      <label className="block">
        <span className={LABEL_CLASS}>Nombre</span>
        <input
          key={dialog.id}
          type="text"
          defaultValue={dialog.name}
          onBlur={(e) => dispatch({ type: "UPDATE_DIALOG", id: dialog.id, patch: { name: e.target.value } })}
          className={INPUT_CLASS}
        />
      </label>

      <div className="space-y-2">
        {dialog.lines.map((line, i) => (
          <div key={i} className="space-y-1.5 rounded-lg border border-indigo-500/15 bg-slate-900/40 p-2">
            <div className="flex items-center gap-1.5">
              <select
                className={`${INPUT_CLASS} flex-1`}
                value={line.speakerEntityId ?? ""}
                onChange={(e) => updateLine(i, { speakerEntityId: e.target.value || null })}
              >
                <option value="">Narrador</option>
                {state.level.entities.map((ent) => (
                  <option key={ent.id} value={ent.id}>
                    {ent.name}
                  </option>
                ))}
              </select>
              <button type="button" aria-label="Quitar línea" onClick={() => removeLine(i)} className="shrink-0 rounded-md p-1.5 text-rose-400 hover:bg-rose-500/10">
                <Trash2 className="size-3.5" aria-hidden="true" />
              </button>
            </div>
            <textarea
              rows={2}
              placeholder="Texto de la línea…"
              className={`${INPUT_CLASS} resize-none`}
              value={line.text}
              onChange={(e) => updateLine(i, { text: e.target.value })}
            />
          </div>
        ))}
      </div>

      <button type="button" onClick={addLine} className="flex w-full items-center justify-center gap-1.5 rounded-md bg-slate-800 px-2 py-1.5 font-bold text-slate-300 hover:bg-slate-700">
        <Plus className="size-3.5" aria-hidden="true" />
        Añadir línea
      </button>
    </div>
  );
}
