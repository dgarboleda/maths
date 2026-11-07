import { describe, expect, test } from "vitest";
import { LESSONS } from "./domain";

/**
 * Auditoría automática del texto de las clases: toda igualdad escrita solo
 * con números («3 × 4 = 12», «1/2 + 1/3 = 5/6», «2³ × 2² = 2⁵») debe ser
 * verdadera, y un resultado no puede repetirse a sí mismo («5/6 = 5/6»). Lo
 * que lleva letras (x, Q1, unidades) o razones «a:b» queda fuera.
 */

type Q = { n: number; d: number };
const gcd = (a: number, b: number): number => (b === 0 ? Math.abs(a) : gcd(b, a % b));
const q = (n: number, d = 1): Q => {
  if (d === 0) throw new Error("división entre 0");
  const g = gcd(n, d) || 1;
  return { n: (Math.sign(d) * n) / g, d: Math.abs(d) / g };
};
const add = (a: Q, b: Q) => q(a.n * b.d + b.n * a.d, a.d * b.d);
const mul = (a: Q, b: Q) => q(a.n * b.n, a.d * b.d);
const div = (a: Q, b: Q) => q(a.n * b.d, a.d * b.n);
const pow = (a: Q, e: Q) => {
  if (e.d !== 1 || Math.abs(e.n) > 30) throw new Error("exponente no entero");
  let r = q(1);
  for (let i = 0; i < Math.abs(e.n); i++) r = mul(r, a);
  return e.n < 0 ? div(q(1), r) : r;
};
const decimal = (text: string): Q => {
  const [int, frac = ""] = text.split(".");
  return q(Number(int + frac), 10 ** frac.length);
};

const SUP = "⁰¹²³⁴⁵⁶⁷⁸⁹⁻";
/** Evalúa una expresión aritmética en notación escolar; `null` si no lo es. */
function evaluate(raw: string): Q | null {
  let text = raw
    .trim()
    .replace(/(?<=\d)[\s ](?=\d{3}\b)/g, "") // 1 000 000
    .replace(/(?<=\d),(?=\d)/g, ".")
    .replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹⁻]+/g, (m) => `^(${[...m].map((c) => (c === "⁻" ? "-" : SUP.indexOf(c))).join("")})`)
    .replace(/[−–]/g, "-")
    .replace(/[×·]/g, "*")
    .replace(/÷/g, ":");
  if (!/\d/.test(text) || /[^0-9.+\-*/:^() ]/.test(text)) return null;
  text = text.replace(/\s+/g, "");
  let i = 0;
  const peek = () => text[i];
  // «a/b» con números es una fracción: liga más fuerte que × y ÷.
  const atom = (): Q => {
    if (peek() === "(") {
      i++;
      const v = sum();
      if (text[i++] !== ")") throw new Error("paréntesis");
      return power(v);
    }
    if (peek() === "-") {
      i++;
      return mul(q(-1), atom());
    }
    const m = /^\d+(?:\.\d+)?/.exec(text.slice(i));
    if (!m) throw new Error("número");
    i += m[0].length;
    let v = decimal(m[0]);
    const f = /^\/(\d+(?:\.\d+)?)/.exec(text.slice(i));
    if (f) {
      i += f[0].length;
      v = div(v, decimal(f[1]));
    }
    return power(v);
  };
  const power = (base: Q): Q => {
    if (peek() !== "^") return base;
    i++;
    return pow(base, atom());
  };
  const product = (): Q => {
    let v = atom();
    while (peek() === "*" || peek() === ":" || peek() === "/") {
      const op = text[i++];
      v = op === "*" ? mul(v, atom()) : div(v, atom());
    }
    return v;
  };
  const sum = (): Q => {
    let v = product();
    while (peek() === "+" || peek() === "-") {
      const op = text[i++];
      const r = product();
      v = op === "+" ? add(v, r) : add(v, mul(q(-1), r));
    }
    return v;
  };
  try {
    const v = sum();
    return i === text.length ? v : null;
  } catch {
    return null;
  }
}

