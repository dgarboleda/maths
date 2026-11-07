import { expect, test } from "vitest";
import * as fs from "firebase/firestore";
import { getAuth, signInWithCustomToken } from "firebase/auth";
import type { FirebaseApp } from "firebase/app";
import { call, createFamily, deleteApp, anonymousApp } from "./familyFixture";

const lessonInput = {
  title: "Sumas", topic: "Números", content: "Sumar une cantidades.", game: "write", published: false, updatedAt: 1,
  questions: [
    { id: "q1", kind: "choice", prompt: "¿Cuánto es 2 + 2?", answer: 1, options: ["3", "4"], explanation: "2 + 2 = 4", hint: "Cuenta con los dedos.", optionFeedback: ["Te falta uno.", ""] },
    { id: "n1", kind: "numeric", prompt: "Simplifica 6/8", value: "3/4", explanation: "Divide entre 2." },
  ],
};
type Saved = { id: string; lesson: { updatedAt: number; contentVersion: number; published: boolean } };

async function childSession(family: Awaited<ReturnType<typeof createFamily>>, childId = family.childId) {
  const app = await anonymousApp();
  const { token } = await call<{ token: string }>(app, "verifyChildPin", { parentId: family.parentId, childId, pin: "1234", accessKey: family.accessKey });
  await signInWithCustomToken(getAuth(app), token);
  const db = fs.getFirestore(app);
  fs.connectFirestoreEmulator(db, "127.0.0.1", 8080);
  return { app, db };
}

