import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { getLesson, parseNumber } from "../src/lib/learning/domain";
import { crearHijo, entrarAlEspacio, registrarPadre } from "./utilidades";
import { SOKOBAN_SOLUTIONS } from "../src/test/sokobanSolutions";

type Game = "frogger" | "cohete" | "snake" | "runner" | "numberpac" | "invaders" | "breakout" | "topos" | "cajas";

async function practice(page: Page, lessonId: string, game: Game) {
  // La app sortea el juego de cada ejercicio; aquí se fija para que la
  // prueba sea determinista.
  await page.addInitScript((forced) => {
    (window as { __MATHS_TEST_PRACTICE_GAME__?: string }).__MATHS_TEST_PRACTICE_GAME__ = forced;
  }, game);
  await registrarPadre(page);
  const profile = await crearHijo(page, { nombre: "Alex", nacimiento: "2012-06-12" });
  const childId = await entrarAlEspacio(page, profile.nombre, profile.pin);
  await page.goto(`/jugar/${childId}/aprende/${lessonId}`);
  await page.getByRole("button", { name: "Práctica", exact: true }).click();
  return getLesson(lessonId)!;
}

async function conceptThenNumeric(page: Page, lessonId: string, game: Game) {
  const lesson = await practice(page, lessonId, game);
  const question = lesson.practice[0];
  await page.getByRole("radio", { name: question.choices!.find((c) => c.id === question.answer)!.label, exact: true }).check();
  await page.getByRole("button", { name: "Comprobar mi respuesta", exact: true }).click();
  await page.getByRole("button", { name: "Siguiente actividad", exact: true }).click();
  return lesson.practice[1];
}

/** Estanque con su mecánica real: lleva la rana a la columna del nenúfar con
 *  ese valor (o se queda si ya está encima) y salta dos filas. */
async function cross(page: Page, label: string) {
  const cells = await pondLabels(page);
  // La rana se dibuja en su propia fila (orilla o carril), no sobre los nenúfares.
  const frog = Number(await page.locator("main [data-board]").getAttribute("data-frog-col"));
  const found = cells.indexOf(label);
  const target = found < 0 ? frog : found;
  for (let col = frog; col !== target; col += Math.sign(target - col)) {
    await page.keyboard.press(target > col ? "ArrowRight" : "ArrowLeft");
    await expect(page.locator("main [data-board]")).toHaveAttribute("data-hopping", "false");
  }
  await expect.poll(async () => Math.abs(Number(await page.locator("main [data-board]").getAttribute("data-obstacle-col")) - target)).toBeGreaterThanOrEqual(2);
  await page.keyboard.press("ArrowUp");
  await expect(page.locator("main [data-board]")).toHaveAttribute("data-hopping", "false");
  await page.keyboard.press("ArrowUp");
}

async function pondLabels(page: Page) {
  return (await page.locator("main [data-board] > div").first().locator(":scope > div").allTextContents()).map((c) => c.trim());
}

function savedAnswer(page: Page) {
  return page.waitForResponse((response) =>
    response.url().endsWith("/recordLearningAction") &&
    response.request().postDataJSON()?.data?.action?.kind === "answer",
  );
}

async function expectGameInView(page: Page) {
  const prompt = page.locator('main p[tabindex="-1"]');
  await expect(prompt).toBeFocused();
  const box = await prompt.boundingBox();
  expect(box!.y).toBeGreaterThanOrEqual(-1);
  expect(box!.y).toBeLessThan(80);
}

test("Estanque: dos preguntas seguidas mantienen un cruce de dos saltos", async ({ page }) => {
  const first = await conceptThenNumeric(page, "fracciones-unidad", "frogger");
  await page.getByRole("button", { name: "¡Empezar!", exact: true }).click();
  const firstLabel = (await pondLabels(page)).find((label) => parseNumber(label) === first.answer)!;
  const firstSaved = savedAnswer(page);
  await cross(page, firstLabel);
  expect((await (await firstSaved).json()).result.progress.responses[`practice:${first.id}`].correct).toBe(true);
  await page.getByRole("button", { name: "Siguiente actividad", exact: true }).click();
  const second = getLesson("fracciones-unidad")!.practice[2];
  await expect(page.locator("main [data-board]")).toBeVisible();
  const secondLabel = (await pondLabels(page)).find((label) => parseNumber(label) === second.answer)!;
  expect(secondLabel).toBeTruthy();
  const secondSaved = savedAnswer(page);
  await cross(page, secondLabel);
  expect((await (await secondSaved).json()).result.progress.responses[`practice:${second.id}`].correct).toBe(true);
});

