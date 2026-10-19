import { expect, test } from "@playwright/test";
import { crearHijo, entrarAlEspacio, entrarAPerfilSinEvaluar, idDeHijo, registrarPadre, sembrarEvaluacion, sesionDeHijo } from "./utilidades";

/**
 * Evaluación de ubicación — uno de los recorridos núcleo de la app (ver
 * README §Pruebas): es opcional y orienta sin acreditar dominio ni bloquear las clases. La lógica pura del motor
 * (franjas, otorgamientos, plan personalizado) y la del generador de
 * medición viven en `src/test/unit/evaluacion.test.ts` (Vitest); los
 * detalles de UI de una sola pregunta o del panel de "puntos de mejora" ya
 * no tienen su propio test — quedan cubiertos de paso por el recorrido
 * completo de acá.
 */
test.describe("Evaluación de ubicación en el navegador", () => {
  test("una cuenta nueva puede aprender y jugar sin evaluación ni niveles creados", async ({ page }) => {
    await registrarPadre(page);
    const { nombre, pin } = await crearHijo(page);
    const childId = await entrarAlEspacio(page, nombre, pin);
    await expect(page.getByRole("link", { name: "Comenzar mi primera clase" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Todavía no hay ninguna aventura" })).toHaveCount(0);
    await page.getByRole("link", { name: "Aventura", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Aventuras", exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: /El apagón/ })).toBeVisible();
    await expect(page).toHaveURL(new RegExp(`/jugar/${childId}/aventura$`));
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
    // vuelta a /evaluacion. Es también la única prueba que ejercita el
    // guardado real de `finishPlacement` de punta a punta (el resto de la
    // suite siembra el resultado directo en Firestore).
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
    // Regresa al espacio educativo incluido, sin contenido preparado por el adulto.
    await expect(page.getByRole("heading", { name: `Hola, ${nombre}. ¿Qué vamos a descubrir?` })).toBeVisible({ timeout: 45_000 });
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
});
