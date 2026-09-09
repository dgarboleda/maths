"use client";

import { useRef, type MouseEvent } from "react";
import { useCameraBox } from "@/components/world/useCameraBox";
import { evaluateCondition } from "@/lib/level/events/conditions";
import type { LevelDefinition, LevelEntity } from "@/lib/level/schema";
import type { LevelRuntimeState } from "@/lib/level/runtime/state";
import type { Pose } from "@/lib/level/runtime/useAlexMovement";
import { RuntimeEntity } from "./RuntimeEntity";
import { RuntimeZones } from "./RuntimeZones";
import { RuntimePlayer } from "./RuntimePlayer";

/**
 * El "mundo" del nivel — mismo esquema geométrico que `QuestScene.tsx:396-477`
 * (una caja de cámara en px que sigue a `pose`, todo lo de adentro en % de
 * esa caja) pero genérico sobre cualquier `LevelDefinition`, no cerrado
 * sobre Ciudad Central.
 */
export function RuntimeCanvas({
  level,
  runtimeState,
  pose,
  walking,
  childName,
  debug,
  onGroundClick,
  onEntityClick,
}: {
  level: LevelDefinition;
  runtimeState: LevelRuntimeState;
  pose: Pose;
  walking: boolean;
  childName: string;
  debug: boolean;
  onGroundClick: (xPct: number, yPct: number) => void;
  onEntityClick: (entity: LevelEntity) => void;
}) {
  const sceneRef = useRef<HTMLDivElement>(null);
  const sceneBox = useCameraBox(sceneRef, { width: level.background.width, height: level.background.height }, pose);

  const activeFilter = (level.background.filters ?? []).find((f) => evaluateCondition(f.when, { flags: runtimeState.flags, entityStates: runtimeState.entityStates }));

  function onGroundPointerDown(e: MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / sceneBox.width) * 100;
    const y = ((e.clientY - rect.top) / sceneBox.height) * 100;
    onGroundClick(x, y);
  }

  return (
    <div ref={sceneRef} className="relative h-full w-full overflow-clip rounded-3xl border border-indigo-500/25 bg-slate-950">
      <div className="absolute" style={{ left: sceneBox.left, top: sceneBox.top, width: sceneBox.width, height: sceneBox.height }}>
        {level.background.src && (
          // eslint-disable-next-line @next/next/no-img-element -- tamaño nativo variable por nivel
          <img
            src={level.background.src}
            alt={level.background.alt}
            className="block size-full object-cover transition-[filter] duration-1000"
            style={{ filter: activeFilter?.css }}
          />
        )}

        <RuntimeZones zones={level.zones} debug={debug} />

        <div className="absolute inset-0" onClick={onGroundPointerDown}>
          {level.entities.map((entity) => (
            <RuntimeEntity key={entity.id} entity={entity} runtimeState={runtimeState} onInteract={onEntityClick} />
          ))}
        </div>

        <RuntimePlayer pose={pose} walking={walking} childName={childName} />
      </div>
    </div>
  );
}
