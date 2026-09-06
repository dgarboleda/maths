import { isWalkableInMesh, polygonIsSimple, type NavigationMesh } from "@/lib/world/navmesh";
import type { LevelDefinition, LevelIssue, NavPolygon } from "./schema";

/**
 * Valida un `LevelDefinition` y devuelve la lista de problemas encontrados
 * (nunca lanza). Un `error` bloquea el Play Test (docs/level-editor-plan.md
 * §11.3); un `warning` solo se muestra en el `IssuesPanel`.
 *
 * 8 comprobaciones estructurales — completas desde esta fase, no dependen de
 * nada que se construya después:
 *
 * 1. Todo polígono (transitable, bloqueado, zona poligonal) es simple.
 * 2. Existe al menos un polígono transitable, y `spawn` cae dentro de la
 *    malla de navegación.
 * 3. Cada `LevelExit` cae dentro de la malla de navegación.
 * 4. Toda entidad con `interaction.mode !== "none"` tiene un `standPoint`
 *    definido (error si falta — no hay adónde caminar). Si el punto no cae
 *    exacto sobre el área transitable es solo `warning`: el runtime lo
 *    corrige al más cercano transitable igual que un clic fuera del área
 *    (`nearestWalkablePointInMesh`) — bloquear esto como error rechazaría
 *    niveles calcados de datos ya en producción (ver `ciudadCentralAsLevel`,
 *    cuyos propios `standX/standY` no caen todos exactos).
 * 5. Toda referencia entre elementos del nivel (`ChallengePlacement.
 *    sourceEntityId`, los `*Id` de `LevelEventTrigger`, `ObjectiveSource`,
 *    `EntityStateDef.activeBlockerIds`) apunta a un id que existe.
 * 6. `background.alt` no está vacío (accesibilidad).
 * 7. `name` del nivel y `background.src` no están vacíos.
 * 8. Ningún id se repite dentro de su propia colección.
 *
 * NO incluye todavía la detección de ciclos en la cadena de eventos
 * (`ON_X → acción → entidad/zona → evento que eso puede disparar`): esa
 * comprobación necesita el catálogo de acciones (`events/catalog.ts`), que
 * no existe hasta la Fase 8 — se añade ahí, extendiendo esta misma función,
 * no antes (docs/level-editor-plan.md §17 Fase 8, §13 T4).
 *
 * Presupuestos blandos (warnings de tamaño/rendimiento, §14 P2) tampoco
 * viven acá todavía: dependen de `serialize.ts` (`assertSize`) y se añaden
 * en el mismo lugar cuando ese módulo esté completo dentro de esta fase.
 */
export function validateLevel(level: LevelDefinition): LevelIssue[] {
  const issues: LevelIssue[] = [];

  validateNames(level, issues);
  validatePolygons(level, issues);
  const mesh = buildMesh(level);
  validateSpawnAndExits(level, mesh, issues);
  validateEntityInteractions(level, mesh, issues);
  validateReferences(level, issues);
  validateUniqueIds(level, issues);

  return issues;
}

function buildMesh(level: LevelDefinition): NavigationMesh {
  return {
    walkable: level.navigation.walkablePolygons.map((p) => p.points),
    blocked: level.navigation.blockedPolygons.map((p) => p.points),
  };
}

function validateNames(level: LevelDefinition, issues: LevelIssue[]): void {
  if (level.name.trim() === "") {
    issues.push({ severity: "error", message: "El nivel no tiene nombre.", target: { kind: "level" } });
  }
  if (level.background.src.trim() === "") {
    issues.push({ severity: "error", message: "El nivel no tiene un fondo seleccionado.", target: { kind: "background" } });
  }
  if (level.background.alt.trim() === "") {
    issues.push({
      severity: "error",
      message: "El fondo no tiene texto alternativo (obligatorio para lectores de pantalla).",
      target: { kind: "background" },
    });
  }
}

