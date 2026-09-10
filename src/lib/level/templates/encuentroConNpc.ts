import { createEmptyLevel } from "../defaults";
import { getEntityType, createEntityDefaults } from "../entities";
import { newChallengeId, newDialogId, newEntityId, newEventId } from "../ids";
import type { LevelBackground, LevelDefinition, LevelEntity } from "../schema";

const MET_NPC_FLAG = "conocioAlPersonaje";

/**
 * Plantilla "Encuentro con NPC" — Fase 25 (docs/plan-salto-producto.md §3).
 * Un NPC y una terminal son DOS entidades separadas a propósito: si el
 * desafío estuviera en el propio NPC, tocarlo abriría el desafío directo
 * (`onEntityClick` prioriza el `ChallengePlacement` sobre el diálogo cuando
 * ambos están en la misma entidad) y el diálogo nunca se vería. El mismo
 * patrón que ya usa `ciudadCentralAsLevel` para Nia→terminal
 * (legacy/ciudadCentral.ts): hablar con el NPC dispara el diálogo y fija
 * una bandera; la terminal queda bloqueada (`lockedNote`) hasta que esa
 * bandera esté puesta.
 *
 * Deja deliberadamente sin asignar el `moduleId` del desafío (§3.2) —
 * `validateLevel` lo reporta como error clicable.
 */
export function buildEncuentroConNpc(authorUid: string, name: string, background: LevelBackground): LevelDefinition {
  const level = createEmptyLevel(authorUid, name, background);

  const dialogId = newDialogId();
  const npcDefaults = createEntityDefaults(getEntityType("npc"));
  const npc: LevelEntity = {
    id: newEntityId(),
    type: "npc",
    name: "Personaje",
    position: { x: 35, y: 45 },
    ...npcDefaults,
    interaction: { ...npcDefaults.interaction, standPoint: { x: 35, y: 62 } },
    properties: { ...npcDefaults.properties, dialogId },
  };

  const terminalDefaults = createEntityDefaults(getEntityType("terminal"));
  const terminal: LevelEntity = {
    id: newEntityId(),
    type: "terminal",
    name: "Terminal",
    position: { x: 65, y: 45 },
    ...terminalDefaults,
    interaction: {
      ...terminalDefaults.interaction,
      standPoint: { x: 65, y: 62 },
      enabledWhen: { kind: "flag", flag: MET_NPC_FLAG, value: true },
    },
  };

  const challengeId = newChallengeId();

  return {
    ...level,
    entities: [npc, terminal],
    dialogs: [
      {
        id: dialogId,
        name: "Conversación",
        lines: [
          { speakerEntityId: npc.id, text: "¡Hola! Necesito una mano con algo." },
          { speakerEntityId: npc.id, text: "Hay un desafío esperando en esa terminal." },
          { speakerEntityId: npc.id, text: "¡Andá, vos podés!" },
        ],
      },
    ],
    challenges: [{ id: challengeId, moduleId: "", activityId: "puzzle", sourceEntityId: terminal.id }],
    events: [
      {
        id: newEventId(),
        name: "Hablar con el personaje habilita la terminal",
        trigger: { type: "ON_INTERACT", entityId: npc.id },
        when: { kind: "always" },
        once: false,
        actions: [
          { type: "SHOW_DIALOG", params: { dialogId }, delayMs: 0 },
          { type: "SET_FLAG", params: { flag: MET_NPC_FLAG, value: true }, delayMs: 0 },
        ],
      },
    ],
  };
}
