// Comprueba, ANTES de publicar el Worker, que las Functions de producción
// ejecutan el mismo código de functions/ que esta revisión. El frontend nuevo
// necesita las Functions nuevas (p. ej. una clase nueva que el servidor no
// conoce responde 400 «La lección o la acción no es válida»).
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { functionsFingerprint } from "./functions-fingerprint.mjs";

if (existsSync(".env.local")) process.loadEnvFile(".env.local");

const project = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
if (!project || !/^[a-z0-9-]+$/.test(project)) {
  throw new Error("Define FIREBASE_PROJECT_ID (o NEXT_PUBLIC_FIREBASE_PROJECT_ID) para comprobar las Functions.");
}
const region = process.env.FIREBASE_FUNCTIONS_REGION || "us-central1";
const url = `https://${region}-${project}.cloudfunctions.net/deploymentStatus`;
const response = await fetch(url, { signal: AbortSignal.timeout(20_000), cache: "no-store" });
if (!response.ok) throw new Error(`deploymentStatus: HTTP ${response.status}`);
const status = await response.json();

const expected = functionsFingerprint();
let release;
try {
  release = process.env.MATHS_RELEASE || execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
} catch {
  release = undefined;
}

if (status.service !== "maths-functions" || status.protocol !== 14) {
  throw new Error("deploymentStatus: servicio o protocolo incompatible.");
}
// Despliegues anteriores a la huella solo anuncian el commit.
const matches = status.fingerprint ? status.fingerprint === expected : status.release === release;
if (!matches) {
  console.error(`Functions en producción: ${status.release} (huella ${status.fingerprint ?? "—"})`);
  console.error(`Esta revisión:           ${release ?? "?"} (huella ${expected})`);
  throw new Error(
    "Las Functions de producción no tienen el código de functions/ de esta revisión. " +
      "Despliega primero Firebase (workflow «Despliegue a producción», parte = firebase) y vuelve a intentarlo.",
  );
}
console.log(`Functions al día: ${status.release} (huella ${expected.slice(0, 12)}).`);
