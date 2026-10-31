/**
 * Reconoce la notación matemática escrita en línea que usa el contenido
 * («3/4», «(1 × 2)/(2 × 2)», «√(81 + 144)», «10^?») para dibujarla como se
 * escribe en papel: fracciones apiladas, raíces con vínculo y exponentes.
 *
 * Es conservador a propósito: las unidades («km/h», «L/min», «S/ 2000»), las
 * fechas («6/10/2026») y las palabras con barra quedan como texto.
 */

export type MathNode =
  | { kind: "frac"; num: MathPart[]; den: MathPart[] }
  | { kind: "sqrt"; body: MathPart[] }
  | { kind: "sup"; base: MathPart[]; exp: string };
export type MathPart = string | MathNode;

const SCRIPT = "⁰¹²³⁴⁵⁶⁷⁸⁹₀₁₂₃₄₅₆₇₈₉";
const NUMBER = /^\d+(?:[.,]\d+)?/;
const isLetter = (ch: string | undefined) => !!ch && /[\p{L}]/u.test(ch);
const isDigit = (ch: string | undefined) => !!ch && /\d/.test(ch);

/** Índice del paréntesis que cierra al de `open`, o -1. */
function closing(text: string, open: number): number {
  let depth = 0;
  for (let i = open; i < text.length; i++) {
    if (text[i] === "(") depth++;
    else if (text[i] === ")" && --depth === 0) return i;
  }
  return -1;
}

/** Índice del paréntesis que abre al de `close`, o -1. */
function opening(text: string, close: number): number {
  let depth = 0;
  for (let i = close; i >= 0; i--) {
    if (text[i] === ")") depth++;
    else if (text[i] === "(" && --depth === 0) return i;
  }
  return -1;
}

/** Operando simple que termina justo antes de `end`: número o una sola letra
 *  (con subíndices o exponentes en Unicode). Devuelve su inicio o -1. */
function simpleBefore(text: string, end: number): number {
  let i = end;
  const blank = /(?:\?|_+)$/.exec(text.slice(0, end));
  if (blank) return isLetter(text[end - blank[0].length - 1]) ? -1 : end - blank[0].length;
  while (i > 0 && SCRIPT.includes(text[i - 1])) i--;
  if (isDigit(text[i - 1])) {
    while (i > 0 && (isDigit(text[i - 1]) || ((text[i - 1] === "," || text[i - 1] === ".") && isDigit(text[i - 2])))) i--;
    return isLetter(text[i - 1]) || text[i - 1] === "/" ? -1 : i;
  }
  if (isLetter(text[i - 1]) && !isLetter(text[i - 2]) && text[i - 2] !== "/") {
    // Una letra sola o con coeficiente: «x/3», «4x/4».
    let j = i - 1;
    while (j > 0 && isDigit(text[j - 1])) j--;
    return isLetter(text[j - 1]) ? -1 : j;
  }
  return -1;
}

/** Operando simple que empieza en `start`. Devuelve su fin (exclusivo) o -1. */
function simpleAfter(text: string, start: number): number {
  let i = start;
  const blank = /^(?:\?|_+)/.exec(text.slice(i));
  if (blank) return isLetter(text[i + blank[0].length]) ? -1 : i + blank[0].length;
  const number = NUMBER.exec(text.slice(i));
  if (number) i += number[0].length;
  else if (isLetter(text[i]) && !isLetter(text[i + 1])) i++;
  else return -1;
  while (i < text.length && SCRIPT.includes(text[i])) i++;
  // «6/10/2026» o «km/h» no son fracciones.
  if (isLetter(text[i]) || text[i] === "/") return -1;
  return i;
}

