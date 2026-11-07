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
    <div className="space-y-2 rounded-lg border border-slate-600 p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="font-bold">Imágenes de tu biblioteca</p>
        <button type="button" className={smallButton} onClick={() => { setOpen(false); setUploading(false); }}>Cerrar</button>
      </div>
      {error && <p role="alert">{error}</p>}
      {!assets && !error && <p role="status">Cargando imágenes…</p>}
      {assets && !assets.length && <p className="text-sm text-slate-300">Todavía no hay imágenes. Sube la primera.</p>}
      {assets && assets.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {assets.map((a) => (
            <li key={a.id}>
              <button type="button" className="rounded border border-slate-500 p-1" aria-label={`Insertar ${a.label}`} onClick={() => { onInsert(imageMarkdown(a)); setOpen(false); }}>
                {/* eslint-disable-next-line @next/next/no-img-element -- miniatura de Storage */}
                <img src={a.thumbUrl || a.url} alt="" className="h-16 w-24 object-cover" />
              </button>
            </li>
          ))}
        </ul>
      )}
      {uploading
        ? <AssetUploader parentId={parentId} defaultKind="scene" existingAssets={assets ?? []} onCancel={() => setUploading(false)} onUploaded={(asset) => { void reload(); onInsert(imageMarkdown(asset)); setUploading(false); setOpen(false); }} />
        : <button type="button" className={smallButton} onClick={() => setUploading(true)}>Subir imagen nueva</button>}
      <p className="text-sm text-slate-400">La imagen se añade en una línea propia del contenido. Escribe una descripción para quien no pueda verla.</p>
    </div>
  );
}
