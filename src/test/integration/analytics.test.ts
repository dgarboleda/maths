import { describe, expect, test } from "vitest";
import { deleteApp, initializeApp } from "firebase/app";
import { connectAuthEmulator, createUserWithEmailAndPassword, getAuth } from "firebase/auth";
import * as firestoreFns from "firebase/firestore";
import { getModule } from "@/lib/curriculum";
import { recordModuleAttempt } from "@/lib/attemptRecorder";
import { challengeStats } from "@/lib/level/analytics";
import type { ChallengePlacement } from "@/lib/level/schema";

/**
 * `challengeStats` (Fase 26, docs/plan-salto-producto.md §4.2) contra el
 * emulador real de Firestore — mismo criterio que `editor-persistencia.test.ts`:
 * es una consulta con I/O real (`where(..., "in", ...)`), no lógica pura, así
 * que se ejercita contra datos escritos por la función real que los produce
 * en el juego (`recordModuleAttempt`), no contra un mock.
 */

const MODULE = getModule("aritmetica-d1")!;

async function nuevoPadreConHijo() {
  const app = initializeApp({ apiKey: "demo-api-key", projectId: "demo-numerario" }, `analytics-${crypto.randomUUID()}`);
  const auth = getAuth(app);
  connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
  const db = firestoreFns.getFirestore(app);
  firestoreFns.connectFirestoreEmulator(db, "127.0.0.1", 8080);
  const { user } = await createUserWithEmailAndPassword(auth, `padre-${crypto.randomUUID()}@ejemplo.test`, "secreto123");
  const childId = crypto.randomUUID();
  await firestoreFns.setDoc(firestoreFns.doc(db, "parents", user.uid, "children", childId), {
    name: "Hijo de prueba",
    birthDate: "2015-01-01",
    pinHash: "x",
    createdAt: Date.now(),
  });
  return { app, db, parentId: user.uid, childId };
}

describe("analytics — challengeStats", () => {
  test("agrega intentos reales por hijo, distinguiendo aciertos y pistas", async () => {
    const { app, db, parentId, childId } = await nuevoPadreConHijo();
    try {
      await recordModuleAttempt(firestoreFns, db, parentId, childId, MODULE, undefined, true, 0, 0);
      await recordModuleAttempt(firestoreFns, db, parentId, childId, MODULE, undefined, false, 0, 2);

      const placement: ChallengePlacement = { id: "challenge_1", moduleId: MODULE.id, activityId: "puzzle", sourceEntityId: "entity_1" };
      const [row] = await challengeStats(firestoreFns, db, parentId, [childId], [placement]);

      expect(row.attempts).toBe(2);
      expect(row.correct).toBe(1);
      expect(row.accuracy).toBe(0.5);
      expect(row.avgHintsUsed).toBe(1); // (0 + 2) / 2
      expect(row.lastAttemptAt).toBeGreaterThan(0);
    } finally {
      await deleteApp(app);
    }
  });

  test("sin ningún intento: attempts 0, accuracy y avgHintsUsed null (no 0 disfrazado)", async () => {
    const { app, db, parentId, childId } = await nuevoPadreConHijo();
    try {
      const placement: ChallengePlacement = { id: "challenge_1", moduleId: MODULE.id, activityId: "puzzle", sourceEntityId: "entity_1" };
      const [row] = await challengeStats(firestoreFns, db, parentId, [childId], [placement]);

      expect(row.attempts).toBe(0);
      expect(row.accuracy).toBeNull();
      expect(row.avgHintsUsed).toBeNull();
      expect(row.lastAttemptAt).toBeNull();
    } finally {
      await deleteApp(app);
    }
  });

  test("moduleId que no resuelve a ningún módulo real (plantilla sin terminar de configurar): moduleId null, sin consultar nada", async () => {
    const { app, db, parentId, childId } = await nuevoPadreConHijo();
    try {
      const placement: ChallengePlacement = { id: "challenge_1", moduleId: "", activityId: "puzzle", sourceEntityId: "entity_1" };
      const [row] = await challengeStats(firestoreFns, db, parentId, [childId], [placement]);

      expect(row.moduleId).toBeNull();
      expect(row.attempts).toBe(0);
      expect(row.accuracy).toBeNull();
    } finally {
      await deleteApp(app);
    }
  });

  test("intentos previos a hintsUsed (undefined) no cuentan para el promedio", async () => {
    const { app, db, parentId, childId } = await nuevoPadreConHijo();
    try {
      // Escrito directo, sin pasar por recordModuleAttempt — simula un
      // intento guardado antes de que existiera Attempt.hintsUsed.
      await firestoreFns.addDoc(firestoreFns.collection(db, "parents", parentId, "children", childId, "attempts"), {
        skillId: `${MODULE.strandSlug}-topico-${MODULE.id}`,
        itemId: crypto.randomUUID(),
        correct: true,
        createdAt: firestoreFns.serverTimestamp(),
      });
      await recordModuleAttempt(firestoreFns, db, parentId, childId, MODULE, undefined, true, 0, 3);

      const placement: ChallengePlacement = { id: "challenge_1", moduleId: MODULE.id, activityId: "puzzle", sourceEntityId: "entity_1" };
      const [row] = await challengeStats(firestoreFns, db, parentId, [childId], [placement]);

      expect(row.attempts).toBe(2);
      expect(row.avgHintsUsed).toBe(3); // solo el intento con dato cuenta
    } finally {
      await deleteApp(app);
    }
  });
});