/** Operando a la izquierda de `slash`: grupo entre paréntesis, raíz o simple. */
function operandBefore(text: string, slash: number): [number, MathPart[]] | null {
  if (text[slash - 1] === ")") {
    const open = opening(text, slash - 1);
    if (open < 0) return null;
    const start = text[open - 1] === "√" ? open - 1 : open;
    if (isLetter(text[start - 1])) return null; // f(x)/2: se deja como texto
    const inner = start === open ? text.slice(open + 1, slash - 1) : text.slice(start, slash);
    return [start, parseMath(inner)];
  }
  const start = simpleBefore(text, slash);
  if (start < 0) {
    // Razón entre palabras solo dentro de una fórmula: «sen α = opuesto/hipotenusa».
    const word = /=\s(\p{L}{2,})$/u.exec(text.slice(0, slash));
    const after = /^\p{L}{2,}/u.exec(text.slice(slash + 1));
    return word && after ? [slash - word[1].length, [word[1]]] : null;
  }
  const withRoot = text[start - 1] === "√" ? start - 1 : start;
  return [withRoot, parseMath(text.slice(withRoot, slash))];
}

/** Operando a la derecha de `slash`. */
function operandAfter(text: string, slash: number): [number, MathPart[]] | null {
  const start = slash + 1;
  if (text[start] === "(" || (text[start] === "√" && text[start + 1] === "(")) {
    const open = text[start] === "(" ? start : start + 1;
    const close = closing(text, open);
    if (close < 0 || text[close + 1] === "/") return null;
    const inner = open === start ? text.slice(open + 1, close) : text.slice(start, close + 1);
    return [close + 1, parseMath(inner)];
  }
  const root = text[start] === "√" ? 1 : 0;
  const end = simpleAfter(text, start + root);
  if (end >= 0) return [end, parseMath(text.slice(start, end))];
  // Palabra como denominador de una fórmula: «(final − inicial)/inicial»,
  // «opuesto/hipotenusa». En prosa («consumo/sensores») no hay fórmula.
  const word = /^\p{L}{2,}/u.exec(text.slice(start));
  const formula = text[slash - 1] === ")" || /=\s\p{L}{2,}$/u.test(text.slice(0, slash));
  return word && formula && !/^\p{L}/u.test(text.slice(start + word[0].length)) ? [start + word[0].length, [word[0]]] : null;
}

/** Partes sin fracciones: raíces y exponentes. */
function parseInline(text: string): MathPart[] {
  const parts: MathPart[] = [];
  let buffer = "";
  const flush = () => {
    if (buffer) parts.push(buffer);
    buffer = "";
  };
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === "√") {
      if (text[i + 1] === "(") {
        const close = closing(text, i + 1);
        if (close > 0) {
          flush();
          parts.push({ kind: "sqrt", body: parseMath(text.slice(i + 2, close)) });
          i = close;
          continue;
        }
      }
      const end = simpleAfter(text, i + 1);
      if (end > 0) {
        flush();
        parts.push({ kind: "sqrt", body: [text.slice(i + 1, end)] });
        i = end - 1;
        continue;
      }
    }
    if (ch === "^") {
      const exp = /^(?:[−-]?\d+|\?|[a-zA-Z])/.exec(text.slice(i + 1));
      const base = /(\d+(?:[.,]\d+)?|[a-zA-Z])$/.exec(buffer);
      if (exp && base) {
        buffer = buffer.slice(0, -base[0].length);
        flush();
        parts.push({ kind: "sup", base: [base[0]], exp: exp[0] });
        i += exp[0].length;
        continue;
      }
    }
    buffer += ch;
  }
  flush();
  return parts;
}

/** Divide `text` en texto y nodos matemáticos. */
export function parseMath(text: string): MathPart[] {
  for (let slash = text.indexOf("/"); slash > 0; slash = text.indexOf("/", slash + 1)) {
    if (/\s/.test(text[slash - 1]) || /\s/.test(text[slash + 1] ?? " ")) continue;
    const left = operandBefore(text, slash);
    const right = left && operandAfter(text, slash);
    if (!left || !right) continue;
    const [start, num] = left;
    const [end, den] = right;
    return [...parseMath(text.slice(0, start)), { kind: "frac" as const, num, den }, ...parseMath(text.slice(end))].filter((p) => p !== "");
  }
  return parseInline(text);
}

/** ¿Hay algo que dibujar como fórmula? Evita trabajo en textos corrientes. */
export function hasMath(text: string): boolean {
  return /[/√^]/.test(text) && parseMath(text).some((part) => typeof part !== "string");
}
