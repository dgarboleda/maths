"use client";

import { useEffect, useRef, useState } from "react";
import { findPathInMesh, nearestWalkablePointInMesh, pointInPolygon, type VisibilityGraph } from "@/lib/world/navmesh";
import type { Vec2 } from "@/lib/level/schema";

export type Pose = Vec2 & { facing: "left" | "right" };

export type RuntimeZoneShape = { kind: "polygon"; points: Vec2[] } | { kind: "circle"; center: Vec2; radius: number };

/** Zona (o `LevelExit`, distinguido por `kind`) con su bbox ya calculado —
 *  §6.4/§14 P4: el filtro barato antes de `pointInPolygon`/distancia real. */
export interface RuntimeZone {
  id: string;
  kind: "zone" | "exit";
  shape: RuntimeZoneShape;
  bbox: { minX: number; minY: number; maxX: number; maxY: number };
}

export function bboxOf(shape: RuntimeZoneShape): RuntimeZone["bbox"] {
  if (shape.kind === "circle") {
    return { minX: shape.center.x - shape.radius, maxX: shape.center.x + shape.radius, minY: shape.center.y - shape.radius, maxY: shape.center.y + shape.radius };
  }
  const xs = shape.points.map((p) => p.x);
  const ys = shape.points.map((p) => p.y);
  return { minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys) };
}

function inBbox(p: Vec2, bbox: RuntimeZone["bbox"]): boolean {
  return p.x >= bbox.minX && p.x <= bbox.maxX && p.y >= bbox.minY && p.y <= bbox.maxY;
}

function zoneContains(zone: RuntimeZone, p: Vec2): boolean {
  if (!inBbox(p, zone.bbox)) return false;
  if (zone.shape.kind === "circle") return Math.hypot(p.x - zone.shape.center.x, p.y - zone.shape.center.y) <= zone.shape.radius;
  return pointInPolygon(p, zone.shape.points);
}

/** Igual que `now()`/`rafNow()` de `QuestScene.tsx` — envueltos en su propia
 *  función para que el linter de pureza de React no confunda estas
 *  llamadas (siempre desde manejadores de evento o rAF, nunca durante el
 *  render) con una lectura impura del render en sí. */
function rafNow(): number {
  return performance.now();
}
function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
function segmentMs(dist: number): number {
  return prefersReducedMotion() ? 0 : Math.round(Math.min(1500, Math.max(420, dist * 30)));
}
function facingFor(seg: { from: Vec2; to: Vec2 }, fallback: Pose["facing"]): Pose["facing"] {
  if (seg.to.x < seg.from.x) return "left";
  if (seg.to.x > seg.from.x) return "right";
  return fallback;
}

/**
 * Movimiento de Alex — puerto de `walkPath` de `QuestScene.tsx:176-234`
 * **sin cambios funcionales** (docs/level-editor-plan.md §6.4/P5): un único
 * `requestAnimationFrame` interpola por reloj real (nunca por `setTimeout`
 * encadenado), `walkToken` cancela una ruta vieja si el jugador reclica a
 * mitad de camino, `segmentMs` colapsa a 0 con `prefers-reduced-motion`.
 *
 * No sabe que su sujeto es "Alex": recibe `spawn`, devuelve `pose`. Un
 * `useEntityMovement(entityId)` futuro (enemigos/NPCs, Fase 9+ opcional)
 * reutiliza el mismo `graph` ya memoizado por `useLevelRuntime` y el mismo
 * `findPathInMesh`.
 */
