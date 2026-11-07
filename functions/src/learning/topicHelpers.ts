/**
 * Utilidades de texto compartidas por las clases de `numberTopics.ts`,
 * `algebraTopics.ts`, `geometryTopics.ts` y `dataTopics.ts`: escriben los
 * números con la tipografía del catálogo (coma decimal, «−», espacio fijo en
 * los miles) para que los textos generados con plantillas no dependan de
 * `toLocaleString`.
 */

/** Número con coma decimal, sin errores de coma flotante (hasta 6 decimales). */
export function dec(x: number): string {
  const rounded = Math.round(x * 1e6) / 1e6;
  const [int, frac] = String(Math.abs(rounded)).split(".");
  const grouped = int.length > 4 ? int.replace(/\B(?=(\d{3})+(?!\d))/g, " ") : int;
  return `${rounded < 0 ? "−" : ""}${grouped}${frac ? `,${frac}` : ""}`;
}

/** Entero con signo tipográfico («−3»). */
export const sg = (n: number): string => (n < 0 ? `−${-n}` : String(n));

const SUP = "⁰¹²³⁴⁵⁶⁷⁸⁹";
const SUB = "₀₁₂₃₄₅₆₇₈₉";
/** Exponente en superíndice: sup(3) → «³», sup(−2) → «⁻²». */
export const sup = (n: number): string =>
  (n < 0 ? "⁻" : "") + String(Math.abs(n)).split("").map((d) => SUP[Number(d)]).join("");
/** Subíndice: sub(2) → «₂» (la base de un logaritmo). */
export const sub = (n: number): string => String(n).split("").map((d) => SUB[Number(d)]).join("");

export const gcd = (a: number, b: number): number => (b === 0 ? Math.abs(a) : gcd(b, a % b));

/** Fracción irreducible como texto («3/4», «5» si es entera). */
export function frac(n: number, d: number): string {
  const g = gcd(n, d) || 1;
  const [p, q] = [n / g, d / g];
  return q === 1 ? sg(p) : `${sg(p)}/${q}`;
}

/** Divisores de n en orden creciente. */
export function divisors(n: number): number[] {
  const small: number[] = [];
  const large: number[] = [];
  for (let d = 1; d * d <= n; d++)
    if (n % d === 0) {
      small.push(d);
      if (d * d !== n) large.unshift(n / d);
    }
  return [...small, ...large];
}

/** Parejas a × b = n con a ≤ b. */
export function divisorPairs(n: number): [number, number][] {
  return divisors(n)
    .filter((d) => d * d <= n)
    .map((d) => [d, n / d]);
}

/** Factores primos de n, repetidos y en orden: 60 → [2, 2, 3, 5]. */
export function primeFactors(n: number): number[] {
  const out: number[] = [];
  let rest = n;
  for (let p = 2; p * p <= rest; p++)
    while (rest % p === 0) {
      out.push(p);
      rest /= p;
    }
  if (rest > 1) out.push(rest);
  return out;
}

/** Descomposición con potencias: 72 → «2³ × 3²». */
export function powerForm(n: number): string {
  const counts = new Map<number, number>();
  for (const p of primeFactors(n)) counts.set(p, (counts.get(p) ?? 0) + 1);
  return [...counts].map(([p, e]) => (e === 1 ? String(p) : `${p}${sup(e)}`)).join(" × ");
}

export const isPrime = (n: number): boolean => n > 1 && primeFactors(n).length === 1;

/** «la lista 1, 2 y 3». */
export function list(items: (string | number)[]): string {
  const texts = items.map(String);
  return texts.length <= 1 ? texts.join("") : `${texts.slice(0, -1).join(", ")} y ${texts.at(-1)}`;
}
