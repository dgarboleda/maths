import { parseNumber } from "../../../../functions/src/customLessons/schema";

const EPS = 1e-9;
const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : Math.abs(a));

/** Se escribe con el mismo formato que la respuesta: fracción, decimal con coma o entero. */
function formatter(answer: string): (v: number) => string | null {
  const frac = /^\s*[-−]?\d+\s*\/\s*(\d+)\s*$/.exec(answer);
  if (frac) {
    return (v) => {
      for (let d = 1; d <= 100; d++) {
        const n = Math.round(v * d);
        if (Math.abs(n / d - v) < EPS) { const g = gcd(n, d) || 1; return d / g === 1 ? String(n / g) : `${n / g}/${d / g}`; }
      }
      return null;
    };
  }
  const places = (/[.,](\d+)/.exec(answer)?.[1].length ?? 0);
  const comma = answer.includes(",") || !answer.includes(".");
  return (v) => { const s = v.toFixed(places); return comma ? s.replace(".", ",") : s; };
}

/**
 * Alternativas plausibles para una respuesta numérica: errores típicos
 * (fracción invertida, sumar numeradores y denominadores, ±1, ×10, ÷10) y,
 * si faltan, vecinos cercanos. Sin negativos si la respuesta no lo es.
 * `null` si la respuesta no es un número.
 */
export function numericDistractors(answer: string, count: number, existing: readonly string[] = []): string[] | null {
  const value = parseNumber(answer);
  if (value === null || count <= 0) return value === null ? null : [];
  const format = formatter(answer);
  const taken = new Set([answer, ...existing].map((s) => parseNumber(s)).filter((n): n is number => n !== null).map((n) => n.toFixed(6)));
  const out: string[] = [];
  const add = (v: number) => {
    if (out.length >= count || !Number.isFinite(v) || (value >= 0 && v < 0)) return;
    const text = format(v);
    if (text === null) return;
    const key = (parseNumber(text) ?? NaN).toFixed(6);
    if (taken.has(key)) return;
    taken.add(key);
    out.push(text);
  };
  const frac = /^\s*([-−]?\d+)\s*\/\s*(\d+)\s*$/.exec(answer);
  if (frac) {
    const [n, d] = [Number(frac[1].replace("−", "-")), Number(frac[2])];
    if (n !== 0) add(d / n);
    add((n + 1) / d); add((n - 1) / d); add(n / (d + 1)); add(n / Math.max(1, d - 1));
  }
  const step = Number.isInteger(value) ? 1 : 10 ** -((/[.,](\d+)/.exec(answer)?.[1].length) ?? 1);
  add(value + step); add(value - step); add(value * 10); add(value / 10); add(value * 2);
  for (let i = 2; out.length < count && i < 50; i++) { add(value + i * step); add(value - i * step); }
  return out;
}
