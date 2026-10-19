import { execFileSync } from "node:child_process";

const appURL = process.env.MATHS_APP_URL;
const project = process.env.FIREBASE_PROJECT_ID;
if (!appURL || !project || !/^https:\/\//.test(appURL) || !/^[a-z0-9-]+$/.test(project)) {
  throw new Error("Define MATHS_APP_URL (https) y FIREBASE_PROJECT_ID para verificar el despliegue.");
}
const release = process.env.MATHS_RELEASE || execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
const region = process.env.FIREBASE_FUNCTIONS_REGION || "us-central1";
for (const [name, url] of [
  ["maths", new URL("/api/health", appURL).href],
  ["maths-functions", `https://${region}-${project}.cloudfunctions.net/deploymentStatus`],
]) {
  const response = await fetch(url, { signal: AbortSignal.timeout(20_000), cache: "no-store" });
  if (!response.ok) throw new Error(`${name}: HTTP ${response.status}`);
  const status = await response.json();
  if (status.service !== name || status.protocol !== 8 || status.release !== release) {
    throw new Error(`${name}: versión incompatible o distinta del commit esperado.`);
  }
  console.log(`${name}: ${release}, protocolo 8 confirmado.`);
}
console.log("Frontend y Functions coinciden. Las reglas e índices se despliegan juntos con npm run deploy:all; estos endpoints no certifican su contenido.");
