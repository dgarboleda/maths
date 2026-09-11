import { describe, expect, test } from "vitest";
import { deleteApp, initializeApp } from "firebase/app";
import { connectAuthEmulator, createUserWithEmailAndPassword, getAuth } from "firebase/auth";
import * as firestoreFns from "firebase/firestore";
import { createLevel, getLevel, saveLevel } from "@/lib/level/persistence/levelRepository";
import type { LevelBackground } from "@/lib/level/schema";
import { ensureWorld, getWorld, saveWorld } from "@/lib/gameworld/persistence/worldRepository";
import type { WorldLink, WorldNode } from "@/lib/gameworld/schema";
import { createCustomModuleDoc, listCustomModuleDocs } from "@/lib/curriculum/persistence/curriculumRepository";
import { exportBundle } from "@/lib/backup/backupRepository";
import { cloneBundle } from "@/lib/backup/cloneBundle";

/**
 * `cloneBundle` — clonar/compartir mundos entre familias, dejado
 * explícitamente fuera de la Fase 24 (docs/plan-salto-producto.md §2.1) y
 * resuelto acá. Contra el emulador real de Firestore: la garantía que
 * importa (§2.1, "cada referencia olvidada es un mundo roto de forma
 * silenciosa") solo se puede probar de verdad escribiendo un mundo con
 * cruces reales — nodo→nivel, salida→nivel, desafío→módulo personalizado,
 * regla unlock→nivel — y comprobando que el clon los sigue, no que
 * simplemente "no explota".
 */

const BACKGROUND: LevelBackground = {
  src: "/illustrations/city-central.webp",
  width: 1600,
  height: 907,
  alt: "Fondo de prueba",
  projection: "flat",
};

async function nuevoPadre() {
  const app = initializeApp({ apiKey: "demo-api-key", projectId: "demo-numerario" }, `clone-bundle-${crypto.randomUUID()}`);
  const auth = getAuth(app);
  connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
  const db = firestoreFns.getFirestore(app);
  firestoreFns.connectFirestoreEmulator(db, "127.0.0.1", 8080);
  const { user } = await createUserWithEmailAndPassword(auth, `padre-${crypto.randomUUID()}@ejemplo.test`, "secreto123");
  return { app, db, parentId: user.uid };
}

/** Arma en `parentId` un mundo con cruces reales para ejercitar el remapeo:
 *  nivel A → sale hacia nivel B (LevelExit.target.levelId), un desafío en A
 *  que usa el módulo personalizado "cst-prueba" (ChallengePlacement.
 *  moduleId), un WorldLink A→B y una regla unlock que exige haber pasado B
 *  (WorldUnlockRule.afterLevels). */
async function mundoConCruces(db: firestoreFns.Firestore, parentId: string) {
  const nivelA = await createLevel(firestoreFns, db, parentId, "Nivel A", BACKGROUND);
  const nivelB = await createLevel(firestoreFns, db, parentId, "Nivel B", BACKGROUND);

  const aConExitYDesafio = {
    ...nivelA,
    navigation: {
      ...nivelA.navigation,
      walkablePolygons: [
        {
          id: "walk_1",
          points: [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }, { x: 0, y: 100 }],
          initiallyEnabled: true,
        },
      ],
      spawn: { x: 50, y: 50 },
      exits: [
        {
          id: "exit_1",
          polygon: [{ x: 10, y: 10 }, { x: 20, y: 10 }, { x: 20, y: 20 }],
          label: "A B",
          target: { kind: "level" as const, levelId: nivelB.id },
        },
      ],
    },
    entities: [
      {
        id: "entity_1",
        type: "npc",
        name: "Guía",
        position: { x: 50, y: 50 },
        rotation: 0,
        scale: 1,
        layer: 0,
        visible: true,
        interaction: { mode: "click" as const, standPoint: { x: 45, y: 50 }, radius: 10, prompt: "", lockedNote: "", enabledWhen: { kind: "always" as const } },
        state: { initial: "default" },
        properties: {},
      },
    ],
    challenges: [{ id: "challenge_1", moduleId: "cst-prueba", activityId: "puzzle", sourceEntityId: "entity_1" }],
  };
  await saveLevel(firestoreFns, db, parentId, nivelA.id, aConExitYDesafio);
  await createCustomModuleDoc(firestoreFns, db, parentId, parentId, "cst-prueba");

  const world = await ensureWorld(firestoreFns, db, parentId, parentId);
  const nodeA: WorldNode = {
    levelId: nivelA.id,
    chapterId: null,
    position: { x: 20, y: 20 },
    label: "Nivel A",
    icon: "🧩",
    unlock: { kind: "always" },
    isStart: true,
  };
  const nodeB: WorldNode = {
    levelId: nivelB.id,
    chapterId: null,
    position: { x: 40, y: 20 },
    label: "Nivel B",
    icon: "🧩",
    unlock: { kind: "afterLevels", levelIds: [nivelA.id], mode: "all" },
    isStart: false,
  };
  const link: WorldLink = { id: "link_1", fromLevelId: nivelA.id, toLevelId: nivelB.id, exitId: "exit_1", label: "A B" };
  await saveWorld(firestoreFns, db, parentId, { ...world, nodes: [nodeA, nodeB], links: [link] });

  return { nivelAId: nivelA.id, nivelBId: nivelB.id };
}

