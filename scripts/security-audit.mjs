import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";

mkdirSync("security-reports", { recursive: true });
const npm = process.platform === "win32" ? "npm.cmd" : "npm";
let failed = false;
for (const [name, prefix] of [["frontend", []], ["functions", ["--prefix", "functions"]]]) {
  // Informe completo para revisar también herramientas de desarrollo.
  const full = spawnSync(npm, [...prefix, "audit", "--json"], { encoding: "utf8" });
  writeFileSync(`security-reports/${name}.json`, full.stdout || "{}");
  let report;
  try { report = JSON.parse(full.stdout); } catch { failed = true; continue; }
  if (report.error || full.status === null || full.status > 1) { console.error(`No se pudo auditar ${name}.`); failed = true; continue; }
  console.log(`${name}:`, report.metadata?.vulnerabilities);
  const runtime = spawnSync(npm, [...prefix, "audit", "--omit=dev", "--audit-level=high"], { stdio: "inherit" });
  if (runtime.status !== 0) failed = true;
}
if (failed) process.exitCode = 1;
