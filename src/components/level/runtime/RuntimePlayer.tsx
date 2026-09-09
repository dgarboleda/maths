import { Avatar } from "@/components/world/Avatar";
import { depthScaleFor, shadowOpacityFor } from "@/lib/level/depth";
import type { LevelDepthConfig } from "@/lib/level/schema";
import type { Pose } from "@/lib/level/runtime/useAlexMovement";

/**
 * El avatar del jugador — mismo markup que `QuestScene.tsx:420-439`, ahora
 * parametrizado por un `Pose` genérico en vez de cerrado sobre Ciudad
 * Central.
 *
 * Profundidad (docs/scene-25d-plan.md §D.4/§H.2): el `transform-origin`
 * "50% 100%" (pies) ya estaba puesto para el `translate` de ajuste fino —
 * es exactamente el punto de anclaje que necesita el escalado por
 * profundidad, así que `scale(depthScale)` se añade al MISMO `transform`
 * sin mover los pies del punto real (`pose.x/y`). La sombra ya existente se
 * escala junto con el resto (es un hijo del div transformado) y solo
 * necesita su opacidad ajustada por separado (`opacity` no es parte de
 * `transform`). Sin `level.depth`/desactivada, ambas funciones devuelven el
 * valor neutro (escala 1, opacidad igual a la sombra fija de siempre) y el
 * resultado es idéntico al de antes de esta fase.
 */
export function RuntimePlayer({ pose, walking, childName, depth }: { pose: Pose; walking: boolean; childName: string; depth?: LevelDepthConfig }) {
  const depthScale = depthScaleFor(pose.y, depth);
  const shadowOpacity = depth?.enabled ? shadowOpacityFor(pose.y, depth) : 0.5;
  return (
    <div aria-hidden="true" className="pointer-events-none absolute z-20" style={{ left: `${pose.x}%`, top: `${pose.y}%` }}>
      <div style={{ transform: `translate(-50%, -97%) scale(${depthScale})`, transformOrigin: "50% 100%" }}>
        <span className="absolute bottom-0 left-1/2 h-3 w-16 -translate-x-1/2 rounded-full bg-black blur-md" style={{ opacity: shadowOpacity }} />
        <div style={{ transform: pose.facing === "left" ? "scaleX(-1)" : undefined }}>
          <Avatar variant="explorer" walking={walking} className="h-16 drop-shadow-[0_0_12px_rgba(34,211,238,0.5)]" title={`${childName}, jugando`} />
        </div>
      </div>
    </div>
  );
}
