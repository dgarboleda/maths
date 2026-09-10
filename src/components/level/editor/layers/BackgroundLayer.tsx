import type { LevelBackground } from "@/lib/level/schema";

/**
 * Fondo del nivel — llena el "stage" 1:1 (igual que `QuestScene.tsx:410-416`,
 * sin el filtro condicional de flags: eso lo interpreta el runtime, Fase 9).
 *
 * `background.layers` (docs/scene-25d-plan.md §E.1) se previsualizan
 * apiladas alrededor del fondo principal (las de `depth < 1` detrás, las de
 * `depth >= 1` delante) pero SIN parallax animado: el editor no tiene una
 * cámara que siga a un personaje (es un canvas estático con zoom/pan de
 * autor), así que aquí solo importa el desplazamiento vertical (`offsetY`)
 * y la opacidad — el movimiento real de cada capa solo se ve jugando
 * (`RuntimeCanvas`/`BackgroundLayers.tsx`).
 */
export function BackgroundLayer({ background }: { background: LevelBackground }) {
  const layers = background.layers ?? [];
  const backLayers = layers.filter((l) => l.depth < 1);
  const frontLayers = layers.filter((l) => l.depth >= 1);

  if (!background.src && layers.length === 0) {
    return <div className="absolute inset-0 bg-slate-900" aria-hidden="true" />;
  }

  return (
    <>
      {backLayers.map((layer) =>
        layer.src ? (
          // eslint-disable-next-line @next/next/no-img-element -- tamaño nativo variable por nivel
          <img key={layer.id} src={layer.src} alt="" aria-hidden="true" className="absolute inset-x-0 block w-full object-cover" style={{ top: `${layer.offsetY}%`, height: "100%", opacity: layer.opacity }} />
        ) : null,
      )}

      {background.src && (
        // eslint-disable-next-line @next/next/no-img-element -- tamaño nativo variable por nivel, no vale la pena next/image acá
        <img src={background.src} alt={background.alt} className="absolute inset-0 block size-full object-cover" />
      )}

      {frontLayers.map((layer) =>
        layer.src ? (
          // eslint-disable-next-line @next/next/no-img-element -- tamaño nativo variable por nivel
          <img key={layer.id} src={layer.src} alt="" aria-hidden="true" className="absolute inset-x-0 block w-full object-cover" style={{ top: `${layer.offsetY}%`, height: "100%", opacity: layer.opacity }} />
        ) : null,
      )}
    </>
  );
}
