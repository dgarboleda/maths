import type { Firestore } from "firebase/firestore";
import { getModule } from "@/lib/curriculum";
import type { Attempt } from "@/lib/types";
import type { ChallengePlacement } from "./schema";

type FirestoreFns = typeof import("firebase/firestore");

/** Límite real de Firestore para `where(campo, "in", [...])` — de sobra
 *  para los módulos distintos que un nivel real vaya a tener. */
const MAX_IN_VALUES = 30;

/** `serverTimestamp()` llega como `Timestamp` de Firestore al leer, no como
 *  el `number` que declara `Attempt.createdAt` — mismo criterio que
 *  `useChildDashboard.ts:87`. */
function toMillis(value: unknown): number {
  if (typeof value === "number") return value;
  if (value && typeof (value as { toMillis?: () => number }).toMillis === "function") {
    return (value as { toMillis: () => number }).toMillis();
  }
  return 0;
}

export interface ChallengeStatsRow {
  challengeId: string;
  childId: string;
  /** `null` = el `moduleId` del desafío no resuelve a un módulo real hoy
   *  (p. ej. una plantilla de nivel sin terminar de configurar, Fase 25) —
   *  no hay ningún `skillId` que consultar. */
  moduleId: string | null;
  attempts: number;
  correct: number;
  /** `null` si `attempts === 0` — nunca 0/0 disfrazado de "0% de acierto". */
  accuracy: number | null;
  lastAttemptAt: number | null;
  /** Promedio de pistas de los intentos que SÍ tienen el dato (Fase 26,
   *  `Attempt.hintsUsed`) — `null` si ninguno lo tiene (todos son intentos
   *  previos a este campo), nunca 0 disfrazado de "no pidió pistas". */
  avgHintsUsed: number | null;
}

/**
 * Estadísticas de cada `ChallengePlacement` de un nivel, por hijo — Fase 26
 * (docs/plan-salto-producto.md §4.2/§4.4).
 *
 * La trampa: `attempts.skillId` NO es el `moduleId` — `attemptRecorder.ts`
 * escribe `${strandSlug}-topico-${moduleId}` (mismo formato que ya usa
 * `[moduleId]/page.tsx` en la pestaña Práctica), mientras que
 * `skillsProgress` sí usa el `moduleId` pelado. Acá se arma esa cadena para
 * consultar; nunca se compara `moduleId` directo contra `skillId`.
 *
 * Rendimiento: UNA consulta por hijo (`where("skillId", "in", [...])`), no
 * una por desafío — un nivel con 6 desafíos × 3 hijos son 18 consultas si
 * se hace ingenuo, esto es como mucho `childIds.length`.
 *
 * Dos o más `ChallengePlacement` que comparten el mismo `moduleId` tienen
 * EXACTAMENTE las mismas estadísticas: `attempts` no distingue desde qué
 * nivel/desafío se practicó un módulo, solo qué módulo se practicó —
 * limitación real del modelo de datos, no un bug de esta consulta.
 */
export async function challengeStats(
  firestoreFns: FirestoreFns,
  db: Firestore,
  parentId: string,
  childIds: string[],
  placements: ChallengePlacement[],
): Promise<ChallengeStatsRow[]> {
  const { collection, getDocs, query, where } = firestoreFns;

  const skillIdByModuleId = new Map<string, string>();
  for (const placement of placements) {
    if (skillIdByModuleId.has(placement.moduleId)) continue;
    const mod = getModule(placement.moduleId);
    if (mod) skillIdByModuleId.set(placement.moduleId, `${mod.strandSlug}-topico-${mod.id}`);
  }
  const skillIds = [...skillIdByModuleId.values()].slice(0, MAX_IN_VALUES);

  const attemptsByChildAndSkill = new Map<string, Attempt[]>();
  if (skillIds.length > 0) {
    await Promise.all(
      childIds.map(async (childId) => {
        const snap = await getDocs(
          query(collection(db, "parents", parentId, "children", childId, "attempts"), where("skillId", "in", skillIds)),
        );
        for (const doc of snap.docs) {
          const attempt = doc.data() as Attempt;
          const key = `${childId}::${attempt.skillId}`;
          const list = attemptsByChildAndSkill.get(key);
          if (list) list.push(attempt);
          else attemptsByChildAndSkill.set(key, [attempt]);
        }
      }),
    );
  }

  const rows: ChallengeStatsRow[] = [];
  for (const placement of placements) {
    const skillId = skillIdByModuleId.get(placement.moduleId) ?? null;
    for (const childId of childIds) {
      const attempts = skillId ? (attemptsByChildAndSkill.get(`${childId}::${skillId}`) ?? []) : [];
      const correct = attempts.filter((a) => a.correct).length;
      const hintsKnown = attempts.filter((a) => typeof a.hintsUsed === "number");
      const lastAttemptAt = attempts.reduce<number | null>((max, a) => {
        const millis = toMillis(a.createdAt);
        return max === null || millis > max ? millis : max;
      }, null);

      rows.push({
        challengeId: placement.id,
        childId,
        moduleId: skillId ? placement.moduleId : null,
        attempts: attempts.length,
        correct,
        accuracy: attempts.length > 0 ? correct / attempts.length : null,
        lastAttemptAt,
        avgHintsUsed: hintsKnown.length > 0 ? hintsKnown.reduce((sum, a) => sum + (a.hintsUsed ?? 0), 0) / hintsKnown.length : null,
      });
    }
  }
  return rows;
}
