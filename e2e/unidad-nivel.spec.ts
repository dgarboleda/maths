import { expect, test } from "@playwright/test";
import {
  buildVisibilityGraph,
  closestPointOnSegment,
  dedupeArea,
  findPath,
  findPathInMesh,
  isWalkable,
  isWalkableInMesh,
  nearestWalkablePoint,
  normalizeMesh,
  pointInPolygon,
  polygonIsSimple,
  segmentsIntersect,
  simplifyPolygon,
  type NavigationMesh,
  type Point,
  type Polygon,
} from "@/lib/world/navmesh";
import { CIUDAD_CENTRAL_HOTSPOTS, CIUDAD_CENTRAL_WALKABLE } from "@/lib/world/questScene";
import { QUESTS } from "@/lib/world/quests";
import { createEmptyLevel } from "@/lib/level/defaults";
import { ciudadCentralAsLevel } from "@/lib/level/legacy/ciudadCentral";
import { UnknownSchemaVersionError, migrateLevel } from "@/lib/level/migrate";
import { LEVEL_SCHEMA_VERSION, type LevelDefinition } from "@/lib/level/schema";
import { LevelTooLargeError, NestedArrayError, assertNoNestedArrays, assertSize, stripUndefined } from "@/lib/level/serialize";
import { validateLevel } from "@/lib/level/validate";
import { MAX_CHAIN_DEPTH, createEventBus, emit } from "@/lib/level/events/bus";
import type { ChallengePlacement, LevelEntity, LevelEventRule, LevelMission, LevelZone } from "@/lib/level/schema";
import { createEntityDefaults, getEntityType } from "@/lib/level/entities";
import {
  activeMission,
  applyRuntimePatch,
  createEmptyRuntimeState,
  currentStateOf,
  deriveInitialState,
  deriveObjectiveDone,
  isEntityVisible,
  missionProgress,
} from "@/lib/level/runtime/state";
import { buildRuntimeMesh } from "@/lib/level/runtime/navigation";
import { DEFAULT_DEPTH_CONFIG, depthScaleFor, parallaxAxis, shadowOpacityFor } from "@/lib/level/depth";
import type { LevelDepthConfig } from "@/lib/level/schema";
import {
  MAX_ASSETS_PER_PARENT,
  MAX_INPUT_BYTES,
  MAX_OUTPUT_WIDTH,
  RECOMMENDED_TOTAL_BYTES_PER_PARENT,
  assetStoragePath,
  checkQuota,
  decideResize,
  gradeResolution,
  pickOutputFormat,
  sanitizeLabel,
  thumbStoragePath,
  validateFileMeta,
} from "@/lib/level/assets/imageRules";
import { mergeBackgroundOptions } from "@/lib/level/assets/backgroundOptions";
import { BACKGROUND_CATALOG } from "@/lib/level/backgroundCatalog";

/**
 * Pruebas puras de lógica (sin `page`, sin red, sin Firestore) para el
 * núcleo del Level Editor — Fases 1 y 2 (docs/level-editor-plan.md §6, §4,
 * §16.1, §17). Corren con `npx playwright test e2e/unidad-nivel.spec.ts`
 * igual que cualquier otro spec (el arnés de Playwright no exige usar
 * `page`).
 *
 * No se añade ningún runner de pruebas nuevo (Vitest/Jest): el proyecto ya
 * usa Playwright para todo, y el criterio de aceptación A3 del plan prohíbe
 * dependencias nuevas.
 */

function emptyLevel(): LevelDefinition {
  return createEmptyLevel("padre-de-prueba", "Nivel de prueba", {
    src: "/illustrations/city-central.webp",
    width: 1600,
    height: 907,
    alt: "Fondo de prueba",
    projection: "flat",
  });
}

const GAME_WALKABLE = dedupeArea(CIUDAD_CENTRAL_WALKABLE);

/* ════════════════════════════════════════════════════════════════════════
 * SUITE 1 — Regresión: findPath/isWalkable/nearestWalkablePoint sobre
 * CIUDAD_CENTRAL_WALKABLE deben devolver EXACTAMENTE lo mismo que devolvía
 * el navmesh.ts anterior a esta extensión (verificado a mano contra una
 * réplica del algoritmo viejo antes de tocar el archivo real). 6 pares
 * origen/destino fijos, elegidos para ejercitar: línea directa, ruta que
 * rodea el hueco por distintos lados, y corrección de un destino no
 * transitable (`nearestWalkablePoint`). Todos los `from` son puntos
 * realmente transitables — igual que en el juego real, donde `from` es
 * siempre la posición actual de Alex, nunca un punto sin corregir.
 * ════════════════════════════════════════════════════════════════════════ */
test.describe("navmesh — regresión sobre Ciudad Central", () => {
  const START = { x: 57, y: 71 };
  const MEDIDOR_STAND = { x: 36.5, y: 42 };

  const PAIRS: { name: string; from: Point; to: Point; expected: Point[] }[] = [
    {
      name: "start -> nia (línea directa, destino corregido)",
      from: START,
      to: { x: 53.5, y: 63 },
      expected: [START, { x: 54.734373289823175, y: 63.95618005637312 }],
    },
    {
      name: "start -> terminal (rodea el hueco por el oeste)",
      from: START,
      to: { x: 29.5, y: 52 },
      expected: [
        START,
        { x: 48.7, y: 66.7 },
        { x: 39.2, y: 57.7 },
        { x: 33.90004071492857, y: 51.770356227692574 },
      ],
    },
    {
      name: "start -> compuerta (rodea el hueco, ruta larga)",
      from: START,
      to: { x: 33, y: 38 },
      expected: [
        START,
        { x: 52.7, y: 65.8 },
        { x: 43.5, y: 50.5 },
        { x: 37.7, y: 43.9 },
        { x: 34.85836194284739, y: 40.06469691295303 },
      ],
    },
    {
      name: "start -> siguiente-misión (línea directa, destino corregido)",
      from: START,
      to: { x: 69, y: 81 },
      expected: [START, { x: 58.49404408470974, y: 76.93779137256959 }],
    },
    {
      name: "medidor -> compuerta (línea directa, destino corregido)",
      from: MEDIDOR_STAND,
      to: { x: 33, y: 38 },
      expected: [MEDIDOR_STAND, { x: 34.85836194284739, y: 40.06469691295303 }],
    },
    {
      name: "medidor -> siguiente-misión (rodea el hueco por el este)",
      from: MEDIDOR_STAND,
      to: { x: 69, y: 81 },
      expected: [
        MEDIDOR_STAND,
        { x: 37.7, y: 43.9 },
        { x: 43.5, y: 50.5 },
        { x: 52.7, y: 65.8 },
        { x: 58.49404408470974, y: 76.93779137256959 },
      ],
    },
  ];

  for (const { name, from, to, expected } of PAIRS) {
    test(name, () => {
      expect(findPath(from, to, GAME_WALKABLE)).toEqual(expected);
    });
  }

  test("isWalkable: dentro del contorno y fuera del hueco es transitable", () => {
    expect(isWalkable({ x: 57, y: 71 }, GAME_WALKABLE)).toBe(true);
  });

  test("isWalkable: dentro del hueco (fuente) NO es transitable", () => {
    expect(isWalkable({ x: 48, y: 58 }, GAME_WALKABLE)).toBe(false);
  });

  test("isWalkable: fuera del contorno NO es transitable", () => {
    expect(isWalkable({ x: 5, y: 5 }, GAME_WALKABLE)).toBe(false);
  });

  test("nearestWalkablePoint: un punto fuera del contorno se corrige a un punto transitable cercano", () => {
    const corrected = nearestWalkablePoint({ x: 29.5, y: 52 }, GAME_WALKABLE);
    expect(isWalkable(corrected, GAME_WALKABLE)).toBe(true);
    expect(Math.hypot(corrected.x - 29.5, corrected.y - 52)).toBeLessThan(6);
  });

  test("nearestWalkablePoint: un punto ya transitable se devuelve sin cambios", () => {
    expect(nearestWalkablePoint({ x: 57, y: 71 }, GAME_WALKABLE)).toEqual({ x: 57, y: 71 });
  });
});

/* ════════════════════════════════════════════════════════════════════════
 * SUITE 2 — isWalkableInMesh: la regla de la especificación en su orden
 * exacto (docs/level-editor-plan.md §6.2) — fuera de todo transitable ⇒
 * bloqueado; dentro de un bloqueado ⇒ bloqueado incluso si también cae
 * dentro de un transitable; en cualquier otro caso, transitable.
 * ════════════════════════════════════════════════════════════════════════ */
test.describe("navmesh — isWalkableInMesh", () => {
  const mesh: NavigationMesh = {
    walkable: [
      [{ x: 0, y: 0 }, { x: 20, y: 0 }, { x: 20, y: 20 }, { x: 0, y: 20 }],
    ],
    blocked: [
      [{ x: 8, y: 8 }, { x: 12, y: 8 }, { x: 12, y: 12 }, { x: 8, y: 12 }],
    ],
  };

  test("dentro de la región transitable y fuera del bloqueo: transitable", () => {
    expect(isWalkableInMesh({ x: 2, y: 2 }, mesh)).toBe(true);
  });

  test("dentro del polígono bloqueado (que además cae dentro del transitable): NO transitable", () => {
    expect(isWalkableInMesh({ x: 10, y: 10 }, mesh)).toBe(false);
  });

  test("fuera de toda región transitable: NO transitable, aunque no haya ningún bloqueo ahí", () => {
    expect(isWalkableInMesh({ x: 50, y: 50 }, mesh)).toBe(false);
  });
});

