import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { crearHijo, entrarAlEspacio, registrarPadre } from "./utilidades";

test("el foco explica el primer valor absoluto, recuerda la consulta y guarda la ayuda de comprobación", async ({ page }, testInfo) => {
  test.setTimeout(180_000);
  await registrarPadre(page);
  const profile = await crearHijo(page, { nombre: "Alex", nacimiento: "2012-06-12" });
  const childId = await entrarAlEspacio(page, profile.nombre, profile.pin);
  await page.goto(`/jugar/${childId}/aprende/enteros-recta`);
  await page.getByRole("button", { name: "Ir a la clase", exact: true }).click();
  const next = page.getByRole("button", { name: "Continuar la explicación", exact: true });
  await next.click();
  await expect(page.getByRole("heading", { name: "Más a la derecha, mayor" })).toBeVisible();
  await next.click();
  await expect(page.getByRole("heading", { name: "Distancia y valor absoluto" })).toBeVisible();
  const trigger = page.getByRole("button", { name: "Entender esta pantalla", exact: true });
  const novel = page.getByRole("button", { name: /Qué significa \|x\|/ });
  await expect(novel).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("foco-flotante.png"), fullPage: false });
  if (testInfo.project.name === "móvil") {
    const bulb = await trigger.boundingBox();
    const nav = await page.getByRole("navigation", { name: "Tu espacio" }).boundingBox();
    expect(bulb!.y + bulb!.height).toBeLessThan(nav!.y);
    expect(bulb!.x).toBeLessThan(32);
  }
  await novel.click();
  const dialog = page.getByRole("dialog", { name: "Una idea, paso a paso" });
  await expect(dialog.getByText(/Las dos barras se leen/)).toBeVisible();
  await expect(dialog.getByText(/\|−4\| = 4 y \|4\| = 4/)).toBeVisible();
  const consulted = await page.evaluate((id) => JSON.parse(localStorage.getItem(`maths:help:v1:${id}`) ?? "[]"), childId);
  expect(consulted).toContain("absolute");
  expect(consulted).not.toContain("negative"); // La segunda definición sigue cerrada.
  expect((await new AxeBuilder({ page }).include('[role="dialog"]').analyze()).violations).toEqual([]);
  await page.screenshot({ path: testInfo.outputPath("foco-valor-absoluto.png"), fullPage: true });
  await page.keyboard.press("Escape");
  await expect(trigger).toBeFocused();
  await expect(novel).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole("heading", { name: "Distancia y valor absoluto" })).toBeVisible();
  await expect(novel).toHaveCount(0);
  await page.getByRole("button", { name: /Comprueba lo que sé/ }).click();
  await expect(page.getByRole("heading", { name: "Comprueba", exact: true })).toBeVisible();
  const hint = page.waitForResponse((response) => response.url().endsWith("/recordLearningAction") &&
    response.request().postDataJSON()?.data?.action?.kind === "hint");
  await trigger.click();
  const saved = (await (await hint).json()).result.progress;
  const evidence = Object.values(saved.responses) as { hintsUsed: number; attempts: number }[];
  expect(evidence.some((entry) => entry.hintsUsed === 1 && entry.attempts === 0)).toBe(true);
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByText("Esta consulta cuenta como ayuda en la comprobación. Puedes seguir aprendiendo a tu ritmo.")).toBeVisible();
  await page.getByRole("button", { name: "Entendido, seguir" }).click();
  let repeated = 0;
  page.on("request", (request) => {
    if (request.url().endsWith("/recordLearningAction") && request.postDataJSON()?.data?.action?.kind === "hint") repeated++;
  });
  await trigger.click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByText("Esta consulta cuenta como ayuda en la comprobación. Puedes seguir aprendiendo a tu ritmo.")).toHaveCount(0);
  expect(repeated).toBe(0);
});
