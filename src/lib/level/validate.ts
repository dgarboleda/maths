import { isWalkableInMesh, polygonIsSimple, type NavigationMesh } from "@/lib/world/navmesh";
import type { LevelDefinition, LevelEventRule, LevelIssue, NavPolygon } from "./schema";

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
 * 3. Cada `LevelExit` cae dentro de la malla de navegación, y si su destino
 *    es `{kind:"level"}` tiene un `levelId` elegido (no el estado "todavía
 *    sin elegir" del desplegable de `ExitEditor.tsx`).
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
 * 8b. (Fase 25) Todo `ChallengePlacement.moduleId` está asignado — nunca
 *     vacío (ver `validateChallengeModules`).
 *
 * 9. (Fase 8) Detección ESTÁTICA de ciclos en la cadena de eventos — T4
 *    (§13): una regla que dispara un `START_CHALLENGE`/`UPDATE_MISSION`
 *    puede indirectamente re-disparar su propio (u otro) trigger vía
 *    `ON_CHALLENGE_STARTED`/`ON_MISSION_COMPLETE` (Fase 9 los re-emite tras
 *    aplicar esos efectos). Es una aproximación conservadora, no una
 *    ejecución simbólica completa (`ver validateEventCycles` para el mapeo
 *    acción→evento exacto que usa) — el guardia real que evita que el juego
 *    se cuelgue es `MAX_CHAIN_DEPTH` en tiempo de ejecución (`events/bus.ts`);
 *    esto solo avisa al autor del nivel antes de publicar.
 *
 * 10. (Fase 13) Presupuestos blandos de tamaño (§14 P2): número de vértices
 *     de navegación/zona, número de entidades, y tamaño serializado —
 *     siempre `warning`, muy por debajo del límite duro de `assertSize`
 *     (`serialize.ts`, que sí lanza justo antes de escribir a Firestore):
 *     avisan con margen para que el autor simplifique (`simplifyPolygon`,
 *     `navmesh.ts`) antes de llegar ahí.
 */
export function validateLevel(level: LevelDefinition): LevelIssue[] {
  const issues: LevelIssue[] = [];

  validateNames(level, issues);
  validatePolygons(level, issues);
  const mesh = buildMesh(level);
  validateSpawnAndExits(level, mesh, issues);
  validateEntityInteractions(level, mesh, issues);
  validateReferences(level, issues);
  validateChallengeModules(level, issues);
  validateUniqueIds(level, issues);
  validateEventCycles(level, issues);
  validateBudgets(level, issues);

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
  // docs/asset-management-plan.md §E.3/§G Paso 10: `warning`, nunca `error`
  // — no bloquea el Play Test ni invalida un nivel ya guardado con uno de
  // los 6 fondos de fábrica de baja resolución (backgroundCatalog.ts,
  // `usage: "thumbnail"`). Umbral de 1200px: por debajo de la referencia
  // recomendada (1600px, la de city-central.webp) pero con margen.
  if (level.background.width > 0 && level.background.width < 1200) {
    issues.push({
      severity: "warning",
      message: `El fondo tiene poca resolución (${level.background.width}px de ancho) para una escena a pantalla completa — se puede usar igual, pero puede verse borroso.`,
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
    // `ExitEditor.tsx` usa `levelId: ""` como el estado "todavía no elegí
    // nivel" de su desplegable (ver `<option value="">— elegí un nivel
    // —</option>`) — un nivel guardado en ese estado quedaba sin ningún
    // aviso hasta ahora, y en el runtime intentaría navegar a
    // `/jugar/{childId}/nivel/` sin id.
    if (exit.target.kind === "level" && exit.target.levelId.trim() === "") {
      issues.push({
        severity: "error",
        message: `El punto de destino "${exit.label}" todavía no eligió a qué nivel lleva.`,
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

/**
 * Un `ChallengePlacement` con `moduleId` vacío es estructuralmente imposible
 * a través de `ChallengePicker.tsx` (`confirm(moduleId)` exige elegir un
 * módulo real antes de crear el desafío) — pero las plantillas de nivel
 * (Fase 25, docs/plan-salto-producto.md §3.2) sí dejan uno así a propósito,
 * como una de las dos decisiones que solo el padre puede tomar. Sin esta
 * comprobación, ese desafío quedaba sin ningún aviso.
 */
function validateChallengeModules(level: LevelDefinition, issues: LevelIssue[]): void {
  for (const challenge of level.challenges) {
    if (challenge.moduleId.trim() === "") {
      issues.push({
        severity: "error",
        message: "Hay un desafío sin ningún módulo de práctica asignado todavía.",
        target: { kind: "challenge", id: challenge.id },
      });
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

/**
 * Qué `LevelEventType` puede volver a disparar cada tipo de acción, de forma
 * indirecta, una vez que Fase 9 la aplique — el resto de acciones (cambiar
 * el estado de un objeto, mover a Alex, un sonido...) no tienen ningún
 * `LevelEventType` que las escuche automáticamente, así que no pueden ser
 * parte de un ciclo por sí solas.
 */
const CYCLE_EDGES: Partial<Record<LevelEventRule["actions"][number]["type"], LevelEventRule["trigger"]["type"]>> = {
  START_CHALLENGE: "ON_CHALLENGE_STARTED",
  UPDATE_MISSION: "ON_MISSION_COMPLETE",
};

/** Muy por debajo del límite duro de `assertSize` (`serialize.ts`, 400KiB
 *  por defecto) y del límite real de Firestore (1MiB) — dan margen para
 *  simplificar antes de que un guardado real falle. */
const SOFT_VERTEX_BUDGET = 300;
const SOFT_ENTITY_BUDGET = 150;
const SOFT_SIZE_BUDGET_BYTES = 150 * 1024;

function validateBudgets(level: LevelDefinition, issues: LevelIssue[]): void {
  const vertexCount =
    level.navigation.walkablePolygons.reduce((n, p) => n + p.points.length, 0) +
    level.navigation.blockedPolygons.reduce((n, p) => n + p.points.length, 0) +
    level.zones.reduce((n, z) => n + (z.shape.kind === "polygon" ? z.shape.points.length : 0), 0);
  if (vertexCount > SOFT_VERTEX_BUDGET) {
    issues.push({
      severity: "warning",
      message: `El nivel tiene ${vertexCount} vértices de navegación/zona, por encima de ${SOFT_VERTEX_BUDGET} — conviene simplificar los polígonos más grandes.`,
      target: { kind: "level" },
    });
  }

  if (level.entities.length > SOFT_ENTITY_BUDGET) {
    issues.push({
      severity: "warning",
      message: `El nivel tiene ${level.entities.length} entidades, por encima de ${SOFT_ENTITY_BUDGET}.`,
      target: { kind: "level" },
    });
  }

  const sizeBytes = new TextEncoder().encode(JSON.stringify(level)).length;
  if (sizeBytes > SOFT_SIZE_BUDGET_BYTES) {
    issues.push({
      severity: "warning",
      message: `El nivel serializado pesa ${(sizeBytes / 1024).toFixed(0)}KB, por encima de ${(SOFT_SIZE_BUDGET_BYTES / 1024).toFixed(0)}KB — se acerca al límite de guardado.`,
      target: { kind: "level" },
    });
  }
}

function validateEventCycles(level: LevelDefinition, issues: LevelIssue[]): void {
  // arista regla → regla: la acción de `from` puede re-disparar el trigger de `to`
  const graph = new Map<string, Set<string>>();
  for (const from of level.events) {
    const nextTypes = new Set(from.actions.map((a) => CYCLE_EDGES[a.type]).filter((t): t is LevelEventRule["trigger"]["type"] => !!t));
    if (nextTypes.size === 0) continue;
    const targets = new Set<string>();
    for (const to of level.events) {
      if (nextTypes.has(to.trigger.type)) targets.add(to.id);
    }
    if (targets.size > 0) graph.set(from.id, targets);
  }

  const WHITE = 0,
    GRAY = 1,
    BLACK = 2;
  const color = new Map<string, number>();
  const flagged = new Set<string>();

  function visit(id: string): void {
    color.set(id, GRAY);
    for (const next of graph.get(id) ?? []) {
      const c = color.get(next) ?? WHITE;
      if (c === GRAY) {
        flagged.add(id);
        flagged.add(next);
      } else if (c === WHITE) {
        visit(next);
      }
    }
    color.set(id, BLACK);
  }

  for (const rule of level.events) {
    if ((color.get(rule.id) ?? WHITE) === WHITE) visit(rule.id);
  }

  for (const rule of level.events) {
    if (flagged.has(rule.id)) {
      issues.push({
        severity: "warning",
        message: `La regla "${rule.name}" podría formar un ciclo con otra regla de evento (una acción vuelve a disparar el trigger de una regla que ya está en la cadena).`,
        target: { kind: "event", id: rule.id },
      });
    }
  }
}
