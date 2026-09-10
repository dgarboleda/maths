import { describe, expect, test } from "vitest";
import { deleteApp, initializeApp } from "firebase/app";
import { connectAuthEmulator, createUserWithEmailAndPassword, getAuth } from "firebase/auth";
import * as firestoreFns from "firebase/firestore";
import { createLevel, deleteLevel, getLevel } from "@/lib/level/persistence/levelRepository";
import type { LevelBackground } from "@/lib/level/schema";
import { ensureWorld, saveWorld } from "@/lib/gameworld/persistence/worldRepository";
import type { WorldNode } from "@/lib/gameworld/schema";
import { validateWorld } from "@/lib/gameworld/validate";
import { createCustomModuleDoc, listCustomModuleDocs } from "@/lib/curriculum/persistence/curriculumRepository";
import { exportBundle, importBundle, NothingToExportError } from "@/lib/backup/backupRepository";

/**
 * Restaurar un respaldo — Fase 24 (docs/plan-salto-producto.md §2.6). Mismo
 * criterio que `editor-persistencia.test.ts`: contra el emulador real de
 * Firestore (auth incluida), sin navegador — ejercita `firestore.rules` de
 * verdad, no solo la forma de los datos.
 */

const BACKGROUND: LevelBackground = {
  src: "/illustrations/city-central.webp",
  width: 1600,
  height: 907,
  alt: "Fondo de prueba",
  projection: "flat",
};

async function nuevoPadre() {
  const app = initializeApp({ apiKey: "demo-api-key", projectId: "demo-numerario" }, `backup-persistencia-${crypto.randomUUID()}`);
  const auth = getAuth(app);
  connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
  const db = firestoreFns.getFirestore(app);
  firestoreFns.connectFirestoreEmulator(db, "127.0.0.1", 8080);
  const { user } = await createUserWithEmailAndPassword(auth, `padre-${crypto.randomUUID()}@ejemplo.test`, "secreto123");
  return { app, db, parentId: user.uid };
}

describe("respaldo — backupRepository", () => {
  test("exportar sin mundo todavía lanza NothingToExportError", async () => {
    const { app, db, parentId } = await nuevoPadre();
    try {
      await expect(exportBundle(firestoreFns, db, parentId)).rejects.toThrow(NothingToExportError);
    } finally {
      await deleteApp(app);
    }
  });

  test("exportar, borrar los niveles y restaurar recupera mundo + niveles + módulo, sin errores de validateWorld", async () => {
    const { app, db, parentId } = await nuevoPadre();
    try {
      const nivelA = await createLevel(firestoreFns, db, parentId, "Nivel A", BACKGROUND);
      const nivelB = await createLevel(firestoreFns, db, parentId, "Nivel B", BACKGROUND);

      const world = await ensureWorld(firestoreFns, db, parentId, parentId);
      const nodeA: WorldNode = {
        levelId: nivelA.id,
        chapterId: null,
        position: { x: 20, y: 20 },
        label: nivelA.name,
        icon: "🧩",
        unlock: { kind: "always" },
        isStart: true,
      };
      const nodeB: WorldNode = {
        levelId: nivelB.id,
        chapterId: null,
        position: { x: 40, y: 20 },
        label: nivelB.name,
        icon: "🧩",
        unlock: { kind: "always" },
        isStart: false,
      };
      await saveWorld(firestoreFns, db, parentId, { ...world, nodes: [nodeA, nodeB] });

      await createCustomModuleDoc(firestoreFns, db, parentId, parentId, "cst-prueba");

      const bundle = await exportBundle(firestoreFns, db, parentId);
      expect(bundle.levels).toHaveLength(2);
      expect(bundle.customModules).toHaveLength(1);
      expect(bundle.world.nodes).toHaveLength(2);

      // "Otra sesión" sigue editando el mundo mientras tanto — el respaldo
      // exportado ya quedó en memoria, así que restaurar después no debería
      // chocar con StaleWorldError (§2.5 punto 1).
      const worldEditadoAparte = await ensureWorld(firestoreFns, db, parentId, parentId);
      await saveWorld(firestoreFns, db, parentId, { ...worldEditadoAparte, name: "Nombre cambiado por otra sesión" });

      // Simula la pérdida de datos: se borran los niveles (deleteLevel no
      // toca el mundo — a propósito, para ejercitar la restauración de
      // niveles independientemente de la sincronización nodo↔nivel de la UI).
      await deleteLevel(firestoreFns, db, parentId, nivelA.id);
      await deleteLevel(firestoreFns, db, parentId, nivelB.id);
      expect(await getLevel(firestoreFns, db, parentId, nivelA.id)).toBeNull();

      const result = await importBundle(firestoreFns, db, parentId, bundle);
      expect(result.levelsRestored).toBe(2);
      expect(result.customModulesRestored).toBe(1);
      expect(result.missingAssets).toEqual([]);

      const restoredA = await getLevel(firestoreFns, db, parentId, nivelA.id);
      const restoredB = await getLevel(firestoreFns, db, parentId, nivelB.id);
      expect(restoredA?.name).toBe("Nivel A");
      expect(restoredB?.name).toBe("Nivel B");

      const restoredModules = await listCustomModuleDocs(firestoreFns, db, parentId);
      expect(restoredModules.map((m) => m.id)).toContain("cst-prueba");

      expect(result.world.nodes).toEqual(bundle.world.nodes);
      const issues = validateWorld(result.world, [restoredA!, restoredB!]);
      expect(issues.filter((i) => i.severity === "error")).toEqual([]);
    } finally {
      await deleteApp(app);
    }
  });

  test("restaurar un nivel que ya existe le suma una versión, sin pisar la subcolección de versiones", async () => {
    const { app, db, parentId } = await nuevoPadre();
    try {
      const nivel = await createLevel(firestoreFns, db, parentId, "Nivel original", BACKGROUND);
      await ensureWorld(firestoreFns, db, parentId, parentId);
      const bundle = await exportBundle(firestoreFns, db, parentId);

      // El padre siguió editando el nivel después de exportar: va por la
      // versión 2 en Firestore cuando restaura el paquete viejo (versión 1).
      const current = (await getLevel(firestoreFns, db, parentId, nivel.id))!;
      expect(current.version).toBe(1);

      const result = await importBundle(firestoreFns, db, parentId, bundle);
      expect(result.levelsRestored).toBe(1);

      const restored = await getLevel(firestoreFns, db, parentId, nivel.id);
      expect(restored?.version).toBe(2); // versión actual (1) + 1, no la del paquete
      expect(restored?.name).toBe("Nivel original");
    } finally {
      await deleteApp(app);
    }
  });
});
