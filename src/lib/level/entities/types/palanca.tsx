import { ToggleLeft } from "lucide-react";
import { EntityButton } from "../entityVisuals";
import type { EntityRenderProps, EntityTypeDef } from "../registry";

function PalancaRender({ entity, activeState, selected, onSelect }: EntityRenderProps) {
  return <EntityButton entity={entity} activeState={activeState} selected={selected} onSelect={onSelect} Icon={ToggleLeft} tone="violet" />;
}

/**
 * Tipo de entidad de prueba de extensibilidad — docs/level-editor-plan.md
 * §7.5/§17 Fase 13, criterio A10: un objeto interactivo genérico de dos
 * estados (`abajo`/`arriba`) que un nivel puede usar para accionar algo vía
 * `CHANGE_OBJECT_STATE`/`ACTIVATE_OBJECT` (§8.4) — no distinto en la
 * práctica de una terminal o una puerta, y es justamente el punto: se agrega
 * sin tocar el reducer, el canvas, el panel de propiedades ni el runtime.
 */
export const PALANCA_TYPE: EntityTypeDef = {
  id: "palanca",
  label: "Palanca",
  Icon: ToggleLeft,
  section: "objects",
  defaultHeightPct: 4,
  defaultStates: {
    initial: "abajo",
    states: [
      { id: "abajo", label: "Abajo", sprite: null, visible: true, activeBlockerIds: [] },
      { id: "arriba", label: "Arriba", sprite: null, visible: true, activeBlockerIds: [], className: "world-ring-glow" },
    ],
  },
  defaultInteraction: {
    mode: "click",
    standPoint: null,
    radius: 4,
    prompt: "Accionar la palanca",
    lockedNote: "",
    enabledWhen: { kind: "always" },
  },
  properties: [{ kind: "text", key: "label", label: "Etiqueta", default: "Palanca" }],
  Render: PalancaRender,
};
