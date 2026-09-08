import { Skull } from "lucide-react";
import { EntityButton } from "../entityVisuals";
import type { EntityRenderProps, EntityTypeDef } from "../registry";

function EnemyRender({ entity, activeState, selected, onSelect }: EntityRenderProps) {
  return <EntityButton entity={entity} activeState={activeState} selected={selected} onSelect={onSelect} Icon={Skull} tone="rose" />;
}

/**
 * `properties.patrol: Vec2[]` y `properties.blockerPolygonId` ya están en el
 * esquema (§7.3) para cuando exista `useEntityMovement` (Fase 9+) — hoy solo
 * se guardan, sin ningún efecto en el runtime todavía.
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
    { kind: "image", key: "art", label: "Arte", default: "" },
    { kind: "points", key: "patrol", label: "Ruta de patrulla", default: [] },
    { kind: "polygonRef", key: "blockerPolygonId", label: "Bloqueador", default: "", role: "blocked" },
  ],
  Render: EnemyRender,
};
