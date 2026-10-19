import { createHash } from "node:crypto";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { getAdventure, type AdventureDef } from "./learning/adventures";
import { getLesson } from "./learning/catalog";
import {
  applyAdventureAction,
  applyLearningAction,
  LearningError,
  validAllocation,
} from "./learning/engine";
import type {
  AdventureAction,
  AdventureState,
  LearningAction,
  LearningProgress,
  PlacementAction,
  PlacementState,
} from "./learning/types";
import { answerOutcome, findQuestion, type AnswerOutcome } from "./learning/diagnosis";
import {
  applyPlacementAction,
  placementCurrent,
  PLACEMENT_ID,
} from "./learning/placement";
import {
  applyMixedReviewAction,
  unitForReviewId,
  unitLessons,
} from "./learning/mixed";
import type { DailyReviewState, MixedReviewState } from "./learning/types";
import {
  applyDailyAction,
  dailyEligible,
  dailyQuestions,
  DAILY_ID,
  type DailyLessonInfo,
} from "./learning/daily";
import { readBalance } from "./stars";

const QUESTION_ID = /^[a-z][a-z0-9-]{0,40}$/;
function validPlacementAction(action: unknown): action is PlacementAction {
  if (!action || typeof action !== "object") return false;
  const a = action as Record<string, unknown>;
  return (
    a.kind === "begin" ||
    (a.kind === "skip" && typeof a.questionId === "string" && QUESTION_ID.test(a.questionId)) ||
    (a.kind === "answer" &&
      typeof a.questionId === "string" &&
      QUESTION_ID.test(a.questionId) &&
      typeof a.response === "string" &&
      a.response.trim().length > 0 &&
      a.response.length <= 64)
  );
}

/** Diagnóstico de una respuesta para guardarlo con el evento: la pregunta
 *  real (con su clase de origen en repasos y ubicación), si fue correcta y
 *  qué error previsto coincide. */
function outcomeOf(
  lessonId: string,
  action: { kind: string; questionId?: string; response?: string },
  previous: unknown,
  next: unknown,
): AnswerOutcome | null {
  if (action.kind !== "answer" || !action.response || !action.questionId) return null;
  if (lessonId === PLACEMENT_ID) {
    const current = placementCurrent(previous as PlacementState);
    const item = (previous as PlacementState).items.at(-1);
    const real = item && getLesson(item.lessonId);
    const found = real && findQuestion(real, item.questionId);
    return current && found
      ? answerOutcome(real.id, found.question, "placement", undefined, action.response)
      : null;
  }
  if (lessonId === DAILY_ID) {
    const state = previous as DailyReviewState;
    const item = state.items[state.index];
    const real = item && getLesson(item.lessonId);
    const found = real && findQuestion(real, item.questionId);
    return found && dailyQuestions(state)[state.index]
      ? answerOutcome(real.id, found.question, "daily",
          (next as DailyReviewState).responses[action.questionId], action.response)
      : null;
  }
  if (unitForReviewId(lessonId)) {
    const state = previous as MixedReviewState;
    const item = state.items[state.index];
    const real = item && getLesson(item.lessonId);
    const found = real && findQuestion(real, item.questionId);
    return found
      ? answerOutcome(real.id, found.question, "mixed",
          (next as MixedReviewState).responses[action.questionId], action.response)
      : null;
  }
  const lesson = getLesson(lessonId);
  const found = lesson && findQuestion(lesson, action.questionId);
  if (!found) return null;
  const state = next as LearningProgress;
  return answerOutcome(lessonId, found.question, state.stage,
    state.responses[`${state.stage}:${action.questionId}`], action.response);
}

