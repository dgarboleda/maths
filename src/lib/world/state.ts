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
