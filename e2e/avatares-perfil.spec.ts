import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { registrarPadre, entrarAlEspacio } from "./utilidades";

test("elige los tres personajes al crear perfiles, conserva el avatar y lo comparte con el dispositivo del hijo", async ({ page, browser }, testInfo) => {
  test.setTimeout(180_000);
  await registrarPadre(page);
  const choices = [
    { label: "Ánimo", id: "maths-animo", name: "Álex", src: "/avatars/animo.jpg" },
    { label: "Sonrisa", id: "maths-sonrisa", name: "Leo", src: "/avatars/sonrisa.jpg" },
    { label: "Saludo", id: "maths-saludo", name: "Noa", src: "/avatars/saludo.jpg" },
  ];
  for (const choice of choices) {
    await page.getByRole("button", { name: "Agregar hijo" }).click();
    const form = page.locator("form").filter({ has: page.getByRole("heading", { name: "Nuevo perfil" }) });
    await form.getByRole("radio", { name: choice.label, exact: true }).check();
    await expect(form.getByRole("radio", { name: choice.label, exact: true })).toBeChecked();
    await form.getByLabel("Nombre", { exact: true }).fill(choice.name);
    await form.getByLabel("Fecha de nacimiento").fill("2012-06-12");
    await form.getByLabel("PIN (4 dígitos)").fill("1234");
    await form.getByLabel("Confirmar PIN").fill("1234");
    if (choice.name === "Noa") {
      expect((await new AxeBuilder({ page }).include("form").analyze()).violations).toEqual([]);
      await form.screenshot({ path: testInfo.outputPath("seleccion-avatar.png") });
    }
    await form.getByRole("button", { name: "Guardar", exact: true }).click();
    const card = page.getByRole("button", { name: `Entrar al perfil de ${choice.name}`, exact: true });
    await expect(card.getByRole("img", { name: choice.name, exact: true })).toHaveAttribute("src", choice.src);
  }
  await page.reload();
  for (const choice of choices) {
    const image = page.getByRole("button", { name: `Entrar al perfil de ${choice.name}`, exact: true }).getByRole("img", { name: choice.name, exact: true });
    await expect(image).toHaveAttribute("src", choice.src);
    await expect.poll(() => image.evaluate((element) => (element as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  }
  await page.screenshot({ path: testInfo.outputPath("perfiles-con-personajes.png"), fullPage: true });
  await entrarAlEspacio(page, "Noa", "1234");
  await expect(page.getByRole("img", { name: "Avatar de Noa" })).toHaveAttribute("src", "/avatars/saludo.jpg");
  await page.goto("/panel/ajustes");
  const row = page.getByRole("listitem").filter({ has: page.getByText("Noa", { exact: true }) });
  await row.getByRole("button", { name: "Avatar", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Avatar de Noa" });
  await dialog.getByRole("radio", { name: "Sonrisa", exact: true }).check();
  await expect(dialog).toBeHidden();
  await expect(row.getByRole("img", { name: "Noa", exact: true })).toHaveAttribute("src", "/avatars/sonrisa.jpg");
  const link = await page.getByRole("textbox", { name: "Enlace para entrar desde otro dispositivo" }).inputValue();
  const mobile = testInfo.project.name === "móvil";
  const context = await browser.newContext({ viewport: page.viewportSize(), isMobile: mobile, hasTouch: mobile });
  try {
    const child = await context.newPage();
    await child.goto(link);
    const card = child.getByRole("button", { name: "Entrar al perfil de Noa", exact: true });
    await expect(card.getByRole("img", { name: "Noa", exact: true })).toHaveAttribute("src", "/avatars/sonrisa.jpg");
    await card.click();
    await expect(child.getByRole("dialog").getByRole("img", { name: "Noa", exact: true })).toHaveAttribute("src", "/avatars/sonrisa.jpg");
    await child.getByLabel("PIN de Noa").fill("1234");
    await child.getByLabel("PIN de Noa").press("Enter");
    await expect(child.getByRole("img", { name: "Avatar de Noa" })).toHaveAttribute("src", "/avatars/sonrisa.jpg");
    await child.reload();
    await expect(child.getByRole("img", { name: "Avatar de Noa" })).toHaveAttribute("src", "/avatars/sonrisa.jpg");
  } finally { await context.close(); }
});
