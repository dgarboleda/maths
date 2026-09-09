import { normalizeMesh, type NavigationMesh } from "@/lib/world/navmesh";
import { activeBlockerIdsOf, getEntityType } from "@/lib/level/entities";
import type { LevelDefinition } from "@/lib/level/schema";
import { currentStateOf, type LevelRuntimeState } from "./state";

function blockerIdsOf(level: LevelDefinition, state: LevelRuntimeState): string[] {
  return level.entities.flatMap((e) => activeBlockerIdsOf(e, getEntityType(e.type), currentStateOf(e, state)));
}

/**
 * La malla de navegación ACTIVA ahora mismo — no la autoral fija de
 * `level.navigation`, sino la que resulta de qué puertas están abiertas y
 * qué áreas se desbloquearon (docs/level-editor-plan.md §6.4). Un
 * `NavPolygon` walkable/blocked empieza en `initiallyEnabled`, y
 * `state.enabledPolygons[id]` (si está definido) lo sobrescribe —
 * `UNLOCK_AREA`/`REVEAL_AREA` son quienes lo fijan. Un bloqueado, además,
 * cuenta como activo si el estado actual de CUALQUIER entidad lo trae entre
 * sus bloqueadores activos (`entities.activeBlockerIdsOf`, Fase 6/9 — una
 * puerta cerrada bloquea su vano aunque el polígono en sí nunca se haya
 * tocado con `UNLOCK_AREA`).
 */
export function buildRuntimeMesh(level: LevelDefinition, state: LevelRuntimeState): NavigationMesh {
  const walkable = level.navigation.walkablePolygons
    .filter((p) => state.enabledPolygons[p.id] ?? p.initiallyEnabled)
    .map((p) => p.points);

  const activeBlockerIds = new Set(blockerIdsOf(level, state));

  const blocked = level.navigation.blockedPolygons
    .filter((p) => (state.enabledPolygons[p.id] ?? p.initiallyEnabled) || activeBlockerIds.has(p.id))
    .map((p) => p.points);

  return normalizeMesh({ walkable, blocked });
}

/** Clave estable para memoizar el grafo de visibilidad (`useMemo` en
 *  `useLevelRuntime`) — solo cambia cuando la malla ACTIVA de verdad
 *  cambia (una puerta se abrió, un área se desbloqueó), nunca en cada
 *  frame ni en cada clic (§14 P3). */
export function runtimeMeshKey(level: LevelDefinition, state: LevelRuntimeState): string {
  const enabled = [...level.navigation.walkablePolygons, ...level.navigation.blockedPolygons]
    .filter((p) => state.enabledPolygons[p.id] ?? p.initiallyEnabled)
    .map((p) => p.id)
    .sort()
    .join("|");
  const blockers = level.entities
    .map((e) => `${e.id}:${activeBlockerIdsOf(e, getEntityType(e.type), currentStateOf(e, state)).join(",")}`)
    .sort()
    .join("|");
  return `${enabled}::${blockers}`;
}
