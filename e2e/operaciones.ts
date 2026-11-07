import type { Page } from "@playwright/test";
import {
  divisionFields,
  divisionTrace,
  factorTrace,
  ruffiniTrace,
  termName,
  type DivisionLayout,
  type FactorSpec,
  type Question,
  type RuffiniSpec,
} from "../src/lib/learning/domain";

const PLACES = ["unidades", "decenas", "centenas", "unidades de millar", "decenas de millar"];

/** Pone la coma: en el modo guiado, tocando el hueco que aparece cuando se
 *  pide; en el libre, escribiendo «,» en la casilla `casilla` (la coma va
 *  justo después de su cifra). */
async function ponerComa(page: Page, hueco: string, casilla: string) {
  const boton = page.getByRole("button", { name: hueco, exact: true });
  if ((await boton.count()) > 0) await boton.click();
  else await page.getByLabel(casilla, { exact: true }).fill(",");
}

/** Escribe el resultado de una suma o resta en la hoja de columnas y, con
 *  decimales, toca el hueco de la coma (la pone el alumno). */
export async function escribirColumnas(page: Page, value: string, scale = 0) {
  const [integer, fraction = ""] = value.replace(",", ".").split(".");
  const decimalPlaces = ["décimas", "centésimas", "milésimas"];
  for (const [i, d] of integer.split("").reverse().entries())
    await page.getByLabel(`Resultado: ${PLACES[i]}`, { exact: true }).fill(d);
  for (const [i, d] of fraction.padEnd(scale, "0").split("").entries())
    await page.getByLabel(`Resultado: ${decimalPlaces[i]}`, { exact: true }).fill(d);
  // «,» en las décimas (llena): la coma queda a su izquierda.
  if (scale) await ponerComa(page, `Poner la coma con ${scale} ${scale === 1 ? "cifra" : "cifras"} a su derecha`, "Resultado: décimas");
}

/**
 * Escribe en la galera todo el procedimiento correcto: cada cifra del
 * cociente, cada producto (disposición completa) y cada resta con la cifra
 * que baja. `cambiar` sustituye el texto de una casilla para fallar a propósito.
 */
export async function escribirGalera(
  page: Page,
  question: Question,
  layout: DivisionLayout = "completa",
  cambiar: (key: string, text: string) => string = (_, text) => text,
) {
  if (question.column?.op !== "divide") throw new Error("No es una división");
  const trace = divisionTrace(question.column, layout);
  for (const f of divisionFields(trace)) {
    const text = cambiar(f.key, f.text);
    if (f.kind === "q") {
      await page.getByLabel(`Cociente: cifra ${f.step + 1}`, { exact: true }).fill(text);
      continue;
    }
    const kind = f.kind === "p" ? "Producto" : "Resta";
    for (const [i, d] of text.split("").entries())
      await page
        .getByLabel(`${kind} del paso ${f.step + 1}: casilla ${f.width - text.length + i + 1} de ${f.width}`, { exact: true })
        .fill(d);
    // Al bajar la primera cifra decimal, el alumno pone la coma del cociente.
    if (trace.commaAfter !== null && f.key === `r${trace.commaAfter}`)
      await ponerComa(page, `Poner la coma después de la cifra ${trace.commaAfter + 1} del cociente`, `Cociente: cifra ${trace.commaAfter + 1}`);
  }
}

/**
 * Galera abierta (comprobaciones, repasos y ubicación): el cociente alineado
 * a la derecha de sus casillas y, debajo del dividendo, cada fila de la
 * disposición completa en su columna. `cambiar` altera una fila (índice).
 */
export async function escribirGaleraAbierta(page: Page, question: Question, cambiar: (i: number, text: string) => string = (_, t) => t) {
  if (question.column?.op !== "divide") throw new Error("No es una división");
  const trace = divisionTrace(question.column, "completa");
  const n = trace.dividendDigits.length;
  const quotient = trace.quotientText.replace(/[^\d]/g, "");
  const cells = await page.getByLabel(/^Cociente: cifra \d+$/).count();
  for (const [i, d] of quotient.split("").entries())
    await page.getByLabel(`Cociente: cifra ${cells - quotient.length + i + 1}`, { exact: true }).fill(d);
  if (trace.commaAfter !== null)
    await ponerComa(
      page,
      `Poner la coma después de la cifra ${cells - quotient.length + trace.commaAfter + 1} del cociente`,
      `Cociente: cifra ${cells - quotient.length + trace.commaAfter + 1}`,
    );
  const rows = divisionFields(trace).filter((f) => f.kind !== "q");
  for (const [r, f] of rows.entries()) {
    if (r >= 2) await page.getByRole("button", { name: "Añadir fila" }).click();
    const text = cambiar(r, f.text);
    for (const [i, d] of text.split("").entries())
      await page.getByLabel(`Fila ${r + 1}: columna ${f.end - text.length + i + 2} de ${n}`, { exact: true }).fill(d);
  }
}

/** Escribe la tabla de factores primos completa (de menor a mayor primo) y el resultado. */
export async function escribirTabla(page: Page, question: Question) {
  const spec = question.column as FactorSpec;
  const trace = factorTrace(spec);
  for (const [i, row] of trace.rows.entries()) {
    await page.getByLabel(`Primo de la fila ${i + 1}`, { exact: true }).fill(String(row.prime));
    for (const [k, v] of row.next.entries()) await page.getByLabel(`Fila ${i + 2}: número ${k + 1}`, { exact: true }).fill(String(v));
  }
  await page.getByLabel(`${spec.op === "mcd" ? "MCD" : "MCM"} de ${spec.values.join(", ")}`, { exact: true }).fill(String(question.answer));
}

/** Escribe la tabla de Ruffini completa: esquina, coeficientes, productos y sumas. */
export async function escribirRuffini(page: Page, question: Question) {
  const spec = question.column as RuffiniSpec;
  const degree = spec.coefficients.length - 1;
  const steps = ruffiniTrace(spec).steps;
  await page.getByLabel("Esquina de la tabla", { exact: true }).fill(String(spec.root));
  for (const [i, c] of spec.coefficients.entries())
    await page.getByLabel(`Coeficiente de ${termName(degree, i)}`, { exact: true }).fill(String(c));
  for (const [i, s] of steps.entries()) {
    if (i > 0) await page.getByLabel(`Producto de la columna ${i + 1}`, { exact: true }).fill(String(s.product));
    await page.getByLabel(i === degree ? "Resto" : `Suma de la columna ${i + 1}`, { exact: true }).fill(String(s.result));
  }
}
