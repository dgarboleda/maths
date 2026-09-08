"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
import type { ConditionExpr, LevelActionType, LevelEventType, PropertyValue } from "@/lib/level/schema";
import { ACTION_TYPES, defaultActionParams } from "@/lib/level/events/catalog";
import { useLevelEditor } from "./LevelEditorProvider";
import { ActionField } from "./fields/ActionFields";

const LABEL_CLASS = "mb-1 block text-[11px] font-bold text-slate-400";
const INPUT_CLASS = "w-full rounded-md border border-indigo-500/20 bg-slate-950/60 px-2 py-1.5 text-slate-100 outline-none focus:border-amber-400/50";

const EVENT_TYPES: LevelEventType[] = [
  "ON_INTERACT",
  "ON_CHALLENGE_STARTED",
  "ON_CHALLENGE_SUCCESS",
  "ON_CHALLENGE_FAILED",
  "ON_ITEM_COLLECTED",
  "ON_MISSION_COMPLETE",
  "ON_ENTER_ZONE",
  "ON_EXIT_ZONE",
];

const ACTION_TYPE_KEYS = Object.keys(ACTION_TYPES) as LevelActionType[];

/**
 * Editor de una regla de evento — docs/level-editor-plan.md §8.6. Trigger +
 * condición (árbol `all`/`any`/`not`) + lista ordenable de acciones, cada
 * una pintada con `ACTION_TYPES[type].params` vía `ActionField` — sin
 * ningún `switch` por tipo de acción, mismo contrato que el panel de
 * entidades (§5.3/§7.5).
 */
