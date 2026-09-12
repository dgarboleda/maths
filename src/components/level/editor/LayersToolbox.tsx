"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type DragEvent as ReactDragEvent, type PointerEvent as ReactPointerEvent } from "react";
import { ChevronDown, ChevronRight, GripVertical, Plus, Trash2, X } from "lucide-react";
import { useFamily } from "@/components/family/FamilyProvider";
import { newBackgroundLayerId } from "@/lib/level/ids";
import type { LevelBackgroundLayer } from "@/lib/level/schema";
import { IconButton } from "@/components/ui/IconButton";
import { useLevelEditor } from "./LevelEditorProvider";
import { BackgroundPicker } from "./assets/BackgroundPicker";
import { FieldLabel } from "./fields/PropertyFields";
import { help } from "./helpText";
import { getLayersToolboxOpen, setLayersToolboxOpen, subscribeLayersToolbox } from "./layersToolboxStore";

const LABEL_CLASS = "mb-1 block text-[11px] font-bold text-slate-400";
const INPUT_CLASS = "w-full rounded-md border border-indigo-500/20 bg-slate-950/60 px-2 py-1.5 text-slate-100 outline-none focus:border-cyan-400/50";

const EFFECT_OPTIONS: { value: LevelBackgroundLayer["effect"]; label: string }[] = [
  { value: "none", label: "Ninguno" },
  { value: "fog", label: "Niebla" },
  { value: "rain", label: "Lluvia" },
  { value: "snow", label: "Nieve" },
  { value: "lightning", label: "Rayos" },
  { value: "particles", label: "Partículas" },
  { value: "glow", label: "Brillo ambiental" },
];

/**
 * Caja de herramientas flotante para las capas de fondo (parallax + clima).
 * Antes esta lista vivía solo adentro de `DepthPanel`, en el panel de
 * propiedades angosto (256px) de la derecha, que además solo se ve con el
 * nivel seleccionado — ahí las tarjetas de "Subir imagen" del
 * `BackgroundPicker` quedaban apretadas (ver commit "Las tarjetas de 'Subir
 * imagen' se montaban en el panel angosto de capas"). Flota sobre el
 * lienzo con más ancho propio, se arrastra por el encabezado, y queda
 * disponible sin importar qué haya seleccionado en el panel derecho —
 * se abre/cierra con el botón "Capas" de `EditorBottomBar`.
 */
