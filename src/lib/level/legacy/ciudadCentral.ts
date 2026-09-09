import {
  CIUDAD_CENTRAL_HOTSPOTS,
  CIUDAD_CENTRAL_IMAGE_SIZE,
  CIUDAD_CENTRAL_WALKABLE,
  PLAYER_START,
  type CiudadCentralHotspot,
  type CiudadCentralHotspotKind,
} from "@/lib/world/questScene";
import { QUESTS } from "@/lib/world/quests";
import {
  LEVEL_SCHEMA_VERSION,
  type ChallengePlacement,
  type EntityTypeId,
  type LevelDefinition,
  type LevelEntity,
  type LevelEventRule,
  type LevelMission,
} from "../schema";
import { newChallengeId, newDialogId, newEntityId, newEventId, newLevelId, newMissionId, newObjectiveId, newPolygonId } from "../ids";

/**
 * Traduce Ciudad Central (`questScene.ts`, el nivel hoy hardcodeado en
 * `QuestScene.tsx`) al esquema del Level Editor — docs/level-editor-plan.md
 * §12.3/§12.4. Es la fuente real de `/jugar/[childId]` cuando
 * `NEXT_PUBLIC_LEVELS_V2` está activo (Fase 14); con el flag apagado (el
 * default), `QuestScene.tsx` sigue siendo la escena real sin cambios
 * (§12.1, "coexistencia, no reemplazo") — este adaptador no lo toca ni lo
 * reemplaza en el código, solo ofrece una traducción completa y opcional.
 *
 * La malla de navegación y las 5 entidades siguen siendo un calco exacto
 * (mismo `boundary`/`holes`/posiciones que `CIUDAD_CENTRAL_WALKABLE`/
 * `CIUDAD_CENTRAL_HOTSPOTS` — ver la prueba de paridad en
 * `unidad-nivel.spec.ts`). Lo que agrega esta fase respecto al adaptador de
 * la Fase 2 son los 3 desafíos reales (terminal/medidor/compuerta), la
 * misión "El apagón" (mismos objetivos que `QUESTS[0]`) y la cadena de
 * eventos que reproduce la progresión de `hotspotState`/`worldFlags`
 * (`questScene.ts`) con las piezas genéricas del motor (`enabledWhen` +
 * `SET_FLAG`/`CHANGE_OBJECT_STATE`/`OPEN_DOOR`/`SHOW_CLUE`/
 * `background.filters`).
 *
 * Simplificaciones deliberadas frente a `QuestScene.tsx` (documentadas
 * también en la PR de Fase 14, ninguna silenciosa):
 * - La presentación especial de Khaos la primera vez que se saluda a la
 *   Dra. Nia (`NIA_ORIGIN_INTRO`) no se reproduce: el diálogo genérico
 *   (`LevelDialog`) es un guion fijo, no uno condicionado a
 *   `hasAnyRealPlay`. Nia siempre cuenta la misma introducción del apagón.
 * - No hay flecha guía sobre el hotspot activo ni vista previa de la
 *   próxima misión en el overlay de recompensa — el HUD genérico
 *   (`LevelHud`/`LevelMissionOverlay`) no tiene esas piezas.
 * - El hotspot "Túnel al Distrito Taller" se mantiene como quinta entidad
 *   (paridad de conteo con `CIUDAD_CENTRAL_HOTSPOTS`) pero queda inerte
 *   (`interaction.mode: "none"`): la navegación a la siguiente zona ya la
 *   cubre el registro de misión (`/jugar/{childId}/misiones`, probado en
 *   `aventura.spec.ts`), y modelar un túnel que se despeja de verdad exigía
 *   inventar geometría bloqueada que no existe en `CIUDAD_CENTRAL_WALKABLE`.
 */

const KIND_TO_ENTITY_TYPE: Record<CiudadCentralHotspotKind, EntityTypeId> = {
  npc: "npc",
  terminal: "terminal",
  mecanismo: "interactive",
  puerta: "door",
  barrera: "interactive",
};

/** Estado inicial real del tipo registrado — nunca el "default" provisional
 *  de antes de la Fase 6: ahora estas entidades se renderizan de verdad. */