test("Estanque: pausa, error, pista, recarga y acierto guardados sin acreditar dominio", async ({ page }) => {
  const lesson = await practice(page, "fraccion-cantidad", "frogger");
  // Sin selector: la app decide el juego y la pregunta conceptual se responde
  // en su formato habitual.
  await expect(page.getByText("Elige cómo practicar")).toHaveCount(0);
  const conceptual = lesson.practice[0];
  await page.getByRole("radio", { name: conceptual.choices!.find((c) => c.id === conceptual.answer)!.label, exact: true }).check();
  await page.getByRole("button", { name: "Comprobar mi respuesta", exact: true }).click();
  await page.getByRole("button", { name: "Siguiente actividad", exact: true }).click();
  const cabinet = page.locator('[data-game="frogger"]');
  await expect(cabinet.getByRole("button", { name: "Pausar partida" })).toBeVisible();
  const sound = cabinet.getByRole("button", { name: "Sonido del juego" });
  const initialSound = await sound.getAttribute("aria-pressed");
  await sound.click();
  await expect(sound).toHaveAttribute("aria-pressed", initialSound === "true" ? "false" : "true");
  await sound.click();
  await page.getByRole("button", { name: "¡Empezar!", exact: true }).click();
  const q = lesson.practice[1];
  await expectGameInView(page);
  await expect(page.getByText(/Vidas/)).toHaveCount(0);
  // En pausa el teclado no mueve la rana ni envía respuestas.
  let answers = 0;
  page.on("request", (request) => {
    if (request.url().endsWith("/recordLearningAction") && request.postDataJSON()?.data?.action?.kind === "answer") answers++;
  });
  await page.getByRole("button", { name: "Pausar partida" }).click();
  await page.keyboard.press("ArrowUp");
  await page.keyboard.press("ArrowUp");
  await page.waitForTimeout(700);
  expect(answers).toBe(0);
  await page.getByRole("button", { name: "Reanudar partida" }).click();
  const wrongLabel = (await pondLabels(page)).find((label) => label !== "" && Number(label) !== q.answer)!;
  const wrong = Number(wrongLabel);
  const answer = savedAnswer(page);
  await cross(page, wrongLabel);
  const incorrect = (await (await answer).json()).result.progress;
  expect(incorrect.responses[`practice:${q.id}`]).toMatchObject({ response: String(wrong), correct: false, attempts: 1 });
  expect(incorrect.checkPassedAt).toBeNull();
  await expect(page.getByText(/La partida está en pausa/)).toBeVisible();
  await page.getByRole("button", { name: "Pedir una pista", exact: true }).click();
  await expect(page.getByText(q.hints[0], { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText(q.hints[0], { exact: true })).toBeVisible();
  await expect(page.getByText(/La partida está en pausa/)).toBeVisible();
  await expect(page.getByRole("button", { name: "¡Empezar!", exact: true })).toBeEnabled();
  await page.getByRole("button", { name: "¡Empezar!", exact: true }).click();
  await expect(page.getByText(/La partida está en pausa/)).toHaveCount(0);
  await page.screenshot({ path: test.info().outputPath("estanque.png"), fullPage: true });
  expect((await new AxeBuilder({ page }).include("main").analyze()).violations).toEqual([]);
  const corrected = savedAnswer(page);
  await cross(page, String(q.answer));
  const progress = (await (await corrected).json()).result.progress;
  expect(progress.responses[`practice:${q.id}`]).toMatchObject({ response: String(q.answer), correct: true, attempts: 2, hintsUsed: 1 });
  expect(progress.checkPassedAt).toBeNull();
  expect(progress.completedAt).toBeNull();
  await expect(page.getByRole("heading", { name: "¡Cruzaste el estanque!" })).toBeVisible();
  // La vía escrita sigue disponible y conserva la respuesta del juego.
  await page.getByRole("button", { name: "Prefiero escribir la respuesta", exact: true }).click();
  await expect(page.getByRole("textbox", { name: /Tu respuesta/ })).toHaveValue(String(q.answer));
  await page.getByRole("button", { name: "Siguiente actividad", exact: true }).click();
  // El siguiente ejercicio numérico vuelve a ser un juego sorteado.
  await page.getByRole("button", { name: "Prefiero escribir la respuesta", exact: true }).click();
  await expect(page.getByText(lesson.practice[2].prompt, { exact: true })).toBeVisible();
});

test("Cohete: fracción exacta, sin reloj por defecto y recuperación de respuesta perdida sin duplicar evidencia", async ({ page }) => {
  const q = await conceptThenNumeric(page, "fracciones-unidad", "cohete");
  expect(q.answer).toBe(1 / 3);
  await page.getByRole("button", { name: "¡Iniciar misión!", exact: true }).click();
  await expect(page.getByText("Sin límite", { exact: true })).toBeVisible();
  const input = page.getByRole("textbox", { name: /Tu respuesta/ });
  await page.getByRole("button", { name: "Pausar partida" }).click();
  await expect(input).toBeDisabled();
  await page.getByRole("button", { name: "Reanudar partida" }).click();
  await input.fill("1/0");
  await page.getByRole("button", { name: "Comprobar mi respuesta", exact: true }).click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText("fracción válida");
  await input.fill("2/6");
  await page.screenshot({ path: test.info().outputPath("cohete.png"), fullPage: true });
  expect((await new AxeBuilder({ page }).include("main").analyze()).violations).toEqual([]);
  let discardedId: string | undefined;
  await page.route("**/recordLearningAction", async (route) => {
    const request = route.request().postDataJSON().data;
    if (!discardedId && request.action.kind === "answer") {
      discardedId = request.operationId;
      // El servidor sí guarda; solo se pierde la respuesta de red.
      await route.fetch();
      await route.abort("failed");
    } else await route.continue();
  });
  await page.getByRole("button", { name: "Comprobar mi respuesta", exact: true }).click();
  const retried = savedAnswer(page);
  await page.getByRole("button", { name: "Reintentar guardado", exact: true }).click();
  const result = await retried;
  expect(result.request().postDataJSON().data.operationId).toBe(discardedId);
  const saved = (await result.json()).result;
  expect(saved.progress.responses[`practice:${q.id}`]).toMatchObject({ response: "2/6", attempts: 1, correct: true });
  expect(saved.progress.checkPassedAt).toBeNull();
  expect(saved.stars).toBe(0);
  await expect(page.getByRole("button", { name: "Reintentar guardado", exact: true })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "¡Misión cumplida!" })).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "Prefiero escribir la respuesta", exact: true }).click();
  await expect(page.getByRole("textbox", { name: /Tu respuesta/ })).toHaveValue("2/6");
  await expect(page.getByText("Tu respuesta es correcta. Revisa por qué funciona.", { exact: true })).toBeVisible();
  // La respuesta persistida sigue en el ejercicio de práctica, sin salto a evaluación.
  await expect(page.getByRole("heading", { name: "Práctica", exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test("Invasión con su mecánica real: apuntar y disparar envía la respuesta; sin estrellas ni dominio", async ({ page }, testInfo) => {
  const q = await conceptThenNumeric(page, "fracciones-unidad", "invaders");
  await expect(page.getByRole("combobox", { name: "Juego de práctica" })).toHaveCount(0);
  await page.getByRole("button", { name: "¡Empezar!", exact: true }).click();
  await expectGameInView(page);
  const firstInvader = page.locator("main [data-invader-col='0']");
  const initialY = Number(await firstInvader.getAttribute("data-invader-y"));
  await expect.poll(async () => Number(await firstInvader.getAttribute("data-invader-y"))).toBeGreaterThan(initialY);
  await expect(page.getByText(/Vidas/)).toHaveCount(0);
  expect((await new AxeBuilder({ page }).include("main").analyze()).violations).toEqual([]);
  // En móvil se apunta directamente; el teclado sigue disponible en escritorio.
  await expect(page.locator("main [data-invaders-board] [data-choice-label]")).toHaveCount(5);
  const columns = await page.locator("main [data-invaders-board] [data-choice-label]").allTextContents();
  const target = columns.findIndex((label) => label.trim() === "1/3");
  expect(target).toBeGreaterThanOrEqual(0);
  if (testInfo.project.name === "móvil") await page.getByRole("button", { name: "Apuntar a 1/3", exact: true }).tap();
  else for (let col = 2; col !== target; col += Math.sign(target - col))
    await page.keyboard.press(target > col ? "ArrowRight" : "ArrowLeft");
  await expect(page.getByRole("button", { name: "Apuntar a 1/3", exact: true })).toHaveAttribute("aria-pressed", "true");
  await testInfo.attach("invasion", { body: await page.screenshot(), contentType: "image/png" });
  const answer = savedAnswer(page);
  if (testInfo.project.name === "móvil") await page.getByRole("button", { name: "Disparar", exact: true }).tap();
  else await page.keyboard.press("Space");
  const saved = (await (await answer).json()).result;
  expect(saved.progress.responses[`practice:${q.id}`]).toMatchObject({ correct: true, attempts: 1 });
  expect(saved.progress.checkPassedAt).toBeNull();
  expect(saved.stars).toBe(0);
  await expect(page.getByRole("heading", { name: "¡Invasión repelida!" })).toBeVisible();
  await page.getByRole("button", { name: "Siguiente actividad", exact: true }).click();
  await page.getByRole("button", { name: "¡Empezar!", exact: true }).click();
  await expect(page.locator("main [data-invaders-board]")).toBeVisible();
  await expect(page.getByText(getLesson("fracciones-unidad")!.practice[2].prompt, { exact: true })).toBeVisible();
  await expect.poll(async () => Number(await page.locator("main [data-arcade-score]").getAttribute("data-arcade-score"))).toBeGreaterThanOrEqual(500);
});

test("Autopista: elegir carril y usar el turbo guarda el resultado de la clase", async ({ page }, testInfo) => {
  const q = await conceptThenNumeric(page, "fracciones-unidad", "runner");
  await page.getByRole("button", { name: "¡Empezar!", exact: true }).click();
  await expectGameInView(page);
  const board = page.locator("main [data-runner-board]");
  await expect(board).toHaveAttribute("data-racing", "false");
  const labels = await board.locator("[data-choice-label]").allTextContents();
  const target = labels.indexOf("1/3");
  expect(target).toBeGreaterThanOrEqual(0);
  expect((await new AxeBuilder({ page }).include("main").analyze()).violations).toEqual([]);
  await testInfo.attach("autopista", { body: await page.screenshot(), contentType: "image/png" });
  for (let segment = 0; segment < 2; segment++) {
    const safeLane = board.locator('button[aria-label^="Carril"]').filter({ hasNot: page.locator("[data-cone]") }).first();
    if (testInfo.project.name === "móvil") await safeLane.tap();
    else await safeLane.click();
    await page.getByRole("button", { name: "Turbo · cruzar ⚡", exact: true }).click();
    await expect(board).toHaveAttribute("data-segment", String(segment + 1));
  }
  if (testInfo.project.name === "móvil") await page.getByRole("button", { name: `Carril ${target + 1}: 1/3`, exact: true }).tap();
  else await page.getByRole("button", { name: `Carril ${target + 1}: 1/3`, exact: true }).click();
  await expect(board).toHaveAttribute("data-lane", String(target));
  const answer = savedAnswer(page);
  await page.getByRole("button", { name: "Turbo · cruzar ⚡", exact: true }).click();
  const saved = (await (await answer).json()).result;
  expect(saved.progress.responses[`practice:${q.id}`]).toMatchObject({ correct: true, attempts: 1 });
  expect(saved.stars).toBe(0);
  await expect(page.getByRole("heading", { name: "¡Llegaste a la meta!" })).toBeVisible();
});

test("Bloques: el rebote lateral alcanza la respuesta apuntada y se guarda una sola vez", async ({ page }, testInfo) => {
  const q = await conceptThenNumeric(page, "fracciones-unidad", "breakout");
  await page.getByRole("button", { name: "¡Empezar!", exact: true }).click();
  await expectGameInView(page);
  const board = page.locator("main [data-breakout-board]");
  const labels = await board.locator("[data-choice-label]").allTextContents();
  const target = labels.indexOf("1/3");
  expect(target).toBeGreaterThanOrEqual(0);
  if (testInfo.project.name === "móvil") await page.getByRole("button", { name: "Apuntar al bloque 1/3", exact: true }).tap();
  else for (let col = 2; col !== target; col += Math.sign(target - col)) await page.keyboard.press(target > col ? "ArrowRight" : "ArrowLeft");
  const shotStyle = page.getByRole("button", { name: "Rebote →", exact: true });
  await shotStyle.focus();
  await page.keyboard.press("Space");
  await expect(shotStyle).toHaveAttribute("aria-pressed", "true");
  await expect(board).toHaveAttribute("data-held", "true");
  expect((await new AxeBuilder({ page }).include("main").analyze()).violations).toEqual([]);
  await testInfo.attach("bloques", { body: await page.screenshot(), contentType: "image/png" });
  await expect(board.locator("[data-barrier]")).toHaveCount(5);
  await page.getByRole("button", { name: "Lanzar la pelota", exact: true }).click();
  await expect(board.locator("[data-barrier]")).toHaveCount(4);
  await expect(board).toHaveAttribute("data-held", "true");
  const answer = savedAnswer(page);
  await page.getByRole("button", { name: "Lanzar la pelota", exact: true }).click();
  const saved = (await (await answer).json()).result;
  expect(saved.progress.responses[`practice:${q.id}`]).toMatchObject({ correct: true, attempts: 1 });
  expect(saved.stars).toBe(0);
  await expect(page.getByRole("heading", { name: "¡Muro derribado!" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test("Estanque en móvil: el D-pad táctil queda debajo del tablero y permite responder", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "móvil", "El D-pad solo se muestra en pantallas táctiles pequeñas.");
  const q = await conceptThenNumeric(page, "fraccion-cantidad", "frogger");
  await page.getByRole("button", { name: "¡Empezar!", exact: true }).click();
  const board = page.locator("main [data-board]");
  const pad = page.getByLabel("Control de movimiento");
  const [boardBox, padBox] = [await board.boundingBox(), await pad.boundingBox()];
  expect(padBox!.y).toBeGreaterThanOrEqual(boardBox!.y + boardBox!.height);
  const frog = Number(await board.getAttribute("data-frog-col"));
  const target = (await pondLabels(page)).indexOf(String(q.answer));
  for (let col = frog; col !== target; col += Math.sign(target - col)) {
    await page.getByRole("button", { name: target > col ? "Mover a la derecha" : "Mover a la izquierda" }).click();
    await expect(board).toHaveAttribute("data-hopping", "false");
  }
  await expect.poll(async () => Math.abs(Number(await board.getAttribute("data-obstacle-col")) - target)).toBeGreaterThanOrEqual(2);
  const answer = savedAnswer(page);
  await page.getByRole("button", { name: "Mover arriba" }).click();
  await expect(board).toHaveAttribute("data-hopping", "false");
  await page.getByRole("button", { name: "Mover arriba" }).click();
  const saved = (await (await answer).json()).result.progress;
  expect(saved.responses[`practice:${q.id}`]).toMatchObject({ response: String(q.answer), correct: true });
  await expect(page.getByRole("heading", { name: "¡Cruzaste el estanque!" })).toBeVisible();
});

test("Topos: tocar el topo envía la respuesta y que se escondan no cuenta", async ({ page }) => {
  const q = await conceptThenNumeric(page, "fracciones-unidad", "topos");
  await page.getByRole("button", { name: "¡Empezar!", exact: true }).click();
  await expect(page.getByText(/Vidas/)).toHaveCount(0);
  expect((await new AxeBuilder({ page }).include("main").analyze()).violations).toEqual([]);
  // Cada topo sale de una cola que recorre todas las opciones: 1/3 acaba saliendo.
  const mole = page.getByRole("button", { name: "Topo con 1/3", exact: true });
  await expect(mole).toBeVisible({ timeout: 10_000 });
  const answer = savedAnswer(page);
  await mole.click();
  const saved = (await (await answer).json()).result;
  expect(saved.progress.responses[`practice:${q.id}`]).toMatchObject({ correct: true, attempts: 1 });
  expect(saved.stars).toBe(0);
  await expect(page.getByRole("heading", { name: "¡Atrapaste al topo!" })).toBeVisible();
});

test("Cajas Sokoban: paredes, deshacer, pausa y entrega elegida sin premiar movimientos", async ({ page }, testInfo) => {
  const q = await conceptThenNumeric(page, "fracciones-unidad", "cajas");
  await page.getByRole("button", { name: "¡Empezar!", exact: true }).click();
  await expectGameInView(page);
  expect((await new AxeBuilder({ page }).include("main").analyze()).violations).toEqual([]);
  const board = page.locator("main [data-sokoban-board]");
  expect(await board.locator('[data-wall="true"]').count()).toBeGreaterThan(0);
  await expect(board.locator('[data-goal="true"]')).toHaveCount(1);
  await expect(board.locator("[data-box-id]")).toHaveCount(5);
  const cells = await board.locator("[data-box-id]").allTextContents();
  const target = cells.map((c) => c.trim()).indexOf("1/3");
  expect(target).toBeGreaterThanOrEqual(0);
  const mobile = testInfo.project.name === "móvil";
  const codes: Record<string, string> = { L: "Left", R: "Right", U: "Up", D: "Down" };
  const names: Record<string, string> = { L: "Mover a la izquierda", R: "Mover a la derecha", U: "Mover arriba", D: "Mover abajo" };
  const press = (dir: string) =>
    mobile
      ? page.getByRole("button", { name: names[dir], exact: true }).click()
      : page.keyboard.press(`Arrow${codes[dir]}`);
  let submissions = 0;
  page.on("request", (request) => { if (request.url().endsWith("/recordLearningAction") && request.postDataJSON()?.data?.action?.kind === "answer") submissions++; });
  await press("D"); // pared del borde: no hay movimiento ni respuesta
  await expect(page.getByText(/Una pared bloquea el paso/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Deshacer", exact: true })).toBeDisabled();
  await press("L");
  await expect(board).toHaveAttribute("data-player-x", "2");
  if (mobile) await page.getByRole("button", { name: "Deshacer", exact: true }).click();
  else await page.keyboard.press("z");
  await expect(board).toHaveAttribute("data-player-x", "3");
  await press("R");
  await page.getByRole("button", { name: "Pausar partida", exact: true }).click();
  if (mobile) await expect(page.getByRole("button", { name: "Mover a la izquierda", exact: true })).toBeDisabled();
  await page.keyboard.press("ArrowLeft"); // la pausa también ignora el teclado
  await expect(board).toHaveAttribute("data-player-x", "4");
  await expect(page.getByRole("button", { name: "Reiniciar cajas", exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "Reanudar partida", exact: true }).click();
  if (!mobile) {
    await page.keyboard.press("z"); // foco en el control externo de reanudar
    await expect(board).toHaveAttribute("data-player-x", "3");
    await press("R");
  }
  await page.getByRole("button", { name: "Reiniciar cajas", exact: true }).click();
  await expect(board).toHaveAttribute("data-player-x", "3");
  expect(await board.locator("[data-box-id]").allTextContents()).toEqual(cells);
  expect(submissions).toBe(0);
  await testInfo.attach("sokoban", { body: await board.screenshot(), contentType: "image/png" });
  const routes = SOKOBAN_SOLUTIONS[(await board.getAttribute("data-warehouse"))!];
  const wrong = target === 0 ? 1 : 0;
  for (const direction of routes[wrong].slice(0, -1)) await press(direction);
  expect(submissions).toBe(0);
  const incorrect = savedAnswer(page);
  await press(routes[wrong].at(-1)!);
  const first = (await (await incorrect).json()).result;
  expect(first.progress.responses[`practice:${q.id}`]).toMatchObject({ correct: false, attempts: 1 });
  expect(first.stars).toBe(0);
  await page.getByRole("button", { name: "Reanudar partida", exact: true }).click();
  for (const direction of routes[target].slice(0, -1)) await press(direction);
  expect(submissions).toBe(1);
  const answer = savedAnswer(page);
  await press(routes[target].at(-1)!);
  const saved = (await (await answer).json()).result;
  expect(saved.progress.responses[`practice:${q.id}`]).toMatchObject({ correct: true, attempts: 2 });
  expect(saved.progress.checkPassedAt).toBeNull();
  expect(saved.stars).toBe(0);
  await expect(page.getByRole("heading", { name: "¡Caja entregada!" })).toBeVisible();
  expect(submissions).toBe(2);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test("Laberinto en móvil: un toque es un paso, el fantasma espera y pisar un número guarda su valor", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "móvil", "Recorrido de los controles táctiles del laberinto.");
  test.setTimeout(180_000);
  const question = await conceptThenNumeric(page, "fraccion-cantidad", "numberpac");
  const board = page.locator("main [data-numberpac-board]");
  let direction: "derecha" | "abajo" | undefined;
  // Busca una salida sin número para observar al fantasma antes de responder.
  for (let attempt = 0; attempt < 8; attempt++) {
    await page.getByRole("button", { name: "¡Empezar!", exact: true }).click();
    const right = board.locator('[data-cell-x="1"][data-cell-y="0"]');
    const down = board.locator('[data-cell-x="0"][data-cell-y="1"]');
    if ((await right.getAttribute("data-value")) === null) direction = "derecha";
    else if ((await down.getAttribute("data-value")) === null) direction = "abajo";
    if (direction) break;
    await page.reload();
  }
  expect(direction).toBeDefined();
  await expect(board.locator(":scope > div")).toHaveCount(25);
  let answers = 0;
  page.on("request", (request) => {
    if (request.url().endsWith("/recordLearningAction") && request.postDataJSON()?.data?.action?.kind === "answer") answers++;
  });
  await page.waitForTimeout(1200);
  await expect(board).toHaveAttribute("data-ghost-x", "4");
  await expect(board).toHaveAttribute("data-ghost-y", "4");
  const button = page.getByRole("button", { name: direction === "derecha" ? "Mover a la derecha" : "Mover abajo", exact: true });
  await button.evaluate((element) => element.scrollIntoView({ block: "center" }));
  const box = await button.boundingBox();
  expect(box).not.toBeNull();
  const touch = await page.context().newCDPSession(page);
  await touch.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: box!.x + box!.width / 2, y: box!.y + box!.height / 2 }] });
  await page.waitForTimeout(500); // mantener pulsado tampoco repite
  await touch.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await expect(board).toHaveAttribute("data-player-x", direction === "derecha" ? "1" : "0");
  await expect(board).toHaveAttribute("data-player-y", direction === "abajo" ? "1" : "0");
  await expect(board).not.toHaveAttribute("data-ghost-y", "4", { timeout: 8000 });
  expect(answers).toBe(0);
  await page.getByRole("button", { name: "Entender esta pantalla", exact: true }).click();
  const pausedBoard = await board.evaluate((element) => ["data-player-x", "data-player-y", "data-ghost-x", "data-ghost-y"].map((attribute) => element.getAttribute(attribute)));
  await page.keyboard.press("ArrowRight");
  await page.waitForTimeout(1200);
  expect(await board.evaluate((element) => ["data-player-x", "data-player-y", "data-ghost-x", "data-ghost-y"].map((attribute) => element.getAttribute(attribute)))).toEqual(pausedBoard);
  expect(answers).toBe(0);
  await page.getByRole("button", { name: "Entendido, seguir" }).click();
  await page.screenshot({ path: testInfo.outputPath("laberinto-movil-tablero.png"), fullPage: true });
  const state = await board.evaluate((element) => ({
    x: Number(element.getAttribute("data-player-x")), y: Number(element.getAttribute("data-player-y")),
    gx: Number(element.getAttribute("data-ghost-x")), gy: Number(element.getAttribute("data-ghost-y")),
    numbers: [...element.querySelectorAll("[data-value]")].map((cell) => ({ x: Number(cell.getAttribute("data-cell-x")), y: Number(cell.getAttribute("data-cell-y")), value: cell.getAttribute("data-value")! })),
    walls: [...element.querySelectorAll('[data-wall="true"]')].map((cell) => `${cell.getAttribute("data-cell-x")},${cell.getAttribute("data-cell-y")}`),
  }));
  type Point = { x: number; y: number };
  const queue: { cell: Point; path: Point[] }[] = [{ cell: state, path: [] }];
  const seen = new Set([`${state.x},${state.y}`]);
  let path: Point[] = [], chosen: string | undefined;
  while (queue.length) {
    const next = queue.shift()!;
    const number = state.numbers.find((n) => n.x === next.cell.x && n.y === next.cell.y);
    if (number) { path = next.path; chosen = number.value; break; }
    for (const [dx, dy] of [[1, 0], [0, 1], [-1, 0], [0, -1]]) {
      const cell = { x: next.cell.x + dx, y: next.cell.y + dy }, key = `${cell.x},${cell.y}`;
      if (cell.x < 0 || cell.x > 4 || cell.y < 0 || cell.y > 4 || state.walls.includes(key) || seen.has(key) || (cell.x === state.gx && cell.y === state.gy)) continue;
      seen.add(key); queue.push({ cell, path: [...next.path, cell] });
    }
  }
  expect(chosen).toBeDefined();
  const saved = savedAnswer(page);
  let position: Point = state;
  for (const cell of path) {
    const name = cell.x > position.x ? "Mover a la derecha" : cell.x < position.x ? "Mover a la izquierda" : cell.y > position.y ? "Mover abajo" : "Mover arriba";
    await page.getByRole("button", { name, exact: true }).tap();
    position = cell;
  }
  const result = (await (await saved).json()).result;
  expect(result.progress.responses[`practice:${question.id}`]).toMatchObject({ response: chosen, attempts: 1 });
  expect(result.stars).toBe(0);
  expect(answers).toBe(1);
  await page.screenshot({ path: testInfo.outputPath("laberinto-movil.png"), fullPage: true });
});

test("Topos sin prisas: las tandas esperan y solo tocar un topo envía la respuesta", async ({ page }, testInfo) => {
  const q = await conceptThenNumeric(page, "fracciones-unidad", "topos");
  await page.getByRole("button", { name: "¡Empezar!", exact: true }).click();
  await expectGameInView(page);
  await page.getByRole("button", { name: "Sin prisas", exact: true }).click();
  const moles = page.getByRole("button", { name: /Topo con/ });
  const labels = await moles.evaluateAll((nodes) => nodes.map((node) => node.getAttribute("aria-label")));
  await page.waitForTimeout(3000); // más que la duración de un topo en modo automático
  expect(await moles.evaluateAll((nodes) => nodes.map((node) => node.getAttribute("aria-label")))).toEqual(labels);
  await page.getByRole("button", { name: "Pausar partida", exact: true }).click();
  await expect(page.getByRole("button", { name: "Siguiente tanda", exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "Reanudar partida", exact: true }).click();
  await expectGameInView(page);
  expect((await new AxeBuilder({ page }).include("main").analyze()).violations).toEqual([]);
  await testInfo.attach("topos-sin-prisas", { body: await page.screenshot(), contentType: "image/png" });
  const target = page.getByRole("button", { name: "Topo con 1/3", exact: true });
  for (let batch = 0; batch < 4 && !(await target.count()); batch++) await page.getByRole("button", { name: "Siguiente tanda", exact: true }).click();
  await expect(target).toBeVisible();
  const answer = savedAnswer(page);
  await target.click();
  const saved = (await (await answer).json()).result;
  expect(saved.progress.responses[`practice:${q.id}`]).toMatchObject({ correct: true, attempts: 1 });
  expect(saved.stars).toBe(0);
  await expect(page.getByRole("heading", { name: "¡Atrapaste al topo!" })).toBeVisible();
});

test("Serpiente: el tablero espera para leer y la pausa conserva el control y la vía escrita", async ({ page }, testInfo) => {
  const q = await conceptThenNumeric(page, "fracciones-unidad", "snake");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.getByRole("button", { name: "¡Empezar!", exact: true }).click();
  await expectGameInView(page);
  const board = page.locator("main [data-snake-board]");
  await page.waitForTimeout(1500);
  await expect(board).toHaveAttribute("data-head-x", "3");
  await expect(board).toHaveAttribute("data-head-y", "4");
  await page.getByRole("button", { name: "Pausar partida", exact: true }).click();
  await page.keyboard.press("ArrowUp");
  await page.waitForTimeout(500);
  await expect(board).toHaveAttribute("data-head-y", "4");
  await page.getByRole("button", { name: "Reanudar partida", exact: true }).click();
  await expectGameInView(page);
  expect(await page.locator('main [data-game="snake"] .arcade-snake-body').first().evaluate((node) => getComputedStyle(node).transitionDuration)).toBe("0s");
  expect((await new AxeBuilder({ page }).include("main").analyze()).violations).toEqual([]);
  await testInfo.attach("serpiente", { body: await page.screenshot(), contentType: "image/png" });
  await page.getByRole("button", { name: "Prefiero escribir la respuesta", exact: true }).click();
  await page.getByRole("textbox", { name: /Tu respuesta/ }).fill("1/3");
  const answer = savedAnswer(page);
  await page.getByRole("button", { name: "Comprobar mi respuesta", exact: true }).click();
  const saved = (await (await answer).json()).result;
  expect(saved.progress.responses[`practice:${q.id}`]).toMatchObject({ correct: true, attempts: 1 });
  expect(saved.stars).toBe(0);
});
