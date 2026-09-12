import { expect, test } from "@playwright/test";
import { idDeHijo, otorgarDominio, sesionDeHijo } from "./utilidades";

/**
 * Fase 34 (docs/plan-jugabilidad.md §8) — "el boss ES el guardián". La
 * lógica de vidas/derrota/victoria ya está probada a fondo en
 * MultiModuleChallenge.test.tsx (fixtures con `inputType: "integer"`
 * controlado); acá se confirma lo que el componente aislado no puede: que
 * las páginas reales cablean el guardián correcto con datos de Firestore
 * de verdad — Khaos (`world.story.antagonistName`) en el boss general, el
 * guardián de zona en el evento de un hilo.
 */
test.describe("El boss es el guardián", () => {
  test("el boss general muestra a Khaos y el indicador de vidas", async ({ page }) => {
    await sesionDeHijo(page);
    const childId = idDeHijo(page);

    await page.goto(`/jugar/${childId}/boss`);
    await expect(page.getByText("Khaos")).toBeVisible();
    await expect(page.getByRole("status", { name: "3 de 3 vidas" })).toBeVisible();
  });

  test("el evento de zona muestra al guardián de ese hilo", async ({ page }) => {
    const { correo } = await sesionDeHijo(page);
    const childId = idDeHijo(page);
    // pickModules (evento/page.tsx) exige 2 módulos desbloqueados del hilo:
    // con progreso en blanco, aritmética solo tiene aritmetica-d1 (sin
    // prerrequisitos) — dominarlo desbloquea aritmetica-d2 también.
    await otorgarDominio(correo, childId, ["aritmetica-d1"]);

    await page.goto(`/jugar/${childId}/aritmetica/evento`);
    await expect(page.getByText("El Apagador")).toBeVisible();
    await expect(page.getByRole("status", { name: "3 de 3 vidas" })).toBeVisible();
  });
});
