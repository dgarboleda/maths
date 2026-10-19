import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { getLesson, placementQuestion, type Question } from "../src/lib/learning/domain";
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
  const lesson = getLesson("fraccion-cantidad")!;
  for (let i = 1; i < lesson.examples.length; i++)
    await page.getByRole("button", { name: "Otro ejemplo razonado" }).click();
  await page.getByRole("button", { name: "Ahora, hazlo con ayuda" }).click();
  // Un error recibe el feedback propio de esa alternativa y permite reintentar.
  const wrong = lesson.guided[0].choices!.find((o) => o.id !== lesson.guided[0].answer)!;
  await answer(page, lesson.guided[0], wrong.id);
  await expect(page.getByText(wrong.feedback!, { exact: true })).toBeVisible();
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
  await page.getByRole("link", { name: /El apagón/ }).click();
  await expect(page).toHaveURL(new RegExp(`/jugar/${childId}/aventura/apagon$`));
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

test("una aventura de unidad orienta cada intento, se guarda y aparece completada", async ({
  page,
}) => {
  const childId = await learner(page);
  await page.goto(`/jugar/${childId}/aventura`);
  await expect(page.getByRole("heading", { name: "Aventuras", exact: true })).toBeVisible();
  await page.getByRole("link", { name: /El jardín de baldosas/ }).click();
  await page.getByRole("button", { name: "Investigar la situación" }).click();
  await expect(page.getByRole("status").filter({ hasText: /al menos 50 m²/ })).toBeVisible();
  const plan = async (lado: string, baldosas: string) => {
    await page.getByLabel("Lado del jardín (m)").fill(lado);
    await page.getByLabel("Baldosas", { exact: true }).fill(baldosas);
    await page.getByRole("button", { name: "Probar el plan" }).click();
  };
  await plan("8", "32");
  await expect(page.getByRole("status").filter({ hasText: /esquinas/ })).toBeVisible();
  await plan("8", "36");
  await expect(page.getByRole("heading", { name: "Misión completada" })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { name: "Misión completada" })).toBeVisible();
  const results = await new AxeBuilder({ page }).include("main").analyze();
  expect(results.violations).toEqual([]);
  await page.getByRole("link", { name: "Elegir otra aventura" }).click();
  await expect(page.getByText("1 de 7 misiones completadas")).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});

test("los gráficos dinámicos de la clase responden, son accesibles y caben en pantalla", async ({
  page,
}) => {
  const childId = await learner(page);
  for (const [lessonId, graph] of [
    ["funciones-lineales", /Recta y = 3x más 2/],
    ["angulos", /Dos rectas que se cortan: 60°/],
  ] as const) {
    await page.goto(`/jugar/${childId}/aprende/${lessonId}`);
    await page.getByRole("button", { name: "Ir a la clase", exact: true }).click();
    const explore = page.getByRole("region", { name: "Explora la idea" });
    await expect(explore.getByRole("img", { name: graph })).toBeVisible();
    await explore.getByRole("slider").first().press("ArrowRight");
    await expect(explore.getByRole("img", { name: graph })).toHaveCount(0);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    const results = await new AxeBuilder({ page }).include("main").analyze();
    expect(results.violations).toEqual([]);
  }
});

