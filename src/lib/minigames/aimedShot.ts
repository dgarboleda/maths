export interface ShotPoint { x: number; y: number }
export type ShotStyle = "direct" | "left" | "right";

/** Trayectoria apuntada: el rebote es geométrico, nunca elige otra respuesta. */
export function shotRoute(start: ShotPoint, target: ShotPoint, style: ShotStyle, maxX: number): ShotPoint[] {
  if (style === "direct") return [start, target];
  const wall = style === "left" ? 0 : maxX;
  const mirroredX = 2 * wall - target.x;
  const fraction = (wall - start.x) / (mirroredX - start.x);
  return [start, { x: wall, y: start.y + (target.y - start.y) * fraction }, target];
}

export function routeLength(route: readonly ShotPoint[]): number {
  return route.slice(1).reduce((length, point, index) => length + Math.hypot(point.x - route[index].x, point.y - route[index].y), 0);
}

/** Velocidad constante en ambos tramos; una pausa no adelanta el impacto. */
export function pointOnRoute(route: readonly ShotPoint[], progress: number): ShotPoint {
  let remaining = routeLength(route) * Math.max(0, Math.min(1, progress));
  for (let index = 1; index < route.length; index++) {
    const from = route[index - 1], to = route[index];
    const length = Math.hypot(to.x - from.x, to.y - from.y);
    if (remaining <= length && length > 0) return { x: from.x + (to.x - from.x) * remaining / length, y: from.y + (to.y - from.y) * remaining / length };
    remaining -= length;
  }
  return route[route.length - 1];
}
