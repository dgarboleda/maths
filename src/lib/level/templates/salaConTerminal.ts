import { createEmptyLevel } from "../defaults";
import { getEntityType, createEntityDefaults } from "../entities";
import { newChallengeId, newEntityId, newMissionId, newObjectiveId } from "../ids";
import type { LevelBackground, LevelDefinition, LevelEntity } from "../schema";

/**
 * Plantilla "Sala con terminal" — Fase 25 (docs/plan-salto-producto.md §3).
 * La forma más simple de un nivel jugable: una terminal que abre un desafío
 * al tocarla (`onEntityClick` en `LevelRuntime.tsx` abre el desafío directo
 * cuando la entidad tiene un `ChallengePlacement` — no hace falta ninguna
 * regla de evento), con una misión de un solo objetivo.
 *
 * Deja deliberadamente sin asignar el `moduleId` del desafío — es una de las
 * decisiones que solo el padre puede tomar (§3.2); `validateLevel` la
 * reporta como error clicable (`validateChallengeModules`, validate.ts).
 */
export function buildSalaConTerminal(authorUid: string, name: string, background: LevelBackground): LevelDefinition {
  const level = createEmptyLevel(authorUid, name, background);

  const terminalDefaults = createEntityDefaults(getEntityType("terminal"));
  const terminal: LevelEntity = {
    id: newEntityId(),
    type: "terminal",
    name: "Terminal",
    position: { x: 50, y: 45 },
    ...terminalDefaults,
    interaction: { ...terminalDefaults.interaction, standPoint: { x: 50, y: 62 } },
  };

  const challengeId = newChallengeId();

  return {
    ...level,
    entities: [terminal],
    challenges: [{ id: challengeId, moduleId: "", activityId: "puzzle", sourceEntityId: terminal.id }],
    missions: [
      {
        id: newMissionId(),
        title: "Repara la terminal",
        premise: "Algo falla en la terminal — resolvé el desafío para activarla.",
        objectives: [{ id: newObjectiveId(), label: "Activar la terminal", source: { kind: "challenge", challengeId } }],
      },
    ],
  };
}
