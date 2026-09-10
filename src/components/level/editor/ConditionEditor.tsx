"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import type { ConditionExpr } from "@/lib/level/schema";
import { IconButton } from "@/components/ui/IconButton";
import { Tooltip } from "@/components/ui/Tooltip";
import { useLevelEditor } from "./LevelEditorProvider";
import { help } from "./helpText";

const INPUT_CLASS = "w-full rounded-md border border-indigo-500/20 bg-slate-950/60 px-2 py-1.5 text-slate-100 outline-none focus:border-amber-400/50";

const CONDITION_KINDS = [
  { kind: "always", label: "Siempre" },
  { kind: "flag", label: "Bandera" },
  { kind: "entityState", label: "Estado de entidad" },
  { kind: "all", label: "Todas (Y)" },
  { kind: "any", label: "Alguna (O)" },
  { kind: "not", label: "No" },
] as const;

/**
 * Árbol de `ConditionExpr` — se edita recursivamente: `all`/`any` tienen una
 * lista de hijos (cada uno, este mismo componente); `not` tiene un único
 * hijo. Extraído de `EventChainEditor.tsx` (Fase 8) para que `DepthPanel`
 * (filtros de iluminación condicionados por bandera, día/noche) lo reutilice
 * tal cual, en vez de reimplementar el mismo árbol de condiciones.
 */
export function ConditionEditor({ expr, onChange, depth = 0 }: { expr: ConditionExpr; onChange: (expr: ConditionExpr) => void; depth?: number }) {
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
              <div className="mt-1">
                <IconButton
                  icon={Trash2}
                  label="Quitar condición"
                  tooltip={help("event.removeCondition").text}
                  side="left"
                  tone="danger"
                  onClick={() => onChange({ kind: expr.kind, of: expr.of.filter((_, j) => j !== i) })}
                />
              </div>
            </div>
          ))}
          <Tooltip content={help("event.addCondition").text} side="top">
            <button
              type="button"
              onClick={() => onChange({ kind: expr.kind, of: [...expr.of, { kind: "always" }] })}
              className="flex items-center gap-1 rounded-md px-1.5 py-1 text-[10px] font-bold text-slate-400 hover:bg-slate-800"
            >
              <Plus className="size-3" aria-hidden="true" />
              Añadir condición
            </button>
          </Tooltip>
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
