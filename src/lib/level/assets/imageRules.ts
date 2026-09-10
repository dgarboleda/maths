/**
 * Reglas puras de la biblioteca de imágenes del Level Editor —
 * docs/asset-management-plan.md §C.4/§C.5/§C.6/§E.2. Sin DOM, sin red, sin
 * Firebase: todo lo que necesita decodificar/redimensionar una imagen de
 * verdad vive en `imageProcessing.ts`. Este archivo es lo que se prueba
 * unitariamente sin abrir ninguna página (mismo criterio que `depth.ts`).
 */

/** `"avatar"` — Fase 19 (docs/level-editor-plan-v2.md §6.1): sprite de
 *  personaje jugable (cuerpo entero o retrato). Mismo pipeline de subida que
 *  `scene`/`layer` (Storage, miniatura, cuota); solo cambian los umbrales de
 *  resolución y el aviso de canal alfa (ver `AssetUploader.tsx`). */
export type AssetKind = "scene" | "layer" | "avatar";

export type ResolutionGrade = "error" | "warning" | "ok";

export interface ResolutionThresholds {
  minWidth: number;
  minHeight: number;
  recommendedWidth: number;
}

/** docs/asset-management-plan.md §C.5. Una franja de horizonte (`layer`) es
 *  legítimamente baja de alto — nunca se le exige lo mismo que a una escena
 *  completa (`scene`), que llena la pantalla entera. Un `avatar` es un
 *  sprite recortado (cuerpo o retrato), casi cuadrado, mucho más chico que
 *  cualquiera de los dos. */
export const RESOLUTION_THRESHOLDS: Record<AssetKind, ResolutionThresholds> = {
  scene: { minWidth: 800, minHeight: 450, recommendedWidth: 1600 },
  layer: { minWidth: 480, minHeight: 120, recommendedWidth: 1200 },
  avatar: { minWidth: 128, minHeight: 128, recommendedWidth: 512 },
};

/** Ancho máximo al que se redimensiona en cliente antes de subir — igual
 *  para ambos `kind` (§C.5). Nunca se AMPLÍA una imagen más chica. */
export const MAX_OUTPUT_WIDTH = 2560;

/** Peso objetivo tras procesar (se alcanza bajando calidad WebP en pasos,
 *  ver `imageProcessing.ts`) — no es un límite duro, es la meta. */
export const TARGET_OUTPUT_BYTES = 400 * 1024;

/** Peso máximo del ARCHIVO DE ENTRADA, antes de decodificar nada — evita
 *  colgar una tablet de gama baja intentando decodificar un RAW de 60MB. */
export const MAX_INPUT_BYTES = 12 * 1024 * 1024;

/** Techo duro que también aplican las Storage Rules (§F.1) — el respaldo de
 *  servidor de `TARGET_OUTPUT_BYTES`, no su implementación. */
export const MAX_STORAGE_BYTES = 4 * 1024 * 1024;

export const ACCEPTED_CONTENT_TYPES = ["image/webp", "image/png", "image/jpeg"] as const;
export type AcceptedContentType = (typeof ACCEPTED_CONTENT_TYPES)[number];

export const MAX_ASSETS_PER_PARENT = 40;
export const RECOMMENDED_TOTAL_BYTES_PER_PARENT = 30 * 1024 * 1024;

export interface FileMetaIssue {
  severity: "error";
  message: string;
}

/** Valida el archivo ANTES de decodificar nada (nombre/tipo/tamaño). No
 *  lanza — devuelve la lista de problemas, vacía si está todo bien, mismo
 *  criterio que `validateLevel`. */
export function validateFileMeta(file: { name: string; type: string; size: number }): FileMetaIssue[] {
  const issues: FileMetaIssue[] = [];
  if (!ACCEPTED_CONTENT_TYPES.includes(file.type as AcceptedContentType)) {
    issues.push({ severity: "error", message: `Formato no admitido ("${file.type || "desconocido"}"). Usá WebP, PNG o JPEG.` });
  }
  if (file.size <= 0) {
    issues.push({ severity: "error", message: "El archivo está vacío." });
  } else if (file.size > MAX_INPUT_BYTES) {
    issues.push({ severity: "error", message: `El archivo pesa ${(file.size / (1024 * 1024)).toFixed(1)}MB — el máximo de entrada es ${MAX_INPUT_BYTES / (1024 * 1024)}MB.` });
  }
  return issues;
}

/** `error` (se rechaza), `warning` (se sube igual, con aviso persistente) u
 *  `ok`, según los umbrales de §C.5 para el `kind` declarado por el autor. */