function* texts(value: unknown, path: string): Generator<[string, string]> {
  if (typeof value === "string") yield [path, value];
  else if (Array.isArray(value)) for (const [k, v] of value.entries()) yield* texts(v, `${path}[${k}]`);
  else if (value && typeof value === "object") for (const [k, v] of Object.entries(value)) yield* texts(v, `${path}.${k}`);
}

const CHAIN = /(?:[0-9.,\s+\-−×·÷/()^⁰¹²³⁴⁵⁶⁷⁸⁹⁻]+=)+[0-9.,\s+\-−×·÷/()^⁰¹²³⁴⁵⁶⁷⁸⁹⁻]+/g;

function audit(text: string): string[] {
  const problems: string[] = [];
  // Un punto seguido de espacio cierra una oración, no es parte de un número.
  text = text.replace(/\.(?=\s|$)/g, ";");
  for (const m of text.matchAll(CHAIN)) {
    const before = text.slice(0, m.index).trimEnd().slice(-1);
    const rest = text.slice(m.index! + m[0].length);
    const after = rest.trimStart().slice(0, 1);
    // Variables, unidades, porcentajes, raíces y razones quedan fuera. Un
    // subíndice es una base o un índice («log₂ 8 = 3», «a₁ = 5»), no parte
    // del número que sigue.
    if ((before && /[\p{L}\d√)²³_'%₀-₉]/u.test(before)) || /\d:$/.test(text.slice(0, m.index))) continue;
    if (/^[+\-−×·÷/=]/.test(m[0].trim())) continue;
    if ((after && /[\p{L}%√(²³]/u.test(after)) || /^:\d/.test(rest)) continue;
    const parts = m[0].split("=");
    const values = parts.map(evaluate);
    for (let k = 0; k + 1 < parts.length; k++) {
      const [a, b] = [values[k], values[k + 1]];
      if (!a || !b) continue;
      const lhs = parts[k].trim();
      const rhs = parts[k + 1].trim();
      if (a.n !== b.n || a.d !== b.d) problems.push(`«${lhs} = ${rhs}» es falsa`);
      else if (lhs === rhs && /\//.test(lhs)) problems.push(`«${lhs} = ${rhs}» no aporta nada`);
    }
  }
  return problems;
}

describe("aritmética del contenido", () => {
  test("el evaluador entiende la notación escolar", () => {
    expect(evaluate("2³ × 2²")).toEqual(evaluate("2⁵"));
    expect(evaluate("10 ÷ 2/5")).toEqual(q(25));
    expect(evaluate("4,5 × 10⁷")).toEqual(evaluate("45 000 000"));
    expect(evaluate("5,2 × 10⁻⁴")).toEqual(evaluate("0,00052"));
    expect(evaluate("(4 + 6 + 5 + 3 + 7) ÷ 5")).toEqual(q(5));
    expect(evaluate("x + 3")).toBeNull();
    expect(audit("14 ÷ 3 = 4,67: caben 4")).toHaveLength(1);
    expect(audit("Suma: 5/6 = 5/6.")).toHaveLength(1);
    expect(audit("En 5x + 3 = 2x + 15 hay x en ambos lados; Q1 = 20; 60/80 = 75%; 2:3 = 4:6")).toEqual([]);
    expect(audit("log₂ 8 = 3 y log₃ 81 = 4")).toEqual([]);
    expect(audit("log₂ 8 = 3; 2³ = 9")).toHaveLength(1);
  });

  test.each(LESSONS.map((l) => [l.id, l] as const))("%s: toda igualdad numérica es verdadera", (_, lesson) => {
    const problems = [...texts(lesson, lesson.id)].flatMap(([path, text]) => audit(text).map((p) => `${path}: ${p}`));
    expect(problems).toEqual([]);
  });
});
