import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { validateCustomLesson } from "./schema";

/** La respuesta y el progreso se comprueban usando la versión publicada del servidor. */
export const answerCustomLesson = onCall(async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Inicia sesión.");
  const { parentId, childId, lessonId, questionId, answer, lessonVersion } = request.data ?? {};
  const validId = (id: unknown) => typeof id === "string" && /^[a-zA-Z0-9_-]{1,128}$/.test(id);
  if (![parentId, childId, lessonId, questionId].every(validId) || typeof answer !== "number" || !Number.isSafeInteger(answer) || !Number.isSafeInteger(lessonVersion)) throw new HttpsError("invalid-argument", "Respuesta no válida.");
  const claims = request.auth.token;
  if (!(request.auth.uid === parentId && claims.role !== "child") && !(claims.role === "child" && claims.parentId === parentId && claims.childId === childId)) throw new HttpsError("permission-denied", "Perfil no autorizado.");
  const db = getFirestore();
  const child = db.doc(`parents/${parentId}/children/${childId}`);
  const lessonRef = db.doc(`parents/${parentId}/customLessons/${lessonId}`);
  const progress = child.collection("customLessonProgress").doc(lessonId);
  return db.runTransaction(async (tx) => {
    const [profile, snapshot, previous] = await Promise.all([tx.get(child), tx.get(lessonRef), tx.get(progress)]);
    const lesson: unknown = snapshot.data();
    if (!profile.exists || profile.data()?.deleting || !validateCustomLesson(lesson) || !lesson.published) throw new HttpsError("not-found", "Clase no disponible.");
    if (lesson.updatedAt !== lessonVersion) throw new HttpsError("failed-precondition", "La clase cambió. Vuelve a cargarla.");
    const question = lesson.questions.find((q) => q.id === questionId);
    if (!question || (answer < 0 || answer >= question.options.length)) throw new HttpsError("invalid-argument", "Opción no válida.");
    const correct = answer === question.answer;
    const old = previous.data();
    const answers = new Set<string>(old?.lessonVersion === lesson.updatedAt && Array.isArray(old.answers) ? old.answers.filter((id: unknown): id is string => typeof id === "string") : []);
    if (correct) answers.add(question.id);
    tx.set(progress, { lessonVersion: lesson.updatedAt, answers: [...answers], completed: lesson.questions.every((q) => answers.has(q.id)), updatedAt: FieldValue.serverTimestamp() });
    return { correct, explanation: question.explanation };
  });
});
