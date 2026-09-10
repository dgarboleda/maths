"use client";

import { useCallback, useEffect, useRef, type PointerEvent, type WheelEvent } from "react";
import type { EditorViewport } from "./editorReducer";
import { useLevelEditor } from "./LevelEditorProvider";
import { useEditorViewport } from "./useEditorViewport";
import { BackgroundLayer } from "./layers/BackgroundLayer";
import { GridLayer } from "./layers/GridLayer";
import { NavigationLayer } from "./layers/NavigationLayer";
import { ZoneLayer } from "./layers/ZoneLayer";
import { EntityLayer } from "./layers/EntityLayer";
import { PolygonEditor } from "./PolygonEditor";
import { SelectionLayer } from "./SelectionLayer";

/**
 * Lienzo del editor — docs/level-editor-plan.md §5.4. `EntityLayer`/etc. se
 * agregan en fases posteriores como hermanos dentro del mismo `stageRef`
 * (mismo sistema de coordenadas en %, nada que reestructurar).
 */
export function EditorCanvas() {
  const { state, dispatch } = useLevelEditor();
  const setViewport = useCallback(
    (patch: Partial<EditorViewport>) => dispatch({ type: "SET_VIEWPORT", viewport: patch }),
    [dispatch],
  );
  const { stageRef, zoomBy, screenToImagePercent } = useEditorViewport(state.viewport, setViewport);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const spaceHeldRef = useRef(false);
  const panRef = useRef<{ startX: number; startY: number; originPanX: number; originPanY: number } | null>(null);

  // El cursor "grab" mientras se mantiene Espacio se aplica directo al DOM
  // (no vía estado/estilo de React): son eventos de teclado muy frecuentes,
  // y leer el ref durante el render está prohibido (regla `react-hooks/refs`)
  // — esto es exactamente el caso de uso que sí permite: "actualizar el DOM
  // manualmente" desde un manejador de evento.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.code !== "Space") return;
      spaceHeldRef.current = true;
      if (containerRef.current) containerRef.current.style.cursor = "grab";
    }
    function onKeyUp(e: KeyboardEvent) {
      if (e.code !== "Space") return;
      spaceHeldRef.current = false;
      if (containerRef.current) containerRef.current.style.cursor = "";
    }
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  function onWheel(e: WheelEvent<HTMLDivElement>) {
    if (!e.ctrlKey) return;
    e.preventDefault();
    zoomBy(e.deltaY < 0 ? 1.1 : 1 / 1.1, { clientX: e.clientX, clientY: e.clientY });
  }

  function onPointerDown(e: PointerEvent<HTMLDivElement>) {
    if (!spaceHeldRef.current && e.button !== 1) return;
    e.preventDefault();
    panRef.current = { startX: e.clientX, startY: e.clientY, originPanX: state.viewport.panX, originPanY: state.viewport.panY };
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: PointerEvent<HTMLDivElement>) {
    if (!panRef.current) return;
    const dx = e.clientX - panRef.current.startX;
    const dy = e.clientY - panRef.current.startY;
    dispatch({ type: "SET_VIEWPORT", viewport: { panX: panRef.current.originPanX + dx, panY: panRef.current.originPanY + dy } });
  }

  function onPointerUp() {
    panRef.current = null;
  }

  const aspect = state.level.background.height / (state.level.background.width || 1);

  return (
    <div
      ref={containerRef}
      className="editor-canvas relative size-full cursor-default overflow-hidden bg-slate-950"
      onWheel={onWheel}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerUp}
    >
      <div
        ref={stageRef}
        className="absolute left-0 top-0 origin-top-left"
        style={{
          width: "100%",
          aspectRatio: `1 / ${Number.isFinite(aspect) && aspect > 0 ? aspect : 0.5625}`,
          transform: `translate(${state.viewport.panX}px, ${state.viewport.panY}px) scale(${state.viewport.zoom})`,
        }}
      >
        <BackgroundLayer background={state.level.background} />
        {state.layerVisibility.grid && (
          <GridLayer visible={state.grid.visible} sizePct={state.grid.sizePct} projection={state.level.background.projection} />
        )}
        {state.layerVisibility.navigation && <NavigationLayer navigation={state.level.navigation} selection={state.selection} />}
        {state.layerVisibility.zones && <ZoneLayer zones={state.level.zones} selection={state.selection} />}
        <PolygonEditor screenToImagePercent={screenToImagePercent} />
        {/* Encima de `PolygonEditor`: sus botones deben poder recibir el clic
            antes que el div de clic-catching de navegación (ambos son
            `position: absolute` sin z-index — el orden en el DOM decide). */}
        {state.layerVisibility.entities && (
          <EntityLayer
            entities={state.level.entities}
            selection={state.selection}
            onSelect={(id) => dispatch({ type: "SELECT", selection: { kind: "entity", id } })}
            depth={state.level.depth}
          />
        )}
        <SelectionLayer screenToImagePercent={screenToImagePercent} />
      </div>
    </div>
  );
}
