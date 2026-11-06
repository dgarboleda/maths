import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../functions");

function sources(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return sources(full);
    return /\.(ts|json)$/.test(entry.name) && !/\.test\.ts$/.test(entry.name) ? [full] : [];
  });
}

/** Huella del código que se despliega en Functions: fuentes (sin tests),
 *  dependencias y configuración de compilación. Independiente del commit, así
 *  un cambio solo de frontend no exige volver a desplegar Firebase, y no
 *  necesita historial de git (sirve en clones superficiales como Workers Builds). */
export function functionsFingerprint() {
  const files = [
    ...sources(path.join(root, "src")),
    ...["package.json", "package-lock.json", "tsconfig.json"].map((f) => path.join(root, f)),
  ]
    .map((file) => path.relative(root, file).split(path.sep).join("/"))
    .sort();
  const hash = createHash("sha256");
  for (const file of files) {
    hash.update(`${file}\0`);
    hash.update(readFileSync(path.join(root, file)));
    hash.update("\0");
  }
  return hash.digest("hex");
}