function validatePolygons(level: LevelDefinition, issues: LevelIssue[]): void {
  function checkRing(polygon: NavPolygon, kindLabel: string): void {
    if (!polygonIsSimple(polygon.points)) {
      issues.push({
        severity: "error",
        message: `${kindLabel} tiene lados que se cruzan entre sí.`,
        target: { kind: "polygon", id: polygon.id },
      });
    }
  }
  level.navigation.walkablePolygons.forEach((p) => checkRing(p, "Un área transitable"));
  level.navigation.blockedPolygons.forEach((p) => checkRing(p, "Una zona prohibida"));
  level.zones.forEach((zone) => {
    if (zone.shape.kind === "polygon" && !polygonIsSimple(zone.shape.points)) {
      issues.push({
        severity: "error",
        message: `La zona "${zone.name}" tiene lados que se cruzan entre sí.`,
        target: { kind: "zone", id: zone.id },
      });
    }
  });
}

function validateSpawnAndExits(level: LevelDefinition, mesh: NavigationMesh, issues: LevelIssue[]): void {
  if (level.navigation.walkablePolygons.length === 0) {
    issues.push({ severity: "error", message: "El nivel no tiene ningún área transitable.", target: { kind: "level" } });
    return;
  }
  if (!isWalkableInMesh(level.navigation.spawn, mesh)) {
    issues.push({
      severity: "error",
      message: "El punto de inicio está fuera del área transitable.",
      target: { kind: "spawn" },
    });
  }
  for (const exit of level.navigation.exits) {
    const anyPointWalkable = exit.polygon.some((p) => isWalkableInMesh(p, mesh));
    if (!anyPointWalkable) {
      issues.push({
        severity: "error",
        message: `El punto de destino "${exit.label}" no toca ningún área transitable.`,
        target: { kind: "exit", id: exit.id },
      });
    }
  }
}

function validateEntityInteractions(level: LevelDefinition, mesh: NavigationMesh, issues: LevelIssue[]): void {
  for (const entity of level.entities) {
    if (entity.interaction.mode === "none") continue;
    if (!entity.interaction.standPoint) {
      issues.push({
        severity: "error",
        message: `"${entity.name}" es interactuable pero no tiene un punto donde Alex se detenga.`,
        target: { kind: "entity", id: entity.id },
      });
      continue;
    }
    if (!isWalkableInMesh(entity.interaction.standPoint, mesh)) {
      // Advertencia, no error: igual que un clic fuera del área o sobre un
      // hotspot (`nearestWalkablePointInMesh`, ver navmesh.ts), el runtime
      // corrige el punto de pie al más cercano transitable en vez de
      // fallar — así se comporta hoy `CIUDAD_CENTRAL_HOTSPOTS` en
      // producción (varios de sus `standX/standY` no caen exactos sobre el
      // polígono), y `ciudadCentralAsLevel()` lo demuestra: bloquear esto
      // como error rechazaría un nivel calcado del que ya funciona.
      issues.push({
        severity: "warning",
        message: `El punto de interacción de "${entity.name}" no cae exacto sobre el área transitable; Alex se detendrá en el punto transitable más cercano.`,
        target: { kind: "entity", id: entity.id },
      });
    }
  }
}

