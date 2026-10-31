import { expect, test } from "vitest";
import * as fs from "firebase/firestore";
import { getAuth, signInWithCustomToken } from "firebase/auth";
import { call, createFamily, deleteApp, anonymousApp } from "./familyFixture";

test("las clases personalizadas solo admiten respuestas de la familia y el servidor guarda los aciertos", async () => {
  const family = await createFamily(), other = await createFamily(), childApp = await anonymousApp();
  const lesson = { title: "Sumas", topic: "Números", content: "Sumar une cantidades.", game: "write", published: true, updatedAt: 1, questions: [{ id: "q1", prompt: "¿Cuánto es 2 + 2?", answer: 1, options: ["3", "4"], explanation: "2 + 2 = 4" }] };
  const request = { parentId: family.parentId, childId: family.childId, lessonId: "clase1", questionId: "q1", answer: 0, lessonVersion: 1 };
  try {
    const ref = fs.doc(family.db, "parents", family.parentId, "customLessons", "clase1");
    const progress = fs.doc(family.db, "parents", family.parentId, "children", family.childId, "customLessonProgress", "clase1");
    await fs.setDoc(ref, lesson);
    const { token } = await call<{ token: string }>(childApp, "verifyChildPin", { parentId: family.parentId, childId: family.childId, pin: "1234", accessKey: family.accessKey });
    await signInWithCustomToken(getAuth(childApp), token);
    const childDb = fs.getFirestore(childApp);
    fs.connectFirestoreEmulator(childDb, "127.0.0.1", 8080);
    expect((await fs.getDoc(fs.doc(childDb, "parents", family.parentId, "customLessons", "clase1"))).exists()).toBe(true);
    expect((await fs.getDocs(fs.query(fs.collection(childDb, "parents", family.parentId, "customLessons"), fs.where("published", "==", true)))).size).toBe(1);
    await expect(call(other.app, "answerCustomLesson", request)).rejects.toMatchObject({ code: "functions/permission-denied" });
    await expect(fs.setDoc(progress, { completed: true })).rejects.toMatchObject({ code: "permission-denied" });
    expect(await call(family.app, "answerCustomLesson", request)).toMatchObject({ correct: false });
    expect((await fs.getDoc(progress)).data()?.completed).toBe(false);
    expect(await call(childApp, "answerCustomLesson", { ...request, answer: 1 })).toMatchObject({ correct: true });
    expect((await fs.getDoc(progress)).data()).toMatchObject({ completed: true, answers: ["q1"] });
    await fs.updateDoc(ref, { published: false });
    await expect(fs.getDoc(fs.doc(childDb, "parents", family.parentId, "customLessons", "clase1"))).rejects.toMatchObject({ code: "permission-denied" });
    await expect(call(family.app, "answerCustomLesson", { ...request, answer: 1 })).rejects.toMatchObject({ code: "functions/not-found" });
  } finally { await Promise.all([deleteApp(family.app), deleteApp(other.app), deleteApp(childApp)]); }
});