const INITIAL_STATE: Record<CiudadCentralHotspotKind, string> = {
  npc: "idle",
  terminal: "off",
  mecanismo: "default",
  puerta: "locked",
  barrera: "default",
};

function hotspotToEntity(hotspot: CiudadCentralHotspot): LevelEntity {
  const inert = hotspot.id === "siguiente-mision";
  return {
    id: newEntityId(),
    type: KIND_TO_ENTITY_TYPE[hotspot.kind],
    name: hotspot.label,
    position: { x: hotspot.x, y: hotspot.y },
    rotation: 0,
    scale: 1,
    layer: 0,
    visible: true,
    interaction: {
      mode: inert ? "none" : "click",
      standPoint: inert ? null : { x: hotspot.standX, y: hotspot.standY },
      radius: 4,
      // `LevelChallengeOverlay` usa `interaction.prompt` como "clue" del
      // puzzle (nunca `properties`, que solo lee el panel del editor) — el
      // guion real de cada hotspot, igual que `intro.join(" ")` en
      // `QuestScene.tsx`.
      prompt: hotspot.intro.join(" ") || hotspot.label,
      lockedNote: hotspot.lockedNote,
      // "Siempre" acá — el candado real (quién puede interactuar todavía)
      // se decide por evento más abajo, gating cada entidad puntual según
      // le corresponda (Nia no tiene, terminal/medidor/compuerta sí).
      enabledWhen: { kind: "always" },
    },
    state: { initial: INITIAL_STATE[hotspot.kind] },
    properties: {},
  };
}

/** Construye el `LevelDefinition` equivalente a Ciudad Central, con su
 *  progresión jugable completa. */
