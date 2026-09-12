"use client";

import { Plus, Trash2 } from "lucide-react";
import { DEFAULT_DEPTH_CONFIG } from "@/lib/level/depth";
import { getEntityType } from "@/lib/level/entities";
import { newBackgroundFilterId } from "@/lib/level/ids";
import type { LevelBackgroundFilter, LevelDepthConfig } from "@/lib/level/schema";
import { IconButton } from "@/components/ui/IconButton";
import { useLevelEditor } from "./LevelEditorProvider";
import { ConditionEditor } from "./ConditionEditor";
import { help } from "./helpText";

const LABEL_CLASS = "mb-1 block text-[11px] font-bold text-slate-400";
const INPUT_CLASS = "w-full rounded-md border border-indigo-500/20 bg-slate-950/60 px-2 py-1.5 text-slate-100 outline-none focus:border-cyan-400/50";

/**
 * Puntos de partida razonables para "Añadir filtro de noche/día" — las dos
 * caras de la MISMA bandera (`noche`, prendida/apagada desde una regla de
 * evento con `SET_FLAG`), para que un nivel con ciclo día-noche real quede
 * armado con un clic en cada botón; el autor solo ajusta el nombre de la
 * bandera si ya usa otro en su nivel.
 */
const NIGHT_FILTER_PRESET = { flag: "noche", value: true, css: "brightness(0.55) saturate(0.8) hue-rotate(200deg)" };
const DAY_FILTER_PRESET = { flag: "noche", value: false, css: "brightness(1.08) saturate(1.05)" };

/**
 * Panel de propiedades del NIVEL (`selection.kind === "level"`,
 * docs/scene-25d-plan.md §D.2/§N Paso 3) — fondo/nombre ya se editan en otro
 * lado (`EditorTopBar`, selector de creación); acá vive lo nuevo de esta
 * fase: la curva profundidad→escala/sombra y las capas decorativas de
 * parallax. Reutiliza `SET_LEVEL_FIELD` (ya existía, solo se le amplió el
 * tipo de `patch` para aceptar `depth`) y `SET_BACKGROUND` (ya existía, no
 * se había usado nunca) — cero acciones de reducer nuevas.
 */