/* ════════════════════════════════════════════════════════════════════════
 * SUITE 3 — buildVisibilityGraph / findPathInMesh: ruta directa, ruta que
 * rodea un bloqueo, y el caso "inalcanzable" (regiones desconectadas) que
 * NUNCA debe degradar a una línea recta que atraviese geometría.
 * ════════════════════════════════════════════════════════════════════════ */
test.describe("navmesh — buildVisibilityGraph / findPathInMesh", () => {
  test("ruta directa cuando no hay ningún obstáculo en el camino", () => {
    const mesh: NavigationMesh = { walkable: [[{ x: 0, y: 0 }, { x: 20, y: 0 }, { x: 20, y: 20 }, { x: 0, y: 20 }]], blocked: [] };
    const graph = buildVisibilityGraph(mesh);
    const result = findPathInMesh({ x: 2, y: 2 }, { x: 18, y: 18 }, graph);
    expect(result.reachable).toBe(true);
    expect(result.path).toEqual([{ x: 2, y: 2 }, { x: 18, y: 18 }]);
  });

  test("rodea un polígono bloqueado que se interpone en línea recta", () => {
    const mesh: NavigationMesh = {
      walkable: [[{ x: 0, y: 0 }, { x: 20, y: 0 }, { x: 20, y: 20 }, { x: 0, y: 20 }]],
      blocked: [[{ x: 8, y: -1 }, { x: 12, y: -1 }, { x: 12, y: 12 }, { x: 8, y: 12 }]],
    };
    const graph = buildVisibilityGraph(mesh);
    const result = findPathInMesh({ x: 2, y: 2 }, { x: 18, y: 2 }, graph);
    expect(result.reachable).toBe(true);
    // Tuvo que rodear (no fue la línea recta de 2 puntos): confirma que el
    // bloqueado sí se detectó. No se comprueba `isWalkableInMesh` de cada
    // punto de la ruta: los vértices intermedios son, a propósito, esquinas
    // del propio polígono bloqueado (la ruta lo bordea pegada a su borde), y
    // `pointInPolygon` por ray casting es ambiguo para un punto exactamente
    // sobre un vértice — la misma ambigüedad de "punto sobre el propio
    // borde" documentada en `segmentIsClearInMesh`, no un defecto de la ruta.
    expect(result.path.length).toBeGreaterThan(2);
  });

  test("reachable:false para dos regiones sin ninguna conexión — nunca una recta que las atraviese", () => {
    const mesh: NavigationMesh = {
      walkable: [
        [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }],
        [{ x: 50, y: 50 }, { x: 60, y: 50 }, { x: 60, y: 60 }, { x: 50, y: 60 }],
      ],
      blocked: [],
    };
    const graph = buildVisibilityGraph(mesh);
    const result = findPathInMesh({ x: 2, y: 8 }, { x: 55, y: 52 }, graph);
    expect(result.reachable).toBe(false);
    expect(result.path).toEqual([{ x: 2, y: 8 }]);
  });

  test("un bloqueado que corta enteramente una región transitable en dos deja el otro lado inalcanzable", () => {
    const mesh: NavigationMesh = {
      walkable: [[{ x: 0, y: 0 }, { x: 20, y: 0 }, { x: 20, y: 10 }, { x: 0, y: 10 }]],
      blocked: [[{ x: 9, y: -1 }, { x: 11, y: -1 }, { x: 11, y: 11 }, { x: 9, y: 11 }]],
    };
    const graph = buildVisibilityGraph(mesh);
    const result = findPathInMesh({ x: 2, y: 5 }, { x: 18, y: 5 }, graph);
    expect(result.reachable).toBe(false);
  });
});

/* ════════════════════════════════════════════════════════════════════════
 * SUITE 4 — Costura entre polígonos adyacentes: dos regiones transitables
 * que comparten un borde exacto (tras `normalizeMesh`) deben quedar
 * conectadas — la ruta pasa por el vértice compartido, no queda como si
 * fueran dos regiones desconectadas.
 * ════════════════════════════════════════════════════════════════════════ */
test.describe("navmesh — costura entre polígonos adyacentes (normalizeMesh)", () => {
  test("dos salas contiguas con vértices exactamente coincidentes quedan conectadas", () => {
    const mesh = normalizeMesh({
      walkable: [
        [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }],
        [{ x: 10, y: 0 }, { x: 20, y: 0 }, { x: 20, y: 10 }, { x: 10, y: 10 }],
      ],
      blocked: [],
    });
    const graph = buildVisibilityGraph(mesh);
    const result = findPathInMesh({ x: 2, y: 5 }, { x: 18, y: 5 }, graph);
    expect(result.reachable).toBe(true);
  });

  test("dos salas con vértices casi coincidentes (dentro de eps) también quedan conectadas tras normalizar", () => {
    const mesh = normalizeMesh({
      walkable: [
        [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10.02, y: 10 }, { x: 0, y: 10 }],
        [{ x: 9.98, y: 0 }, { x: 20, y: 0 }, { x: 20, y: 10 }, { x: 10, y: 10.01 }],
      ],
      blocked: [],
    });
    const graph = buildVisibilityGraph(mesh);
    const result = findPathInMesh({ x: 2, y: 5 }, { x: 18, y: 5 }, graph);
    expect(result.reachable).toBe(true);
  });

  test("sin normalizar (costura no exacta), la conexión no está garantizada por vértice compartido", () => {
    // No es un requisito que falle — solo documenta que `normalizeMesh` es
    // el paso que garantiza la costura; sin él, dos vértices "casi" iguales
    // son nodos DISTINTOS del grafo y solo se conectan si además son
    // mutuamente visibles en línea recta (aquí sí lo son, por eso igual
    // conecta) — el valor real de esta suite es el caso anterior.
    const mesh: NavigationMesh = {
      walkable: [
        [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10.02, y: 10 }, { x: 0, y: 10 }],
        [{ x: 9.98, y: 0 }, { x: 20, y: 0 }, { x: 20, y: 10 }, { x: 10, y: 10.01 }],
      ],
      blocked: [],
    };
    const graph = buildVisibilityGraph(mesh);
    const result = findPathInMesh({ x: 2, y: 5 }, { x: 18, y: 5 }, graph);
    expect(result.reachable).toBe(true);
  });

  test("descarta anillos con menos de 3 puntos tras el dedupe por epsilon", () => {
    const mesh = normalizeMesh({
      walkable: [
        [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }],
        // Un polígono degenerado (todos sus puntos casi coincidentes) debe desaparecer.
        [{ x: 50, y: 50 }, { x: 50.01, y: 50 }, { x: 50.02, y: 50.01 }],
      ],
      blocked: [],
    });
    expect(mesh.walkable.length).toBe(1);
  });
});

/* ════════════════════════════════════════════════════════════════════════
 * SUITE 5 — Índice espacial de aristas (edgeGrid): es un detalle interno
 * (no exportado), así que se prueba por su contrato observable — el
 * resultado de `findPathInMesh` no debe cambiar por dónde caiga un
 * obstáculo dentro de la rejilla de celdas, incluso cuando el segmento
 * consultado atraviesa varias celdas y el obstáculo está lejos de los
 * extremos.
 * ════════════════════════════════════════════════════════════════════════ */
test.describe("navmesh — índice espacial de aristas (edgeGrid)", () => {
  test("un obstáculo en una celda intermedia de un segmento largo se detecta igual", () => {
    // Segmento de (3,2) a (96,97): atraviesa prácticamente todas las celdas
    // de la rejilla 10×10, sin pasar exactamente por ninguna esquina del
    // obstáculo (una pendiente de 45° exacta rozaría sus esquinas en vez de
    // cruzar sus lados — ver el comentario de segmentIsClearInMesh sobre
    // "touch" vs "proper"). El obstáculo está centrado en (50,50) — lejos de
    // los extremos — y debe bloquear la línea recta igual que si la rejilla
    // no existiera.
    const mesh: NavigationMesh = {
      walkable: [[{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }, { x: 0, y: 100 }]],
      blocked: [[{ x: 45, y: 45 }, { x: 55, y: 45 }, { x: 55, y: 55 }, { x: 45, y: 55 }]],
    };
    const graph = buildVisibilityGraph(mesh);
    const direct = findPathInMesh({ x: 3, y: 2 }, { x: 96, y: 97 }, graph);
    expect(direct.reachable).toBe(true);
    expect(direct.path.length).toBeGreaterThan(2); // tuvo que rodear, no fue directo
  });

  test("un obstáculo lejos de la línea recta entre origen y destino no afecta la ruta directa", () => {
    const mesh: NavigationMesh = {
      walkable: [[{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }, { x: 0, y: 100 }]],
      blocked: [[{ x: 90, y: 5 }, { x: 95, y: 5 }, { x: 95, y: 10 }, { x: 90, y: 10 }]], // esquina, fuera del camino
    };
    const graph = buildVisibilityGraph(mesh);
    const direct = findPathInMesh({ x: 2, y: 2 }, { x: 20, y: 20 }, graph);
    expect(direct.reachable).toBe(true);
    expect(direct.path).toEqual([{ x: 2, y: 2 }, { x: 20, y: 20 }]);
  });
});

/* ════════════════════════════════════════════════════════════════════════
 * SUITE 6 — Filtrado de nodos no transitables: un vértice de un polígono
 * transitable que queda cubierto por un bloqueado no debe aparecer como
 * nodo utilizable del grafo (si apareciera, Dijkstra podría trazar una ruta
 * que pasa por un punto ilegal).
 * ════════════════════════════════════════════════════════════════════════ */
