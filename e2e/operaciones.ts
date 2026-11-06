import type { Page } from "@playwright/test";
import { divisionFields, divisionTrace, type DivisionLayout, type Question } from "../src/lib/learning/domain";

const PLACES = ["unidades", "decenas", "centenas", "unidades de millar", "decenas de millar"];

/** Escribe el resultado de una suma o resta en la hoja de columnas. */
export async function escribirColumnas(page: Page, value: string) {
  for (const [i, d] of value.split("").reverse().entries())
    await page.getByLabel(`Resultado: ${PLACES[i]}`, { exact: true }).fill(d);
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
  for (const f of divisionFields(divisionTrace(question.column, layout))) {
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
  }
}
