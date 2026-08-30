#!/usr/bin/env node
/*
 * Arranca los emuladores de Auth y Firestore del proyecto de pruebas.
 *
 * Si una ejecución anterior se cortó a lo bruto (Ctrl-C doble, un runner de
 * CI que mata el proceso), el .jar de Firestore puede sobrevivir al CLI y
 * quedarse con el puerto: el siguiente arranque falla con "port taken" y no
 * es evidente por qué. Antes de arrancar se busca exactamente ese proceso
 * huérfano —el del proyecto demo, no cualquier cosa escuchando en el 8080— y
 * se cierra.
 */
import { execFileSync, spawn } from "node:child_process";

const PROYECTO = "demo-numerario";

function cerrarEmuladorHuerfano() {
  if (process.platform === "win32") return;
  let salida = "";
  try {
    salida = execFileSync("ps", ["-eo", "pid,args"], { encoding: "utf8" });
  } catch {
    return; // sin `ps` no se puede comprobar; se sigue igualmente
  }
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
  process.platform === "win32" ? "npx.cmd" : "npx",
  ["firebase", "emulators:start", "--only", "auth,firestore", "--project", PROYECTO],
  { stdio: "inherit" },
);

for (const señal of ["SIGINT", "SIGTERM"]) {
  process.on(señal, () => hijo.kill(señal));
}
hijo.on("exit", (codigo, señal) => {
  process.exit(señal ? 1 : (codigo ?? 0));
});
