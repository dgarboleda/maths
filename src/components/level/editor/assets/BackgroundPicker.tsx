"use client";

import { useEffect, useId, useState } from "react";
import { X } from "lucide-react";
import { loadImageSize } from "@/lib/level/backgroundCatalog";
import { mergeBackgroundOptions, type MergedBackgroundOption } from "@/lib/level/assets/backgroundOptions";
import type { AssetKind } from "@/lib/level/assets/imageRules";
import { help } from "../helpText";
import { useLevelAssets } from "./useLevelAssets";
import { useAssetDeletion } from "./useAssetDeletion";
import { DeleteAssetDialog } from "./DeleteAssetDialog";
import { AssetUploader } from "./AssetUploader";

export interface ResolvedBackgroundSelection {
  src: string;
  width: number;
  height: number;
  alt: string;
}

/**
 * Selector de fondo unificado — docs/asset-management-plan.md §D/§E.5/§G
 * Paso 7. Un único grupo de radios en dos secciones («Mis imágenes» / «De
 * fábrica»), con un botón "Subir imagen" que reutiliza `AssetUploader`. Se
 * usa en los tres puntos del editor: creación de nivel, cambio de fondo de
 * un nivel existente (`ScenePanel`) y selector de capa de parallax
 * (`DepthPanel`, con `compact` y `for="layer"`).
 *
 * Resuelve `width`/`height` antes de llamar a `onChange`: para un fondo de
 * fábrica sigue usando `loadImageSize` (igual que antes de esta fase, cero
 * cambio de comportamiento); para un asset subido usa las dimensiones ya
 * medidas en `imageProcessing.prepareUpload`, sin ninguna llamada de red
 * adicional.
 *
 * La sección «De fábrica» está deliberadamente desactivada (se pasa `[]` a
 * `mergeBackgroundOptions` en vez de `BACKGROUND_CATALOG`) — decisión
 * explícita del usuario, no un olvido: quiere elegir siempre entre sus
 * propias imágenes, nunca entre las 8 de fábrica. `backgroundCatalog.ts` y
 * los archivos de `public/illustrations/` NO se tocan (los sigue usando
 * `/login`, `ciudadCentralAsLevel()` y el mapa del mundo por su cuenta, sin
 * pasar por este selector) — solo se dejó de ofrecer acá. Revertible en una
 * línea si algún día hace falta volver a mostrarlas.
 */
