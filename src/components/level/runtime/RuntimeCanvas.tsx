"use client";

import { useRef, type MouseEvent, type ReactNode } from "react";
import { useCameraBox } from "@/components/world/useCameraBox";
import { evaluateCondition } from "@/lib/level/events/conditions";
import type { LevelDefinition, LevelEntity } from "@/lib/level/schema";
import type { LevelRuntimeState } from "@/lib/level/runtime/state";
import type { Pose } from "@/lib/level/runtime/useAlexMovement";
import { RuntimeEntity } from "./RuntimeEntity";
import { RuntimeZones } from "./RuntimeZones";
import { RuntimePlayer } from "./RuntimePlayer";
import { BackgroundLayers } from "./BackgroundLayers";

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

  // Orden de pintado unificado (entidades + jugador) — mismo y-sort que ya
  // usa el editor (`EntityLayer.tsx`, docs/level-editor-plan.md §7.4: `layer`
  // desempata, luego `y`). Antes de esta fase el jugador se pintaba SIEMPRE
  // encima de todas las entidades (era un `<RuntimePlayer>` aparte, después
  // en el DOM) — sin esto, escalar por profundidad se ve raro (Alex "lejos"
  // y más chico pero igual tapando todo lo que tiene delante). El jugador
  // entra a la misma lista con `layer: 0` (como cualquier entidad sin
  // desempate explícito); todo sigue pintándose con el mismo z-index (20)
  // que ya tenían ambos, así que el ORDEN EN EL DOM es lo único que decide
  // el apilamiento — igual criterio que el editor.
  type Painted = { key: string; y: number; layer: number; render: () => ReactNode };
  const paintedEntities: Painted[] = level.entities.map((entity) => ({
    key: entity.id,
    y: entity.position.y,
    layer: entity.layer,
    render: () => <RuntimeEntity entity={entity} runtimeState={runtimeState} onInteract={onEntityClick} depth={level.depth} />,
  }));
  const paintedPlayer: Painted = {
    key: "__player__",
    y: pose.y,
    layer: 0,
    render: () => <RuntimePlayer pose={pose} walking={walking} childName={childName} depth={level.depth} />,
  };
  const painted = [...paintedEntities, paintedPlayer].sort((a, b) => a.layer - b.layer || a.y - b.y);

  // Capas de fondo (docs/scene-25d-plan.md §H.3): las de `depth < 1` van
  // DETRÁS del fondo principal (cielo/horizonte lejano), las de `depth > 1`
  // van DELANTE de todo (incluidas entidades/jugador) — una silueta de
  // primer plano que puede ocluir al personaje es un efecto 2.5D válido y
  // deliberado, no un descuido. `depth === 1` no debería usarse en una capa
  // (el fondo principal `src` ya cumple ese rol); si aparece, se pinta junto
  // a las "detrás" sin romper nada.
  const layers = level.background.layers ?? [];
  const backLayers = layers.filter((l) => l.depth < 1);
  const frontLayers = layers.filter((l) => l.depth >= 1);

  return (
    <div ref={sceneRef} className="relative h-full w-full overflow-clip rounded-3xl border border-indigo-500/25 bg-slate-950">
      <BackgroundLayers layers={backLayers} sceneBox={sceneBox} pose={pose} />

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
          {painted.map((item) => (
            <div key={item.key}>{item.render()}</div>
          ))}
        </div>
      </div>

      <BackgroundLayers layers={frontLayers} sceneBox={sceneBox} pose={pose} />
    </div>
  );
}
