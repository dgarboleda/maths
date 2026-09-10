/**
 * Geometría de "suelo caminable" para escenas de exploración libre (Ciudad
 * Central es la primera; docs/guion-narrativa-math-quest.md §18 prevé 7 más).
 * Todo en % de la imagen de fondo de la escena — el mismo sistema de
 * coordenadas que ya usan los hotspots (`x`/`y`/`standX`/`standY` en
 * questScene.ts) — para que trazar un polígono a mano sea tan directo como ya
 * lo es fijar la posición de un hotspot.
 *
 * Reemplaza el clamp rectangular que había antes en `QuestScene.wander()`:
 * en vez de "cualquier punto dentro de este rectángulo es válido", una
 * `WalkableArea` es un polígono real (el contorno de la plaza) con huecos
 * (fuente, edificios) que el avatar no puede pisar ni atravesar. El
 * pathfinding es un grafo de visibilidad clásico (nodos = vértices de los
 * polígonos, aristas = segmentos que no cruzan ningún obstáculo) + Dijkstra:
 * da la ruta más corta real dentro de una región con huecos, con mucho menos
 * código que triangular una navmesh, y a la escala de un puñado de polígonos
 * trazados a mano (decenas de vértices) es sub-milisegundo.
 *
 * `NavigationMesh` (más abajo) generaliza `WalkableArea` a N regiones
 * transitables y M bloqueadas independientes — lo que necesita el Level
 * Editor (docs/level-editor-plan.md §6) para niveles con varias salas y
 * puertas que cambian la navegación en tiempo real. `WalkableArea` y las
 * funciones que ya usaba `QuestScene` (`isWalkable`, `findPath`,
 * `nearestWalkablePoint`) NO se eliminan: quedan como adaptadores de una
 * línea sobre las funciones nuevas, así que Ciudad Central sigue funcionando
 * exactamente igual sin tocar una sola línea fuera de este archivo.
 */

export interface Point {
  x: number;
  y: number;
}

/** Polígono simple (sin autointersecciones), ≥3 vértices, en % de imagen. */
export type Polygon = Point[];

export interface WalkableArea {
  /** Contorno exterior de la zona pisable. */
  boundary: Polygon;
  /** Obstáculos dentro del contorno (fuente, edificios, escaleras...). */
  holes: Polygon[];
}

function dedupeRing(poly: Polygon, eps: number): Polygon {
  const result: Point[] = [];
  for (const p of poly) {
    const prev = result[result.length - 1];
    if (!prev || Math.hypot(p.x - prev.x, p.y - prev.y) >= eps) result.push(p);
  }
  // El anillo cierra: el último punto también puede haber quedado pegado al primero.
  while (result.length > 3 && Math.hypot(result[0].x - result[result.length - 1].x, result[0].y - result[result.length - 1].y) < eps) {
    result.pop();
  }
  return result;
}

/**
 * Quita, de cada anillo (contorno y cada hueco), los puntos consecutivos a
 * menos de `eps` de distancia entre sí. Un vértice repetido/casi repetido
 * crea una arista de longitud ~0, que rompe la asunción de "polígono
 * simple" en la que confían `pointInPolygon`/el grafo de visibilidad — se
 * llama una sola vez al cargar la escena, no en cada `findPath`, para no
 * repetir el trabajo en cada clic.
 */
export function dedupeArea(area: WalkableArea, eps = 0.05): WalkableArea {
  return { boundary: dedupeRing(area.boundary, eps), holes: area.holes.map((h) => dedupeRing(h, eps)) };
}

const EPS = 1e-9;

