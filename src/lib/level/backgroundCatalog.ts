/**
 * Fondos disponibles para un nivel nuevo: las 8 regiones de AXIA que ya
 * tienen arte en `public/illustrations/` (docs/guion-narrativa-math-quest.md
 * §18, ver también `src/lib/narrative.ts` para las 5 que ya tienen hilo
 * curricular asociado). Solo nombre + ruta — las dimensiones nativas se
 * miden al elegir el fondo (`loadImageSize`), nunca se hardcodean acá.
 *
 * `usage`/`source` (docs/asset-management-plan.md §A.2/§E.5/§G Paso 10): 6 de
 * estas 8 imágenes son miniaturas de ~300-340px de ancho — pensadas
 * originalmente como tarjetas del selector de zonas del mapa del mundo
 * (`ZoneScene.tsx`/`scenes.ts`/`narrative.ts`, listas independientes de esta
 * — cambiar `usage` acá no las afecta), no como fondos de nivel a pantalla
 * completa. Se degradan (`usage: "thumbnail"`) en vez de ocultarse o
 * borrarse: siguen siendo opciones válidas (un nivel ya creado con una de
 * ellas no debe perder su fondo), solo van agrupadas aparte en
 * `BackgroundPicker` con un aviso de baja resolución.
 */
export interface BackgroundOption {
  src: string;
  label: string;
  alt: string;
  usage: "scene" | "thumbnail";
  source: "factory";
}

export const BACKGROUND_CATALOG: BackgroundOption[] = [
  { src: "/illustrations/city-central.webp", label: "Ciudad Central", alt: "Ciudad Central: plaza con fuente, central eléctrica, tienda, taller y laboratorio.", usage: "scene", source: "factory" },
  { src: "/illustrations/laboratorio-futuro.webp", label: "Laboratorio Futuro", alt: "Laboratorio Futuro: sala de máquinas y variables por descifrar.", usage: "scene", source: "factory" },
  { src: "/illustrations/desierto-geometrico.webp", label: "Desierto Geométrico", alt: "Desierto Geométrico: dunas y formaciones de figuras geométricas.", usage: "thumbnail", source: "factory" },
  { src: "/illustrations/cumbres-numericas.webp", label: "Cumbres Numéricas", alt: "Cumbres Numéricas: montañas nevadas con estaciones de datos.", usage: "thumbnail", source: "factory" },
  { src: "/illustrations/islas-pensamiento.webp", label: "Islas del Pensamiento", alt: "Islas del Pensamiento: archipiélago flotante con enigmas.", usage: "thumbnail", source: "factory" },
  { src: "/illustrations/bosque-patrones.webp", label: "Bosque de los Patrones", alt: "Bosque de los Patrones: vegetación con secuencias repetidas.", usage: "thumbnail", source: "factory" },
  { src: "/illustrations/valle-desafios.webp", label: "Valle de los Desafíos", alt: "Valle de los Desafíos: cañón con pruebas encadenadas.", usage: "thumbnail", source: "factory" },
  { src: "/illustrations/academia-infinita.webp", label: "Academia Infinita", alt: "Academia Infinita: biblioteca y aulas sin fin.", usage: "thumbnail", source: "factory" },
];

/** Mide el tamaño nativo real de una imagen ya publicada — nunca se asume ni
 *  se hardcodea (dos regiones pueden compartir proporción pero no tamaño de
 *  archivo exacto). Solo corre en el navegador. Solo hace falta para los
 *  fondos de fábrica: un asset subido ya trae `width`/`height` medidos en
 *  el momento de procesarlo (`imageProcessing.prepareUpload`). */
export function loadImageSize(src: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => reject(new Error(`No se pudo cargar la imagen "${src}".`));
    img.src = src;
  });
}
