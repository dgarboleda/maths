import {
  CIUDAD_CENTRAL_HOTSPOTS,
  CIUDAD_CENTRAL_IMAGE_SIZE,
  CIUDAD_CENTRAL_WALKABLE,
  PLAYER_START,
  type CiudadCentralHotspot,
  type CiudadCentralHotspotKind,
} from "@/lib/world/questScene";
import { LEVEL_SCHEMA_VERSION, type EntityTypeId, type LevelDefinition, type LevelEntity } from "../schema";
import { newEntityId, newLevelId, newPolygonId } from "../ids";

/**
 * Traduce Ciudad Central (`questScene.ts`, el nivel hardcodeado que ya
 * existe en producción) al esquema nuevo del Level Editor — SOLO para
 * pruebas y documentación, NUNCA para producción (docs/level-editor-plan.md
 * §12.3). No sustituye a `QuestScene.tsx`: Ciudad Central sigue jugándose
 * exactamente como hoy (§12.1/§12.2, "coexistencia, no reemplazo").
 *
 * Sirve para dos cosas:
 * 1. Demostrar, con una prueba automática, que el modelo nuevo puede
 *    expresar un nivel real ya existente sin perder la geometría de
 *    navegación (`validateLevel(ciudadCentralAsLevel(...))` da cero
 *    errores, y el polígono coincide punto a punto con
 *    `CIUDAD_CENTRAL_WALKABLE`).
 * 2. Documentar, con un ejemplo concreto, cómo se traduce el vocabulario
 *    viejo (`CiudadCentralHotspotKind`) al nuevo (`EntityTypeId`).
 */

const KIND_TO_ENTITY_TYPE: Record<CiudadCentralHotspotKind, EntityTypeId> = {
  npc: "npc",
  terminal: "terminal",
  mecanismo: "interactive",
  puerta: "door",
  barrera: "interactive",
};

function hotspotToEntity(hotspot: CiudadCentralHotspot): LevelEntity {
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
      mode: "click",
      standPoint: { x: hotspot.standX, y: hotspot.standY },
      radius: 4,
      prompt: hotspot.label,
      lockedNote: hotspot.lockedNote,
      enabledWhen: { kind: "always" },
    },
    // Sin registro de tipos todavía (Fase 6): "default" es un id de estado
    // provisional, no una máquina de estados real de ningún EntityTypeDef.
    state: { initial: "default" },
    properties: { introLines: hotspot.intro, outcome: hotspot.outcome },
  };
}

/** Construye el `LevelDefinition` equivalente a Ciudad Central. */
export function ciudadCentralAsLevel(authorUid: string): LevelDefinition {
  const now = Date.now();
  return {
    id: newLevelId(),
    name: "Ciudad Central (adaptador legacy)",
    version: 1,
    schemaVersion: LEVEL_SCHEMA_VERSION,
    background: {
      src: "/illustrations/city-central.webp",
      width: CIUDAD_CENTRAL_IMAGE_SIZE.width,
      height: CIUDAD_CENTRAL_IMAGE_SIZE.height,
      alt: "Ciudad Central de noche: plaza con fuente, central eléctrica apagada, tienda, taller, laboratorio y un túnel bloqueado.",
      projection: "flat",
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
    entities: CIUDAD_CENTRAL_HOTSPOTS.map(hotspotToEntity),
    zones: [],
    dialogs: [],
    challenges: [],
    missions: [],
    events: [],
    metadata: { authorUid, createdAt: now, updatedAt: now, description: "Adaptador de prueba — no se usa en producción." },
  };
}
