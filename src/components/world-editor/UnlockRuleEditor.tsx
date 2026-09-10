"use client";

import type { LevelDefinition } from "@/lib/level/schema";
import type { WorldUnlockRule } from "@/lib/gameworld/schema";

const LABEL_CLASS = "mb-1 block text-[11px] font-bold text-slate-400";
const INPUT_CLASS = "w-full rounded-md border border-indigo-500/20 bg-slate-950/60 px-2 py-1.5 text-slate-100 outline-none focus:border-fuchsia-400/50";

const KIND_LABEL: Record<WorldUnlockRule["kind"], string> = {
  always: "Siempre disponible",
  afterLevels: "Después de completar otros niveles",
  afterModules: "Después de dominar módulos del currículo",
  afterStars: "Al juntar cierta cantidad de estrellas",
};

/**
 * Constructor de `WorldUnlockRule` — Fase 16/17 (docs/level-editor-plan-v2.md
 * §3.3/§4.2). Mismo vocabulario para nodos del mapa y (Fase 19) avatares:
 * "siempre" / "tras otros niveles" / "tras módulos dominados" / "tras N
 * estrellas" — nunca un booleano propio, todo se deriva de progreso real.
 */
export function UnlockRuleEditor({
  rule,
  levels,
  onChange,
}: {
  rule: WorldUnlockRule;
  /** Otros niveles elegibles como prerrequisito (nunca el propio, evita un
   *  nodo que dependa de sí mismo por accidente). */
  levels: { id: string; name: string }[];
  onChange: (rule: WorldUnlockRule) => void;
}) {
  function setKind(kind: WorldUnlockRule["kind"]) {
    if (kind === "always") onChange({ kind: "always" });
    else if (kind === "afterLevels") onChange({ kind: "afterLevels", levelIds: [], mode: "all" });
    else if (kind === "afterModules") onChange({ kind: "afterModules", moduleIds: [], mode: "all" });
    else onChange({ kind: "afterStars", stars: 10 });
  }

  return (
    <div className="space-y-1.5">
      <label className="block">
        <span className={LABEL_CLASS}>Se desbloquea</span>
        <select className={INPUT_CLASS} value={rule.kind} onChange={(e) => setKind(e.target.value as WorldUnlockRule["kind"])}>
          {Object.entries(KIND_LABEL).map(([kind, label]) => (
            <option key={kind} value={kind}>
              {label}
            </option>
          ))}
        </select>
      </label>

      {rule.kind === "afterLevels" && (
        <div className="space-y-1">
          <select className={INPUT_CLASS} value={rule.mode} onChange={(e) => onChange({ ...rule, mode: e.target.value as "all" | "any" })}>
            <option value="all">Todos estos niveles</option>
            <option value="any">Cualquiera de estos niveles</option>
          </select>
          <div className="max-h-28 space-y-1 overflow-y-auto rounded-md border border-indigo-500/15 p-1.5">
            {levels.length === 0 && <p className="px-1 text-[10px] text-slate-500">No hay otros niveles todavía.</p>}
            {levels.map((l) => (
              <label key={l.id} className="flex items-center gap-1.5 text-[11px] text-slate-300">
                <input
                  type="checkbox"
                  checked={rule.levelIds.includes(l.id)}
                  onChange={(e) =>
                    onChange({ ...rule, levelIds: e.target.checked ? [...rule.levelIds, l.id] : rule.levelIds.filter((id) => id !== l.id) })
                  }
                  className="size-3.5 rounded border-indigo-500/40"
                />
                {l.name}
              </label>
            ))}
          </div>
        </div>
      )}

      {rule.kind === "afterModules" && (
        <div className="space-y-1">
          <select className={INPUT_CLASS} value={rule.mode} onChange={(e) => onChange({ ...rule, mode: e.target.value as "all" | "any" })}>
            <option value="all">Todos estos módulos</option>
            <option value="any">Cualquiera de estos módulos</option>
          </select>
          <input
            type="text"
            placeholder="ids separados por coma, p. ej. aritmetica-d3, algebra-d1"
            className={INPUT_CLASS}
            defaultValue={rule.moduleIds.join(", ")}
            onBlur={(e) =>
              onChange({ ...rule, moduleIds: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })
            }
          />
        </div>
      )}

      {rule.kind === "afterStars" && (
        <input type="number" min={0} className={INPUT_CLASS} value={rule.stars} onChange={(e) => onChange({ kind: "afterStars", stars: Number(e.target.value) })} />
      )}
    </div>
  );
}

export function levelOptionsExcluding(levels: LevelDefinition[], excludeId: string): { id: string; name: string }[] {
  return levels.filter((l) => l.id !== excludeId).map((l) => ({ id: l.id, name: l.name }));
}
