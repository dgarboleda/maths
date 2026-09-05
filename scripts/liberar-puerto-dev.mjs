#!/usr/bin/env node
/*
 * Antes de cada `next dev`: mata cualquier proceso que ya esté escuchando en
 * el puerto de desarrollo.
 *
 * En Windows, Ctrl+C sobre `npm run dev` no siempre mata el proceso real del
 * servidor de Turbopack — a veces sobrevive huérfano reteniendo el puerto.
 * El siguiente `next dev` entonces detecta ese lock y se limita a decir "ya
 * hay un servidor corriendo" en vez de arrancar uno nuevo, así que se sigue
 * sirviendo la compilación vieja (con variables de entorno desactualizadas,
 * p. ej. si `.env` cambió) sin ningún aviso claro. Encontrar y matar ese
 * proceso por PID antes de arrancar evita depender de que Ctrl+C haya
 * funcionado.
 */
import { execSync } from "node:child_process";

const PUERTO = process.env.PORT ?? "3000";

function pidsEnPuertoWindows(puerto) {
  let salida = "";
  try {
    salida = execSync(`netstat -ano -p tcp`, { encoding: "utf8" });
  } catch {
    return [];
  }
  const pids = new Set();
  for (const linea of salida.split("\n")) {
    if (!linea.includes("LISTENING")) continue;
    const columnas = linea.trim().split(/\s+/);
    const local = columnas[1];
    const pid = columnas[columnas.length - 1];
    if (local?.endsWith(`:${puerto}`) && /^\d+$/.test(pid)) pids.add(pid);
  }
  return [...pids];
}

function pidsEnPuertoPosix(puerto) {
  try {
    const salida = execSync(`lsof -ti:${puerto} -sTCP:LISTEN`, { encoding: "utf8" });
    return salida.split("\n").map((l) => l.trim()).filter(Boolean);
  } catch {
    return [];
  }
}

const pids = process.platform === "win32" ? pidsEnPuertoWindows(PUERTO) : pidsEnPuertoPosix(PUERTO);

for (const pid of pids) {
  try {
    if (process.platform === "win32") {
      execSync(`taskkill /PID ${pid} /F`, { stdio: "ignore" });
    } else {
      process.kill(Number(pid), "SIGKILL");
    }
    console.log(`Se liberó el puerto ${PUERTO} (pid ${pid}).`);
  } catch {
    // Ya no existe o no hay permisos: seguir igual, que lo diga next dev si sigue ocupado.
  }
}
