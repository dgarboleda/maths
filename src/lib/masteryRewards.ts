import type { Firestore } from "firebase/firestore";
import { isMastered, modulesForStrand, type ModuleDef } from "./curriculum";
import type { SkillProgress } from "./types";
import { awardBadge } from "./awardBadge";

/**
 * Insignias que dispara una transición real a `masteredAt`. Es la misma regla
 * que ya aplicaba la pestaña Práctica, extraída para que dominar un módulo
 * desde el mundo otorgue exactamente lo mismo que dominarlo desde la pantalla
 * del tema — sin duplicar el criterio en dos sitios.
 *
 * `mergedProgress` debe incluir ya el progreso recién actualizado del módulo.
 */
export async function awardMasteryBadges(
  firestoreFns: typeof import("firebase/firestore"),
  db: Firestore,
  parentId: string,
  childId: string,
  mod: ModuleDef,
  mergedProgress: Record<string, SkillProgress>,
): Promise<void> {
  const badges: Promise<void>[] = [];
  const strandModules = modulesForStrand(mod.strandSlug);
  // "Tu primer tema en un hilo": los del grado más bajo de ese hilo (no
  // todos los hilos arrancan en preescolar — Medición y Lógica, en 1.º).
  const entryTier = Math.min(...strandModules.map((m) => m.tier));
  if (mod.tier === entryTier) badges.push(awardBadge(firestoreFns, db, parentId, childId, "resolutor"));
  if (strandModules.every((m) => isMastered(mergedProgress, m.id))) {
    badges.push(awardBadge(firestoreFns, db, parentId, childId, `maestro-${mod.strandSlug}`));
  }
  await Promise.all(badges);
}
