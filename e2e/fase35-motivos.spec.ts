import { expect, test } from "@playwright/test";
import {
  idDeHijo,
  otorgarDominio,
  sembrarMundoDeEjemplo,
  sembrarNivelConTerminal,
  sembrarRacha,
  sesionDeHijo,
} from "./utilidades";

/**
 * Fase 35 (docs/plan-jugabilidad.md §9) — "Motivos para volver mañana": la
 * lógica pura de racha, misión derivada y marcas personales ya está probada
 * a fondo en `streak.test.ts`, `derivedQuest.test.ts` y `records.test.ts`;
 * acá se confirma lo que esos tests aislados no pueden — que las páginas
 * reales las cablean con Firestore de verdad.
 */

function ayer(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Resuelve los dos formatos de enunciado de "Valor posicional"
 *  (aritmeticaTemas.ts:generateValorPosicionalProblem) — no son operaciones
 *  aritméticas simples, así que `resolverEnunciado` no sirve acá. */
function resolverValorPosicional(prompt: string): number | null {
  const cifra = prompt.match(/¿Cuánto vale la cifra (\d) en el número (\d+)\?/);
  if (cifra) {
    const digito = cifra[1];
    const numero = cifra[2];
    const posicionDesdeDerecha = numero.length - 1 - numero.indexOf(digito);
    return Number(digito) * 10 ** posicionDesdeDerecha;
  }
  const compuesto = prompt.match(/¿Qué número se forma con (.+)\?/);
  if (compuesto) {
    // "X centenas, Y decenas y Z unidades" — coma entre los dos primeros,
    // "y" entre los últimos dos: partir por coma pierde el segmento que
    // sigue a "y", así que se recorren TODAS las coincidencias sobre el
    // texto completo en vez de partirlo primero.
    let total = 0;
    for (const m of compuesto[1].matchAll(/(\d+)\s*(centenas|decenas|unidades)/g)) {
      const mult = m[2] === "centenas" ? 100 : m[2] === "decenas" ? 10 : 1;
      total += Number(m[1]) * mult;
    }
    return total;
  }
  return null;
}

const PROMPT_VALOR_POSICIONAL = /(¿Cuánto vale la cifra \d en el número \d+\?)|(¿Qué número se forma con [^?]+\?)/;

/** Espera a que el enunciado visible sea distinto del anterior (o a que la
 *  ronda termine) — leerlo apenas se hace clic en "Comprobar" puede ganarle
 *  a React: se lee el enunciado viejo, se calcula bien SU respuesta, pero
 *  para cuando se envía el formulario ya avanzó a la ronda siguiente, así
 *  que esa respuesta llega equivocada a la ronda nueva. `null` = la carrera
 *  ya terminó (no queda ningún enunciado que leer). */
async function leerProximoEnunciado(page: import("@playwright/test").Page, anterior: string): Promise<string | null> {
  for (let intento = 0; intento < 60; intento++) {
    if (await page.getByText(/¡Misión cumplida!|¡Buen intento!/).isVisible().catch(() => false)) return null;
    try {
      const texto = (await page.getByText(PROMPT_VALOR_POSICIONAL).innerText({ timeout: 300 })).trim();
      if (texto !== anterior) return texto;
    } catch {
      // Todavía no hay un enunciado nuevo (o desapareció un instante entre
      // rondas) — reintentar.
    }
    await page.waitForTimeout(50);
  }
  return null;
}

test.describe("Racha de días jugados", () => {
  test("un día calendario consecutivo sube la racha y el HUD la muestra", async ({ page }) => {
    const { correo } = await sesionDeHijo(page);
    const childId = idDeHijo(page);
    await sembrarRacha(correo, childId, 1, ayer());
    await sembrarMundoDeEjemplo(correo);

    // El despachador (`/jugar/{childId}`) es la única pantalla que llama a
    // `recordStreak` — visitarlo de verdad, no solo /mapa directo.
    await page.goto(`/jugar/${childId}`);
    await page.waitForURL(/\/nivel\//);

    await page.goto(`/jugar/${childId}/mapa`);
    await expect(page.getByText("2 días")).toBeVisible();
  });

  test("sin racha de al menos 2 días, el HUD no muestra el chip", async ({ page }) => {
    const { correo } = await sesionDeHijo(page);
    const childId = idDeHijo(page);
    await sembrarMundoDeEjemplo(correo);

    await page.goto(`/jugar/${childId}/mapa`);
    await expect(page.getByText("Math Quest")).toBeVisible();
    await expect(page.getByText(/días$/)).toHaveCount(0);
  });
});

test.describe("Misión derivada", () => {
  test("con las 3 misiones fijas completas, el diario ofrece una misión extra sobre módulos reales", async ({ page }) => {
    const { correo } = await sesionDeHijo(page);
    const childId = idDeHijo(page);
    // Las 9 misiones fijas de QUESTS (docs/plan-jugabilidad.md §9,
    // world/quests.ts): un acierto real (masteredAt) por objetivo basta,
    // sin jugar ninguna ronda.
    await otorgarDominio(correo, childId, [
      "aritmetica-d1",
      "medicion-d1",
      "geometria-d1",
      "algebra-d1",
      "geometria-d2",
      "aritmetica-d2",
      "logica-d1",
      "aritmetica-d3",
      "geometria-d3",
    ]);

    await page.goto(`/jugar/${childId}/misiones`);
    // `exact: true`: "El apagón" es substring de "El apagón continúa" (la
    // misión derivada que se afirma más abajo), y el matcher de accesible
    // name de Playwright por defecto hace match parcial.
    await expect(page.getByRole("heading", { name: "El apagón", exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "La tienda cerrada" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "El túnel de servicio" })).toBeVisible();
    // La cuarta misión, derivada — nunca null aunque las 3 fijas ya se
    // completaron (criterio de aceptación del plan).
    await expect(page.getByRole("heading", { name: "El apagón continúa" })).toBeVisible();
  });
});

test.describe("Marcas personales", () => {
  test("la primera carrera no muestra marca; la siguiente compara contra la ya guardada", async ({ page }) => {
    const { correo } = await sesionDeHijo(page);
    const childId = idDeHijo(page);
    await otorgarDominio(correo, childId, ["aritmetica-d2"]);
    const { levelId } = await sembrarNivelConTerminal(correo, "aritmetica-valor-posicional", {}, "cohete");

    await page.goto(`/jugar/${childId}/nivel/${levelId}`);
    await page.getByRole("button", { name: /^Terminal —/ }).click();
    await page.getByRole("button", { name: "¡Iniciar misión!" }).click();

    // 8 aciertos (GOAL en CoheteGeneric) ganan la carrera — hasta 10 rondas
    // por margen.
    let enunciadoAnterior = "";
    for (let i = 0; i < 10; i++) {
      const promptText = await leerProximoEnunciado(page, enunciadoAnterior);
      if (promptText === null) break; // la carrera ya terminó
      enunciadoAnterior = promptText;
      const respuesta = resolverValorPosicional(promptText);
      expect(respuesta).not.toBeNull();
      await page.getByRole("textbox").fill(String(respuesta));
      await page.getByRole("button", { name: "Comprobar" }).click();
    }

    // Primera carrera: sin marca previa, la fila "Tu marca" no se muestra.
    await expect(page.getByText("¡Misión cumplida!")).toBeVisible();
    await expect(page.getByText(/Tu marca/)).toHaveCount(0);

    // Segunda carrera: ya hay una marca de 8 guardada — se deja perder por
    // tiempo (0 aciertos) y debe mostrarse "Tu marca: 8", no "¡Nueva marca!".
    await page.getByRole("button", { name: "Jugar de nuevo 🔄" }).click();
    await expect(page.getByText("¡Buen intento!")).toBeVisible({ timeout: 35_000 });
    await expect(page.getByText(/Tu marca/)).toBeVisible();
    await expect(page.getByText(/Nueva marca/)).toHaveCount(0);
  });
});
