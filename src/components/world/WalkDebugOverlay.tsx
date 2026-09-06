"use client";

import { useEffect, useRef, useState } from "react";
import { closestPointOnSegment, type Point, type Polygon, type WalkableArea } from "@/lib/world/navmesh";
import { formatArea } from "@/lib/world/walkableAreaCode";

/** Identifica un anillo editable: el contorno, o el hueco en ese índice. */
type RingId = "boundary" | number;

function ringOf(draft: WalkableArea, ring: RingId): Polygon {
  return ring === "boundary" ? draft.boundary : draft.holes[ring];
}

function withRing(draft: WalkableArea, ring: RingId, next: Polygon): WalkableArea {
  if (ring === "boundary") return { ...draft, boundary: next };
  const holes = draft.holes.slice();
  holes[ring] = next;
  return { ...draft, holes };
}

function toPointsAttr(polygon: Polygon): string {
  return polygon.map((p) => `${p.x},${p.y}`).join(" ");
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function clamp100(n: number): number {
  return Math.min(100, Math.max(0, n));
}

function storageKey(sceneId: string): string {
  return `walkdebug-draft:${sceneId}`;
}

function loadDraft(sceneId: string, fallback: WalkableArea): WalkableArea {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(storageKey(sceneId));
    return raw ? (JSON.parse(raw) as WalkableArea) : fallback;
  } catch {
    return fallback;
  }
}

/** Distancia de `p` a cada arista de `poly`, para hallar la más cercana al hacer doble clic. */
function nearestEdge(p: Point, poly: Polygon): { edgeIndex: number; dist: number; point: Point } | null {
  let best: { edgeIndex: number; dist: number; point: Point } | null = null;
  poly.forEach((a, i) => {
    const b = poly[(i + 1) % poly.length];
    const c = closestPointOnSegment(p, a, b);
    const d = Math.hypot(c.x - p.x, c.y - p.y);
    if (!best || d < best.dist) best = { edgeIndex: i, dist: d, point: c };
  });
  return best;
}

/** Punto medio de cada arista de `poly` — ahí van los handles "+" para agregar un vértice. */
function edgeMidpoints(poly: Polygon): { edgeIndex: number; point: Point }[] {
  return poly.map((a, i) => {
    const b = poly[(i + 1) % poly.length];
    return { edgeIndex: i, point: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 } };
  });
}

/**
 * Editor visual del `WalkableArea` de una escena, solo para desarrollo
 * (gateado por `?walkdebug=1` + `NODE_ENV` en `QuestScene`). Reemplaza el
 * viejo click-para-loguear-en-consola: acá los vértices se arrastran con el
 * mouse, se insertan con doble clic sobre una arista, se borran con
 * Shift+clic, y se pueden dibujar huecos nuevos (obstáculos) desde cero. El
 * borrador vive en `localStorage` (clave por escena) para sobrevivir a un
 * Fast Refresh; "Copiar código" vuelca el resultado como el mismo literal
 * TS que ya usa `questScene.ts`, listo para pegar.
 */
