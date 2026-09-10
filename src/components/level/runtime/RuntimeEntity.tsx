import type { CSSProperties } from "react";
import { getEntityType } from "@/lib/level/entities";
import { depthScaleFor } from "@/lib/level/depth";
import type { LevelDepthConfig, LevelEntity } from "@/lib/level/schema";
import { currentStateOf, isEntityVisible, type LevelRuntimeState } from "@/lib/level/runtime/state";

/**
 * Pinta una entidad en modo juego — el MISMO `Render` que el editor
 * (docs/level-editor-plan.md §7.2): lo que se ve editando es lo que se ve
 * jugando, sin dos renderers que puedan divergir. Solo cambian `mode` (sin
 * el resalte de selección) y de dónde sale el estado activo: acá de
 * `LevelRuntimeState` (vivo, puede haber cambiado por un evento), no de
 * `entity.state.initial`.
 *
 * El wrapper que fija `--depth-scale` (docs/scene-25d-plan.md §D.4) es el
 * mismo mecanismo que usa el editor (`EntityLayer.tsx`) — un solo cálculo
 * compartido (`depthScaleFor`), cero lógica de profundidad dentro de
 * `Render`/`EntityButton` más allá de leer esa variable.
 */
export function RuntimeEntity({
  entity,
  runtimeState,
  onInteract,
  depth,
}: {
  entity: LevelEntity;
  runtimeState: LevelRuntimeState;
  onInteract: (entity: LevelEntity) => void;
  depth?: LevelDepthConfig;
}) {
  if (!isEntityVisible(entity, runtimeState)) return null;
  const typeDef = getEntityType(entity.type);
  const activeState = currentStateOf(entity, runtimeState);
  const Render = typeDef.Render;
  return (
    <div style={{ "--depth-scale": depthScaleFor(entity.position.y, depth) } as CSSProperties}>
      <Render entity={entity} activeState={activeState} mode="runtime" selected={false} onSelect={() => onInteract(entity)} />
    </div>
  );
}
