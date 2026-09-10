import { Sparkles } from "lucide-react";
import { EntityButton } from "../entityVisuals";
import type { EntityRenderProps, EntityTypeDef } from "../registry";

function InteractiveRender({ entity, activeState, selected, onSelect }: EntityRenderProps) {
  return <EntityButton entity={entity} activeState={activeState} selected={selected} onSelect={onSelect} Icon={Sparkles} tone="cyan" />;
}

/**
 * Tipo "libre" para lo que no encaja en los otros 6 — un único estado
 * editable y solo las propiedades de texto/arte más genéricas. El bloque
 * `interaction` (modo, prompt, standPoint...) ya es común a todo tipo
 * (`EditorPropertyPanel`, §5.3), así que no necesita nada especial acá.
 */
export const INTERACTIVE_TYPE: EntityTypeDef = {
  id: "interactive",
  label: "Interactivo genérico",
  Icon: Sparkles,
  section: "objects",
  defaultHeightPct: 6,
  defaultStates: {
    initial: "default",
    states: [{ id: "default", label: "Normal", sprite: null, visible: true, activeBlockerIds: [] }],
  },
  defaultInteraction: {
    mode: "click",
    standPoint: null,
    radius: 4,
    prompt: "Interactuar",
    lockedNote: "",
    enabledWhen: { kind: "always" },
  },
  properties: [
    { kind: "text", key: "headline", label: "Rótulo", default: "", hint: "Título corto que se muestra al interactuar." },
    { kind: "image", key: "sprite", label: "Arte", default: "", hint: "Ruta de una imagen que reemplaza el sprite por defecto." },
  ],
  Render: InteractiveRender,
};
