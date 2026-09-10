"use client";

import { Trash2 } from "lucide-react";
import { IconButton } from "@/components/ui/IconButton";
import { useLevelEditor } from "./LevelEditorProvider";
import { help } from "./helpText";

const LABEL_CLASS = "mb-1 block text-[11px] font-bold text-slate-400";
const INPUT_CLASS = "w-full rounded-md border border-indigo-500/20 bg-slate-950/60 px-2 py-1.5 text-slate-100 outline-none focus:border-violet-400/50";

/**
 * Panel de la zona seleccionada — docs/level-editor-plan.md §7 (Fase 7). Las
 * zonas se dibujan una vez (polígono o círculo, `PolygonEditor.tsx`); acá
 * solo se renombran o se borran. Mover/editar vértices de una zona queda
 * fuera del alcance de esta fase — no lo pide el entregable verificable
 * (asociar un desafío a una entidad), y el mismo patrón de arrastre de
 * `PolygonEditor` puede generalizarse después si hace falta.
 */
export function ZoneEditor() {
  const { state, dispatch } = useLevelEditor();
  const { selection } = state;
  if (selection.kind !== "zone") return null;
  const zone = state.level.zones.find((z) => z.id === selection.id);
  if (!zone) return null;

  return (
    <div className="space-y-3 text-xs">
      <div className="flex items-center gap-2">
        <span className="size-3 shrink-0 rounded-full bg-violet-400" aria-hidden="true" />
        <h2 className="min-w-0 flex-1 truncate text-[13px] font-bold text-slate-100">Zona</h2>
        <IconButton icon={Trash2} label="Eliminar" tooltip={help("zone.delete").text} side="left" tone="danger" onClick={() => dispatch({ type: "DELETE_ZONE", id: zone.id })} />
      </div>

      <label className="block">
        <span className={LABEL_CLASS}>Nombre</span>
        <input
          key={zone.id}
          type="text"
          defaultValue={zone.name}
          onBlur={(e) => dispatch({ type: "UPDATE_ZONE", id: zone.id, patch: { name: e.target.value } })}
          className={INPUT_CLASS}
        />
      </label>

      <p className="text-[11px] text-slate-500">{zone.shape.kind === "circle" ? `Círculo · radio ${zone.shape.radius.toFixed(1)}%` : `Polígono · ${zone.shape.points.length} vértices`}</p>
    </div>
  );
}
