import { execFileSync, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";

if (existsSync(".env.local")) process.loadEnvFile(".env.local");

const project = process.env.FIREBASE_PROJECT_ID;
if (!project || !process.env.MATHS_APP_URL) throw new Error("Define FIREBASE_PROJECT_ID y MATHS_APP_URL antes de desplegar.");
const required = ["API_KEY", "AUTH_DOMAIN", "PROJECT_ID", "STORAGE_BUCKET", "MESSAGING_SENDER_ID", "APP_ID"];
if (required.some((key) => !process.env[`NEXT_PUBLIC_FIREBASE_${key}`])
  || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID !== project
  || project.startsWith("demo-") || process.env.NEXT_PUBLIC_FIREBASE_EMULATORS === "1") {
  throw new Error("Completa las seis variables de build de Firebase para el proyecto real y desactiva los emuladores.");
}
const release = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
if (execFileSync("git", ["status", "--porcelain"], { encoding: "utf8" }).trim()) throw new Error("Confirma los cambios en Git antes de desplegar una versión identificable.");
const npm = process.platform === "win32" ? "npm.cmd" : "npm";
const env = { ...process.env, MATHS_RELEASE: release };
function run(command, args) {
  const result = spawnSync(command, args, { env, stdio: "inherit" });
  if (result.status !== 0) throw new Error(`Falló ${command} ${args.join(" ")}`);
}
// Construir ambas partes antes de modificar los recursos externos.
run(npm, ["run", "lint"]);
run(npm, ["run", "typecheck"]);
run(npm, ["run", "test"]);
run(npm, ["run", "audit:security"]);
run(npm, ["run", "functions:build"]);
run(npm, ["run", "build"]);
run(process.execPath, ["node_modules/firebase-tools/lib/bin/firebase.js", "deploy", "--only", "functions,firestore:rules,firestore:indexes,storage", "--project", project]);
run(process.execPath, ["node_modules/@opennextjs/cloudflare/dist/cli/index.js", "deploy"]);
run(npm, ["run", "verify:deployment"]);