export function EventChainEditor() {
  const { state, dispatch } = useLevelEditor();
  const { selection } = state;
  if (selection.kind !== "event") return null;
  const found = state.level.events.find((r) => r.id === selection.id);
  if (!found) return null;
  const rule = found;

  function setTrigger(patch: Partial<typeof rule.trigger>) {
    dispatch({ type: "UPDATE_EVENT", id: rule.id, patch: { trigger: { ...rule.trigger, ...patch } } });
  }

  function addAction() {
    const type = ACTION_TYPE_KEYS[0];
    dispatch({
      type: "UPDATE_EVENT",
      id: rule.id,
      patch: { actions: [...rule.actions, { type, params: defaultActionParams(type), delayMs: 0 }] },
    });
  }

  function updateAction(index: number, patch: Partial<(typeof rule.actions)[number]>) {
    dispatch({ type: "UPDATE_EVENT", id: rule.id, patch: { actions: rule.actions.map((a, i) => (i === index ? { ...a, ...patch } : a)) } });
  }

  function removeAction(index: number) {
    dispatch({ type: "UPDATE_EVENT", id: rule.id, patch: { actions: rule.actions.filter((_, i) => i !== index) } });
  }

  function moveAction(index: number, dir: -1 | 1) {
    const to = index + dir;
    if (to < 0 || to >= rule.actions.length) return;
    const actions = [...rule.actions];
    [actions[index], actions[to]] = [actions[to], actions[index]];
    dispatch({ type: "UPDATE_EVENT", id: rule.id, patch: { actions } });
  }

  return (
    <div className="space-y-3 text-xs">
      <div className="flex items-center gap-2">
        <h2 className="min-w-0 flex-1 truncate text-[13px] font-bold text-slate-100">Regla de evento</h2>
        <button type="button" aria-label="Eliminar regla" onClick={() => dispatch({ type: "DELETE_EVENT", id: rule.id })} className="rounded-md p-1.5 text-rose-400 hover:bg-rose-500/10">
          <Trash2 className="size-4" aria-hidden="true" />
        </button>
      </div>

      <label className="block">
        <span className={LABEL_CLASS}>Nombre</span>
        <input
          key={rule.id}
          type="text"
          defaultValue={rule.name}
          onBlur={(e) => dispatch({ type: "UPDATE_EVENT", id: rule.id, patch: { name: e.target.value } })}
          className={INPUT_CLASS}
        />
      </label>

      <section className="space-y-2 border-t border-indigo-500/10 pt-3">
        <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Disparador</h3>
        <label className="block">
          <span className={LABEL_CLASS}>Tipo</span>
          <select className={INPUT_CLASS} value={rule.trigger.type} onChange={(e) => setTrigger({ type: e.target.value as LevelEventType })}>
            {EVENT_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
        <p className="text-[10px] text-slate-500">Dejá el objetivo relevante fijado y el resto vacío; vacíos los cuatro dispara con cualquier objetivo.</p>
        <RefRow label="Entidad" value={rule.trigger.entityId ?? ""} options={state.level.entities.map((e) => ({ id: e.id, label: e.name }))} onChange={(v) => setTrigger({ entityId: v || undefined })} />
        <RefRow
          label="Desafío"
          value={rule.trigger.challengeId ?? ""}
          options={state.level.challenges.map((c) => ({ id: c.id, label: c.moduleId }))}
          onChange={(v) => setTrigger({ challengeId: v || undefined })}
        />
        <RefRow label="Zona" value={rule.trigger.zoneId ?? ""} options={state.level.zones.map((z) => ({ id: z.id, label: z.name }))} onChange={(v) => setTrigger({ zoneId: v || undefined })} />
        <RefRow
          label="Misión"
          value={rule.trigger.missionId ?? ""}
          options={state.level.missions.map((m) => ({ id: m.id, label: m.title }))}
          onChange={(v) => setTrigger({ missionId: v || undefined })}
        />
        <label className="flex items-center gap-2 py-1">
          <input type="checkbox" checked={rule.once} onChange={(e) => dispatch({ type: "UPDATE_EVENT", id: rule.id, patch: { once: e.target.checked } })} className="size-4 rounded border-indigo-500/40" />
          <span className="text-[11px] font-bold text-slate-300">Solo una vez</span>
        </label>
      </section>

      <section className="space-y-2 border-t border-indigo-500/10 pt-3">
        <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Condición</h3>
        <ConditionEditor expr={rule.when} onChange={(when) => dispatch({ type: "UPDATE_EVENT", id: rule.id, patch: { when } })} />
      </section>

      <section className="space-y-2 border-t border-indigo-500/10 pt-3">
        <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Acciones</h3>
        {rule.actions.map((action, i) => (
          <div key={i} className="space-y-1.5 rounded-lg border border-indigo-500/15 bg-slate-900/40 p-2">
            <div className="flex items-center gap-1">
              <select
                className={`${INPUT_CLASS} flex-1`}
                value={action.type}
                onChange={(e) => {
                  const type = e.target.value as LevelActionType;
                  updateAction(i, { type, params: defaultActionParams(type) });
                }}
              >
                {ACTION_TYPE_KEYS.map((t) => (
                  <option key={t} value={t}>
                    {ACTION_TYPES[t].label}
                  </option>
                ))}
              </select>
              <button type="button" aria-label="Subir" onClick={() => moveAction(i, -1)} disabled={i === 0} className="rounded-md p-1.5 text-slate-400 hover:bg-slate-800 disabled:opacity-30">
                <ChevronUp className="size-3.5" aria-hidden="true" />
              </button>
              <button
                type="button"
                aria-label="Bajar"
                onClick={() => moveAction(i, 1)}
                disabled={i === rule.actions.length - 1}
                className="rounded-md p-1.5 text-slate-400 hover:bg-slate-800 disabled:opacity-30"
              >
                <ChevronDown className="size-3.5" aria-hidden="true" />
              </button>
              <button type="button" aria-label="Quitar acción" onClick={() => removeAction(i)} className="rounded-md p-1.5 text-rose-400 hover:bg-rose-500/10">
                <Trash2 className="size-3.5" aria-hidden="true" />
              </button>
            </div>

            <label className="block">
              <span className={LABEL_CLASS}>Retardo desde la acción anterior (ms)</span>
              <input type="number" min={0} className={INPUT_CLASS} value={action.delayMs} onChange={(e) => updateAction(i, { delayMs: Number(e.target.value) })} />
            </label>

            {ACTION_TYPES[action.type].params.map((field) => (
              <ActionField
                key={field.key}
                field={field}
                value={action.params[field.key] ?? field.default}
                level={state.level}
                onChange={(value: PropertyValue) => updateAction(i, { params: { ...action.params, [field.key]: value } })}
              />
            ))}
          </div>
        ))}
        <button type="button" onClick={addAction} className="flex w-full items-center justify-center gap-1.5 rounded-md bg-slate-800 px-2 py-1.5 font-bold text-slate-300 hover:bg-slate-700">
          <Plus className="size-3.5" aria-hidden="true" />
          Añadir acción
        </button>
      </section>
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

const CONDITION_KINDS = [
  { kind: "always", label: "Siempre" },
  { kind: "flag", label: "Bandera" },
  { kind: "entityState", label: "Estado de entidad" },
  { kind: "all", label: "Todas (Y)" },
  { kind: "any", label: "Alguna (O)" },
  { kind: "not", label: "No" },
] as const;

/** Árbol de `ConditionExpr` — se edita recursivamente: `all`/`any` tienen una
 *  lista de hijos (cada uno, este mismo componente); `not` tiene un único
 *  hijo. */
function ConditionEditor({ expr, onChange, depth = 0 }: { expr: ConditionExpr; onChange: (expr: ConditionExpr) => void; depth?: number }) {
  const { state } = useLevelEditor();
  const [flagName, setFlagName] = useState(expr.kind === "flag" ? expr.flag : "");

  function setKind(kind: (typeof CONDITION_KINDS)[number]["kind"]) {
    if (kind === "always") onChange({ kind: "always" });
    else if (kind === "flag") onChange({ kind: "flag", flag: "", value: true });
    else if (kind === "entityState") onChange({ kind: "entityState", entityId: state.level.entities[0]?.id ?? "", state: "" });
    else if (kind === "all") onChange({ kind: "all", of: [] });
    else if (kind === "any") onChange({ kind: "any", of: [] });
    else onChange({ kind: "not", of: { kind: "always" } });
  }

  return (
    <div className={depth > 0 ? "ml-3 border-l border-indigo-500/15 pl-2" : ""}>
      <select className={INPUT_CLASS} value={expr.kind} onChange={(e) => setKind(e.target.value as (typeof CONDITION_KINDS)[number]["kind"])}>
        {CONDITION_KINDS.map((k) => (
          <option key={k.kind} value={k.kind}>
            {k.label}
          </option>
        ))}
      </select>

      {expr.kind === "flag" && (
        <div className="mt-1.5 flex items-center gap-1.5">
          <input
            type="text"
            placeholder="nombre de la bandera"
            className={INPUT_CLASS}
            value={flagName}
            onChange={(e) => {
              setFlagName(e.target.value);
              onChange({ kind: "flag", flag: e.target.value, value: expr.value });
            }}
          />
          <select className={INPUT_CLASS} value={String(expr.value)} onChange={(e) => onChange({ kind: "flag", flag: expr.flag, value: e.target.value === "true" })}>
            <option value="true">true</option>
            <option value="false">false</option>
          </select>
        </div>
      )}

      {expr.kind === "entityState" && (
        <div className="mt-1.5 flex items-center gap-1.5">
          <select className={INPUT_CLASS} value={expr.entityId} onChange={(e) => onChange({ kind: "entityState", entityId: e.target.value, state: expr.state })}>
            {state.level.entities.map((ent) => (
              <option key={ent.id} value={ent.id}>
                {ent.name}
              </option>
            ))}
          </select>
          <input
            type="text"
            placeholder="id del estado"
            className={INPUT_CLASS}
            value={expr.state}
            onChange={(e) => onChange({ kind: "entityState", entityId: expr.entityId, state: e.target.value })}
          />
        </div>
      )}

      {(expr.kind === "all" || expr.kind === "any") && (
        <div className="mt-1.5 space-y-1.5">
          {expr.of.map((child, i) => (
            <div key={i} className="flex items-start gap-1">
              <div className="min-w-0 flex-1">
                <ConditionEditor
                  expr={child}
                  depth={depth + 1}
                  onChange={(next) => {
                    const of = expr.of.map((c, j) => (j === i ? next : c));
                    onChange({ kind: expr.kind, of });
                  }}
                />
              </div>
              <button
                type="button"
                aria-label="Quitar condición"
                onClick={() => onChange({ kind: expr.kind, of: expr.of.filter((_, j) => j !== i) })}
                className="mt-1 shrink-0 rounded-md p-1 text-rose-400 hover:bg-rose-500/10"
              >
                <Trash2 className="size-3.5" aria-hidden="true" />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => onChange({ kind: expr.kind, of: [...expr.of, { kind: "always" }] })}
            className="flex items-center gap-1 rounded-md px-1.5 py-1 text-[10px] font-bold text-slate-400 hover:bg-slate-800"
          >
            <Plus className="size-3" aria-hidden="true" />
            Añadir condición
          </button>
        </div>
      )}

      {expr.kind === "not" && (
        <div className="mt-1.5">
          <ConditionEditor expr={expr.of} depth={depth + 1} onChange={(next) => onChange({ kind: "not", of: next })} />
        </div>
      )}
    </div>
  );
}
