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
 * (cielo/horizonte, el valor típico para clima — no tiene sentido que la
 * lluvia paneé con el mundo); valores intermedios/mayores se mueven menos/
 * más que la cámara. Sin capas configuradas (`layers` vacío o ausente), este
 * componente no pinta nada — cero cambio visual respecto a antes de esta
 * fase.
 *
 * `layer.effect` (fog/rain/snow/lightning/particles/glow) se pinta como una
 * superposición CSS aparte, después de la imagen — no depende de `src`: una
 * capa "solo lluvia" (`src: ""`, `effect: "rain"`) es válida, por eso el
 * filtro de abajo solo descarta una capa que no tiene NI imagen NI efecto.
 */
export function BackgroundLayers({ layers, sceneBox, pose }: { layers: LevelBackgroundLayer[]; sceneBox: CameraBox; pose: Pose }) {
  if (layers.length === 0) return null;
  return (
    <>
      {layers.map((layer) => {
        if (!layer.src && layer.effect === "none") return null;
        const left = parallaxAxis(sceneBox.left, sceneBox.width, pose.x, layer.depth);
        const top = parallaxAxis(sceneBox.top, sceneBox.height, pose.y, layer.depth);
        return (
          <div key={layer.id} className="pointer-events-none absolute overflow-hidden" style={{ left, top, width: sceneBox.width, height: sceneBox.height }}>
            {layer.src && (
              // eslint-disable-next-line @next/next/no-img-element -- tamaño nativo variable por nivel, mismo criterio que el fondo principal
              <img
                src={layer.src}
                alt=""
                aria-hidden="true"
                className="block w-full object-cover"
                style={{ position: "relative", top: `${layer.offsetY}%`, height: "100%", opacity: layer.opacity }}
              />
            )}
            <WeatherEffect effect={layer.effect} />
          </div>
        );
      })}
    </>
  );
}

/**
 * Superposición del efecto ambiental de una capa — ver la sección "Clima
 * del Level Editor" en globals.css para el detalle de cada animación.
 * Exportado (no solo de uso interno acá) porque `BackgroundLayer.tsx` del
 * editor (`src/components/level/editor/layers/`) lo reutiliza tal cual para
 * la previsualización estática del lienzo — ninguna de estas animaciones
 * depende de la cámara (a diferencia del parallax), así que se ven igual de
 * bien ahí que jugando; la regla de aislamiento del proyecto es de un solo
 * sentido (`editor/**` puede importar de `runtime/**`, nunca al revés —
 * mismo criterio que ya usa `LevelEditorScreen.tsx` con `LevelRuntime`).
 */
export function WeatherEffect({ effect }: { effect: LevelBackgroundLayer["effect"] }) {
  switch (effect) {
    case "none":
      return null;
    case "rain":
      return <div aria-hidden="true" className="anim-rain pointer-events-none absolute inset-0" />;
    case "snow":
      return <div aria-hidden="true" className="anim-snow pointer-events-none absolute inset-0" />;
    case "lightning":
      return <div aria-hidden="true" className="anim-lightning pointer-events-none absolute inset-0" />;
    case "particles":
      return <div aria-hidden="true" className="anim-weather-particles pointer-events-none absolute inset-0" />;
    case "fog":
      // `left`/`right` en `style` en vez de una utilidad `inset-x` de
      // Tailwind: mismo criterio que `SceneFx.tsx` (Ciudad Central) — un
      // porcentaje negativo ahí evita que la niebla muestre un borde recto
      // al llegar al límite del blur mientras se desplaza.
      return (
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="anim-fog-layer absolute top-[8%] h-1/3 rounded-full bg-white/10 blur-3xl" style={{ left: "-10%", right: "-10%" }} />
          <div
            className="anim-fog-layer absolute bottom-[6%] h-1/3 rounded-full bg-white/10 blur-3xl"
            style={{ left: "-10%", right: "-10%", animationDelay: "-15s", animationDuration: "38s" }}
          />
        </div>
      );
    case "glow":
      return (
        <div
          aria-hidden="true"
          className="anim-breathe pointer-events-none absolute inset-0"
          style={{ background: "radial-gradient(60% 50% at 50% 40%, rgba(251,191,36,0.18), transparent 70%)" }}
        />
      );
  }
}
