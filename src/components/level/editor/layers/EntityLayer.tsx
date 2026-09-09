"use client";

import type { CSSProperties } from "react";
import { getEntityType, resolveActiveState } from "@/lib/level/entities";
import { depthScaleFor } from "@/lib/level/depth";
import type { LevelDepthConfig, LevelEntity } from "@/lib/level/schema";
import type { Selection } from "../editorReducer";

/**
 * Pinta todas las entidades con el mismo orden que verá el jugador —
 * y-sort de docs/level-editor-plan.md §7.4 (`layer` desempata, luego `y`).
 * Cero `switch (entity.type)`: cada tipo pinta con su propio `Render`.
 *
 * Cada entidad se envuelve en un `div` de tamaño 0 (no posicionado, no
 * afecta el layout ni el hit-testing) que solo fija la variable CSS
 * `--depth-scale` — `EntityButton` (docs/scene-25d-plan.md §D.4) la
 * multiplica en su propio `transform`. Sin `level.depth`/desactivada,
 * `depthScaleFor` devuelve 1 y el resultado es idéntico al de antes.
 */
export function EntityLayer({
  entities,
  selection,
  onSelect,
  depth,
}: {
  entities: LevelEntity[];
  selection: Selection;
  onSelect: (id: string) => void;
  depth?: LevelDepthConfig;
}) {
  const painted = [...entities].sort((a, b) => a.layer - b.layer || a.position.y - b.position.y);

  return (
    // `pointer-events-none` en el contenedor: es un div lleno (`inset-0`)
    // encima de `PolygonEditor` en el DOM, y sin esto se tragaría todos los
    // clics del canvas (mismo criterio que el `<svg>` de `SelectionLayer`).
    // Cada `<button>` de entidad reactiva sus propios eventos con `EntityButton`.
    <div className="pointer-events-none absolute inset-0">
      {painted.map((entity) => {
        const typeDef = getEntityType(entity.type);
        const activeState = resolveActiveState(entity, typeDef);
        const Render = typeDef.Render;
        return (
          <div key={entity.id} style={{ "--depth-scale": depthScaleFor(entity.position.y, depth) } as CSSProperties}>
            <Render
              entity={entity}
              activeState={activeState}
              mode="editor"
              selected={selection.kind === "entity" && selection.id === entity.id}
              onSelect={() => onSelect(entity.id)}
            />
          </div>
        );
      })}
    </div>
  );
}
