import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { LESSONS, type Lesson, type Question } from "../src/lib/learning/domain";
import { crearHijo, entrarAlEspacio, registrarPadre, sembrarClasesTerminadas } from "./utilidades";

/**
 * Auditoría de usabilidad en móvil (no corre en CI: `AUDITORIA=1`). Recorre
 * cada clase pantalla por pantalla —diagnóstico, explicación, ejemplos,
 * guiada, práctica con los nueve minijuegos y comprobación— y anota en
 * `informes/auditoria/<clase>/hallazgos.json` desbordes, recortes, objetivos táctiles
 * pequeños, texto diminuto, violaciones de axe y juegos que no caben en la
 * pantalla. Guarda capturas de las pantallas con hallazgos.
 */
test.skip(!process.env.AUDITORIA, "Auditoría manual: AUDITORIA=1");
test.describe.configure({ mode: "parallel" });
test.use({ actionTimeout: 10_000 });

const OUT = join("informes", "auditoria");
const GAMES = ["frogger", "cohete", "snake", "runner", "numberpac", "invaders", "breakout", "topos", "cajas"] as const;

interface Finding { type: string; detail: string; extra?: string }

async function measure(page: Page): Promise<Finding[]> {
  return page.evaluate(() => {
    const vw = window.innerWidth;
    const out: { type: string; detail: string; extra?: string }[] = [];
    const main = document.querySelector("main") ?? document.body;
    const visible = (el: Element) => {
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      return r.width > 0 && r.height > 0 && cs.visibility !== "hidden" && cs.display !== "none" && Number(cs.opacity) > 0;
    };
    const scrolls = (el: Element) => {
      for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
        const o = getComputedStyle(p).overflowX;
        if (o === "auto" || o === "scroll" || o === "hidden" || o === "clip") return true;
      }
      return false;
    };
    const desc = (el: Element) =>
      (el.getAttribute("aria-label") || (el as HTMLElement).innerText || el.textContent || el.tagName).trim().replace(/\s+/g, " ").slice(0, 90);
    if (document.documentElement.scrollWidth > vw + 1)
      out.push({ type: "desborde-horizontal-de-pagina", detail: `${document.documentElement.scrollWidth}px > ${vw}px` });
    for (const el of main.querySelectorAll("*")) {
      if (!visible(el)) continue;
      const r = el.getBoundingClientRect();
      const parent = el.parentElement?.getBoundingClientRect();
      if ((r.right > vw + 1 || r.left < -1) && !scrolls(el) && !(parent && (parent.right > vw + 1 || parent.left < -1)))
        out.push({ type: "fuera-de-pantalla", detail: desc(el), extra: `${Math.round(r.left)}–${Math.round(r.right)}` });
      const cs = getComputedStyle(el);
      const hasText = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent!.trim());
      if (hasText && (cs.overflowX === "hidden" || cs.textOverflow === "ellipsis" || cs.overflowX === "clip") && el.scrollWidth > el.clientWidth + 2)
        out.push({ type: "texto-recortado", detail: desc(el) });
      if (hasText && parseFloat(cs.fontSize) < 12 && !el.closest("[aria-hidden='true']"))
        out.push({ type: "texto-menor-de-12px", detail: desc(el), extra: cs.fontSize });
      // Texto que se sale de su caja sin que la caja pueda desplazarse.
      if (hasText && el.scrollWidth > el.clientWidth + 2 && cs.overflowX === "visible" && el.clientWidth > 0 && cs.display !== "inline")
        out.push({ type: "texto-desborda-su-caja", detail: desc(el), extra: `${el.scrollWidth}>${el.clientWidth}` });
    }
    for (const el of main.querySelectorAll("button, a[href], input:not([type=hidden]), select, summary, [role=button], [role=slider]")) {
      if (!visible(el) || el.closest("[aria-hidden='true']")) continue;
      const input = el as HTMLInputElement;
      if ((input.type === "radio" || input.type === "checkbox") && el.closest("label")) continue;
      if (el.tagName === "A" && getComputedStyle(el).display === "inline" && el.closest("p, li, dd")) continue;
      const r = el.getBoundingClientRect();
      const minSide = input.type === "range" ? r.height : Math.min(r.width, r.height);
      if (minSide < 24) out.push({ type: "objetivo-tactil-menor-24px", detail: desc(el), extra: `${Math.round(r.width)}×${Math.round(r.height)}` });
      else if (minSide < 44 && input.type !== "range") out.push({ type: "objetivo-tactil-menor-44px", detail: desc(el), extra: `${Math.round(r.width)}×${Math.round(r.height)}` });
    }
    // Juego en curso: ¿se ven a la vez el enunciado y los controles?
    const pad = main.querySelector("[aria-label='Control de movimiento']");
    const game = main.querySelector("div.rounded-3xl");
    if (game && visible(game)) {
      const prompt = [...game.querySelectorAll("p")].find((p) => /font-black/.test(p.className));
      const nav = [...document.querySelectorAll("nav")].find((n) => getComputedStyle(n).position === "fixed");
      const available = window.innerHeight - (nav ? nav.getBoundingClientRect().height : 0);
      if (prompt) {
        const top = prompt.getBoundingClientRect().top;
        const bottom = (pad && visible(pad) ? pad : game).getBoundingClientRect().bottom;
        if (bottom - top > available)
          out.push({ type: "juego-no-cabe-en-pantalla", detail: (prompt.textContent ?? "").slice(0, 90), extra: `${Math.round(bottom - top)}px > ${Math.round(available)}px` });
      }
    }
    return out;
  });
}