function cross(o: Point, a: Point, b: Point): number {
  return (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
}

function orientation(p: Point, q: Point, r: Point): -1 | 0 | 1 {
  const v = cross(p, q, r);
  if (v > EPS) return 1;
  if (v < -EPS) return -1;
  return 0;
}

/** Asume que p, q, r son colineales: ¿q cae dentro del segmento p-r? */
function onSegment(p: Point, q: Point, r: Point): boolean {
  return (
    Math.min(p.x, r.x) - EPS <= q.x &&
    q.x <= Math.max(p.x, r.x) + EPS &&
    Math.min(p.y, r.y) - EPS <= q.y &&
    q.y <= Math.max(p.y, r.y) + EPS
  );
}

/**
 * Test clásico de intersección de segmentos (4 orientaciones + los 4 casos
 * colineales). "proper" es un cruce franco en el interior de ambos
 * segmentos; "touch" es un contacto en un extremo o solapamiento colineal;
 * "none" es ningún contacto. La distinción importa para el grafo de
 * visibilidad: una arista puede *tocar* un vértice ajeno sin que eso la
 * invalide, pero nunca puede *cruzar* un lado del polígono.
 */
export function segmentsIntersect(p1: Point, p2: Point, p3: Point, p4: Point): "proper" | "touch" | "none" {
  const o1 = orientation(p1, p2, p3);
  const o2 = orientation(p1, p2, p4);
  const o3 = orientation(p3, p4, p1);
  const o4 = orientation(p3, p4, p2);

  if (o1 !== o2 && o3 !== o4 && o1 !== 0 && o2 !== 0 && o3 !== 0 && o4 !== 0) return "proper";

  if (o1 === 0 && onSegment(p1, p3, p2)) return "touch";
  if (o2 === 0 && onSegment(p1, p4, p2)) return "touch";
  if (o3 === 0 && onSegment(p3, p1, p4)) return "touch";
  if (o4 === 0 && onSegment(p3, p2, p4)) return "touch";

  return "none";
}

function edges(poly: Polygon): [Point, Point][] {
  return poly.map((p, i) => [p, poly[(i + 1) % poly.length]]);
}

/**
 * ¿El polígono es simple (ningún lado se cruza con otro no adyacente)? Dos
 * lados adyacentes comparten un vértice a propósito (eso es "tocar", no
 * "cruzar") — solo los pares de lados no adyacentes se prueban. Un polígono
 * con menos de 3 vértices nunca es simple. La usa `validateLevel` (Level
 * Editor, Fase 2) para avisar en vivo si un polígono dibujado a mano queda
 * autointersecante.
 */
export function polygonIsSimple(poly: Polygon): boolean {
  if (poly.length < 3) return false;
  const polyEdges = edges(poly);
  const total = polyEdges.length;
  for (let i = 0; i < total; i++) {
    for (let j = i + 1; j < total; j++) {
      const adjacent = j === i + 1 || (i === 0 && j === total - 1);
      if (adjacent) continue;
      const [a1, a2] = polyEdges[i];
      const [b1, b2] = polyEdges[j];
      if (segmentsIntersect(a1, a2, b1, b2) === "proper") return false;
    }
  }
  return true;
}

/**
 * Quita vértices colineales o duplicados sin cambiar la forma del polígono
 * — docs/level-editor-plan.md §14 P2, disponible desde el editor (Fase 13)
 * para achicar un polígono dibujado a mano con vértices redundantes antes de
 * que el nivel crezca hacia el presupuesto blando de tamaño (`validate.ts`).
 * Es una reducción, nunca un suavizado: ningún vértice que sobrevive cambia
 * de posición. `epsDeg` es la tolerancia angular (grados) respecto a una
 * línea recta — `0` exige colinealidad perfecta. Nunca deja menos de 3
 * vértices: si la reducción llegara a eso, devuelve el polígono intacto.
 */
export function simplifyPolygon(poly: Polygon, epsDeg = 0.5): Polygon {
  if (poly.length <= 3) return poly;

  // Paso 1: colapsa duplicados consecutivos (arista de longitud 0) a un solo
  // vértice — hecho ANTES de mirar colinealidad, para no confundir "vértice
  // repetido" con "vértice sin esquina real": si se hiciera en el mismo
  // paso, tanto la copia entrante como la saliente de un duplicado quedan
  // con una arista de longitud 0 y ambas se descartarían, perdiendo la
  // esquina de verdad que el duplicado estaba marcando.
  const deduped: Point[] = [];
  for (const p of poly) {
    const prev = deduped[deduped.length - 1];
    if (!prev || Math.hypot(p.x - prev.x, p.y - prev.y) > 0) deduped.push(p);
  }
  if (deduped.length > 1) {
    const first = deduped[0];
    const last = deduped[deduped.length - 1];
    if (Math.hypot(first.x - last.x, first.y - last.y) === 0) deduped.pop(); // anillo cerrado a mano: primer y último punto iguales
  }
  if (deduped.length <= 3) return deduped.length >= 3 ? deduped : poly;

  // Paso 2: sobre el anillo ya sin duplicados, quita vértices colineales.
  const eps = Math.sin((epsDeg * Math.PI) / 180);
  const kept: Point[] = [];
  for (let i = 0; i < deduped.length; i++) {
    const prev = deduped[(i - 1 + deduped.length) % deduped.length];
    const curr = deduped[i];
    const next = deduped[(i + 1) % deduped.length];
    const v1x = curr.x - prev.x;
    const v1y = curr.y - prev.y;
    const v2x = next.x - curr.x;
    const v2y = next.y - curr.y;
    const len1 = Math.hypot(v1x, v1y);
    const len2 = Math.hypot(v2x, v2y);
    if (len1 === 0 || len2 === 0) {
      kept.push(curr); // ya no debería pasar tras el paso 1, pero nunca perder un vértice por esto
      continue;
    }
    const cross = (v1x * v2y - v1y * v2x) / (len1 * len2);
    if (Math.abs(cross) > eps) kept.push(curr);
  }
  return kept.length >= 3 ? kept : deduped;
}

/** Ray casting par/impar. Los bordes cuentan como "dentro" (uso interno: la mayoría de las consultas parten de puntos ya proyectados sobre un borde). */
export function pointInPolygon(p: Point, poly: Polygon): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i];
    const b = poly[j];
    const intersects = a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x;
    if (intersects) inside = !inside;
  }
  return inside;
}

