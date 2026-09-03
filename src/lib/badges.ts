import { STRANDS } from "./strands";

/**
 * Catálogo de insignias — solo metadatos para mostrarlas. El otorgamiento
 * ocurre como efecto secundario de eventos reales ya presentes en el código
 * (dominar un módulo, terminar una evaluación, ganar el Cohete, resolver
 * varias seguidas sin pista): ver awardBadge.ts y sus llamadas.
 */
export interface BadgeDef {
  id: string;
  emoji: string;
  label: string;
  description: string;
}

export const BADGES: BadgeDef[] = [
  {
    id: "resolutor",
    emoji: "🧠",
    label: "Resolutor",
    description: "Dominaste tu primer tema en un hilo.",
  },
  {
    id: "rapido",
    emoji: "⚡",
    label: "Rápido",
    description: "Ganaste una misión contrarreloj en el Cohete.",
  },
  {
    id: "detective",
    emoji: "🔍",
    label: "Detective",
    description: "Completaste tu evaluación de ubicación.",
  },
  {
    id: "estratega",
    emoji: "🧩",
    label: "Estratega",
    description: "Resolviste 5 preguntas seguidas sin usar pistas.",
  },
  ...STRANDS.map((s) => ({
    id: `maestro-${s.slug}`,
    emoji: "🏆",
    label: `Maestro de ${s.label}`,
    description: `Dominaste todos los temas de ${s.label}.`,
  })),
];

export function getBadge(id: string): BadgeDef | undefined {
  return BADGES.find((b) => b.id === id);
}
