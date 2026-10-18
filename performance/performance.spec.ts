import { test, expect, chromium } from "@playwright/test";
import { createServer } from "node:net";
import { mkdir, writeFile, rm } from "node:fs/promises";
import lighthouse from "lighthouse";
import budgets from "./budgets.json";
import { registrarPadre, crearHijo, entrarAlPerfil, idDeHijo, sembrarNivelConTerminal } from "../e2e/utilidades";

test("presupuesto de producción: login, juego y editor con sesión real", async ({ baseURL }, testInfo) => {
  const probe = createServer();
  await new Promise<void>((resolve) => probe.listen(0, "127.0.0.1", resolve));
  const port = (probe.address() as { port: number }).port;
  await new Promise<void>((resolve, reject) => probe.close((error) => error ? reject(error) : resolve()));
  const profileDir = testInfo.outputPath("chrome-profile");
  const context = await chromium.launchPersistentContext(profileDir, {
    headless: true, executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH, baseURL,
    args: [`--remote-debugging-port=${port}`], viewport: { width: 1350, height: 940 },
  });
  try {
    const page = context.pages()[0];
    async function audit(name: keyof typeof budgets, route: string) {
      const url = new URL(route, baseURL).href;
      const cdp = await context.newCDPSession(page);
      await cdp.send("Network.clearBrowserCache");
      await cdp.detach();
      const result = await lighthouse(url, {
        port, output: "json", onlyCategories: ["performance", "accessibility"],
        disableStorageReset: true, formFactor: "desktop",
        screenEmulation: { mobile: false, width: 1350, height: 940, deviceScaleFactor: 1, disabled: false },
      });
      if (!result) throw new Error("Lighthouse no devolvió un informe.");
      await mkdir("performance-reports/lighthouse", { recursive: true });
      await writeFile(`performance-reports/lighthouse/${name}.json`, JSON.stringify(result.lhr, null, 2));
      await testInfo.attach(`lighthouse-${name}.json`, { body: JSON.stringify(result.lhr), contentType: "application/json" });
      expect(new URL(result.lhr.finalDisplayedUrl).pathname).toBe(route);
      expect(result.lhr.runtimeError).toBeUndefined();
      const details = result.lhr.audits["resource-summary"].details;
      if (details?.type !== "table") throw new Error("Falta el resumen de recursos de Lighthouse.");
      const size = (type: string) => {
        const value = details.items.find((item) => item.resourceType === type)?.transferSize;
        return typeof value === "number" ? value : 0;
      };
      console.log(`${name}: JS ${size("script")} B; total ${size("total")} B; accesibilidad ${result.lhr.categories.accessibility.score}`);
      expect(size("script")).toBeGreaterThan(0);
      expect(size("script")).toBeLessThanOrEqual(budgets[name].scriptBytes);
      expect(size("total")).toBeLessThanOrEqual(budgets[name].totalBytes);
      expect(result.lhr.categories.accessibility.score).toBeGreaterThanOrEqual(budgets[name].accessibility);
    }
    await page.goto(new URL("/login", baseURL).href);
    await audit("login", "/login");
    const email = await registrarPadre(page);
    await crearHijo(page);
    await entrarAlPerfil(page, "Ana", "1234", email);
    const childId = idDeHijo(page);
    const { levelId } = await sembrarNivelConTerminal(email, "aritmetica-d1");
    const gameRoute = `/jugar/${childId}/nivel/${levelId}`;
    await page.goto(new URL(gameRoute, baseURL).href);
    await expect(page.getByText("Sala de prueba", { exact: true }).first()).toBeVisible();
    await audit("juego", gameRoute);
    const editorRoute = `/panel/editor/${levelId}`;
    await page.goto(new URL(editorRoute, baseURL).href);
    await expect(page.getByRole("textbox", { name: "Nombre del nivel" })).toBeVisible();
    await audit("editor", editorRoute);
  } finally {
    await context.close();
    await rm(profileDir, { recursive: true, force: true });
  }
});