export function closestPointOnSegment(p: Point, a: Point, b: Point): Point {
  const abx = b.x - a.x;
  const aby = b.y - a.y;
  const lenSq = abx * abx + aby * aby;
  if (lenSq < EPS) return a;
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * abx + (p.y - a.y) * aby) / lenSq));
  return { x: a.x + t * abx, y: a.y + t * aby };
}

function closestPointOnPolygon(p: Point, poly: Polygon): Point {
  let best = poly[0];
  let bestDist = Infinity;
  for (const [a, b] of edges(poly)) {
    const c = closestPointOnSegment(p, a, b);
    const d = Math.hypot(c.x - p.x, c.y - p.y);
    if (d < bestDist) {
      bestDist = d;
      best = c;
    }
  }
  return best;
}

function centroid(poly: Polygon): Point {
  const sum = poly.reduce((acc, v) => ({ x: acc.x + v.x, y: acc.y + v.y }), { x: 0, y: 0 });
  return { x: sum.x / poly.length, y: sum.y / poly.length };
}

function samePoint(a: Point, b: Point): boolean {
  return Math.hypot(a.x - b.x, a.y - b.y) < 1e-3;
}

/* ════════════════════════════════════════════════════════════════════════
 * MALLA MULTI-POLÍGONO (Level Editor — docs/level-editor-plan.md §6)
 * ════════════════════════════════════════════════════════════════════════ */

export interface NavigationMesh {
  /** Regiones transitables. Un punto debe estar dentro de al menos una. */
  walkable: Polygon[];
  /** Obstáculos. Un punto dentro de cualquiera de ellos NO es transitable. */
  blocked: Polygon[];
}

/**
 * Adaptador: el modelo viejo (`WalkableArea`) es el caso particular de una
 * malla con una sola región transitable. Permite que `isWalkable`/`findPath`/
 * `nearestWalkablePoint` (usadas hoy por `QuestScene`) se reescriban como
 * envoltorios de una línea sobre las funciones de malla, sin cambiar su
 * comportamiento observable.
 */
export function meshFromWalkableArea(area: WalkableArea): NavigationMesh {
  return { walkable: [area.boundary], blocked: area.holes };
}

/**
 * Regla de navegación, en este orden exacto: fuera de toda región
 * transitable ⇒ bloqueado; dentro de una región bloqueada ⇒ bloqueado
 * (incluso si también cae dentro de una transitable); en cualquier otro
 * caso, transitable.
 */
export function isWalkableInMesh(p: Point, mesh: NavigationMesh): boolean {
  if (!mesh.walkable.some((poly) => pointInPolygon(p, poly))) return false;
  if (mesh.blocked.some((poly) => pointInPolygon(p, poly))) return false;
  return true;
}

interface MeshRing {
  points: Polygon;
  /** true = borde de una región transitable, false = borde de un bloqueo. */
  isWalkableRing: boolean;
}

