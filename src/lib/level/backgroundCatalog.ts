/**
 * Fondos disponibles para un nivel nuevo: las 8 regiones de AXIA que ya
 * tienen arte en `public/illustrations/` (docs/guion-narrativa-math-quest.md
 * §18, ver también `src/lib/narrative.ts` para las 5 que ya tienen hilo
 * curricular asociado). Solo nombre + ruta — las dimensiones nativas se
 * miden al elegir el fondo (`loadImageSize`), nunca se hardcodean acá.
 */
export interface BackgroundOption {
  src: string;
  label: string;
  alt: string;
}

export const BACKGROUND_CATALOG: BackgroundOption[] = [
  { src: "/illustrations/city-central.webp", label: "Ciudad Central", alt: "Ciudad Central: plaza con fuente, central eléctrica, tienda, taller y laboratorio." },
  { src: "/illustrations/laboratorio-futuro.webp", label: "Laboratorio Futuro", alt: "Laboratorio Futuro: sala de máquinas y variables por descifrar." },
  { src: "/illustrations/desierto-geometrico.webp", label: "Desierto Geométrico", alt: "Desierto Geométrico: dunas y formaciones de figuras geométricas." },
  { src: "/illustrations/cumbres-numericas.webp", label: "Cumbres Numéricas", alt: "Cumbres Numéricas: montañas nevadas con estaciones de datos." },
  { src: "/illustrations/islas-pensamiento.webp", label: "Islas del Pensamiento", alt: "Islas del Pensamiento: archipiélago flotante con enigmas." },
  { src: "/illustrations/bosque-patrones.webp", label: "Bosque de los Patrones", alt: "Bosque de los Patrones: vegetación con secuencias repetidas." },
  { src: "/illustrations/valle-desafios.webp", label: "Valle de los Desafíos", alt: "Valle de los Desafíos: cañón con pruebas encadenadas." },
  { src: "/illustrations/academia-infinita.webp", label: "Academia Infinita", alt: "Academia Infinita: biblioteca y aulas sin fin." },
];

/** Mide el tamaño nativo real de una imagen ya publicada — nunca se asume ni
 *  se hardcodea (dos regiones pueden compartir proporción pero no tamaño de
 *  archivo exacto). Solo corre en el navegador. */
export function loadImageSize(src: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => reject(new Error(`No se pudo cargar la imagen "${src}".`));
    img.src = src;
  });
}