describe("cloneBundle — clonar/compartir mundos", () => {
  test("clonar en una cuenta SIN mundo: genera ids nuevos y reescribe todas las referencias cruzadas", async () => {
    const origen = await nuevoPadre();
    const destino = await nuevoPadre();
    try {
      const { nivelAId, nivelBId } = await mundoConCruces(origen.db, origen.parentId);
      const bundle = await exportBundle(firestoreFns, origen.db, origen.parentId);

      const result = await cloneBundle(firestoreFns, destino.db, destino.parentId, bundle);

      expect(result.levelsCreated).toBe(2);
      expect(result.customModulesCreated).toBe(1);

      // Ids nuevos de verdad — nunca los originales de la otra cuenta.
      expect(result.world.nodes.map((n) => n.levelId)).not.toContain(nivelAId);
      expect(result.world.nodes.map((n) => n.levelId)).not.toContain(nivelBId);
      expect(result.world.nodes).toHaveLength(2);

      const clonedModules = await listCustomModuleDocs(firestoreFns, destino.db, destino.parentId);
      expect(clonedModules).toHaveLength(1);
      const newModuleId = clonedModules[0].id;
      expect(newModuleId).not.toBe("cst-prueba");
      expect(newModuleId).toMatch(/^cst-/);

      const clonedNodeA = result.world.nodes.find((n) => n.isStart)!;
      const clonedNodeB = result.world.nodes.find((n) => !n.isStart)!;
      const clonedLevelA = (await getLevel(firestoreFns, destino.db, destino.parentId, clonedNodeA.levelId))!;
      const clonedLevelB = (await getLevel(firestoreFns, destino.db, destino.parentId, clonedNodeB.levelId))!;

      // LevelExit.target.levelId: la salida de A tiene que apuntar al NUEVO
      // id de B, no al original de la cuenta de origen.
      expect(clonedLevelA.navigation.exits[0].target).toEqual({ kind: "level", levelId: clonedNodeB.levelId });

      // ChallengePlacement.moduleId: remapeado al nuevo id del módulo
      // personalizado clonado, no al original.
      expect(clonedLevelA.challenges[0].moduleId).toBe(newModuleId);

      // WorldLink.from/toLevelId: sigue conectando los mismos DOS nodos,
      // ahora con ids nuevos.
      expect(result.world.links).toHaveLength(1);
      expect(result.world.links[0].fromLevelId).toBe(clonedNodeA.levelId);
      expect(result.world.links[0].toLevelId).toBe(clonedNodeB.levelId);

      // WorldUnlockRule.afterLevels: el nodo B exigía haber pasado A — sigue
      // exigiendo el NUEVO id de A.
      expect(clonedNodeB.unlock).toEqual({ kind: "afterLevels", levelIds: [clonedNodeA.levelId], mode: "all" });

      // Nada de esto debería generar un error de validación real: el
      // remapeo cerró todas las referencias.
      expect(result.issues.world.filter((i) => i.severity === "error")).toEqual([]);
      expect(result.issues.levels[clonedLevelA.id].filter((i) => i.severity === "error")).toEqual([]);
      expect(result.issues.levels[clonedLevelB.id].filter((i) => i.severity === "error")).toEqual([]);
    } finally {
      await deleteApp(origen.app);
      await deleteApp(destino.app);
    }
  });

  test("clonar en una cuenta que YA tiene mundo: suma los nodos sin tocar los que ya existían", async () => {
    const origen = await nuevoPadre();
    const destino = await nuevoPadre();
    try {
      await mundoConCruces(origen.db, origen.parentId);
      const bundle = await exportBundle(firestoreFns, origen.db, origen.parentId);

      const nivelPropio = await createLevel(firestoreFns, destino.db, destino.parentId, "Nivel propio del destino", BACKGROUND);
      const worldPropio = await ensureWorld(firestoreFns, destino.db, destino.parentId, destino.parentId);
      const nodoPropio: WorldNode = {
        levelId: nivelPropio.id,
        chapterId: null,
        position: { x: 10, y: 10 },
        label: "Propio",
        icon: "🏠",
        unlock: { kind: "always" },
        isStart: true,
      };
      await saveWorld(firestoreFns, destino.db, destino.parentId, { ...worldPropio, nodes: [nodoPropio] });

      const result = await cloneBundle(firestoreFns, destino.db, destino.parentId, bundle);

      // El nodo propio del destino sigue ahí, intacto, y sigue siendo el
      // único punto de inicio — el clon nunca lo toca ni se lo disputa.
      expect(result.world.nodes).toHaveLength(3);
      const propio = result.world.nodes.find((n) => n.levelId === nivelPropio.id)!;
      expect(propio.isStart).toBe(true);
      expect(result.world.nodes.filter((n) => n.isStart)).toHaveLength(1);

      const nivelPropioIntacto = await getLevel(firestoreFns, destino.db, destino.parentId, nivelPropio.id);
      expect(nivelPropioIntacto?.name).toBe("Nivel propio del destino");
      expect(nivelPropioIntacto?.version).toBe(1); // nunca se re-guardó

      const worldFinal = await getWorld(firestoreFns, destino.db, destino.parentId);
      expect(worldFinal?.nodes).toHaveLength(3);
    } finally {
      await deleteApp(origen.app);
      await deleteApp(destino.app);
    }
  });
});
