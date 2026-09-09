import { expect, test, type Page } from "@playwright/test";
import { createEmptyLevel } from "@/lib/level/defaults";
import { crearHijo, registrarPadre } from "./utilidades";

/**
 * Editor del Level Editor — Fase 13 (docs/level-editor-plan.md §16.3/§17).
 * Solo corre en el proyecto "chromium" (ver `playwright.config.ts`): el
 * Level Editor todavía no tiene drawers para Toolbox/PropertyPanel por
 * debajo de `lg`.
 *
 * No repite lo que ya prueban `unidad-nivel.spec.ts` (lógica pura de
 * `validateLevel`/`navmesh`/etc.) ni `editor-persistencia.spec.ts` (API de
 * `levelRepository` directa contra el emulador) — acá es la UI real, con
 * clics: crear un nivel, dibujar geometría, colocar entidades, vincular un
 * desafío real, encadenar una regla de evento, guardar, recargar y jugarlo
 * en Play Test. Además: deshacer/rehacer, atajos de teclado, recuperación
 * de borrador local y la prueba de extensibilidad (tipo `palanca`, A10).
 */

async function crearYAbrirNivel(page: Page, nombre: string): Promise<void> {
  await page.goto("/panel/editor");
  await page.getByRole("button", { name: "Nuevo nivel" }).click();
  await page.getByLabel("Nombre del nivel").fill(nombre);
  await page.getByRole("button", { name: "Crear nivel" }).click();
  await expect(page.getByText(nombre, { exact: true }).first()).toBeVisible();
  await page.getByRole("link", { name: "Abrir" }).click();
  await expect(page.getByLabel("Nombre del nivel")).toHaveValue(nombre);
}

/** Con zoom 1 y pan (0,0) — el estado por defecto de un nivel recién
 *  abierto — el lienzo corresponde 1:1 al sistema de % de imagen.
 *
 *  El % se mide contra el "stage" (`.editor-canvas > div`, con
 *  `aspectRatio` fijado por el fondo), no contra `.editor-canvas` mismo:
 *  ese contenedor exterior llena todo el alto disponible del flex, que
 *  suele ser mayor que el alto del stage (letterboxing vertical) —
 *  medir contra él manda clics por debajo del área real del lienzo. */
async function clickLienzo(page: Page, xPct: number, yPct: number): Promise<void> {
  const box = await page.locator(".editor-canvas > div").first().boundingBox();
  if (!box) throw new Error("No encontré el lienzo del editor");
  await page.mouse.click(box.x + (xPct / 100) * box.width, box.y + (yPct / 100) * box.height);
}