export function useAlexMovement(opts: {
  spawn: Vec2;
  graph: VisibilityGraph;
  zones: RuntimeZone[];
  onZoneCross?: (zoneId: string, kind: "zone" | "exit", crossing: "enter" | "exit") => void;
  onUnreachable?: () => void;
}) {
  const { onZoneCross, onUnreachable } = opts;
  const [pose, setPose] = useState<Pose>({ ...opts.spawn, facing: "left" });
  const [walking, setWalking] = useState(false);

  const walkToken = useRef(0);
  const rafRef = useRef<number | null>(null);
  const insideZonesRef = useRef<Set<string>>(new Set());
  const lastZoneCheckRef = useRef<Vec2 | null>(null);
  // `graph`/`zones` cambian de referencia en cada render (Fase 6 los recrea
  // vía `useMemo` en `useLevelRuntime`, pero un handler async como `frame`
  // sigue vivo entre renders) — un efecto sin deps los mantiene al día sin
  // leer/escribir el ref durante el render (regla `react-hooks/refs`).
  const optsRef = useRef(opts);
  useEffect(() => {
    optsRef.current = opts;
  });

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  function checkZones(p: Vec2) {
    // Filtro 1 (§14 P4): no re-evaluar si la pose no se movió lo suficiente
    // desde la última vez — a 60fps, la mayoría de los frames de un tramo
    // recto no cruzan ningún borde de zona.
    const last = lastZoneCheckRef.current;
    if (last && Math.hypot(p.x - last.x, p.y - last.y) < 0.25) return;
    lastZoneCheckRef.current = p;

    const { zones } = optsRef.current;
    const stillInside = new Set<string>();
    for (const zone of zones) {
      if (zoneContains(zone, p)) {
        stillInside.add(zone.id);
        if (!insideZonesRef.current.has(zone.id)) onZoneCross?.(zone.id, zone.kind, "enter");
      }
    }
    for (const id of insideZonesRef.current) {
      if (!stillInside.has(id)) {
        const zone = zones.find((z) => z.id === id);
        if (zone) onZoneCross?.(zone.id, zone.kind, "exit");
      }
    }
    insideZonesRef.current = stillInside;
  }

  /** Anima el avatar a lo largo de una ruta de varios tramos — devuelve el
   *  total en ms. Ver el comentario largo del original en QuestScene.tsx
   *  sobre por qué es un solo bucle rAF por reloj real y no un
   *  `setTimeout` encadenado por tramo. */
  function walkPath(waypoints: Vec2[]): number {
    if (waypoints.length <= 1) return 0;
    const token = ++walkToken.current;
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    const segments = waypoints.slice(1).map((to, i) => ({
      from: waypoints[i],
      to,
      ms: segmentMs(Math.hypot(to.x - waypoints[i].x, to.y - waypoints[i].y)),
    }));
    const total = segments.reduce((sum, s) => sum + s.ms, 0);
    const last = segments[segments.length - 1];

    if (total === 0) {
      setPose((p) => {
        const next = { x: last.to.x, y: last.to.y, facing: facingFor(last, p.facing) };
        checkZones(next);
        return next;
      });
      setWalking(false);
      return 0;
    }

    setWalking(true);
    const start = rafNow();

    function frame(now: number) {
      if (walkToken.current !== token) return; // otra ruta la reemplazó
      const elapsed = now - start;
      if (elapsed >= total) {
        setPose((p) => {
          const next = { x: last.to.x, y: last.to.y, facing: facingFor(last, p.facing) };
          checkZones(next);
          return next;
        });
        setWalking(false);
        rafRef.current = null;
        return;
      }
      let remaining = elapsed;
      let current = segments[0];
      for (const s of segments) {
        if (remaining <= s.ms) {
          current = s;
          break;
        }
        remaining -= s.ms;
      }
      const frac = current.ms === 0 ? 1 : remaining / current.ms;
      const x = current.from.x + (current.to.x - current.from.x) * frac;
      const y = current.from.y + (current.to.y - current.from.y) * frac;
      setPose((p) => {
        const next = { x, y, facing: facingFor(current, p.facing) };
        checkZones(next);
        return next;
      });
      rafRef.current = requestAnimationFrame(frame);
    }
    rafRef.current = requestAnimationFrame(frame);
    return total;
  }

  function walkTo(target: Vec2): number {
    const { path, reachable } = findPathInMesh(pose, target, opts.graph);
    if (!reachable) {
      onUnreachable?.();
      return 0;
    }
    return walkPath(path);
  }

  function approach(standPoint: Vec2, facePoint: Vec2): Promise<void> {
    return new Promise((resolve) => {
      const { path, reachable } = findPathInMesh(pose, standPoint, opts.graph);
      if (!reachable) {
        onUnreachable?.();
        resolve();
        return;
      }
      const ms = walkPath(path);
      window.setTimeout(() => {
        setPose((p) => ({ ...p, facing: facePoint.x < standPoint.x ? "left" : "right" }));
        resolve();
      }, ms);
    });
  }

  function teleport(to: Vec2) {
    walkToken.current++; // cancela cualquier ruta en curso
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    setWalking(false);
    lastZoneCheckRef.current = null;
    insideZonesRef.current = new Set();
    setPose((p) => ({ x: to.x, y: to.y, facing: p.facing }));
    checkZones(to);
  }

  return { pose, walking, walkTo, approach, teleport, nearestWalkablePoint: (p: Vec2) => nearestWalkablePointInMesh(p, opts.graph.mesh) };
}