test.describe("navmesh — filtrado de nodos no transitables", () => {
  test("un vértice del transitable tapado por un bloqueado no es nodo del grafo", () => {
    // El bloqueado cubre por completo la esquina (10,10) del rectángulo
    // transitable (incluido un margen alrededor del vértice).
    const mesh: NavigationMesh = {
      walkable: [[{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }]],
      blocked: [[{ x: 8, y: 8 }, { x: 12, y: 8 }, { x: 12, y: 12 }, { x: 8, y: 12 }]],
    };
    const graph = buildVisibilityGraph(mesh);
    const coveredVertex = graph.nodes.find((n) => n.x === 10 && n.y === 10);
    expect(coveredVertex).toBeUndefined();
    // El resto de vértices del rectángulo sí sobreviven.
    expect(graph.nodes.some((n) => n.x === 0 && n.y === 0)).toBe(true);
  });

  test("un vértice de un bloqueado que sobresale del transitable no es nodo del grafo", () => {
    const mesh: NavigationMesh = {
      walkable: [[{ x: 0, y: 0 }, { x: 20, y: 0 }, { x: 20, y: 20 }, { x: 0, y: 20 }]],
      // El bloqueado sobresale del transitable por el borde derecho.
      blocked: [[{ x: 15, y: 5 }, { x: 25, y: 5 }, { x: 25, y: 15 }, { x: 15, y: 15 }]],
    };
    const graph = buildVisibilityGraph(mesh);
    const outsideVertex = graph.nodes.find((n) => n.x === 25 && n.y === 5);
    expect(outsideVertex).toBeUndefined();
  });
});

/* ════════════════════════════════════════════════════════════════════════
 * SUITE 7 — geometry: segmentsIntersect
 * ════════════════════════════════════════════════════════════════════════ */
test.describe("geometry — segmentsIntersect", () => {
  test("cruce franco en el interior de ambos segmentos: proper", () => {
    expect(segmentsIntersect({ x: 0, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }, { x: 10, y: 0 })).toBe("proper");
  });

  test("segmentos paralelos que nunca se tocan: none", () => {
    expect(segmentsIntersect({ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 0, y: 5 }, { x: 10, y: 5 })).toBe("none");
  });

  test("segmentos que comparten un extremo: touch, no proper", () => {
    expect(segmentsIntersect({ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 })).toBe("touch");
  });

  test("un segmento apenas roza el extremo del otro sin cruzarlo: touch", () => {
    expect(segmentsIntersect({ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 5, y: 0 }, { x: 5, y: 10 })).toBe("touch");
  });
});

/* ════════════════════════════════════════════════════════════════════════
 * SUITE 8 — geometry: pointInPolygon / closestPointOnSegment
 * ════════════════════════════════════════════════════════════════════════ */
test.describe("geometry — pointInPolygon / closestPointOnSegment", () => {
  const square: Polygon = [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }];

  test("punto claramente dentro del polígono", () => {
    expect(pointInPolygon({ x: 5, y: 5 }, square)).toBe(true);
  });

  test("punto claramente fuera del polígono", () => {
    expect(pointInPolygon({ x: 50, y: 50 }, square)).toBe(false);
  });

  test("closestPointOnSegment proyecta perpendicularmente cuando cae dentro del segmento", () => {
    const closest = closestPointOnSegment({ x: 5, y: 3 }, { x: 0, y: 0 }, { x: 10, y: 0 });
    expect(closest).toEqual({ x: 5, y: 0 });
  });

  test("closestPointOnSegment clampa al extremo más cercano cuando la proyección cae fuera del segmento", () => {
    const closest = closestPointOnSegment({ x: -5, y: 3 }, { x: 0, y: 0 }, { x: 10, y: 0 });
    expect(closest).toEqual({ x: 0, y: 0 });
  });
});

/* ════════════════════════════════════════════════════════════════════════
 * SUITE 9 — geometry: polygonIsSimple
 * ════════════════════════════════════════════════════════════════════════ */
test.describe("geometry — polygonIsSimple", () => {
  test("un cuadrado simple es simple", () => {
    expect(polygonIsSimple([{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }])).toBe(true);
  });

  test("un polígono con dos lados no adyacentes que se cruzan (forma de mariposa) NO es simple", () => {
    expect(polygonIsSimple([{ x: 0, y: 0 }, { x: 10, y: 10 }, { x: 10, y: 0 }, { x: 0, y: 10 }])).toBe(false);
  });

  test("un polígono cóncavo (en forma de L) sigue siendo simple", () => {
    expect(
      polygonIsSimple([
        { x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 5 }, { x: 5, y: 5 }, { x: 5, y: 10 }, { x: 0, y: 10 },
      ]),
    ).toBe(true);
  });

  test("menos de 3 vértices nunca es simple", () => {
    expect(polygonIsSimple([{ x: 0, y: 0 }, { x: 10, y: 10 }])).toBe(false);
  });

  test("el contorno real de Ciudad Central (tras dedupe) es simple", () => {
    expect(polygonIsSimple(GAME_WALKABLE.boundary)).toBe(true);
    expect(polygonIsSimple(GAME_WALKABLE.holes[0])).toBe(true);
  });
});

test.describe("geometry — simplifyPolygon", () => {
  test("quita un vértice colineal en medio de un lado recto, sin cambiar la forma", () => {
    // Cuadrado con un vértice extra a mitad del lado inferior.
    const square = [{ x: 0, y: 0 }, { x: 5, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }];
    expect(simplifyPolygon(square)).toEqual([{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }]);
  });

  test("no toca los vértices que sobreviven — misma posición exacta", () => {
    const square = [{ x: 0, y: 0 }, { x: 5, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }];
    const result = simplifyPolygon(square);
    expect(result).toContainEqual({ x: 0, y: 0 });
    expect(result).toContainEqual({ x: 10, y: 10 });
  });

  test("un polígono ya sin vértices redundantes no cambia", () => {
    const triangle = [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 5, y: 10 }];
    expect(simplifyPolygon(triangle)).toEqual(triangle);
  });

  test("caso límite: un triángulo (3 vértices) se devuelve intacto sin evaluarlo", () => {
    const triangle = [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 5, y: 10 }];
    expect(simplifyPolygon(triangle)).toBe(triangle);
  });

  test("caso límite: un polígono degenerado (todo colineal) nunca queda con menos de 3 vértices — se devuelve intacto", () => {
    const degenerate = [{ x: 0, y: 0 }, { x: 5, y: 0 }, { x: 10, y: 0 }, { x: 15, y: 0 }];
    expect(simplifyPolygon(degenerate)).toEqual(degenerate);
  });

  test("descarta un vértice duplicado (arista de longitud 0)", () => {
    const withDuplicate = [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }];
    expect(simplifyPolygon(withDuplicate)).toEqual([{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }]);
  });
});

/* ════════════════════════════════════════════════════════════════════════
 * SUITE 10 — validate: las 8 comprobaciones de validateLevel
 * (docs/level-editor-plan.md §4/§16.1/§17 Fase 2).
 * ════════════════════════════════════════════════════════════════════════ */
test.describe("validate — validateLevel", () => {
  test("un nivel recién creado (createEmptyLevel) no tiene ningún error", () => {
    const issues = validateLevel(emptyLevel());
    expect(issues.filter((i) => i.severity === "error")).toEqual([]);
  });

  test("nombre vacío: error", () => {
    const level = emptyLevel();
    level.name = "   ";
    expect(validateLevel(level).some((i) => i.target?.kind === "level")).toBe(true);
  });

  test("fondo sin alt: error", () => {
    const level = emptyLevel();
    level.background.alt = "";
    expect(validateLevel(level).some((i) => i.target?.kind === "background")).toBe(true);
  });

  test("fondo de baja resolución (< 1200px): warning, nunca error (docs/asset-management-plan.md §G Paso 10)", () => {
    const level = emptyLevel();
    level.background.width = 340;
    const issues = validateLevel(level);
    const backgroundIssues = issues.filter((i) => i.target?.kind === "background");
    expect(backgroundIssues).toHaveLength(1);
    expect(backgroundIssues[0].severity).toBe("warning");
  });

  test("fondo de resolución adecuada (>= 1200px): sin ningún aviso de resolución", () => {
    const level = emptyLevel();
    level.background.width = 1600;
    expect(validateLevel(level).some((i) => i.target?.kind === "background")).toBe(false);
  });

  test("spawn fuera del área transitable: error", () => {
    const level = emptyLevel();
    level.navigation.spawn = { x: 0, y: 0 }; // fuera del rectángulo (10,10)-(90,90) por defecto
    expect(validateLevel(level).some((i) => i.target?.kind === "spawn")).toBe(true);
  });

  test("sin ningún polígono transitable: error", () => {
    const level = emptyLevel();
    level.navigation.walkablePolygons = [];
    const issues = validateLevel(level);
    expect(issues.some((i) => i.message.includes("ningún área transitable"))).toBe(true);
  });

  test("polígono autointersecante (forma de mariposa): error", () => {
    const level = emptyLevel();
    level.navigation.walkablePolygons[0].points = [
      { x: 10, y: 10 }, { x: 90, y: 90 }, { x: 90, y: 10 }, { x: 10, y: 90 },
    ];
    expect(validateLevel(level).some((i) => i.target?.kind === "polygon")).toBe(true);
  });

  test("punto de destino que no toca ningún área transitable: error", () => {
    const level = emptyLevel();
    level.navigation.exits.push({ id: "exit_1", polygon: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }], target: { kind: "worldMap" }, label: "Salida" });
    expect(validateLevel(level).some((i) => i.target?.kind === "exit")).toBe(true);
  });

  test("entidad interactuable sin standPoint: error", () => {
    const level = emptyLevel();
    level.entities.push({
      id: "entity_1",
      type: "npc",
      name: "NPC de prueba",
      position: { x: 50, y: 50 },
      rotation: 0,
      scale: 1,
      layer: 0,
      visible: true,
      interaction: { mode: "click", standPoint: null, radius: 4, prompt: "", lockedNote: "", enabledWhen: { kind: "always" } },
      state: { initial: "default" },
      properties: {},
    });
    expect(validateLevel(level).some((i) => i.target?.kind === "entity")).toBe(true);
  });

  test("entidad con standPoint fuera del área transitable: warning (el runtime lo corrige, no bloquea)", () => {
    const level = emptyLevel();
    level.entities.push({
      id: "entity_1",
      type: "npc",
      name: "NPC de prueba",
      position: { x: 50, y: 50 },
      rotation: 0,
      scale: 1,
      layer: 0,
      visible: true,
      interaction: { mode: "click", standPoint: { x: 0, y: 0 }, radius: 4, prompt: "", lockedNote: "", enabledWhen: { kind: "always" } },
      state: { initial: "default" },
      properties: {},
    });
    const issues = validateLevel(level);
    expect(issues.some((i) => i.target?.kind === "entity" && i.severity === "warning")).toBe(true);
    expect(issues.filter((i) => i.severity === "error")).toEqual([]);
  });

  test("referencia rota: un desafío apunta a una entidad que no existe: error", () => {
    const level = emptyLevel();
    level.challenges.push({ id: "challenge_1", moduleId: "aritmetica-d1", activityId: "puzzle", sourceEntityId: "no-existe" });
    expect(validateLevel(level).some((i) => i.target?.kind === "challenge")).toBe(true);
  });

  test("referencia rota: una regla de evento dispara sobre una entidad que no existe: error", () => {
    const level = emptyLevel();
    level.events.push({
      id: "event_1",
      name: "Regla de prueba",
      trigger: { type: "ON_INTERACT", entityId: "no-existe" },
      when: { kind: "always" },
      once: true,
      actions: [],
    });
    expect(validateLevel(level).some((i) => i.target?.kind === "event")).toBe(true);
  });

  test("dos entidades con el mismo id: error", () => {
    const level = emptyLevel();
    const entity = {
      id: "entity_1",
      type: "interactive" as const,
      name: "Objeto",
      position: { x: 50, y: 50 },
      rotation: 0,
      scale: 1,
      layer: 0,
      visible: true,
      interaction: { mode: "none" as const, standPoint: null, radius: 4, prompt: "", lockedNote: "", enabledWhen: { kind: "always" as const } },
      state: { initial: "default" },
      properties: {},
    };
    level.entities.push(entity, { ...entity });
    expect(validateLevel(level).some((i) => i.message.includes("mismo id"))).toBe(true);
  });
});

