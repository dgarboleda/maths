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
 * `scale` es siempre el de "cover" puro (el mayor de los dos cocientes,
 * nunca menos): la imagen cubre el contenedor entero en todo momento, sin
 * franjas del fondo oscuro asomando en ningún lado, sea cual sea su aspect
 * ratio contra el del contenedor.
 *
 * Hasta acá hubo un `maxReachableScale` que topeaba el zoom para garantizar
 * ver siempre al menos una fracción mínima del ancho y el alto de la
 * imagen — pensado para que un hotspot lejos del foco no quedara
 * inalcanzable en un contenedor de aspect ratio muy distinto al de la
 * imagen (teléfono en vertical vs. fondo panorámico). Ese tope forzaba
 * `scale` por debajo del de cover, y ESO era lo que dejaba ver el fondo
 * oscuro del contenedor arriba/abajo del todo — el efecto era el requisito,
 * no un bug del cálculo. Se quitó a pedido explícito: ahora el fondo
 * siempre llena el 100% del visor; el costo es que, en un nivel cuyo fondo
 * tenga un aspect ratio muy distinto al del dispositivo, un hotspot cerca
 * de un extremo del eje recortado puede quedar fuera del rango de paneo de
 * la cámara — a revisar nivel por nivel si hace falta, no acá.
 */
function cameraBox(
  containerWidth: number,
  containerHeight: number,
  size: { width: number; height: number },
  focus: { x: number; y: number },
): CameraBox {
  if (containerWidth === 0 || containerHeight === 0) {
    return { left: 0, top: 0, width: containerWidth, height: containerHeight };
  }
  const scale = Math.max(containerWidth / size.width, containerHeight / size.height);
  const width = size.width * scale;
  const height = size.height * scale;
  const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
  const left = clamp(containerWidth / 2 - (focus.x / 100) * width, containerWidth - width, 0);
  const top = clamp(containerHeight / 2 - (focus.y / 100) * height, containerHeight - height, 0);
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
    () => cameraBox(container.width, container.height, size, focus),
    // Deps por valor (no `size`/`focus` como objetos): ambos suelen llegar
    // como literales nuevos en cada render del llamador y recalcularían la
    // caja aunque no haya cambiado ningún número real.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [container.width, container.height, size.width, size.height, focus.x, focus.y],
  );
}