const stages = [
  "diagnostic",
  "class",
  "examples",
  "guided",
  "practice",
  "check",
  "application",
  "review",
];
function validAction(
  action: unknown,
  adventure: AdventureDef | undefined,
): action is LearningAction | AdventureAction {
  if (!action || typeof action !== "object") return false;
  const a = action as Record<string, unknown>;
  if (adventure)
    return (
      a.kind === "inspect" ||
      (a.kind === "dispatch" && validAllocation(adventure, a.allocation))
    );
  return (
    a.kind === "next" ||
    (a.kind === "begin" &&
      typeof a.stage === "string" &&
      stages.includes(a.stage)) ||
    (["hint", "reveal", "answer"].includes(a.kind as string) &&
      typeof a.questionId === "string" &&
      /^[a-z][a-z0-9-]{0,40}$/.test(a.questionId) &&
      (a.kind !== "answer" ||
        (typeof a.response === "string" &&
          a.response.trim().length > 0 &&
          a.response.length <= 64)))
  );
}

/** Autoriza el perfil, evalúa la respuesta en el servidor y guarda evidencia
 * + avance + premio en una transacción. Un reintento de red conserva el id. */
export const recordLearningAction = onCall(
  { maxInstances: 20 },
  async (request) => {
    if (!request.auth)
      throw new HttpsError(
        "unauthenticated",
        "Inicia sesión para guardar tu avance.",
      );
    const {
      parentId,
      childId,
      lessonId,
      operationId,
      expectedRevision,
      action,
    } = request.data ?? {};
    if (
      ![parentId, childId].every(
        (id) => typeof id === "string" && /^[^/\s]{1,128}$/.test(id),
      ) ||
      typeof operationId !== "string" ||
      !/^[a-zA-Z0-9_-]{1,128}$/.test(operationId) ||
      typeof lessonId !== "string" ||
      !Number.isSafeInteger(expectedRevision) ||
      expectedRevision < 0 ||
      JSON.stringify(request.data).length > 4096
    )
      throw new HttpsError(
        "invalid-argument",
        "La actividad enviada no es válida.",
      );
    const isParent =
      request.auth.uid === parentId && request.auth.token.role !== "child";
    const isChild =
      request.auth.token.role === "child" &&
      request.auth.token.parentId === parentId &&
      request.auth.token.childId === childId;
    if (!isParent && !isChild)
      throw new HttpsError(
        "permission-denied",
        "Este perfil pertenece a otra sesión.",
      );
    const adventure = getAdventure(lessonId);
    const reviewUnit = unitForReviewId(lessonId);
    const placement = lessonId === PLACEMENT_ID;
    const daily = lessonId === DAILY_ID;
    const lesson = adventure || reviewUnit || placement || daily ? undefined : getLesson(lessonId);
    if (
      placement
        ? !validPlacementAction(action)
        : (!adventure && !reviewUnit && !daily && !lesson) || !validAction(action, adventure)
    )
      throw new HttpsError(
        "invalid-argument",
        "La lección o la acción no es válida.",
      );
    const fingerprint = createHash("sha256")
      .update(JSON.stringify({ lessonId, expectedRevision, action }))
      .digest("hex");
    const db = getFirestore();
    const child = db
      .collection("parents")
      .doc(parentId)
      .collection("children")
      .doc(childId);
    const progress = child
      .collection(adventure ? "learningMissions" : "learningProgress")
      .doc(lessonId);
    const event = child.collection("learningEvidence").doc(operationId);
    try {
      return await db.runTransaction(async (tx) => {
        const [profile, snapshot, previousEvent, allProgress, ...unitProgress] =
          await Promise.all([
            tx.get(child),
            tx.get(progress),
            tx.get(event),
            // El repaso diario decide qué repasar con el avance real del perfil.
            daily ? tx.get(child.collection("learningProgress")) : null,
            // El repaso mixto solo mezcla clases que el estudiante ya terminó.
            ...(reviewUnit
              ? unitLessons(reviewUnit).map((l) =>
                  tx.get(child.collection("learningProgress").doc(l.id)),
                )
              : []),
          ]);
        if (!profile.exists || profile.data()?.deleting)
          throw new HttpsError(
            "failed-precondition",
            "El perfil no está disponible.",
          );
        if (previousEvent.exists) {
          if (previousEvent.data()?.fingerprint !== fingerprint)
            throw new HttpsError(
              "already-exists",
              "La operación ya corresponde a otra actividad.",
            );
          return {
            progress: snapshot.data(),
            stars: previousEvent.data()?.stars ?? 0,
          };
        }
        const previous = snapshot.data() as
          | LearningProgress
          | AdventureState
          | MixedReviewState
          | PlacementState
          | DailyReviewState
          | undefined;
        if ((previous?.revision ?? 0) !== expectedRevision)
          throw new HttpsError(
            "aborted",
            "El avance cambió en otra pestaña. Actualiza la página para continuar.",
          );
        const now = Date.now();
        let dailyInput: { eligible: string[]; support: Set<string> } | null = null;
        if (daily && allProgress) {
          const info: Record<string, DailyLessonInfo> = {};
          let mastered: string[] = [];
          for (const doc of allProgress.docs) {
            const data = doc.data();
            if (doc.id === PLACEMENT_ID) mastered = (data as PlacementState).result?.mastered ?? [];
            else if (getLesson(doc.id))
              info[doc.id] = { completedAt: data.completedAt ?? null, needsSupport: Boolean(data.needsSupport) };
          }
          dailyInput = {
            eligible: dailyEligible(info, mastered),
            support: new Set(Object.keys(info).filter((id) => info[id].needsSupport)),
          };
        }
        const next = dailyInput
          ? applyDailyAction(
              previous as DailyReviewState | undefined,
              action as LearningAction,
              dailyInput.eligible,
              dailyInput.support,
              now,
            )
          : placement
          ? applyPlacementAction(
              previous as PlacementState | undefined,
              action as PlacementAction,
              now,
            )
          : adventure
          ? applyAdventureAction(
              previous as AdventureState | undefined,
              action as AdventureAction,
              now,
              adventure.id,
            )
          : reviewUnit
            ? applyMixedReviewAction(
                reviewUnit,
                previous as MixedReviewState | undefined,
                action as LearningAction,
                unitProgress
                  .filter((doc) => doc.exists && doc.data()?.completedAt)
                  .map((doc) => doc.id),
                now,
              )
            : applyLearningAction(
              lesson!,
              previous as LearningProgress | undefined,
              action as LearningAction,
              now,
            );
        // La ubicación no premia: mide desde dónde empezar.
        const done = (state: typeof previous) =>
          state && "completedAt" in state ? state.completedAt : null;
        // Repaso diario: un pequeño premio por la primera sesión terminada del día.
        const dailyReward =
          daily &&
          (next as DailyReviewState).rewardDay !== null &&
          (next as DailyReviewState).rewardDay !== (previous as DailyReviewState | undefined)?.rewardDay;
        const stars = daily
          ? dailyReward ? 2 : 0
          : !placement && !done(previous) && done(next) ? (adventure ? 10 : 5) : 0;
        const outcome = outcomeOf(lessonId, action, previous, next);
        // Todas las lecturas deben preceder las escrituras en la transacción.
        const balance = stars ? await readBalance(tx, child) : null;
        tx.set(progress, next);
        tx.create(event, {
          lessonId,
          action,
          fingerprint,
          stars,
          contentVersion: lesson?.version ?? 1,
          ...(outcome ? { outcome } : {}),
          createdAt: FieldValue.serverTimestamp(),
        });
        if (balance) {
          tx.set(balance.balance, {
            total: balance.total + stars,
            schemaVersion: 1,
          });
          tx.create(
            child.collection("starLedger").doc(`learning_${operationId}`),
            {
              delta: stars,
              reason: "problem_solved",
              attemptId: operationId,
              createdAt: FieldValue.serverTimestamp(),
            },
          );
        }
        return { progress: next, stars };
      });
    } catch (error) {
      if (error instanceof LearningError)
        throw new HttpsError("failed-precondition", error.message);
      throw error;
    }
  },
);
