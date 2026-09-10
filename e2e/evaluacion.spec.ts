import { expect, test } from "@playwright/test";
import {
  crearHijo,
  entrarAPerfilSinEvaluar,
  idDeHijo,
  registrarPadre,
  resolverEnunciado,
  sembrarEvaluacion,
  sesionDeHijo,
} from "./utilidades";

/**
 * Evaluación de ubicación en el navegador de verdad — la lógica pura del
 * motor (franjas, otorgamientos, plan personalizado) y la del generador de
 * medición viven en `src/test/unit/evaluacion.test.ts` (Vitest).
 */
test.describe("Evaluación de ubicación en el navegador", () => {
  test("sin evaluación completa, el niño no puede entrar al mundo: todo redirige a la evaluación", async ({
    page,
  }) => {
    await registrarPadre(page);
    const { nombre, pin } = await crearHijo(page);
    await entrarAPerfilSinEvaluar(page, nombre, pin);

    await expect(page.getByRole("heading", { name: "Evaluación inicial" })).toBeVisible();
    // Es obligatoria la primera vez: no hay forma de omitirla.
    await expect(page.getByRole("link", { name: "Omitir por ahora" })).toBeHidden();

    // Ni siquiera navegando directo a la ciudad: el mundo redirige de vuelta.
    const childId = idDeHijo(page);
    await page.goto(`/jugar/${childId}`);
    await expect(page).toHaveURL(/\/evaluacion$/);
  });

  test("empezar la evaluación arranca en Aritmética y avanza de pregunta al acertar", async ({ page }) => {
    await registrarPadre(page);
    const { nombre, pin } = await crearHijo(page);
    await entrarAPerfilSinEvaluar(page, nombre, pin);
    await expect(page.getByRole("heading", { name: "Evaluación inicial" })).toBeVisible();

    await page.getByRole("button", { name: "Activar la terminal ▸" }).click();
    await expect(page.getByText(/Hilo 1 de 5.*Aritmética/)).toBeVisible();
    await expect(page.getByText("Pregunta 1")).toBeVisible();

    // La primera pregunta de Aritmética es siempre una suma con recta
    // numérica (arithmetic.ts, case 1) — mismo patrón ya probado en
    // juego.spec.ts para aritmetica-d1.
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
    await expect(page.getByRole("status")).toContainText("¡Correcto!");

    await page.getByRole("button", { name: "Siguiente" }).click();
    await expect(page.getByText(/Hilo 1 de 5.*Aritmética/)).toBeVisible();
    await expect(page.getByText("Pregunta 2")).toBeVisible();
  });

  test("completar la evaluación real (sin atajos de Firestore) deja jugar sin volver a pedirla", async ({
    page,
  }) => {
    // Hasta 5 hilos con varias franjas cada uno, contestando de a un paso
    // por control: más largo que el timeout por defecto de Playwright.
    test.setTimeout(180_000);
    // Reproduce el bug real: `finishPlacement` podía tragarse un error de
    // guardado y mostrar igual "evaluación completada" — placementStatus
    // nunca quedaba en "completo" y el niño caía en un bucle silencioso de
    // vuelta a /evaluacion. El resto de las pruebas siembra el resultado
    // directo en Firestore (`sembrarEvaluacion`), así que ninguna ejercitaba
    // el guardado real de `finishPlacement` de punta a punta.
    await registrarPadre(page);
    const { nombre, pin } = await crearHijo(page);
    await entrarAPerfilSinEvaluar(page, nombre, pin);

    await page.getByRole("button", { name: "Activar la terminal ▸" }).click();

    // Todos los controles de respuesta viven dentro de <main>: el botón de
    // sonido del encabezado queda fuera, así que un "primer botón visible"
    // dentro de <main> nunca lo confunde con una respuesta.
    const contenido = page.locator("main");

    // No importa acertar: la evaluación siempre termina (techo de 2 fallos
    // seguidos o franja máxima del hilo), así que basta con contestar lo
    // que sea en cada tipo de control hasta llegar a resultados.
    for (let guard = 0; guard < 400; guard++) {
      if (await page.getByRole("heading", { name: "¡Evaluación completada" }).isVisible()) break;

      const siguiente = contenido.getByRole("button", { name: "Siguiente" });
      if (await siguiente.isVisible()) {
        await siguiente.click();
        continue;
      }

      const responder = contenido.getByRole("button", { name: "Responder" });
      const comprobar = contenido.getByRole("button", { name: "Comprobar" });
      const aSueltas = contenido.getByRole("button", { name: "A sueltas" });
      const pesoBtn = contenido.getByRole("button", { name: /^Peso / }).first();

      if (await responder.isVisible()) {
        await responder.click();
      } else if (await comprobar.isVisible()) {
        // El campo tiene `aria-label` y `aria-labelledby` a la vez: el
        // segundo gana, así que su nombre accesible es el enunciado, no
        // "Tu respuesta" — se ubica por rol dentro de <main> en su lugar.
        await contenido.getByRole("textbox").fill("0");
        await comprobar.click();
      } else if (await aSueltas.isVisible()) {
        // Una ficha por vuelta: el propio bucle exterior repite hasta
        // repartirlas todas (el botón desaparece en cuanto se responde,
        // así que un bucle interno corre el riesgo de quedar esperando un
        // elemento que ya no existe).
        await aSueltas.click();
      } else if (await pesoBtn.isVisible()) {
        await pesoBtn.click();
      } else {
        // Ningún control conocido visible todavía: puede ser la pantalla
        // transitoria "Guardando tu evaluación…" (sin botones) mientras
        // `finishPlacement` escribe en Firestore, o el primer render de la
        // siguiente pregunta. Solo si hay botones de verdad asumimos que es
        // una pregunta tipo "choice" (etiquetas que pueden ser símbolos, no
        // dígitos); si no hay ninguno, se espera y se reintenta.
        const opciones = contenido.getByRole("button");
        if ((await opciones.count()) > 0) {
          await opciones.first().click();
        } else {
          await page.waitForTimeout(200);
        }
      }
    }

    await expect(page.getByRole("heading", { name: "¡Evaluación completada" })).toBeVisible();
    // Nunca la pantalla de "no se pudo guardar" — el guardado real funcionó.
    // (Next.js siempre tiene su propio anunciador de rutas con role="alert"
    // en el body, así que el chequeo se acota a <main>.)
    await expect(contenido.getByRole("alert")).toBeHidden();

    await page.getByRole("link", { name: "Empezar a practicar" }).click();
    // La prueba del bug: si `placementStatus` no quedó en "completo", esto
    // redirige de vuelta a /evaluacion en bucle en vez de dejarlo pasar. Este
    // hijo no tiene ningún nivel/mundo sembrado, así que el despachador de
    // /jugar/{childId} (Fase 18) cae en "Todavía no hay ninguna aventura" —
    // es justamente lo que confirma que NO volvió a /evaluacion.
    await expect(page.getByRole("heading", { name: "Todavía no hay ninguna aventura" })).toBeVisible({ timeout: 45_000 });
    await expect(page).not.toHaveURL(/\/evaluacion$/);
  });

  test("una evaluación guardada aparece en el historial del padre con las insignias correctas", async ({ page }) => {
    const { correo } = await sesionDeHijo(page);
    const childId = idDeHijo(page);

    await sembrarEvaluacion(correo, childId, {
      perStrand: {
        aritmetica: { itemsAsked: 4, itemsCorrect: 4, highestTierPassed: 1, gradeBand: "1.º" },
        algebra: { itemsAsked: 2, itemsCorrect: 0, highestTierPassed: -1, gradeBand: "por reforzar las bases" },
        geometria: { itemsAsked: 2, itemsCorrect: 0, highestTierPassed: -1, gradeBand: "por reforzar las bases" },
        medicion: { itemsAsked: 2, itemsCorrect: 0, highestTierPassed: -1, gradeBand: "por reforzar las bases" },
        logica: { itemsAsked: 2, itemsCorrect: 0, highestTierPassed: -1, gradeBand: "por reforzar las bases" },
      },
      overallScore: 22,
      overallGradeBand: "1.º",
      grantedModuleIds: ["aritmetica-d1", "aritmetica-d2"],
    });

    await page.goto(`/panel/${childId}`);
    await expect(page.getByText("1.º (22/100)")).toBeVisible();
    await expect(page.getByText("✓ Dominado (evaluación inicial)").first()).toBeVisible();

    // Ada ya no interrumpe sola: la evaluación está completa.
    await page.goto(`/jugar/${childId}`);
    await expect(page.getByText("¿Volvemos a medir tu nivel?")).toBeHidden();
  });

  test("el panel del padre muestra los puntos de mejora de una evaluación con fallos aislados", async ({ page }) => {
    const { correo } = await sesionDeHijo(page);
    const childId = idDeHijo(page);

    await sembrarEvaluacion(correo, childId, {
      perStrand: {
        aritmetica: {
          itemsAsked: 4,
          itemsCorrect: 3,
          highestTierPassed: 3,
          gradeBand: "2.º–3.º",
          weakTiers: [1],
        },
        algebra: { itemsAsked: 2, itemsCorrect: 0, highestTierPassed: -1, gradeBand: "por reforzar las bases" },
        geometria: { itemsAsked: 2, itemsCorrect: 0, highestTierPassed: -1, gradeBand: "por reforzar las bases" },
        medicion: { itemsAsked: 2, itemsCorrect: 0, highestTierPassed: -1, gradeBand: "por reforzar las bases" },
        logica: { itemsAsked: 2, itemsCorrect: 0, highestTierPassed: -1, gradeBand: "por reforzar las bases" },
      },
      overallScore: 40,
      overallGradeBand: "1.º–2.º",
      grantedModuleIds: ["aritmetica-d1", "aritmetica-d2", "aritmetica-d3", "aritmetica-d4"],
    });

    await page.goto(`/panel/${childId}`);
    const puntosDeMejora = page.getByText(/Puntos de mejora:/);
    await expect(puntosDeMejora).toBeVisible();
    // La franja 1 de aritmética es "aritmetica-d2" (Sumas y restas hasta 10).
    await expect(puntosDeMejora).toContainText("Sumas y restas hasta 10");
  });
});