function meshRings(mesh: NavigationMesh): MeshRing[] {
  return [
    ...mesh.walkable.map((points): MeshRing => ({ points, isWalkableRing: true })),
    ...mesh.blocked.map((points): MeshRing => ({ points, isWalkableRing: false })),
  ];
}

/** Tamaño de la rejilla espacial de aristas (10×10 celdas sobre 0-100). */
const EDGE_GRID_CELLS = 10;

function edgeGridCell(v: number): number {
  return Math.min(EDGE_GRID_CELLS - 1, Math.max(0, Math.floor(v / (100 / EDGE_GRID_CELLS))));
}

/** Todas las celdas cuya caja se solapa con la caja del segmento — sobre-incluye
 *  en diagonales largas, pero nunca deja fuera una celda que el segmento
 *  realmente atraviesa (aproximación simple y segura de un recorrido tipo
 *  Bresenham, suficiente a la escala de un nivel dibujado a mano). */
function edgeGridCellsForSegment(a: Point, b: Point): number[] {
  const cx0 = edgeGridCell(Math.min(a.x, b.x));
  const cx1 = edgeGridCell(Math.max(a.x, b.x));
  const cy0 = edgeGridCell(Math.min(a.y, b.y));
  const cy1 = edgeGridCell(Math.max(a.y, b.y));
  const cells: number[] = [];
  for (let cy = cy0; cy <= cy1; cy++) {
    for (let cx = cx0; cx <= cx1; cx++) cells.push(cy * EDGE_GRID_CELLS + cx);
  }
  return cells;
}

function buildEdgeGrid(obstacleEdges: [Point, Point][]): number[][] {
  const grid: number[][] = Array.from({ length: EDGE_GRID_CELLS * EDGE_GRID_CELLS }, () => []);
  obstacleEdges.forEach(([a, b], idx) => {
    for (const cell of edgeGridCellsForSegment(a, b)) grid[cell].push(idx);
  });
  return grid;
}

function candidateEdgeIndices(a: Point, b: Point, grid: number[][]): number[] {
  const seen = new Set<number>();
  for (const cell of edgeGridCellsForSegment(a, b)) {
    for (const idx of grid[cell]) seen.add(idx);
  }
  return [...seen];
}

/**
 * ¿El segmento a-b queda enteramente dentro de una región transitable de la
 * malla? Primero: no cruza ("proper") ninguna arista de `obstacleEdges` —
 * usa `edgeGrid` para no probar contra aristas que ni siquiera comparten una
 * celda con el segmento.
 *
 * Con eso solo basta cuando toda la malla es UNA región transitable (con o
 * sin huecos — el caso de `WalkableArea`, que es el único que existe hoy en
 * producción): por el teorema de la curva de Jordan, un segmento que no
 * cruza el borde de esa única región no puede pasar de "dentro" a "fuera" en
 * ningún punto intermedio, así que no hace falta nada más — y así se
 * preserva el comportamiento exacto de antes (incluida alguna cuerda entre
 * dos vértices no adyacentes del mismo hueco que puede colarse por su
 * interior si el hueco es localmente convexo ahí: es un comportamiento ya
 * existente en producción, no algo que esta extensión deba corregir por su
 * cuenta).
 *
 * Con VARIOS polígonos transitables independientes esa garantía no alcanza:
 * dos vértices de polígonos distintos, sin nada entre medio, pueden quedar
 * unidos por una recta que no cruza NINGÚN borde porque viaja entera por el
 * vacío que no pertenece a ningún polígono. Por eso, solo cuando la malla
 * tiene más de una región transitable, se exige además que el punto medio
 * sea `isWalkableInMesh` — la extensión que sí necesita el Level Editor
 * (niveles con varias salas) y que `meshFromWalkableArea` nunca produce
 * (siempre construye exactamente una región transitable).
 */