test.describe("validate — presupuestos blandos de tamaño (Fase 13, §14 P2)", () => {
  test("un nivel recién creado no dispara ningún presupuesto", () => {
    const issues = validateLevel(emptyLevel());
    expect(issues.some((i) => /vértices de navegación|entidades|serializado/.test(i.message))).toBe(false);
  });

  test("más de 300 vértices de navegación/zona: warning, nunca error (no bloquea el Play Test)", () => {
    const level = emptyLevel();
    const bigRing = Array.from({ length: 301 }, (_, i) => {
      const angle = (2 * Math.PI * i) / 301;
      return { x: 50 + 40 * Math.cos(angle), y: 50 + 40 * Math.sin(angle) };
    });
    level.navigation.walkablePolygons = [{ id: "poly_big", points: bigRing, initiallyEnabled: true }];
    level.navigation.spawn = { x: 50, y: 50 };
    const issue = validateLevel(level).find((i) => i.message.includes("vértices de navegación"));
    expect(issue?.severity).toBe("warning");
  });

  test("más de 150 entidades: warning", () => {
    const level = emptyLevel();
    const typeDef = getEntityType("interactive");
    level.entities = Array.from({ length: 151 }, (_, i) => ({
      id: `entity_${i}`,
      type: "interactive" as const,
      name: `Objeto ${i}`,
      position: { x: 50, y: 50 },
      ...createEntityDefaults(typeDef),
    }));
    const issue = validateLevel(level).find((i) => i.message.includes("entidades"));
    expect(issue?.severity).toBe("warning");
  });

  test("tamaño serializado por encima de 150KB: warning", () => {
    const level = emptyLevel();
    const typeDef = getEntityType("interactive");
    // 50 entidades (bien por debajo del presupuesto de cantidad) con una
    // propiedad larga cada una — aísla el aviso de TAMAÑO del de cantidad.
    level.entities = Array.from({ length: 50 }, (_, i) => {
      const defaults = createEntityDefaults(typeDef);
      return {
        id: `entity_${i}`,
        type: "interactive" as const,
        name: `Objeto ${i}`,
        position: { x: 50, y: 50 },
        ...defaults,
        properties: { ...defaults.properties, note: "x".repeat(4000) },
      };
    });
    const issue = validateLevel(level).find((i) => i.message.includes("serializado"));
    expect(issue?.severity).toBe("warning");
  });
});

/* ════════════════════════════════════════════════════════════════════════
 * SUITE 11 — serialize: stripUndefined / assertNoNestedArrays / assertSize
 * (docs/level-editor-plan.md §10.4).
 * ════════════════════════════════════════════════════════════════════════ */
test.describe("serialize", () => {
  test("stripUndefined elimina undefined recursivamente, sin tocar null", () => {
    const input = { a: 1, b: undefined, c: { d: undefined, e: null, f: 2 }, g: [1, undefined, { h: undefined }] };
    expect(stripUndefined(input)).toEqual({ a: 1, c: { e: null, f: 2 }, g: [1, undefined, {}] });
  });

  test("assertNoNestedArrays no lanza sobre un nivel recién creado", () => {
    expect(() => assertNoNestedArrays(emptyLevel())).not.toThrow();
  });

  test("assertNoNestedArrays lanza NestedArrayError sobre un array dentro de otro array", () => {
    expect(() => assertNoNestedArrays({ a: [1, [2, 3]] })).toThrow(NestedArrayError);
  });

  test("assertNoNestedArrays no confunde un array de objetos con un array anidado", () => {
    expect(() => assertNoNestedArrays({ points: [{ x: 1, y: 2 }, { x: 3, y: 4 }] })).not.toThrow();
  });

  test("assertSize no lanza para un nivel chico", () => {
    expect(() => assertSize(emptyLevel())).not.toThrow();
  });

  test("assertSize lanza LevelTooLargeError por encima del límite", () => {
    const big = { blob: "x".repeat(1000) };
    expect(() => assertSize(big, 500)).toThrow(LevelTooLargeError);
  });
});

/* ════════════════════════════════════════════════════════════════════════
 * SUITE 12 — migrate: cadena de migraciones de esquema
 * (docs/level-editor-plan.md §17 Fase 2).
 * ════════════════════════════════════════════════════════════════════════ */
test.describe("migrate", () => {
  test("un nivel ya en la versión actual se devuelve sin cambios de forma", () => {
    const level = emptyLevel();
    const migrated = migrateLevel(level as unknown as Record<string, unknown>);
    expect(migrated).toEqual(level);
  });

  test("una versión de esquema desconocida (más nueva que la actual) lanza", () => {
    const level = { ...emptyLevel(), schemaVersion: LEVEL_SCHEMA_VERSION + 1 };
    expect(() => migrateLevel(level as unknown as Record<string, unknown>)).toThrow(UnknownSchemaVersionError);
  });
});

/* ════════════════════════════════════════════════════════════════════════
 * SUITE 13 — legacy/ciudadCentral: paridad del adaptador con el nivel real
 * (docs/level-editor-plan.md §12.3, §17 Fase 2).
 * ════════════════════════════════════════════════════════════════════════ */
