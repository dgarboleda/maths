import { defineConfig, devices } from "@playwright/test";

/*
 * Las pruebas E2E corren contra la app real hablando con los emuladores de
 * Firebase (auth + firestore), nunca contra un proyecto de verdad: el
 * `projectId` es `demo-numerario`, que Firebase reserva para uso local.
 *
 * Playwright levanta los dos servicios por su cuenta (emuladores y `next
 * dev`) y los reutiliza si ya están arriba, así que basta con `npm run e2e`.
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
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI
    ? [["github"], ["html", { open: "never" }]]
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
    {
      // Un móvil pequeño: la app se usa sobre todo en tablet o teléfono.
      // `editor.spec.ts` queda fuera: el Level Editor (herramienta del
      // padre-autor, no el juego) todavía no tiene drawers para Toolbox/
      // PropertyPanel por debajo de `lg` (quedan `hidden` sin más, Fase 13),
      // así que sus pruebas asumen viewport de escritorio a propósito.
      name: "móvil",
      use: { ...devices["Pixel 7"] },
      testIgnore: /(accesibilidad|editor)\.spec\.ts/,
    },
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
