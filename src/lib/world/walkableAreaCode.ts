import type { Polygon, WalkableArea } from "./navmesh";

/**
 * Serializa un `WalkableArea` como el mismo literal TS que ya escribe a
 * mano `questScene.ts` — lo usan tanto "Copiar código" (cliente) como la
 * ruta de guardado (servidor), para no tener dos formatos distintos.
 */
export function formatArea(area: WalkableArea): string {
  const round1 = (n: number) => Math.round(n * 10) / 10;
  // `boundary` cuelga directo del objeto (sus puntos van a 4 espacios); cada
  // anillo de `holes` cuelga un nivel más adentro (sus puntos van a 6) — no
  // es el mismo indent, así que no puede ser la misma plantilla para ambos.
  const points = (poly: Polygon, indent: string) =>
    poly.map((p) => `${indent}{ x: ${round1(p.x)}, y: ${round1(p.y)} },`).join("\n");
  const boundary = `[\n${points(area.boundary, "    ")}\n  ]`;
  const holes = area.holes.map((h) => `    [\n${points(h, "      ")}\n    ],`).join("\n");
  return `{\n  boundary: ${boundary},\n  holes: [\n${holes}\n  ],\n}`;
}

/**
 * Ubica `export const <exportName>` y, contando llaves desde el `{` que le
 * sigue, halla el `}` que de verdad lo cierra (un regex ingenuo se confunde
 * con las `{ x, y }` de los huecos anidados). Devuelve `null` si no matchea
 * — nunca hay que escribir un archivo a ciegas.
 */
export function locateExportBlock(text: string, exportName: string): { start: number; end: number } | null {
  const markerIndex = text.indexOf(`export const ${exportName}`);
  if (markerIndex === -1) return null;
  const braceStart = text.indexOf("{", markerIndex);
  if (braceStart === -1) return null;
  let depth = 0;
  for (let i = braceStart; i < text.length; i++) {
    if (text[i] === "{") depth++;
    else if (text[i] === "}") {
      depth--;
      if (depth === 0) {
        const semi = text.indexOf(";", i);
        return semi === -1 ? null : { start: markerIndex, end: semi + 1 };
      }
    }
  }
  return null;
}
