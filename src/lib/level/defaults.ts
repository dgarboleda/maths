import { LEVEL_SCHEMA_VERSION, type LevelBackground, type LevelDefinition } from "./schema";
import { newLevelId, newPolygonId } from "./ids";
import { DEFAULT_DEPTH_CONFIG } from "./depth";

/**
 * Nivel nuevo, jugable desde el minuto cero: un polígono transitable
 * rectangular por defecto (10,10)-(90,90) con el spawn en su centro —
 * docs/level-editor-plan.md §17 Fase 2. El creador del nivel parte de algo
 * que ya se puede "Probar" sin haber dibujado nada todavía.
 */
export function createEmptyLevel(authorUid: string, name: string, background: LevelBackground): LevelDefinition {
  const now = Date.now();
  return {
    id: newLevelId(),
    name,
    version: 1,
    schemaVersion: LEVEL_SCHEMA_VERSION,
    background,
    navigation: {
      walkablePolygons: [
        {
          id: newPolygonId(),
          points: [
            { x: 10, y: 10 },
            { x: 90, y: 10 },
            { x: 90, y: 90 },
            { x: 10, y: 90 },
          ],
          initiallyEnabled: true,
        },
      ],
      blockedPolygons: [],
      spawn: { x: 50, y: 50 },
      exits: [],
    },
    entities: [],
    zones: [],
    dialogs: [],
    challenges: [],
    missions: [],
    events: [],
    metadata: { authorUid, createdAt: now, updatedAt: now },
    // Desactivada por defecto (docs/scene-25d-plan.md §E.4): el autor la
    // activa explícitamente desde el panel de propiedades del nivel — un
    // nivel nuevo se ve y se comporta igual que antes de esta fase hasta
    // que alguien la enciende a propósito.
    depth: { ...DEFAULT_DEPTH_CONFIG },
  };
}
