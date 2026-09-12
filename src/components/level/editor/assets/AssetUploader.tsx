"use client";

import { useId, useRef, useState } from "react";
import { Image as ImageIcon, Mountain, UploadCloud, UserRound } from "lucide-react";
import { prepareUpload } from "@/lib/level/assets/imageProcessing";
import { checkQuota, gradeResolution, RESOLUTION_THRESHOLDS, sanitizeLabel, validateFileMeta, type AssetKind, type PreparedAssetUpload } from "@/lib/level/assets/imageRules";
import { uploadAsset, type LevelAsset } from "@/lib/level/assets/assetRepository";
import { getAssetServices } from "./useLevelAssets";

const LABEL_CLASS = "mb-1 block text-[11px] font-bold text-slate-400";
const INPUT_CLASS = "w-full rounded-md border border-indigo-500/20 bg-slate-950/60 px-2 py-1.5 text-slate-100 outline-none focus:border-cyan-400/50";

const KIND_LABEL: Record<AssetKind, string> = { scene: "fondo de escena", layer: "capa", avatar: "avatar" };
const KIND_RADIO_LABEL: Record<AssetKind, string> = { scene: "Fondo de escena completa", layer: "Capa de parallax", avatar: "Avatar de personaje" };

/**
 * Copy explicativo por tipo — a pedido del usuario ("qué tipo de imagen se
 * debe subir en cada opción, tamaño, cuál sería el resultado final"): antes
 * de esta fase las 3 opciones eran solo una etiqueta sin contexto. `icon` +
 * `KindPreview` dan una idea visual rápida del resultado sin necesitar fotos
 * de ejemplo reales (ninguna imagen de stock vive en el repo).
 */
const KIND_INFO: Record<AssetKind, { icon: typeof ImageIcon; description: string; shape: string }> = {
  scene: {
    icon: ImageIcon,
    description: "Llena toda la pantalla del nivel, de punta a punta. Usá una escena horizontal (paisaje, interior, etc.) — se recorta para cubrir el área jugable, así que evitá detalles importantes muy pegados a los bordes.",
    shape: `Panorámica (ancho > alto). Ideal: ${RESOLUTION_THRESHOLDS.scene.recommendedWidth}px de ancho o más.`,
  },
  layer: {
    icon: Mountain,
    description: "Una franja decorativa (nubes, montañas lejanas, un horizonte) que se desliza a otra velocidad que la cámara, detrás o delante del fondo principal — nunca lo reemplaza. Con fondo transparente (PNG/WebP) deja ver lo que hay detrás.",
    shape: `Tira ancha y baja (mucho más ancha que alta). Ideal: ${RESOLUTION_THRESHOLDS.layer.recommendedWidth}px de ancho o más.`,
  },
  avatar: {
    icon: UserRound,
    description: "El personaje jugable: retrato o cuerpo entero. Se recorta en redondo, así que centrá la figura y usá fondo transparente (PNG/WebP) — con fondo opaco se ve un cuadrado en vez de un círculo.",
    shape: `Cuadrada (ancho = alto). Ideal: ${RESOLUTION_THRESHOLDS.avatar.recommendedWidth}px de ancho o más.`,
  },
};

/** Miniatura de cómo queda cada tipo una vez en el nivel — puro CSS, sin
 *  imagen de ejemplo real. Se usa en el paso 1 (elegir tipo), antes de que
 *  exista ningún archivo con el que armar la vista previa real. */
function KindPreview({ kind }: { kind: AssetKind }) {
  if (kind === "scene") {
    return <div className="h-12 w-20 shrink-0 rounded-md bg-gradient-to-br from-cyan-500/40 to-indigo-500/40" aria-hidden="true" />;
  }
  if (kind === "layer") {
    return (
      <div className="flex h-12 w-20 shrink-0 flex-col justify-center gap-1 rounded-md bg-slate-800/60 p-1.5" aria-hidden="true">
        <div className="h-2.5 w-full rounded-sm bg-cyan-500/40" />
        <div className="h-2.5 w-2/3 rounded-sm bg-indigo-500/30" />
      </div>
    );
  }
  return (
    <div className="flex h-12 w-20 shrink-0 items-center justify-center rounded-md bg-slate-800/60" aria-hidden="true">
      <div className="size-9 rounded-full bg-gradient-to-br from-cyan-500/40 to-indigo-500/40" />
    </div>
  );
}