function segmentIsClearInMesh(
  a: Point,
  b: Point,
  mesh: NavigationMesh,
  obstacleEdges: [Point, Point][],
  edgeGrid: number[][],
): boolean {
  for (const idx of candidateEdgeIndices(a, b, edgeGrid)) {
    const [e1, e2] = obstacleEdges[idx];
    if (segmentsIntersect(a, b, e1, e2) === "proper") return false;
  }
  if (mesh.walkable.length <= 1) return true;
  return isWalkableInMesh({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, mesh);
}

/** Empuja `p` un poco hacia el interior (ring transitable) o el exterior
 *  (ring bloqueado) del anillo `ring`, usando su centroide como referencia —
 *  mismo criterio que ya usaba `nearestWalkablePoint` para separar "fuera
 *  del contorno" de "dentro de un hueco" (ver más abajo). Solo se usa para
 *  decidir si un VÉRTICE del propio polígono es un nodo válido del grafo
 *  (una esquina cóncava puede quedar tapada por un bloqueado, o el borde de
 *  un hueco puede rozar la región transitable) — el nodo, si sobrevive, se
 *  guarda con su coordenada ORIGINAL, nunca la empujada. */
function nudgeTowardRingInterior(p: Point, ring: MeshRing, ringCentroid: Point, magnitude: number): Point {
  const dir = ring.isWalkableRing
    ? { x: ringCentroid.x - p.x, y: ringCentroid.y - p.y }
    : { x: p.x - ringCentroid.x, y: p.y - ringCentroid.y };
  const len = Math.hypot(dir.x, dir.y) || 1;
  return { x: p.x + (dir.x / len) * magnitude, y: p.y + (dir.y / len) * magnitude };
}

const NODE_FILTER_NUDGE = 0.35;

export interface VisibilityGraph {
  mesh: NavigationMesh;
  /** Vértices utilizables (los no transitables ya están filtrados). */
  nodes: Point[];
  /** ringOf[i] = índice del primer anillo (en `walkable` seguido de `blocked`,
   *  concatenados) al que pertenece el nodo i — diagnóstico/depuración; un
   *  nodo puede pertenecer a más de un anillo si es una costura entre dos
   *  polígonos adyacentes (ver `normalizeMesh`). */
  ringOf: number[];
  /** Adyacencia estática entre vértices del propio grafo. */
  adjacency: { to: number; dist: number }[][];
  /** Todas las aristas de todos los anillos (transitables y bloqueados), para tests de cruce. */
  edges: [Point, Point][];
  /** Índice espacial: celda de la rejilla 10×10 → índices en `edges`. */
  edgeGrid: number[][];
}

/**
 * Grafo de visibilidad precalculado UNA VEZ por malla (se guarda en
 * `graphCache`/el estado del runtime, nunca se reconstruye por clic ni por
 * frame — ver docs/level-editor-plan.md §6.4 y §14 P1/P3).
 */
export function buildVisibilityGraph(mesh: NavigationMesh): VisibilityGraph {
  const rings = meshRings(mesh);
  const ringCentroids = rings.map((ring) => centroid(ring.points));

  // 1. Deduplicar vértices por coordenada: dos polígonos que comparten un
  //    borde (costura entre salas adyacentes, ver `normalizeMesh`) quedan
  //    representados por EL MISMO nodo del grafo, no por dos nodos
  //    superpuestos sin ninguna arista que los una.
  interface NodeBuild { point: Point; memberships: { ringIndex: number }[] }
  const uniqueNodes: NodeBuild[] = [];
  function findOrAddNode(p: Point): number {
    for (let i = 0; i < uniqueNodes.length; i++) {
      if (samePoint(uniqueNodes[i].point, p)) return i;
    }
    uniqueNodes.push({ point: p, memberships: [] });
    return uniqueNodes.length - 1;
  }
  const ringVertexToUnique: number[][] = rings.map((ring) => ring.points.map(() => -1));
  rings.forEach((ring, ri) => {
    ring.points.forEach((p, vi) => {
      const uniqueIndex = findOrAddNode(p);
      ringVertexToUnique[ri][vi] = uniqueIndex;
      uniqueNodes[uniqueIndex].memberships.push({ ringIndex: ri });
    });
  });

  // 2. Filtrar nodos no transitables: un nodo sobrevive si, para AL MENOS
  //    una de sus pertenencias, el punto empujado hacia el interior de ese
  //    anillo resulta transitable (ver `nudgeTowardRingInterior`).
  const survives = uniqueNodes.map((node) =>
    node.memberships.some((m) =>
      isWalkableInMesh(nudgeTowardRingInterior(node.point, rings[m.ringIndex], ringCentroids[m.ringIndex], NODE_FILTER_NUDGE), mesh),
    ),
  );
  const oldToNew = new Map<number, number>();
  uniqueNodes.forEach((_, i) => {
    if (survives[i]) oldToNew.set(i, oldToNew.size);
  });

  const nodes: Point[] = [];
  const ringOf: number[] = [];
  uniqueNodes.forEach((node, i) => {
    if (!survives[i]) return;
    nodes.push(node.point);
    ringOf.push(node.memberships[0].ringIndex);
  });
  const n = nodes.length;

  // 3. Aristas de obstáculo: los bordes de TODOS los anillos (una recta no
  //    puede cruzar el borde de ninguna región, sea transitable o bloqueada).
  const obstacleEdges: [Point, Point][] = rings.flatMap((ring) => edges(ring.points));
  const edgeGrid = buildEdgeGrid(obstacleEdges);

  // 4. Adyacencia "mismo anillo": next/prev de cada pertenencia son visibles
  //    por definición (comparten esa arista, que es un lado real del propio
  //    polígono) — SALVO que otro polígono BLOQUEADO se superponga sobre esa
  //    arista, caso en que no se agrega. Se comprueba solo contra bloqueados
  //    DISTINTOS del propio anillo (`poly !== ring.points`): probar
  //    `isWalkableInMesh` del punto medio contra el anillo completo, incluido
  //    el propio, parece más simple pero es INCORRECTO para un polígono
  //    cóncavo (el caso real de Ciudad Central) — el `pointInPolygon` por ray
  //    casting es ambiguo para un punto que cae exactamente sobre uno de los
  //    propios bordes del polígono que se está probando, y en un contorno
  //    con muchos vértices reflejos eso descarta según el caso más o menos
  //    la mitad de las aristas del propio contorno, rompiendo la conexión
  //    del grafo. Excluir el propio anillo evita esa ambigüedad de raíz.
  const adjacency: { to: number; dist: number }[][] = Array.from({ length: n }, () => []);
  const sameRingPairKeys = new Set<string>();
  function pairKey(a: number, b: number): string {
    return a < b ? `${a}-${b}` : `${b}-${a}`;
  }
  rings.forEach((ring, ri) => {
    const len = ring.points.length;
    ring.points.forEach((_, vi) => {
      const nextVi = (vi + 1) % len;
      const rawA = ringVertexToUnique[ri][vi];
      const rawB = ringVertexToUnique[ri][nextVi];
      if (!oldToNew.has(rawA) || !oldToNew.has(rawB)) return;
      const na = oldToNew.get(rawA)!;
      const nb = oldToNew.get(rawB)!;
      if (na === nb) return; // fusionados en el mismo nodo tras el dedupe
      const key = pairKey(na, nb);
      if (sameRingPairKeys.has(key)) return; // ya agregada desde otra pertenencia (nodo de costura)
      sameRingPairKeys.add(key);

      const a = nodes[na];
      const b = nodes[nb];
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      const coveredByOtherBlocker = mesh.blocked.some((poly) => poly !== ring.points && pointInPolygon(mid, poly));
      if (!coveredByOtherBlocker) {
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        adjacency[na].push({ to: nb, dist: d });
        adjacency[nb].push({ to: na, dist: d });
      }
    });
  });

  // 5. Resto de pares (no consecutivos en ningún anillo): test general de
  //    cruce + punto medio (§ segmentIsClearInMesh) — acá no hay ambigüedad
  //    de "sobre el propio borde", los pares no adyacentes son puntos
  //    genuinamente interiores/visibles entre sí.
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (sameRingPairKeys.has(pairKey(i, j))) continue;
      const a = nodes[i];
      const b = nodes[j];
      if (segmentIsClearInMesh(a, b, mesh, obstacleEdges, edgeGrid)) {
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        adjacency[i].push({ to: j, dist: d });
        adjacency[j].push({ to: i, dist: d });
      }
    }
  }

  return { mesh, nodes, ringOf, adjacency, edges: obstacleEdges, edgeGrid };
}

