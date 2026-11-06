import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { functionsFingerprint } from "./functions-fingerprint.mjs";

const release = process.env.MATHS_RELEASE || execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
writeFileSync(
  new URL("../functions/lib/release.json", import.meta.url),
  JSON.stringify({ release, fingerprint: functionsFingerprint() }),
);
