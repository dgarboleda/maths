import type { LevelDefinition } from "@/lib/level/schema";
import { unresolvedModuleIds } from "./progress";
import type { GameWorld, WorldIssue, WorldNode } from "./schema";

/**
 * Valida un `GameWorld` contra los niveles reales del padre — nunca lanza,
 * misma convención que `validateLevel` (level/validate.ts).
 *
 * 1. Exactamente un nodo con `isStart: true`.
 * 2. Todo `WorldNode.levelId` existe en `levels`.
 * 3. Todo `WorldLink.from/toLevelId` tiene nodo en el mapa.
 * 4. Todo `WorldLink.exitId` existe en el nivel de origen, y su `target`
 *    apunta al mismo `toLevelId` — la incoherencia mapa↔nivel más probable.
 * 5. Sin ciclos en el grafo de desbloqueo (`afterLevels`/`afterModules` no
 *    puede depender, directa o indirectamente, de sí mismo).
 * 6. Todo nodo alcanzable desde el inicio (warning: un nodo suelto puede ser
 *    deliberado, p. ej. un nivel bonus sin entrada narrativa).
 * 7. `afterModules.moduleIds` resuelven contra el currículo real.
 * 8. Niveles del padre sin nodo en el mapa (warning).
 */
export function validateWorld(world: GameWorld, levels: LevelDefinition[]): WorldIssue[] {
  const issues: WorldIssue[] = [];
  const levelsById = new Map(levels.map((l) => [l.id, l]));
  const nodesByLevelId = new Map(world.nodes.map((n) => [n.levelId, n]));

  validateStart(world, issues);
  validateNodes(world, levelsById, issues);
  validateLinks(world, nodesByLevelId, levelsById, issues);
  validateUnlockCycles(world, issues);
  validateReachability(world, issues);
  validateModuleRefs(world, issues);
  validateOrphanLevels(world, levels, issues);

  return issues;
}

function validateStart(world: GameWorld, issues: WorldIssue[]): void {
  const starts = world.nodes.filter((n) => n.isStart);
  if (world.nodes.length === 0) return; // mundo vacío: nada que empezar todavía, no es un error
  if (starts.length === 0) {
    issues.push({ severity: "error", message: "Ningún nivel está marcado como punto de entrada del mundo.", target: { kind: "node" } });
  } else if (starts.length > 1) {
    issues.push({
      severity: "error",
      message: `${starts.length} niveles están marcados como punto de entrada — debe haber exactamente uno.`,
      target: { kind: "node" },
    });
  }
}

function validateNodes(world: GameWorld, levelsById: Map<string, LevelDefinition>, issues: WorldIssue[]): void {
  for (const node of world.nodes) {
    if (!levelsById.has(node.levelId)) {
      issues.push({ severity: "error", message: `El nodo "${node.label}" apunta a un nivel que ya no existe.`, target: { kind: "node", id: node.levelId } });
    }
  }
}

function validateLinks(
  world: GameWorld,
  nodesByLevelId: Map<string, WorldNode>,
  levelsById: Map<string, LevelDefinition>,
  issues: WorldIssue[],
): void {
  for (const link of world.links) {
    if (!nodesByLevelId.has(link.fromLevelId) || !nodesByLevelId.has(link.toLevelId)) {
      issues.push({ severity: "error", message: `El enlace "${link.label}" conecta un nivel que no está en el mapa.`, target: { kind: "link", id: link.id } });
      continue;
    }
    if (!link.exitId) continue;
    const fromLevel = levelsById.get(link.fromLevelId);
    const exit = fromLevel?.navigation.exits.find((e) => e.id === link.exitId);
    if (!exit) {
      issues.push({ severity: "error", message: `El enlace "${link.label}" apunta a un punto de destino que ya no existe en el nivel de origen.`, target: { kind: "link", id: link.id } });
    } else if (exit.target.kind !== "level" || exit.target.levelId !== link.toLevelId) {
      issues.push({
        severity: "error",
        message: `El punto de destino "${exit.label}" del nivel de origen no lleva al mismo nivel que este enlace del mapa.`,
        target: { kind: "link", id: link.id },
      });
    }
  }
}

/** DFS con pila de recursión — un ciclo de `afterLevels` sería un mundo que
 *  nunca se puede desbloquear del todo. */
function validateUnlockCycles(world: GameWorld, issues: WorldIssue[]): void {
  const dependsOn = new Map<string, string[]>();
  for (const node of world.nodes) {
    dependsOn.set(node.levelId, node.unlock.kind === "afterLevels" ? node.unlock.levelIds : []);
  }

  const state = new Map<string, "visiting" | "done">();
  function visit(levelId: string, stack: string[]): string[] | null {
    if (state.get(levelId) === "done") return null;
    if (stack.includes(levelId)) return [...stack, levelId];
    state.set(levelId, "visiting");
    for (const dep of dependsOn.get(levelId) ?? []) {
      const cycle = visit(dep, [...stack, levelId]);
      if (cycle) return cycle;
    }
    state.set(levelId, "done");
    return null;
  }

  const reported = new Set<string>();
  for (const node of world.nodes) {
    const cycle = visit(node.levelId, []);
    if (cycle && !cycle.some((id) => reported.has(id))) {
      cycle.forEach((id) => reported.add(id));
      issues.push({
        severity: "error",
        message: `Ciclo de desbloqueo: ${cycle.map((id) => world.nodes.find((n) => n.levelId === id)?.label ?? id).join(" → ")}.`,
        target: { kind: "node", id: cycle[0] },
      });
    }
  }
}

function validateReachability(world: GameWorld, issues: WorldIssue[]): void {
  const start = world.nodes.find((n) => n.isStart);
  if (!start) return; // ya reportado por validateStart
  const adjacency = new Map<string, string[]>();
  for (const link of world.links) {
    adjacency.set(link.fromLevelId, [...(adjacency.get(link.fromLevelId) ?? []), link.toLevelId]);
  }
  const reachable = new Set<string>([start.levelId]);
  const queue = [start.levelId];
  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const next of adjacency.get(current) ?? []) {
      if (!reachable.has(next)) {
        reachable.add(next);
        queue.push(next);
      }
    }
  }
  for (const node of world.nodes) {
    if (!reachable.has(node.levelId)) {
      issues.push({ severity: "warning", message: `"${node.label}" no se puede alcanzar desde el inicio siguiendo los enlaces del mapa.`, target: { kind: "node", id: node.levelId } });
    }
  }
}

function validateModuleRefs(world: GameWorld, issues: WorldIssue[]): void {
  for (const node of world.nodes) {
    if (node.unlock.kind !== "afterModules") continue;
    const missing = unresolvedModuleIds(node.unlock.moduleIds);
    if (missing.length > 0) {
      issues.push({ severity: "error", message: `"${node.label}" requiere módulos que no existen: ${missing.join(", ")}.`, target: { kind: "node", id: node.levelId } });
    }
  }
}

function validateOrphanLevels(world: GameWorld, levels: LevelDefinition[], issues: WorldIssue[]): void {
  const inMap = new Set(world.nodes.map((n) => n.levelId));
  for (const level of levels) {
    if (!inMap.has(level.id)) {
      issues.push({ severity: "warning", message: `El nivel "${level.name}" no aparece en el mapa del mundo.`, target: { kind: "node", id: level.id } });
    }
  }
}
