import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

/**
 * Tests unitarios/de componente — complemento de `playwright.config.ts`
 * (e2e/), no un reemplazo. Ver README §"Pirámide de pruebas": acá viven
 * la lógica pura que antes vivía en `e2e/unidad-*.spec.ts` (sin `page`,
 * corría en Playwright solo porque no había otro runner) y los tests de
 * componente/accesibilidad (`*.test.tsx`, React Testing Library + jest-axe)
 * que reemplazan a los antiguos escaneos de axe y a los detalles de UI que
 * no necesitan un navegador ni los emuladores de Firebase de verdad — esos
 * siguen en `e2e/`, reducidos a los recorridos núcleo.
 *
 * `environment: "jsdom"` para todo el proyecto (no solo los `.tsx`): un DOM
 * de más no le cuesta nada a un test de lógica pura, y mantener un solo
 * entorno evita la complejidad de separar en "projects" por extensión.
 */
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": new URL("./src", import.meta.url).pathname,
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    // La suite de integración (vitest.integration.config.mts) vive bajo
    // src/test/integration/ y corre aparte: necesita los emuladores de
    // Firebase arriba, esta config no los arranca.
    exclude: ["**/node_modules/**", "src/test/integration/**"],
    css: false,
  },
});
