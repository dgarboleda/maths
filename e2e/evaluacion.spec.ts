import { expect, test } from "@playwright/test";
import { getModule, isMastered, isUnlocked, modulesForStrand } from "../src/lib/curriculum";
import {
  answerPlacementItem,
  currentPlacementModule,
  gradeBandForTier,
  grantsFromPlacement,
  initStrandPlacement,
  strandResultFrom,
  summarizePlacement,
} from "../src/lib/placement";
import type { PlacementStrandRecord, SkillProgress } from "../src/lib/types";
import {
  crearHijo,
  entrarAPerfilSinEvaluar,
  idDeHijo,
  registrarPadre,
  resolverEnunciado,
  sembrarEvaluacion,
  sesionDeHijo,
} from "./utilidades";

test.describe("Motor de evaluación de ubicación (lógica pura)", () => {
  test("arranca siempre en la franja más fácil del hilo, sin nada dado por dominado", () => {
    for (const strandSlug of ["aritmetica", "algebra", "geometria", "medicion", "logica"]) {
      const state = initStrandPlacement(strandSlug);
      expect(state.tiers.length).toBeGreaterThan(0);
      expect(state.pointer).toBe(0);
      expect(state.highestTierPassed).toBe(-1);
      expect(state.done).toBe(false);
      const mod = currentPlacementModule(state);
      expect(mod?.tier).toBe(state.tiers[0]);
    }
  });

  test("dos aciertos seguidos suben de franja sin cerrar el hilo", () => {
    let state = initStrandPlacement("aritmetica");
    const tierInicial = state.tiers[0];
    state = answerPlacementItem(state, true);
    expect(state.done).toBe(false);
    expect(state.highestTierPassed).toBe(tierInicial);

    const tierSiguiente = state.tiers[1];
    state = answerPlacementItem(state, true);
    expect(state.done).toBe(false);
    expect(state.highestTierPassed).toBe(tierSiguiente);
    expect(state.itemsAsked).toBe(2);
    expect(state.itemsCorrect).toBe(2);
  });

  test("dos fallos seguidos cierran el hilo (techo) sin tocar la última franja aprobada", () => {
    let state = initStrandPlacement("aritmetica");
    state = answerPlacementItem(state, true); // pasa la franja 0
    const franjaAprobada = state.highestTierPassed;
    state = answerPlacementItem(state, false);
    expect(state.done).toBe(false); // un solo fallo no cierra el hilo
    state = answerPlacementItem(state, false);
    expect(state.done).toBe(true);
    expect(state.highestTierPassed).toBe(franjaAprobada); // no se acredita la franja fallada

    const resultado = strandResultFrom(state);
    expect(resultado.highestTierPassed).toBe(franjaAprobada);
    expect(resultado.itemsAsked).toBe(3);
    expect(resultado.itemsCorrect).toBe(1);
  });

  test("fallar la franja más fácil dos veces dice 'por reforzar las bases', sin acreditar nada", () => {
    let state = initStrandPlacement("geometria");
    state = answerPlacementItem(state, false);
    state = answerPlacementItem(state, false);
    expect(state.done).toBe(true);
    expect(state.highestTierPassed).toBe(-1);
    expect(gradeBandForTier(state.highestTierPassed)).toBe("por reforzar las bases");
  });

  test("acertar todas las franjas de un hilo lo agota sin necesitar el techo", () => {
    let state = initStrandPlacement("medicion");
    while (!state.done) state = answerPlacementItem(state, true);
    expect(state.highestTierPassed).toBe(state.tiers[state.tiers.length - 1]);
    expect(state.itemsAsked).toBe(state.tiers.length);
  });

  test("otorga como dominados solo los módulos en o por debajo de la franja alcanzada, y no repite lo ya dominado", () => {
    const perStrand: Record<string, PlacementStrandRecord> = {
      aritmetica: { itemsAsked: 5, itemsCorrect: 4, highestTierPassed: 3, gradeBand: gradeBandForTier(3), weakTiers: [] },
      algebra: { itemsAsked: 2, itemsCorrect: 0, highestTierPassed: -1, gradeBand: gradeBandForTier(-1), weakTiers: [] },
    };
    const yaDominado = "aritmetica-d1";
    const progressBySkill: Record<string, SkillProgress> = {
      [yaDominado]: { recentResults: [], recentAccuracy: 1, masteredAt: Date.now(), masteredVia: "practice" },
    };

    const otorgados = grantsFromPlacement(perStrand, progressBySkill);

    const esperadosAritmetica = modulesForStrand("aritmetica")
      .filter((m) => m.tier <= 3 && m.id !== yaDominado)
      .map((m) => m.id);
    for (const id of esperadosAritmetica) expect(otorgados).toContain(id);
    expect(otorgados).not.toContain(yaDominado); // ya lo tenía por práctica real: no se toca
    expect(otorgados.some((id) => getModule(id)?.strandSlug === "algebra")).toBe(false); // -1 no acredita nada
  });

  test("los otorgamientos resuelven prerrequisitos cruzados entre hilos igual que jugando de verdad", () => {
    // algebra-d4 (franja 5) exige algebra-d3 (franja 3) Y aritmetica-d6 (franja 4).
    const conAritmeticaHasta3: Record<string, PlacementStrandRecord> = {
      aritmetica: { itemsAsked: 4, itemsCorrect: 4, highestTierPassed: 3, gradeBand: gradeBandForTier(3), weakTiers: [] },
      algebra: { itemsAsked: 3, itemsCorrect: 3, highestTierPassed: 3, gradeBand: gradeBandForTier(3), weakTiers: [] },
    };
    const progresoParcial: Record<string, SkillProgress> = {};
    for (const id of grantsFromPlacement(conAritmeticaHasta3, {})) {
      progresoParcial[id] = { recentResults: [], recentAccuracy: 1, masteredAt: Date.now(), masteredVia: "placement" };
    }
    expect(isUnlocked(progresoParcial, "algebra-d4")).toBe(false); // falta aritmetica-d6 (franja 4)

    const conAritmeticaHasta4: Record<string, PlacementStrandRecord> = {
      ...conAritmeticaHasta3,
      aritmetica: { itemsAsked: 5, itemsCorrect: 5, highestTierPassed: 4, gradeBand: gradeBandForTier(4), weakTiers: [] },
    };
    const progresoCompleto: Record<string, SkillProgress> = {};
    for (const id of grantsFromPlacement(conAritmeticaHasta4, {})) {
      progresoCompleto[id] = { recentResults: [], recentAccuracy: 1, masteredAt: Date.now(), masteredVia: "placement" };
    }
    expect(isMastered(progresoCompleto, "aritmetica-d6")).toBe(true);
    expect(isUnlocked(progresoCompleto, "algebra-d4")).toBe(true);
  });

  test("el resumen general combina los cinco hilos en un puntaje y una franja aproximada", () => {
    const perStrand: Record<string, PlacementStrandRecord> = {
      aritmetica: { itemsAsked: 5, itemsCorrect: 5, highestTierPassed: 8, gradeBand: gradeBandForTier(8), weakTiers: [] },
      algebra: { itemsAsked: 5, itemsCorrect: 5, highestTierPassed: 9, gradeBand: gradeBandForTier(9), weakTiers: [] },
      geometria: { itemsAsked: 2, itemsCorrect: 0, highestTierPassed: -1, gradeBand: gradeBandForTier(-1), weakTiers: [] },
      medicion: { itemsAsked: 2, itemsCorrect: 0, highestTierPassed: -1, gradeBand: gradeBandForTier(-1), weakTiers: [] },
      logica: { itemsAsked: 2, itemsCorrect: 0, highestTierPassed: -1, gradeBand: gradeBandForTier(-1), weakTiers: [] },
    };
    const resumen = summarizePlacement(perStrand);
    // Dos hilos al tope y tres sin nada: el puntaje queda a la mitad, no en los extremos.
    expect(resumen.overallScore).toBeGreaterThan(20);
    expect(resumen.overallScore).toBeLessThan(80);
    expect(resumen.overallGradeBand).not.toBe("por reforzar las bases");
  });

  test("un fallo aislado queda en weakTiers como 'punto de mejora', sin tocar la franja alcanzada", () => {
    let state = initStrandPlacement("aritmetica"); // franjas 0..8, contiguas
    state = answerPlacementItem(state, true); // franja 0 ✓
    state = answerPlacementItem(state, false); // franja 1 ✗ (aislado)
    state = answerPlacementItem(state, true); // franja 2 ✓ — se recupera
    state = answerPlacementItem(state, true); // franja 3 ✓
    expect(state.done).toBe(false); // nunca hubo 2 fallos seguidos

    const result = strandResultFrom(state);
    expect(result.highestTierPassed).toBe(3);
    expect(result.weakTiers).toEqual([1]);
  });

  test("los fallos que cierran el hilo (techo) no cuentan como punto de mejora", () => {
    let state = initStrandPlacement("aritmetica");
    state = answerPlacementItem(state, true); // franja 0 ✓
    state = answerPlacementItem(state, true); // franja 1 ✓
    state = answerPlacementItem(state, false); // franja 2 ✗ (techo, 1/2)
    state = answerPlacementItem(state, false); // franja 3 ✗ (techo, 2/2)
    expect(state.done).toBe(true);

    const result = strandResultFrom(state);
    expect(result.highestTierPassed).toBe(1);
    expect(result.weakTiers).toEqual([]); // las del techo no son "puntos de mejora"
  });

  test("una re-evaluación con startTier arranca por encima de lo ya aprobado y no pierde ese piso si falla enseguida", () => {
    const state0 = initStrandPlacement("aritmetica", 4);
    expect(state0.pointer).toBe(4); // franjas contiguas: pointer == valor de franja
    expect(state0.startTier).toBe(4);

    let state = state0;
    state = answerPlacementItem(state, false); // franja 4 ✗ (1/2)
    state = answerPlacementItem(state, false); // franja 5 ✗ (2/2, techo inmediato)
    expect(state.done).toBe(true);
    expect(state.highestTierPassed).toBe(-1); // nada aprobado EN ESTA pasada

    const result = strandResultFrom(state);
    // Pero como ya venía acreditado hasta la franja 3, el resultado no cae a "por reforzar las bases".
    expect(result.highestTierPassed).toBe(3);
    expect(result.gradeBand).toBe(gradeBandForTier(3));
  });

  test("con startTier, una franja aprobada en esta pasada pesa más que el piso heredado", () => {
    let state = initStrandPlacement("aritmetica", 4);
    state = answerPlacementItem(state, true); // franja 4 ✓
    state = answerPlacementItem(state, false); // franja 5 ✗ (1/2)
    state = answerPlacementItem(state, false); // franja 6 ✗ (2/2, techo)
    expect(state.done).toBe(true);

    const result = strandResultFrom(state);
    expect(result.highestTierPassed).toBe(4); // lo probado (4) > piso heredado (3)
  });
});

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

    await page.getByRole("button", { name: "Comenzar evaluación" }).click();
    await expect(page.getByText(/Hilo 1 de 5: .*Aritmética/)).toBeVisible();
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
    await expect(page.getByText(/Hilo 1 de 5: .*Aritmética/)).toBeVisible();
    await expect(page.getByText("Pregunta 2")).toBeVisible();
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
