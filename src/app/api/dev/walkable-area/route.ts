import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import type { Point, Polygon, WalkableArea } from "@/lib/world/navmesh";
import { formatArea, locateExportBlock } from "@/lib/world/walkableAreaCode";

/**
 * Guarda el `WalkableArea` editado en `WalkDebugOverlay` (herramienta de
 * dev, `?walkdebug=1`) directo en el archivo fuente — sin diálogo de
 * archivo: esta ruta corre en el servidor de `next dev`, que sí puede
 * tocar el disco sin las restricciones de seguridad de un navegador.
 *
 * Solo existe para desarrollo: esta app se despliega a Cloudflare Workers
 * (`opennextjs-cloudflare`), así que este código viaja igual dentro de ese
 * Worker aunque nunca se llame ahí — por eso el primer chequeo, antes de
 * tocar cualquier cosa, es que `NODE_ENV` sea "development" (siempre
 * "production" en cualquier build desplegado).
 *
 * `exportName` se resuelve contra este allowlist, nunca contra una ruta que
 * mande el cliente — evita que el body de la request pueda apuntar a
 * cualquier archivo del disco.
 */
const ALLOWED_EXPORTS: Record<string, string> = {
  CIUDAD_CENTRAL_WALKABLE: "src/lib/world/questScene.ts",
};

function isPolygon(value: unknown): value is Polygon {
  return (
    Array.isArray(value) &&
    value.length >= 3 &&
    value.every(
      (p): p is Point =>
        typeof p === "object" && p !== null && Number.isFinite((p as Point).x) && Number.isFinite((p as Point).y),
    )
  );
}

function isWalkableArea(value: unknown): value is WalkableArea {
  if (typeof value !== "object" || value === null) return false;
  const { boundary, holes } = value as WalkableArea;
  return isPolygon(boundary) && Array.isArray(holes) && holes.every(isPolygon);
}

export async function POST(request: Request) {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ ok: false, error: "Solo disponible en desarrollo (npm run dev)." }, { status: 404 });
  }

  let body: { exportName?: unknown; area?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "JSON inválido en el cuerpo de la petición." }, { status: 400 });
  }

  const { exportName, area } = body;
  if (typeof exportName !== "string" || !(exportName in ALLOWED_EXPORTS)) {
    return NextResponse.json({ ok: false, error: `Export desconocido: "${String(exportName)}".` }, { status: 400 });
  }
  if (!isWalkableArea(area)) {
    return NextResponse.json(
      { ok: false, error: "El polígono recibido no tiene una forma válida (contorno/huecos con al menos 3 puntos)." },
      { status: 400 },
    );
  }

  const relativePath = ALLOWED_EXPORTS[exportName];
  const filePath = path.join(process.cwd(), relativePath);

  let text: string;
  try {
    text = await readFile(filePath, "utf8");
  } catch {
    return NextResponse.json({ ok: false, error: `No pude leer ${relativePath}.` }, { status: 500 });
  }

  const block = locateExportBlock(text, exportName);
  if (!block) {
    return NextResponse.json(
      { ok: false, error: `No encontré "export const ${exportName}" en ${relativePath}.` },
      { status: 500 },
    );
  }

  // `formatArea` arma el literal con `\n` solo — si el archivo usa CRLF (lo
  // normal en un checkout de Windows), se respeta para no dejar el bloque
  // reemplazado con saltos de línea mezclados frente al resto del archivo.
  const eol = text.includes("\r\n") ? "\r\n" : "\n";
  const replacement = `export const ${exportName}: WalkableArea = ${formatArea(area)};`.replace(/\n/g, eol);
  const newText = text.slice(0, block.start) + replacement + text.slice(block.end);

  try {
    await writeFile(filePath, newText, "utf8");
  } catch {
    return NextResponse.json({ ok: false, error: `No pude escribir ${relativePath}.` }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
