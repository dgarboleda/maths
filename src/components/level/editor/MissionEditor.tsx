"use client";

import { Plus, Trash2 } from "lucide-react";
import type { LevelDefinition, LevelMissionObjective, ObjectiveSource } from "@/lib/level/schema";
import { newObjectiveId } from "@/lib/level/ids";
import { useLevelEditor } from "./LevelEditorProvider";

const LABEL_CLASS = "mb-1 block text-[11px] font-bold text-slate-400";
const INPUT_CLASS = "w-full rounded-md border border-indigo-500/20 bg-slate-950/60 px-2 py-1.5 text-slate-100 outline-none focus:border-amber-400/50";

const SOURCE_KINDS = [
  { kind: "challenge", label: "Desafío resuelto" },
  { kind: "zone", label: "Entrar a una zona" },
  { kind: "collectible", label: "Recoger un objeto" },
  { kind: "flag", label: "Bandera" },
] as const;

function defaultSource(kind: ObjectiveSource["kind"], level: LevelDefinition): ObjectiveSource {
  switch (kind) {
    case "challenge":
      return { kind: "challenge", challengeId: level.challenges[0]?.id ?? "" };
    case "zone":
      return { kind: "zone", zoneId: level.zones[0]?.id ?? "" };
    case "collectible":
      return { kind: "collectible", entityId: level.entities.find((e) => e.type === "collectible")?.id ?? "" };
    case "flag":
      return { kind: "flag", flag: "", value: true };
  }
}

/**
 * Panel de la misión seleccionada — docs/level-editor-plan.md §9.5/§17 Fase
 * 12. Título, premisa y la lista de objetivos, cada uno con su
 * `ObjectiveSource` (una de 4 formas de "hecho" — nunca un booleano propio,
 * ver `runtime/state.ts:deriveObjectiveDone`). Mismo patrón de guardado que
 * el resto del editor: cada cambio despacha de una vía `UPDATE_MISSION`.
 */
export function MissionEditor() {
  const { state, dispatch } = useLevelEditor();
  const { selection } = state;
  if (selection.kind !== "mission") return null;
  const mission = state.level.missions.find((m) => m.id === selection.id);
  if (!mission) return null;

  function updateObjective(index: number, patch: Partial<LevelMissionObjective>) {
    const objectives = mission!.objectives.map((o, i) => (i === index ? { ...o, ...patch } : o));
    dispatch({ type: "UPDATE_MISSION", id: mission!.id, patch: { objectives } });
  }

  function addObjective() {
    const objective: LevelMissionObjective = {
      id: newObjectiveId(),
      label: "Objetivo nuevo",
      source: defaultSource("challenge", state.level),
    };
    dispatch({ type: "UPDATE_MISSION", id: mission!.id, patch: { objectives: [...mission!.objectives, objective] } });
  }

  function removeObjective(index: number) {
    dispatch({ type: "UPDATE_MISSION", id: mission!.id, patch: { objectives: mission!.objectives.filter((_, i) => i !== index) } });
  }

  return (
    <div className="space-y-3 text-xs">
      <div className="flex items-center gap-2">
        <h2 className="min-w-0 flex-1 truncate text-[13px] font-bold text-slate-100">Misión</h2>
        <button
          type="button"
          aria-label="Eliminar misión"
          onClick={() => dispatch({ type: "DELETE_MISSION", id: mission.id })}
          className="rounded-md p-1.5 text-rose-400 hover:bg-rose-500/10"
        >
          <Trash2 className="size-4" aria-hidden="true" />
        </button>
      </div>

      <label className="block">
        <span className={LABEL_CLASS}>Título</span>
        <input
          key={`${mission.id}-title`}
          type="text"
          defaultValue={mission.title}
          onBlur={(e) => dispatch({ type: "UPDATE_MISSION", id: mission.id, patch: { title: e.target.value } })}
          className={INPUT_CLASS}
        />
      </label>

      <label className="block">
        <span className={LABEL_CLASS}>Premisa</span>
        <textarea
          key={`${mission.id}-premise`}
          rows={3}
          defaultValue={mission.premise}
          onBlur={(e) => dispatch({ type: "UPDATE_MISSION", id: mission.id, patch: { premise: e.target.value } })}
          className={`${INPUT_CLASS} resize-none`}
        />
      </label>

      <div className="space-y-2 border-t border-indigo-500/10 pt-3">
        <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Objetivos</h3>
        {mission.objectives.map((objective, i) => (
          <div key={objective.id} className="space-y-1.5 rounded-lg border border-indigo-500/15 bg-slate-900/40 p-2">
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                placeholder="Etiqueta del objetivo"
                className={`${INPUT_CLASS} flex-1`}
                value={objective.label}
                onChange={(e) => updateObjective(i, { label: e.target.value })}
              />
              <button type="button" aria-label="Quitar objetivo" onClick={() => removeObjective(i)} className="shrink-0 rounded-md p-1.5 text-rose-400 hover:bg-rose-500/10">
                <Trash2 className="size-3.5" aria-hidden="true" />
              </button>
            </div>
            <ObjectiveSourceEditor source={objective.source} onChange={(source) => updateObjective(i, { source })} />
          </div>
        ))}
        <button type="button" onClick={addObjective} className="flex w-full items-center justify-center gap-1.5 rounded-md bg-slate-800 px-2 py-1.5 font-bold text-slate-300 hover:bg-slate-700">
          <Plus className="size-3.5" aria-hidden="true" />
          Añadir objetivo
        </button>
      </div>
    </div>
  );
}

