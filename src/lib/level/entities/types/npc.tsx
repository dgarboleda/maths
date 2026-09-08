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
    { kind: "image", key: "portrait", label: "Retrato", default: "" },
    { kind: "text", key: "role", label: "Rol", default: "" },
    { kind: "dialogRef", key: "dialogId", label: "Diálogo", default: "" },
  ],
  Render: NpcRender,
};
