/**
 * Metadatos de ambientación "Math Quest" por hilo curricular — pura
 * presentación, no crea niveles ni afecta el desbloqueo de nada. Los 52
 * módulos y sus prerrequisitos en curriculum.ts siguen siendo la única
 * fuente de verdad sobre progreso.
 */
export interface StrandNarrative {
  zoneName: string;
  tagline: string;
  icon: string;
}

export const STRAND_NARRATIVE: Record<string, StrandNarrative> = {
  aritmetica: {
    zoneName: "Centro de Energía",
    tagline: "Resolver cálculos permite reparar sistemas.",
    icon: "⚡",
  },
  algebra: {
    zoneName: "Laboratorio",
    tagline: "Las variables y ecuaciones permiten descifrar sistemas.",
    icon: "🧪",
  },
  geometria: {
    zoneName: "Zona de Construcción",
    tagline: "Las figuras, medidas y proporciones permiten construir estructuras.",
    icon: "🏗️",
  },
  medicion: {
    zoneName: "Centro de Control",
    tagline: "Analiza información para tomar decisiones.",
    icon: "📡",
  },
  logica: {
    zoneName: "Distrito Misterioso",
    tagline: "Investiga pistas y resuelve problemas.",
    icon: "🕵️",
  },
};

const FALLBACK_NARRATIVE: StrandNarrative = {
  zoneName: "Zona desconocida",
  tagline: "Una nueva aventura por explorar.",
  icon: "🗺️",
};

export function getStrandNarrative(slug: string): StrandNarrative {
  return STRAND_NARRATIVE[slug] ?? FALLBACK_NARRATIVE;
}
