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
  test("el registro de misión muestra las otras zonas con su identidad narrativa", async ({ page }) => {
    await sesionDeHijo(page);
    await page.getByRole("button", { name: "Comenzar a explorar ▸" }).click();
    await page.getByRole("button", { name: "Abrir registro de misión" }).click();

    const registro = page.getByRole("dialog", { name: "El apagón" });
    await expect(registro.getByText("Ciudad Central")).toBeVisible();
    await expect(registro.getByText("Laboratorio Futuro")).toBeVisible();
    await expect(registro.getByText("Desierto Geométrico")).toBeVisible();
    await expect(registro.getByText("Cumbres Numéricas")).toBeVisible();
    await expect(registro.getByText("Islas del Pensamiento")).toBeVisible();
    // El progreso visual es puramente decorativo sobre isMastered/isUnlocked.
    await expect(registro.getByRole("progressbar", { name: "Progreso en Ciudad Central" })).toHaveAttribute(
      "aria-valuenow",
      "0",
    );

    await registro.getByRole("link", { name: /Aritmética/ }).click();
    await expect(page).toHaveURL(/\/aritmetica$/);
    await expect(page.getByText("Resolver cálculos genera AXIA y despierta la ciudad dormida.")).toBeVisible();
  });

  test("Tu próximo desafío enlaza al módulo real recomendado, no a un id inventado", async ({ page }) => {
    await sesionDeHijo(page);
    await page.getByRole("button", { name: "Comenzar a explorar ▸" }).click();

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
    await page.getByRole("button", { name: "Comenzar a explorar ▸" }).click();
    await page.getByRole("button", { name: "Abrir registro de misión" }).click();
    await page.getByRole("link", { name: "Central eléctrica · Boss Challenge" }).click();

    await expect(page).toHaveURL(/\/boss$/);
    await expect(page.getByRole("heading", { name: "Boss Challenge" })).toBeVisible();
    await expect(page.getByText(/Boss Challenge · 1\/\d/)).toBeVisible();
  });
});