function closestWalkablePolygon(p: Point, walkable: Polygon[]): Polygon | null {
  let best: Polygon | null = null;
  let bestDist = Infinity;
  for (const poly of walkable) {
    const c = closestPointOnPolygon(p, poly);
    const d = Math.hypot(c.x - p.x, c.y - p.y);
    if (d < bestDist) {
      bestDist = d;
      best = poly;
    }
  }
  return best;
}

/**
 * Proyecta un punto no caminable (fuera de toda región transitable, o dentro
 * de una bloqueada) al punto caminable más próximo, empujado un pequeño
 * margen hacia el lado transitable. Si el punto ya es caminable, se
 * devuelve tal cual. Generaliza a N/M polígonos el criterio que ya usaba
 * `nearestWalkablePoint` para un solo `WalkableArea` (que ahora es su caso
 * particular — ver el adaptador más abajo).
 */
export function nearestWalkablePointInMesh(p: Point, mesh: NavigationMesh, nudge = 0.6): Point {
  if (isWalkableInMesh(p, mesh)) return p;

  const containingBlocked = mesh.blocked.find((poly) => pointInPolygon(p, poly));
  const targetPoly = containingBlocked ?? closestWalkablePolygon(p, mesh.walkable);
  if (!targetPoly) return p; // sin ninguna región transitable en la malla: nada que corregir

  const projected = closestPointOnPolygon(p, targetPoly);
  const c = centroid(targetPoly);
  // Fuera de todo lo transitable: empujar del borde hacia el centro de esa región.
  // Dentro de un bloqueado: empujar del borde del bloqueado hacia afuera de él.
  const dir = containingBlocked
    ? { x: projected.x - c.x, y: projected.y - c.y }
    : { x: c.x - projected.x, y: c.y - projected.y };
  const len = Math.hypot(dir.x, dir.y) || 1;
  const nudged = { x: projected.x + (dir.x / len) * nudge, y: projected.y + (dir.y / len) * nudge };
  return isWalkableInMesh(nudged, mesh) ? nudged : projected;
}

