"use client";

import { getEntityType, resolveActiveState } from "@/lib/level/entities";
import type { LevelEntity } from "@/lib/level/schema";
import type { Selection } from "../editorReducer";

/**
 * Pinta todas las entidades con el mismo orden que verá el jugador —
 * y-sort de docs/level-editor-plan.md §7.4 (`layer` desempata, luego `y`).
 * Cero `switch (entity.type)`: cada tipo pinta con su propio `Render`.
 */
export function EntityLayer({ entities, selection, onSelect }: { entities: LevelEntity[]; selection: Selection; onSelect: (id: string) => void }) {
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
          <Render
            key={entity.id}
            entity={entity}
            activeState={activeState}
            mode="editor"
            selected={selection.kind === "entity" && selection.id === entity.id}
            onSelect={() => onSelect(entity.id)}
          />
        );
      })}
    </div>
  );
}
