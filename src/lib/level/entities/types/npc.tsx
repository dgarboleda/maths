import { MessageCircle } from "lucide-react";
import { EntityButton } from "../entityVisuals";
import type { EntityRenderProps, EntityTypeDef } from "../registry";

function NpcRender({ entity, activeState, selected, onSelect }: EntityRenderProps) {
  return <EntityButton entity={entity} activeState={activeState} selected={selected} onSelect={onSelect} Icon={MessageCircle} tone="violet" />;
}

export const NPC_TYPE: EntityTypeDef = {
  id: "npc",
  label: "Personaje (NPC)",
  Icon: MessageCircle,
  section: "objects",
  defaultHeightPct: 8,
  defaultStates: {
    initial: "idle",
    states: [{ id: "idle", label: "Presente", sprite: null, visible: true, activeBlockerIds: [], className: "anim-idle" }],
  },
  defaultInteraction: {
    mode: "click",
    standPoint: null,
    radius: 4,
    prompt: "Hablar",
    lockedNote: "",
    enabledWhen: { kind: "always" },
  },
  properties: [
    { kind: "image", key: "portrait", label: "Retrato", default: "", hint: "Ruta de una imagen que reemplaza el retrato por defecto del NPC." },
    { kind: "text", key: "role", label: "Rol", default: "", hint: "Descripción corta de quién es (se muestra junto al nombre)." },
    { kind: "dialogRef", key: "dialogId", label: "Diálogo", default: "", hint: "Qué diálogo se abre al hablar con este NPC — creá uno desde \"Diálogo nuevo\" si hace falta." },
  ],
  Render: NpcRender,
};