/**
 * Normaliza la malla al cargar un nivel: dedupe de vértices casi pegados
 * dentro de cada anillo (misma idea que `dedupeArea`) + descarte de anillos
 * que queden con menos de 3 puntos + fusión de vértices que, sin ser
 * idénticos, están a menos de `eps` entre sí en dos polígonos del MISMO rol
 * (dos transitables o dos bloqueados) — la "costura" entre dos salas
 * contiguas queda con una coordenada exactamente compartida, lista para que
 * `buildVisibilityGraph` (que fusiona por coordenada exacta) las conecte en
 * un único nodo.
 */
export function normalizeMesh(mesh: NavigationMesh, eps = 0.05): NavigationMesh {
  const walkable = mesh.walkable.map((poly) => dedupeRing(poly, eps)).filter((poly) => poly.length >= 3);
  const blocked = mesh.blocked.map((poly) => dedupeRing(poly, eps)).filter((poly) => poly.length >= 3);
  return { walkable: fuseSharedVertices(walkable, eps), blocked: fuseSharedVertices(blocked, eps) };
}

function fuseSharedVertices(polys: Polygon[], eps: number): Polygon[] {
  const canonical: Point[] = [];
  function canonicalize(p: Point): Point {
    for (const c of canonical) {
      if (Math.hypot(c.x - p.x, c.y - p.y) < eps) return c;
    }
    canonical.push(p);
    return p;
  }
  return polys.map((poly) => poly.map(canonicalize));
}

/**
 * Ruta más corta entre `from` y `to` dentro de una malla, usando un grafo ya
 * construido (`buildVisibilityGraph`, memoizado por el llamador — nunca se
 * reconstruye acá). `from`/`to` se insertan como 2 nodos temporales: solo
 * sus O(nodos) aristas nuevas se calculan en esta consulta, la adyacencia
 * estática del resto del grafo se reutiliza tal cual. Si `to` no es
 * transitable, se corrige primero al punto transitable más cercano (mismo
 * criterio que un clic fuera del área o sobre un obstáculo). Si no existe
 * ninguna ruta (regiones desconectadas), `reachable` es `false` y `path` es
 * solo `[from]` — nunca una línea recta que atraviese geometría.
 */