export function DepthPanel() {
  const { state, dispatch } = useLevelEditor();
  const depth: LevelDepthConfig = state.level.depth ?? DEFAULT_DEPTH_CONFIG;
  const filters = state.level.background.filters ?? [];

  function setDepth(patch: Partial<LevelDepthConfig>) {
    dispatch({ type: "SET_LEVEL_FIELD", patch: { depth: { ...depth, ...patch } } });
  }

  function setFilters(next: LevelBackgroundFilter[]) {
    dispatch({ type: "SET_BACKGROUND", background: { ...state.level.background, filters: next } });
  }

  function addFilter(preset?: { flag: string; value: boolean; css: string }) {
    const filter: LevelBackgroundFilter = {
      id: newBackgroundFilterId(),
      when: preset ? { kind: "flag", flag: preset.flag, value: preset.value } : { kind: "always" },
      css: preset?.css ?? "",
    };
    setFilters([...filters, filter]);
  }

  function updateFilter(id: string, patch: Partial<LevelBackgroundFilter>) {
    setFilters(filters.map((f) => (f.id === id ? { ...f, ...patch } : f)));
  }

  function deleteFilter(id: string) {
    setFilters(filters.filter((f) => f.id !== id));
  }

  return (
    <div className="space-y-4 text-xs">
      <h2 className="text-[13px] font-bold text-slate-100">Escena 2.5D</h2>

      <section className="space-y-2">
        <label className="flex items-center gap-2 py-1">
          <input type="checkbox" checked={depth.enabled} onChange={(e) => setDepth({ enabled: e.target.checked })} className="size-4 rounded border-indigo-500/40" />
          <span className="text-[11px] font-bold text-slate-300">Activar profundidad (escala + sombra por posición)</span>
        </label>

        {depth.enabled && (
          <>
            <div className="grid grid-cols-2 gap-2">
              <label className="block">
                <span className={LABEL_CLASS}>Y cerca (%)</span>
                <input
                  type="number"
                  min={0}
                  max={100}
                  className={INPUT_CLASS}
                  value={depth.range.nearY}
                  onChange={(e) => setDepth({ range: { ...depth.range, nearY: Number(e.target.value) } })}
                />
              </label>
              <label className="block">
                <span className={LABEL_CLASS}>Y lejos (%)</span>
                <input
                  type="number"
                  min={0}
                  max={100}
                  className={INPUT_CLASS}
                  value={depth.range.farY}
                  onChange={(e) => setDepth({ range: { ...depth.range, farY: Number(e.target.value) } })}
                />
              </label>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <label className="block">
                <span className={LABEL_CLASS}>Escala cerca</span>
                <input
                  type="number"
                  step="0.05"
                  min="0.1"
                  className={INPUT_CLASS}
                  value={depth.scale.near}
                  onChange={(e) => setDepth({ scale: { ...depth.scale, near: Number(e.target.value) } })}
                />
              </label>
              <label className="block">
                <span className={LABEL_CLASS}>Escala lejos</span>
                <input
                  type="number"
                  step="0.05"
                  min="0.1"
                  className={INPUT_CLASS}
                  value={depth.scale.far}
                  onChange={(e) => setDepth({ scale: { ...depth.scale, far: Number(e.target.value) } })}
                />
              </label>
            </div>
            <label className="flex items-center gap-2 py-1">
              <input
                type="checkbox"
                checked={depth.shadow.enabled}
                onChange={(e) => setDepth({ shadow: { ...depth.shadow, enabled: e.target.checked } })}
                className="size-4 rounded border-indigo-500/40"
              />
              <span className="text-[11px] font-bold text-slate-300">Sombra de contacto</span>
            </label>
            {depth.shadow.enabled && (
              <div className="grid grid-cols-2 gap-2">
                <label className="block">
                  <span className={LABEL_CLASS}>Opacidad cerca</span>
                  <input
                    type="number"
                    step="0.05"
                    min="0"
                    max="1"
                    className={INPUT_CLASS}
                    value={depth.shadow.opacityNear}
                    onChange={(e) => setDepth({ shadow: { ...depth.shadow, opacityNear: Number(e.target.value) } })}
                  />
                </label>
                <label className="block">
                  <span className={LABEL_CLASS}>Opacidad lejos</span>
                  <input
                    type="number"
                    step="0.05"
                    min="0"
                    max="1"
                    className={INPUT_CLASS}
                    value={depth.shadow.opacityFar}
                    onChange={(e) => setDepth({ shadow: { ...depth.shadow, opacityFar: Number(e.target.value) } })}
                  />
                </label>
              </div>
            )}
          </>
        )}
      </section>

      <section className="space-y-2 border-t border-indigo-500/10 pt-3">
        <div className="flex items-center justify-between">
          <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Iluminación (día/noche)</h3>
        </div>
        <p className="text-[11px] leading-relaxed text-slate-400">
          Un filtro se activa cuando su condición se cumple y cambia el color del fondo — el primero que matchee gana. Sin ninguno
          activo, el fondo se ve tal cual la imagen.
        </p>

        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => addFilter(NIGHT_FILTER_PRESET)}
            className="rounded-md bg-slate-800 px-2 py-1 text-[10px] font-bold text-slate-300 hover:bg-slate-700"
          >
            + Preestablecido noche
          </button>
          <button
            type="button"
            onClick={() => addFilter(DAY_FILTER_PRESET)}
            className="rounded-md bg-slate-800 px-2 py-1 text-[10px] font-bold text-slate-300 hover:bg-slate-700"
          >
            + Preestablecido día
          </button>
          <IconButton icon={Plus} label="Añadir filtro en blanco" tooltip={help("depth.addFilter").text} side="left" onClick={() => addFilter()} />
        </div>

        {filters.length === 0 && <p className="text-[11px] text-slate-400">Sin filtros — no hay ciclo de día/noche en este nivel.</p>}

        {filters.map((filter, i) => (
          <div key={filter.id} className="space-y-2 rounded-md border border-indigo-500/15 bg-slate-900/40 p-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-300">Filtro {i + 1}</span>
              <IconButton icon={Trash2} label={`Eliminar filtro ${i + 1}`} tooltip={help("depth.removeFilter").text} side="left" tone="danger" onClick={() => deleteFilter(filter.id)} />
            </div>
            <div>
              <span className={LABEL_CLASS}>Se activa cuando…</span>
              <ConditionEditor expr={filter.when} onChange={(when) => updateFilter(filter.id, { when })} />
            </div>
            <label className="block">
              <span className={LABEL_CLASS}>Filtro CSS</span>
              <input
                type="text"
                placeholder="brightness(0.55) saturate(0.8) hue-rotate(200deg)"
                className={`${INPUT_CLASS} font-mono`}
                value={filter.css}
                onChange={(e) => updateFilter(filter.id, { css: e.target.value })}
              />
            </label>
          </div>
        ))}
      </section>

      <EntityStackOrder />

      <section className="space-y-2 border-t border-indigo-500/10 pt-3">
        <div className="flex items-center justify-between">
          <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Capas de fondo (parallax + clima)</h3>
        </div>
        <p className="text-[11px] leading-relaxed text-slate-400">
          Se editan en la caja de herramientas flotante — botón &quot;Capas&quot; en la barra inferior.
        </p>
      </section>
    </div>
  );
}