function validateReferences(level: LevelDefinition, issues: LevelIssue[]): void {
  const entityIds = new Set(level.entities.map((e) => e.id));
  const polygonIds = new Set([...level.navigation.walkablePolygons, ...level.navigation.blockedPolygons].map((p) => p.id));
  const zoneIds = new Set(level.zones.map((z) => z.id));
  const challengeIds = new Set(level.challenges.map((c) => c.id));
  const missionIds = new Set(level.missions.map((m) => m.id));

  function requireEntity(id: string, message: string, target: LevelIssue["target"]): void {
    if (!entityIds.has(id)) issues.push({ severity: "error", message, target });
  }

  // Nota: `EntityStateDef.activeBlockerIds` (qué polígonos bloquea cada
  // estado) vive en el TIPO de entidad (`EntityTypeDef.defaultStates`,
  // Fase 6), no en `LevelEntity` — acá solo se guarda `state.initial`
  // (qué estado id empieza activo). No hay nada que referenciar todavía en
  // esta fase; esa comprobación se añade cuando exista el registro de tipos.

  for (const challenge of level.challenges) {
    requireEntity(
      challenge.sourceEntityId,
      `El desafío "${challenge.moduleId}" apunta a una entidad que ya no existe.`,
      { kind: "challenge", id: challenge.id },
    );
  }

  for (const mission of level.missions) {
    for (const objective of mission.objectives) {
      const target: LevelIssue["target"] = { kind: "mission", id: mission.id };
      if (objective.source.kind === "challenge" && !challengeIds.has(objective.source.challengeId)) {
        issues.push({ severity: "error", message: `El objetivo "${objective.label}" referencia un desafío que ya no existe.`, target });
      }
      if (objective.source.kind === "zone" && !zoneIds.has(objective.source.zoneId)) {
        issues.push({ severity: "error", message: `El objetivo "${objective.label}" referencia una zona que ya no existe.`, target });
      }
      if (objective.source.kind === "collectible" && !entityIds.has(objective.source.entityId)) {
        issues.push({ severity: "error", message: `El objetivo "${objective.label}" referencia un coleccionable que ya no existe.`, target });
      }
    }
  }

  for (const rule of level.events) {
    const target: LevelIssue["target"] = { kind: "event", id: rule.id };
    const t = rule.trigger;
    if (t.entityId && !entityIds.has(t.entityId)) {
      issues.push({ severity: "error", message: `La regla "${rule.name}" dispara sobre una entidad que ya no existe.`, target });
    }
    if (t.challengeId && !challengeIds.has(t.challengeId)) {
      issues.push({ severity: "error", message: `La regla "${rule.name}" dispara sobre un desafío que ya no existe.`, target });
    }
    if (t.zoneId && !zoneIds.has(t.zoneId)) {
      issues.push({ severity: "error", message: `La regla "${rule.name}" dispara sobre una zona que ya no existe.`, target });
    }
    if (t.missionId && !missionIds.has(t.missionId)) {
      issues.push({ severity: "error", message: `La regla "${rule.name}" dispara sobre una misión que ya no existe.`, target });
    }
    for (const action of rule.actions) {
      const entityRef = action.params.entityId;
      if (typeof entityRef === "string" && !entityIds.has(entityRef)) {
        issues.push({
          severity: "error",
          message: `Una acción de "${rule.name}" (${action.type}) apunta a una entidad que ya no existe.`,
          target,
        });
      }
      const polygonRef = action.params.polygonId;
      if (typeof polygonRef === "string" && !polygonIds.has(polygonRef)) {
        issues.push({
          severity: "error",
          message: `Una acción de "${rule.name}" (${action.type}) apunta a un polígono que ya no existe.`,
          target,
        });
      }
    }
  }
}

function validateUniqueIds(level: LevelDefinition, issues: LevelIssue[]): void {
  function checkUnique(ids: string[], label: string): void {
    const seen = new Set<string>();
    for (const id of ids) {
      if (seen.has(id)) {
        issues.push({ severity: "error", message: `Hay dos ${label} con el mismo id ("${id}").`, target: { kind: "level" } });
      }
      seen.add(id);
    }
  }
  checkUnique(level.entities.map((e) => e.id), "entidades");
  checkUnique([...level.navigation.walkablePolygons, ...level.navigation.blockedPolygons].map((p) => p.id), "polígonos de navegación");
  checkUnique(level.zones.map((z) => z.id), "zonas");
  checkUnique(level.dialogs.map((d) => d.id), "diálogos");
  checkUnique(level.challenges.map((c) => c.id), "desafíos");
  checkUnique(level.missions.map((m) => m.id), "misiones");
  checkUnique(level.events.map((e) => e.id), "reglas de evento");
}
