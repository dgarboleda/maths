import type { CameraBox } from "@/components/world/useCameraBox";
import { parallaxAxis } from "@/lib/level/depth";
import type { LevelBackgroundLayer } from "@/lib/level/schema";
import type { Pose } from "@/lib/level/runtime/useAlexMovement";

/**
 * Pinta `background.layers` (docs/scene-25d-plan.md §E.1/§H.3) — cada capa es
 * una caja del mismo tamaño que `sceneBox` (la caja de cámara del fondo
 * principal), pero con su propio `left/top` desplazado según `layer.depth`
 * vía `parallaxAxis`: `depth === 1` reproduce EXACTO el `sceneBox` del fondo
 * principal (mismo comportamiento de siempre); `depth === 0` queda fijo
 * (cielo/horizonte); valores intermedios/mayores se mueven menos/más que la
 * cámara. Sin capas configuradas (`layers` vacío o ausente), este componente
 * no pinta nada — cero cambio visual respecto a antes de esta fase.
 *
 * Nota de alcance: `layer.effect` (glow/fog/particles, §C.4) queda guardado
 * en el esquema y en el editor, pero esta fase no ata todavía ninguna clase
 * CSS de ambiente — es la extensión opcional descrita en el Paso 9 del plan,
 * no bloqueante para el criterio central (profundidad + al menos un
 * parallax).
 */
export function BackgroundLayers({ layers, sceneBox, pose }: { layers: LevelBackgroundLayer[]; sceneBox: CameraBox; pose: Pose }) {
  if (layers.length === 0) return null;
  return (
    <>
      {layers.map((layer) => {
        if (!layer.src) return null;
        const left = parallaxAxis(sceneBox.left, sceneBox.width, pose.x, layer.depth);
        const top = parallaxAxis(sceneBox.top, sceneBox.height, pose.y, layer.depth);
        return (
          <div key={layer.id} className="pointer-events-none absolute overflow-hidden" style={{ left, top, width: sceneBox.width, height: sceneBox.height }}>
            {/* eslint-disable-next-line @next/next/no-img-element -- tamaño nativo variable por nivel, mismo criterio que el fondo principal */}
            <img
              src={layer.src}
              alt=""
              aria-hidden="true"
              className="block w-full object-cover"
              style={{ position: "relative", top: `${layer.offsetY}%`, height: "100%", opacity: layer.opacity }}
            />
          </div>
        );
      })}
    </>
  );
}
