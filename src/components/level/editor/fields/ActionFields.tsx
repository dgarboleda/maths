"use client";

import type { LevelDefinition, PropertyValue } from "@/lib/level/schema";
import type { ActionParamDef } from "@/lib/level/events/catalog";

const LABEL_CLASS = "mb-1 block text-[11px] font-bold text-slate-400";
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
  switch (field.kind) {
    case "text":
      return (
        <label className="block">
          <span className={LABEL_CLASS}>{field.label}</span>
          <input type="text" className={INPUT_CLASS} value={typeof value === "string" ? value : ""} onChange={(e) => onChange(e.target.value)} />
        </label>
      );

    case "number":
      return (
        <label className="block">
          <span className={LABEL_CLASS}>{field.label}</span>
          <input type="number" className={INPUT_CLASS} value={typeof value === "number" ? value : 0} onChange={(e) => onChange(Number(e.target.value))} />
        </label>
      );

    case "boolean":
      return (
        <label className="flex items-center gap-2 py-1">
          <input type="checkbox" checked={value === true} onChange={(e) => onChange(e.target.checked)} className="size-4 rounded border-indigo-500/40" />
          <span className="text-[11px] font-bold text-slate-300">{field.label}</span>
        </label>
      );

    case "select":
      return (
        <label className="block">
          <span className={LABEL_CLASS}>{field.label}</span>
          <select className={INPUT_CLASS} value={typeof value === "string" ? value : field.default} onChange={(e) => onChange(e.target.value)}>
            {field.options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
      );

    case "entityRef": {
      const options = level.entities.filter((e) => !field.ofType || field.ofType.includes(e.type));
      return <RefSelect label={field.label} value={typeof value === "string" ? value : ""} onChange={onChange} options={options.map((e) => ({ id: e.id, label: e.name }))} />;
    }

    case "polygonRef": {
      const options = [...level.navigation.walkablePolygons, ...level.navigation.blockedPolygons];
      return (
        <RefSelect
          label={field.label}
          value={typeof value === "string" ? value : ""}
          onChange={onChange}
          options={options.map((p, i) => ({ id: p.id, label: `Polígono ${i + 1}` }))}
        />
      );
    }

    case "zoneRef":
      return <RefSelect label={field.label} value={typeof value === "string" ? value : ""} onChange={onChange} options={level.zones.map((z) => ({ id: z.id, label: z.name }))} />;

    case "dialogRef":
      return <RefSelect label={field.label} value={typeof value === "string" ? value : ""} onChange={onChange} options={level.dialogs.map((d) => ({ id: d.id, label: d.name }))} />;

    case "challengeRef":
      return (
        <RefSelect
          label={field.label}
          value={typeof value === "string" ? value : ""}
          onChange={onChange}
          options={level.challenges.map((c) => ({ id: c.id, label: c.moduleId }))}
        />
      );

    case "missionRef":
      return <RefSelect label={field.label} value={typeof value === "string" ? value : ""} onChange={onChange} options={level.missions.map((m) => ({ id: m.id, label: m.title }))} />;
  }
}

function RefSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: { id: string; label: string }[] }) {
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