test.describe("Editor — flujo de autoría por UI", () => {
  test("crear, dibujar, colocar, vincular un desafío, encadenar un evento, guardar, recargar y jugarlo", async ({ page }) => {
    await registrarPadre(page);
    await crearHijo(page, { nombre: "Ana" });
    await crearYAbrirNivel(page, "Nivel de prueba UI");

    // Paso 4: zona prohibida dentro del área transitable por defecto (10,10)-(90,90).
    await page.getByRole("button", { name: "Zona prohibida" }).click();
    await clickLienzo(page, 30, 30);
    await clickLienzo(page, 40, 30);
    await clickLienzo(page, 40, 40);
    await clickLienzo(page, 30, 40);
    await page.getByRole("button", { name: "Cerrar" }).click();
    // `closeDraft` selecciona el polígono recién creado (así se abre el panel
    // de propiedades de un tirón) — no hay botón "Seleccionar" en el toolbox,
    // así que Escape es la forma de deseleccionar.
    await page.keyboard.press("Escape");
    await expect(page.getByText("4 vértices")).toHaveCount(0);

    // Paso 5: punto de inicio, lejos de la zona prohibida.
    await page.getByRole("button", { name: "Punto de inicio" }).click();
    await clickLienzo(page, 20, 80);

    // Paso 7: terminal.
    await page.locator("aside").filter({ hasText: "Objetos" }).getByRole("button", { name: "Terminal" }).click();
    await clickLienzo(page, 70, 70);
    await expect(page.getByRole("heading", { name: "Terminal", level: 2 })).toBeVisible();

    // Rótulo propio del tipo (derivado de EntityTypeDef.properties, sin switch en el panel).
    await page.getByLabel("Rótulo").fill("TERMINAL DE PRUEBA");

    // Punto de espera de Alex frente a la terminal.
    await page.getByRole("button", { name: "Fijar punto de espera" }).click();
    await clickLienzo(page, 65, 75);
    await expect(page.getByRole("button", { name: "Cambiar punto de espera" })).toBeVisible();

    // Paso 10: vincular un desafío real — vista previa con datos reales, sin enunciado inventado.
    await page.getByRole("button", { name: "Vincular desafío" }).click();
    await page.getByPlaceholder("Buscar módulo…").fill("Sumas hasta 5");
    await page.getByRole("button", { name: /Sumas hasta 5/ }).click();
    await expect(page.getByText(/¿Cuánto es/)).toBeVisible();
    await page.getByRole("button", { name: /Vincular Sumas hasta 5/ }).click();
    await expect(page.getByText(/Sumas hasta 5/)).toBeVisible();

    // Paso 11-13: regla ON_CHALLENGE_SUCCESS -> CHANGE_OBJECT_STATE(terminal, "on").
    await page.getByRole("button", { name: "Regla nueva" }).click();
    await page.getByLabel("Tipo").selectOption("ON_CHALLENGE_SUCCESS");
    await page.locator("label", { hasText: "Desafío" }).locator("select").selectOption({ label: "aritmetica-d1" });

    await page.getByRole("button", { name: "Añadir acción" }).click();
    const acciones = page.locator("section").filter({ has: page.getByRole("heading", { name: "Acciones", level: 3 }) });
    await acciones.locator("select").first().selectOption("CHANGE_OBJECT_STATE");
    await acciones.getByLabel("Entidad").selectOption({ label: "Terminal" });
    await acciones.getByLabel("Estado (id)").fill("on");

    // Sin errores: "Probar" debe estar habilitado antes de guardar.
    await expect(page.getByRole("button", { name: "Probar", exact: true })).toBeEnabled();

    // Guardar — el indicador pasa Guardando… → Guardado ✓.
    await page.getByRole("button", { name: "Guardar" }).click();
    await expect(page.getByText("Guardado ✓")).toBeVisible();

    // Recargar: no debe aparecer la barra de "borrador local" (el guardado la limpió) y el contenido persiste.
    await page.reload();
    await expect(page.getByText("Hay cambios locales")).toHaveCount(0);
    await expect(page.getByLabel("Nombre del nivel")).toHaveValue("Nivel de prueba UI");
    await expect(page.getByRole("button", { name: /^Terminal —/ })).toBeVisible();

    // Play Test: el mismo runtime del juego real, dentro del editor.
    await page.getByRole("button", { name: "Probar", exact: true }).click();
    await expect(page.getByText("Modo prueba")).toBeVisible();
    await page.getByRole("button", { name: /^Terminal —/ }).click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible({ timeout: 8_000 });
    const promptText = (await dialog.innerText()).replace(/\s+/g, " ");
    const match = promptText.match(/(-?\d+)\s*\+\s*(-?\d+)/);
    expect(match, `No pude parsear el enunciado: ${promptText}`).toBeTruthy();
    const respuesta = Number(match![1]) + Number(match![2]);
    const slider = dialog.getByRole("slider");
    const actual = Number(await slider.getAttribute("aria-valuenow"));
    await slider.focus();
    for (let i = 0; i < Math.abs(respuesta - actual); i++) {
      await slider.press(respuesta > actual ? "ArrowRight" : "ArrowLeft");
    }
    await dialog.getByRole("button", { name: "Responder" }).click();
    await expect(dialog.getByText(/CÓDIGO ACEPTADO/i)).toBeVisible({ timeout: 5_000 });
    await dialog.getByRole("button", { name: "Seguir explorando" }).click();

    // La regla de evento cambió el estado real de la terminal (data-state, mismo criterio del paso 19).
    await expect(page.locator('[data-entity-id][data-state="on"]')).toBeVisible();

    await page.getByRole("button", { name: "Salir" }).click();
    await expect(page.getByText("Modo prueba")).toHaveCount(0);
    // Play Test corre sobre su propio estado de runtime (useLevelRuntime),
    // no sobre `state.level` del editor — por eso escribe cero veces en
    // Firestore (§11) y por eso, al salir, la terminal vuelve a mostrarse en
    // su estado ORIGINAL del nivel editado ("Apagada"), sin arrastrar lo que
    // pasó dentro de la sesión de prueba. `START_PLAYTEST` también limpia la
    // selección a propósito (editorReducer.ts) para no dejar un panel de
    // propiedades obsoleto, y no se restaura al salir.
    await expect(page.getByRole("button", { name: /^Terminal —/ })).toBeVisible();
  });
});

