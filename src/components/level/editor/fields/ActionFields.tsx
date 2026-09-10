"use client";

import { useId } from "react";
import { CircleHelp } from "lucide-react";
import type { LevelDefinition, PropertyValue } from "@/lib/level/schema";
import type { ActionParamDef } from "@/lib/level/events/catalog";
import { Tooltip } from "@/components/ui/Tooltip";
import { FieldLabel } from "./PropertyFields";

const INPUT_CLASS = "w-full rounded-md border border-indigo-500/20 bg-slate-950/60 px-2 py-1.5 text-slate-100 outline-none focus:border-amber-400/50";

/**
 * Un parámetro de una `LevelAction`, dirigido por `field.kind` — mismo
 * principio que `PropertyField` (fields/PropertyFields.tsx) para las
 * entidades, pero sobre `ActionParamDef` (catálogo de eventos, §8.4): son
 * tipos separados porque los kinds no coinciden del todo (acá hay
 * `"select"`, allá no; acá no hay `"points"`).
 */
export function ActionField({
  field,
  value,
  level,
  onChange,
}: {
  field: ActionParamDef;
  value: PropertyValue;
  level: LevelDefinition;
  onChange: (value: PropertyValue) => void;
}) {
  const id = useId();
  switch (field.kind) {
    case "text":
      return (
        <div className="block">
          <FieldLabel label={field.label} hint={field.hint} htmlFor={id} />
          <input id={id} type="text" className={INPUT_CLASS} value={typeof value === "string" ? value : ""} onChange={(e) => onChange(e.target.value)} />
        </div>
      );

    case "number":
      return (
        <div className="block">
          <FieldLabel label={field.label} hint={field.hint} htmlFor={id} />
          <input id={id} type="number" className={INPUT_CLASS} value={typeof value === "number" ? value : 0} onChange={(e) => onChange(Number(e.target.value))} />
        </div>
      );

    case "boolean":
      return (
        <div className="flex items-center gap-1 py-1">
          <label className="flex flex-1 items-center gap-2">
            <input type="checkbox" checked={value === true} onChange={(e) => onChange(e.target.checked)} className="size-4 rounded border-indigo-500/40" />
            <span className="text-[11px] font-bold text-slate-300">{field.label}</span>
          </label>
          {field.hint && (
            <Tooltip content={field.hint} side="left" wide>
              <button type="button" aria-label="Ayuda" className="text-slate-500 hover:text-slate-300">
                <CircleHelp className="size-3" aria-hidden="true" />
              </button>
            </Tooltip>
          )}
        </div>
      );

    case "select":
      return (
        <div className="block">
          <FieldLabel label={field.label} hint={field.hint} htmlFor={id} />
          <select id={id} className={INPUT_CLASS} value={typeof value === "string" ? value : field.default} onChange={(e) => onChange(e.target.value)}>
            {field.options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      );

    case "entityRef": {
      const options = level.entities.filter((e) => !field.ofType || field.ofType.includes(e.type));
      return (
        <RefSelect label={field.label} hint={field.hint} value={typeof value === "string" ? value : ""} onChange={onChange} options={options.map((e) => ({ id: e.id, label: e.name }))} />
      );
    }

    case "polygonRef": {
      const options = [...level.navigation.walkablePolygons, ...level.navigation.blockedPolygons];
      return (
        <RefSelect
          label={field.label}
          hint={field.hint}
          value={typeof value === "string" ? value : ""}
          onChange={onChange}
          options={options.map((p, i) => ({ id: p.id, label: `Polígono ${i + 1}` }))}
        />
      );
    }

    case "zoneRef":
      return (
        <RefSelect label={field.label} hint={field.hint} value={typeof value === "string" ? value : ""} onChange={onChange} options={level.zones.map((z) => ({ id: z.id, label: z.name }))} />
      );

    case "dialogRef":
      return (
        <RefSelect label={field.label} hint={field.hint} value={typeof value === "string" ? value : ""} onChange={onChange} options={level.dialogs.map((d) => ({ id: d.id, label: d.name }))} />
      );

    case "challengeRef":
      return (
        <RefSelect
          label={field.label}
          hint={field.hint}
          value={typeof value === "string" ? value : ""}
          onChange={onChange}
          options={level.challenges.map((c) => ({ id: c.id, label: c.moduleId }))}
        />
      );

    case "missionRef":
      return (
        <RefSelect label={field.label} hint={field.hint} value={typeof value === "string" ? value : ""} onChange={onChange} options={level.missions.map((m) => ({ id: m.id, label: m.title }))} />
      );
  }
}

function RefSelect({
  label,
  hint,
  value,
  onChange,
  options,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (value: string) => void;
  options: { id: string; label: string }[];
}) {
  const id = useId();
  return (
    <div className="block">
      <FieldLabel label={label} hint={hint} htmlFor={id} />
      <select id={id} className={INPUT_CLASS} value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">— ninguno —</option>
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
