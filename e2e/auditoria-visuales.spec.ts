import { expect, test } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { LESSONS } from "../src/lib/learning/domain";
import { crearHijo, entrarAlEspacio, registrarPadre } from "./utilidades";

/**
 * Complemento de la auditoría móvil (`AUDITORIA=1`): captura el modelo
 * visual de cada clase y detecta fórmulas o pasos que obligan a desplazarse
 * en horizontal en un teléfono (texto que no cabe y queda oculto a la
 * derecha de una caja con scroll).
 */
test.skip(!process.env.AUDITORIA, "Auditoría manual: AUDITORIA=1");
test.use({ actionTimeout: 10_000 });

const OUT = join("informes", "auditoria-visuales");

test("visuales y fórmulas de todas las clases en móvil", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "móvil", "Solo en móvil");
  test.setTimeout(30 * 60_000);
  mkdirSync(OUT, { recursive: true });
  const report: Record<string, { screen: string; text: string; need: number; have: number }[]> = {};
  await registrarPadre(page);
  const profile = await crearHijo(page, { nombre: "Alex", nacimiento: "2011-03-02" });
  const childId = await entrarAlEspacio(page, profile.nombre, profile.pin);
  const scrollers = () =>
    page.evaluate(() =>
      [...document.querySelectorAll("main *")]
        .filter((el) => {
          const cs = getComputedStyle(el);
          return (cs.overflowX === "auto" || cs.overflowX === "scroll") && el.scrollWidth > el.clientWidth + 2;
        })
        .map((el) => ({ text: (el.textContent ?? "").trim().slice(0, 120), need: el.scrollWidth, have: el.clientWidth })),
    );
  for (const lesson of LESSONS) {
    const found: { screen: string; text: string; need: number; have: number }[] = [];
    await page.goto(`/jugar/${childId}/aprende/${lesson.id}`);
    await page.getByRole("button", { name: "Ir a la clase", exact: true }).click();
    for (let i = 0; i < lesson.sections.length; i++) {
      await expect(page.getByRole("heading", { name: lesson.sections[i].title })).toBeVisible();
      if (i === 0)
        await page.getByRole("region", { name: "Explora la idea" }).screenshot({ path: join(OUT, `${lesson.id}.png`) });
      found.push(...(await scrollers()).map((s) => ({ screen: `clase ${i + 1}`, ...s })));
      await page.getByRole("button", { name: i + 1 < lesson.sections.length ? "Continuar la explicación" : "Ver cómo se resuelve" }).click();
    }
    for (let i = 0; i < lesson.examples.length; i++) {
      await expect(page.getByText(`Ejemplo ${i + 1} de ${lesson.examples.length}`)).toBeVisible();
      found.push(...(await scrollers()).map((s) => ({ screen: `ejemplo ${i + 1}`, ...s })));
      await page.getByRole("button", { name: i + 1 < lesson.examples.length ? "Otro ejemplo razonado" : "Ahora, hazlo con ayuda" }).click();
    }
    report[lesson.id] = found;
    writeFileSync(join(OUT, "desplazamiento.json"), JSON.stringify(report, null, 1));
  }
});
