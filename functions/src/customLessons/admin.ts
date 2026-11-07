import { getFirestore, type DocumentReference, type Firestore } from "firebase-admin/firestore";
import { HttpsError, onCall, type CallableRequest } from "firebase-functions/v2/https";
import { DOC_ID, SAVE_MODES, describeCustomLessonErrors, nextContentVersion, publicLesson, sanitizeLesson, type CustomLesson, type SaveMode } from "./schema";

/**
 * Escrituras de la familia sobre sus clases. Las reglas no dejan escribir
 * `customLessons` ni `customLessonsPublic` desde el cliente: aquí se valida
 * con el mismo esquema que usa el editor, la hora y la versión las pone el
 * servidor y la proyección para alumnos (sin respuestas) se mantiene en la
 * misma transacción.
 */

const MAX_REORDER = 200;

function parentScope(request: CallableRequest): { db: Firestore; parentId: string } {
  if (!request.auth) throw new HttpsError("unauthenticated", "Inicia sesión.");
  const parentId = request.data?.parentId;
  if (typeof parentId !== "string" || !DOC_ID.test(parentId)) throw new HttpsError("invalid-argument", "Familia no válida.");
  if (request.auth.uid !== parentId || request.auth.token.role === "child") throw new HttpsError("permission-denied", "Solo la familia edita sus clases.");
  return { db: getFirestore(), parentId };
}

const refs = (db: Firestore, parentId: string, id: string) => ({
  lesson: db.doc(`parents/${parentId}/customLessons/${id}`),
  shown: db.doc(`parents/${parentId}/customLessonsPublic/${id}`),
});

/** Cada guardado deja `updatedAt` estrictamente creciente: es el testigo de las ediciones simultáneas. */
const nextStamp = (previous: CustomLesson | null) => Math.max(Date.now(), (previous?.updatedAt ?? 0) + 1);

export const saveCustomLesson = onCall(async (request) => {
  const { db, parentId } = parentScope(request);
  const { lessonId = null, lesson: input, mode, expectedUpdatedAt = null } = request.data ?? {};
  if (lessonId !== null && (typeof lessonId !== "string" || !DOC_ID.test(lessonId))) throw new HttpsError("invalid-argument", "Clase no válida.");
  if (!SAVE_MODES.includes(mode as SaveMode)) throw new HttpsError("invalid-argument", "Modo de guardado no válido.");
  if (expectedUpdatedAt !== null && !Number.isSafeInteger(expectedUpdatedAt)) throw new HttpsError("invalid-argument", "Versión no válida.");
  if (!input || typeof input !== "object" || JSON.stringify(input).length > 200_000) throw new HttpsError("invalid-argument", "La clase no tiene un formato válido.");
  const id = lessonId ?? db.collection(`parents/${parentId}/customLessons`).doc().id;
  const { lesson: ref, shown } = refs(db, parentId, id);
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const previous = snap.exists ? (snap.data() as CustomLesson) : null;
    if (lessonId !== null && !previous) throw new HttpsError("not-found", "La clase ya no existe.");
    // Otra pestaña u otro dispositivo guardó después de abrir esta edición.
    if (previous && expectedUpdatedAt !== previous.updatedAt) throw new HttpsError("aborted", "La clase cambió en otro dispositivo.", { updatedAt: previous.updatedAt });
    const published = mode === "publish" ? true : mode === "keep" ? (previous?.published ?? false) : false;
    const now = nextStamp(previous);
    const candidate = { ...input, published, updatedAt: now, contentVersion: undefined, order: previous?.order ?? (Number.isSafeInteger(input.order) ? input.order : now) } as CustomLesson;
    delete candidate.contentVersion;
    const errors = describeCustomLessonErrors(candidate, { draft: !published });
    if (errors.length) throw new HttpsError("invalid-argument", errors[0].message, { errors });
    if (candidate.requires === id) throw new HttpsError("invalid-argument", "Una clase no puede requerirse a sí misma.");
    const lesson = sanitizeLesson(candidate);
    lesson.contentVersion = nextContentVersion(previous, lesson, now);
    tx.set(ref, lesson);
    if (published) tx.set(shown, publicLesson(lesson));
    else tx.delete(shown);
    return { id, lesson };
  });
});

/** Borra la clase, su versión para alumnos y el progreso de cada hijo en ella. */
export const deleteCustomLesson = onCall(async (request) => {
  const { db, parentId } = parentScope(request);
  const lessonId = request.data?.lessonId;
  if (typeof lessonId !== "string" || !DOC_ID.test(lessonId)) throw new HttpsError("invalid-argument", "Clase no válida.");
  const { lesson, shown } = refs(db, parentId, lessonId);
  const children = await db.collection(`parents/${parentId}/children`).select().get();
  const targets: DocumentReference[] = [lesson, shown, ...children.docs.map((c) => c.ref.collection("customLessonProgress").doc(lessonId))];
  for (let i = 0; i < targets.length; i += 450) {
    const batch = db.batch();
    targets.slice(i, i + 450).forEach((r) => batch.delete(r));
    await batch.commit();
  }
  return { ok: true };
});

/** Guarda el orden de un tema: cada clase recibe su posición, también en la versión para alumnos. */
export const reorderCustomLessons = onCall(async (request) => {
  const { db, parentId } = parentScope(request);
  const ids: unknown = request.data?.ids;
  if (!Array.isArray(ids) || ids.length === 0 || ids.length > MAX_REORDER || ids.some((id) => typeof id !== "string" || !DOC_ID.test(id)) || new Set(ids).size !== ids.length) throw new HttpsError("invalid-argument", "Orden no válido.");
  await db.runTransaction(async (tx) => {
    const pairs = (ids as string[]).map((id) => refs(db, parentId, id));
    const snaps = await tx.getAll(...pairs.flatMap((p) => [p.lesson, p.shown]));
    pairs.forEach((p, order) => {
      if (!snaps[order * 2].exists) throw new HttpsError("not-found", "Alguna clase ya no existe.");
      tx.update(p.lesson, { order });
      if (snaps[order * 2 + 1].exists) tx.update(p.shown, { order });
    });
  });
  return { ok: true };
});

/**
 * Rehace la versión para alumnos de todas las clases publicadas y borra las
 * que sobran. Idempotente: el editor la llama si detecta diferencias (clases
 * guardadas antes de existir `customLessonsPublic`).
 */
export const syncCustomLessons = onCall(async (request) => {
  const { db, parentId } = parentScope(request);
  const [lessons, shown] = await Promise.all([
    db.collection(`parents/${parentId}/customLessons`).get(),
    db.collection(`parents/${parentId}/customLessonsPublic`).select().get(),
  ]);
  const writer = db.bulkWriter();
  const keep = new Set<string>();
  let published = 0;
  for (const doc of lessons.docs) {
    const data = doc.data();
    if (data.published !== true) continue;
    // Clases antiguas o escritas a mano: solo se muestran si siguen siendo válidas.
    if (describeCustomLessonErrors(data).length) continue;
    keep.add(doc.id);
    published++;
    writer.set(db.doc(`parents/${parentId}/customLessonsPublic/${doc.id}`), publicLesson(sanitizeLesson(data as CustomLesson)));
  }
  for (const doc of shown.docs) if (!keep.has(doc.id)) writer.delete(doc.ref);
  await writer.close();
  return { published };
});