test.describe("Editor — deshacer/rehacer", () => {
  test("sobre renombrar el nivel, colocar una entidad y borrarla", async ({ page }) => {
    await registrarPadre(page);
    await crearHijo(page, { nombre: "Ana" });
    await crearYAbrirNivel(page, "Nivel original");

    // Renombrar.
    await page.getByLabel("Nombre del nivel").fill("Nivel renombrado");
    await page.getByLabel("Nombre del nivel").blur();
    await expect(page.getByLabel("Nombre del nivel")).toHaveValue("Nivel renombrado");
    await page.keyboard.press("Control+z");
    await expect(page.getByLabel("Nombre del nivel")).toHaveValue("Nivel original");
    await page.keyboard.press("Control+Shift+Z");
    await expect(page.getByLabel("Nombre del nivel")).toHaveValue("Nivel renombrado");

    // Colocar una entidad y borrarla.
    await page.locator("aside").filter({ hasText: "Objetos" }).getByRole("button", { name: "Palanca" }).click();
    await clickLienzo(page, 50, 50);
    await expect(page.getByRole("button", { name: /^Palanca —/ })).toBeVisible();

    await page.keyboard.press("Delete");
    await expect(page.getByRole("button", { name: /^Palanca —/ })).toHaveCount(0);
    await page.keyboard.press("Control+z"); // deshace el borrado
    await expect(page.getByRole("button", { name: /^Palanca —/ })).toBeVisible();
    await page.keyboard.press("Control+z"); // deshace la colocación
    await expect(page.getByRole("button", { name: /^Palanca —/ })).toHaveCount(0);
  });
});

test.describe("Editor — atajos de teclado (§5.6/§17 Fase 13, K8)", () => {
  test("herramientas, duplicar, Tab para recorrer entidades y flechas para mover la selección", async ({ page }) => {
    await registrarPadre(page);
    await crearHijo(page, { nombre: "Ana" });
    await crearYAbrirNivel(page, "Nivel de atajos");

    // W / B: herramientas de dibujo — aria-pressed en el botón del toolbox.
    await page.keyboard.press("w");
    await expect(page.getByRole("button", { name: "Área transitable" })).toHaveAttribute("aria-pressed", "true");
    await page.keyboard.press("Escape");
    await page.keyboard.press("b");
    await expect(page.getByRole("button", { name: "Zona prohibida" })).toHaveAttribute("aria-pressed", "true");
    await page.keyboard.press("Escape");
    // No hay botón "Seleccionar" en el toolbox — "select" es la herramienta
    // implícita por defecto (EditorToolbox.tsx solo tiene botones para
    // dibujar/colocar). Comprobamos "v" por su efecto: ningún botón de
    // herramienta queda con aria-pressed.
    await page.keyboard.press("v");
    await expect(page.getByRole("button", { name: "Área transitable" })).toHaveAttribute("aria-pressed", "false");
    await expect(page.getByRole("button", { name: "Zona prohibida" })).toHaveAttribute("aria-pressed", "false");

    // Colocar dos entidades para poder recorrerlas con Tab.
    await page.locator("aside").filter({ hasText: "Objetos" }).getByRole("button", { name: "Palanca" }).click();
    await clickLienzo(page, 30, 30);
    await page.locator("aside").filter({ hasText: "Objetos" }).getByRole("button", { name: "Palanca" }).click();
    await clickLienzo(page, 70, 70);
    const palancas = page.getByRole("button", { name: /^Palanca( \(copia\))? —/ });
    await expect(palancas).toHaveCount(2);

    // Ctrl+D: duplicar la seleccionada (la última colocada). El nombre de la
    // copia lleva el sufijo "(copia)" (editorReducer.ts, DUPLICATE_ENTITY).
    await page.keyboard.press("Control+d");
    await expect(palancas).toHaveCount(3);
    await page.keyboard.press("Control+z"); // deshace el duplicado, vuelve a 2

    // Tab (con nada enfocado) recorre entidades sin necesitar clic.
    await page.keyboard.press("Escape"); // deselecciona y quita el foco de cualquier control
    await page.locator("body").click({ position: { x: 5, y: 5 } }); // clic fuera de cualquier control interactivo
    await page.keyboard.press("Tab");
    const primeraSeleccionada = page.locator('[data-entity-id][class*="editor-selected"]');
    await expect(primeraSeleccionada).toHaveCount(1);
    const primerId = await primeraSeleccionada.getAttribute("data-entity-id");

    // Flechas: nudge de 0.5% (o 0.1% con Shift) sobre la entidad seleccionada.
    const antes = await page.locator(`[data-entity-id="${primerId}"]`).boundingBox();
    await page.keyboard.press("ArrowRight");
    const despues = await page.locator(`[data-entity-id="${primerId}"]`).boundingBox();
    expect(antes).not.toBeNull();
    expect(despues).not.toBeNull();
    expect(despues!.x).toBeGreaterThan(antes!.x);
  });
});

