"use client";

import { TARGET_OUTPUT_BYTES, decideResize, pickOutputFormat, type AssetKind, type PreparedAssetUpload } from "./imageRules";

/**
 * Todo lo que necesita DOM/Canvas para preparar una imagen antes de subirla
 * — docs/asset-management-plan.md §B.5/§D/§G Paso 5. Cero dependencias:
 * `createImageBitmap` + `<canvas>` nativos alcanzan para decodificar,
 * redimensionar, detectar transparencia, elegir formato de salida y generar
 * la miniatura. La lógica de decisión (umbrales, formato, tamaños) vive en
 * `imageRules.ts`, sin DOM — este archivo solo ejecuta esas decisiones.
 */

const THUMB_WIDTH = 320;
const QUALITY_STEPS = [0.85, 0.75, 0.65];
const ACCEPTED_TYPE_SET = new Set(["image/webp", "image/png", "image/jpeg"]);

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error(`No se pudo codificar la imagen como "${type}".`))),
      type,
      quality,
    );
  });
}

function drawToCanvas(source: CanvasImageSource, width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No se pudo obtener un contexto 2D de canvas.");
  ctx.drawImage(source, 0, 0, width, height);
  return canvas;
}

/** Dibuja `source` a 64×64 y recorre `getImageData` en pasos de 4 buscando
 *  un byte de alfa < 250 — una sola pasada de 4096 píxeles, microsegundos. */
function detectAlpha(source: CanvasImageSource): boolean {
  const probe = drawToCanvas(source, 64, 64);
  const ctx = probe.getContext("2d");
  if (!ctx) return false;
  const { data } = ctx.getImageData(0, 0, 64, 64);
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] < 250) return true;
  }
  return false;
}

/** Codifica `canvas` en el `type` dado, bajando la calidad en pasos hasta
 *  alcanzar `TARGET_OUTPUT_BYTES` o agotar los pasos (PNG es sin pérdida:
 *  un solo intento, el parámetro de calidad no aplica). Devuelve el blob
 *  más chico conseguido, nunca el original sin intentar. */
async function encodeWithTarget(canvas: HTMLCanvasElement, type: string): Promise<Blob> {
  if (type === "image/png") return canvasToBlob(canvas, type);
  let best: Blob | null = null;
  for (const quality of QUALITY_STEPS) {
    const blob = await canvasToBlob(canvas, type, quality);
    if (!best || blob.size < best.size) best = blob;
    if (blob.size <= TARGET_OUTPUT_BYTES) return blob;
  }
  return best!;
}

/**
 * Decodifica `file`, mide sus dimensiones originales, lo redimensiona a
 * `MAX_OUTPUT_WIDTH` si hace falta (nunca amplía), detecta transparencia,
 * elige el formato de salida real (probando si el navegador sabe codificar
 * WebP) y genera la miniatura de `THUMB_WIDTH` — todo en una sola pasada de
 * decodificación. Si el resultado recodificado pesa más que el archivo
 * original y no hubo cambio de dimensiones, sube el original tal cual
 * (§B.5) en vez de un archivo "optimizado" que en realidad pesa más.
 */
export async function prepareUpload(file: File, kind: AssetKind): Promise<PreparedAssetUpload> {
  const original = await createImageBitmap(file);
  const originalWidth = original.width;
  const originalHeight = original.height;
  const target = decideResize(originalWidth, originalHeight);
  const resized = target.width === originalWidth && target.height === originalHeight;

  const mainCanvas = drawToCanvas(original, target.width, target.height);
  const hasAlpha = detectAlpha(original);
  original.close();

  // Se prueba UNA vez si el navegador sabe codificar WebP — si no, cae a
  // PNG (con alfa) o JPEG (sin alfa), nunca a JPEG con alfa (la destruiría).
  const probe = await canvasToBlob(mainCanvas, "image/webp", 0.92);
  const webpSupported = probe.type === "image/webp";
  const contentType = pickOutputFormat(hasAlpha, webpSupported);

  let blob = contentType === "image/webp" && probe.size <= TARGET_OUTPUT_BYTES ? probe : await encodeWithTarget(mainCanvas, contentType);

  if (resized && blob.size > file.size && ACCEPTED_TYPE_SET.has(file.type)) {
    blob = file;
  }

  const thumbHeight = Math.round((THUMB_WIDTH / target.width) * target.height);
  const thumbCanvas = drawToCanvas(mainCanvas, THUMB_WIDTH, thumbHeight);
  const thumbBlob = await canvasToBlob(thumbCanvas, "image/webp", 0.8);

  return {
    kind,
    blob,
    thumbBlob,
    contentType: contentType as PreparedAssetUpload["contentType"],
    width: target.width,
    height: target.height,
    originalWidth,
    originalHeight,
    bytes: blob.size,
    hasAlpha,
  };
}
