import { spawn, type ChildProcess } from "node:child_process";

/**
 * Arranca los emuladores de Firebase (auth/firestore/storage) para la suite
 * de integración (`vitest.integration.config.mts`) — mismo criterio que el
 * `webServer` de `playwright.config.ts`: si ya están arriba (`npm run
 * emuladores` corriendo aparte, o reutilizados entre corridas locales) no se
 * arranca un segundo proceso, y sea cual sea el caso, las pruebas no
 * empiezan hasta que respondan de verdad.
 */
const AUTH_URL = "http://127.0.0.1:9099/";
const FUNCTIONS_URL = "http://127.0.0.1:5001/demo-numerario/us-central1/deploymentStatus";
const READY_TIMEOUT_MS = 180_000;
const POLL_INTERVAL_MS = 500;

async function isUp(): Promise<boolean> {
  try {
    const [auth, functions] = await Promise.all([
      fetch(AUTH_URL),
      fetch(FUNCTIONS_URL),
    ]);
    return auth.ok && functions.ok;
  } catch {
    return false;
  }
}

async function isAuthUp(): Promise<boolean> {
  try { return (await fetch(AUTH_URL)).ok; } catch { return false; }
}

async function waitUntilUp(deadline: number): Promise<void> {
  while (Date.now() < deadline) {
    if (await isUp()) return;
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }
  throw new Error(`Los emuladores de Firebase no respondieron en ${AUTH_URL} tras ${READY_TIMEOUT_MS}ms.`);
}

export default async function setup(): Promise<() => Promise<void>> {
  if (await isUp()) {
    return async () => {};
  }
  // Una recarga de Functions puede tardar unos segundos. No arrancar otro
  // conjunto de emuladores ni cerrar el Firestore que ya está en uso.
  if (await isAuthUp()) {
    await waitUntilUp(Date.now() + READY_TIMEOUT_MS);
    return async () => {};
  }

  const child: ChildProcess = spawn(process.platform === "win32" ? "npm.cmd" : "npm", ["run", "emuladores"], {
    stdio: "inherit",
    // Grupo de proceso propio (POSIX): matar solo el árbol de los
    // emuladores al terminar, sin arrastrar al proceso de Vitest.
    detached: process.platform !== "win32",
  });

  const stop = async () => {
    if (child.exitCode !== null || child.signalCode !== null) return;
    if (process.platform === "win32" || !child.pid) {
      child.kill();
      return;
    }
    process.kill(-child.pid, "SIGTERM");
  };
  try {
    await waitUntilUp(Date.now() + READY_TIMEOUT_MS);
  } catch (error) {
    await stop();
    throw error;
  }
  return stop;
}
