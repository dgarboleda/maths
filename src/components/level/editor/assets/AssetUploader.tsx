"use client";

import { useId, useRef, useState } from "react";
import { UploadCloud } from "lucide-react";
import { prepareUpload } from "@/lib/level/assets/imageProcessing";
import { checkQuota, gradeResolution, RESOLUTION_THRESHOLDS, sanitizeLabel, validateFileMeta, type AssetKind, type PreparedAssetUpload } from "@/lib/level/assets/imageRules";
import { uploadAsset, type LevelAsset } from "@/lib/level/assets/assetRepository";
import { getAssetServices } from "./useLevelAssets";

const LABEL_CLASS = "mb-1 block text-[11px] font-bold text-slate-400";
const INPUT_CLASS = "w-full rounded-md border border-indigo-500/20 bg-slate-950/60 px-2 py-1.5 text-slate-100 outline-none focus:border-cyan-400/50";

const KIND_LABEL: Record<AssetKind, string> = { scene: "fondo de escena", layer: "capa", avatar: "avatar" };
const KIND_RADIO_LABEL: Record<AssetKind, string> = { scene: "Fondo de escena completa", layer: "Capa de parallax", avatar: "Avatar de personaje" };

/**
 * Subir una imagen a la biblioteca del padre — docs/asset-management-plan.md
 * §D/§E.2/§G Paso 6. Flujo: elegir archivo → `validateFileMeta` (formato/
 * peso de entrada) → `prepareUpload` (decodifica, redimensiona, detecta
 * alfa) → `gradeResolution` sobre las dimensiones ORIGINALES (bloquea con
 * `error`, avisa con `warning`) → confirmar etiqueta/alt → `uploadAsset`
 * con progreso real (`uploadBytesResumable`).
 */
