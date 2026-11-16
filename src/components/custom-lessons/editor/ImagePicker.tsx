"use client";
import { useState } from "react";
import { AssetUploader } from "@/components/level/editor/assets/AssetUploader";
import { useLevelAssets } from "@/components/level/editor/assets/useLevelAssets";
import type { LevelAsset } from "@/lib/level/assets/assetRepository";
import { smallButton } from "./styles";

/** Texto que añade una imagen al contenido: una línea propia `![alt](url)`. */
export const imageMarkdown = (asset: Pick<LevelAsset, "alt" | "label" | "url">) => `![${(asset.alt || asset.label).replace(/[[\]\n]/g, " ").slice(0, 200)}](${asset.url})`;

/** Inserta en el contenido una imagen de la biblioteca de la familia (o una nueva). */
export function ImagePicker({ parentId, onInsert }: { parentId: string; onInsert: (markdown: string) => void }) {
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const { assets, error, reload } = useLevelAssets(open ? parentId : null);
  if (!open) return <button type="button" className={smallButton} onClick={() => setOpen(true)}>Insertar imagen</button>;
  return (
    <div className="mt-2 space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-slate-900">Imágenes de tu biblioteca</p>
        <button type="button" className={smallButton} onClick={() => { setOpen(false); setUploading(false); }}>Cerrar</button>
      </div>
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      {!assets && !error && <p role="status" className="text-sm text-slate-500">Cargando imágenes…</p>}
      {assets && !assets.length && <p className="text-sm text-slate-600">Todavía no hay imágenes. Sube la primera.</p>}
      {assets && assets.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {assets.map((a) => (
            <li key={a.id}>
              <button type="button" className="rounded-lg border border-slate-200 bg-white p-1 hover:border-indigo-300" aria-label={`Insertar ${a.label}`} onClick={() => { onInsert(imageMarkdown(a)); setOpen(false); }}>
                {/* eslint-disable-next-line @next/next/no-img-element -- miniatura de Storage */}
                <img src={a.thumbUrl || a.url} alt="" className="h-16 w-24 rounded object-cover" />
              </button>
            </li>
          ))}
        </ul>
      )}
      {uploading
        ? <AssetUploader parentId={parentId} defaultKind="scene" existingAssets={assets ?? []} onCancel={() => setUploading(false)} onUploaded={(asset) => { void reload(); onInsert(imageMarkdown(asset)); setUploading(false); setOpen(false); }} />
        : <button type="button" className={smallButton} onClick={() => setUploading(true)}>Subir imagen nueva</button>}
      <p className="text-xs text-slate-500">La imagen se añade en una línea propia del contenido. Escribe una descripción para quien no pueda verla.</p>
    </div>
  );
}
