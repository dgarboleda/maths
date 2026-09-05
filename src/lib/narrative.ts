/**
 * Metadatos de ambientación "Math Quest" por hilo curricular — pura
 * presentación, no crea niveles ni afecta el desbloqueo de nada. Los 52
 * módulos y sus prerrequisitos en curriculum.ts siguen siendo la única
 * fuente de verdad sobre progreso.
 *
 * Los nombres de zona, tagline y fondo siguen el mapeo de regiones del guion
 * maestro (docs/guion-narrativa-math-quest.md §18): cada hilo curricular
 * ocupa una de las 8 regiones de AXIA. Bosque de los Patrones, Valle de los
 * Desafíos y Academia Infinita quedan sin hilo asociado por ahora — su arte
 * ya existe en public/illustrations/ para cuando se abran nuevas zonas.
 */
export interface StrandNarrative {
  zoneName: string;
  tagline: string;
  icon: string;
  /** Ilustración de fondo de la región, en public/illustrations/. */
  background: string;
}

export const STRAND_NARRATIVE: Record<string, StrandNarrative> = {
  aritmetica: {
    zoneName: "Ciudad Central",
    tagline: "Resolver cálculos genera AXIA y despierta la ciudad dormida.",
    icon: "⚡",
    background: "/illustrations/city-central.webp",
  },
  algebra: {
    zoneName: "Laboratorio Futuro",
    tagline: "Las variables y ecuaciones permiten descifrar los sistemas antiguos.",
    icon: "🧪",
    background: "/illustrations/laboratorio-futuro.webp",
  },
  geometria: {
    zoneName: "Desierto Geométrico",
    tagline: "Las figuras, medidas y proporciones permiten reconstruir el espacio.",
    icon: "🏜️",
    background: "/illustrations/desierto-geometrico.webp",
  },
  medicion: {
    zoneName: "Cumbres Numéricas",
    tagline: "Analizar datos permite estabilizar los sistemas de las cumbres.",
    icon: "🏔️",
    background: "/illustrations/cumbres-numericas.webp",
  },
  logica: {
    zoneName: "Islas del Pensamiento",
    tagline: "El razonamiento permite resolver los enigmas de las islas.",
    icon: "🧩",
    background: "/illustrations/islas-pensamiento.webp",
  },
};

const FALLBACK_NARRATIVE: StrandNarrative = {
  zoneName: "Zona desconocida",
  tagline: "Una nueva aventura por explorar.",
  icon: "🗺️",
  background: "/illustrations/city-central.webp",
};

export function getStrandNarrative(slug: string): StrandNarrative {
  return STRAND_NARRATIVE[slug] ?? FALLBACK_NARRATIVE;
}
