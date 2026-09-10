import { Skull } from "lucide-react";
import { EntityButton } from "../entityVisuals";
import type { EntityRenderProps, EntityTypeDef } from "../registry";

function EnemyRender({ entity, activeState, selected, onSelect }: EntityRenderProps) {
  return <EntityButton entity={entity} activeState={activeState} selected={selected} onSelect={onSelect} Icon={Skull} tone="rose" />;
}

/**
 * `properties.patrol: Vec2[]` ya está en el esquema (§7.3) para cuando
 * exista `useEntityMovement` (Fase 9+, opcional) — hoy solo se guarda, sin
 * ningún efecto en el runtime todavía. `blockerPolygonId` sí se resuelve
 * (mismo criterio que `door`): un enemigo activo bloquea su casilla, uno
 * derrotado no.
 */
export const ENEMY_TYPE: EntityTypeDef = {
  id: "enemy",
  label: "Enemigo",
  Icon: Skull,
  section: "objects",
  defaultHeightPct: 8,
  defaultStates: {
    initial: "active",
    states: [
      { id: "active", label: "Activo", sprite: null, visible: true, activeBlockerIds: [] },
      { id: "defeated", label: "Derrotado", sprite: null, visible: false, activeBlockerIds: [] },
    ],
  },
  defaultInteraction: {
    mode: "click",
    standPoint: null,
    radius: 4,
    prompt: "Enfrentar",
    lockedNote: "",
    enabledWhen: { kind: "always" },
  },
  properties: [
    { kind: "image", key: "art", label: "Arte", default: "", hint: "Ruta de una imagen que reemplaza el sprite por defecto del enemigo." },
    {
      kind: "points",
      key: "patrol",
      label: "Ruta de patrulla",
      default: [],
      hint: "Puntos por los que se mueve — todavía sin efecto en el juego, reservado para una fase futura.",
    },
    {
      kind: "polygonRef",
      key: "blockerPolygonId",
      label: "Bloqueador",
      default: "",
      role: "blocked",
      hint: "La zona bloqueada que este enemigo activa/desactiva según su estado.",
    },
  ],
  Render: EnemyRender,
  resolveBlockerIds: (entity, activeState) => {
    const blockerId = entity.properties.blockerPolygonId;
    if (typeof blockerId !== "string" || blockerId === "" || activeState.id !== "active") return [];
    return [blockerId];
  },
};