export function gradeResolution(width: number, height: number, kind: AssetKind): ResolutionGrade {
  const t = RESOLUTION_THRESHOLDS[kind];
  if (width < t.minWidth || height < t.minHeight) return "error";
  if (width < t.recommendedWidth) return "warning";
  return "ok";
}

/** Dimensiones objetivo tras el redimensionado — nunca amplía (si ya es más
 *  chica que `MAX_OUTPUT_WIDTH`, se devuelve tal cual), preserva la relación
 *  de aspecto exacta redondeando el alto. */
export function decideResize(width: number, height: number): { width: number; height: number } {
  if (width <= MAX_OUTPUT_WIDTH) return { width, height };
  const scale = MAX_OUTPUT_WIDTH / width;
  return { width: MAX_OUTPUT_WIDTH, height: Math.round(height * scale) };
}

/** Formato de salida — nunca JPEG si la imagen tiene canal alfa (lo
 *  destruiría). Con alfa: WebP si el navegador lo soportó al recodificar,
 *  si no PNG. Sin alfa: WebP si se pudo, si no JPEG. `webpSupported` lo mide
 *  `imageProcessing.ts` intentando `canvas.toBlob("image/webp")` una vez. */
export function pickOutputFormat(hasAlpha: boolean, webpSupported: boolean): AcceptedContentType {
  if (hasAlpha) return webpSupported ? "image/webp" : "image/png";
  return webpSupported ? "image/webp" : "image/jpeg";
}

const EXT_BY_CONTENT_TYPE: Record<AcceptedContentType, string> = {
  "image/webp": "webp",
  "image/png": "png",
  "image/jpeg": "jpg",
};

export function extensionForContentType(contentType: AcceptedContentType): string {
  return EXT_BY_CONTENT_TYPE[contentType];
}

/** Un solo segmento de ruta bajo `level-assets/` — storage.rules cubre
 *  ambos (imagen y miniatura) con una sola regla `match` (§C.1). */
export function assetStoragePath(parentId: string, assetId: string, contentType: AcceptedContentType): string {
  return `parents/${parentId}/level-assets/${assetId}.${extensionForContentType(contentType)}`;
}

/** La miniatura siempre es WebP — es generada por el propio cliente, nunca
 *  viene del archivo original, así que no hay ningún fallback que decidir. */
export function thumbStoragePath(parentId: string, assetId: string): string {
  return `parents/${parentId}/level-assets/${assetId}-thumb.webp`;
}

export interface QuotaCheck {
  allowed: boolean;
  reason?: string;
}

/** Guarda de UX, NO una frontera de seguridad — Storage Rules no puede
 *  contar documentos, así que esto es puramente para evitar que la
 *  biblioteca de un padre crezca sin límite práctico (§C.6). */
export function checkQuota(currentAssetCount: number, currentTotalBytes: number): QuotaCheck {
  if (currentAssetCount >= MAX_ASSETS_PER_PARENT) {
    return { allowed: false, reason: `Llegaste al máximo de ${MAX_ASSETS_PER_PARENT} imágenes. Borrá alguna que ya no uses para subir una nueva.` };
  }
  if (currentTotalBytes >= RECOMMENDED_TOTAL_BYTES_PER_PARENT) {
    return { allowed: true, reason: `Tu biblioteca ya pesa ${(currentTotalBytes / (1024 * 1024)).toFixed(1)}MB — considerá borrar imágenes que ya no uses.` };
  }
  return { allowed: true };
}

/**
 * Salida de `imageProcessing.prepareUpload` (Paso 5) — todo lo que
 * `assetRepository.uploadAsset` (Paso 4) necesita para subir un asset, ya
 * decidido y medido en el cliente. Es una interfaz puramente de datos (sin
 * lógica), así que vive acá y no en `imageProcessing.ts`, para que
 * `assetRepository.ts` pueda importarla sin arrastrar nada de DOM/Canvas.
 */
export interface PreparedAssetUpload {
  kind: AssetKind;
  blob: Blob;
  thumbBlob: Blob;
  contentType: AcceptedContentType;
  width: number;
  height: number;
  originalWidth: number;
  originalHeight: number;
  bytes: number;
  hasAlpha: boolean;
}

/** Etiqueta por defecto a partir del nombre de archivo: sin extensión,
 *  espacios colapsados, recortada a 60 caracteres, nunca vacía. */
export function sanitizeLabel(filename: string): string {
  const withoutExt = filename.replace(/\.[^./\\]+$/, "");
  const collapsed = withoutExt.replace(/[\s_-]+/g, " ").trim();
  const label = collapsed.slice(0, 60);
  return label || "Imagen sin nombre";
}
