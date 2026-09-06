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
  type NavigationMesh,
  type Point,
  type Polygon,
} from "@/lib/world/navmesh";
import { CIUDAD_CENTRAL_HOTSPOTS, CIUDAD_CENTRAL_WALKABLE } from "@/lib/world/questScene";
import { createEmptyLevel } from "@/lib/level/defaults";
import { ciudadCentralAsLevel } from "@/lib/level/legacy/ciudadCentral";
import { UnknownSchemaVersionError, migrateLevel } from "@/lib/level/migrate";
import { LEVEL_SCHEMA_VERSION, type LevelDefinition } from "@/lib/level/schema";
import { LevelTooLargeError, NestedArrayError, assertNoNestedArrays, assertSize, stripUndefined } from "@/lib/level/serialize";
import { validateLevel } from "@/lib/level/validate";

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
    level.navigation.exits.push({ id: "exit_1", polygon: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }], targetHref: "/jugar", label: "Salida" });
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

  test("no referencia ningún desafío, diálogo ni evento propio (es solo geometría + entidades)", () => {
    expect(level.challenges).toEqual([]);
    expect(level.dialogs).toEqual([]);
    expect(level.events).toEqual([]);
  });
});
