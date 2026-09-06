import { isMastered, isUnlocked } from "@/lib/curriculum";
import type { SkillProgress } from "@/lib/types";

/**
 * Estado de un objeto del mundo. NO es un sistema de progreso nuevo: los
 * cuatro estados se derivan enteramente de lo que ya sabe el motor
 * académico —`isUnlocked` (prerrequisitos reales), la existencia del doc de
 * `skillsProgress` (hubo intentos de verdad) y `masteredAt`— para que una
 * puerta cerrada en la ciudad signifique exactamente "te falta el
 * prerrequisito", nunca un candado inventado por la narrativa.
 */
export type WorldState = "bloqueado" | "disponible" | "activado" | "dominado";

export function interactableState(
  progressBySkill: Record<string, SkillProgress>,
  moduleId: string,
): WorldState {
  if (isMastered(progressBySkill, moduleId)) return "dominado";
  if (!isUnlocked(progressBySkill, moduleId)) return "bloqueado";
  return progressBySkill[moduleId] ? "activado" : "disponible";
}

/** Un acierto real registrado en la ventana de intentos (o el módulo ya dominado). */
export function hasCorrectAttempt(
  progressBySkill: Record<string, SkillProgress>,
  moduleId: string,
): boolean {
  const progress = progressBySkill[moduleId];
  if (!progress) return false;
  return progress.masteredAt !== null || progress.recentResults.some((r) => r.correct);
}

/**
 * Hubo juego real en algún módulo — a diferencia de `hasCorrectAttempt`, NO
 * cuenta lo que la evaluación de ubicación otorgó de entrada
 * (`masteredVia: "placement"`, ver evaluacion/page.tsx): un alumno puede
 * llegar al mundo con varios módulos ya "dominados" por esa vía sin haber
 * pisado nunca la ciudad. Sirve para distinguir "primera vez de verdad en el
 * mundo" de "doneCount === 0", que la evaluación puede adelantar a falso.
 */
export function hasAnyRealPlay(progressBySkill: Record<string, SkillProgress>): boolean {
  return Object.values(progressBySkill).some(
    (progress) =>
      progress.recentResults.some((r) => r.correct) ||
      (progress.masteredAt !== null && progress.masteredVia !== "placement"),
  );
}

export const STATE_ICON: Record<WorldState, string> = {
  bloqueado: "🔒",
  disponible: "❔",
  activado: "⚡",
  dominado: "🏆",
};

/** Texto de estado para lectores de pantalla: nunca solo color (WCAG 1.4.1). */
export const STATE_LABEL: Record<WorldState, string> = {
  bloqueado: "bloqueado",
  disponible: "sin explorar",
  activado: "activado",
  dominado: "dominado",
};