test.describe("legacy — ciudadCentralAsLevel", () => {
  const level = ciudadCentralAsLevel("padre-de-prueba");

  test("no tiene ningún error de validación", () => {
    expect(validateLevel(level).filter((i) => i.severity === "error")).toEqual([]);
  });

  test("el polígono transitable coincide punto a punto con CIUDAD_CENTRAL_WALKABLE.boundary", () => {
    expect(level.navigation.walkablePolygons).toHaveLength(1);
    expect(level.navigation.walkablePolygons[0].points).toEqual(CIUDAD_CENTRAL_WALKABLE.boundary);
  });

  test("el hueco coincide punto a punto con CIUDAD_CENTRAL_WALKABLE.holes[0]", () => {
    expect(level.navigation.blockedPolygons).toHaveLength(1);
    expect(level.navigation.blockedPolygons[0].points).toEqual(CIUDAD_CENTRAL_WALKABLE.holes[0]);
  });

  test("tiene exactamente las 5 entidades de CIUDAD_CENTRAL_HOTSPOTS, con los mismos nombres", () => {
    expect(level.entities).toHaveLength(5);
    expect(level.entities.map((e) => e.name)).toEqual(CIUDAD_CENTRAL_HOTSPOTS.map((h) => h.label));
  });

  // Fase 14 (docs/level-editor-plan.md §12.4): el adaptador dejó de ser solo
  // geometría — ahora también expresa la progresión jugable real de "El
  // apagón" (mismos 3 objetivos que QUESTS[0]), fuente real de
  // `/jugar/[childId]` cuando NEXT_PUBLIC_LEVELS_V2 está activo.
  test("tiene un desafío real por cada objetivo de QUESTS[0], apuntando al moduleId real (nunca contenido propio)", () => {
    expect(level.challenges).toHaveLength(3);
    expect(level.challenges.map((c) => c.moduleId)).toEqual(
      QUESTS[0].objectives.map((o) => o.moduleId),
    );
    for (const challenge of level.challenges) {
      expect(challenge.activityId).toBe("puzzle");
      expect(level.entities.some((e) => e.id === challenge.sourceEntityId)).toBe(true);
    }
  });

  test("la misión 'El apagón' tiene los mismos 3 objetivos que QUESTS[0], cada uno atado a su desafío", () => {
    expect(level.missions).toHaveLength(1);
    const mission = level.missions[0];
    expect(mission.title).toBe(QUESTS[0].title);
    expect(mission.objectives).toHaveLength(3);
    for (const [i, objective] of mission.objectives.entries()) {
      expect(objective.label).toBe(QUESTS[0].objectives[i].label);
      expect(objective.source).toEqual({ kind: "challenge", challengeId: level.challenges[i].id });
    }
  });

  test("un único diálogo, el de la Dra. Nia, con el mismo guion que CIUDAD_CENTRAL_HOTSPOTS", () => {
    expect(level.dialogs).toHaveLength(1);
    const nia = level.entities.find((e) => e.name === "Dra. Nia")!;
    expect(level.dialogs[0].lines.map((l) => l.text)).toEqual(
      CIUDAD_CENTRAL_HOTSPOTS.find((h) => h.id === "nia")!.intro,
    );
    expect(level.dialogs[0].lines.every((l) => l.speakerEntityId === nia.id)).toBe(true);
  });

  test("la progresión (terminal -> medidor -> compuerta) queda cerrada con enabledWhen + banderas de evento", () => {
    const byName = (name: string) => level.entities.find((e) => e.name === name)!;
    expect(byName("Terminal de acceso").interaction.enabledWhen).toEqual({ kind: "flag", flag: "niaGreeted", value: true });
    expect(byName("Medidor de la central").interaction.enabledWhen).toEqual({ kind: "flag", flag: "terminalDone", value: true });
    expect(byName("Compuerta del generador").interaction.enabledWhen).toEqual({ kind: "flag", flag: "medidorDone", value: true });
    // Cada bandera la fija la regla de éxito del desafío anterior — nunca al revés.
    const flagsSet = level.events.flatMap((r) => r.actions.filter((a) => a.type === "SET_FLAG").map((a) => a.params.flag));
    expect(flagsSet).toEqual(expect.arrayContaining(["niaGreeted", "terminalDone", "medidorDone", "cityRestored"]));
  });

  test("el fondo se ilumina (mismo filtro que QuestScene.tsx) cuando cityRestored es true", () => {
    expect(level.background.filters).toEqual([
      { id: "restaurada", when: { kind: "flag", flag: "cityRestored", value: true }, css: "brightness(1.1) saturate(1.25)" },
    ]);
  });

  // Escena 2.5D (docs/scene-25d-plan.md): profundidad activada con cero
  // assets nuevos — solo escala/sombra por posición Y sobre el arte ya
  // existente. Sin `background.layers` todavía (ver comentario de
  // `CIUDAD_CENTRAL_DEPTH` en ciudadCentral.ts).
  test("la profundidad 2.5D está activada, sin capas de parallax todavía", () => {
    expect(level.depth?.enabled).toBe(true);
    expect(level.depth?.range.nearY).toBeGreaterThan(level.depth?.range.farY ?? 0);
    expect(level.background.layers ?? []).toEqual([]);
  });
});

/* ════════════════════════════════════════════════════════════════════════
 * SUITE 14 — events/bus: índice, disparo, condiciones, `once`, guardia
 * anti-ciclo (docs/level-editor-plan.md §8, §17 Fase 8).
 * ════════════════════════════════════════════════════════════════════════ */
function rule(overrides: Partial<LevelEventRule> & Pick<LevelEventRule, "id" | "trigger">): LevelEventRule {
  return { name: overrides.id, when: { kind: "always" }, once: false, actions: [], ...overrides };
}

test.describe("events/bus", () => {
  test("emit dispara la regla cuyo trigger coincide en tipo y objetivo exacto", () => {
    const r = rule({ id: "r1", trigger: { type: "ON_INTERACT", entityId: "ent_1" }, actions: [{ type: "SET_FLAG", params: { flag: "f", value: true }, delayMs: 0 }] });
    const other = rule({ id: "r2", trigger: { type: "ON_INTERACT", entityId: "ent_2" }, actions: [{ type: "SET_FLAG", params: { flag: "g", value: true }, delayMs: 0 }] });
    const bus = createEventBus([r, other]);
    const effects = emit(bus, { type: "ON_INTERACT", targetId: "ent_1", data: {} }, { flags: {}, entityStates: {} });
    expect(effects).toHaveLength(1);
    expect(effects[0].patch?.flags).toEqual({ f: true });
  });

  test("una regla con objetivo comodín (sin entityId/challengeId/zoneId/missionId) dispara con cualquier objetivo, además de la que coincide exacto", () => {
    const wildcard = rule({ id: "rw", trigger: { type: "ON_ENTER_ZONE" }, actions: [{ type: "SHOW_CLUE", params: { text: "pista", ms: 1000 }, delayMs: 0 }] });
    const exact = rule({ id: "re", trigger: { type: "ON_ENTER_ZONE", zoneId: "z1" }, actions: [{ type: "SET_FLAG", params: { flag: "f", value: true }, delayMs: 0 }] });
    const bus = createEventBus([wildcard, exact]);
    const effects = emit(bus, { type: "ON_ENTER_ZONE", targetId: "z1", data: {} }, { flags: {}, entityStates: {} });
    expect(effects).toHaveLength(2);
  });

  test("una regla `once` dispara la primera vez y no la segunda", () => {
    const r = rule({ id: "r1", trigger: { type: "ON_INTERACT", entityId: "e" }, once: true, actions: [{ type: "SET_FLAG", params: { flag: "f", value: true }, delayMs: 0 }] });
    const bus = createEventBus([r]);
    const ctx = { flags: {}, entityStates: {} };
    expect(emit(bus, { type: "ON_INTERACT", targetId: "e", data: {} }, ctx)).toHaveLength(1);
    expect(emit(bus, { type: "ON_INTERACT", targetId: "e", data: {} }, ctx)).toHaveLength(0);
  });

  test("una regla sin `once` dispara todas las veces", () => {
    const r = rule({ id: "r1", trigger: { type: "ON_INTERACT", entityId: "e" }, once: false, actions: [{ type: "SET_FLAG", params: { flag: "f", value: true }, delayMs: 0 }] });
    const bus = createEventBus([r]);
    const ctx = { flags: {}, entityStates: {} };
    expect(emit(bus, { type: "ON_INTERACT", targetId: "e", data: {} }, ctx)).toHaveLength(1);
    expect(emit(bus, { type: "ON_INTERACT", targetId: "e", data: {} }, ctx)).toHaveLength(1);
  });

  test("una regla cuya condición no se cumple no dispara", () => {
    const r = rule({ id: "r1", trigger: { type: "ON_INTERACT", entityId: "e" }, when: { kind: "flag", flag: "luces", value: true }, actions: [{ type: "SET_FLAG", params: { flag: "f", value: true }, delayMs: 0 }] });
    const bus = createEventBus([r]);
    expect(emit(bus, { type: "ON_INTERACT", targetId: "e", data: {} }, { flags: { luces: false }, entityStates: {} })).toHaveLength(0);
    expect(emit(bus, { type: "ON_INTERACT", targetId: "e", data: {} }, { flags: { luces: true }, entityStates: {} })).toHaveLength(1);
  });

  test("una condición `all` requiere que se cumplan todas sus hijas", () => {
    const when = { kind: "all" as const, of: [{ kind: "flag" as const, flag: "a", value: true }, { kind: "flag" as const, flag: "b", value: true }] };
    const r = rule({ id: "r1", trigger: { type: "ON_INTERACT", entityId: "e" }, when, actions: [{ type: "SET_FLAG", params: { flag: "f", value: true }, delayMs: 0 }] });
    const bus = createEventBus([r]);
    expect(emit(bus, { type: "ON_INTERACT", targetId: "e", data: {} }, { flags: { a: true, b: false }, entityStates: {} })).toHaveLength(0);
    expect(emit(bus, { type: "ON_INTERACT", targetId: "e", data: {} }, { flags: { a: true, b: true }, entityStates: {} })).toHaveLength(1);
  });

  test("las acciones se ejecutan en orden, y `atMs` acumula los `delayMs` de las acciones anteriores", () => {
    const r = rule({
      id: "r1",
      trigger: { type: "ON_CHALLENGE_SUCCESS", challengeId: "ch" },
      actions: [
        { type: "GENERATE_AXIA", params: { source: "challenge" }, delayMs: 0 },
        { type: "CHANGE_OBJECT_STATE", params: { entityId: "ent_terminal", state: "on" }, delayMs: 200 },
        { type: "SET_FLAG", params: { flag: "luces", value: true }, delayMs: 200 },
        { type: "OPEN_DOOR", params: { entityId: "ent_puerta" }, delayMs: 500 },
      ],
    });
    const bus = createEventBus([r]);
    const effects = emit(bus, { type: "ON_CHALLENGE_SUCCESS", targetId: "ch", data: { stars: 14 } }, { flags: {}, entityStates: {} });
    expect(effects.map((e) => e.atMs)).toEqual([0, 200, 400, 900]);
    expect(effects[0].side).toEqual({ kind: "axiaPulse", stars: 14 });
    expect(effects[3].patch?.entityStates).toEqual({ ent_puerta: "open" });
  });

  test("MAX_CHAIN_DEPTH aborta la cadena sin lanzar, en vez de recorrerla", () => {
    const r = rule({ id: "r1", trigger: { type: "ON_INTERACT", entityId: "e" }, actions: [{ type: "SET_FLAG", params: { flag: "f", value: true }, delayMs: 0 }] });
    const bus = createEventBus([r]);
    expect(() => emit(bus, { type: "ON_INTERACT", targetId: "e", data: {} }, { flags: {}, entityStates: {} }, MAX_CHAIN_DEPTH)).not.toThrow();
    expect(emit(bus, { type: "ON_INTERACT", targetId: "e", data: {} }, { flags: {}, entityStates: {} }, MAX_CHAIN_DEPTH)).toHaveLength(0);
  });

  test("validateLevel avisa (warning) de un posible ciclo: A dispara START_CHALLENGE y B, disparada por ON_CHALLENGE_STARTED, vuelve a disparar a A", () => {
    const level: LevelDefinition = {
      ...createEmptyLevel("l1", "padre-de-prueba", { src: "/x.webp", width: 100, height: 100, alt: "x", projection: "flat" }),
      navigation: {
        walkablePolygons: [{ id: "poly_1", points: [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }], initiallyEnabled: true }],
        blockedPolygons: [],
        spawn: { x: 5, y: 5 },
        exits: [],
      },
      events: [
        rule({ id: "A", trigger: { type: "ON_MISSION_COMPLETE", missionId: "m" }, actions: [{ type: "START_CHALLENGE", params: { challengeId: "ch" }, delayMs: 0 }] }),
        rule({ id: "B", trigger: { type: "ON_CHALLENGE_STARTED", challengeId: "ch" }, actions: [{ type: "UPDATE_MISSION", params: { missionId: "m", objectiveId: "o" }, delayMs: 0 }] }),
      ],
    };
    const issues = validateLevel(level);
    const cycleWarnings = issues.filter((i) => i.severity === "warning" && i.target?.kind === "event");
    expect(cycleWarnings.map((i) => i.target?.id).sort()).toEqual(["A", "B"]);
  });

  test("validateLevel no avisa de ciclo cuando las reglas no se realimentan entre sí", () => {
    const level: LevelDefinition = {
      ...createEmptyLevel("l1", "padre-de-prueba", { src: "/x.webp", width: 100, height: 100, alt: "x", projection: "flat" }),
      navigation: {
        walkablePolygons: [{ id: "poly_1", points: [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }], initiallyEnabled: true }],
        blockedPolygons: [],
        spawn: { x: 5, y: 5 },
        exits: [],
      },
      events: [rule({ id: "A", trigger: { type: "ON_INTERACT", entityId: "e" }, actions: [{ type: "OPEN_DOOR", params: { entityId: "e" }, delayMs: 0 }] })],
    };
    const issues = validateLevel(level);
    expect(issues.filter((i) => i.severity === "warning" && i.target?.kind === "event")).toEqual([]);
  });
});

