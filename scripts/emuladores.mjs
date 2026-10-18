#!/usr/bin/env node
/*
 * Arranca los emuladores de Auth, Firestore, Storage y Functions del proyecto de
 * pruebas (docs/asset-management-plan.md §G Paso 1).
 *
 * Si una ejecución anterior se cortó a lo bruto (Ctrl-C doble, un runner de
 * CI que mata el proceso), el .jar de Firestore puede sobrevivir al CLI y
 * quedarse con el puerto: el siguiente arranque falla con "port taken" y no
 * es evidente por qué. Antes de arrancar se busca exactamente ese proceso
 * huérfano —el del proyecto demo, no cualquier cosa escuchando en el 8080— y
 * se cierra.
 */
import { execFileSync, spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const PROYECTO = "demo-numerario";

// Functions debe existir también en una copia recién clonada, no solo en CI.
execFileSync(process.platform === "win32" ? "npm.cmd" : "npm", ["--prefix", "functions", "run", "build"], { stdio: "inherit" });

function cerrarEmuladorHuerfano() {
  if (process.platform === "win32") return;
  let salida = "";
  try {
    salida = execFileSync("ps", ["-eo", "pid,args"], { encoding: "utf8" });
  } catch {
    return; // sin `ps` no se puede comprobar; se sigue igualmente
  }
  // Un CLI vivo administra sus procesos: no confundirlo con un huérfano.
  if (salida.split("\n").some((linea) => linea.includes("firebase-tools/lib/bin/firebase.js emulators:start") && linea.includes(`--project ${PROYECTO}`))) return;
  for (const linea of salida.split("\n")) {
    if (!linea.includes("cloud-firestore-emulator")) continue;
    if (!linea.includes(`--project_id ${PROYECTO}`)) continue;
    const pid = Number(linea.trim().split(/\s+/)[0]);
    if (!Number.isInteger(pid) || pid === process.pid) continue;
    try {
      process.kill(pid, "SIGKILL");
      console.log(`Se cerró un emulador de Firestore huérfano (pid ${pid}).`);
    } catch {
      // Ya no existe o no hay permisos: que lo diga el propio arranque.
    }
  }
}

cerrarEmuladorHuerfano();

const hijo = spawn(
  process.execPath,
  [fileURLToPath(new URL("../node_modules/firebase-tools/lib/bin/firebase.js", import.meta.url)), "emulators:start", "--only", "auth,firestore,storage,functions", "--project", PROYECTO],
  { stdio: "inherit" },
);

for (const señal of ["SIGINT", "SIGTERM"]) {
  process.on(señal, () => hijo.kill(señal));
}
hijo.on("exit", (codigo, señal) => {
  process.exit(señal ? 1 : (codigo ?? 0));
});
