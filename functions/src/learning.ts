import { createHash } from "node:crypto";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { getLesson } from "./learning/catalog";
import {
  applyAdventureAction,
  applyLearningAction,
  LearningError,
} from "./learning/engine";
import type {
  AdventureAction,
  AdventureState,
  LearningAction,
  LearningProgress,
} from "./learning/types";
import {
  applyMixedReviewAction,
  unitForReviewId,
  unitLessons,
} from "./learning/mixed";
import type { MixedReviewState } from "./learning/types";
import { readBalance } from "./stars";

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
  adventure: boolean,
): action is LearningAction | AdventureAction {
  if (!action || typeof action !== "object") return false;
  const a = action as Record<string, unknown>;
  if (adventure)
    return (
      a.kind === "inspect" ||
      (a.kind === "dispatch" &&
        Array.isArray(a.allocation) &&
        a.allocation.length === 3 &&
        a.allocation.every(
          (n) => Number.isSafeInteger(n) && n >= 0 && n <= 120,
        ))
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
    const adventure = lessonId === "apagon";
    const reviewUnit = unitForReviewId(lessonId);
    const lesson = adventure || reviewUnit ? undefined : getLesson(lessonId);
    if ((!adventure && !reviewUnit && !lesson) || !validAction(action, adventure))
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
        const [profile, snapshot, previousEvent, ...unitProgress] =
          await Promise.all([
            tx.get(child),
            tx.get(progress),
            tx.get(event),
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
          | undefined;
        if ((previous?.revision ?? 0) !== expectedRevision)
          throw new HttpsError(
            "aborted",
            "El avance cambió en otra pestaña. Actualiza la página para continuar.",
          );
        const now = Date.now();
        const next = adventure
          ? applyAdventureAction(
              previous as AdventureState | undefined,
              action as AdventureAction,
              now,
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
        const stars =
          !previous?.completedAt && next.completedAt ? (adventure ? 10 : 5) : 0;
        // Todas las lecturas deben preceder las escrituras en la transacción.
        const balance = stars ? await readBalance(tx, child) : null;
        tx.set(progress, next);
        tx.create(event, {
          lessonId,
          action,
          fingerprint,
          stars,
          contentVersion: lesson?.version ?? 1,
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