/**
 * Lista de solo lectura con el orden REAL de dibujo de las entidades (mismo
 * `sort` que `RuntimeCanvas.tsx`/`EntityLayer.tsx`: `layer` desempata,
 * después `y`) — sin esto, saber qué tapa a qué exige leer dos números por
 * entidad y hacer la cuenta a mano. Clic en una fila selecciona esa entidad
 * (mismo `dispatch` que un clic en el lienzo), para ir directo a ajustar su
 * `layer` si el orden no es el que se quería. El jugador (Alex) no aparece
 * acá: no es una entidad del nivel, entra al mismo `sort` en tiempo de
 * juego con `layer: 0` (ver `RuntimeCanvas.tsx`), pero no se edita desde
 * este panel.
 */
function EntityStackOrder() {
  const { state, dispatch } = useLevelEditor();
  const entities = [...state.level.entities].sort((a, b) => a.layer - b.layer || a.position.y - b.position.y);

  return (
    <section className="space-y-2 border-t border-indigo-500/10 pt-3">
      <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Orden de dibujo</h3>

      {entities.length === 0 ? (
        <p className="text-[11px] text-slate-400">Todavía no hay entidades en el nivel.</p>
      ) : (
        <>
          <p className="text-[11px] leading-relaxed text-slate-400">
            Arriba de la lista queda más atrás; abajo, más adelante (tapa a lo de arriba). Este es el resultado real de combinar Capa y
            posición vertical — tocá una fila para seleccionar esa entidad.
          </p>
          <ol className="space-y-1">
            {entities.map((entity, i) => {
              const typeDef = getEntityType(entity.type);
              return (
                <li key={entity.id}>
                  <button
                    type="button"
                    onClick={() => dispatch({ type: "SELECT", selection: { kind: "entity", id: entity.id } })}
                    className={`flex w-full items-center gap-2 rounded-md border px-2 py-1.5 text-left ${
                      state.selection.kind === "entity" && state.selection.id === entity.id
                        ? "border-cyan-400/50 bg-cyan-950/30"
                        : "border-indigo-500/15 bg-slate-900/40 hover:border-indigo-400/40"
                    }`}
                  >
                    <span className="w-4 shrink-0 text-right text-[10px] font-bold text-slate-500">{i + 1}</span>
                    <typeDef.Icon className="size-3.5 shrink-0 text-cyan-300" aria-hidden="true" />
                    <span className="min-w-0 flex-1 truncate text-[11px] font-semibold text-slate-200">{entity.name}</span>
                    <span className="shrink-0 text-[10px] text-slate-500">
                      capa {entity.layer} · y {Math.round(entity.position.y)}%
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        </>
      )}
    </section>
  );
}
