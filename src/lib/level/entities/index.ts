/**
 * Registra los tipos de entidad — §7.5: añadir un tipo nuevo son 2 archivos,
 * `types/nuevo.tsx` + una línea acá. `player-spawn` (§7.3) no está: el punto
 * de inicio ya lo resuelve `navigation.spawn` + la herramienta "Punto de
 * inicio" de la Fase 5 (`SET_SPAWN`) — modelarlo también como entidad
 * duplicaría la misma fuente de verdad sin ganar nada.
 *
 * El registro ocurre al importar este módulo (efecto de borde a nivel de
 * módulo, no algo que cada caller deba recordar invocar); Node/webpack solo
 * ejecuta un módulo una vez, así que no hay riesgo de doble registro.
 */
import { registerEntityType } from "./registry";
import { NPC_TYPE } from "./types/npc";
import { ENEMY_TYPE } from "./types/enemy";
import { DOOR_TYPE } from "./types/door";
import { TERMINAL_TYPE } from "./types/terminal";
import { COLLECTIBLE_TYPE } from "./types/collectible";
import { INTERACTIVE_TYPE } from "./types/interactive";

registerEntityType(NPC_TYPE);
registerEntityType(ENEMY_TYPE);
registerEntityType(DOOR_TYPE);
registerEntityType(TERMINAL_TYPE);
registerEntityType(COLLECTIBLE_TYPE);
registerEntityType(INTERACTIVE_TYPE);

export { getEntityType, listEntityTypes, resolveActiveState, createEntityDefaults, activeBlockerIdsOf } from "./registry";
export type { EntityTypeDef, EntityRenderProps, PropertyFieldDef } from "./registry";