function questionFor(lesson: Lesson, text: string, expected?: Question): Question | undefined {
  const norm = (s: string) => s.replace(/\s+/g, " ").trim();
  // Varias formas paralelas comparten enunciado: primero la esperada.
  if (expected && norm(expected.prompt) === norm(text)) return expected;
  const all = [...lesson.diagnostic, ...lesson.guided, ...lesson.practice, ...lesson.checks.flat(), ...lesson.review, ...lesson.mixed, lesson.application];
  return all.find((q) => norm(q.prompt) === norm(text));
}

for (const [lessonIndex, lesson] of LESSONS.entries()) {
  test(`auditoría móvil · ${lesson.id}`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "móvil", "Solo en móvil");
    test.setTimeout(15 * 60_000);
    const dir = join(OUT, lesson.id);
    mkdirSync(dir, { recursive: true });
    const report: { screen: string; findings: Finding[]; axe: string[] }[] = [];
    let shot = 0;
    const audit = async (screen: string) => {
      await page.waitForTimeout(150);
      const findings = await measure(page);
      const axe = (await new AxeBuilder({ page }).include("main").analyze()).violations.map(
        (v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).slice(0, 3).join(" | ")}`,
      );
      report.push({ screen, findings, axe });
      writeFileSync(join(dir, "hallazgos.json"), JSON.stringify(report, null, 1));
      if (findings.length || axe.length || /inicio|juego en curso/.test(screen))
        await page.screenshot({ path: join(dir, `${String(++shot).padStart(2, "0")}-${screen.replace(/[^\w-]+/g, "_").slice(0, 60)}.jpg`), fullPage: true, quality: 45, type: "jpeg" });
    };
    const click = (name: string | RegExp) => page.getByRole("button", { name, exact: typeof name === "string" }).first().click();
    const nextButton = page.getByRole("button", { name: /^(Siguiente actividad|Continuar|Ver mi comprobación y aplicar)$/ });
    const visiblePrompt = async () => {
      const legend = page.locator("main legend").first();
      if (await legend.isVisible().catch(() => false)) return (await legend.textContent({ timeout: 500 })) ?? "";
      return (await page.locator("main div.rounded-3xl p.font-black").first().textContent({ timeout: 500 }).catch(() => "")) ?? "";
    };
    const answer = async (q: Question, submit: string) => {
      // El juego pudo registrar una respuesta durante la medición.
      if (await nextButton.isVisible().catch(() => false)) return;
      const box = page.getByRole("textbox", { name: /Tu respuesta/ });
      if (!q.choices && !(await box.isEnabled().catch(() => false))) {
        await click("Reanudar partida").catch(() => {});
      }
      if (q.choices) {
        // Formas paralelas con el mismo enunciado: vale la opción correcta visible.
        const all = [...lesson.guided, ...lesson.practice, ...lesson.checks.flat()].filter((o) => o.prompt === q.prompt && o.choices);
        const labels = [q, ...all].map((o) => o.choices!.find((c) => c.id === o.answer)!.label);
        for (const label of labels) {
          const radio = page.getByRole("radio", { name: label, exact: true });
          if (await radio.count()) { await radio.check(); break; }
        }
      } else await page.getByRole("textbox", { name: /Tu respuesta/ }).fill(String(q.answer));
      await click(submit);
    };

    await registrarPadre(page);
    const profile = await crearHijo(page, { nombre: "Alex", nacimiento: "2011-03-02" });
    const childId = await entrarAlEspacio(page, profile.nombre, profile.pin);
    await page.goto(`/jugar/${childId}/aprende/${lesson.id}`);
    await expect(page.getByRole("heading", { level: 1, name: lesson.title })).toBeVisible();
    await audit("inicio · diagnóstico");
    await click("Ir a la clase");
    for (let i = 0; i < lesson.sections.length; i++) {
      await expect(page.getByRole("heading", { name: lesson.sections[i].title })).toBeVisible();
      await audit(`clase ${i + 1}`);
      await click(i + 1 < lesson.sections.length ? "Continuar la explicación" : "Ver cómo se resuelve");
    }
    for (let i = 0; i < lesson.examples.length; i++) {
      await expect(page.getByText(`Ejemplo ${i + 1} de ${lesson.examples.length}`)).toBeVisible();
      await audit(`ejemplo ${i + 1}`);
      await click(i + 1 < lesson.examples.length ? "Otro ejemplo razonado" : "Ahora, hazlo con ayuda");
    }
    const activity = (i: number, total: number) => expect(page.getByText(new RegExp(`^Actividad ${i + 1} de ${total}`))).toBeVisible();
    for (let i = 0; i < lesson.guided.length; i++) {
      const q = lesson.guided[i];
      await activity(i, lesson.guided.length);
      await expect(page.locator("main legend").first()).toHaveText(q.prompt);
      await audit(`guiada ${i + 1}`);
      await answer(q, "Comprobar mi respuesta");
      await expect(nextButton).toBeVisible();
      await audit(`guiada ${i + 1} · resuelta`);
      await nextButton.click();
    }
    // Práctica: se fija el juego antes de montar cada ejercicio.
    const setGame = (k: number) =>
      page.evaluate((g) => { (window as { __MATHS_TEST_PRACTICE_GAME__?: string }).__MATHS_TEST_PRACTICE_GAME__ = g; }, GAMES[(lessonIndex + k) % GAMES.length]);
    await setGame(0);
    await page.getByRole("button", { name: /Práctica$/ }).first().click();
    for (let i = 0; i < lesson.practice.length; i++) {
      await activity(i, lesson.practice.length);
      await page.waitForTimeout(300);
      const q = questionFor(lesson, await visiblePrompt(), lesson.practice[i]) ?? lesson.practice[i];
      const game = q.format !== "choice" ? GAMES[(lessonIndex + i) % GAMES.length] : null;
      await audit(`práctica ${i + 1}${game ? ` · ${game} inicio` : ""}`);
      if (game) {
        const start = page.locator("main div.rounded-3xl").getByRole("button", { name: /^¡/ }).first();
        await start.click();
        await page.waitForTimeout(400);
        await audit(`práctica ${i + 1} · ${game} juego en curso`);
        await click("Pausar partida").catch(() => {});
        await click("Prefiero escribir la respuesta");
      }
      await answer(q, "Comprobar mi respuesta");
      await expect(nextButton).toBeVisible();
      await audit(`práctica ${i + 1} · resuelta`);
      await setGame(i + 1);
      await nextButton.click();
    }
    // Comprobación (forma asignada por el servidor).
    await page.getByRole("button", { name: /Comprueba lo que sé$/ }).first().click();
    for (let i = 0; i < 5; i++) {
      await activity(i, 5);
      await expect(page.locator("main legend").first()).toBeVisible();
      const prompt = await visiblePrompt();
      const q = questionFor(lesson, prompt, lesson.checks.map((c) => c[i]).find((c) => c.prompt.replace(/\s+/g, " ").trim() === prompt.replace(/\s+/g, " ").trim()));
      expect(q, `pregunta visible de la comprobación ${i + 1}`).toBeTruthy();
      await audit(`comprobación ${i + 1}`);
      await answer(q!, "Registrar mi respuesta");
      await expect(nextButton).toBeVisible();
      await nextButton.click();
    }
    await audit("resumen");
    writeFileSync(join(dir, "hallazgos.json"), JSON.stringify(report, null, 1));
  });
}

test("auditoría móvil · pantallas generales", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "móvil", "Solo en móvil");
  test.setTimeout(15 * 60_000);
  const dir = join(OUT, "_general");
  mkdirSync(dir, { recursive: true });
  const report: { screen: string; findings: Finding[]; axe: string[] }[] = [];
  let shot = 0;
  const audit = async (screen: string) => {
    // Firestore mantiene conexiones abiertas: «networkidle» nunca llega.
    await page.waitForTimeout(1500);
    const findings = await measure(page);
    const axe = (await new AxeBuilder({ page }).include("main").analyze()).violations.map(
      (v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).slice(0, 3).join(" | ")}`,
    );
    report.push({ screen, findings, axe });
    writeFileSync(join(dir, "hallazgos.json"), JSON.stringify(report, null, 1));
    await page.screenshot({ path: join(dir, `${String(++shot).padStart(2, "0")}-${screen.replace(/[^\w-]+/g, "_").slice(0, 60)}.jpg`), fullPage: true, quality: 45, type: "jpeg" });
  };
  const correo = await registrarPadre(page);
  const profile = await crearHijo(page, { nombre: "Alex", nacimiento: "2011-03-02" });
  for (const path of ["/panel", "/panel/hijos", "/panel/progreso", "/panel/recompensas", "/panel/ajustes"]) {
    await page.goto(path);
    await audit(`familia ${path}`);
  }
  // Volver a la elección de perfil, donde empieza el acceso del estudiante.
  await page.goto("/perfiles");
  const childId = await entrarAlEspacio(page, profile.nombre, profile.pin);
  await sembrarClasesTerminadas(correo, childId, ["enteros-recta", "enteros-suma-resta", "razones"]);
  const base = `/jugar/${childId}`;
  for (const path of ["", "/aprende", "/aprende/diario", "/aprende/ubicacion", "/aprende/repaso-numeros", "/aventura", "/aventura/apagon", "/practicar", "/mapa", "/misiones", "/evaluacion"]) {
    await page.goto(base + path);
    await audit(`estudiante ${path || "/"}`);
  }
  // Sesiones en curso: ubicación, repaso diario y repaso mixto.
  await page.goto(`${base}/aprende/ubicacion`);
  await page.getByRole("button", { name: "Empezar la evaluación" }).click();
  await audit("ubicación · pregunta");
  await page.goto(`${base}/aprende/diario`);
  await page.getByRole("button", { name: /Empezar el repaso de hoy/ }).click();
  await audit("repaso diario · problema");
  await page.goto(`${base}/aprende/repaso-numeros`);
  await page.getByRole("button", { name: "Empezar el repaso mixto" }).click();
  await audit("repaso mixto · problema");
  // Informe familiar con datos.
  await page.goto("/login");
  await audit("login");
});
