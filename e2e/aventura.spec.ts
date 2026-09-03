import { expect, test } from "@playwright/test";
import {
  idDeHijo,
  otorgarDominio,
  resolverEnunciado,
  sembrarProgresoCercaDeDominio,
  sesionDeHijo,
} from "./utilidades";

/** Misma tabla de figuras que src/lib/geometria.ts, para resolver los retos
 * de "choice" (lados/vértices) del evento sin depender del azar. */
const SHAPES: Record<string, number> = {
  triángulo: 3,
  cuadrado: 4,
  rectángulo: 4,
  pentágono: 5,
  hexágono: 6,
  heptágono: 7,
  octágono: 8,
  rombo: 4,
};

function respuestaFigura(enunciado: string): number {
  const nombre = enunciado.match(/un (\p{L}+)/u)![1].toLowerCase();
  return SHAPES[nombre];
}

test.describe("Narrativa Math Quest", () => {
  test("la ciudad y la zona muestran la identidad narrativa de cada hilo", async ({ page }) => {
    await sesionDeHijo(page);

    await expect(page.getByText("Centro de Energía")).toBeVisible();
    await expect(page.getByText("Laboratorio")).toBeVisible();
    await expect(page.getByText("Zona de Construcción")).toBeVisible();
    await expect(page.getByText("Centro de Control")).toBeVisible();
    await expect(page.getByText("Distrito Misterioso")).toBeVisible();
    // El progreso visual es puramente decorativo sobre isMastered/isUnlocked.
    await expect(page.getByRole("progressbar", { name: "Progreso en Centro de Energía" })).toHaveAttribute(
      "aria-valuenow",
      "0",
    );

    await page.getByRole("link", { name: "Aritmética" }).click();
    await expect(page).toHaveURL(/\/aritmetica$/);
    await expect(page.getByText("Resolver cálculos permite reparar sistemas.")).toBeVisible();
  });

  test("Tu próximo desafío enlaza al módulo real recomendado, no a un id inventado", async ({ page }) => {
    await sesionDeHijo(page);

    const desafio = page.getByRole("link", { name: /Tu próximo desafío/ });
    await expect(desafio).toBeVisible();
    await expect(desafio).toContainText("Sumas hasta 5");
    await desafio.click();
    // El destino es el moduleId real de la currícula, no un "missionId" aparte.
    await expect(page).toHaveURL(/\/aritmetica\/aritmetica-d1$/);
    await expect(page.getByRole("heading", { name: "Sumas hasta 5" })).toBeVisible();
  });

  test("Boss Challenge combina retos de varios hilos ya desbloqueados", async ({ page }) => {
    await sesionDeHijo(page);

    await page.getByRole("link", { name: "Boss Challenge" }).click();
    await expect(page).toHaveURL(/\/boss$/);
    await expect(page.getByRole("heading", { name: "Boss Challenge" })).toBeVisible();
    await expect(page.getByText(/Boss Challenge · 1\/\d/)).toBeVisible();
  });
});

test.describe("Mundo: Ciudad Central", () => {
  test("interactuar con un objeto resuelve un problema real del módulo y guarda el intento", async ({
    page,
  }) => {
    await sesionDeHijo(page);
    const estrellas = page.locator("header").getByText(/^Estrellas:\s*-?\d+$/);

    await page.getByRole("link", { name: "Geometría" }).click();
    await expect(estrellas).toHaveText("Estrellas: 0");

    // "Lados de figuras" (geometria-d1) no tiene prerrequisitos: es el primer
    // objeto explorable de la Zona de Construcción.
    await page.getByRole("button", { name: /^Lados de figuras —/ }).click();
    const ficha = page.getByRole("dialog", { name: /Lados de figuras/ });
    await expect(ficha).toBeVisible();

    const enunciado = await ficha.getByText(/¿Cuántos (lados|vértices) tiene un/).innerText();
    await ficha.getByRole("button", { name: String(respuestaFigura(enunciado)), exact: true }).click();

    await expect(ficha.getByText(/CÓDIGO ACEPTADO/)).toBeVisible();
    // El intento se guardó de verdad: el saldo sale de starLedger, no del mundo.
    await expect(estrellas).not.toHaveText("Estrellas: 0");
  });

  test("un objeto bloqueado explica el prerrequisito real, sin candados inventados", async ({ page }) => {
    await sesionDeHijo(page);

    await page.getByRole("link", { name: "Aritmética" }).click();
    // "Multiplicación" (aritmetica-d5) exige dominar "Sumas y restas hasta 100".
    await page.getByRole("button", { name: /^Multiplicación — bloqueado/ }).click();

    const ficha = page.getByRole("dialog", { name: /Multiplicación/ });
    await expect(ficha.getByText("El sistema no te reconoce todavía")).toBeVisible();
    // El prerrequisito que lista es el real de curriculum.ts, no uno narrativo.
    await expect(ficha.getByRole("listitem")).toHaveText(/Sumas y restas hasta 100/);
  });

  test("los objetivos de la misión se marcan con el progreso académico real", async ({ page }) => {
    const { correo } = await sesionDeHijo(page);
    const childId = idDeHijo(page);

    await page.goto(`/jugar/${childId}/misiones`);
    // El <li> del objetivo, no el de la misión que lo contiene.
    const objetivo = page
      .getByRole("listitem")
      .filter({ hasText: "Reactivar la terminal de la plaza" })
      .last();
    await expect(objetivo).toContainText("Pendiente:");

    // Dominar de verdad el módulo del objetivo (aritmetica-d1) lo cierra.
    await otorgarDominio(correo, childId, ["aritmetica-d1"]);
    await page.reload();
    await expect(objetivo).toContainText("Completado:");
  });

  test("el personaje se guarda en Firestore y sigue igual al recargar", async ({ page }) => {
    await sesionDeHijo(page);

    await page.getByRole("button", { name: /Personalizar el personaje/ }).click();
    const ropa = page.getByRole("button", { name: "Ropa 3" });
    await ropa.click();
    await expect(ropa).toHaveAttribute("aria-pressed", "true");
    await page.getByRole("button", { name: "Guardar personaje" }).click();
    await expect(page.getByRole("dialog", { name: "Tu personaje" })).toBeHidden();

    await page.reload();
    await page.getByRole("button", { name: /Personalizar el personaje/ }).click();
    await expect(page.getByRole("button", { name: "Ropa 3" })).toHaveAttribute("aria-pressed", "true");
  });
});