test.describe("Mundo: Ciudad Central (misión «El apagón»)", () => {
  test("hablar con la Dra. Nia desbloquea la terminal, y resolverla guarda el intento real", async ({ page }) => {
    await sesionDeHijo(page);
    const estrellas = page.locator("header").getByText(/^AXIA:\s*-?\d+$/);
    await expect(estrellas).toHaveText("AXIA: 0");

    // El briefing de misión abre la partida.
    await page.getByRole("button", { name: "Comenzar a explorar ▸" }).click();

    // La Dra. Nia es el primer paso: diálogo de 3 líneas, siempre se puede
    // volver a saludar (no es un objetivo con moduleId real).
    await page.getByRole("button", { name: /^Dra\. Nia —/ }).click();
    const dialogoNia = page.getByRole("dialog", { name: "Dra. Nia" });
    await expect(dialogoNia).toBeVisible();
    await dialogoNia.getByRole("button", { name: "Continuar ▸" }).click();
    await dialogoNia.getByRole("button", { name: "Continuar ▸" }).click();
    await dialogoNia.getByRole("button", { name: "¡Voy a por el código!" }).click();
    await expect(dialogoNia).not.toBeVisible();

    // La terminal (aritmetica-d1) queda disponible: resolverla es un intento real.
    await page.getByRole("button", { name: /^Terminal de acceso —/ }).click();
    const ficha = page.getByRole("dialog", { name: "Terminal de acceso" });
    await expect(ficha).toBeVisible();

    const enunciado = await ficha.getByText(/¿Cuánto es \d+ \+ \d+\?/).innerText();
    const objetivo = resolverEnunciado(enunciado)!;
    const recta = ficha.getByRole("slider");
    await recta.focus();
    let actual = Number(await recta.getAttribute("aria-valuenow"));
    while (actual !== objetivo) {
      await page.keyboard.press(actual < objetivo ? "ArrowRight" : "ArrowLeft");
      actual = Number(await recta.getAttribute("aria-valuenow"));
    }
    await ficha.getByRole("button", { name: "Responder" }).click();

    // Dos textos coinciden con "CÓDIGO ACEPTADO": el propio de la ficha de
    // terminal (con el código) y el de consecuencia narrativa del hotspot.
    await expect(ficha.getByText(/CÓDIGO ACEPTADO: \d/)).toBeVisible();
    await ficha.getByRole("button", { name: "Seguir explorando" }).click();

    // El intento se guardó de verdad: el saldo sale de starLedger, no del mundo.
    await expect(estrellas).not.toHaveText("AXIA: 0");
  });

  test("resolver la compuerta con las tres etapas ya superadas restaura la central", async ({ page }) => {
    const { correo } = await sesionDeHijo(page);
    const childId = idDeHijo(page);
    // Terminal y medidor ya superados de verdad: solo falta la compuerta
    // (geometria-d1, "Lados de figuras", sin prerrequisitos).
    await otorgarDominio(correo, childId, ["aritmetica-d1", "medicion-d1"]);
    await page.reload();

    await page.getByRole("button", { name: "Comenzar a explorar ▸" }).click();
    await page.getByRole("button", { name: /^Dra\. Nia —/ }).click();
    const dialogoNia = page.getByRole("dialog", { name: "Dra. Nia" });
    await dialogoNia.getByRole("button", { name: "Continuar ▸" }).click();
    await dialogoNia.getByRole("button", { name: "Continuar ▸" }).click();
    await dialogoNia.getByRole("button", { name: "¡Voy a por el código!" }).click();

    await page.getByRole("button", { name: /^Compuerta del generador —/ }).click();
    const ficha = page.getByRole("dialog", { name: "Compuerta del generador" });
    await expect(ficha).toBeVisible();

    const enunciado = await ficha.getByText(/¿Cuántos (lados|vértices) tiene un/).innerText();
    await ficha.getByRole("button", { name: String(respuestaFigura(enunciado)), exact: true }).click();
    await expect(ficha.getByText(/CÓDIGO ACEPTADO/)).toBeVisible();
    await ficha.getByRole("button", { name: "Seguir explorando" }).click();

    // Misión completa: recompensa final (ciudad restaurada).
    await expect(page.getByRole("dialog", { name: "La ciudad vuelve a la vida" })).toBeVisible();
  });

  test("con la misión ya completa, recargar el hub no la vuelve a marcar como nueva", async ({ page }) => {
    const { correo } = await sesionDeHijo(page);
    const childId = idDeHijo(page);
    // Los tres objetivos de "El apagón" ya superados de verdad.
    await otorgarDominio(correo, childId, ["aritmetica-d1", "medicion-d1", "geometria-d1"]);
    await page.reload();

    const registro = page.getByRole("dialog", { name: "El apagón" });
    await expect(registro).toBeVisible();
    // Ya no es una misión nueva: no hay botón de "Comenzar a explorar" (que
    // dejaría al jugador sin salida frente a objetivos ya tachados) — en su
    // lugar se ve el panel completo con las demás zonas.
    await expect(registro.getByText("NUEVA MISIÓN")).not.toBeVisible();
    await expect(registro.getByRole("button", { name: "Comenzar a explorar ▸" })).not.toBeVisible();
    await expect(registro.getByText("Otras zonas")).toBeVisible();
  });

  test("un objeto bloqueado explica el prerrequisito real, sin candados inventados", async ({ page }) => {
    await sesionDeHijo(page);
    await page.getByRole("button", { name: "Comenzar a explorar ▸" }).click();
    await page.getByRole("button", { name: "Abrir registro de misión" }).click();
    await page.getByRole("link", { name: /Aritmética/ }).click();
    await expect(page).toHaveURL(/\/aritmetica$/);

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

    // Dominar de verdad el módulo del objetivo (aritmetica-d1) lo cierra —
    // se refleja igual en el diario y en el registro de la propia escena.
    await otorgarDominio(correo, childId, ["aritmetica-d1"]);
    await page.reload();
    await expect(objetivo).toContainText("Completado:");

    await page.goto(`/jugar/${childId}`);
    await page.getByRole("button", { name: "Comenzar a explorar ▸" }).click();
    await page.getByRole("button", { name: "Abrir registro de misión" }).click();
    const registro = page.getByRole("dialog", { name: "El apagón" });
    await expect(
      registro.getByRole("listitem").filter({ hasText: "Reactivar la terminal de la plaza" }),
    ).toContainText("completado");
  });

  // Ada, la ingeniera, ya no vive en esta pantalla: Ciudad Central pasa a ser
  // la escena de la Dra. Nia y la oferta de "volver a evaluar" se retira por
  // ahora (decisión explícita al portar la misión), sin trasladarse a otro
  // sitio en este cambio.
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
    await expect(celebracion).toContainText("Ciudad Central");

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