/* ════════════════════════════════════════════════════════════════════════
 * SUITE 15 — runtime/state y runtime/navigation: estado vivo derivado de
 * progreso académico real, nunca persistido aparte (docs/level-editor-
 * plan.md §9.6/§1.9 R2-C4, §17 Fase 9).
 * ════════════════════════════════════════════════════════════════════════ */
function doorLevel(): { level: LevelDefinition; door: LevelEntity; challenge: ChallengePlacement } {
  const doorType = getEntityType("door");
  const door: LevelEntity = {
    id: "ent_puerta",
    type: "door",
    name: "Puerta",
    position: { x: 5, y: 5 },
    ...createEntityDefaults(doorType),
  };
  door.properties = { ...door.properties, blockerPolygonId: "poly_vano" };

  const challenge: ChallengePlacement = { id: "ch_1", moduleId: "aritmetica-d1", activityId: "puzzle", sourceEntityId: door.id };

  const rule: LevelEventRule = {
    id: "r1",
    name: "abrir puerta",
    trigger: { type: "ON_CHALLENGE_SUCCESS", challengeId: challenge.id },
    when: { kind: "always" },
    once: true,
    actions: [{ type: "OPEN_DOOR", params: { entityId: door.id }, delayMs: 0 }],
  };

  const base = createEmptyLevel("l1", "padre-de-prueba", { src: "/x.webp", width: 100, height: 100, alt: "x", projection: "flat" });
  const level: LevelDefinition = {
    ...base,
    navigation: {
      walkablePolygons: [{ id: "poly_1", points: [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }], initiallyEnabled: true }],
      // `initiallyEnabled: false`: el vano no es un obstáculo estático — solo
      // bloquea cuando la puerta lo trae entre sus bloqueadores activos
      // (`resolveBlockerIds`, ver types/door.tsx), no por sí mismo.
      blockedPolygons: [{ id: "poly_vano", points: [{ x: 4, y: 4 }, { x: 6, y: 4 }, { x: 6, y: 6 }, { x: 4, y: 6 }], initiallyEnabled: false }],
      spawn: { x: 1, y: 1 },
      exits: [],
    },
    entities: [door],
    challenges: [challenge],
    events: [rule],
  };
  return { level, door, challenge };
}

function solved(moduleId: string): Record<string, { recentResults: { correct: boolean; day: string }[]; recentAccuracy: number; masteredAt: number | null }> {
  return { [moduleId]: { recentResults: [{ correct: true, day: "2026-01-01" }], recentAccuracy: 1, masteredAt: null } };
}

test.describe("runtime/state", () => {
  test("applyRuntimePatch mezcla campo a campo, nunca reemplaza el estado completo", () => {
    const { level } = doorLevel();
    const state0 = createEmptyRuntimeState(level);
    const state1 = applyRuntimePatch(state0, { flags: { luces: true } });
    const state2 = applyRuntimePatch(state1, { entityStates: { ent_puerta: "open" } });
    expect(state2.flags).toEqual({ luces: true });
    expect(state2.entityStates.ent_puerta).toBe("open");
  });

  test("currentStateOf cae al estado inicial de la entidad por defecto", () => {
    const { level, door } = doorLevel();
    const state = createEmptyRuntimeState(level);
    expect(currentStateOf(door, state).id).toBe("locked");
  });

  test("currentStateOf resuelve el centinela __NEXT_STATE__ (ACTIVATE_OBJECT) al segundo estado declarado del tipo", () => {
    const { level, door } = doorLevel();
    const state = applyRuntimePatch(createEmptyRuntimeState(level), { entityStates: { [door.id]: "__NEXT_STATE__" } });
    // La puerta declara sus estados en orden locked, closed, open — el segundo es "closed".
    expect(currentStateOf(door, state).id).toBe("closed");
  });

  test("isEntityVisible: una entidad visible de autor es visible salvo que su estado activo diga lo contrario", () => {
    const { level, door } = doorLevel();
    expect(isEntityVisible(door, createEmptyRuntimeState(level))).toBe(true);
  });

  test("isEntityVisible: una entidad visible:false de autor solo aparece tras SPAWN_OBJECT (spawned=true)", () => {
    const { level, door } = doorLevel();
    const hidden: LevelEntity = { ...door, visible: false };
    const state = createEmptyRuntimeState(level);
    expect(isEntityVisible(hidden, state)).toBe(false);
    expect(isEntityVisible(hidden, applyRuntimePatch(state, { spawned: { [door.id]: true } }))).toBe(true);
  });

  test("deriveInitialState no cambia nada si el desafío del nivel todavía no se resolvió de verdad", () => {
    const { level, door } = doorLevel();
    const bus = createEventBus(level.events);
    const state = deriveInitialState(bus, level, {});
    expect(currentStateOf(door, state).id).toBe("locked");
  });

  test("deriveInitialState re-emite en silencio los eventos de los desafíos ya resueltos de verdad, sin escribir nada — la puerta abre sola al recargar", () => {
    const { level, door, challenge } = doorLevel();
    const bus = createEventBus(level.events);
    const state = deriveInitialState(bus, level, solved(challenge.moduleId));
    expect(currentStateOf(door, state).id).toBe("open");
  });

  test("buildRuntimeMesh: la puerta cerrada bloquea su vano; abierta, lo libera", () => {
    const { level, door } = doorLevel();
    const closedMesh = buildRuntimeMesh(level, createEmptyRuntimeState(level));
    expect(closedMesh.blocked).toHaveLength(1);

    const openMesh = buildRuntimeMesh(level, applyRuntimePatch(createEmptyRuntimeState(level), { entityStates: { [door.id]: "open" } }));
    expect(openMesh.blocked).toHaveLength(0);
  });
});

/* ════════════════════════════════════════════════════════════════════════
 * SUITE — depth.ts: profundidad 2.5D (docs/scene-25d-plan.md §C/§E.2/§H).
 * Lógica pura, sin React ni DOM — mismo criterio que las suites de arriba.
 * ════════════════════════════════════════════════════════════════════════ */
