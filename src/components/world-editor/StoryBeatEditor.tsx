"use client";

import { Plus, Trash2 } from "lucide-react";
import { newBeatId } from "@/lib/gameworld/ids";
import type { StoryBeat } from "@/lib/gameworld/schema";
import { IconButton } from "@/components/ui/IconButton";
import { Tooltip } from "@/components/ui/Tooltip";

const LABEL_CLASS = "mb-1 block text-[11px] font-bold text-slate-400";
const INPUT_CLASS = "w-full rounded-md border border-indigo-500/20 bg-slate-950/60 px-2 py-1.5 text-slate-100 outline-none focus:border-fuchsia-400/50";

/**
 * Lista de líneas de una cinemática (`StoryBeat[]`) — Fase 17
 * (docs/level-editor-plan-v2.md §4.2). Mismo modelo que `LevelDialogLine`
 * (`DialogEditor.tsx`), pero `speaker` es texto libre (a nivel de mundo no
 * hay entidades de un nivel a las que referenciar).
 */
export function StoryBeatEditor({ beats, onChange }: { beats: StoryBeat[]; onChange: (beats: StoryBeat[]) => void }) {
  function updateBeat(index: number, patch: Partial<StoryBeat>) {
    onChange(beats.map((b, i) => (i === index ? { ...b, ...patch } : b)));
  }
  function addBeat() {
    onChange([...beats, { id: newBeatId(), speaker: null, portrait: "", text: "" }]);
  }
  function removeBeat(index: number) {
    onChange(beats.filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-2">
      {beats.map((beat, i) => (
        <div key={beat.id} className="space-y-1.5 rounded-lg border border-indigo-500/15 bg-slate-900/40 p-2">
          <div className="flex items-center gap-1.5">
            <input
              type="text"
              placeholder="Quién habla (vacío = narrador)"
              className={`${INPUT_CLASS} flex-1`}
              value={beat.speaker ?? ""}
              onChange={(e) => updateBeat(i, { speaker: e.target.value || null })}
            />
            <IconButton icon={Trash2} label="Quitar línea" tooltip="Quita esta línea de la cinemática." side="left" tone="danger" onClick={() => removeBeat(i)} />
          </div>
          <textarea
            rows={2}
            placeholder="Texto de la línea…"
            className={`${INPUT_CLASS} resize-none`}
            value={beat.text}
            onChange={(e) => updateBeat(i, { text: e.target.value })}
          />
        </div>
      ))}
      <Tooltip content="Agrega una línea nueva a la cinemática." side="top">
        <button type="button" onClick={addBeat} className="flex w-full items-center justify-center gap-1.5 rounded-md bg-slate-800 px-2 py-1.5 font-bold text-slate-300 hover:bg-slate-700">
          <Plus className="size-3.5" aria-hidden="true" />
          Añadir línea
        </button>
      </Tooltip>
    </div>
  );
}

export { LABEL_CLASS as STORY_LABEL_CLASS, INPUT_CLASS as STORY_INPUT_CLASS };
