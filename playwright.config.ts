import { defineConfig, devices } from "@playwright/test";

/*
 * Las pruebas E2E corren contra la app real hablando con el emulador de
 * Firebase (auth + firestore), nunca contra un proyecto de verdad: el
 * `projectId` es `demo-numerario`, que Firebase reserva para uso local.
 *
 * Playwright levanta los dos servicios por su cuenta (emulador y `next dev`)
 * y los reutiliza si ya están arriba, así que basta con `npm run e2e`.
 *
 * Reducida a los recorridos núcleo (ver README §Pruebas): acceso, jugar y
 * evaluación. La lógica pura, los tests de integración contra Firestore/
 * Storage sin navegador, y los detalles de UI/accesibilidad viven ahora en
 * `src/test/` (Vitest — `npm run test` / `npm run test:integration`), no
 * acá. Ya no hace falta un segundo `next dev` con NEXT_PUBLIC_LEVELS_V2=1
 * (era solo para `aventura-ciudad-central-v2.spec.ts`, retirado) ni
 * `testIgnore` por proyecto (era solo para el Level Editor, retirado de
 * e2e/): los 4 archivos que quedan corren igual en escritorio y en móvil.
 */
const PORT = Number(process.env.E2E_PORT ?? 3210);
const baseURL = `http://127.0.0.1:${PORT}`;

/** En entornos con un Chromium ya instalado fuera de Playwright. */
const chromiumPath = process.env.PLAYWRIGHT_CHROMIUM_PATH;

const emulatorEnv = {
  NEXT_PUBLIC_FIREBASE_EMULATORS: "1",
  NEXT_PUBLIC_FIREBASE_API_KEY: "demo-api-key",
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: "demo-numerario.firebaseapp.com",
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: "demo-numerario",
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: "demo-numerario.appspot.com",
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: "000000000000",
  NEXT_PUBLIC_FIREBASE_APP_ID: "1:000000000000:web:0000000000000000",
};

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  // `next dev` compila cada ruta la primera vez que se visita.
  timeout: 120_000,
  expect: { timeout: 10_000 },
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  // En CI, `--shard` (ver .github/workflows/ci.yml) ya reparte los archivos
  // entre varios runners — 2 workers por shard alcanza sin pelearse por
  // CPU con el resto. En local, todos los núcleos disponibles.
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI
    ? [["github"], ["blob", { outputDir: "blob-report" }]]
    : [["list"], ["html", { open: "never" }]],
  use: {
    baseURL,
    locale: "es-ES",
    timezoneId: "America/Mexico_City",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    ...(chromiumPath ? { launchOptions: { executablePath: chromiumPath } } : {}),
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    // Un móvil pequeño: la app se usa sobre todo en tablet o teléfono.
    { name: "móvil", use: { ...devices["Pixel 7"] } },
  ],
  webServer: [
    {
      command: "npm run emuladores",
      url: "http://127.0.0.1:9099/",
      reuseExistingServer: true,
      timeout: 180_000,
      stdout: "ignore",
      stderr: "pipe",
    },
    {
      command: `npx next dev --port ${PORT}`,
      url: baseURL,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: emulatorEnv,
    },
  ],
});
