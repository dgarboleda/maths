#!/usr/bin/env node
/**
 * Análisis de preguntas a partir de `learningEvidence` (todas las familias).
 * Solo produce agregados: ningún nombre, correo ni identificador de perfil
 * sale en el informe.
 *
 * Uso:
 *   npm run functions:build
 *   FIREBASE_PROJECT_ID=<proyecto> npm run analisis:items -- [--desde 2026-10-01] [--salida informes] [--minimo 10]
 *     [--calibracion informes/calibrationData.ts] [--minimo-calibracion 30]
 * Credenciales: Application Default Credentials (`gcloud auth application-default login`)
 * o FIRESTORE_EMULATOR_HOST para el emulador.
 */
import { createRequire } from "node:module";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const require = createRequire(new URL("../functions/package.json", import.meta.url));
const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
let catalog, analysis;
try {
  catalog = require("./lib/learning/catalog.js");
  analysis = require("./lib/learning/itemAnalysis.js");
} catch {
  console.error("Falta compilar Functions: ejecuta `npm run functions:build` antes del análisis.");
  process.exit(1);
}

const args = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : fallback;
};
const since = arg("desde") ? Date.parse(`${arg("desde")}T00:00:00Z`) : 0;
const outDir = arg("salida", "informes");
const minResponses = Number(arg("minimo", "10"));
const projectId = process.env.FIREBASE_PROJECT_ID ?? process.env.GCLOUD_PROJECT;
if (!projectId) {
  console.error("Define FIREBASE_PROJECT_ID.");
  process.exit(1);
}

initializeApp({ projectId });
const snap = await getFirestore().collectionGroup("learningEvidence").get();
const events = [];
const profiles = new Set();
for (const doc of snap.docs) {
  const data = doc.data();
  const at = data.createdAt?.toMillis?.() ?? 0;
  if (at < since || !data.lessonId || !data.action) continue;
  // parents/{p}/children/{c}/learningEvidence/{op}: el perfil solo separa intentos.
  const profile = doc.ref.parent.parent?.path ?? "?";
  profiles.add(profile);
  events.push({ profile, lessonId: data.lessonId, action: data.action, outcome: data.outcome, at });
}
const items = analysis.analyzeItems(events, catalog.getLesson, { minResponses });
const stamp = new Date().toISOString().slice(0, 10);
mkdirSync(outDir, { recursive: true });
const md = join(outDir, `analisis-items-${stamp}.md`);
const csv = join(outDir, `analisis-items-${stamp}.csv`);
writeFileSync(md, analysis.itemReportMarkdown(items, profiles.size, stamp));
writeFileSync(csv, analysis.itemReportCsv(items));
const flagged = items.filter((i) => i.flags.length).length;
console.log(`${events.length} eventos de ${profiles.size} perfiles · ${items.length} preguntas · ${flagged} con alertas.`);
console.log(`Informe: ${md}\nDatos: ${csv}`);
const calibrationPath = arg("calibracion");
if (calibrationPath) {
  const data = analysis.calibrationData(items, Number(arg("minimo-calibracion", "30")), stamp);
  writeFileSync(calibrationPath, analysis.calibrationModule(data));
  console.log(`Calibración: ${Object.keys(data.items).length} preguntas con datos suficientes → ${calibrationPath}`);
}
