"use client";

import { useState } from "react";
import { ImageOff } from "lucide-react";
import type { LevelBackground, LevelBackgroundLayer } from "@/lib/level/schema";
import { WeatherEffect } from "@/components/level/runtime/BackgroundLayers";

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
 *
 * `layer.effect` (niebla/lluvia/nieve/rayos/partículas/brillo) es la
 * excepción: esas animaciones no dependen de la cámara (no son parallax),
 * así que sí se previsualizan acá tal cual se ven jugando — reutilizan
 * `WeatherEffect` del runtime en vez de reimplementar el mismo CSS.
 */
export function BackgroundLayer({ background }: { background: LevelBackground }) {
  // Si la imagen se borró de la biblioteca (icono de papelera de
  // "Mis imágenes", docs/asset-management-plan.md §G riesgo R4 — el autor
  // pudo confirmar el borrado a pesar del aviso) `src` queda apuntando a una
  // URL muerta. Sin este control el navegador dibuja su icono de imagen
  // rota nativo, diminuto y mal ubicado; acá se cambia por un aviso legible
  // que además le dice al autor qué hacer.
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const mainFailed = failedSrc === background.src;
  const layers = background.layers ?? [];
  const backLayers = layers.filter((l) => l.depth < 1);
  const frontLayers = layers.filter((l) => l.depth >= 1);

  if (!background.src && layers.length === 0) {
    return <div className="absolute inset-0 bg-slate-900" aria-hidden="true" />;
  }

  // `opacity` queda solo en la imagen (no en el wrapper): mismo alcance que
  // `BackgroundLayers.tsx` del runtime, donde `WeatherEffect` es un hermano
  // sin opacidad propia — si acá se aplicara al wrapper entero, el clima se
  // vería más tenue en el editor que jugando, un WYSIWYG mentiroso.
  function renderLayer(layer: LevelBackgroundLayer) {
    if (!layer.src && layer.effect === "none") return null;
    return (
      <div key={layer.id} className="absolute inset-0 overflow-hidden">
        {layer.src && (
          // eslint-disable-next-line @next/next/no-img-element -- tamaño nativo variable por nivel
          <img
            src={layer.src}
            alt=""
            aria-hidden="true"
            className="absolute inset-x-0 block w-full object-cover"
            style={{ top: `${layer.offsetY}%`, height: "100%", opacity: layer.opacity }}
          />
        )}
        <WeatherEffect effect={layer.effect} />
      </div>
    );
  }

  return (
    <>
      {backLayers.map(renderLayer)}

      {background.src && mainFailed && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-slate-900 text-center text-amber-200" aria-hidden="true">
          <ImageOff className="size-6" aria-hidden="true" />
          <span className="text-xs font-bold">Imagen de fondo no disponible</span>
          <span className="text-[11px] text-amber-200/80">Elige otra en &ldquo;Fondo&rdquo;.</span>
        </div>
      )}

      {background.src && !mainFailed && (
        // eslint-disable-next-line @next/next/no-img-element -- tamaño nativo variable por nivel, no vale la pena next/image acá
        <img
          src={background.src}
          alt={background.alt}
          className="absolute inset-0 block size-full object-cover"
          onError={() => setFailedSrc(background.src)}
        />
      )}

      {frontLayers.map(renderLayer)}
    </>
  );
}
