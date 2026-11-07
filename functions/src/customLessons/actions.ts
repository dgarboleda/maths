import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { COMPLETION_STARS, DOC_ID, prerequisiteMet, MAX_WRONG_KEPT, QUESTION_ID, isNumeric, lessonVersion as versionOf, numericMatches, publicLesson, validateCustomLesson, visibleTo, type LessonProgress, type QuestionAttempts } from "./schema";
import { assertChildSessionCurrent } from "../childSession";
import { readBalance } from "../stars";

/**
 * Corrige una respuesta con la versión publicada del servidor y guarda el
 * progreso con sus intentos (para el informe de la familia). La respuesta
 * correcta nunca sale de aquí: al fallar se devuelve el comentario de la
 * opción elegida y, desde el primer fallo, la pista; al acertar, la
 * explicación. Terminar una versión de la clase por primera vez da estrellas.
 */
export const answerCustomLesson = onCall(async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Inicia sesión.");
  const { parentId, childId, lessonId, questionId, answer, lessonVersion } = request.data ?? {};
  const validAnswer = (typeof answer === "number" && Number.isSafeInteger(answer)) || (typeof answer === "string" && answer.length <= 40);
  if (![parentId, childId, lessonId].every((id) => typeof id === "string" && DOC_ID.test(id)) || typeof questionId !== "string" || !QUESTION_ID.test(questionId) || !validAnswer || !Number.isSafeInteger(lessonVersion)) throw new HttpsError("invalid-argument", "Respuesta no válida.");
  const claims = request.auth.token;
  if (!(request.auth.uid === parentId && claims.role !== "child") && !(claims.role === "child" && claims.parentId === parentId && claims.childId === childId)) throw new HttpsError("permission-denied", "Perfil no autorizado.");
  const db = getFirestore();
  const child = db.doc(`parents/${parentId}/children/${childId}`);
  const lessonRef = db.doc(`parents/${parentId}/customLessons/${lessonId}`);
  const progress = child.collection("customLessonProgress").doc(lessonId);
  return db.runTransaction(async (tx) => {
    const [profile, snapshot, previous] = await Promise.all([tx.get(child), tx.get(lessonRef), tx.get(progress)]);
    assertChildSessionCurrent(request, profile);
    const lesson: unknown = snapshot.data();
    if (!profile.exists || profile.data()?.deleting || !validateCustomLesson(lesson) || !lesson.published || !visibleTo(publicLesson(lesson), childId, Date.now())) throw new HttpsError("not-found", "Clase no disponible.");
    const version = versionOf(lesson);
    if (version !== lessonVersion) throw new HttpsError("failed-precondition", "La clase cambió. Vuelve a cargarla.");
    if (lesson.requires) {
      const [required, requiredProgress] = await Promise.all([
        tx.get(db.doc(`parents/${parentId}/customLessonsPublic/${lesson.requires}`)),
        tx.get(child.collection("customLessonProgress").doc(lesson.requires)),
      ]);
      if (!prerequisiteMet(required.data(), requiredProgress.data() as Partial<LessonProgress> | undefined, childId, Date.now())) throw new HttpsError("failed-precondition", "Primero termina la clase anterior.");
    }
    const question = lesson.questions.find((q) => q.id === questionId);
    if (!question) throw new HttpsError("invalid-argument", "Pregunta no válida.");
    let correct: boolean;
    let feedback = "";
    if (isNumeric(question)) {
      if (typeof answer !== "string") throw new HttpsError("invalid-argument", "Escribe un número.");
      correct = numericMatches(question, answer);
    } else {
      if (typeof answer !== "number" || answer < 0 || answer >= question.options.length) throw new HttpsError("invalid-argument", "Opción no válida.");
      correct = answer === question.answer;
      if (!correct) feedback = question.optionFeedback?.[answer]?.trim() ?? "";
    }
    const old = previous.data() as Partial<LessonProgress> | undefined;
    const sameVersion = old?.lessonVersion === version;
    const answers = new Set<string>(sameVersion && Array.isArray(old.answers) ? old.answers.filter((id: unknown): id is string => typeof id === "string") : []);
    const attempts: Record<string, QuestionAttempts> = sameVersion && old.attempts && typeof old.attempts === "object" ? { ...old.attempts } : {};
    const before = attempts[question.id] ?? { tries: 0, firstTryCorrect: false, solved: false, wrong: [] };
    // Repetir una pregunta ya resuelta (repaso) no cambia sus estadísticas.
    const current: QuestionAttempts = before.solved ? before : {
      tries: before.tries + 1,
      firstTryCorrect: before.tries === 0 && correct,
      solved: correct,
      wrong: correct ? before.wrong : [...before.wrong, answer].slice(-MAX_WRONG_KEPT),
    };
    attempts[question.id] = current;
    if (correct) answers.add(question.id);
    const completed = lesson.questions.every((q) => answers.has(q.id));
    const firstCompletion = completed && !(sameVersion && old.completed === true);
    const ledger = child.collection("starLedger").doc(`custom_${lessonId}_${version}`);
    // Todas las lecturas antes de las escrituras.
    const reward = firstCompletion ? await tx.get(ledger) : null;
    const balance = reward && !reward.exists ? await readBalance(tx, child) : null;
    tx.set(progress, {
      lessonVersion: version, answers: [...answers], completed, attempts,
      ...(completed ? { completedAt: firstCompletion ? FieldValue.serverTimestamp() : old?.completedAt ?? FieldValue.serverTimestamp() } : {}),
      updatedAt: FieldValue.serverTimestamp(),
    });
    let stars = 0;
    if (balance) {
      stars = COMPLETION_STARS;
      tx.set(balance.balance, { total: balance.total + stars, schemaVersion: 1 });
      tx.create(ledger, { delta: stars, reason: "problem_solved", attemptId: `custom_${lessonId}_${version}`, createdAt: FieldValue.serverTimestamp() });
    }
    return {
      correct,
      explanation: correct ? question.explanation : "",
      feedback,
      hint: correct ? "" : question.hint?.trim() ?? "",
      completed,
      stars,
    };
  });
});