/**
 * Vista previa "en vivo" del paso 3 — a pedido del usuario ("si hubiesen
 * imágenes de cómo quedaría sería ideal"). En vez de fotos de stock
 * genéricas (que habría que conseguir/mantener), compone la imagen que el
 * autor acaba de elegir tal como se va a recortar/usar de verdad: fondo
 * completo, franja de parallax sobre un cielo neutro, o avatar recortado en
 * círculo junto a un globo de diálogo de muestra.
 */
function LivePreview({ kind, src }: { kind: AssetKind; src: string }) {
  if (kind === "avatar") {
    return (
      <div className="flex items-center gap-3 rounded-lg bg-slate-950/60 p-3">
        {/* eslint-disable-next-line @next/next/no-img-element -- previsualización local de un blob recién procesado, nunca una URL remota */}
        <img src={src} alt="" aria-hidden="true" className="size-16 shrink-0 rounded-full border-2 border-cyan-400/40 object-cover" />
        <div className="rounded-xl bg-slate-800/80 px-2.5 py-1.5 text-slate-200">¡Hola! 👋</div>
      </div>
    );
  }
  if (kind === "layer") {
    return (
      <div className="relative aspect-video overflow-hidden rounded-lg bg-gradient-to-b from-indigo-950 to-slate-900">
        {/* eslint-disable-next-line @next/next/no-img-element -- previsualización local de un blob recién procesado, nunca una URL remota */}
        <img src={src} alt="" aria-hidden="true" className="absolute inset-x-0 top-[45%] h-[35%] w-full object-cover opacity-90" />
      </div>
    );
  }
  return (
    <div className="relative aspect-video overflow-hidden rounded-lg bg-slate-950">
      {/* eslint-disable-next-line @next/next/no-img-element -- previsualización local de un blob recién procesado, nunca una URL remota */}
      <img src={src} alt="" aria-hidden="true" className="absolute inset-0 size-full object-cover" />
    </div>
  );
}

type Step = "kind" | "file" | "preview";
const STEP_LABEL: Record<Step, string> = { kind: "Tipo", file: "Archivo", preview: "Confirmar" };
const STEP_NUMBER: Record<Step, number> = { kind: 1, file: 2, preview: 3 };

