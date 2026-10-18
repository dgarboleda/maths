import { spawnSync } from "node:child_process";

// Build de producción conectado exclusivamente al proyecto demo local.
const env = {
  ...process.env, E2E_PRODUCTION: "1", NEXT_PUBLIC_FIREBASE_EMULATORS: "1",
  NEXT_PUBLIC_FIREBASE_API_KEY: "demo-api-key",
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: "demo-numerario.firebaseapp.com",
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: "demo-numerario",
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: "demo-numerario.appspot.com",
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: "000000000000",
  NEXT_PUBLIC_FIREBASE_APP_ID: "1:000000000000:web:0000000000000000",
};
for (const args of [
  ["node_modules/next/dist/bin/next", "build"],
  ["node_modules/@playwright/test/cli.js", "test", "--config", "playwright.perf.config.ts"],
]) {
  const result = spawnSync(process.execPath, args, { env, stdio: "inherit" });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
