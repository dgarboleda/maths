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
const READY_TIMEOUT_MS = 180_000;
const POLL_INTERVAL_MS = 500;

async function isUp(): Promise<boolean> {
  try {
    const res = await fetch(AUTH_URL);
    return res.status < 500;
  } catch {
    return false;
  }
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

  const child: ChildProcess = spawn(process.platform === "win32" ? "npm.cmd" : "npm", ["run", "emuladores"], {
    stdio: "inherit",
    // Grupo de proceso propio (POSIX): matar solo el árbol de los
    // emuladores al terminar, sin arrastrar al proceso de Vitest.
    detached: process.platform !== "win32",
  });

  await waitUntilUp(Date.now() + READY_TIMEOUT_MS);

  return async () => {
    if (child.exitCode !== null || child.signalCode !== null) return;
    if (process.platform === "win32" || !child.pid) {
      child.kill();
      return;
    }
    process.kill(-child.pid, "SIGTERM");
  };
}
