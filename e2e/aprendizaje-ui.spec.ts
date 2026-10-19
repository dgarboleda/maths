import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { crearHijo, entrarAlEspacio, registrarPadre } from "./utilidades";

async function accessible(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  const audit = await new AxeBuilder({ page }).include("main").analyze();
  expect(audit.violations).toEqual([]);
}

test("la portada orienta, las unidades abren sus clases y se puede retomar el avance", async ({
  page,
}, testInfo) => {
  test.setTimeout(180_000);
  if (testInfo.project.name === "móvil") {
    await page.setViewportSize({ width: 320, height: 740 });
  }
  await registrarPadre(page);
  const profile = await crearHijo(page, {
    nombre: "Alex",
    nacimiento: "2012-06-12",
  });
  const childId = await entrarAlEspacio(page, profile.nombre, profile.pin);
  const base = `/jugar/${childId}`;

  await expect(
    page.getByRole("progressbar", { name: "Clases terminadas", exact: true }),
  ).toHaveAttribute("value", "0");
  await expect(
    page
      .getByRole("navigation", { name: "Tu espacio" })
      .getByRole("link", { name: "Inicio", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  await accessible(page);
  const homeScreenshot = testInfo.outputPath("portada.png");
  await page.screenshot({ path: homeScreenshot, fullPage: true });
  await testInfo.attach("portada", {
    path: homeScreenshot,
    contentType: "image/png",
  });

  await page.locator(`a[href="${base}/aprende#unit-algebra"]`).click();
  await expect(
    page.getByRole("heading", { name: "Álgebra para resolver situaciones" }),
  ).toBeInViewport();
  await expect(page.locator(`a[href^="${base}/aprende/"]`)).toHaveCount(12);
  await accessible(page);
  if (testInfo.project.name === "móvil") {
    const lastLesson = page.locator(`a[href^="${base}/aprende/"]`).last();
    await lastLesson.focus();
    await expect
      .poll(async () => {
        const lessonBox = await lastLesson.boundingBox();
        const navigationBox = await page
          .getByRole("navigation", { name: "Tu espacio" })
          .boundingBox();
        return Boolean(
          lessonBox &&
          navigationBox &&
          lessonBox.y + lessonBox.height <= navigationBox.y,
        );
      })
      .toBe(true);
  }

  await page
    .getByRole("navigation", { name: "Tu espacio" })
    .getByRole("link", { name: "Practicar", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Practicar y ganar confianza" }),
  ).toBeVisible();
  await expect(page.getByText(/Siete minijuegos se alternan/)).toBeVisible();
  await expect(
    page.locator(`a[href^="${base}/aprende/"][href$="?modo=practice"]`),
  ).toHaveCount(12);
  await accessible(page);

  await page.getByRole("link", { name: "Inicio", exact: true }).click();
  await page.getByRole("link", { name: "Comenzar mi primera clase" }).click();
  await page
    .getByRole("button", { name: "Ir a la clase", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Clase", exact: true }),
  ).toHaveAttribute("aria-current", "step");
  await accessible(page);
  const lessonScreenshot = testInfo.outputPath("clase.png");
  await page.screenshot({ path: lessonScreenshot, fullPage: true });
  await testInfo.attach("clase", {
    path: lessonScreenshot,
    contentType: "image/png",
  });

  await page.getByRole("link", { name: "Inicio", exact: true }).click();
  await expect(
    page.getByRole("link", { name: "Continuar aprendiendo" }),
  ).toBeVisible();
  await expect(page.getByText(/Retoma: Clase/)).toBeVisible();
  // Empezar o consultar la clase no acredita una clase terminada.
  await expect(
    page.getByRole("progressbar", { name: "Clases terminadas", exact: true }),
  ).toHaveAttribute("value", "0");
  await page.reload();
  await page.getByRole("link", { name: "Continuar aprendiendo" }).click();
  await expect(
    page.getByRole("button", { name: "Clase", exact: true }),
  ).toHaveAttribute("aria-current", "step");
});
