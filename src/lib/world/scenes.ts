import { modulesForStrand, type ModuleDef } from "@/lib/curriculum";
import { getStrandNarrative } from "@/lib/narrative";
import { STRANDS } from "@/lib/strands";

/**
 * Capa de metadatos narrativos sobre los módulos que ya existen. No define
 * contenido académico nuevo: cada objeto del mundo apunta a un `moduleId`
 * real, y el problema sale de `mod.generateProblem()` cuando el jugador
 * interactúa. Cambiar esta capa entera no toca la currícula.
 */
export type InteractionKind = "terminal" | "puerta" | "objeto" | "npc" | "mecanismo";

export interface Interactable {
  /** Igual al moduleId: el módulo sigue siendo la autoridad, no hay ids paralelos. */
  id: string;
  moduleId: string;
  kind: InteractionKind;
  /** Cómo se llama el objeto dentro del mundo. */
  label: string;
  /** Qué se ve al acercarse, antes de resolver nada. */
  clue: string;
  /** Qué pasa en el mundo al resolverlo. */
  reward: string;
  /** Posición dentro de la escena, en porcentaje del lienzo. */
  x: number;
  y: number;
}

export interface ZoneScene {
  strandSlug: string;
  /** Nombre narrativo de la zona ("Centro de Energía"). */
  zoneName: string;
  /** Nombre académico del hilo ("Aritmética"). */
  strandLabel: string;
  tagline: string;
  icon: string;
  interactables: Interactable[];
}

export const KIND_ICON: Record<InteractionKind, string> = {
  terminal: "🖥️",
  puerta: "🚪",
  objeto: "📦",
  npc: "🧑‍🔧",
  mecanismo: "⚙️",
};

export const KIND_NOUN: Record<InteractionKind, string> = {
  terminal: "Terminal",
  puerta: "Puerta",
  objeto: "Cofre",
  npc: "Técnico",
  mecanismo: "Mecanismo",
};

/** Cada objeto de la zona toma un tipo distinto, para que la zona no se sienta uniforme. */
const KIND_CYCLE: InteractionKind[] = ["terminal", "puerta", "objeto", "npc", "mecanismo"];

function clueFor(kind: InteractionKind, mod: ModuleDef, zoneName: string): string {
  switch (kind) {
    case "terminal":
      return `La consola de ${zoneName} pide una verificación antes de dar acceso.`;
    case "puerta":
      return `El panel de la puerta está esperando la cifra correcta para abrirse.`;
    case "objeto":
      return `El cofre tiene un cierre numérico. Alguien anotó el procedimiento al lado.`;
    case "npc":
      return `—Si me ayudas con esta cuenta, te digo lo que vi anoche.`;
    default:
      return `El mecanismo gira si le das la medida exacta.`;
  }
}

function rewardFor(kind: InteractionKind, zoneName: string): string {
  switch (kind) {
    case "terminal":
      return "ACCESO CONCEDIDO. La consola se ilumina y libera el siguiente tramo.";
    case "puerta":
      return "El cerrojo cede y la puerta se abre con un golpe seco.";
    case "objeto":
      return "El cofre se abre: dentro hay repuestos y una nota con otra pista.";
    case "npc":
      return "—Gracias. Anoche vi a alguien entrar por el túnel de servicio…";
    default:
      return `El mecanismo encaja y algo se pone en marcha en ${zoneName}.`;
  }
}

function labelFor(kind: InteractionKind, mod: ModuleDef): string {
  return `${KIND_NOUN[kind]} · ${mod.label}`;
}

/** Serpentina: dos columnas que van bajando, para que se lea como un recorrido. */
function positionFor(index: number): { x: number; y: number } {
  const row = Math.floor(index / 2);
  const leftColumn = index % 2 === 0;
  return {
    x: leftColumn ? 26 : 68,
    y: 12 + row * 15.5,
  };
}

export function zoneScene(strandSlug: string): ZoneScene | null {
  const strand = STRANDS.find((s) => s.slug === strandSlug);
  if (!strand) return null;
  const narrative = getStrandNarrative(strandSlug);
  const modules = modulesForStrand(strandSlug);

  return {
    strandSlug,
    zoneName: narrative.zoneName,
    strandLabel: strand.label,
    tagline: narrative.tagline,
    icon: narrative.icon,
    interactables: modules.map((mod, i) => {
      const kind = KIND_CYCLE[i % KIND_CYCLE.length];
      return {
        id: mod.id,
        moduleId: mod.id,
        kind,
        label: labelFor(kind, mod),
        clue: clueFor(kind, mod, narrative.zoneName),
        reward: rewardFor(kind, narrative.zoneName),
        ...positionFor(i),
      };
    }),
  };
}
