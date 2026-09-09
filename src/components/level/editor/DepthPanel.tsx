"use client";

import { Plus, Trash2 } from "lucide-react";
import { useFamily } from "@/components/family/FamilyProvider";
import { DEFAULT_DEPTH_CONFIG } from "@/lib/level/depth";
import { newBackgroundLayerId } from "@/lib/level/ids";
import type { LevelBackgroundLayer, LevelDepthConfig } from "@/lib/level/schema";
import { useLevelEditor } from "./LevelEditorProvider";
import { BackgroundPicker } from "./assets/BackgroundPicker";

const LABEL_CLASS = "mb-1 block text-[11px] font-bold text-slate-400";
const INPUT_CLASS = "w-full rounded-md border border-indigo-500/20 bg-slate-950/60 px-2 py-1.5 text-slate-100 outline-none focus:border-cyan-400/50";

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
  const { parentId } = useFamily();
  const { state, dispatch } = useLevelEditor();
  const depth: LevelDepthConfig = state.level.depth ?? DEFAULT_DEPTH_CONFIG;
  const layers = state.level.background.layers ?? [];

  function setDepth(patch: Partial<LevelDepthConfig>) {
    dispatch({ type: "SET_LEVEL_FIELD", patch: { depth: { ...depth, ...patch } } });
  }

  function setLayers(next: LevelBackgroundLayer[]) {
    dispatch({ type: "SET_BACKGROUND", background: { ...state.level.background, layers: next } });
  }

  function addLayer() {
    // `src: ""` a propósito (docs/asset-management-plan.md §E.3): antes de
    // esta fase se preseleccionaba Ciudad Central (una escena completa y
    // opaca), lo que dejaba el parallax inutilizable por defecto — ahora el
    // autor elige explícitamente una imagen (de su biblioteca o de fábrica)
    // desde el `BackgroundPicker` de abajo.
    const layer: LevelBackgroundLayer = {
      id: newBackgroundLayerId(),
      src: "",
      depth: 0.5,
      offsetY: 0,
      opacity: 1,
      loop: false,
      effect: "none",
    };
    setLayers([...layers, layer]);
  }

  function updateLayer(id: string, patch: Partial<LevelBackgroundLayer>) {
    setLayers(layers.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  }

  function deleteLayer(id: string) {
    setLayers(layers.filter((l) => l.id !== id));
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
          <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Capas de fondo (parallax)</h3>
          <button type="button" onClick={addLayer} aria-label="Añadir capa" className="rounded-md p-1.5 text-cyan-300 hover:bg-cyan-500/10">
            <Plus className="size-4" aria-hidden="true" />
          </button>
        </div>

        {layers.length === 0 && <p className="text-[11px] text-slate-400">Sin capas adicionales — el fondo se mueve como siempre.</p>}

        {layers.map((layer, i) => (
          <div key={layer.id} className="space-y-2 rounded-md border border-indigo-500/15 bg-slate-900/40 p-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-300">Capa {i + 1}</span>
              <button type="button" onClick={() => deleteLayer(layer.id)} aria-label={`Eliminar capa ${i + 1}`} className="rounded-md p-1 text-rose-400 hover:bg-rose-500/10">
                <Trash2 className="size-3.5" aria-hidden="true" />
              </button>
            </div>
            <div>
              <span className={LABEL_CLASS}>Imagen</span>
              {parentId ? (
                <BackgroundPicker parentId={parentId} for="layer" compact value={layer.src} onChange={(selection) => updateLayer(layer.id, { src: selection.src })} />
              ) : (
                !layer.src && <p className="text-[11px] text-amber-300">Elegí una imagen para esta capa.</p>
              )}
            </div>
            <label className="block">
              <span className={LABEL_CLASS}>Profundidad (0 fija · 1 como el fondo · &gt;1 primer plano)</span>
              <input
                type="number"
                step="0.1"
                min="0"
                className={INPUT_CLASS}
                value={layer.depth}
                onChange={(e) => updateLayer(layer.id, { depth: Number(e.target.value) })}
              />
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label className="block">
                <span className={LABEL_CLASS}>Desplaz. Y (%)</span>
                <input
                  type="number"
                  className={INPUT_CLASS}
                  value={layer.offsetY}
                  onChange={(e) => updateLayer(layer.id, { offsetY: Number(e.target.value) })}
                />
              </label>
              <label className="block">
                <span className={LABEL_CLASS}>Opacidad</span>
                <input
                  type="number"
                  step="0.05"
                  min="0"
                  max="1"
                  className={INPUT_CLASS}
                  value={layer.opacity}
                  onChange={(e) => updateLayer(layer.id, { opacity: Number(e.target.value) })}
                />
              </label>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
