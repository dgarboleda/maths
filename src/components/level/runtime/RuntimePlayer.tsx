import { Avatar } from "@/components/world/Avatar";
import type { Pose } from "@/lib/level/runtime/useAlexMovement";

/** El avatar del jugador — mismo markup que `QuestScene.tsx:420-439`, ahora
 *  parametrizado por un `Pose` genérico en vez de cerrado sobre Ciudad
 *  Central. */
export function RuntimePlayer({ pose, walking, childName }: { pose: Pose; walking: boolean; childName: string }) {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute z-20" style={{ left: `${pose.x}%`, top: `${pose.y}%` }}>
      <div style={{ transform: "translate(-50%, -97%)", transformOrigin: "50% 100%" }}>
        <span className="absolute bottom-0 left-1/2 h-3 w-16 -translate-x-1/2 rounded-full bg-black/50 blur-md" />
        <div style={{ transform: pose.facing === "left" ? "scaleX(-1)" : undefined }}>
          <Avatar variant="explorer" walking={walking} className="h-16 drop-shadow-[0_0_12px_rgba(34,211,238,0.5)]" title={`${childName}, jugando`} />
        </div>
      </div>
    </div>
  );
}