export function ciudadCentralAsLevel(authorUid: string): LevelDefinition {
  const now = Date.now();
  const entities = CIUDAD_CENTRAL_HOTSPOTS.map(hotspotToEntity);
  const byId = (hotspotId: string) => entities[CIUDAD_CENTRAL_HOTSPOTS.findIndex((h) => h.id === hotspotId)];
  const nia = byId("nia");
  const terminal = byId("terminal");
  const medidor = byId("medidor");
  const compuerta = byId("compuerta");

  const [terminalObjetivo, medidorObjetivo, compuertaObjetivo] = QUESTS[0].objectives;

  // Cada candado se resuelve con `enabledWhen` sobre una bandera que la
  // acción anterior deja fijada — mismo orden que `STEP_ORDER`
  // (questScene.ts): npc -> terminal -> medidor -> compuerta -> fin.
  terminal.interaction.enabledWhen = { kind: "flag", flag: "niaGreeted", value: true };
  medidor.interaction.enabledWhen = { kind: "flag", flag: "terminalDone", value: true };
  compuerta.interaction.enabledWhen = { kind: "flag", flag: "medidorDone", value: true };

  const terminalChallenge: ChallengePlacement = {
    id: newChallengeId(),
    moduleId: terminalObjetivo.moduleId,
    activityId: "puzzle",
    sourceEntityId: terminal.id,
  };
  const medidorChallenge: ChallengePlacement = {
    id: newChallengeId(),
    moduleId: medidorObjetivo.moduleId,
    activityId: "puzzle",
    sourceEntityId: medidor.id,
  };
  const compuertaChallenge: ChallengePlacement = {
    id: newChallengeId(),
    moduleId: compuertaObjetivo.moduleId,
    activityId: "puzzle",
    sourceEntityId: compuerta.id,
  };

  const hotspotById = (id: string) => CIUDAD_CENTRAL_HOTSPOTS.find((h) => h.id === id)!;
  const niaHotspot = hotspotById("nia");
  const niaDialog = {
    id: newDialogId(),
    name: "Dra. Nia — El apagón",
    lines: niaHotspot.intro.map((text) => ({ speakerEntityId: nia.id, text })),
  };

  const mission: LevelMission = {
    id: newMissionId(),
    title: QUESTS[0].title,
    premise: QUESTS[0].premise,
    objectives: [
      { id: newObjectiveId(), label: terminalObjetivo.label, source: { kind: "challenge", challengeId: terminalChallenge.id } },
      { id: newObjectiveId(), label: medidorObjetivo.label, source: { kind: "challenge", challengeId: medidorChallenge.id } },
      { id: newObjectiveId(), label: compuertaObjetivo.label, source: { kind: "challenge", challengeId: compuertaChallenge.id } },
    ],
  };

  const events: LevelEventRule[] = [
    {
      id: newEventId(),
      name: "Saludar a la Dra. Nia abre camino a la terminal",
      trigger: { type: "ON_INTERACT", entityId: nia.id },
      when: { kind: "always" },
      once: false,
      actions: [
        { type: "SHOW_DIALOG", params: { dialogId: niaDialog.id }, delayMs: 0 },
        { type: "SET_FLAG", params: { flag: "niaGreeted", value: true }, delayMs: 0 },
      ],
    },
    {
      id: newEventId(),
      name: "Terminal resuelta -> se abre el camino al medidor",
      trigger: { type: "ON_CHALLENGE_SUCCESS", challengeId: terminalChallenge.id },
      when: { kind: "always" },
      once: true,
      actions: [
        { type: "CHANGE_OBJECT_STATE", params: { entityId: terminal.id, state: "on" }, delayMs: 0 },
        { type: "SET_FLAG", params: { flag: "terminalDone", value: true }, delayMs: 0 },
        { type: "SHOW_CLUE", params: { text: hotspotById("terminal").outcome, ms: 4000 }, delayMs: 200 },
      ],
    },
    {
      id: newEventId(),
      name: "Medidor calibrado -> se abre el camino a la compuerta",
      trigger: { type: "ON_CHALLENGE_SUCCESS", challengeId: medidorChallenge.id },
      when: { kind: "always" },
      once: true,
      actions: [
        { type: "SET_FLAG", params: { flag: "medidorDone", value: true }, delayMs: 0 },
        { type: "SHOW_CLUE", params: { text: hotspotById("medidor").outcome, ms: 4000 }, delayMs: 200 },
      ],
    },
    {
      id: newEventId(),
      name: "Compuerta abierta -> la central se restaura",
      trigger: { type: "ON_CHALLENGE_SUCCESS", challengeId: compuertaChallenge.id },
      when: { kind: "always" },
      once: true,
      actions: [
        { type: "OPEN_DOOR", params: { entityId: compuerta.id }, delayMs: 0 },
        { type: "SET_FLAG", params: { flag: "cityRestored", value: true }, delayMs: 0 },
        { type: "SHOW_CLUE", params: { text: hotspotById("compuerta").outcome, ms: 5000 }, delayMs: 200 },
      ],
    },
  ];

  return {
    id: newLevelId(),
    name: "Ciudad Central",
    version: 1,
    schemaVersion: LEVEL_SCHEMA_VERSION,
    background: {
      src: "/illustrations/city-central.webp",
      width: CIUDAD_CENTRAL_IMAGE_SIZE.width,
      height: CIUDAD_CENTRAL_IMAGE_SIZE.height,
      alt: "Ciudad Central de noche: plaza con fuente, central eléctrica apagada, tienda, taller, laboratorio y un túnel bloqueado.",
      projection: "flat",
      // Mismo `brightness-110 saturate-125` de QuestScene.tsx:413-415,
      // ahora configurable en vez de un `if` hardcodeado (§8.5 de Opus).
      filters: [{ id: "restaurada", when: { kind: "flag", flag: "cityRestored", value: true }, css: "brightness(1.1) saturate(1.25)" }],
    },
    navigation: {
      walkablePolygons: [
        {
          id: newPolygonId(),
          points: CIUDAD_CENTRAL_WALKABLE.boundary,
          initiallyEnabled: true,
        },
      ],
      blockedPolygons: CIUDAD_CENTRAL_WALKABLE.holes.map((hole) => ({
        id: newPolygonId(),
        points: hole,
        initiallyEnabled: true,
      })),
      spawn: PLAYER_START,
      exits: [],
    },
    entities,
    zones: [],
    dialogs: [niaDialog],
    challenges: [terminalChallenge, medidorChallenge, compuertaChallenge],
    missions: [mission],
    events,
    metadata: { authorUid, createdAt: now, updatedAt: now, description: "Escena real de Ciudad Central (Fase 14, detrás de NEXT_PUBLIC_LEVELS_V2)." },
  };
}
