"use client";

import { Copy, MapPin, Trash2 } from "lucide-react";
import { getEntityType } from "@/lib/level/entities";
import type { EntityInteraction, PropertyValue } from "@/lib/level/schema";
import { IconButton } from "@/components/ui/IconButton";
import { Tooltip } from "@/components/ui/Tooltip";
import { useLevelEditor } from "./LevelEditorProvider";
import { PropertyField } from "./fields/PropertyFields";
import { ChallengePicker } from "./ChallengePicker";
import { help } from "./helpText";

const LABEL_CLASS = "mb-1 block text-[11px] font-bold text-slate-400";
const INPUT_CLASS = "w-full rounded-md border border-indigo-500/20 bg-slate-950/60 px-2 py-1.5 text-slate-100 outline-none focus:border-cyan-400/50";

/**
 * Panel de propiedades de la entidad seleccionada — docs/level-editor-plan.md
 * §5.3. Cero `switch` por tipo: las comunes (name/position/rotation/scale/
 * layer/visible) y el bloque `interaction` se pintan siempre igual; las
 * propias del tipo se resuelven vía `getEntityType(entity.type).properties`
 * y se pintan con `PropertyField`, un descriptor a la vez.
 */
export function EditorPropertyPanel() {
  const { state, dispatch } = useLevelEditor();

  const { selection } = state;
  if (selection.kind !== "entity") return null;
  const entity = state.level.entities.find((e) => e.id === selection.id);
  if (!entity) return null;
  const typeDef = getEntityType(entity.type);

  function setInteraction(patch: Partial<EntityInteraction>) {
    dispatch({ type: "UPDATE_ENTITY", id: entity!.id, patch: { interaction: { ...entity!.interaction, ...patch } } });
  }

  return (
    <div className="space-y-4 text-xs">
      <div className="flex items-center gap-2">
        <typeDef.Icon className="size-4 shrink-0 text-cyan-300" aria-hidden="true" />
        <h2 className="min-w-0 flex-1 truncate text-[13px] font-bold text-slate-100">{typeDef.label}</h2>
        <IconButton
          icon={Copy}
          label="Duplicar"
          tooltip={help("property.duplicate").text}
          shortcut={help("property.duplicate").shortcut}
          side="left"
          onClick={() => dispatch({ type: "DUPLICATE_ENTITY", id: entity.id })}
        />
        <IconButton
          icon={Trash2}
          label="Eliminar"
          tooltip={help("property.delete").text}
          shortcut={help("property.delete").shortcut}
          side="left"
          tone="danger"
          onClick={() => dispatch({ type: "DELETE_ENTITY", id: entity.id })}
        />
      </div>

      <section className="space-y-2">
        <label className="block">
          <span className={LABEL_CLASS}>Nombre</span>
          <input
            key={entity.id}
            type="text"
            defaultValue={entity.name}
            onBlur={(e) => dispatch({ type: "UPDATE_ENTITY", id: entity.id, patch: { name: e.target.value } })}
            className={INPUT_CLASS}
          />
        </label>

        <label className="block">
          <span className={LABEL_CLASS}>Estado inicial</span>
          <select
            className={INPUT_CLASS}
            value={entity.state.initial}
            onChange={(e) => dispatch({ type: "UPDATE_ENTITY", id: entity.id, patch: { state: { initial: e.target.value } } })}
          >
            {typeDef.defaultStates.states.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </label>

        <div className="grid grid-cols-2 gap-2">
          <label className="block">
            <span className={LABEL_CLASS}>Rotación (°)</span>
            <input
              type="number"
              className={INPUT_CLASS}
              value={entity.rotation}
              onChange={(e) => dispatch({ type: "UPDATE_ENTITY", id: entity.id, patch: { rotation: Number(e.target.value) } })}
            />
          </label>
          <label className="block">
            <span className={LABEL_CLASS}>Escala</span>
            <input
              type="number"
              step="0.1"
              min="0.1"
              className={INPUT_CLASS}
              value={entity.scale}
              onChange={(e) => dispatch({ type: "UPDATE_ENTITY", id: entity.id, patch: { scale: Number(e.target.value) } })}
            />
          </label>
        </div>

        <label className="block">
          <span className={LABEL_CLASS}>Capa (desempate y-sort)</span>
          <input
            type="number"
            className={INPUT_CLASS}
            value={entity.layer}
            onChange={(e) => dispatch({ type: "UPDATE_ENTITY", id: entity.id, patch: { layer: Number(e.target.value) } })}
          />
        </label>

        <label className="flex items-center gap-2 py-1">
          <input
            type="checkbox"
            checked={entity.visible}
            onChange={(e) => dispatch({ type: "UPDATE_ENTITY", id: entity.id, patch: { visible: e.target.checked } })}
            className="size-4 rounded border-indigo-500/40"
          />
          <span className="text-[11px] font-bold text-slate-300">Visible</span>
        </label>
      </section>

      {typeDef.properties.length > 0 && (
        <section className="space-y-2 border-t border-indigo-500/10 pt-3">
          <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Propiedades</h3>
          {typeDef.properties.map((field) => (
            <PropertyField
              key={field.key}
              field={field}
              value={entity.properties[field.key] ?? field.default}
              level={state.level}
              onChange={(value: PropertyValue) => dispatch({ type: "SET_ENTITY_PROPERTY", id: entity.id, key: field.key, value })}
            />
          ))}
        </section>
      )}

      <section className="space-y-2 border-t border-indigo-500/10 pt-3">
        <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Interacción</h3>
        <label className="block">
          <span className={LABEL_CLASS}>Modo</span>
          <select className={INPUT_CLASS} value={entity.interaction.mode} onChange={(e) => setInteraction({ mode: e.target.value as EntityInteraction["mode"] })}>
            <option value="click">Clic</option>
            <option value="proximity">Proximidad</option>
            <option value="none">Ninguno</option>
          </select>
        </label>

        {entity.interaction.mode !== "none" && (
          <>
            <label className="block">
              <span className={LABEL_CLASS}>Mensaje al interactuar</span>
              <input type="text" className={INPUT_CLASS} value={entity.interaction.prompt} onChange={(e) => setInteraction({ prompt: e.target.value })} />
            </label>
            <label className="block">
              <span className={LABEL_CLASS}>Mensaje si está bloqueado</span>
              <input
                type="text"
                className={INPUT_CLASS}
                value={entity.interaction.lockedNote}
                onChange={(e) => setInteraction({ lockedNote: e.target.value })}
              />
            </label>
            <Tooltip content={help("property.standPoint").text} side="left" wide>
              <button
                type="button"
                onClick={() => dispatch({ type: "SET_TOOL", tool: { kind: "pickStandPoint", entityId: entity.id } })}
                className={`flex w-full items-center justify-center gap-1.5 rounded-md px-2 py-1.5 font-bold ${
                  state.tool.kind === "pickStandPoint" ? "bg-amber-500/20 text-amber-300" : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                }`}
              >
                <MapPin className="size-3.5" aria-hidden="true" />
                {entity.interaction.standPoint ? "Cambiar punto de espera" : "Fijar punto de espera"}
              </button>
            </Tooltip>
          </>
        )}
      </section>

      <section className="space-y-2 border-t border-indigo-500/10 pt-3">
        <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Desafío</h3>
        <ChallengePicker entityId={entity.id} />
      </section>
    </div>
  );
}