export function WalkDebugOverlay({
  area,
  sceneId,
  exportName,
}: {
  area: WalkableArea;
  sceneId: string;
  /** Nombre del export en el archivo fuente (p. ej. "CIUDAD_CENTRAL_WALKABLE") — para "Guardar en archivo". */
  exportName: string;
}) {
  const [draft, setDraft] = useState<WalkableArea>(() => loadDraft(sceneId, area));
  const [drawingHole, setDrawingHole] = useState<Point[] | null>(null);
  const [dragging, setDragging] = useState<{ ring: RingId; index: number } | null>(null);
  const [deleteMode, setDeleteMode] = useState(false);
  const [copied, setCopied] = useState<"clipboard" | "console" | null>(null);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [saveError, setSaveError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  // Si el arrastre en curso nació de agarrar un "+" (inserta-y-arrastra), acá
  // queda su origen — si el gesto termina sin mover el punto de verdad, se
  // revierte el insert en vez de dejar un vértice pegado al que ya existía.
  const pendingInsertRef = useRef<{ ring: RingId; index: number; origin: Point } | null>(null);

  useEffect(() => {
    try {
      window.localStorage.setItem(storageKey(sceneId), JSON.stringify(draft));
    } catch {
      // Almacenamiento lleno o bloqueado: el borrador sigue vivo en memoria, se pierde solo si se recarga.
    }
  }, [draft, sceneId]);

  function pointFromEvent(e: { clientX: number; clientY: number }): Point {
    const rect = containerRef.current!.getBoundingClientRect();
    return {
      x: clamp100(round1(((e.clientX - rect.left) / rect.width) * 100)),
      y: clamp100(round1(((e.clientY - rect.top) / rect.height) * 100)),
    };
  }

  useEffect(() => {
    if (!dragging) return;
    function onMove(e: PointerEvent) {
      const p = pointFromEvent(e);
      setDraft((d) => {
        const ring = ringOf(d, dragging!.ring);
        const next = ring.slice();
        next[dragging!.index] = p;
        return withRing(d, dragging!.ring, next);
      });
    }
    function onUp() {
      const pending = pendingInsertRef.current;
      pendingInsertRef.current = null;
      if (pending && pending.ring === dragging!.ring && pending.index === dragging!.index) {
        setDraft((d) => {
          const current = ringOf(d, pending.ring);
          const p = current[pending.index];
          if (!p || Math.hypot(p.x - pending.origin.x, p.y - pending.origin.y) >= 0.3) return d; // se movió: se queda
          const next = current.filter((_, i) => i !== pending.index);
          if (pending.ring !== "boundary" && next.length < 3) {
            return { ...d, holes: d.holes.filter((_, i) => i !== pending.ring) };
          }
          return next.length < 3 ? d : withRing(d, pending.ring, next);
        });
      }
      setDragging(null);
    }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [dragging]);

  function onVertexPointerDown(ring: RingId, index: number, shiftKey: boolean) {
    if (shiftKey || deleteMode) {
      const current = ringOf(draft, ring);
      if (ring !== "boundary" && current.length <= 3) {
        setDraft((d) => ({ ...d, holes: d.holes.filter((_, i) => i !== ring) }));
        return;
      }
      if (current.length <= 3) return; // el contorno nunca baja de 3
      setDraft((d) => withRing(d, ring, current.filter((_, i) => i !== index)));
      return;
    }
    pendingInsertRef.current = null; // arrastre de un vértice ya existente, no de uno recién insertado
    setDragging({ ring, index });
  }

  function onCanvasClick(e: React.MouseEvent<HTMLDivElement>) {
    if (!drawingHole) return;
    setDrawingHole([...drawingHole, pointFromEvent(e)]);
  }

  /** Inserta `point` en `ring` justo después de `edgeIndex`, devolviendo el índice del nuevo vértice. */
  function insertPointAt(ring: RingId, edgeIndex: number, point: Point): number {
    const current = ringOf(draft, ring);
    const next = current.slice();
    const index = edgeIndex + 1;
    next.splice(index, 0, point);
    setDraft(withRing(draft, ring, next));
    return index;
  }

  function onCanvasDoubleClick(e: React.MouseEvent<HTMLDivElement>) {
    if (drawingHole) return;
    const p = pointFromEvent(e);
    const rings: { id: RingId; poly: Polygon }[] = [
      { id: "boundary", poly: draft.boundary },
      ...draft.holes.map((poly, i) => ({ id: i as RingId, poly })),
    ];
    let best: { id: RingId; edgeIndex: number; dist: number; point: Point } | null = null;
    for (const r of rings) {
      const edge = nearestEdge(p, r.poly);
      if (edge && (!best || edge.dist < best.dist)) best = { id: r.id, ...edge };
    }
    if (!best || best.dist > 4) return; // muy lejos de cualquier arista: no insertar a ciegas
    insertPointAt(best.id, best.edgeIndex, best.point);
  }

  /** Nace un vértice en el punto medio de una arista y arranca su arrastre en el mismo gesto. */
  function onMidpointPointerDown(ring: RingId, edgeIndex: number, point: Point, e: React.PointerEvent) {
    e.stopPropagation();
    const index = insertPointAt(ring, edgeIndex, point);
    pendingInsertRef.current = { ring, index, origin: point };
    setDragging({ ring, index });
  }

  function closeHole() {
    if (!drawingHole || drawingHole.length < 3) return;
    setDraft((d) => ({ ...d, holes: [...d.holes, drawingHole] }));
    setDrawingHole(null);
  }

  function startNewHole() {
    setDeleteMode(false); // no combinar "borrar" con "dibujar hueco nuevo"
    setDrawingHole([]);
  }

  function toggleDeleteMode() {
    setDeleteMode((d) => !d);
    setDrawingHole(null);
  }

  function resetToSource() {
    try {
      window.localStorage.removeItem(storageKey(sceneId));
    } catch {
      // nada que limpiar si el storage no está disponible
    }
    setDraft(area);
    setDrawingHole(null);
    setDeleteMode(false);
  }

  /**
   * Guarda `draft` directo en el archivo fuente. Sin diálogo: en vez de que
   * el propio navegador escriba el archivo (lo que exige autorizarlo por
   * `showSaveFilePicker` cada sesión), se lo pide al servidor de `next dev`
   * — un proceso normal en la máquina del desarrollador, sin las
   * restricciones de seguridad de una página web — vía
   * `/api/dev/walkable-area` (gateada a `NODE_ENV === "development"` ahí).
   */
  async function saveToFile() {
    setSaveStatus("saving");
    setSaveError(null);
    try {
      const res = await fetch("/api/dev/walkable-area", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ exportName, area: draft }),
      });
      const body = (await res.json()) as { ok: boolean; error?: string };
      if (!body.ok) throw new Error(body.error ?? `Error inesperado (${res.status}).`);
      try {
        window.localStorage.removeItem(storageKey(sceneId));
      } catch {
        // no crítico: el archivo ya quedó guardado, solo no se limpió el borrador local
      }
      setSaveStatus("saved");
      window.setTimeout(() => setSaveStatus("idle"), 2000);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : String(err));
      setSaveStatus("error");
    }
  }

  async function copyCode() {
    const code = formatArea(draft);
    try {
      await navigator.clipboard.writeText(code);
      setCopied("clipboard");
    } catch {
      console.log(code);
      setCopied("console");
    }
    window.setTimeout(() => setCopied(null), 2000);
  }

  function vertexHandle(ring: RingId, index: number, p: Point, color: string) {
    return (
      <circle
        key={`${ring}-${index}`}
        cx={p.x}
        cy={p.y}
        r="0.9"
        fill={color}
        stroke="#0f172a"
        strokeWidth="0.15"
        style={{ cursor: deleteMode ? "not-allowed" : dragging ? "grabbing" : "grab" }}
        onPointerDown={(e) => {
          e.stopPropagation();
          onVertexPointerDown(ring, index, e.shiftKey);
        }}
      />
    );
  }

  /**
   * Handle "+" en el punto medio de una arista: arrastrarlo hace nacer un
   * vértice ahí mismo. El círculo visible (r=0.55) es angosto a propósito
   * para no tapar el arte de fondo, pero un objetivo tan chico es difícil de
   * acertar con el mouse — por eso el área que realmente escucha el clic es
   * un círculo invisible bastante más grande (r=1.6) debajo.
   */
  function midpointHandle(ring: RingId, edgeIndex: number, p: Point) {
    return (
      <g key={`mid-${ring}-${edgeIndex}`} style={{ cursor: "crosshair" }} onPointerDown={(e) => onMidpointPointerDown(ring, edgeIndex, p, e)}>
        <circle cx={p.x} cy={p.y} r="1.6" fill="transparent" />
        <circle cx={p.x} cy={p.y} r="0.55" fill="#f8fafc" fillOpacity="0.55" stroke="#0f172a" strokeWidth="0.12" />
      </g>
    );
  }

  return (
    <>
      <div
        ref={containerRef}
        className="absolute inset-0 z-40"
        onClick={onCanvasClick}
        onDoubleClick={onCanvasDoubleClick}
      >
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 size-full">
        <polygon points={toPointsAttr(draft.boundary)} fill="rgba(34,197,94,0.18)" stroke="#22c55e" strokeWidth="0.3" />
        {draft.holes.map((hole, i) => (
          <polygon key={i} points={toPointsAttr(hole)} fill="rgba(244,63,94,0.25)" stroke="#f43f5e" strokeWidth="0.3" />
        ))}
        {drawingHole && drawingHole.length > 0 && (
          <polyline
            points={toPointsAttr(drawingHole)}
            fill="none"
            stroke="#f43f5e"
            strokeDasharray="1 1"
            strokeWidth="0.3"
          />
        )}
        {!drawingHole && edgeMidpoints(draft.boundary).map(({ edgeIndex, point }) => midpointHandle("boundary", edgeIndex, point))}
        {!drawingHole &&
          draft.holes.map((hole, hi) => edgeMidpoints(hole).map(({ edgeIndex, point }) => midpointHandle(hi, edgeIndex, point)))}
        {draft.boundary.map((p, i) => vertexHandle("boundary", i, p, "#22c55e"))}
        {draft.holes.map((hole, hi) => hole.map((p, i) => vertexHandle(hi, i, p, "#f43f5e")))}
        {drawingHole?.map((p, i) => (
          <circle key={`drawing-${i}`} cx={p.x} cy={p.y} r="0.7" fill="#fde047" />
        ))}
      </svg>
      </div>

      {/* `fixed`, no `absolute`: este panel es de la ventana, no de la escena — el
          div de arriba sigue a la cámara (puede quedar mucho más arriba/abajo que
          el viewport, ver el comentario de la barra de misión más abajo en
          QuestScene) y un panel `absolute` ahí adentro se sale de la vista en
          cuanto el personaje no está cerca del borde superior de la imagen. */}
      <div
        className="pointer-events-auto fixed left-2 top-20 z-50 flex max-w-[min(90vw,22rem)] flex-col gap-1.5 rounded-lg bg-black/85 px-2.5 py-2 font-mono text-[10px] text-lime-300"
        onClick={(e) => e.stopPropagation()}
        onDoubleClick={(e) => e.stopPropagation()}
      >
        <span className="font-bold text-lime-200">
          walkdebug · {draft.boundary.length} pts · {draft.holes.length} huecos
          {drawingHole ? ` · dibujando: ${drawingHole.length} pts` : ""}
        </span>

        <div className="flex flex-wrap items-center gap-1.5">
          {!drawingHole ? (
            <button type="button" className="rounded bg-rose-600 px-1.5 py-0.5 text-white" onClick={startNewHole}>
              Nuevo hueco
            </button>
          ) : (
            <>
              <button
                type="button"
                disabled={drawingHole.length < 3}
                className="rounded bg-rose-600 px-1.5 py-0.5 text-white disabled:opacity-40"
                onClick={closeHole}
              >
                Cerrar hueco
              </button>
              <button type="button" className="rounded bg-slate-600 px-1.5 py-0.5 text-white" onClick={() => setDrawingHole(null)}>
                Cancelar
              </button>
            </>
          )}
          <button
            type="button"
            className={`rounded px-1.5 py-0.5 text-white ${deleteMode ? "bg-amber-500 ring-1 ring-amber-200" : "bg-slate-600"}`}
            onClick={toggleDeleteMode}
          >
            {deleteMode ? "Borrando… (clic para salir)" : "Borrar puntos"}
          </button>
          <button type="button" className="rounded bg-slate-600 px-1.5 py-0.5 text-white" onClick={resetToSource}>
            Reiniciar
          </button>
          <button type="button" className="rounded bg-emerald-600 px-1.5 py-0.5 text-white" onClick={copyCode}>
            {copied === "clipboard" ? "Copiado ✓" : copied === "console" ? "Ver consola" : "Copiar código"}
          </button>
          <button
            type="button"
            disabled={saveStatus === "saving"}
            className="rounded bg-emerald-700 px-1.5 py-0.5 text-white disabled:opacity-40"
            onClick={saveToFile}
          >
            {saveStatus === "saving" ? "Guardando…" : saveStatus === "saved" ? "Guardado ✓" : "Guardar en archivo"}
          </button>
        </div>

        {saveStatus === "error" && saveError && <p className="text-rose-400">⚠ {saveError}</p>}

        <p className="text-slate-400">
          Arrastra un vértice para moverlo · arrastra el + de una arista (o doble clic) para agregar uno · Shift+clic
          o &ldquo;Borrar puntos&rdquo; para borrarlo · &ldquo;Guardar en archivo&rdquo; lo escribe directo en el
          código, sin diálogos (solo funciona con `npm run dev`).
        </p>
      </div>
    </>
  );
}
