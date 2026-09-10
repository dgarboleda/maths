import type { Firestore } from "firebase/firestore";
import type { ModuleDef } from "./curriculum";
import type { SkillProgress } from "./types";
import { recordAttempt, recordReview, todayKey } from "./mastery";
import { starsForAnswer } from "./economy";

export interface AttemptOutcome {
  updatedProgress: SkillProgress;
  wasMastered: boolean;
  stars: number;
}

/**
 * Extrae, parametrizada por `ModuleDef` en vez de estar cerrada sobre un
 * solo módulo, la misma secuencia de escritura que ya usa
 * `[moduleId]/page.tsx` (intento → progreso → estrellas). Así un evento o
 * boss challenge que recorre varios módulos guarda cada resultado exactamente
 * donde se guardaría jugando la pestaña Práctica normal — sin inventar otra
 * fuente de verdad de progreso, mastery o estrellas.
 */
export async function recordModuleAttempt(
  firestoreFns: typeof import("firebase/firestore"),
  db: Firestore,
  parentId: string,
  childId: string,
  mod: ModuleDef,
  prevProgress: SkillProgress | undefined,
  correct: boolean,
  streak: number,
  /** Pistas pedidas en este problema: descuenta estrellas con la misma regla
   * de `economy.ts` que ya aplica la pestaña Práctica. */
  hintsUsed = 0,
): Promise<AttemptOutcome> {
  const { addDoc, collection, doc, serverTimestamp, setDoc } = firestoreFns;

  const wasMastered = Boolean(prevProgress?.masteredAt);
  // `wasMastered` (antes de ESTE intento) es la señal de que se trata de un
  // repaso, no de la práctica que lleva a dominarlo por primera vez (Fase
  // 27, docs/plan-salto-producto.md §5.4) — ese único momento de "recién
  // dominado" no necesita ningún `recordReview`: `reviewDueAt` ya cuenta
  // desde `masteredAt` cuando `reviewBox`/`lastReviewAt` están ausentes.
  const attemptProgress = recordAttempt(prevProgress, correct, todayKey());
  const updatedProgress = wasMastered ? recordReview(attemptProgress, correct) : attemptProgress;

  await addDoc(collection(db, "parents", parentId, "children", childId, "attempts"), {
    skillId: `${mod.strandSlug}-topico-${mod.id}`,
    itemId: crypto.randomUUID(),
    correct,
    createdAt: serverTimestamp(),
    hintsUsed,
  });
  await setDoc(
    doc(db, "parents", parentId, "children", childId, "skillsProgress", mod.id),
    updatedProgress,
  );

  let stars = 0;
  if (correct) {
    stars = starsForAnswer({ difficulty: mod.difficulty, streak, repeatsToday: 0, hintsUsed });
    await addDoc(collection(db, "parents", parentId, "children", childId, "starLedger"), {
      delta: stars,
      reason: "problem_solved",
      attemptId: null,
      createdAt: serverTimestamp(),
    });
  }

  return { updatedProgress, wasMastered, stars };
}
