#!/usr/bin/env node
/**
 * Genera `functions/src/learning/lessonIndexData.ts`: el índice ligero de
 * las clases (sin bancos ni ejemplos) que usa el navegador para no cargar
 * el catálogo completo. `catalog.test.ts` falla si queda desfasado.
 *
 * Uso: npm run functions:build && npm run indice:lecciones
 */
import { createRequire } from "node:module";
import { writeFileSync } from "node:fs";

const require = createRequire(new URL("../functions/package.json", import.meta.url));
let catalog;
try {
  catalog = require("./lib/learning/catalog.js");
} catch {
  console.error("Falta compilar Functions: ejecuta `npm run functions:build` antes de generar el índice.");
  process.exit(1);
}
// Solo lo que muestra una clase de otra (título, unidad y bases): el índice
// viaja en el JS de cada clase.
const summaries = catalog.LESSONS.map(({ id, unitId, title, prerequisites }) => ({ id, unitId, title, prerequisites }));
const body = [
  "// Generado por scripts/indice-lecciones.mjs a partir del catálogo. No editar a mano.",
  'import type { LessonSummary } from "./types";',
  "",
  `export const LESSON_INDEX: readonly LessonSummary[] = ${JSON.stringify(summaries, null, 2)};`,
  "",
].join("\n");
const target = new URL("../functions/src/learning/lessonIndexData.ts", import.meta.url);
writeFileSync(target, body);
console.log(`Índice generado: ${summaries.length} clases.`);
