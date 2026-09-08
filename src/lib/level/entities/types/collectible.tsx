import { Gem } from "lucide-react";
import { EntityButton } from "../entityVisuals";
import type { EntityRenderProps, EntityTypeDef } from "../registry";

function CollectibleRender({ entity, activeState, selected, onSelect }: EntityRenderProps) {
  return <EntityButton entity={entity} activeState={activeState} selected={selected} onSelect={onSelect} Icon={Gem} tone="emerald" />;
}

export const COLLECTIBLE_TYPE: EntityTypeDef = {
  id: "collectible",
  label: "Coleccionable",
  Icon: Gem,
  section: "objects",
  defaultHeightPct: 4,
  defaultStates: {
    initial: "available",
    states: [
      { id: "available", label: "Disponible", sprite: null, visible: true, activeBlockerIds: [], className: "anim-idle" },
      { id: "collected", label: "Recogido", sprite: null, visible: false, activeBlockerIds: [] },
    ],
  },
  defaultInteraction: {
    mode: "proximity",
    standPoint: null,
    radius: 4,
    prompt: "Recoger",
    lockedNote: "",
    enabledWhen: { kind: "always" },
  },
  properties: [
    { kind: "image", key: "art", label: "Arte", default: "" },
    { kind: "text", key: "label", label: "Etiqueta", default: "" },
  ],
  Render: CollectibleRender,
};