test("la familia guarda por Functions y el alumno nunca recibe las respuestas", async () => {
  const family = await createFamily(), other = await createFamily();
  const apps: FirebaseApp[] = [family.app, other.app];
  try {
    const { parentId, childId } = family;
    const privateRef = (id: string) => fs.doc(family.db, "parents", parentId, "customLessons", id);
    // Ni la familia escribe directamente: todo pasa por la validación del servidor.
    await expect(fs.setDoc(privateRef("a-mano"), { ...lessonInput, published: true })).rejects.toMatchObject({ code: "permission-denied" });
    await expect(call(other.app, "saveCustomLesson", { parentId, lessonId: null, lesson: lessonInput, mode: "draft", expectedUpdatedAt: null })).rejects.toMatchObject({ code: "functions/permission-denied" });
    await expect(call(family.app, "saveCustomLesson", { parentId, lessonId: null, lesson: { ...lessonInput, questions: [{ ...lessonInput.questions[0], options: ["4", "4"] }] }, mode: "publish", expectedUpdatedAt: null })).rejects.toMatchObject({ code: "functions/invalid-argument" });

    const draft = await call<Saved>(family.app, "saveCustomLesson", { parentId, lessonId: null, lesson: { ...lessonInput, extra: "x" }, mode: "draft", expectedUpdatedAt: null });
    expect((await fs.getDoc(privateRef(draft.id))).data()).not.toHaveProperty("extra");
    expect((await fs.getDoc(fs.doc(family.db, "parents", parentId, "customLessonsPublic", draft.id))).exists()).toBe(false);
    const published = await call<Saved>(family.app, "saveCustomLesson", { parentId, lessonId: draft.id, lesson: lessonInput, mode: "publish", expectedUpdatedAt: draft.lesson.updatedAt });
    expect(published.lesson.updatedAt).toBeGreaterThan(draft.lesson.updatedAt);
    // Edición simultánea: guardar con la versión vieja se rechaza.
    await expect(call(family.app, "saveCustomLesson", { parentId, lessonId: draft.id, lesson: lessonInput, mode: "keep", expectedUpdatedAt: draft.lesson.updatedAt })).rejects.toMatchObject({ code: "functions/aborted", details: { updatedAt: published.lesson.updatedAt } });

    const child = await childSession(family);
    apps.push(child.app);
    await expect(fs.getDoc(fs.doc(child.db, "parents", parentId, "customLessons", draft.id))).rejects.toMatchObject({ code: "permission-denied" });
    const shown = await fs.getDoc(fs.doc(child.db, "parents", parentId, "customLessonsPublic", draft.id));
    const text = JSON.stringify(shown.data());
    for (const secret of ['"answer"', "explanation", "hint", "optionFeedback", "3/4", "Te falta"]) expect(text).not.toContain(secret);
    expect((await fs.getDocs(fs.query(fs.collection(child.db, "parents", parentId, "customLessonsPublic"), fs.where("audience", "array-contains", "*")))).size).toBe(1);

    const version = published.lesson.contentVersion;
    const answer = (app: FirebaseApp, questionId: string, value: number | string) => call<{ correct: boolean; feedback: string; hint: string; explanation: string; completed: boolean; stars: number }>(app, "answerCustomLesson", { parentId, childId, lessonId: draft.id, questionId, answer: value, lessonVersion: version });
    await expect(call(other.app, "answerCustomLesson", { parentId, childId, lessonId: draft.id, questionId: "q1", answer: 0, lessonVersion: version })).rejects.toMatchObject({ code: "functions/permission-denied" });
    expect(await answer(child.app, "q1", 0)).toMatchObject({ correct: false, feedback: "Te falta uno.", hint: "Cuenta con los dedos.", explanation: "" });
    expect(await answer(child.app, "q1", 1)).toMatchObject({ correct: true, explanation: "2 + 2 = 4", hint: "", completed: false });
    expect(await answer(child.app, "n1", "6/8")).toMatchObject({ correct: true, completed: true, stars: 5 });
    // Repetir no vuelve a premiar ni cambia las estadísticas.
    expect(await answer(child.app, "n1", "0,75")).toMatchObject({ correct: true, stars: 0 });
    const progress = (await fs.getDoc(fs.doc(family.db, "parents", parentId, "children", childId, "customLessonProgress", draft.id))).data();
    expect(progress).toMatchObject({ lessonVersion: version, completed: true, attempts: { q1: { tries: 2, firstTryCorrect: false, solved: true, wrong: [0] }, n1: { tries: 1, firstTryCorrect: true } } });
    expect((await fs.getDoc(fs.doc(family.db, "parents", parentId, "children", childId, "starBalance", "total"))).data()?.total).toBe(5);
    await expect(fs.setDoc(fs.doc(child.db, "parents", parentId, "children", childId, "customLessonProgress", draft.id), { completed: true })).rejects.toMatchObject({ code: "permission-denied" });

    // Corregir textos conserva la versión; cambiar la respuesta la renueva.
    const edited = await call<Saved>(family.app, "saveCustomLesson", { parentId, lessonId: draft.id, lesson: { ...lessonInput, title: "Sumas sencillas" }, mode: "keep", expectedUpdatedAt: published.lesson.updatedAt });
    expect(edited.lesson.contentVersion).toBe(version);
    const changed = await call<Saved>(family.app, "saveCustomLesson", { parentId, lessonId: draft.id, lesson: { ...lessonInput, questions: [lessonInput.questions[0], { ...lessonInput.questions[1], value: "0,5" }] }, mode: "keep", expectedUpdatedAt: edited.lesson.updatedAt });
    expect(changed.lesson.contentVersion).not.toBe(version);
    await expect(answer(child.app, "q1", 1)).rejects.toMatchObject({ code: "functions/failed-precondition" });

    // Retirar la clase la oculta al alumno; borrarla limpia también su progreso.
    await call(family.app, "saveCustomLesson", { parentId, lessonId: draft.id, lesson: lessonInput, mode: "unpublish", expectedUpdatedAt: changed.lesson.updatedAt });
    await expect(fs.getDoc(fs.doc(child.db, "parents", parentId, "customLessonsPublic", draft.id))).rejects.toMatchObject({ code: "permission-denied" });
    await expect(call(family.app, "answerCustomLesson", { parentId, childId, lessonId: draft.id, questionId: "q1", answer: 1, lessonVersion: changed.lesson.contentVersion })).rejects.toMatchObject({ code: "functions/not-found" });
    await call(family.app, "deleteCustomLesson", { parentId, lessonId: draft.id });
    expect((await fs.getDoc(privateRef(draft.id))).exists()).toBe(false);
    expect((await fs.getDoc(fs.doc(family.db, "parents", parentId, "children", childId, "customLessonProgress", draft.id))).exists()).toBe(false);
  } finally { await Promise.all(apps.map((app) => deleteApp(app))); }
});

