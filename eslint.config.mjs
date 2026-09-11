import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Generados por OpenNext/Wrangler al construir o desplegar en Cloudflare:
    ".open-next/**",
    ".wrangler/**",
    "cloudflare-env.d.ts",
    // Cloud Functions (functions/) es un paquete npm aparte, con su propio
    // tsconfig y ciclo de build ("functions/lib" es su salida compilada) —
    // no forma parte del proyecto de Next.js que lintea esta configuración.
    "functions/**",
  ]),
  // Aislamiento EDITOR ↔ RUNTIME del Level Editor (docs/level-editor-plan.md
  // §11.2/§18.2): el editor modifica datos, el runtime los interpreta, y el
  // Play Test (Fase 11) depende de que sean dos árboles de componentes
  // realmente separados — el runtime nunca sabe si corre dentro de una
  // sesión de prueba o del juego real. Estructural, no solo de convención.
  {
    files: ["src/components/level/runtime/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/components/level/editor/*", "@/components/level/editor/**", "../editor/*", "../editor/**", "../../editor/*", "../../editor/**"],
              message: "src/components/level/runtime/** no puede importar de src/components/level/editor/** (ver docs/level-editor-plan.md §11.2).",
            },
          ],
        },
      ],
    },
  },
]);

export default eslintConfig;