export function AssetUploader({
  parentId,
  defaultKind,
  existingAssets,
  onUploaded,
  onCancel,
}: {
  parentId: string;
  defaultKind: AssetKind;
  existingAssets: LevelAsset[];
  onUploaded: (asset: LevelAsset) => void;
  onCancel?: () => void;
}) {
  const fileInputId = useId();
  const labelInputId = useId();
  const altInputId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [kind, setKind] = useState<AssetKind>(defaultKind);
  const [prepared, setPrepared] = useState<PreparedAssetUpload | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [originalDims, setOriginalDims] = useState<{ width: number; height: number } | null>(null);
  const [label, setLabel] = useState("");
  const [alt, setAlt] = useState("");
  const [status, setStatus] = useState<"idle" | "processing" | "ready" | "uploading" | "error">("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const quota = checkQuota(
    existingAssets.length,
    existingAssets.reduce((sum, a) => sum + a.bytes, 0),
  );

  async function handleFile(file: File) {
    setError(null);
    setPrepared(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);

    const issues = validateFileMeta(file);
    if (issues.length > 0) {
      setStatus("error");
      setError(issues[0].message);
      return;
    }

    setStatus("processing");
    try {
      const result = await prepareUpload(file, kind);
      const grade = gradeResolution(result.originalWidth, result.originalHeight, kind);
      if (grade === "error") {
        setStatus("error");
        setError(`Esta imagen es ${result.originalWidth}×${result.originalHeight}px — muy chica para usarse como ${KIND_LABEL[kind]}. Probá con una más grande.`);
        return;
      }
      setOriginalDims({ width: result.originalWidth, height: result.originalHeight });
      setPrepared(result);
      setPreviewUrl(URL.createObjectURL(result.blob));
      setLabel(sanitizeLabel(file.name));
      setAlt("");
      setStatus("ready");
    } catch (err) {
      console.error("No se pudo procesar la imagen", err);
      setStatus("error");
      setError("No se pudo procesar esta imagen. Probá con otro archivo.");
    }
  }

  async function handleUpload() {
    if (!prepared || alt.trim() === "") return;
    setStatus("uploading");
    setProgress(0);
    setError(null);
    try {
      const { db, firestore, storage, storageFns } = await getAssetServices();
      const asset = await uploadAsset(storageFns, storage, firestore, db, parentId, prepared, { label: label.trim(), alt: alt.trim() }, setProgress);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPrepared(null);
      setPreviewUrl(null);
      setStatus("idle");
      if (fileInputRef.current) fileInputRef.current.value = "";
      onUploaded(asset);
    } catch (err) {
      console.error("No se pudo subir la imagen", err);
      setStatus("error");
      setError("No se pudo subir la imagen. Revisá tu conexión e intentá de nuevo.");
    }
  }

  const grade = originalDims ? gradeResolution(originalDims.width, originalDims.height, kind) : null;

  return (
    <div className="space-y-3 rounded-lg border border-indigo-500/20 bg-slate-900/50 p-3 text-xs">
      <div className="flex items-center gap-2">
        <UploadCloud className="size-4 shrink-0 text-cyan-300" aria-hidden="true" />
        <h3 className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Subir imagen</h3>
      </div>

      {!quota.allowed ? (
        <p role="alert" className="text-rose-300">
          {quota.reason}
        </p>
      ) : (
        <>
          {quota.reason && (
            <p role="status" className="text-amber-300">
              {quota.reason}
            </p>
          )}

          <fieldset className="flex flex-wrap gap-4">
            <legend className="sr-only">Tipo de imagen</legend>
            {(Object.keys(KIND_RADIO_LABEL) as AssetKind[]).map((k) => (
              <label key={k} className="flex items-center gap-1.5 text-slate-200">
                <input type="radio" name="asset-kind" checked={kind === k} onChange={() => setKind(k)} disabled={status === "uploading"} />
                {KIND_RADIO_LABEL[k]}
              </label>
            ))}
          </fieldset>

          <label className="block">
            <span className={LABEL_CLASS} id={`${fileInputId}-label`}>
              Archivo (WebP, PNG o JPEG)
            </span>
            <input
              ref={fileInputRef}
              id={fileInputId}
              type="file"
              accept="image/webp,image/png,image/jpeg"
              aria-labelledby={`${fileInputId}-label`}
              disabled={status === "processing" || status === "uploading"}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleFile(file);
              }}
              className={INPUT_CLASS}
            />
          </label>

          {status === "processing" && (
            <p role="status" className="text-slate-400">
              Procesando imagen…
            </p>
          )}

          {error && (
            <p role="alert" className="text-rose-300">
              {error}
            </p>
          )}

          {prepared && previewUrl && (status === "ready" || status === "uploading") && (
            <div className="space-y-2 border-t border-indigo-500/10 pt-2">
              {/* eslint-disable-next-line @next/next/no-img-element -- previsualización local de un blob recién procesado, nunca una URL remota */}
              <img src={previewUrl} alt="" aria-hidden="true" className="h-24 w-full rounded-md object-cover" />

              {grade === "warning" && (
                <p role="status" className="flex items-center gap-1 text-amber-300">
                  ⚠ {originalDims!.width}×{originalDims!.height}px — se ve mejor con al menos {RESOLUTION_THRESHOLDS[kind].recommendedWidth}px de ancho, pero se puede usar igual.
                </p>
              )}
              {kind === "layer" && !prepared.hasAlpha && (
                <p role="status" className="flex items-center gap-1 text-slate-400">
                  ℹ Esta imagen es opaca: tapará lo que haya detrás. Para un efecto de parallax suele convenir un PNG/WebP con fondo transparente.
                </p>
              )}
              {kind === "avatar" && !prepared.hasAlpha && (
                <p role="status" className="flex items-center gap-1 text-amber-300">
                  ⚠ Esta imagen es opaca: se va a ver con un fondo rectangular en vez de recortada. Para un avatar conviene un PNG/WebP con transparencia.
                </p>
              )}

              <label className="block">
                <span className={LABEL_CLASS}>Nombre</span>
                <input id={labelInputId} type="text" value={label} onChange={(e) => setLabel(e.target.value)} disabled={status === "uploading"} className={INPUT_CLASS} />
              </label>
              <label className="block">
                <span className={LABEL_CLASS}>Descripción (para lectores de pantalla)</span>
                <input
                  id={altInputId}
                  type="text"
                  required
                  value={alt}
                  onChange={(e) => setAlt(e.target.value)}
                  disabled={status === "uploading"}
                  placeholder="Ej: bosque con niebla al atardecer"
                  className={INPUT_CLASS}
                />
              </label>

              {status === "uploading" && (
                <div role="status" className="flex items-center gap-2">
                  <progress value={progress} max={1} className="h-2 flex-1" />
                  <span>{Math.round(progress * 100)}%</span>
                </div>
              )}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => void handleUpload()}
                  disabled={status === "uploading" || alt.trim() === ""}
                  className="flex min-h-9 items-center rounded-md bg-gradient-to-r from-violet-600 to-fuchsia-600 px-3 font-bold text-white disabled:opacity-40"
                >
                  {status === "uploading" ? "Subiendo…" : "Subir"}
                </button>
                {onCancel && (
                  <button type="button" onClick={onCancel} disabled={status === "uploading"} className="rounded-md px-3 font-bold text-slate-300 hover:bg-slate-800">
                    Cancelar
                  </button>
                )}
              </div>
            </div>
          )}

          <p className="text-[10px] text-slate-400">Las imágenes que subas quedan asociadas a tu cuenta. No subas fotos de personas ni información personal.</p>
        </>
      )}
    </div>
  );
}