export function BackgroundPicker({
  parentId,
  for: forKind,
  value,
  onChange,
  compact = false,
  autoSelectDefault = false,
}: {
  parentId: string;
  for: AssetKind;
  value: string;
  onChange: (selection: ResolvedBackgroundSelection) => void;
  compact?: boolean;
  /** Solo el formulario de creación de nivel lo pasa en `true` (§G Paso 7,
   *  criterio "el camino de fábrica no cambia en absoluto"): antes de esta
   *  fase, un nivel nuevo arrancaba con Ciudad Central preseleccionada sin
   *  que el autor tuviera que elegir nada — con la biblioteca del padre
   *  sumándose al selector, eso dejó de ser automático. Este flag restaura
   *  ese único caso (cero-clics al crear) sin afectar `DepthPanel`, donde
   *  auto-seleccionar cualquier cosa reintroduciría el problema que motivó
   *  esta fase (una capa de parallax naciendo con una escena opaca). */
  autoSelectDefault?: boolean;
}) {
  const groupName = useId();
  const { assets, reload } = useLevelAssets(parentId);
  const [showUploader, setShowUploader] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [resolving, setResolving] = useState<string | null>(null);
  // Borrar una imagen desde acá (docs/asset-management-plan.md §G riesgo
  // R4): mismo mecanismo que `AssetLibrary`, la única biblioteca completa
  // del editor — antes de esta fase, esta pantalla (el selector embebido en
  // "Nuevo nivel"/cambiar fondo) no ofrecía borrar en absoluto.
  const { pendingDelete, busyId, actionError, requestDelete, confirmDelete, cancelDelete } = useAssetDeletion(parentId, () => void reload());

  const merged = mergeBackgroundOptions([], assets ?? [], { for: forKind, selectedSrc: value || undefined });

  async function select(option: MergedBackgroundOption) {
    if (!option.available) return;
    if (option.source === "factory") {
      setResolving(option.src);
      try {
        const { width, height } = await loadImageSize(option.src);
        onChange({ src: option.src, width, height, alt: option.alt });
      } finally {
        setResolving(null);
      }
      return;
    }
    const asset = assets?.find((a) => a.url === option.src);
    if (!asset) return;
    onChange({ src: asset.url, width: asset.width, height: asset.height, alt: asset.alt });
  }

  const missing = merged.filter((o) => !o.available);
  const parentOptions = merged.filter((o) => o.available && o.source === "parent");
  const factoryPrimary = merged.filter((o) => o.available && o.source === "factory" && !o.lowResolution);
  const factoryLowRes = merged.filter((o) => o.available && o.source === "factory" && o.lowResolution);
  const secondaryParent = parentOptions.filter((o) => !o.matchesKind);
  const primaryParent = parentOptions.filter((o) => o.matchesKind);
  const visibleParent = showAll ? parentOptions : primaryParent;

  // Con «De fábrica» desactivado, el único default posible es la primera
  // imagen propia del padre que coincida con `for` — si todavía no subió
  // ninguna, no hay nada que auto-seleccionar y "Crear nivel" queda
  // deshabilitado hasta que suba o elija una a mano (comportamiento
  // correcto: no hay ningún fondo neutral de reserva que ofrecer).
  const firstDefault = primaryParent[0];
  useEffect(() => {
    if (!autoSelectDefault || value !== "" || !firstDefault) return;
    // `select()` empieza con un `setState` síncrono (`setResolving`) — igual
    // que `setWalkDebug` en QuestScene.tsx, se difiere con `queueMicrotask`
    // para que el efecto en sí nunca actualice estado de forma síncrona.
    queueMicrotask(() => void select(firstDefault));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo debe correr cuando aparece la opción por defecto, no en cada cambio de `select`/`value`
  }, [autoSelectDefault, firstDefault]);

  const thumbSize = compact ? "h-12" : "h-16";

  function Tile({ option }: { option: MergedBackgroundOption }) {
    const checked = value === option.src;
    // Solo las imágenes propias del padre se pueden borrar acá — "De
    // fábrica" está deliberadamente desactivado (ver comentario de arriba),
    // pero si algún día vuelve a mostrarse, esas no son del padre y no
    // tienen ficha en `levelAssets` para borrar.
    const asset = option.source === "parent" ? assets?.find((a) => a.url === option.src) : undefined;
    return (
      <label
        className={`group relative flex cursor-pointer flex-col gap-1 rounded-xl border p-2 text-center transition-colors ${
          checked ? "border-cyan-400/60 bg-cyan-500/10" : "border-indigo-500/20 bg-slate-900/40 hover:border-indigo-400/40"
        }`}
      >
        <input type="radio" name={groupName} value={option.src} checked={checked} onChange={() => void select(option)} className="sr-only" />
        {/* eslint-disable-next-line @next/next/no-img-element -- miniatura, tamaño variable por fondo */}
        <img src={option.thumbSrc} alt="" aria-hidden="true" className={`${thumbSize} w-full rounded-lg object-cover`} />
        {asset && (
          <button
            type="button"
            aria-label={`Borrar ${asset.label}`}
            title={help("asset.delete").text}
            disabled={busyId === asset.id}
            onClick={(e) => {
              // No debe alcanzar al <label>: seleccionaría esta opción como
              // fondo justo antes de borrarla.
              e.preventDefault();
              e.stopPropagation();
              void requestDelete(asset, e.currentTarget);
            }}
            className="absolute right-1 top-1 rounded-full bg-slate-950/70 p-1 text-slate-300 opacity-0 transition-opacity hover:bg-rose-600 hover:text-white focus-visible:opacity-100 disabled:opacity-40 group-hover:opacity-100"
          >
            <X className="size-3" aria-hidden="true" />
          </button>
        )}
        <span className="truncate text-[11px] font-bold text-slate-200">{option.label}</span>
        {resolving === option.src && <span className="text-[10px] text-slate-400">Cargando…</span>}
      </label>
    );
  }

  return (
    <div className="space-y-3">
      {missing.length > 0 &&
        missing.map((o) => (
          <p key={o.src} role="status" className="rounded-md border border-amber-500/30 bg-amber-950/30 px-2 py-1 text-[11px] text-amber-200">
            ⚠ La imagen seleccionada ya no está disponible (puede haberse borrado).
          </p>
        ))}

      {(parentOptions.length > 0 || showUploader) && (
        <fieldset>
          <legend className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-400">Mis imágenes</legend>
          {visibleParent.length > 0 && (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {visibleParent.map((o) => (
                <Tile key={o.src} option={o} />
              ))}
            </div>
          )}
          {secondaryParent.length > 0 && !showAll && (
            <button type="button" onClick={() => setShowAll(true)} className="mt-2 text-[11px] font-bold text-cyan-300 hover:underline">
              Ver también el resto de mis imágenes ({secondaryParent.length})
            </button>
          )}
        </fieldset>
      )}

      {!showUploader ? (
        <button
          type="button"
          onClick={() => setShowUploader(true)}
          className="w-full rounded-xl border border-dashed border-indigo-500/30 px-3 py-2 text-xs font-bold text-slate-300 hover:border-cyan-400/50 hover:text-cyan-200"
        >
          + Subir imagen
        </button>
      ) : (
        <AssetUploader
          parentId={parentId}
          defaultKind={forKind}
          existingAssets={assets ?? []}
          onUploaded={(asset) => {
            setShowUploader(false);
            void reload();
            onChange({ src: asset.url, width: asset.width, height: asset.height, alt: asset.alt });
          }}
          onCancel={() => setShowUploader(false)}
        />
      )}

      {(factoryPrimary.length > 0 || factoryLowRes.length > 0) && (
        <fieldset>
          <legend className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-400">De fábrica</legend>
          {factoryPrimary.length > 0 && (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {factoryPrimary.map((o) => (
                <Tile key={o.src} option={o} />
              ))}
            </div>
          )}
          {factoryLowRes.length > 0 && (
            <details className="mt-2">
              <summary className="cursor-pointer text-[11px] font-bold text-slate-400 hover:text-slate-300">
                Regiones (arte de tarjeta, baja resolución) · {factoryLowRes.length}
              </summary>
              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {factoryLowRes.map((o) => (
                  <div key={o.src} className="relative">
                    <Tile option={o} />
                    <span className="absolute right-1 top-1 rounded bg-amber-950/80 px-1 py-0.5 text-[9px] font-bold text-amber-300">baja res.</span>
                  </div>
                ))}
              </div>
            </details>
          )}
        </fieldset>
      )}

      {actionError && (
        <p role="alert" className="text-[11px] text-rose-300">
          {actionError}
        </p>
      )}
      {pendingDelete && <DeleteAssetDialog pendingDelete={pendingDelete} onCancel={cancelDelete} onConfirm={() => void confirmDelete()} />}
    </div>
  );
}
