import { defineConfig } from "vitest/config";

/**
 * Suite de integración — pruebas que hablan con los emuladores REALES de
 * Firebase (Auth/Firestore/Storage, reglas de seguridad incluidas) pero sin
 * abrir un navegador: llaman a `levelRepository`/`assetRepository` directo,
 * igual que antes hacían `e2e/editor-persistencia.spec.ts` y el describe
 * "persistencia" de `e2e/editor-assets.spec.ts` sobre Playwright (sin
 * `page`, solo porque no había otro runner). Corren aparte de
 * `vitest.config.mts` (los tests de lógica pura/componente, sin red) porque
 * necesitan los emuladores arriba — ver `globalSetupEmulators.ts` — y de
 * `playwright.config.ts` (los recorridos núcleo de verdad, con navegador).
 *
 * `environment: "node"`: nada de esto renderiza React ni toca el DOM.
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": new URL("./src", import.meta.url).pathname,
    },
  },
  test: {
    environment: "node",
    include: ["src/test/integration/**/*.test.ts"],
    globalSetup: ["./src/test/integration/globalSetupEmulators.ts"],
    // Los emuladores tardan en arrancar, y cada prueba crea su propia
    // cuenta de padre contra Auth real — más margen que el default de 5s.
    testTimeout: 20_000,
    hookTimeout: 200_000,
  },
});
