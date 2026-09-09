import { expect, test } from "@playwright/test";
import type { FirestoreError } from "firebase/firestore";
import { deleteApp, initializeApp } from "firebase/app";
import { connectAuthEmulator, createUserWithEmailAndPassword, getAuth } from "firebase/auth";
import * as firestoreFns from "firebase/firestore";
import {
  StaleLevelError,
  createLevel,
  getLevel,
  getVersion,
  listVersions,
  saveLevel,
} from "@/lib/level/persistence/levelRepository";
import { LevelTooLargeError } from "@/lib/level/serialize";
import type { LevelBackground, LevelEntity } from "@/lib/level/schema";

/**
 * Persistencia del Level Editor contra el emulador de Firestore real — Fase
 * 3 (docs/level-editor-plan.md §10, §16.2, §17 Fase 3). Sin `page`: llama a
 * `levelRepository` directo, igual que `e2e/unidad-nivel.spec.ts` prueba
 * `navmesh`/`validate` directo — todavía no hay editor visual que manejar
 * con clics (eso es Fase 4).
 *
 * Cada prueba crea su propia cuenta de padre (vía Auth emulator, sin pasar
 * por la UI de login) para poder correr en paralelo — mismo criterio que
 * `e2e/utilidades.ts`.
 */

const BACKGROUND: LevelBackground = {
  src: "/illustrations/city-central.webp",
  width: 1600,
  height: 907,
  alt: "Fondo de prueba",
  projection: "flat",
};

/** El emulador no devuelve el texto "permission denied" en el mensaje (solo
 *  la consola de gRPC lo loguea) — el código estándar del SDK sí es fiable. */
async function expectPermissionDenied(promise: Promise<unknown>): Promise<void> {
  await expect(promise).rejects.toMatchObject({ code: "permission-denied" } satisfies Partial<FirestoreError>);
}

async function nuevoPadre() {
  const app = initializeApp({ apiKey: "demo-api-key", projectId: "demo-numerario" }, `editor-persistencia-${crypto.randomUUID()}`);
  const auth = getAuth(app);
  connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
  const db = firestoreFns.getFirestore(app);
  firestoreFns.connectFirestoreEmulator(db, "127.0.0.1", 8080);
  const { user } = await createUserWithEmailAndPassword(auth, `padre-${crypto.randomUUID()}@ejemplo.test`, "secreto123");
  return { app, db, parentId: user.uid };
}

test.describe("persistencia — levelRepository", () => {
  test("crear, leer, guardar dos veces: quedan versions/000001 y versions/000002 inmutables", async () => {
    const { app, db, parentId } = await nuevoPadre();
    try {
      const created = await createLevel(firestoreFns, db, parentId, "Nivel de prueba", BACKGROUND);
      expect(created.version).toBe(1);

      const loaded = await getLevel(firestoreFns, db, parentId, created.id);
      expect(loaded).not.toBeNull();
      expect(loaded!.name).toBe("Nivel de prueba");

      const savedOnce = await saveLevel(firestoreFns, db, parentId, created.id, { ...loaded!, name: "Nivel renombrado" });
      expect(savedOnce.version).toBe(2);

      const savedTwice = await saveLevel(firestoreFns, db, parentId, created.id, { ...savedOnce, name: "Nivel renombrado otra vez" });
      expect(savedTwice.version).toBe(3);

      const v1 = await getVersion(firestoreFns, db, parentId, created.id, 1);
      const v2 = await getVersion(firestoreFns, db, parentId, created.id, 2);
      const v3 = await getVersion(firestoreFns, db, parentId, created.id, 3);
      expect(v1.name).toBe("Nivel de prueba");
      expect(v2.name).toBe("Nivel renombrado");
      expect(v3.name).toBe("Nivel renombrado otra vez");

      const versions = await listVersions(firestoreFns, db, parentId, created.id);
      expect(versions.map((v) => v.version)).toEqual([3, 2, 1]);
    } finally {
      await deleteApp(app);
    }
  });

  test("un intento de update directo sobre una versión falla con permission-denied", async () => {
    const { app, db, parentId } = await nuevoPadre();
    try {
      const created = await createLevel(firestoreFns, db, parentId, "Nivel de prueba", BACKGROUND);
      const versionRef = firestoreFns.doc(db, "parents", parentId, "levels", created.id, "versions", "000001");
      await expectPermissionDenied(firestoreFns.updateDoc(versionRef, { name: "manipulado" }));
    } finally {
      await deleteApp(app);
    }
  });

  test("guardar con una versión desactualizada lanza StaleLevelError, sin pisar el guardado ajeno", async () => {
    const { app, db, parentId } = await nuevoPadre();
    try {
      const created = await createLevel(firestoreFns, db, parentId, "Nivel de prueba", BACKGROUND);

      // "Otra pestaña" guarda primero, avanzando a la versión 2.
      await saveLevel(firestoreFns, db, parentId, created.id, { ...created, name: "Guardado por la otra pestaña" });

      // Esta pestaña todavía tiene la versión 1 cargada.
      await expect(saveLevel(firestoreFns, db, parentId, created.id, { ...created, name: "Guardado tardío" })).rejects.toThrow(
        StaleLevelError,
      );

      const current = await getLevel(firestoreFns, db, parentId, created.id);
      expect(current!.name).toBe("Guardado por la otra pestaña");
    } finally {
      await deleteApp(app);
    }
  });

  test("guardar un nivel que excede el límite duro de tamaño lanza LevelTooLargeError, sin escribir nada (Fase 13, §14 P2)", async () => {
    const { app, db, parentId } = await nuevoPadre();
    try {
      const created = await createLevel(firestoreFns, db, parentId, "Nivel de prueba", BACKGROUND);
      const entities: LevelEntity[] = Array.from({ length: 50 }, (_, i) => ({
        id: `entity_${i}`,
        type: "interactive",
        name: `Objeto ${i}`,
        position: { x: 50, y: 50 },
        rotation: 0,
        scale: 1,
        layer: 0,
        visible: true,
        interaction: { mode: "none", standPoint: null, radius: 4, prompt: "", lockedNote: "", enabledWhen: { kind: "always" } },
        state: { initial: "default" },
        properties: { note: "x".repeat(10_000) }, // 50×10.000 ≈ 488KB, por encima del límite duro de assertSize (400KB)
      }));
      const huge = { ...created, entities };

      await expect(saveLevel(firestoreFns, db, parentId, created.id, huge)).rejects.toThrow(LevelTooLargeError);

      const current = await getLevel(firestoreFns, db, parentId, created.id);
      expect(current!.version).toBe(1); // la transacción abortó: nunca avanzó ni escribió una versión nueva
    } finally {
      await deleteApp(app);
    }
  });

  test("un padre no puede leer los niveles de otro (aislamiento por parentId)", async () => {
    const a = await nuevoPadre();
    const b = await nuevoPadre();
    try {
      const created = await createLevel(firestoreFns, a.db, a.parentId, "Nivel de A", BACKGROUND);
      const levelRefEnB = firestoreFns.doc(b.db, "parents", a.parentId, "levels", created.id);
      await expectPermissionDenied(firestoreFns.getDoc(levelRefEnB));
    } finally {
      await deleteApp(a.app);
      await deleteApp(b.app);
    }
  });
});