test("los puntos de los gráficos se arrastran con el puntero y actualizan el modelo", async ({
  page,
}) => {
  const childId = await learner(page);
  const drag = async (handle: ReturnType<Page["locator"]>, dx: number, dy: number) => {
    await handle.scrollIntoViewIfNeeded();
    const box = (await handle.boundingBox())!;
    const x = box.x + box.width / 2,
      y = box.y + box.height / 2;
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x + dx / 2, y + dy / 2);
    await page.mouse.move(x + dx, y + dy);
    await page.mouse.up();
  };
  await page.goto(`/jugar/${childId}/aprende/funciones-lineales`);
  await page.getByRole("button", { name: "Ir a la clase", exact: true }).click();
  const explore = page.getByRole("region", { name: "Explora la idea" });
  await expect(explore.getByLabel("Valor inicial (x = 0)")).toHaveValue("2");
  // El punto rosa (valor inicial) sube: el control deslizante lo acompaña.
  await drag(explore.locator("[data-handle]").first(), 0, -40);
  await expect(explore.getByLabel("Valor inicial (x = 0)")).not.toHaveValue("2");
  await expect(explore.getByRole("img", { name: /corta el eje y en 2 / })).toHaveCount(0);

  await page.goto(`/jugar/${childId}/aprende/ecuaciones-cuadraticas`);
  await page.getByRole("button", { name: "Ir a la clase", exact: true }).click();
  await expect(explore.getByLabel("Primera raíz p")).toHaveValue("-1");
  await drag(explore.locator("[data-handle]").first(), -60, 0);
  await expect(explore.getByLabel("Primera raíz p")).not.toHaveValue("-1");
  await expect(explore.getByRole("img", { name: /corta el eje x en −1 / })).toHaveCount(0);
});

test("la evaluación de ubicación recomienda por dónde empezar y la familia ve los errores frecuentes", async ({
  page,
}) => {
  test.setTimeout(180_000);
  const childId = await learner(page);
  await page.getByRole("link", { name: "¿Ya sabes algo? Encuentra tu punto de partida" }).click();
  await page.getByRole("button", { name: "Empezar la evaluación" }).click();
  const first = getLesson("enteros-recta")!;
  const question = placementQuestion(first);
  await expect(page.getByText(question.prompt, { exact: true })).toBeVisible();
  if (question.choices)
    await page.getByRole("radio", { name: question.choices.find((c) => c.id === question.answer)!.label, exact: true }).check();
  else await page.getByRole("textbox", { name: /Tu respuesta/ }).fill(String(question.answer));
  await page.getByRole("button", { name: "Responder" }).click();
  // Acertar avanza a la segunda clase de números; "Todavía no lo sé" cierra
  // esa unidad y pasa a la primera clase de cada una de las 6 restantes.
  for (let n = 2; n <= 8; n++) {
    await expect(page.getByRole("heading", { name: new RegExp(`^Pregunta ${n} ·`) })).toBeVisible();
    await page.getByRole("button", { name: "Todavía no lo sé" }).click();
  }
  await expect(page.getByRole("heading", { name: "Tu punto de partida" })).toBeVisible();
  await expect(page.getByRole("link", { name: `Empezar por: ${getLesson("enteros-suma-resta")!.title}` })).toBeVisible();
  await expect(page.getByRole("table", { name: /Currículo Nacional de Perú/ })).toBeVisible();
  expect((await new AxeBuilder({ page }).include("main").analyze()).violations).toEqual([]);
  await page.goto(`/jugar/${childId}`);
  await expect(page.getByRole("link", { name: /Tu ubicación: 1 clase que ya dominas/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: getLesson("enteros-suma-resta")!.title, level: 2 })).toBeVisible();

  // Un error previsto en la práctica aparece en el informe de la familia.
  const lesson = getLesson("perimetro-area")!;
  const target = lesson.practice[0];
  await page.goto(`/jugar/${childId}/aprende/${lesson.id}?modo=practice`);
  await page.getByRole("button", { name: "Comenzar práctica" }).click();
  const wrong = target.choices
    ? target.choices.find((c) => c.id !== target.answer && !c.feedback?.startsWith("Revisa esa"))!.id
    : String(target.errors![0].value);
  await answer(page, target, wrong);
  await page.goto("/panel/progreso");
  const panel = page.getByRole("region", { name: "Errores frecuentes" });
  await expect(panel.getByText(/Perímetro y área · 1 vez/)).toBeVisible();
  await expect(panel.getByText("Persiste: conviene practicar esta idea.")).toBeVisible();
  expect((await new AxeBuilder({ page }).include("main").analyze()).violations).toEqual([]);
});
