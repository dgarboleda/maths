import { describe, expect, test } from "vitest";
import { getAuth, signInWithCustomToken } from "firebase/auth";
import * as fs from "firebase/firestore";
import { call, createFamily, anonymousApp, deleteApp } from "./familyFixture";
import { deleteChildProfile } from "@/lib/deleteChild";
import type {
  AdventureState,
  LearningAction,
  LearningProgress,
} from "@/lib/learning/domain";
import { getLesson } from "@/lib/learning/domain";

describe("Servicio educativo y reglas reales", () => {
  test("solo la sesión del perfil autorizado puede registrar evidencia", async () => {
    const family = await createFamily(),
      other = await createFamily(),
      guest = await anonymousApp();
    try {
      const request = {
        parentId: family.parentId,
        childId: family.childId,
        lessonId: "fraccion-cantidad",
        expectedRevision: 0,
        operationId: crypto.randomUUID(),
        action: { kind: "begin", stage: "class" },
      };
      await expect(
        call(guest, "recordLearningAction", request),
      ).rejects.toMatchObject({ code: "functions/unauthenticated" });
      await expect(
        call(other.app, "recordLearningAction", request),
      ).rejects.toMatchObject({ code: "functions/permission-denied" });
      await expect(
        call(family.app, "recordLearningAction", {
          ...request,
          action: { kind: "begin", stage: "summary" },
        }),
      ).rejects.toMatchObject({ code: "functions/invalid-argument" });
      await expect(
        call(family.app, "recordLearningAction", {
          ...request,
          childId: "a/b",
        }),
      ).rejects.toMatchObject({ code: "functions/invalid-argument" });
    } finally {
      await Promise.all([
        deleteApp(family.app),
        deleteApp(other.app),
        deleteApp(guest),
      ]);
    }
  });
  test("el servidor evalúa la respuesta; cliente y familia no pueden fabricar agregados por Firestore", async () => {
    const family = await createFamily();
    try {
      const base = {
        parentId: family.parentId,
        childId: family.childId,
        lessonId: "fraccion-cantidad",
      };
      await call(family.app, "recordLearningAction", {
        ...base,
        expectedRevision: 0,
        operationId: crypto.randomUUID(),
        action: { kind: "begin", stage: "practice" },
      });
      const result = await call<{ progress: LearningProgress }>(
        family.app,
        "recordLearningAction",
        {
          ...base,
          expectedRevision: 1,
          operationId: crypto.randomUUID(),
          correct: true,
          action: {
            kind: "answer",
            questionId: "p-1",
            // Una alternativa incorrecta, aunque el navegador diga lo contrario.
            response: getLesson("fraccion-cantidad")!.practice[0].choices!.find(
              (o) => o.id !== getLesson("fraccion-cantidad")!.practice[0].answer,
            )!.id,
            correct: true,
          },
        },
      );
      expect(result.progress.responses["practice:p-1"].correct).toBe(false);
      const progress = fs.doc(
        family.db,
        "parents",
        family.parentId,
        "children",
        family.childId,
        "learningProgress",
        "fraccion-cantidad",
      );
      expect((await fs.getDoc(progress)).data()?.revision).toBe(2);
      await expect(
        fs.setDoc(progress, { checkPassedAt: Date.now() }),
      ).rejects.toMatchObject({ code: "permission-denied" });
      await expect(
        fs.setDoc(
          fs.doc(
            family.db,
            "parents",
            family.parentId,
            "children",
            family.childId,
            "learningEvidence",
            "fake",
          ),
          { correct: true },
        ),
      ).rejects.toMatchObject({ code: "permission-denied" });
    } finally {
      await deleteApp(family.app);
    }
  });
  test("reintentos de red y dos pestañas no duplican ni pisan el avance", async () => {
    const family = await createFamily();
    try {
      const request = {
        parentId: family.parentId,
        childId: family.childId,
        lessonId: "fraccion-cantidad",
        expectedRevision: 0,
        operationId: crypto.randomUUID(),
        action: { kind: "begin", stage: "class" },
      };
      const results = await Promise.all(
        [1, 2].map(() =>
          call<{ progress: LearningProgress }>(
            family.app,
            "recordLearningAction",
            request,
          ),
        ),
      );
      expect(results.map((r) => r.progress.revision)).toEqual([1, 1]);
      await expect(
        call(family.app, "recordLearningAction", {
          ...request,
          operationId: crypto.randomUUID(),
        }),
      ).rejects.toMatchObject({ code: "functions/aborted" });
      await expect(
        call(family.app, "recordLearningAction", {
          ...request,
          action: { kind: "begin", stage: "check" },
        }),
      ).rejects.toMatchObject({ code: "functions/already-exists" });
      const events = await fs.getDocs(
        fs.collection(
          family.db,
          "parents",
          family.parentId,
          "children",
          family.childId,
          "learningEvidence",
        ),
      );
      expect(events.size).toBe(1);
    } finally {
      await deleteApp(family.app);
    }
  });
  test("la sesión propia del adolescente guarda su avance y no puede leer el de un hermano", async () => {
    const family = await createFamily(),
      childApp = await anonymousApp();
    try {
      const { token } = await call<{ token: string }>(
        childApp,
        "verifyChildPin",
        { parentId: family.parentId, childId: family.childId, pin: "1234", accessKey: family.accessKey },
      );
      await signInWithCustomToken(getAuth(childApp), token);
      const db = fs.getFirestore(childApp);
      fs.connectFirestoreEmulator(db, "127.0.0.1", 8080);
      const result = await call<{ progress: LearningProgress }>(
        childApp,
        "recordLearningAction",
        {
          parentId: family.parentId,
          childId: family.childId,
          lessonId: "fraccion-cantidad",
          expectedRevision: 0,
          operationId: crypto.randomUUID(),
          action: { kind: "begin", stage: "class" },
        },
      );
      expect(result.progress.stage).toBe("class");
      expect(
        (
          await fs.getDoc(
            fs.doc(
              db,
              "parents",
              family.parentId,
              "children",
              family.childId,
              "learningProgress",
              "fraccion-cantidad",
            ),
          )
        ).exists(),
      ).toBe(true);
      await expect(
        fs.getDocs(
          fs.collection(
            db,
            "parents",
            family.parentId,
            "children",
            "sibling",
            "learningProgress",
          ),
        ),
      ).rejects.toMatchObject({ code: "permission-denied" });
      await expect(
        call(childApp, "recordLearningAction", {
          parentId: family.parentId,
          childId: "sibling",
          lessonId: "fraccion-cantidad",
          expectedRevision: 0,
          operationId: crypto.randomUUID(),
          action: { kind: "begin", stage: "class" },
        }),
      ).rejects.toMatchObject({ code: "functions/permission-denied" });
    } finally {
      await Promise.all([deleteApp(family.app), deleteApp(childApp)]);
    }
  });
  test("completar con ayudas premia una sola vez y conserva las estrellas históricas", async () => {
    const family = await createFamily();
    try {
      const path = [
        "parents",
        family.parentId,
        "children",
        family.childId,
      ] as const;
      await fs.setDoc(fs.doc(family.db, ...path, "starLedger", "historico"), {
        delta: 100,
      });
      let revision = 0;
      const send = async (
        action: LearningAction,
        operationId = crypto.randomUUID(),
      ) => {
        const request = {
          parentId: family.parentId,
          childId: family.childId,
          lessonId: "fraccion-cantidad",
          expectedRevision: revision,
          operationId,
          action,
        };
        const result = await call<{
          progress: LearningProgress;
          stars: number;
        }>(family.app, "recordLearningAction", request);
        revision = result.progress.revision;
        return { request, result };
      };
      await send({ kind: "begin", stage: "application" });
      await send({ kind: "reveal", questionId: "m-1" });
      const completed = await send({ kind: "next" });
      expect(completed.result.stars).toBe(5);
      expect(completed.result.progress.checkPassedAt).toBeNull();
      await call(family.app, "recordLearningAction", completed.request);
      await send({ kind: "begin", stage: "application" });
      await send({ kind: "answer", questionId: "m-1", response: String(getLesson("fraccion-cantidad")!.application.answer) });
      expect((await send({ kind: "next" })).result.stars).toBe(0);
      expect(
        (
          await fs.getDoc(fs.doc(family.db, ...path, "starBalance", "total"))
        ).data()?.total,
      ).toBe(105);
      expect(
        (await fs.getDocs(fs.collection(family.db, ...path, "starLedger")))
          .size,
      ).toBe(2);
    } finally {
      await deleteApp(family.app);
    }
  });
  test("las decisiones del juego se validan y el premio no se repite al jugar de nuevo", async () => {
    const family = await createFamily();
    try {
      const base = {
        parentId: family.parentId,
        childId: family.childId,
        lessonId: "apagon",
      };
      await call(family.app, "recordLearningAction", {
        ...base,
        expectedRevision: 0,
        operationId: crypto.randomUUID(),
        action: { kind: "inspect" },
      });
      const request = {
        ...base,
        expectedRevision: 1,
        operationId: crypto.randomUUID(),
        action: { kind: "dispatch", allocation: [90, 20, 10] },
      };
      const result = await call<{ progress: AdventureState; stars: number }>(
        family.app,
        "recordLearningAction",
        request,
      );
      expect(result.progress.completedAt).toBeGreaterThan(0);
      expect(result.stars).toBe(10);
      await call(family.app, "recordLearningAction", request);
      const replay = await call<{ stars: number }>(
        family.app,
        "recordLearningAction",
        { ...request, expectedRevision: 2, operationId: crypto.randomUUID() },
      );
      expect(replay.stars).toBe(0);
      const path = [
        "parents",
        family.parentId,
        "children",
        family.childId,
      ] as const;
      expect(
        (
          await fs.getDoc(fs.doc(family.db, ...path, "starBalance", "total"))
        ).data()?.total,
      ).toBe(10);
      await fs.updateDoc(family.profile, { deleting: true });
      await expect(
        call(family.app, "recordLearningAction", {
          ...request,
          expectedRevision: 3,
          operationId: crypto.randomUUID(),
        }),
      ).rejects.toMatchObject({ code: "functions/failed-precondition" });
    } finally {
      await deleteApp(family.app);
    }
  });
  test("el borrado del perfil también elimina la nueva evidencia educativa", async () => {
    const family = await createFamily();
    try {
      const base = {
        parentId: family.parentId,
        childId: family.childId,
        expectedRevision: 0,
        operationId: crypto.randomUUID(),
      };
      await call(family.app, "recordLearningAction", {
        ...base,
        lessonId: "fraccion-cantidad",
        action: { kind: "begin", stage: "class" },
      });
      await call(family.app, "recordLearningAction", {
        ...base,
        operationId: crypto.randomUUID(),
        lessonId: "apagon",
        action: { kind: "inspect" },
      });
      await deleteChildProfile(fs, family.db, family.parentId, family.childId);
      for (const name of [
        "learningEvidence",
        "learningProgress",
        "learningMissions",
      ])
        expect(
          (
            await fs.getDocs(
              fs.collection(
                family.db,
                "parents",
                family.parentId,
                "children",
                family.childId,
                name,
              ),
            )
          ).empty,
        ).toBe(true);
    } finally {
      await deleteApp(family.app);
    }
  });
});