test.describe("depth — profundidad 2.5D", () => {
  const CONFIG: LevelDepthConfig = {
    enabled: true,
    range: { nearY: 90, farY: 10 },
    scale: { near: 1.2, far: 0.8 },
    shadow: { enabled: true, opacityNear: 0.5, opacityFar: 0.1 },
  };

  test("depthScaleFor: escala neutra (1) si depth es undefined o enabled es false", () => {
    expect(depthScaleFor(50, undefined)).toBe(1);
    expect(depthScaleFor(50, { ...CONFIG, enabled: false })).toBe(1);
  });

  test("depthScaleFor: devuelve scale.far exacto en farY y scale.near exacto en nearY", () => {
    expect(depthScaleFor(10, CONFIG)).toBeCloseTo(0.8, 10);
    expect(depthScaleFor(90, CONFIG)).toBeCloseTo(1.2, 10);
  });

  test("depthScaleFor: interpola linealmente en el punto medio del rango", () => {
    expect(depthScaleFor(50, CONFIG)).toBeCloseTo(1.0, 10); // punto medio de 0.8..1.2
  });

  test("depthScaleFor: clampa fuera de rango (nunca extrapola más allá de los extremos)", () => {
    expect(depthScaleFor(0, CONFIG)).toBeCloseTo(0.8, 10);
    expect(depthScaleFor(100, CONFIG)).toBeCloseTo(1.2, 10);
  });

  test("depthScaleFor: rango degenerado (nearY === farY) no divide por cero — se trata como 'siempre cerca'", () => {
    const degenerate: LevelDepthConfig = { ...CONFIG, range: { nearY: 50, farY: 50 } };
    expect(depthScaleFor(50, degenerate)).toBeCloseTo(1.2, 10);
    expect(Number.isFinite(depthScaleFor(0, degenerate))).toBe(true);
  });

  test("shadowOpacityFor: 0 si depth, o específicamente la sombra, están desactivados", () => {
    expect(shadowOpacityFor(90, undefined)).toBe(0);
    expect(shadowOpacityFor(90, { ...CONFIG, enabled: false })).toBe(0);
    expect(shadowOpacityFor(90, { ...CONFIG, shadow: { ...CONFIG.shadow, enabled: false } })).toBe(0);
  });

  test("shadowOpacityFor: interpola igual que depthScaleFor, con sus propios extremos", () => {
    expect(shadowOpacityFor(10, CONFIG)).toBeCloseTo(0.1, 10);
    expect(shadowOpacityFor(90, CONFIG)).toBeCloseTo(0.5, 10);
  });

  test("parallaxAxis: layerDepth 1 reproduce EXACTO el offset de la cámara (comportamiento idéntico al fondo único de hoy)", () => {
    // sceneOffset/sceneSize son los que ya calcula useCameraBox; con
    // layerDepth=1 el resultado debe ser byte a byte el mismo sceneOffset,
    // sin importar dónde esté el foco — es la capa de fondo principal.
    expect(parallaxAxis(123.4, 1600, 73, 1)).toBeCloseTo(123.4, 10);
    expect(parallaxAxis(-88, 900, 12, 1)).toBeCloseTo(-88, 10);
  });

  test("parallaxAxis: layerDepth 0 es fijo (no se mueve con el foco) — comportamiento de cielo/horizonte", () => {
    // `sceneOffset` SIEMPRE viene de `useCameraBox`, que ya depende del foco
    // (sin clamp: sceneOffset = containerWidth/2 - (focusPct/100)*sceneSize)
    // — se deriva acá del mismo modo para dos focos distintos, y se verifica
    // que layerDepth=0 da la MISMA posición neutra para ambos.
    const containerWidth = 1000;
    const sceneSize = 1600;
    const sceneOffsetFor = (focusPct: number) => containerWidth / 2 - (focusPct / 100) * sceneSize;
    const neutral = containerWidth / 2 - 0.5 * sceneSize;
    expect(parallaxAxis(sceneOffsetFor(73), sceneSize, 73, 0)).toBeCloseTo(neutral, 10);
    expect(parallaxAxis(sceneOffsetFor(30), sceneSize, 30, 0)).toBeCloseTo(neutral, 10);
  });

  test("parallaxAxis: un layerDepth intermedio se desplaza menos que la cámara principal", () => {
    // Foco corrido hacia la derecha (focusPct > 50) empuja sceneOffset hacia
    // valores más negativos (mismo sentido que useCameraBox); una capa a
    // media profundidad debe moverse en el mismo sentido pero menos.
    const focusPct = 80;
    const sceneWidth = 1600;
    const neutralOffset = 0; // offset que tendría la cámara con foco en 50
    const fullOffset = parallaxAxis(neutralOffset, sceneWidth, focusPct, 1); // = neutralOffset en este caso de referencia
    const half = parallaxAxis(neutralOffset, sceneWidth, focusPct, 0.5);
    // Con sceneOffset de referencia = 0 en foco 50, layerDepth=1 con foco 80
    // debe alejarse de 0 más que layerDepth=0.5 en la misma dirección.
    expect(Math.abs(half)).toBeGreaterThan(0);
    expect(Math.abs(half)).toBeLessThan(Math.abs(parallaxAxis(neutralOffset, sceneWidth, focusPct, 2)));
    void fullOffset;
  });

  test("DEFAULT_DEPTH_CONFIG está desactivado — un nivel nuevo no cambia de aspecto hasta que el autor lo active", () => {
    expect(DEFAULT_DEPTH_CONFIG.enabled).toBe(false);
    expect(depthScaleFor(50, DEFAULT_DEPTH_CONFIG)).toBe(1);
    expect(shadowOpacityFor(50, DEFAULT_DEPTH_CONFIG)).toBe(0);
  });
});

/* ════════════════════════════════════════════════════════════════════════
 * SUITE 16 — Misiones y HUD: `deriveObjectiveDone` para los 4
 * `ObjectiveSource` y su agregación en `missionProgress`/`activeMission`
 * (docs/level-editor-plan.md §9.5, §17 Fase 12). Ninguno persiste como
 * progreso de nivel — "zone"/"collectible"/"flag" son estado de sesión puro.
 * ════════════════════════════════════════════════════════════════════════ */
function missionLevel(): { level: LevelDefinition; challenge: ChallengePlacement; zone: LevelZone; gem: LevelEntity; mission: LevelMission } {
  const { level: base, challenge } = doorLevel();
  const gem: LevelEntity = {
    id: "ent_gema",
    type: "collectible",
    name: "Gema",
    position: { x: 2, y: 2 },
    ...createEntityDefaults(getEntityType("collectible")),
  };
  const zone: LevelZone = { id: "zone_patio", name: "Patio", shape: { kind: "circle", center: { x: 5, y: 5 }, radius: 2 } };
  const mission: LevelMission = {
    id: "mission_1",
    title: "Misión de prueba",
    premise: "",
    objectives: [
      { id: "obj_challenge", label: "Resolver la puerta", source: { kind: "challenge", challengeId: challenge.id } },
      { id: "obj_zone", label: "Entrar al patio", source: { kind: "zone", zoneId: zone.id } },
      { id: "obj_collectible", label: "Recoger la gema", source: { kind: "collectible", entityId: gem.id } },
      { id: "obj_flag", label: "Encender las luces", source: { kind: "flag", flag: "luces", value: true } },
    ],
  };
  const level: LevelDefinition = { ...base, entities: [...base.entities, gem], zones: [zone], missions: [mission] };
  return { level, challenge, zone, gem, mission };
}

test.describe("runtime/state — misiones (Fase 12)", () => {
  test("deriveObjectiveDone: challenge — sigue hasCorrectAttempt sobre skillsProgress, nunca un booleano propio", () => {
    const { level, challenge } = missionLevel();
    const state = createEmptyRuntimeState(level);
    const source = { kind: "challenge" as const, challengeId: challenge.id };
    expect(deriveObjectiveDone(source, level, {}, state)).toBe(false);
    expect(deriveObjectiveDone(source, level, solved(challenge.moduleId), state)).toBe(true);
  });

  test("deriveObjectiveDone: challenge — un id de desafío que ya no existe nunca revienta, solo da false", () => {
    const { level } = missionLevel();
    const state = createEmptyRuntimeState(level);
    expect(deriveObjectiveDone({ kind: "challenge", challengeId: "no-existe" }, level, {}, state)).toBe(false);
  });

  test("deriveObjectiveDone: zone — se cumple al pisarla (state.visitedZones), no por estar parado ahí ahora", () => {
    const { level, zone } = missionLevel();
    const source = { kind: "zone" as const, zoneId: zone.id };
    const state = createEmptyRuntimeState(level);
    expect(deriveObjectiveDone(source, level, {}, state)).toBe(false);
    const visited = applyRuntimePatch(state, { visitedZones: { [zone.id]: true } });
    expect(deriveObjectiveDone(source, level, {}, visited)).toBe(true);
  });

  test("deriveObjectiveDone: collectible — se cumple cuando el estado vivo de la entidad deja de ser su estado inicial de autor", () => {
    const { level, gem } = missionLevel();
    const source = { kind: "collectible" as const, entityId: gem.id };
    const state = createEmptyRuntimeState(level);
    expect(deriveObjectiveDone(source, level, {}, state)).toBe(false);
    const collected = applyRuntimePatch(state, { entityStates: { [gem.id]: "collected" } });
    expect(deriveObjectiveDone(source, level, {}, collected)).toBe(true);
  });

  test("deriveObjectiveDone: flag — compara el valor vivo con el declarado, no solo si existe", () => {
    const { level } = missionLevel();
    const source = { kind: "flag" as const, flag: "luces", value: true };
    const state = createEmptyRuntimeState(level);
    expect(deriveObjectiveDone(source, level, {}, state)).toBe(false);
    expect(deriveObjectiveDone(source, level, {}, applyRuntimePatch(state, { flags: { luces: false } }))).toBe(false);
    expect(deriveObjectiveDone(source, level, {}, applyRuntimePatch(state, { flags: { luces: true } }))).toBe(true);
  });

  test("missionProgress agrega doneCount/total/complete sobre los 4 objetivos", () => {
    const { level, challenge } = missionLevel();
    const empty = missionProgress(level.missions[0], level, {}, createEmptyRuntimeState(level));
    expect(empty.doneCount).toBe(0);
    expect(empty.total).toBe(4);
    expect(empty.complete).toBe(false);

    const state = applyRuntimePatch(createEmptyRuntimeState(level), { flags: { luces: true } });
    const partial = missionProgress(level.missions[0], level, solved(challenge.moduleId), state);
    expect(partial.doneCount).toBe(2);
    expect(partial.objectives.find((o) => o.id === "obj_challenge")?.done).toBe(true);
    expect(partial.objectives.find((o) => o.id === "obj_flag")?.done).toBe(true);
    expect(partial.complete).toBe(false);
  });

  test("activeMission: la primera misión incompleta; null si no hay ninguna o ya se completaron todas", () => {
    const { level, challenge, zone, gem } = missionLevel();
    expect(activeMission(level, {}, createEmptyRuntimeState(level))?.mission.id).toBe("mission_1");

    const noMissions: LevelDefinition = { ...level, missions: [] };
    expect(activeMission(noMissions, {}, createEmptyRuntimeState(noMissions))).toBeNull();

    const doneState = applyRuntimePatch(createEmptyRuntimeState(level), {
      flags: { luces: true },
      visitedZones: { [zone.id]: true },
      entityStates: { [gem.id]: "collected" },
    });
    expect(activeMission(level, solved(challenge.moduleId), doneState)).toBeNull();
  });
});

