import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { getLesson, type Question } from "../src/lib/learning/domain";
import { crearHijo, entrarAlEspacio, registrarPadre } from "./utilidades";

async function learner(page: Page) {
  await registrarPadre(page);
  const { nombre, pin } = await crearHijo(page, {
    nombre: "Alex",
    nacimiento: "2012-06-12",
  });
  return entrarAlEspacio(page, nombre, pin);
}
async function answer(
  page: Page,
  question: Question,
  value = String(question.answer),
) {
  const radio = question.choices?.find((option) => option.id === value);
  if (radio)
    await page.getByRole("radio", { name: radio.label, exact: true }).check();
  else {
    // En la práctica la app sortea un juego; este recorrido responde por la
    // vía escrita, siempre disponible.
    const textbox = page.getByRole("textbox", { name: /Tu respuesta/ });
    const write = page.getByRole("button", { name: "Prefiero escribir la respuesta", exact: true });
    await expect(textbox.or(write).first()).toBeVisible();
    if (await write.isVisible()) await write.click();
    await textbox.fill(value);
  }
  await page
    .getByRole("button", {
      name: /^(Comprobar mi respuesta|Registrar mi respuesta)$/,
    })
    .click();
}
async function advance(page: Page) {
  const next = page.getByRole("button", {
    name: /^(Siguiente actividad|Continuar|Ver mi comprobación y aplicar)$/,
  });
  await expect(next).toBeEnabled();
  await next.click();
  // Esperar a que se monte la actividad siguiente antes de responderla.
  await expect(next).toHaveCount(0);
}

test("clase, ejemplos, práctica con reintento, comprobación y aplicación con progreso real", async ({
  page,
}) => {
  test.setTimeout(240_000);
  const childId = await learner(page);
  await page.goto(`/jugar/${childId}/aprende/fraccion-cantidad`);
  await page
    .getByRole("button", { name: "Ir a la clase", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Busca cuánto vale una parte" }),
  ).toBeVisible();
  await expect(
    page.getByText("1/4 de 120 = 120 ÷ 4 = 30", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Continuar la explicación" }).click();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Toma las partes necesarias" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Continuar la explicación" }).click();
  await page.getByRole("button", { name: "Ver cómo se resuelve" }).click();
  await expect(
    page.getByText(
      "Calculamos el valor de un cuarto repartiendo el total entre cuatro.",
      { exact: false },
    ),
  ).toBeVisible();
  await page.getByRole("button", { name: "Otro ejemplo razonado" }).click();
  await page.getByRole("button", { name: "Ahora, hazlo con ayuda" }).click();
  const lesson = getLesson("fraccion-cantidad")!;
  // Un error genera una ayuda y permite reintentar el mismo problema.
  await answer(page, lesson.guided[0], "c0");
  await expect(page.getByText(/Revisa esa afirmación/)).toBeVisible();
  await page
    .getByRole("button", { name: "Pedir una pista", exact: true })
    .click();
  await answer(page, lesson.guided[0]);
  await advance(page);
  for (const q of lesson.guided.slice(1)) {
    await answer(page, q);
    await advance(page);
  }
  for (const q of lesson.practice) {
    await answer(page, q);
    await advance(page);
  }
  await expect(
    page.getByRole("heading", { name: "Comprueba", exact: true }),
  ).toBeVisible();
  for (const q of lesson.checks[0]) {
    await answer(page, q);
    await advance(page);
  }
  await answer(page, lesson.application);
  await advance(page);
  await expect(
    page.getByText("5 de 5 respuestas autónomas en la última comprobación", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Jugar El apagón" }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByText("5 de 5 respuestas autónomas en la última comprobación", {
      exact: true,
    }),
  ).toBeVisible();
  await page.goto(`/jugar/${childId}`);
  await expect(
    page.getByRole("progressbar", { name: "Clases terminadas", exact: true }),
  ).toHaveAttribute("value", "1");
  await page.goto("/panel/progreso");
  await expect(
    page.getByRole("region", { name: "Aprendizaje de Alex" }),
  ).toBeVisible();
  const row = page
    .getByRole("row")
    .filter({
      has: page.getByRole("rowheader", {
        name: /Calcular una fracción de una cantidad/,
      }),
    });
  await expect(row.getByText("Resuelvo solo", { exact: true })).toBeVisible();
});

test("consultar la explicación durante la comprobación registra apoyo y no simula autonomía", async ({
  page,
}) => {
  const childId = await learner(page);
  await page.goto(`/jugar/${childId}/aprende/fraccion-cantidad`);
  await page.getByRole("button", { name: "Comprueba lo que sé" }).click();
  const lesson = getLesson("fraccion-cantidad")!;
  for (const q of lesson.checks[0]) {
    await page
      .getByRole("button", { name: "Consultar la explicación sin salir" })
      .click();
    await answer(page, q);
    await advance(page);
  }
  await page
    .getByRole("button", { name: "Ver el desarrollo", exact: true })
    .click();
  await advance(page);
  await expect(
    page.getByText("0 de 5 respuestas autónomas en la última comprobación", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByText("Resuelvo con apoyo", { exact: true }).first(),
  ).toBeVisible();
  await expect(page.getByText(/Próximo repaso:/)).toHaveCount(0);
});

test("El apagón responde a decisiones, se guarda y funciona en una cuenta sin niveles", async ({
  page,
}) => {
  const childId = await learner(page);
  await page.getByRole("link", { name: "Aventura", exact: true }).click();
  await page.getByRole("button", { name: /Inspeccionar la central/ }).click();
  await expect(page.getByText(/Reserva disponible: 120/)).toBeVisible();
  const configure = async (values: number[]) => {
    for (const [i, name] of ["Hospital", "Radio", "Taller"].entries()) {
      const slider = page.getByRole("slider", { name, exact: true });
      await slider.press("Home");
      for (let step = 0; step < values[i] / 5; step++)
        await slider.press("ArrowRight");
    }
    await page.getByRole("button", { name: "Probar la distribución" }).click();
  };
  await configure([100, 30, 10]);
  await expect(
    page.getByRole("status").filter({ hasText: /corta el suministro/ }),
  ).toBeVisible();
  await configure([90, 20, 10]);
  await expect(
    page.getByRole("heading", { name: "La ciudad vuelve a responder" }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "La ciudad vuelve a responder" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Hospital.*En funcionamiento/ }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  const results = await new AxeBuilder({ page }).include("main").analyze();
  expect(results.violations).toEqual([]);
  await page.getByRole("link", { name: "Inicio", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/jugar/${childId}$`));
});
