import { getEntityType } from "@/lib/level/entities";
import type { LevelEntity } from "@/lib/level/schema";
import { currentStateOf, isEntityVisible, type LevelRuntimeState } from "@/lib/level/runtime/state";

/**
 * Pinta una entidad en modo juego — el MISMO `Render` que el editor
 * (docs/level-editor-plan.md §7.2): lo que se ve editando es lo que se ve
 * jugando, sin dos renderers que puedan divergir. Solo cambian `mode` (sin
 * el resalte de selección) y de dónde sale el estado activo: acá de
 * `LevelRuntimeState` (vivo, puede haber cambiado por un evento), no de
 * `entity.state.initial`.
 */
export function RuntimeEntity({ entity, runtimeState, onInteract }: { entity: LevelEntity; runtimeState: LevelRuntimeState; onInteract: (entity: LevelEntity) => void }) {
  if (!isEntityVisible(entity, runtimeState)) return null;
  const typeDef = getEntityType(entity.type);
  const activeState = currentStateOf(entity, runtimeState);
  const Render = typeDef.Render;
  return <Render entity={entity} activeState={activeState} mode="runtime" selected={false} onSelect={() => onInteract(entity)} />;
}
