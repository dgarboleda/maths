"use client";

import type { LevelDefinition, PropertyValue, Vec2 } from "@/lib/level/schema";
import type { PropertyFieldDef } from "@/lib/level/entities";

const LABEL_CLASS = "mb-1 block text-[11px] font-bold text-slate-400";
const INPUT_CLASS = "w-full rounded-md border border-indigo-500/20 bg-slate-950/60 px-2 py-1.5 text-slate-100 outline-none focus:border-cyan-400/50";

/**
 * Un campo del panel de propiedades, dirigido enteramente por `field.kind`
 * (docs/level-editor-plan.md §5.3) — nunca por el tipo de entidad. Toda
 * referencia (`entityRef`/`zoneRef`/`dialogRef`/`polygonRef`) se elige de un
 * `<select>` poblado desde `level`, nunca se escribe a mano.
 */
export function PropertyField({
  field,
  value,
  level,
  onChange,
}: {
  field: PropertyFieldDef;
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
          <input
            type="number"
            className={INPUT_CLASS}
            min={field.min}
            max={field.max}
            step={field.step ?? 1}
            value={typeof value === "number" ? value : 0}
            onChange={(e) => onChange(Number(e.target.value))}
          />
        </label>
      );

    case "boolean":
      return (
        <label className="flex items-center gap-2 py-1">
          <input type="checkbox" checked={value === true} onChange={(e) => onChange(e.target.checked)} className="size-4 rounded border-indigo-500/40" />
          <span className="text-[11px] font-bold text-slate-300">{field.label}</span>
        </label>
      );

    case "image":
      return (
        <label className="block">
          <span className={LABEL_CLASS}>{field.label}</span>
          <input
            type="text"
            placeholder="/illustrations/…"
            className={INPUT_CLASS}
            value={typeof value === "string" ? value : ""}
            onChange={(e) => onChange(e.target.value)}
          />
        </label>
      );

    case "entityRef": {
      const options = level.entities.filter((e) => !field.ofType || field.ofType.includes(e.type));
      return (
        <RefSelect
          label={field.label}
          value={typeof value === "string" ? value : ""}
          onChange={onChange}
          options={options.map((e) => ({ id: e.id, label: e.name }))}
        />
      );
    }

    case "zoneRef":
      return (
        <RefSelect
          label={field.label}
          value={typeof value === "string" ? value : ""}
          onChange={onChange}
          options={level.zones.map((z) => ({ id: z.id, label: z.name }))}
        />
      );

    case "dialogRef":
      return (
        <RefSelect
          label={field.label}
          value={typeof value === "string" ? value : ""}
          onChange={onChange}
          options={level.dialogs.map((d) => ({ id: d.id, label: d.name }))}
        />
      );

    case "polygonRef": {
      const pools =
        field.role === "walkable"
          ? level.navigation.walkablePolygons
          : field.role === "blocked"
            ? level.navigation.blockedPolygons
            : [...level.navigation.walkablePolygons, ...level.navigation.blockedPolygons];
      return (
        <RefSelect
          label={field.label}
          value={typeof value === "string" ? value : ""}
          onChange={onChange}
          options={pools.map((p, i) => ({ id: p.id, label: `Polígono ${i + 1}` }))}
        />
      );
    }

    case "points": {
      const points = Array.isArray(value) && value.every((p) => typeof p === "object") ? (value as Vec2[]) : [];
      return (
        <div>
          <span className={LABEL_CLASS}>{field.label}</span>
          <ul className="space-y-1">
            {points.map((p, i) => (
              <li key={i} className="flex items-center gap-1.5 text-[11px] text-slate-300">
                <span className="flex-1 tabular-nums">
                  {p.x.toFixed(1)}%, {p.y.toFixed(1)}%
                </span>
                <button
                  type="button"
                  onClick={() => onChange(points.filter((_, j) => j !== i))}
                  className="rounded px-1.5 py-0.5 font-bold text-rose-400 hover:bg-rose-500/10"
                >
                  Quitar
                </button>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() => onChange([...points, { x: 50, y: 50 }])}
            className="mt-1 rounded-md bg-slate-800 px-2 py-1 text-[11px] font-bold text-slate-300 hover:bg-slate-700"
          >
            + Añadir punto
          </button>
        </div>
      );
    }
  }
}

function RefSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { id: string; label: string }[];
}) {
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
