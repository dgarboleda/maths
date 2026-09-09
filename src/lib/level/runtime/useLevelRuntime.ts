"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { buildVisibilityGraph } from "@/lib/world/navmesh";
import type { LevelDefinition, LevelEventType, PropertyValue } from "@/lib/level/schema";
import type { SkillProgress } from "@/lib/types";
import { createEventBus, emit } from "@/lib/level/events/bus";
import { applyRuntimePatch, deriveInitialState, type LevelRuntimeState } from "./state";
import { buildRuntimeMesh, runtimeMeshKey } from "./navigation";
import { useAlexMovement, bboxOf, type RuntimeZone } from "./useAlexMovement";
import { applySideEffect, type RuntimeServices } from "./services";

/**
 * Junta estado + malla activa + movimiento + bus de eventos en un solo hook
 * — la mitad "motor" de `LevelRuntime.tsx` (docs/level-editor-plan.md §9,
 * Fase 9). El grafo de visibilidad se memoiza por `runtimeMeshKey`: solo se
 * reconstruye cuando la malla activa cambió de verdad (§6.4/§14 P3), nunca
 * en cada frame ni en cada clic.
 */
export function useLevelRuntime(
  level: LevelDefinition,
  progressBySkill: Record<string, SkillProgress>,
  services: RuntimeServices,
  onExitEnter?: (targetHref: string) => void,
) {
  // `EventBus.fired` se muta en el lugar (`emit`, ver events/bus.ts) — no
  // hace falta un `useRef` para eso, alcanza con que `bus` no se reemplace
  // nunca (por eso `useState` sin setter, no `useMemo`: el inicializador
  // corre una sola vez de verdad, nunca se recalcula entre renders).
  const [bus] = useState(() => createEventBus(level.events));
  const [state, setState] = useState<LevelRuntimeState>(() => deriveInitialState(bus, level, progressBySkill));
  const [unreachableAnnouncement, setUnreachableAnnouncement] = useState<string | null>(null);
  const timersRef = useRef<number[]>([]);

  const meshKey = runtimeMeshKey(level, state);
  const graph = useMemo(
    () => buildVisibilityGraph(buildRuntimeMesh(level, state)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [level, meshKey],
  );

  const zones: RuntimeZone[] = useMemo(() => {
    const fromZones: RuntimeZone[] = level.zones.map((z) => ({ id: z.id, kind: "zone", shape: z.shape, bbox: bboxOf(z.shape) }));
    const fromExits: RuntimeZone[] = level.navigation.exits.map((e) => {
      const shape = { kind: "polygon" as const, points: e.polygon };
      return { id: e.id, kind: "exit", shape, bbox: bboxOf(shape) };
    });
    return [...fromZones, ...fromExits];
  }, [level]);

  /** Emite un evento contra el bus, y programa (por su `atMs`) que cada
   *  efecto resultante aplique su `patch` al estado y/o su `side` a
   *  `services` — el mismo reparto patch/side de §8.1. */
  function applyEvent(type: LevelEventType, targetId: string | null, data: Record<string, PropertyValue> = {}) {
    const effects = emit(bus, { type, targetId, data }, { flags: state.flags, entityStates: state.entityStates });
    for (const effect of effects) {
      const timer = window.setTimeout(() => {
        if (effect.patch) setState((s) => applyRuntimePatch(s, effect.patch!));
        if (effect.side) applySideEffect(effect.side, services);
      }, effect.atMs);
      timersRef.current.push(timer);
    }
  }

  const movement = useAlexMovement({
    spawn: level.navigation.spawn,
    graph,
    zones,
    onZoneCross: (id, kind, crossing) => {
      if (kind === "exit") {
        if (crossing !== "enter") return;
        const exit = level.navigation.exits.find((e) => e.id === id);
        if (exit) onExitEnter?.(exit.targetHref);
        return;
      }
      applyEvent(crossing === "enter" ? "ON_ENTER_ZONE" : "ON_EXIT_ZONE", id);
    },
    onUnreachable: () => setUnreachableAnnouncement("Ese lugar no se puede alcanzar desde acá."),
  });

  function clearTimers() {
    timersRef.current.forEach((t) => window.clearTimeout(t));
    timersRef.current = [];
  }

  useEffect(() => clearTimers, []);

  return { state, graph, zones, ...movement, applyEvent, unreachableAnnouncement, clearTimers };
}