export function findPathInMesh(from: Point, to: Point, graph: VisibilityGraph): { path: Point[]; reachable: boolean } {
  const goal = isWalkableInMesh(to, graph.mesh) ? to : nearestWalkablePointInMesh(to, graph.mesh);
  if (samePoint(from, goal)) return { path: [from], reachable: true };

  const { nodes, edges: obstacleEdges, edgeGrid } = graph;
  const n = nodes.length;
  const fromIdx = n;
  const toIdx = n + 1;
  const allNodes = [...nodes, from, goal];

  function clearBetween(a: Point, b: Point): boolean {
    return segmentIsClearInMesh(a, b, graph.mesh, obstacleEdges, edgeGrid);
  }

  const fromEdges = new Map<number, number>();
  const toEdges = new Map<number, number>();
  for (let i = 0; i < n; i++) {
    if (clearBetween(from, nodes[i])) fromEdges.set(i, Math.hypot(from.x - nodes[i].x, from.y - nodes[i].y));
    if (clearBetween(goal, nodes[i])) toEdges.set(i, Math.hypot(goal.x - nodes[i].x, goal.y - nodes[i].y));
  }
  const directDist = Math.hypot(from.x - goal.x, from.y - goal.y);
  const directClear = clearBetween(from, goal);

  function neighborsOf(u: number): { to: number; dist: number }[] {
    if (u === fromIdx) {
      const out = [...fromEdges].map(([to, dist]) => ({ to, dist }));
      if (directClear) out.push({ to: toIdx, dist: directDist });
      return out;
    }
    if (u === toIdx) {
      const out = [...toEdges].map(([to, dist]) => ({ to, dist }));
      if (directClear) out.push({ to: fromIdx, dist: directDist });
      return out;
    }
    const out = graph.adjacency[u].slice();
    const df = fromEdges.get(u);
    if (df !== undefined) out.push({ to: fromIdx, dist: df });
    const dt = toEdges.get(u);
    if (dt !== undefined) out.push({ to: toIdx, dist: dt });
    return out;
  }

  // Dijkstra sin heap (V pequeño — ver docs/level-editor-plan.md §6.2 punto 6).
  const total = n + 2;
  const dist = new Array<number>(total).fill(Infinity);
  const prev = new Array<number>(total).fill(-1);
  const visited = new Array<boolean>(total).fill(false);
  dist[fromIdx] = 0;

  for (let iter = 0; iter < total; iter++) {
    let u = -1;
    let best = Infinity;
    for (let k = 0; k < total; k++) {
      if (!visited[k] && dist[k] < best) {
        best = dist[k];
        u = k;
      }
    }
    if (u === -1) break;
    visited[u] = true;
    if (u === toIdx) break;
    for (const { to: v, dist: w } of neighborsOf(u)) {
      if (dist[u] + w < dist[v]) {
        dist[v] = dist[u] + w;
        prev[v] = u;
      }
    }
  }

  if (!Number.isFinite(dist[toIdx])) return { path: [from], reachable: false };

  const path: Point[] = [];
  let cur = toIdx;
  while (cur !== -1) {
    path.unshift(allNodes[cur]);
    cur = prev[cur];
  }
  return { path, reachable: true };
}

/* ════════════════════════════════════════════════════════════════════════
 * ADAPTADORES: la API que ya usa QuestScene, reescrita en términos de la
 * malla multi-polígono de arriba. Firma y comportamiento observable
 * intactos — ver la prueba de regresión en src/test/unit/unidad-nivel.test.ts.
 * ════════════════════════════════════════════════════════════════════════ */

const graphCache = new WeakMap<WalkableArea, VisibilityGraph>();

export function isWalkable(p: Point, area: WalkableArea): boolean {
  return isWalkableInMesh(p, meshFromWalkableArea(area));
}

export function nearestWalkablePoint(p: Point, area: WalkableArea, nudge = 0.6): Point {
  return nearestWalkablePointInMesh(p, meshFromWalkableArea(area), nudge);
}

/**
 * Ruta más corta entre `from` y `to` dentro de `area`, rodeando huecos. El
 * grafo de visibilidad de `area` se calcula una sola vez (memoizado en
 * `graphCache` por identidad del objeto `area` — `GAME_WALKABLE` en
 * `QuestScene.tsx` es una constante de módulo, así que acierta desde el
 * segundo clic) y se reutiliza en cada consulta.
 */
export function findPath(from: Point, to: Point, area: WalkableArea): Point[] {
  let graph = graphCache.get(area);
  if (!graph) {
    graph = buildVisibilityGraph(meshFromWalkableArea(area));
    graphCache.set(area, graph);
  }
  return findPathInMesh(from, to, graph).path;
}