test("asignación por alumno, clase previa, orden y reparación de la versión para alumnos", async () => {
  const family = await createFamily();
  const apps: FirebaseApp[] = [family.app];
  try {
    const { parentId, childId } = family;
    const siblingId = crypto.randomUUID();
    await fs.setDoc(fs.doc(family.db, "parents", parentId, "children", siblingId), { name: "Leo", birthDate: "2016-01-01" });
    await call(family.app, "setChildPin", { parentId, childId: siblingId, pin: "1234" });
    const save = (lesson: object) => call<Saved>(family.app, "saveCustomLesson", { parentId, lessonId: null, lesson: { ...lessonInput, ...lesson }, mode: "publish", expectedUpdatedAt: null });
    const first = await save({ title: "Primera" });
    const second = await save({ title: "Segunda", requires: first.id });
    const forSibling = await save({ title: "Solo Leo", assignedTo: [siblingId] });

    const child = await childSession(family);
    apps.push(child.app);
    const lessons = fs.collection(child.db, "parents", parentId, "customLessonsPublic");
    expect((await fs.getDocs(fs.query(lessons, fs.where("audience", "array-contains", childId)))).size).toBe(0);
    await expect(fs.getDoc(fs.doc(lessons, forSibling.id))).rejects.toMatchObject({ code: "permission-denied" });
    await expect(call(child.app, "answerCustomLesson", { parentId, childId, lessonId: forSibling.id, questionId: "q1", answer: 1, lessonVersion: forSibling.lesson.contentVersion })).rejects.toMatchObject({ code: "functions/not-found" });
    const sibling = await childSession(family, siblingId);
    apps.push(sibling.app);
    expect((await fs.getDocs(fs.query(fs.collection(sibling.db, "parents", parentId, "customLessonsPublic"), fs.where("audience", "array-contains", siblingId)))).size).toBe(1);

    const answer = (lesson: Saved, questionId: string, value: number | string) => call(child.app, "answerCustomLesson", { parentId, childId, lessonId: lesson.id, questionId, answer: value, lessonVersion: lesson.lesson.contentVersion });
    await expect(answer(second, "q1", 1)).rejects.toMatchObject({ code: "functions/failed-precondition" });
    await answer(first, "q1", 1);
    await answer(first, "n1", "3/4");
    await expect(answer(second, "q1", 1)).resolves.toMatchObject({ correct: true });

    await call(family.app, "reorderCustomLessons", { parentId, ids: [second.id, first.id] });
    expect((await fs.getDoc(fs.doc(lessons, second.id))).data()?.order).toBe(0);

    // Una clase publicada antes de existir la versión para alumnos se repara.
    // (Se borra saltándose las reglas, como si nunca se hubiera creado.)
    const removed = await fetch(`http://127.0.0.1:8080/v1/projects/demo-numerario/databases/(default)/documents/parents/${parentId}/customLessonsPublic/${first.id}`, { method: "DELETE", headers: { Authorization: "Bearer owner" } });
    expect(removed.ok).toBe(true);
    expect((await fs.getDoc(fs.doc(lessons, first.id)).catch(() => null))?.exists() ?? false).toBe(false);
    expect(await call(family.app, "syncCustomLessons", { parentId })).toMatchObject({ published: 3 });
    expect((await fs.getDoc(fs.doc(lessons, first.id))).exists()).toBe(true);
  } finally { await Promise.all(apps.map((app) => deleteApp(app))); }
});
