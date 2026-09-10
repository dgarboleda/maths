import type { LevelDepthConfig } from "./schema";

/**
 * Profundidad 2.5D — docs/scene-25d-plan.md §C, §E.2, §H. Lógica pura (sin
 * React, sin DOM): un solo lugar de cálculo, consumido tal cual por el
 * editor (previsualización) y por el runtime (juego real) — mismo criterio
 * que `navmesh.ts`. La profundidad NUNCA decide qué es transitable ni el
 * orden de pintado (eso sigue siendo `layer`/`position.y`, sin cambios): es
 * puramente un factor visual derivado de la posición Y.
 */

export const DEFAULT_DEPTH_CONFIG: LevelDepthConfig = {
  enabled: false,
  range: { nearY: 90, farY: 10 },
  scale: { near: 1.15, far: 0.75 },
  shadow: { enabled: true, opacityNear: 0.45, opacityFar: 0.1 },
};

function clamp01(t: number): number {
  return Math.min(1, Math.max(0, t));
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** 0 (en `range.farY`) → 1 (en `range.nearY`), clampado fuera de rango.
 *  `nearY === farY` (rango degenerado) se trata como "siempre cerca". */
function depthFraction(y: number, depth: LevelDepthConfig): number {
  const { nearY, farY } = depth.range;
  if (nearY === farY) return 1;
  return clamp01((y - farY) / (nearY - farY));
}

/**
 * Factor de escala para una entidad/el jugador en la posición Y dada.
 * `depth` ausente o `enabled: false` ⇒ `1` (comportamiento idéntico al de
 * antes de esta fase, sin coste de cálculo adicional relevante).
 */
export function depthScaleFor(y: number, depth: LevelDepthConfig | undefined): number {
  if (!depth || !depth.enabled) return 1;
  const t = depthFraction(y, depth);
  return lerp(depth.scale.far, depth.scale.near, t);
}

/** Opacidad de la sombra de contacto en la posición Y dada. `0` si la
 *  profundidad o la sombra están desactivadas (no se pinta ninguna sombra). */
export function shadowOpacityFor(y: number, depth: LevelDepthConfig | undefined): number {
  if (!depth || !depth.enabled || !depth.shadow.enabled) return 0;
  const t = depthFraction(y, depth);
  return lerp(depth.shadow.opacityFar, depth.shadow.opacityNear, t);
}

/**
 * Desplazamiento (en px, mismo eje que `sceneOffset`/`sceneSize`) de una capa
 * de fondo con el `layerDepth` dado, dentro de la caja de cámara ya calculada
 * por `useCameraBox` (`sceneOffset`/`sceneSize` = `sceneBox.left`/`.width` o
 * `.top`/`.height`) — docs/scene-25d-plan.md §H.3.
 *
 * `layerDepth === 1` devuelve exactamente `sceneOffset` (idéntico al fondo
 * principal de hoy, que se mueve 1:1 con la cámara); `layerDepth === 0`
 * devuelve la posición "neutra" (centrada en `focusPct = 50`, fija sin
 * importar hacia dónde mire la cámara — cielo/horizonte); valores
 * intermedios/mayores interpolan/extrapolan en línea recta. Deliberadamente
 * no reproduce el clamp de borde de `useCameraBox` (evita duplicar esa
 * lógica): en los extremos del mapa una capa de `layerDepth` distinto de 1
 * puede desincronizarse levemente del fondo principal, que es un matiz
 * visual aceptable, no un error funcional.
 */
export function parallaxAxis(sceneOffset: number, sceneSize: number, focusPct: number, layerDepth: number): number {
  return sceneOffset - (1 - layerDepth) * sceneSize * (0.5 - focusPct / 100);
}
