"use client";

import { useState } from "react";
import { Check, Pencil, Trash2, X } from "lucide-react";
import { RECOMMENDED_TOTAL_BYTES_PER_PARENT } from "@/lib/level/assets/imageRules";
import { renameAsset, type LevelAsset } from "@/lib/level/assets/assetRepository";
import { IconButton } from "@/components/ui/IconButton";
import { Tooltip } from "@/components/ui/Tooltip";
import { useLevelAssets, getAssetServices } from "./useLevelAssets";
import { useAssetDeletion } from "./useAssetDeletion";
import { DeleteAssetDialog } from "./DeleteAssetDialog";
import { AssetUploader } from "./AssetUploader";
import { help } from "../helpText";

/**
 * Biblioteca de imágenes del padre — listar, renombrar, borrar
 * (docs/asset-management-plan.md §E.2/§G Paso 6). Borrar (`useAssetDeletion`)
 * comprueba antes `findLevelsUsingAsset` (§G riesgo R4): si algún nivel usa
 * la imagen, el diálogo lo dice por nombre y exige una segunda confirmación
 * explícita.
 */
export function AssetLibrary({ parentId }: { parentId: string }) {
  const { assets, loading, error, reload, totalBytes } = useLevelAssets(parentId);
  const [showUploader, setShowUploader] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameBusyId, setRenameBusyId] = useState<string | null>(null);
  const [renameError, setRenameError] = useState<string | null>(null);
  const { pendingDelete, busyId, actionError, requestDelete, confirmDelete, cancelDelete } = useAssetDeletion(parentId, () => void reload());

  async function handleRename(asset: LevelAsset, newLabel: string) {
    const trimmed = newLabel.trim();
    if (trimmed === "" || trimmed === asset.label) {
      setRenamingId(null);
      return;
    }
    setRenameBusyId(asset.id);
    try {
      const { db, firestore } = await getAssetServices();
      await renameAsset(firestore, db, parentId, asset.id, { label: trimmed });
      await reload();
    } catch (err) {
      console.error("No se pudo renombrar la imagen", err);
      setRenameError("No se pudo renombrar la imagen.");
    } finally {
      setRenameBusyId(null);
      setRenamingId(null);
    }
  }

  return (
    <div className="space-y-3 text-xs">
      <div className="flex items-center justify-between">
        <h3 className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Mis imágenes</h3>
        <Tooltip content={showUploader ? "Cierra el formulario de subida." : help("asset.upload").text} side="left">
          <button
            type="button"
            onClick={() => setShowUploader((v) => !v)}
            className="rounded-md border border-indigo-500/25 bg-slate-800/60 px-2 py-1 font-bold text-slate-100 hover:bg-slate-800"
          >
            {showUploader ? "Cerrar" : "Subir imagen"}
          </button>
        </Tooltip>
      </div>

      {assets && assets.length > 0 && (
        <p className="text-[10px] text-slate-400">
          {assets.length} imagen{assets.length === 1 ? "" : "es"} · {(totalBytes / (1024 * 1024)).toFixed(1)}MB de ~{RECOMMENDED_TOTAL_BYTES_PER_PARENT / (1024 * 1024)}MB
        </p>
      )}

      {showUploader && (
        <AssetUploader
          parentId={parentId}
          defaultKind="scene"
          existingAssets={assets ?? []}
          onUploaded={() => {
            setShowUploader(false);
            void reload();
          }}
          onCancel={() => setShowUploader(false)}
        />
      )}

      {error && (
        <p role="alert" className="text-rose-300">
          {error}
        </p>
      )}
      {(actionError || renameError) && (
        <p role="alert" className="text-rose-300">
          {actionError ?? renameError}
        </p>
      )}

      {loading ? (
        <p role="status" className="text-slate-400">
          Cargando…
        </p>
      ) : assets!.length === 0 ? (
        <p className="text-slate-400">Todavía no subiste ninguna imagen.</p>
      ) : (
        <ul className="grid grid-cols-2 gap-2">
          {assets!.map((asset) => (
            <li key={asset.id} className="space-y-1 rounded-md border border-indigo-500/15 bg-slate-900/40 p-2">
              {/* eslint-disable-next-line @next/next/no-img-element -- miniatura remota, dimensiones variables por asset */}
              <img src={asset.thumbUrl} alt="" aria-hidden="true" loading="lazy" decoding="async" className="h-16 w-full rounded object-cover" onError={(e) => (e.currentTarget.style.opacity = "0.2")} />

              {renamingId === asset.id ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    void handleRename(asset, (e.currentTarget.elements.namedItem("label") as HTMLInputElement).value);
                  }}
                  className="flex items-center gap-1"
                >
                  <input name="label" defaultValue={asset.label} autoFocus className="min-w-0 flex-1 rounded border border-cyan-400/40 bg-slate-950/60 px-1 py-0.5 text-[11px] text-slate-100" />
                  <Tooltip content="Guardar el nombre nuevo." side="top">
                    <button type="submit" aria-label="Guardar nombre" className="rounded p-1 text-emerald-300 hover:bg-emerald-500/10">
                      <Check className="size-3.5" aria-hidden="true" />
                    </button>
                  </Tooltip>
                  <Tooltip content="Cancelar el cambio de nombre." side="top">
                    <button type="button" aria-label="Cancelar" onClick={() => setRenamingId(null)} className="rounded p-1 text-slate-400 hover:bg-slate-800">
                      <X className="size-3.5" aria-hidden="true" />
                    </button>
                  </Tooltip>
                </form>
              ) : (
                <div className="flex items-center justify-between gap-1">
                  <span className="truncate font-bold text-slate-200" title={asset.label}>
                    {asset.label}
                  </span>
                  <div className="flex shrink-0 gap-0.5">
                    <IconButton
                      icon={Pencil}
                      label={`Renombrar ${asset.label}`}
                      tooltip={help("asset.rename").text}
                      side="top"
                      disabled={busyId === asset.id || renameBusyId === asset.id}
                      onClick={() => setRenamingId(asset.id)}
                    />
                    <Tooltip content={help("asset.delete").text} side="top">
                      <button
                        type="button"
                        aria-label={`Borrar ${asset.label}`}
                        onClick={(e) => void requestDelete(asset, e.currentTarget)}
                        disabled={busyId === asset.id || renameBusyId === asset.id}
                        className="rounded p-1 text-rose-400 hover:bg-rose-500/10"
                      >
                        <Trash2 className="size-3.5" aria-hidden="true" />
                      </button>
                    </Tooltip>
                  </div>
                </div>
              )}
              <span className="block text-[10px] text-slate-400">
                {asset.width}×{asset.height} · {asset.kind === "scene" ? "Escena" : "Capa"}
              </span>
            </li>
          ))}
        </ul>
      )}

      {pendingDelete && <DeleteAssetDialog pendingDelete={pendingDelete} onCancel={cancelDelete} onConfirm={() => void confirmDelete()} />}
    </div>
  );
}