export function LayersToolbox() {
  const open = useSyncExternalStore(subscribeLayersToolbox, getLayersToolboxOpen, () => false);
  const { parentId } = useFamily();
  const { state, dispatch } = useLevelEditor();
  const layers = state.level.background.layers ?? [];

  const panelRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ offsetX: number; offsetY: number } | null>(null);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);

  // Contraer/expandir es UI efímera de esta caja, no un dato del nivel — no
  // pasa por `dispatch` ni por el historial de undo/redo.
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());

  // Arrastrar una capa: `draggingId` es la que se está moviendo, `overId` la
  // que tiene el puntero encima ahora mismo. El reordenamiento se calcula al
  // vuelo para la vista previa (`displayLayers`) pero solo se despacha UNA
  // vez, al soltar — despachar en cada `dragover` (un evento por cada capa
  // que se sobrevuela) apilaría un `SET_BACKGROUND` por cada una en el
  // historial de undo, y un solo Ctrl+Z no alcanzaría para deshacer todo el
  // arrastre.
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerMove(e: PointerEvent) {
      if (!dragRef.current) return;
      const rect = panelRef.current?.getBoundingClientRect();
      const width = rect?.width ?? 320;
      const height = rect?.height ?? 200;
      const x = Math.min(Math.max(e.clientX - dragRef.current.offsetX, 0), window.innerWidth - width);
      const y = Math.min(Math.max(e.clientY - dragRef.current.offsetY, 0), window.innerHeight - height);
      setPos({ x, y });
    }
    function onPointerUp() {
      dragRef.current = null;
    }
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };
  }, [open]);

  function startDrag(e: ReactPointerEvent<HTMLDivElement>) {
    const rect = panelRef.current?.getBoundingClientRect();
    if (!rect) return;
    e.preventDefault(); // evita que arrastrar el encabezado seleccione texto de la página
    dragRef.current = { offsetX: e.clientX - rect.left, offsetY: e.clientY - rect.top };
    if (!pos) setPos({ x: rect.left, y: rect.top });
  }

  function setLayers(next: LevelBackgroundLayer[]) {
    dispatch({ type: "SET_BACKGROUND", background: { ...state.level.background, layers: next } });
  }

  function addLayer() {
    // `src: ""` y `depth: 1.2` a propósito — ver la nota igual en el
    // historial de `DepthPanel.tsx` (reporte "no funciona el efecto
    // parallax ni las capas ni los efectos"): con `depth < 1` la capa queda
    // detrás del fondo principal, casi siempre opaco, e invisible.
    const layer: LevelBackgroundLayer = {
      id: newBackgroundLayerId(),
      src: "",
      depth: 1.2,
      offsetY: 0,
      opacity: 1,
      scale: 100,
      loop: false,
      effect: "none",
    };
    setLayers([...layers, layer]);
  }

  function updateLayer(id: string, patch: Partial<LevelBackgroundLayer>) {
    setLayers(layers.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  }

  function deleteLayer(id: string) {
    setLayers(layers.filter((l) => l.id !== id));
  }

  function toggleCollapsed(id: string) {
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // Vista previa en vivo del arrastre: mismo `layers` de siempre, salvo que
  // mientras se arrastra una capa sobre otra se la reordena acá para que la
  // lista se vea reacomodada al instante (el reducer real recién se toca al
  // soltar, en `handleDrop`).
  const displayLayers = (() => {
    if (!draggingId || !overId || draggingId === overId) return layers;
    const fromIndex = layers.findIndex((l) => l.id === draggingId);
    const toIndex = layers.findIndex((l) => l.id === overId);
    if (fromIndex === -1 || toIndex === -1) return layers;
    const next = [...layers];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
    return next;
  })();

  function handleDragStart(e: ReactDragEvent<HTMLDivElement>, id: string) {
    // Solo arranca el arrastre si empezó en el "agarre" (`data-drag-handle`)
    // — sin este chequeo, `draggable` en toda la tarjeta capturaría también
    // los clics/selecciones de texto en los campos de adentro (nombre,
    // números, etc.).
    if (!(e.target as HTMLElement).closest('[data-drag-handle="true"]')) {
      e.preventDefault();
      return;
    }
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", id); // Firefox no arranca el drag sin esto
    setDraggingId(id);
  }

  function handleDragOver(e: ReactDragEvent<HTMLDivElement>, id: string) {
    e.preventDefault(); // necesario para que el navegador permita soltar acá
    if (draggingId && id !== overId) setOverId(id);
  }

  function handleDrop(e: ReactDragEvent<HTMLDivElement>) {
    e.preventDefault();
    if (draggingId && overId && draggingId !== overId) setLayers(displayLayers);
    setDraggingId(null);
    setOverId(null);
  }

  function handleDragEnd() {
    setDraggingId(null);
    setOverId(null);
  }

  if (!open) return null;

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-label="Capas de fondo"
      className="fixed z-50 flex max-h-[75vh] w-80 flex-col rounded-2xl border border-indigo-500/30 bg-slate-900/95 text-xs shadow-2xl backdrop-blur"
      style={pos ? { left: pos.x, top: pos.y } : { top: 72, right: 16 }}
    >
      <div
        onPointerDown={startDrag}
        className="flex shrink-0 cursor-grab select-none items-center gap-2 rounded-t-2xl border-b border-indigo-500/20 bg-slate-800/60 px-3 py-2 active:cursor-grabbing"
      >
        <GripVertical className="size-4 shrink-0 text-slate-500" aria-hidden="true" />
        <h2 className="flex-1 text-[12px] font-bold text-slate-100">Capas de fondo</h2>
        <IconButton icon={Plus} label="Añadir capa" tooltip={help("depth.addLayer").text} side="left" tone="accent" onClick={addLayer} />
        <button
          type="button"
          aria-label="Cerrar caja de capas"
          onClick={() => setLayersToolboxOpen(false)}
          className="rounded-md p-1 text-slate-400 hover:bg-slate-700 hover:text-slate-200"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      </div>

      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
        {layers.length === 0 && <p className="text-[11px] text-slate-400">Sin capas adicionales — el fondo se mueve como siempre.</p>}

        {displayLayers.length > 0 && (
          <p className="text-[10px] leading-relaxed text-slate-500">
            Arriba de la lista queda más atrás (detrás del fondo con Profundidad &lt; 1); abajo, más adelante. Arrastrá del{" "}
            <GripVertical className="inline size-3 -translate-y-px" aria-hidden="true" /> para reordenar.
          </p>
        )}

        {displayLayers.map((layer, i) => {
          const collapsed = collapsedIds.has(layer.id);
          const name = layer.name?.trim() || `Capa ${i + 1}`;
          return (
            <div
              key={layer.id}
              draggable
              onDragStart={(e) => handleDragStart(e, layer.id)}
              onDragOver={(e) => handleDragOver(e, layer.id)}
              onDrop={handleDrop}
              onDragEnd={handleDragEnd}
              className={`space-y-2 rounded-md border p-2 transition-colors ${
                draggingId === layer.id ? "border-cyan-400/50 bg-slate-900/30 opacity-50" : "border-indigo-500/15 bg-slate-900/60"
              }`}
            >
              <div className="flex items-center gap-1">
                <span
                  data-drag-handle="true"
                  title={help("depth.dragLayer").text}
                  className="cursor-grab touch-none rounded p-0.5 text-slate-500 hover:bg-slate-800 hover:text-slate-300 active:cursor-grabbing"
                >
                  <GripVertical className="size-3.5" aria-hidden="true" />
                </span>
                <IconButton
                  icon={collapsed ? ChevronRight : ChevronDown}
                  label={collapsed ? `Expandir ${name}` : `Contraer ${name}`}
                  tooltip={help("depth.toggleLayer").text}
                  side="left"
                  onClick={() => toggleCollapsed(layer.id)}
                />
                <input
                  type="text"
                  value={layer.name ?? ""}
                  placeholder={`Capa ${i + 1}`}
                  title={help("depth.renameLayer").text}
                  aria-label={`Nombre de la capa ${i + 1}`}
                  onChange={(e) => updateLayer(layer.id, { name: e.target.value })}
                  className="min-w-0 flex-1 truncate rounded bg-transparent px-1 py-0.5 text-[11px] font-bold text-slate-200 outline-none hover:bg-slate-800/60 focus:bg-slate-950/60"
                />
                <IconButton icon={Trash2} label={`Eliminar ${name}`} tooltip={help("depth.removeLayer").text} side="left" tone="danger" onClick={() => deleteLayer(layer.id)} />
              </div>

              {!collapsed && (
                <>
                  <label className="block">
                    <FieldLabel label="Efecto" hint={help("depth.effect").text} />
                    <select
                      className={INPUT_CLASS}
                      value={layer.effect}
                      onChange={(e) => updateLayer(layer.id, { effect: e.target.value as LevelBackgroundLayer["effect"] })}
                    >
                      {EFFECT_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div>
                    <span className={LABEL_CLASS}>Imagen {layer.effect !== "none" && "(opcional con un efecto elegido)"}</span>
                    {parentId ? (
                      <BackgroundPicker parentId={parentId} for="layer" compact value={layer.src} onChange={(selection) => updateLayer(layer.id, { src: selection.src })} />
                    ) : (
                      !layer.src && layer.effect === "none" && <p className="text-[11px] text-amber-300">Elegí una imagen o un efecto para esta capa.</p>
                    )}
                  </div>
                  <label className="block">
                    <span className={LABEL_CLASS}>Profundidad (0 fija · 1 como el fondo · &gt;1 primer plano)</span>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      className={INPUT_CLASS}
                      value={layer.depth}
                      onChange={(e) => updateLayer(layer.id, { depth: Number(e.target.value) })}
                    />
                    {layer.depth < 1 && (
                      <p className="mt-1 text-amber-300">
                        ⚠ Con menos de 1 esta capa queda DETRÁS del fondo — invisible si el fondo es una imagen opaca de punta a punta (lo más común). Usá más de 1 para que se vea encima.
                      </p>
                    )}
                  </label>
                  <label className="block">
                    <span className={LABEL_CLASS}>Escala (% del ancho de la escena)</span>
                    <input
                      type="number"
                      step="5"
                      min="1"
                      max="100"
                      className={INPUT_CLASS}
                      value={layer.scale ?? 100}
                      onChange={(e) => updateLayer(layer.id, { scale: Number(e.target.value) })}
                    />
                    <p className="mt-1 text-slate-400">
                      {(layer.scale ?? 100) >= 100
                        ? "100 = cubre toda la escena, de punta a punta (como el fondo)."
                        : "Menos de 100 = tamaño natural, centrada — un elemento suelto (una nube, un cartel), no un segundo fondo."}
                    </p>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <label className="block">
                      <span className={LABEL_CLASS}>Desplaz. Y (%)</span>
                      <input
                        type="number"
                        className={INPUT_CLASS}
                        value={layer.offsetY}
                        onChange={(e) => updateLayer(layer.id, { offsetY: Number(e.target.value) })}
                      />
                    </label>
                    <label className="block">
                      <span className={LABEL_CLASS}>Opacidad</span>
                      <input
                        type="number"
                        step="0.05"
                        min="0"
                        max="1"
                        className={INPUT_CLASS}
                        value={layer.opacity}
                        onChange={(e) => updateLayer(layer.id, { opacity: Number(e.target.value) })}
                      />
                    </label>
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
