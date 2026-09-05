import { getModule, isUnlocked, missingPrerequisites } from "@/lib/curriculum";
import type { SkillProgress } from "@/lib/types";
import { hasCorrectAttempt } from "./state";

/**
 * Misiones: envoltorio narrativo de módulos que YA existen. Un objetivo se
 * cumple con un acierto real registrado en `skillsProgress` — no hay estado
 * de misión guardado en ningún lado, se deriva del progreso académico. Por
 * eso una misión no puede "desincronizarse" del currículo: es una lectura de
 * él, no una copia.
 *
 * Las premisas siguen el guion maestro (docs/guion-narrativa-math-quest.md):
 * cada incidente de la ciudad es obra de un tipo de Null al servicio de
 * Khaos, que drena o corrompe el AXIA que Alex empieza a generar.
 */
export interface QuestObjective {
  id: string;
  label: string;
  /** Módulo real cuyo acierto cierra el objetivo. */
  moduleId: string;
}

export interface Quest {
  id: string;
  icon: string;
  title: string;
  premise: string;
  /** Zona donde transcurre, para llevar al jugador allí. */
  strandSlug: string;
  objectives: QuestObjective[];
}

export const QUESTS: Quest[] = [
  {
    id: "apagon",
    icon: "⚡",
    title: "El apagón",
    premise:
      "La ciudad perdió energía durante la noche: un Null Drenador se instaló en el generador y absorbe el AXIA antes de que llegue a las luces. Hay que resolver el código de la terminal para recuperar el flujo.",
    strandSlug: "aritmetica",
    objectives: [
      { id: "terminal", label: "Reactivar la terminal de la plaza", moduleId: "aritmetica-d1" },
      { id: "medidor", label: "Leer el medidor de la central", moduleId: "medicion-d1" },
      { id: "compuerta", label: "Abrir la compuerta del generador", moduleId: "geometria-d1" },
    ],
  },
  {
    id: "tienda",
    icon: "🏪",
    title: "La tienda cerrada",
    premise:
      "Un Null Fragmentador aprovechó el apagón para corromper el inventario de la tienda y el sistema de precios, convirtiendo AXIA en NEXUS mientras nadie miraba.",
    strandSlug: "algebra",
    objectives: [
      { id: "patron", label: "Ordenar el estante por su patrón", moduleId: "algebra-d1" },
      { id: "vitrina", label: "Reponer la vitrina rota", moduleId: "geometria-d2" },
      { id: "caja", label: "Cuadrar la caja del día", moduleId: "aritmetica-d2" },
    ],
  },
  {
    id: "tunel",
    icon: "🚧",
    title: "El túnel de servicio",
    premise:
      "Un Null Controlador se coló por el túnel de servicio la noche del apagón y tomó el panel de acceso con NEXUS. Las cámaras siguen apagadas hasta que se recalibre el sistema.",
    strandSlug: "logica",
    objectives: [
      { id: "huellas", label: "Interpretar las huellas del túnel", moduleId: "logica-d1" },
      { id: "panel", label: "Recalibrar el panel de acceso", moduleId: "aritmetica-d3" },
      { id: "plano", label: "Medir el tramo derrumbado", moduleId: "geometria-d3" },
    ],
  },
];

export interface ObjectiveProgress extends QuestObjective {
  done: boolean;
  locked: boolean;
  /** Qué falta dominar antes, si está bloqueado (etiquetas de módulos reales). */
  missing: string[];
  moduleLabel: string;
}

export interface QuestProgress {
  quest: Quest;
  objectives: ObjectiveProgress[];
  doneCount: number;
  total: number;
  complete: boolean;
}

export function questProgress(
  progressBySkill: Record<string, SkillProgress>,
  quest: Quest,
): QuestProgress {
  const objectives = quest.objectives.map((objective) => {
    const mod = getModule(objective.moduleId);
    return {
      ...objective,
      moduleLabel: mod?.label ?? objective.moduleId,
      done: hasCorrectAttempt(progressBySkill, objective.moduleId),
      locked: !isUnlocked(progressBySkill, objective.moduleId),
      missing: missingPrerequisites(progressBySkill, objective.moduleId).map((m) => m.label),
    };
  });
  const doneCount = objectives.filter((o) => o.done).length;
  return {
    quest,
    objectives,
    doneCount,
    total: objectives.length,
    complete: doneCount === objectives.length,
  };
}

/** La primera misión que todavía no está completa; null si ya se hicieron todas. */
export function activeQuest(progressBySkill: Record<string, SkillProgress>): QuestProgress | null {
  for (const quest of QUESTS) {
    const progress = questProgress(progressBySkill, quest);
    if (!progress.complete) return progress;
  }
  return null;
}