test.describe("Celebración de mastery", () => {
  test("aparece solo tras una transición real a masteredAt, con la insignia narrativa del hilo", async ({
    page,
  }) => {
    const { correo } = await sesionDeHijo(page);
    const childId = idDeHijo(page);
    await sembrarProgresoCercaDeDominio(correo, childId, "aritmetica-d1");

    await page.goto(`/jugar/${childId}/aritmetica/aritmetica-d1`);
    await page.getByRole("tab", { name: /Práctica/ }).click();
    await expect(page.getByText("Habilidad dominada")).not.toBeVisible();

    const enunciado = await page.getByText(/¿Cuánto es \d+ \+ \d+\?/).innerText();
    const objetivo = resolverEnunciado(enunciado)!;
    const recta = page.getByRole("slider");
    await recta.focus();
    let actual = Number(await recta.getAttribute("aria-valuenow"));
    while (actual !== objetivo) {
      await page.keyboard.press(actual < objetivo ? "ArrowRight" : "ArrowLeft");
      actual = Number(await recta.getAttribute("aria-valuenow"));
    }
    await page.getByRole("button", { name: "Responder" }).click();

    const celebracion = page.getByRole("status").filter({ hasText: "Habilidad dominada" });
    await expect(celebracion).toBeVisible();
    await expect(celebracion).toContainText("Sumas hasta 5");
    await expect(celebracion).toContainText("Centro de Energía");

    await celebracion.getByRole("button", { name: "Continuar" }).click();
    await expect(celebracion).not.toBeVisible();
  });
});

test.describe("Evento especial: Código secreto", () => {
  test("resuelve retos reales de módulos existentes y persiste cada intento", async ({ page }) => {
    await sesionDeHijo(page);
    const childId = idDeHijo(page);
    const estrellas = page.locator("header").getByText(/^Estrellas:\s*-?\d+$/);

    // Geometría: "Lados de figuras" y "Vértices" son tier 0 sin
    // prerrequisitos, así que ya están desbloqueados sin sembrar nada.
    await page.goto(`/jugar/${childId}/geometria/evento`);
    await expect(page.getByRole("heading", { name: "Código secreto" })).toBeVisible();
    await expect(page.getByText(/Código secreto · 1\/2/)).toBeVisible();
    await expect(estrellas).toHaveText("Estrellas: 0");

    const primerEnunciado = await page.getByText(/¿Cuántos (lados|vértices) tiene un/).innerText();
    await page.getByRole("button", { name: String(respuestaFigura(primerEnunciado)), exact: true }).click();
    await expect(page.getByText("¡Correcto! 🎉")).toBeVisible();

    // El intento correcto ya se guardó de verdad: el saldo de estrellas de la
    // cabecera (leído en vivo de starLedger) deja de estar en 0.
    await expect(estrellas).not.toHaveText("Estrellas: 0");

    await page.getByRole("button", { name: "Siguiente" }).click();
    await expect(page.getByText(/Código secreto · 2\/2/)).toBeVisible();
  });

  test("con menos de dos temas desbloqueados, avisa en vez de fabricar un reto", async ({ page }) => {
    await sesionDeHijo(page);
    const childId = idDeHijo(page);

    // Álgebra: para un hijo recién creado solo "Patrones" está desbloqueado.
    await page.goto(`/jugar/${childId}/algebra/evento`);
    await expect(page.getByText(/Todavía no tienes suficientes temas desbloqueados/)).toBeVisible();
  });
});
