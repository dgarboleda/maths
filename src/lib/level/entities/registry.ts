/**
 * Registro de tipos de entidad — docs/level-editor-plan.md §7. Cero
 * `switch (entity.type)` en el core: el reducer, el canvas, el panel de
 * propiedades y (en Fase 9) el runtime solo conocen `LevelEntity` y
 * `EntityTypeDef`. Todo lo específico de un tipo vive en su propio archivo
 * bajo `types/*.tsx` y se registra acá.
 *
 * Contrato de extensibilidad (§7.5, entregable de Fase 6): añadir un tipo
 * nuevo son 2 archivos — `types/nuevo.tsx` + una línea en `index.ts`. Nada
 * de lo de acá cambia.
 */
import type { ComponentType } from "react";
import type { EntityInteraction, EntityStateDef, EntityStateMachineDef, EntityTypeId, LevelEntity, PropertyValue } from "@/lib/level/schema";

export type EntitySection = "objects";

/**
 * Base común de todo descriptor de campo — Fase 15 (docs/level-editor-plan-v2.md
 * §2.3): `hint` es el único campo nuevo. Con él, `PropertyField` pinta un
 * tooltip de ayuda junto a la etiqueta sin que ningún panel que lo consume
 * (`EditorPropertyPanel`, `ActionFields`/`EventChainEditor`, y los futuros
 * editores de Mundo/Currícula) tenga que tocarse.
 */
interface BaseFieldDef {
  key: string;
  label: string;
  /** Texto corto de ayuda, mostrado en un tooltip junto a `label`. Opcional
   *  a propósito: no todos los campos lo necesitan (p. ej. "Nombre"). */
  hint?: string;
}

/**
 * Descriptor de un campo del panel de propiedades — dirige `PropertyField`
 * (§5.3) sin que el panel necesite saber nada del tipo. Toda referencia
 * (`entityRef`/`zoneRef`/`dialogRef`/`polygonRef`) se elige de un
 * desplegable poblado desde el propio `level`, nunca se escribe a mano.
 */
export type PropertyFieldDef = BaseFieldDef &
  (
    | { kind: "text"; default: string }
    | { kind: "number"; default: number; min?: number; max?: number; step?: number }
    | { kind: "boolean"; default: boolean }
    | { kind: "image"; default: string }
    /** Enum cerrado con etiquetas — Fase 16 (docs/level-editor-plan-v2.md
     *  §3.3): las reglas generales del Mundo (`WorldRules`) son el primer
     *  consumidor, reutilizando este mismo `PropertyField` para no crear un
     *  componente de campo nuevo. */
    | { kind: "select"; default: string; options: { value: string; label: string }[] }
    | { kind: "entityRef"; default: string; ofType?: EntityTypeId[] }
    | { kind: "zoneRef"; default: string }
    | { kind: "dialogRef"; default: string }
    | { kind: "polygonRef"; default: string; role?: "walkable" | "blocked" }
    /** Lista de puntos en % de imagen — hoy solo `enemy.patrol` (§7.3), sin
     *  ningún efecto en el runtime todavía (`useEntityMovement` es Fase 9+). */
    | { kind: "points"; default: PropertyValue }
  );

export interface EntityRenderProps {
  entity: LevelEntity;
  /** Estado activo resuelto de `entity.state.initial` contra
   *  `typeDef.defaultStates` — nunca `undefined` (cae al primer estado). */
  activeState: EntityStateDef;
  mode: "editor" | "runtime";
  selected: boolean;
  onSelect: () => void;
}

export interface EntityTypeDef {
  id: EntityTypeId;
  label: string;
  Icon: ComponentType<{ className?: string }>;
  section: EntitySection;
  /** Alto aproximado en % de imagen — sugiere `layer`/tamaño al colocar. */
  defaultHeightPct: number;
  defaultStates: EntityStateMachineDef;
  defaultInteraction: EntityInteraction;
  /** Descriptores adicionales a las propiedades comunes de `LevelEntity`
   *  (name/position/rotation/scale/layer/visible), que pinta el panel sin
   *  pasar por acá. */
  properties: PropertyFieldDef[];
  /** Mismo componente en editor y runtime — `mode` solo añade el resalte de
   *  selección. Lo que se ve editando es lo que se ve jugando. */
  Render: ComponentType<EntityRenderProps>;
  /**
   * Qué `NavPolygon` bloquea esta entidad AHORA (Fase 9, `runtime/
   * navigation.ts:buildRuntimeMesh`) — por defecto `activeState.
   * activeBlockerIds` (fijo por tipo, §7.3). Un tipo cuyo bloqueador es dato
   * de INSTANCIA en vez de estar fijo en `defaultStates` (p. ej. `door`:
   * `properties.blockerPolygonId` es el vano que dibujó quien construyó ESE
   * nivel, no algo que el tipo pueda declarar de antemano) lo sobreescribe
   * acá — ver `types/door.tsx`.
   */
  resolveBlockerIds?: (entity: LevelEntity, activeState: EntityStateDef) => string[];
}

/** Bloqueadores activos de `entity` ahora mismo — nunca se lee
 *  `activeState.activeBlockerIds` directo fuera de este helper (Fase 9). */
export function activeBlockerIdsOf(entity: LevelEntity, typeDef: EntityTypeDef, activeState: EntityStateDef): string[] {
  return typeDef.resolveBlockerIds ? typeDef.resolveBlockerIds(entity, activeState) : activeState.activeBlockerIds;
}

const registry = new Map<EntityTypeId, EntityTypeDef>();

export function registerEntityType(def: EntityTypeDef): void {
  registry.set(def.id, def);
}

export function getEntityType(id: EntityTypeId): EntityTypeDef {
  const def = registry.get(id);
  if (!def) throw new Error(`Tipo de entidad no registrado: "${id}". ¿Falta importarlo en entities/index.ts?`);
  return def;
}

export function listEntityTypes(): EntityTypeDef[] {
  return [...registry.values()];
}

/** El estado activo de `entity` contra su tipo — nunca `undefined`: si
 *  `state.initial` no matchea ningún id (dato corrupto/tipo cambiado a
 *  mano en Firestore), cae al primer estado del tipo. */
export function resolveActiveState(entity: LevelEntity, typeDef: EntityTypeDef): EntityStateDef {
  return typeDef.defaultStates.states.find((s) => s.id === entity.state.initial) ?? typeDef.defaultStates.states[0];
}

export function createEntityDefaults(typeDef: EntityTypeDef): Pick<LevelEntity, "rotation" | "scale" | "layer" | "visible" | "interaction" | "state" | "properties"> {
  return {
    rotation: 0,
    scale: 1,
    layer: 0,
    visible: true,
    interaction: typeDef.defaultInteraction,
    state: { initial: typeDef.defaultStates.initial },
    properties: Object.fromEntries(typeDef.properties.map((f) => [f.key, f.default])),
  };
}