function ObjectiveSourceEditor({ source, onChange }: { source: ObjectiveSource; onChange: (source: ObjectiveSource) => void }) {
  const { state } = useLevelEditor();

  return (
    <div className="space-y-1.5 border-t border-indigo-500/10 pt-1.5">
      <select className={INPUT_CLASS} value={source.kind} onChange={(e) => onChange(defaultSource(e.target.value as ObjectiveSource["kind"], state.level))}>
        {SOURCE_KINDS.map((k) => (
          <option key={k.kind} value={k.kind}>
            {k.label}
          </option>
        ))}
      </select>

      {source.kind === "challenge" && (
        <RefRow
          label="Desafío"
          value={source.challengeId}
          options={state.level.challenges.map((c) => ({ id: c.id, label: c.moduleId }))}
          onChange={(challengeId) => onChange({ kind: "challenge", challengeId })}
        />
      )}
      {source.kind === "zone" && (
        <RefRow
          label="Zona"
          value={source.zoneId}
          options={state.level.zones.map((z) => ({ id: z.id, label: z.name }))}
          onChange={(zoneId) => onChange({ kind: "zone", zoneId })}
        />
      )}
      {source.kind === "collectible" && (
        <RefRow
          label="Coleccionable"
          value={source.entityId}
          options={state.level.entities.filter((e) => e.type === "collectible").map((e) => ({ id: e.id, label: e.name }))}
          onChange={(entityId) => onChange({ kind: "collectible", entityId })}
        />
      )}
      {source.kind === "flag" && (
        <div className="flex items-center gap-1.5">
          <input
            type="text"
            placeholder="nombre de la bandera"
            className={`${INPUT_CLASS} flex-1`}
            value={source.flag}
            onChange={(e) => onChange({ kind: "flag", flag: e.target.value, value: source.value })}
          />
          <select className={INPUT_CLASS} value={String(source.value)} onChange={(e) => onChange({ kind: "flag", flag: source.flag, value: e.target.value === "true" })}>
            <option value="true">true</option>
            <option value="false">false</option>
          </select>
        </div>
      )}
    </div>
  );
}

function RefRow({ label, value, options, onChange }: { label: string; value: string; options: { id: string; label: string }[]; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className={LABEL_CLASS}>{label}</span>
      <select className={INPUT_CLASS} value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">— ninguno —</option>
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