/**
 * Subir una imagen a la biblioteca del padre — docs/asset-management-plan.md
 * §D/§E.2/§G Paso 6. Asistente de 3 pasos (a pedido del usuario: "sería aún
 * mejor un asistente que guíe al usuario"): elegir tipo → elegir archivo
 * (`validateFileMeta` + `prepareUpload`, que decodifica/redimensiona/detecta
 * alfa y aplica `gradeResolution` sobre las dimensiones ORIGINALES) →
 * confirmar con vista previa real, nombre/alt y `uploadAsset` con progreso
 * (`uploadBytesResumable`).
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

  const [step, setStep] = useState<Step>("kind");
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

  function resetSelection() {
    setError(null);
    setPrepared(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setOriginalDims(null);
    setStatus("idle");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleFile(file: File) {
    resetSelection();

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
      setStep("preview");
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
  const kindInfo = KIND_INFO[kind];
  const KindIcon = kindInfo.icon;
  const busy = status === "uploading";

  return (
    <div className="@container space-y-3 rounded-lg border border-indigo-500/20 bg-slate-900/50 p-3 text-xs">
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

          <p className="text-[10px] font-bold uppercase tracking-widest text-cyan-300">
            Paso {STEP_NUMBER[step]} de 3 · {STEP_LABEL[step]}
          </p>

          {step === "kind" && (
            <fieldset>
              <legend className="mb-2 block text-slate-300">¿Qué vas a subir?</legend>
              {/* `@lg:` (container, no `sm:` de viewport) — reporte del usuario
                  ("los textos se ven montados"): este mismo `AssetUploader`
                  también se embebe angosto dentro de DepthPanel (imagen de
                  una capa de parallax), y `sm:` mide el ancho de la VENTANA,
                  no el de ese panel — en una ventana ancha forzaba 3 columnas
                  apretadas en ~300px aunque el panel fuera angosto. `@lg`
                  mide el contenedor real (`@container` en el div raíz de
                  este componente, arriba), así que se apila en 1 columna ahí
                  y sigue en 3 en el formulario ancho de "Nuevo nivel". */}
              <div className="grid gap-2 @lg:grid-cols-3">
                {(Object.keys(KIND_RADIO_LABEL) as AssetKind[]).map((k) => {
                  const info = KIND_INFO[k];
                  const Icon = info.icon;
                  return (
                    <button
                      key={k}
                      type="button"
                      onClick={() => {
                        setKind(k);
                        setStep("file");
                      }}
                      className="flex flex-col items-center gap-2 rounded-lg border border-indigo-500/20 bg-slate-950/40 p-3 text-center hover:border-cyan-400/50 hover:bg-slate-900"
                    >
                      <KindPreview kind={k} />
                      <span className="flex items-center gap-1.5 font-bold text-slate-200">
                        <Icon className="size-3.5 shrink-0 text-cyan-300" aria-hidden="true" />
                        {KIND_RADIO_LABEL[k]}
                      </span>
                      <span className="text-slate-400">{info.description}</span>
                    </button>
                  );
                })}
              </div>
            </fieldset>
          )}

          {step === "file" && (
            <div className="space-y-2">
              <button type="button" onClick={() => setStep("kind")} disabled={busy} className="font-bold text-cyan-300 hover:underline disabled:opacity-40">
                ← Cambiar tipo
              </button>

              <div className="flex items-center gap-2 rounded-md border border-indigo-500/15 bg-slate-950/40 p-2">
                <KindIcon className="size-4 shrink-0 text-cyan-300" aria-hidden="true" />
                <div>
                  <p className="font-bold text-slate-200">{KIND_RADIO_LABEL[kind]}</p>
                  <p className="text-slate-400">{kindInfo.shape}</p>
                </div>
              </div>

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
                  disabled={status === "processing"}
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
            </div>
          )}

          {step === "preview" && prepared && previewUrl && (
            <div className="space-y-2">
              <button type="button" onClick={() => { resetSelection(); setStep("file"); }} disabled={busy} className="font-bold text-cyan-300 hover:underline disabled:opacity-40">
                ← Cambiar imagen
              </button>

              <p className="text-slate-300">Así se va a ver:</p>
              <LivePreview kind={kind} src={previewUrl} />

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
                <input id={labelInputId} type="text" value={label} onChange={(e) => setLabel(e.target.value)} disabled={busy} className={INPUT_CLASS} />
              </label>
              <label className="block">
                <span className={LABEL_CLASS}>Descripción (para lectores de pantalla)</span>
                <input
                  id={altInputId}
                  type="text"
                  required
                  value={alt}
                  onChange={(e) => setAlt(e.target.value)}
                  disabled={busy}
                  placeholder="Ej: bosque con niebla al atardecer"
                  className={INPUT_CLASS}
                />
              </label>

              {busy && (
                <div role="status" className="flex items-center gap-2">
                  <progress value={progress} max={1} className="h-2 flex-1" />
                  <span>{Math.round(progress * 100)}%</span>
                </div>
              )}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => void handleUpload()}
                  disabled={busy || alt.trim() === ""}
                  className="flex min-h-9 items-center rounded-md bg-gradient-to-r from-violet-600 to-fuchsia-600 px-3 font-bold text-white disabled:opacity-40"
                >
                  {busy ? "Subiendo…" : "Subir"}
                </button>
                {onCancel && (
                  <button type="button" onClick={onCancel} disabled={busy} className="rounded-md px-3 font-bold text-slate-300 hover:bg-slate-800">
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
