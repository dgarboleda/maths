"use client";

import { useLayoutEffect, useMemo, useState, type RefObject } from "react";

export interface CameraBox {
  left: number;
  top: number;
  width: number;
  height: number;
}

/**
 * Geometría de una cámara de videojuego 2D: la imagen de `size` se escala
 * para cubrir siempre el contenedor (mismo cálculo que `object-fit: cover` —
 * nunca deja huecos en los bordes), pero en vez de centrarla de forma fija,
 * el recorte visible sigue a `focus` (posición en % de la imagen, la del
 * personaje) con el desplazamiento recortado (`clamp`) para que nunca se
 * vea más allá de los bordes reales de la imagen. Reemplaza el antiguo
 * `useCoverBox` (centrado estático): con la escena ahora encajada en la
 * altura disponible del viewport en vez de en un aspect-ratio fijo
 * (`jugar/[childId]/page.tsx`), el contenedor puede quedar mucho más
 * "angosto" que la imagen — sin cámara, gran parte del mundo quedaría fuera
 * de vista para siempre; con ella, basta con caminar para traerla a la vista.
 *
 * `minVisibleFraction` (0-1, default abajo) topea cuánto puede zoomear
 * "cover" antes de forzar un zoom menor: en un contenedor de aspect ratio
 * muy distinto al de la imagen (típico en un teléfono en vertical contra un
 * fondo panorámico), cubrir sin dejar huecos exige tanto zoom que gran
 * parte del mapa queda fuera del "visor" sin ningún scroll real para
 * alcanzarla (la cámara sigue al personaje; la página nunca scrollea) — un
 * hotspot lejos del foco puede quedar permanentemente inalcanzable, no solo
 * difícil de ver. Por eso, con el default, el zoom nunca baja de mostrar al
 * menos esta fracción del ancho Y del alto de la imagen; si eso deja un
 * margen sin cubrir en algún lado, se ve el fondo oscuro del contenedor ahí
 * en vez de recortar el mundo más allá de este límite. Pasar `0` (o
 * cualquier valor `<= 0`) apaga el tope por completo: cover puro, la imagen
 * cubre el 100% del visor siempre, sin ninguna garantía de alcanzabilidad —
 * solo lo usa `RuntimeCanvas` (niveles del Editor, a pedido explícito y
 * revisando nivel por nivel); `QuestScene` (Ciudad Central legacy, cuyos
 * hotspots no se pueden reposicionar — `src/lib/world/**` no se toca)
 * depende del default para que sus hotspots sigan alcanzables — quitárselo
 * rompe `e2e/aventura.spec.ts` en viewports móviles (un hotspot queda fuera
 * del rango de paneo de la cámara, confirmado en CI).
 */
const MIN_VISIBLE_FRACTION = 0.55;

function cameraBox(
  containerWidth: number,
  containerHeight: number,
  size: { width: number; height: number },
  focus: { x: number; y: number },
  minVisibleFraction: number,
): CameraBox {
  if (containerWidth === 0 || containerHeight === 0) {
    return { left: 0, top: 0, width: containerWidth, height: containerHeight };
  }
  const coverScale = Math.max(containerWidth / size.width, containerHeight / size.height);
  // `minVisibleFraction <= 0` deja `maxReachableScale` en `Infinity`
  // (división por 0/negativo) — `Math.min(coverScale, Infinity)` da
  // `coverScale` sin necesidad de una rama aparte para "sin tope".
  const maxReachableScale =
    minVisibleFraction > 0
      ? Math.min(containerWidth / (size.width * minVisibleFraction), containerHeight / (size.height * minVisibleFraction))
      : Infinity;
  const scale = Math.min(coverScale, maxReachableScale);
  const width = size.width * scale;
  const height = size.height * scale;
  const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
  // Con `scale` topeado por `maxReachableScale`, un eje puede quedar más
  // chico que el contenedor: ahí se centra en vez de seguir el foco, porque
  // la imagen entera ya entra en ese eje. En el otro eje (el que sigue
  // dominando el zoom), `containerWidth - width` (o su análogo en alto)
  // sigue siendo <= 0 y el clamp de siempre aplica.
  const left =
    width <= containerWidth
      ? (containerWidth - width) / 2
      : clamp(containerWidth / 2 - (focus.x / 100) * width, containerWidth - width, 0);
  const top =
    height <= containerHeight
      ? (containerHeight - height) / 2
      : clamp(containerHeight / 2 - (focus.y / 100) * height, containerHeight - height, 0);
  return { left, top, width, height };
}

/**
 * Sigue el tamaño de `containerRef` (vía `ResizeObserver`) y la posición de
 * `focus`, devolviendo la caja de cámara recalculada. `useLayoutEffect` mide
 * el contenedor de forma síncrona al montar para no arrancar con una caja a
 * 0×0 y dar un salto visible en el primer paint.
 */
export function useCameraBox(
  containerRef: RefObject<HTMLElement | null>,
  size: { width: number; height: number },
  focus: { x: number; y: number },
  /** Ver el comentario de `cameraBox` arriba. Default = protegido (igual
   *  que siempre); `RuntimeCanvas` pasa `0` a propósito. */
  minVisibleFraction: number = MIN_VISIBLE_FRACTION,
): CameraBox {
  const [container, setContainer] = useState<{ width: number; height: number }>(() => ({ width: 0, height: 0 }));

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    function measure() {
      const rect = el!.getBoundingClientRect();
      setContainer({ width: rect.width, height: rect.height });
    }

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [size.width, size.height]);

  return useMemo(
    () => cameraBox(container.width, container.height, size, focus, minVisibleFraction),
    // Deps por valor (no `size`/`focus` como objetos): ambos suelen llegar
    // como literales nuevos en cada render del llamador y recalcularían la
    // caja aunque no haya cambiado ningún número real.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [container.width, container.height, size.width, size.height, focus.x, focus.y, minVisibleFraction],
  );
}