test.describe("Editor — recuperación de borrador local", () => {
  test("ofrece Recuperar/Descartar cuando hay un borrador local más nuevo que el servidor", async ({ page }) => {
    await registrarPadre(page);
    await crearHijo(page, { nombre: "Ana" });
    await crearYAbrirNivel(page, "Nivel con borrador");

    const levelId = page.url().match(/\/panel\/editor\/([^/]+)/)![1];

    // Simula un cierre no limpio: un borrador en localStorage con `savedAt`
    // más reciente que `metadata.updatedAt` del documento vivo — un
    // `LevelDefinition` completo de verdad (no un objeto parcial): el editor
    // lo aplica tal cual al "Recuperar", sin rellenar campos que falten.
    const draftLevel = { ...createEmptyLevel("padre-de-prueba", "Nombre recuperado del borrador", {
      src: "/illustrations/city-central.webp",
      width: 1600,
      height: 907,
      alt: "Fondo de prueba",
      projection: "flat" as const,
    }), id: levelId };
    await page.evaluate(
      ({ id, level }) => {
        const draft = { savedAt: Date.now() + 60_000, level };
        window.localStorage.setItem(`level-editor-draft:${id}`, JSON.stringify(draft));
      },
      { id: levelId, level: draftLevel },
    );

    await page.reload();
    await expect(page.getByText("Hay cambios locales sin guardar más recientes que el servidor.")).toBeVisible();

    await page.getByRole("button", { name: "Recuperar" }).click();
    await expect(page.getByLabel("Nombre del nivel")).toHaveValue("Nombre recuperado del borrador");
    await expect(page.getByText("Hay cambios locales")).toHaveCount(0);
  });

  test("Descartar deja el contenido del servidor intacto y no vuelve a ofrecer el mismo borrador", async ({ page }) => {
    await registrarPadre(page);
    await crearHijo(page, { nombre: "Ana" });
    await crearYAbrirNivel(page, "Nivel con borrador 2");
    const levelId = page.url().match(/\/panel\/editor\/([^/]+)/)![1];

    await page.evaluate((id) => {
      const draft = { savedAt: Date.now() + 60_000, level: { id, name: "Nombre que se descarta" } };
      window.localStorage.setItem(`level-editor-draft:${id}`, JSON.stringify(draft));
    }, levelId);

    await page.reload();
    await expect(page.getByText("Hay cambios locales sin guardar más recientes que el servidor.")).toBeVisible();
    await page.getByRole("button", { name: "Descartar" }).click();
    await expect(page.getByLabel("Nombre del nivel")).toHaveValue("Nivel con borrador 2");

    await page.reload();
    await expect(page.getByText("Hay cambios locales")).toHaveCount(0);
  });
});

test.describe("Editor — extensibilidad (criterio A10)", () => {
  test("el tipo de entidad de prueba 'palanca' aparece en toolbox, canvas y panel sin más cambios", async ({ page }) => {
    await registrarPadre(page);
    await crearHijo(page, { nombre: "Ana" });
    await crearYAbrirNivel(page, "Nivel de extensibilidad");

    const boton = page.locator("aside").filter({ hasText: "Objetos" }).getByRole("button", { name: "Palanca" });
    await expect(boton).toBeVisible();
    await boton.click();
    await clickLienzo(page, 50, 50);

    const entidad = page.getByRole("button", { name: "Palanca — Abajo" });
    await expect(entidad).toBeVisible();
    await expect(entidad).toHaveAttribute("data-state", "abajo");

    // Panel de propiedades: mismo genérico que cualquier otro tipo, sin switch.
    await expect(page.getByRole("heading", { name: "Palanca", level: 2 })).toBeVisible();
    await expect(page.getByLabel("Etiqueta")).toHaveValue("Palanca");
  });
});
