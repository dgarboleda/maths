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

/**
 * Fase 14 (docs/level-editor-plan.md §12.4): `NEXT_PUBLIC_LEVELS_V2` es una
 * variable de entorno leída una sola vez al arrancar `next dev` — no se
 * puede alternar por prueba dentro del mismo proceso de servidor. Un
 * segundo `next dev` en otro puerto, con el flag encendido, es la única
 * forma de correr `e2e/aventura-ciudad-central-v2.spec.ts` (la Ciudad
 * Central nueva) sin tocar el puerto/entorno por defecto — así el resto de
 * la suite (incluida `aventura.spec.ts`, que sigue probando `QuestScene.tsx`
 * con el flag apagado) no cambia una línea de comportamiento.
 */
const PORT_V2 = Number(process.env.E2E_PORT_V2 ?? 3211);
const baseURLV2 = `http://127.0.0.1:${PORT_V2}`;

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
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
      // `aventura-ciudad-central-v2.spec.ts` solo corre en el project de
      // abajo, contra el `next dev` con NEXT_PUBLIC_LEVELS_V2=1 — acá se
      // conectaría al puerto por defecto, con el flag apagado, y fallaría.
      testIgnore: /aventura-ciudad-central-v2\.spec\.ts/,
    },
    {
      // Un móvil pequeño: la app se usa sobre todo en tablet o teléfono.
      // `editor.spec.ts` y `editor-assets.spec.ts` quedan fuera: el Level
      // Editor (herramienta del padre-autor, no el juego) todavía no tiene
      // drawers para Toolbox/PropertyPanel por debajo de `lg` (quedan
      // `hidden` sin más, Fase 13, ver LevelEditorScreen.tsx) — sin esos
      // paneles no hay dónde subir un fondo ni ver "Fondo"/"Escena", así que
      // ambas suites asumen viewport de escritorio a propósito.
      name: "móvil",
      use: { ...devices["Pixel 7"] },
      testIgnore: /(accesibilidad|editor(-assets)?|aventura-ciudad-central-v2)\.spec\.ts/,
    },
    {
      // Ciudad Central sobre el motor nuevo (Fase 14) — único project que
      // habla con el segundo `next dev` (NEXT_PUBLIC_LEVELS_V2=1). Todo lo
      // demás sigue en los projects de arriba, sin este flag.
      name: "ciudad-central-v2",
      testMatch: /aventura-ciudad-central-v2\.spec\.ts/,
      use: { ...devices["Desktop Chrome"], baseURL: baseURLV2 },
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
    {
      // `NEXT_DIST_DIR` propio (next.config.ts): evita el lockfile de
      // "Another next dev server is already running" contra el de arriba.
      command: `npx next dev --port ${PORT_V2}`,
      url: baseURLV2,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: { ...emulatorEnv, NEXT_PUBLIC_LEVELS_V2: "1", NEXT_DIST_DIR: ".next-levels-v2" },
    },
  ],
});
