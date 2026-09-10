import { DoorClosed, DoorOpen } from "lucide-react";
import { EntityButton } from "../entityVisuals";
import type { EntityRenderProps, EntityTypeDef } from "../registry";

function DoorRender({ entity, activeState, selected, onSelect }: EntityRenderProps) {
  const Icon = activeState.id === "open" ? DoorOpen : DoorClosed;
  return <EntityButton entity={entity} activeState={activeState} selected={selected} onSelect={onSelect} Icon={Icon} tone="amber" />;
}

/**
 * `properties.blockerPolygonId` (un `NavPolygon` de `blockedPolygons`,
 * normalmente dibujado sobre el vano) es lo que el runtime (Fase 9) activa
 * como bloqueador mientras la puerta está en `locked`/`closed` y desactiva
 * en `open` — así `OPEN_DOOR` cambia la malla de navegación de verdad, no
 * solo el sprite (§7.3). `defaultStates` describe la ESTRUCTURA de estados
 * (misma para toda puerta); CUÁL polígono bloquea es dato por instancia
 * (`properties.blockerPolygonId`), resuelto en runtime — no estático acá.
 */
export const DOOR_TYPE: EntityTypeDef = {
  id: "door",
  label: "Puerta",
  Icon: DoorClosed,
  section: "objects",
  defaultHeightPct: 10,
  defaultStates: {
    initial: "locked",
    states: [
      { id: "locked", label: "Cerrada con llave", sprite: null, visible: true, activeBlockerIds: [] },
      { id: "closed", label: "Cerrada", sprite: null, visible: true, activeBlockerIds: [] },
      { id: "open", label: "Abierta", sprite: null, visible: true, activeBlockerIds: [] },
    ],
  },
  defaultInteraction: {
    mode: "click",
    standPoint: null,
    radius: 4,
    prompt: "Abrir",
    lockedNote: "Necesita algo más",
    enabledWhen: { kind: "always" },
  },
  properties: [
    {
      kind: "polygonRef",
      key: "blockerPolygonId",
      label: "Bloqueador",
      default: "",
      role: "blocked",
      hint: "La zona bloqueada que esta puerta activa/desactiva según su estado — dibujala primero con \"Zona prohibida\".",
    },
    { kind: "image", key: "sprite", label: "Arte", default: "", hint: "Ruta de una imagen que reemplaza el sprite por defecto de la puerta." },
  ],
  Render: DoorRender,
  resolveBlockerIds: (entity, activeState) => {
    const blockerId = entity.properties.blockerPolygonId;
    if (typeof blockerId !== "string" || blockerId === "" || activeState.id === "open") return [];
    return [blockerId];
  },
};
