import { createEmptyLevel } from "../defaults";
import { getEntityType, createEntityDefaults } from "../entities";
import { newChallengeId, newEntityId, newEventId, newExitId, newPolygonId } from "../ids";
import type { LevelBackground, LevelDefinition, LevelEntity } from "../schema";

/**
 * Plantilla "Pasillo con puerta" — Fase 25 (docs/plan-salto-producto.md §3).
 * Mismo mecanismo de puerta que `ciudadCentralAsLevel` (legacy/ciudadCentral.ts):
 * un `NavPolygon` bloqueado (el vano) que la propia puerta activa/desactiva
 * según su estado (`DOOR_TYPE.resolveBlockerIds`, entities/types/door.tsx) —
 * `initiallyEnabled: false` en el polígono porque el bloqueo real viene del
 * estado inicial "locked" de la puerta, no del polígono en sí.
 *
 * La puerta es la propia fuente del desafío (clic → `onEntityClick` lo abre
 * directo); resolverlo dispara, vía una regla de evento, `OPEN_DOOR` sobre
 * la puerta — eso desactiva el bloqueador y deja pasar a la zona de salida.
 *
 * Dos decisiones deliberadamente sin tomar (§3.2), cada una un error
 * clicable de `validateLevel`: el `moduleId` del desafío (vacío,
 * `validateChallengeModules`) y el nivel de destino de la salida (`levelId:
 * ""`, el mismo estado "todavía sin elegir" que usa `ExitEditor.tsx`).
 */
export function buildPasilloConPuerta(authorUid: string, name: string, background: LevelBackground): LevelDefinition {
  const level = createEmptyLevel(authorUid, name, background);

  const blockerPolygonId = newPolygonId();
  const doorDefaults = createEntityDefaults(getEntityType("door"));
  const door: LevelEntity = {
    id: newEntityId(),
    type: "door",
    name: "Puerta",
    position: { x: 50, y: 50 },
    ...doorDefaults,
    interaction: { ...doorDefaults.interaction, standPoint: { x: 40, y: 50 } },
    properties: { ...doorDefaults.properties, blockerPolygonId },
  };

  const challengeId = newChallengeId();

  return {
    ...level,
    navigation: {
      ...level.navigation,
      blockedPolygons: [
        {
          id: blockerPolygonId,
          points: [
            { x: 48, y: 10 },
            { x: 52, y: 10 },
            { x: 52, y: 90 },
            { x: 48, y: 90 },
          ],
          initiallyEnabled: false,
        },
      ],
      spawn: { x: 30, y: 50 },
      exits: [
        {
          id: newExitId(),
          polygon: [
            { x: 78, y: 40 },
            { x: 88, y: 40 },
            { x: 88, y: 60 },
            { x: 78, y: 60 },
          ],
          label: "Salida",
          target: { kind: "level", levelId: "" },
        },
      ],
    },
    entities: [door],
    challenges: [{ id: challengeId, moduleId: "", activityId: "puzzle", sourceEntityId: door.id }],
    events: [
      {
        id: newEventId(),
        name: "Desafío resuelto -> se abre la puerta",
        trigger: { type: "ON_CHALLENGE_SUCCESS", challengeId },
        when: { kind: "always" },
        once: true,
        actions: [{ type: "OPEN_DOOR", params: { entityId: door.id }, delayMs: 0 }],
      },
    ],
  };
}
