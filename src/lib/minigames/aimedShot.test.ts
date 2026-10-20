import { expect, test } from "vitest";
import { pointOnRoute, routeLength, shotRoute } from "./aimedShot";

test.each(["direct", "left", "right"] as const)("tiro %s: las cinco columnas conservan el destino elegido", (style) => {
  for (let col = 0; col < 5; col++) {
    const start = { x: 8 + col * 20, y: 86 };
    const target = { x: start.x, y: 24 };
    const route = shotRoute(start, target, style, 96);
    expect(pointOnRoute(route, 0)).toEqual(start);
    expect(pointOnRoute(route, 1).x).toBeCloseTo(target.x);
    expect(pointOnRoute(route, 1).y).toBeCloseTo(target.y);
    if (style !== "direct") {
      expect(route[1].x).toBe(style === "left" ? 0 : 96);
      expect(route[1].y).toBeGreaterThan(target.y);
      expect(route[1].y).toBeLessThan(start.y);
      expect(routeLength(route)).toBeGreaterThan(62);
    }
    for (let t = 0; t <= 1; t += 0.05) {
      const point = pointOnRoute(route, t);
      expect(point.x).toBeGreaterThanOrEqual(0);
      expect(point.x).toBeLessThanOrEqual(96);
      expect(point.y).toBeGreaterThanOrEqual(24 - 1e-8);
    }
  }
});
