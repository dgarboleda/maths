"use client";

import { useFamily } from "@/components/family/FamilyProvider";
import { useLevelEditor } from "./LevelEditorProvider";
import { BackgroundPicker, type ResolvedBackgroundSelection } from "./assets/BackgroundPicker";
import { AssetLibrary } from "./assets/AssetLibrary";
import { DepthPanel } from "./DepthPanel";

const LABEL_CLASS = "mb-1 block text-[11px] font-bold text-slate-400";
const INPUT_CLASS = "w-full rounded-md border border-indigo-500/20 bg-slate-950/60 px-2 py-1.5 text-slate-100 outline-none focus:border-cyan-400/50";

/**
 * Panel "Escena" del nivel (`selection.kind === "level"`) —
 * docs/asset-management-plan.md §E.4/§G Paso 8. Cierra el hueco preexistente
 * que dejó docs/scene-25d-plan.md §D.2: antes de esta fase, un nivel YA
 * CREADO no tenía ninguna forma de cambiar su fondo (`SET_BACKGROUND` existía
 * desde la Fase 4 pero solo lo usaba `DepthPanel` para las capas). Envuelve
 * la sección de fondo + `DepthPanel` (profundidad y capas), que sigue
 * exactamente igual — cero cambio en su reducer ni en su lógica.
 */
export function ScenePanel() {
  const { parentId } = useFamily();
  const { state, dispatch } = useLevelEditor();
  const { background } = state.level;

  function applyBackground(selection: ResolvedBackgroundSelection) {
    dispatch({
      type: "SET_BACKGROUND",
      background: { ...background, src: selection.src, width: selection.width, height: selection.height, alt: selection.alt },
    });
  }

  return (
    <div className="space-y-4 text-xs">
      <section className="space-y-2">
        <h2 className="text-[13px] font-bold text-slate-100">Fondo</h2>
        {parentId && <BackgroundPicker parentId={parentId} for="scene" value={background.src} onChange={applyBackground} />}
        <label className="block">
          <span className={LABEL_CLASS}>Texto alternativo (para lectores de pantalla)</span>
          <input
            type="text"
            value={background.alt}
            onChange={(e) => dispatch({ type: "SET_BACKGROUND", background: { ...background, alt: e.target.value } })}
            className={INPUT_CLASS}
          />
        </label>
      </section>

      <div className="border-t border-indigo-500/10 pt-3">
        <DepthPanel />
      </div>

      {parentId && (
        <details className="border-t border-indigo-500/10 pt-3">
          <summary className="cursor-pointer text-[11px] font-bold uppercase tracking-widest text-slate-400 hover:text-slate-300">Gestionar mis imágenes</summary>
          <div className="mt-3">
            <AssetLibrary parentId={parentId} />
          </div>
        </details>
      )}
    </div>
  );
}
