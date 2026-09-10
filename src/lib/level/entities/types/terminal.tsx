import { Terminal as TerminalIcon } from "lucide-react";
import { EntityButton } from "../entityVisuals";
import type { EntityRenderProps, EntityTypeDef } from "../registry";

function TerminalRender({ entity, activeState, selected, onSelect }: EntityRenderProps) {
  return <EntityButton entity={entity} activeState={activeState} selected={selected} onSelect={onSelect} Icon={TerminalIcon} tone="cyan" />;
}

export const TERMINAL_TYPE: EntityTypeDef = {
  id: "terminal",
  label: "Terminal",
  Icon: TerminalIcon,
  section: "objects",
  defaultHeightPct: 6,
  defaultStates: {
    initial: "off",
    states: [
      { id: "off", label: "Apagada", sprite: null, visible: true, activeBlockerIds: [], className: "anim-flicker" },
      { id: "on", label: "Activa", sprite: null, visible: true, activeBlockerIds: [], className: "anim-breathe world-ring-glow" },
    ],
  },
  defaultInteraction: {
    mode: "click",
    standPoint: null,
    radius: 4,
    prompt: "Usar la terminal",
    lockedNote: "Sin energía todavía",
    enabledWhen: { kind: "always" },
  },
  properties: [
    { kind: "text", key: "headline", label: "Rótulo", default: "TERMINAL BLOQUEADA", hint: "Título que se muestra sobre la terminal." },
    { kind: "text", key: "action", label: "Acción", default: "Introduce el código", hint: "Texto del botón/indicación para interactuar." },
    { kind: "image", key: "sprite", label: "Arte", default: "", hint: "Ruta de una imagen que reemplaza el sprite por defecto de la terminal." },
    { kind: "boolean", key: "isCore", label: "Panel de núcleo (ámbar)", default: false, hint: "Le da el estilo visual especial de \"panel de núcleo\" en vez de una terminal normal." },
  ],
  Render: TerminalRender,
};
