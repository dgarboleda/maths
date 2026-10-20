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
import {
  dailyQuestions,
  getLesson,
  initialMixedReview,
  mixedQuestions,
  placementQuestion,
  summarizeMisconceptions,
  type DailyReviewState,
  type MixedReviewState,
  type PlacementState,
} from "@/lib/learning/domain";

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
  test("cada aventura de unidad valida su propio plan y premia por separado", async () => {
    const family = await createFamily();
    try {
      const base = {
        parentId: family.parentId,
        childId: family.childId,
        lessonId: "ascensor-carga",
      };
      await call(family.app, "recordLearningAction", {
        ...base,
        expectedRevision: 0,
        operationId: crypto.randomUUID(),
        action: { kind: "inspect" },
      });
      // El plan del apagón (3 valores) no encaja con las 2 decisiones del ascensor.
      await expect(
        call(family.app, "recordLearningAction", {
          ...base,
          expectedRevision: 1,
          operationId: crypto.randomUUID(),
          action: { kind: "dispatch", allocation: [90, 20, 10] },
        }),
      ).rejects.toMatchObject({ code: "functions/invalid-argument" });
      const result = await call<{ progress: AdventureState; stars: number }>(
        family.app,
        "recordLearningAction",
        {
          ...base,
          expectedRevision: 1,
          operationId: crypto.randomUUID(),
          action: { kind: "dispatch", allocation: [10, 4] },
        },
      );
      expect(result.progress.completedAt).toBeGreaterThan(0);
      expect(result.stars).toBe(10);
      const saved = await fs.getDoc(
        fs.doc(
          family.db,
          "parents",
          family.parentId,
          "children",
          family.childId,
          "learningMissions",
          "ascensor-carga",
        ),
      );
      expect(saved.data()?.allocation).toEqual([10, 4]);
    } finally {
      await deleteApp(family.app);
    }
  });
  test("cada respuesta guarda su diagnóstico y la familia puede leerlo para el informe", async () => {
    const family = await createFamily();
    try {
      const lesson = getLesson("perimetro-area")!;
      const question = lesson.practice.find((q) => q.errors?.length)!;
      const base = { parentId: family.parentId, childId: family.childId, lessonId: lesson.id };
      await call(family.app, "recordLearningAction", {
        ...base, expectedRevision: 0, operationId: crypto.randomUUID(),
        action: { kind: "begin", stage: "practice" },
      });
      // Llega a la pregunta con errores previstos avanzando por la práctica.
      let revision = 1;
      for (const q of lesson.practice) {
        if (q === question) break;
        await call(family.app, "recordLearningAction", {
          ...base, expectedRevision: revision++, operationId: crypto.randomUUID(),
          action: { kind: "answer", questionId: q.id, response: String(q.answer) },
        });
        await call(family.app, "recordLearningAction", {
          ...base, expectedRevision: revision++, operationId: crypto.randomUUID(), action: { kind: "next" },
        });
      }
      const operationId = crypto.randomUUID();
      await call(family.app, "recordLearningAction", {
        ...base, expectedRevision: revision, operationId,
        action: { kind: "answer", questionId: question.id, response: String(question.errors![0].value) },
      });
      const evidence = fs.collection(family.db, "parents", family.parentId, "children", family.childId, "learningEvidence");
      const saved = (await fs.getDoc(fs.doc(evidence, operationId))).data();
      expect(saved?.outcome).toMatchObject({
        lessonId: lesson.id, questionId: question.id, task: question.task, stage: "practice",
        correct: false, attempt: 1, error: `e:${question.errors![0].value}`,
      });
      // La familia lee los eventos y el informe reconoce el error previsto.
      const events = (await fs.getDocs(evidence)).docs.map((d) => ({
        lessonId: d.data().lessonId, action: d.data().action, outcome: d.data().outcome,
        at: d.data().createdAt?.toMillis?.() ?? 0,
      }));
      const { misconceptions } = summarizeMisconceptions(events, getLesson);
      expect(misconceptions[0]).toMatchObject({ lessonId: lesson.id, count: 1, resolved: false });
    } finally {
      await deleteApp(family.app);
    }
  });

  test("la evaluación de ubicación avanza por unidades en el servidor y no premia", async () => {
    const family = await createFamily();
    try {
      const base = { parentId: family.parentId, childId: family.childId, lessonId: "ubicacion" };
      let state = (await call<{ progress: PlacementState; stars: number }>(family.app, "recordLearningAction", {
        ...base, expectedRevision: 0, operationId: crypto.randomUUID(), action: { kind: "begin" },
      })).progress;
      expect(state.items).toHaveLength(1);
      // La pregunta mostrada no revela de qué banco viene y no acepta otra.
      await expect(
        call(family.app, "recordLearningAction", {
          ...base, expectedRevision: 1, operationId: crypto.randomUUID(),
          action: { kind: "answer", questionId: "u7", response: "1" },
        }),
      ).rejects.toMatchObject({ code: "functions/failed-precondition" });
      await expect(
        call(family.app, "recordLearningAction", {
          ...base, expectedRevision: 1, operationId: crypto.randomUUID(),
          action: { kind: "hint", questionId: "u1" },
        }),
      ).rejects.toMatchObject({ code: "functions/invalid-argument" });
      // Acierta la primera clase (respuesta evaluada en el servidor) y salta el resto.
      const first = getLesson(state.items[0].lessonId)!;
      let stars = 0;
      const answered = await call<{ progress: PlacementState; stars: number }>(family.app, "recordLearningAction", {
        ...base, expectedRevision: state.revision, operationId: crypto.randomUUID(),
        action: { kind: "answer", questionId: "u1", response: String(placementQuestion(first).answer) },
      });
      state = answered.progress;
      stars += answered.stars;
      while (state.stage === "active") {
        const r = await call<{ progress: PlacementState; stars: number }>(family.app, "recordLearningAction", {
          ...base, expectedRevision: state.revision, operationId: crypto.randomUUID(),
          action: { kind: "skip", questionId: `u${state.items.length}` },
        });
        state = r.progress;
        stars += r.stars;
      }
      expect(stars).toBe(0);
      expect(state.result?.mastered).toEqual([first.id]);
      const saved = await fs.getDoc(
        fs.doc(family.db, "parents", family.parentId, "children", family.childId, "learningProgress", "ubicacion"),
      );
      expect((saved.data() as PlacementState).result?.mastered).toEqual([first.id]);
      // No marca la clase como terminada.
      const lessonDoc = await fs.getDoc(
        fs.doc(family.db, "parents", family.parentId, "children", family.childId, "learningProgress", first.id),
      );
      expect(lessonDoc.exists()).toBe(false);
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

  test("el repaso mixto solo mezcla clases terminadas según el servidor y premia una vez", async () => {
    const family = await createFamily();
    try {
      const revisions: Record<string, number> = {};
      const send = async <T,>(lessonId: string, action: LearningAction) => {
        const result = await call<{ progress: T & { revision: number }; stars: number }>(family.app, "recordLearningAction", {
          parentId: family.parentId,
          childId: family.childId,
          lessonId,
          expectedRevision: revisions[lessonId] ?? 0,
          operationId: crypto.randomUUID(),
          action,
        });
        revisions[lessonId] = result.progress.revision;
        return result;
      };
      const complete = async (lessonId: string) => {
        await send(lessonId, { kind: "begin", stage: "application" });
        await send(lessonId, { kind: "reveal", questionId: "m-1" });
        await send(lessonId, { kind: "next" });
      };
      await complete("enteros-recta");
      // Con una sola clase terminada, el servidor rechaza la sesión.
      await expect(send("repaso-numeros", { kind: "begin", stage: "review" })).rejects.toThrow(/al menos dos clases/);
      await complete("enteros-suma-resta");
      let state = (await send<MixedReviewState>("repaso-numeros", { kind: "begin", stage: "review" })).progress;
      expect(new Set(state.items.map((i) => i.lessonId))).toEqual(new Set(["enteros-recta", "enteros-suma-resta"]));
      let stars = 0;
      for (const { question } of mixedQuestions({ ...initialMixedReview("numeros"), ...state })) {
        await send("repaso-numeros", { kind: "answer", questionId: question.id, response: String(question.answer) });
        const next = await send<MixedReviewState>("repaso-numeros", { kind: "next" });
        stars += next.stars;
        state = next.progress;
      }
      expect(state.lastResult).toMatchObject({ correct: 6, passed: true });
      expect(stars).toBe(5);
      // El navegador no puede fabricar un repaso superado.
      await expect(
        fs.setDoc(fs.doc(family.db, "parents", family.parentId, "children", family.childId, "learningProgress", "repaso-datos"), { completedAt: 1 }),
      ).rejects.toThrow();
    } finally {
      await deleteApp(family.app);
    }
  });

  test("el repaso diario elige en el servidor, agenda cada clase y premia la primera sesión del día", async () => {
    const family = await createFamily();
    try {
      const revisions: Record<string, number> = {};
      const send = async <T,>(lessonId: string, action: LearningAction, operationId = crypto.randomUUID()) => {
        const result = await call<{ progress: T & { revision: number }; stars: number }>(family.app, "recordLearningAction", {
          parentId: family.parentId,
          childId: family.childId,
          lessonId,
          expectedRevision: revisions[lessonId] ?? 0,
          operationId,
          action,
        });
        revisions[lessonId] = result.progress.revision;
        return result;
      };
      // Sin clases terminadas no hay nada que repasar.
      await expect(send("diario", { kind: "begin", stage: "review" })).rejects.toThrow(/Termina una clase/);
      for (const lessonId of ["enteros-recta", "razones"]) {
        await send(lessonId, { kind: "begin", stage: "application" });
        await send(lessonId, { kind: "reveal", questionId: "m-1" });
        await send(lessonId, { kind: "next" });
      }
      const session = async () => {
        let state = (await send<DailyReviewState>("diario", { kind: "begin", stage: "review" })).progress;
        expect(new Set(state.items.map((i) => i.lessonId))).toEqual(new Set(["enteros-recta", "razones"]));
        // El desarrollo no se revela durante el repaso.
        await expect(send("diario", { kind: "reveal", questionId: "q1" })).rejects.toThrow();
        let stars = 0;
        let firstOperation = "";
        for (const { question } of dailyQuestions(state)) {
          const operationId = crypto.randomUUID();
          firstOperation ||= operationId;
          await send("diario", { kind: "answer", questionId: question.id, response: String(question.answer) }, operationId);
          const next = await send<DailyReviewState>("diario", { kind: "next" });
          stars += next.stars;
          state = next.progress;
        }
        return { state, stars, firstOperation };
      };
      const first = await session();
      expect(first.stars).toBe(2);
      expect(first.state).toMatchObject({ stage: "summary", sessions: 1, lastResult: { correct: 4, total: 4 } });
      expect(first.state.streak).toMatchObject({ current: 1, best: 1 });
      // Cada clase sube una sola caja por sesión.
      expect(first.state.schedule["razones"]).toMatchObject({ box: 1, seen: 2 });
      const evidence = await fs.getDoc(
        fs.doc(family.db, "parents", family.parentId, "children", family.childId, "learningEvidence", first.firstOperation),
      );
      expect(evidence.data()?.outcome).toMatchObject({ stage: "daily", correct: true, attempt: 1 });
      expect(["enteros-recta", "razones"]).toContain(evidence.data()?.outcome.lessonId);
      // Una segunda sesión el mismo día no vuelve a premiar.
      const second = await session();
      expect(second.stars).toBe(0);
      expect(second.state.sessions).toBe(2);
      const saved = await fs.getDoc(
        fs.doc(family.db, "parents", family.parentId, "children", family.childId, "learningProgress", "diario"),
      );
      expect((saved.data() as DailyReviewState).sessions).toBe(2);
      // El navegador no puede escribir su propia agenda.
      await expect(
        fs.setDoc(saved.ref, { ...saved.data(), rewardDay: null }),
      ).rejects.toThrow();
    } finally {
      await deleteApp(family.app);
    }
  });

  test("el repaso diario prioriza en el servidor la clase con un error que se repite", async () => {
    const family = await createFamily();
    try {
      const revisions: Record<string, number> = {};
      const send = async <T,>(lessonId: string, action: LearningAction) => {
        const result = await call<{ progress: T & { revision: number }; stars: number }>(family.app, "recordLearningAction", {
          parentId: family.parentId, childId: family.childId, lessonId,
          expectedRevision: revisions[lessonId] ?? 0, operationId: crypto.randomUUID(), action,
        });
        revisions[lessonId] = result.progress.revision;
        return result;
      };
      const lesson = getLesson("perimetro-area")!;
      const question = lesson.practice[0];
      const wrong = question.choices
        ? question.choices.find((c) => c.id !== question.answer && c.feedback)!.id
        : String(question.errors![0].value);
      // El mismo error previsto dos veces en la práctica.
      await send(lesson.id, { kind: "begin", stage: "practice" });
      for (let i = 0; i < 2; i++)
        await send(lesson.id, { kind: "answer", questionId: question.id, response: wrong });
      for (const id of [lesson.id, "enteros-recta", "razones", "media-mediana-moda"]) {
        await send(id, { kind: "begin", stage: "application" });
        await send(id, { kind: "reveal", questionId: "m-1" });
        await send(id, { kind: "next" });
      }
      const state = (await send<DailyReviewState>("diario", { kind: "begin", stage: "review" })).progress;
      expect(state.items[0]).toMatchObject({ lessonId: lesson.id, focus: true });
      expect(dailyQuestions(state)[0].question.task).toBe(question.task);
    } finally {
      await deleteApp(family.app);
    }
  });
});