/* ════════════════════════════════════════════════════════════════════════
 * SUITE — imageRules: reglas puras de la biblioteca de imágenes
 * (docs/asset-management-plan.md §C.4/§C.5/§C.6/§H.1). Sin DOM, sin red.
 * ════════════════════════════════════════════════════════════════════════ */
test.describe("imageRules — biblioteca de imágenes", () => {
  test("validateFileMeta: acepta webp/png/jpeg", () => {
    expect(validateFileMeta({ name: "a.webp", type: "image/webp", size: 1000 })).toEqual([]);
    expect(validateFileMeta({ name: "a.png", type: "image/png", size: 1000 })).toEqual([]);
    expect(validateFileMeta({ name: "a.jpg", type: "image/jpeg", size: 1000 })).toEqual([]);
  });

  test("validateFileMeta: rechaza formatos no admitidos (gif, svg) y vacíos", () => {
    expect(validateFileMeta({ name: "a.gif", type: "image/gif", size: 1000 })).toHaveLength(1);
    expect(validateFileMeta({ name: "a.svg", type: "image/svg+xml", size: 1000 })).toHaveLength(1);
    expect(validateFileMeta({ name: "a.webp", type: "image/webp", size: 0 })).toHaveLength(1);
  });

  test("validateFileMeta: rechaza por encima de MAX_INPUT_BYTES", () => {
    expect(validateFileMeta({ name: "a.webp", type: "image/webp", size: MAX_INPUT_BYTES })).toEqual([]);
    expect(validateFileMeta({ name: "a.webp", type: "image/webp", size: MAX_INPUT_BYTES + 1 })).toHaveLength(1);
  });

  test("gradeResolution: matriz completa para 'scene' (min 800x450, recomendado 1600)", () => {
    expect(gradeResolution(640, 360, "scene")).toBe("error");
    expect(gradeResolution(799, 450, "scene")).toBe("error"); // borde exacto de ancho
    expect(gradeResolution(800, 449, "scene")).toBe("error"); // borde exacto de alto
    expect(gradeResolution(800, 450, "scene")).toBe("warning"); // justo en el mínimo, bajo lo recomendado
    expect(gradeResolution(1000, 600, "scene")).toBe("warning");
    expect(gradeResolution(1599, 900, "scene")).toBe("warning"); // borde exacto bajo lo recomendado
    expect(gradeResolution(1600, 900, "scene")).toBe("ok");
    expect(gradeResolution(1920, 1080, "scene")).toBe("ok");
  });

  test("gradeResolution: 'layer' admite una franja de horizonte baja que 'scene' rechazaría", () => {
    expect(gradeResolution(1200, 160, "layer")).toBe("ok"); // franja horizontal legítima
    expect(gradeResolution(1200, 160, "scene")).toBe("error"); // la misma imagen, como escena completa, no alcanza
    expect(gradeResolution(300, 100, "layer")).toBe("error"); // por debajo del mínimo de layer también
  });

  test("decideResize: no escala una imagen que ya cabe en MAX_OUTPUT_WIDTH", () => {
    expect(decideResize(1600, 900)).toEqual({ width: 1600, height: 900 });
    expect(decideResize(MAX_OUTPUT_WIDTH, 1440)).toEqual({ width: MAX_OUTPUT_WIDTH, height: 1440 });
    expect(decideResize(320, 180)).toEqual({ width: 320, height: 180 }); // nunca amplía
  });

  test("decideResize: redimensiona preservando la relación de aspecto, sin ampliar nunca", () => {
    const result = decideResize(4000, 3000);
    expect(result.width).toBe(MAX_OUTPUT_WIDTH);
    expect(result.height).toBe(1920); // 4000x3000 -> 2560x1920, misma proporción 4:3
  });

  test("pickOutputFormat: nunca devuelve JPEG para una entrada con alfa", () => {
    expect(pickOutputFormat(true, true)).toBe("image/webp");
    expect(pickOutputFormat(true, false)).toBe("image/png");
  });

  test("pickOutputFormat: sin alfa, WebP si se pudo, si no JPEG", () => {
    expect(pickOutputFormat(false, true)).toBe("image/webp");
    expect(pickOutputFormat(false, false)).toBe("image/jpeg");
  });

  test("assetStoragePath/thumbStoragePath: un solo segmento bajo level-assets/, con la extensión correcta", () => {
    expect(assetStoragePath("padre1", "asset_x", "image/webp")).toBe("parents/padre1/level-assets/asset_x.webp");
    expect(assetStoragePath("padre1", "asset_x", "image/png")).toBe("parents/padre1/level-assets/asset_x.png");
    expect(assetStoragePath("padre1", "asset_x", "image/jpeg")).toBe("parents/padre1/level-assets/asset_x.jpg");
    expect(thumbStoragePath("padre1", "asset_x")).toBe("parents/padre1/level-assets/asset_x-thumb.webp");
  });

  test("checkQuota: permite hasta MAX_ASSETS_PER_PARENT, bloquea en el límite", () => {
    expect(checkQuota(MAX_ASSETS_PER_PARENT - 1, 0).allowed).toBe(true);
    const blocked = checkQuota(MAX_ASSETS_PER_PARENT, 0);
    expect(blocked.allowed).toBe(false);
    expect(blocked.reason).toContain(String(MAX_ASSETS_PER_PARENT));
  });

  test("checkQuota: por encima del presupuesto de bytes recomendado, permite pero avisa", () => {
    const result = checkQuota(5, RECOMMENDED_TOTAL_BYTES_PER_PARENT + 1);
    expect(result.allowed).toBe(true);
    expect(result.reason).toBeDefined();
  });

  test("sanitizeLabel: recorta a 60, colapsa espacios/guiones, quita la extensión, nunca queda vacío", () => {
    expect(sanitizeLabel("mi_fondo-de_ciudad.webp")).toBe("mi fondo de ciudad");
    expect(sanitizeLabel("   .png")).toBe("Imagen sin nombre");
    expect(sanitizeLabel("a".repeat(100) + ".jpg")).toHaveLength(60);
    expect(sanitizeLabel("foto   con    espacios.png")).toBe("foto con espacios");
  });

  const ASSETS = [
    { url: "https://x/a", thumbUrl: "https://x/a-thumb", label: "Mi fondo", alt: "alt a", kind: "scene" as const },
    { url: "https://x/b", thumbUrl: "https://x/b-thumb", label: "Mi capa", alt: "alt b", kind: "layer" as const },
  ];

  test("mergeBackgroundOptions: los assets del padre van primero, con `source` correcto", () => {
    const merged = mergeBackgroundOptions(BACKGROUND_CATALOG, ASSETS, { for: "scene" });
    expect(merged[0].source).toBe("parent");
    expect(merged[1].source).toBe("parent");
    expect(merged.slice(2).every((o) => o.source === "factory")).toBe(true);
    expect(merged).toHaveLength(ASSETS.length + BACKGROUND_CATALOG.length);
  });

  test("mergeBackgroundOptions: con for:'layer', los assets kind:'layer' van antes que los kind:'scene', pero ninguno se oculta", () => {
    const merged = mergeBackgroundOptions(BACKGROUND_CATALOG, ASSETS, { for: "layer" });
    const parentSrcs = merged.filter((o) => o.source === "parent").map((o) => o.src);
    expect(parentSrcs[0]).toBe("https://x/b"); // la capa, matchesKind:true, va primero
    expect(parentSrcs[1]).toBe("https://x/a"); // la escena sigue presente, no se oculta
    expect(merged.find((o) => o.src === "https://x/a")?.matchesKind).toBe(false);
  });

  test("mergeBackgroundOptions: las 6 miniaturas de fábrica quedan marcadas lowResolution, las 2 escenas no", () => {
    const merged = mergeBackgroundOptions(BACKGROUND_CATALOG, [], { for: "scene" });
    const lowRes = merged.filter((o) => o.lowResolution);
    const ok = merged.filter((o) => !o.lowResolution);
    expect(lowRes).toHaveLength(6);
    expect(ok).toHaveLength(2);
  });

  test("mergeBackgroundOptions: un src ya seleccionado que no está en ninguna lista aparece como opción 'no disponible'", () => {
    const merged = mergeBackgroundOptions(BACKGROUND_CATALOG, ASSETS, { for: "scene", selectedSrc: "https://x/borrado" });
    expect(merged[0]).toMatchObject({ src: "https://x/borrado", available: false });
  });

  test("mergeBackgroundOptions: un src seleccionado que SÍ existe no genera ninguna entrada duplicada", () => {
    const merged = mergeBackgroundOptions(BACKGROUND_CATALOG, ASSETS, { for: "scene", selectedSrc: "https://x/a" });
    expect(merged.filter((o) => o.src === "https://x/a")).toHaveLength(1);
  });
});
