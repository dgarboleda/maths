"use client";

import { useRef, useState } from "react";
import { Check, Pencil, Trash2, X } from "lucide-react";
import { RECOMMENDED_TOTAL_BYTES_PER_PARENT } from "@/lib/level/assets/imageRules";
import { deleteAsset, findLevelsUsingAsset, renameAsset, type LevelAsset } from "@/lib/level/assets/assetRepository";
import { IconButton } from "@/components/ui/IconButton";
import { Tooltip } from "@/components/ui/Tooltip";
import { useLevelAssets, getAssetServices } from "./useLevelAssets";
import { AssetUploader } from "./AssetUploader";
import { help } from "../helpText";

/**
 * Biblioteca de imágenes del padre — listar, renombrar, borrar
 * (docs/asset-management-plan.md §E.2/§G Paso 6). Borrar comprueba antes
 * `findLevelsUsingAsset` (§G riesgo R4): si algún nivel usa la imagen, el
 * diálogo lo dice por nombre y exige una segunda confirmación explícita.
 */
export function AssetLibrary({ parentId }: { parentId: string }) {
  const { assets, loading, error, reload, totalBytes } = useLevelAssets(parentId);
  const [showUploader, setShowUploader] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<{ asset: LevelAsset; usedBy: { id: string; name: string }[] } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const deleteButtonRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [returnFocusId, setReturnFocusId] = useState<string | null>(null);

  async function handleRequestDelete(asset: LevelAsset) {
    setActionError(null);
    setBusyId(asset.id);
    try {
      const { db, firestore } = await getAssetServices();
      const usedBy = await findLevelsUsingAsset(firestore, db, parentId, asset.url);
      setPendingDelete({ asset, usedBy });
    } catch (err) {
      console.error("No se pudo comprobar en qué niveles se usa la imagen", err);
      setActionError("No se pudo comprobar si esta imagen está en uso.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleConfirmDelete() {
    if (!pendingDelete) return;
    const { asset } = pendingDelete;
    setBusyId(asset.id);
    setReturnFocusId(asset.id);
    try {
      const { db, firestore, storage, storageFns } = await getAssetServices();
      await deleteAsset(storageFns, storage, firestore, db, parentId, asset);
      setPendingDelete(null);
      await reload();
    } catch (err) {
      console.error("No se pudo borrar la imagen", err);
      setActionError("No se pudo borrar la imagen.");
    } finally {
      setBusyId(null);
      deleteButtonRefs.current[returnFocusId ?? ""]?.focus();
    }
  }

  async function handleRename(asset: LevelAsset, newLabel: string) {
    const trimmed = newLabel.trim();
    if (trimmed === "" || trimmed === asset.label) {
      setRenamingId(null);
      return;
    }
    setBusyId(asset.id);
    try {
      const { db, firestore } = await getAssetServices();
      await renameAsset(firestore, db, parentId, asset.id, { label: trimmed });
      await reload();
    } catch (err) {
      console.error("No se pudo renombrar la imagen", err);
      setActionError("No se pudo renombrar la imagen.");
    } finally {
      setBusyId(null);
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
      {actionError && (
        <p role="alert" className="text-rose-300">
          {actionError}
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
                      disabled={busyId === asset.id}
                      onClick={() => setRenamingId(asset.id)}
                    />
                    <Tooltip content={help("asset.delete").text} side="top">
                      <button
                        type="button"
                        ref={(el) => {
                          deleteButtonRefs.current[asset.id] = el;
                        }}
                        aria-label={`Borrar ${asset.label}`}
                        onClick={() => void handleRequestDelete(asset)}
                        disabled={busyId === asset.id}
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

      {pendingDelete && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/80 p-4">
          <div role="alertdialog" aria-modal="true" aria-labelledby="borrar-asset-titulo" className="w-full max-w-md rounded-2xl border border-rose-500/30 bg-slate-900 p-5">
            <h2 id="borrar-asset-titulo" className="text-sm font-bold text-rose-200">
              ¿Borrar &quot;{pendingDelete.asset.label}&quot;?
            </h2>
            {pendingDelete.usedBy.length > 0 ? (
              <>
                <p className="mt-2 text-xs leading-relaxed text-amber-200">Esta imagen se usa en {pendingDelete.usedBy.length === 1 ? "este nivel" : "estos niveles"}:</p>
                <ul className="mt-1 list-disc pl-5 text-xs text-slate-300">
                  {pendingDelete.usedBy.map((l) => (
                    <li key={l.id}>{l.name}</li>
                  ))}
                </ul>
                <p className="mt-2 text-xs leading-relaxed text-slate-400">Si la borrás, esos niveles se quedan sin esa imagen.</p>
              </>
            ) : (
              <p className="mt-2 text-xs leading-relaxed text-slate-300">Esta acción no se puede deshacer.</p>
            )}
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setPendingDelete(null)} className="rounded-lg px-3 py-2 text-xs font-bold text-slate-300 hover:bg-slate-800">
                Cancelar
              </button>
              <button type="button" onClick={() => void handleConfirmDelete()} className="rounded-lg bg-rose-600 px-3 py-2 text-xs font-bold text-white hover:bg-rose-500">
                Borrar {pendingDelete.usedBy.length > 0 ? "de todas formas" : ""}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
