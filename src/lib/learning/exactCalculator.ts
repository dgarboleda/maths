/** Operaciones exactas con racionales. Se usan enteros grandes para no redondear fracciones. */
export const EXACT_OPS = [
  { id: "add", label: "Sumar fracciones" },
  { id: "subtract", label: "Restar fracciones" },
  { id: "multiply", label: "Multiplicar fracciones" },
  { id: "divide", label: "Dividir fracciones" },
  { id: "simplify", label: "Simplificar fracción" },
  { id: "mcm", label: "Mínimo común múltiplo (MCM)" },
  { id: "mcd", label: "Máximo común divisor (MCD)" },
] as const;
export type ExactOp = (typeof EXACT_OPS)[number]["id"];
interface Rational { n: bigint; d: bigint }
export type ExactOutcome = { value: string; steps: string[] } | { problem: string };
const abs = (n: bigint) => n < BigInt(0) ? -n : n;
function gcd(a: bigint, b: bigint): bigint {
  a = abs(a); b = abs(b);
  while (b !== BigInt(0)) [a, b] = [b, a % b];
  return a;
}
function simplify(n: bigint, d: bigint): Rational {
  if (d < BigInt(0)) { n = -n; d = -d; }
  const divisor = gcd(n, d);
  return { n: n / divisor, d: d / divisor };
}
const format = ({ n, d }: Rational) => d === BigInt(1) ? `${n}` : `${n}/${d}`;

/** Acepta enteros, decimales con coma o punto y fracciones con signo. */
function parse(raw: string): Rational | null {
  const text = raw.trim().replace(/[−–]/g, "-").replace(/\s*\/\s*/g, "/");
  if (text.length > 64) return null;
  const fraction = /^([+-]?\d{1,30})\/([+-]?\d{1,30})$/.exec(text);
  if (fraction) {
    const n = BigInt(fraction[1]), d = BigInt(fraction[2]);
    return d === BigInt(0) ? null : simplify(n, d);
  }
  const decimal = /^([+-]?)(?:(\d{1,30})(?:[.,](\d{1,6}))?|[.,](\d{1,6}))$/.exec(text);
  if (!decimal) return null;
  const places = decimal[3] ?? decimal[4] ?? "";
  const d = BigInt(10) ** BigInt(places.length);
  const n = (BigInt(decimal[2] ?? "0") * d + BigInt(places || "0")) * (decimal[1] === "-" ? -BigInt(1) : BigInt(1));
  return simplify(n, d);
}

/** Calcula y explica una operación. Las entradas y los resultados nunca usan coma flotante. */
export function calculateExact(op: ExactOp, first: string, second: string): ExactOutcome {
  if (!EXACT_OPS.some((item) => item.id === op)) return { problem: "Elige una operación válida." };
  const a = parse(first), b = op === "simplify" ? null : parse(second);
  if (!a || (op !== "simplify" && !b)) return { problem: "Escribe números válidos, por ejemplo −3/4, 2 o 0,75. El denominador no puede ser 0." };
  if (op === "simplify") return { value: format(a), steps: [`${first.trim()} = ${format(a)}. Divide numerador y denominador por sus factores comunes.`] };
  if (!b) return { problem: "Escribe los dos números." };
  if (op === "mcm" || op === "mcd") {
    if (a.d !== BigInt(1) || b.d !== BigInt(1)) return { problem: "Para MCD y MCM escribe números enteros." };
    const x = abs(a.n), y = abs(b.n), common = gcd(x, y);
    if (op === "mcd" && common === BigInt(0)) return { problem: "El MCD de 0 y 0 no está definido." };
    if (op === "mcd") return { value: `${common}`, steps: [`Compara los divisores de ${x} y ${y}: el mayor divisor común es ${common}.`] };
    const multiple = common === BigInt(0) ? BigInt(0) : (x / common) * y;
    return { value: `${multiple}`, steps: common === BigInt(0) ? ["El MCM de 0 y 0 es 0."] : [`MCD(${x}, ${y}) = ${common}.`, `MCM = |${x} × ${y}| ÷ ${common} = ${multiple}.`] };
  }
  if (op === "divide" && b.n === BigInt(0)) return { problem: "No se puede dividir entre 0." };
  const normalized = [
    ...(first.trim() !== format(a) ? [`Primero: ${first.trim()} = ${format(a)}.`] : []),
    ...(second.trim() !== format(b) ? [`También: ${second.trim()} = ${format(b)}.`] : []),
  ];
  let n: bigint, d: bigint, steps: string[];
  if (op === "add" || op === "subtract") {
    const common = a.d / gcd(a.d, b.d) * b.d;
    const left = a.n * (common / a.d), right = b.n * (common / b.d);
    n = op === "add" ? left + right : left - right; d = common;
    const symbol = op === "add" ? "+" : "−";
    steps = [`Denominador común: MCM(${a.d}, ${b.d}) = ${common}.`, `${left}/${common} ${symbol} (${right}/${common}) = ${n}/${common}.`];
  } else if (op === "multiply") {
    n = a.n * b.n; d = a.d * b.d;
    steps = [`Multiplica numeradores y denominadores: (${a.n} × ${b.n}) / (${a.d} × ${b.d}) = ${n}/${d}.`];
  } else {
    n = a.n * b.d; d = a.d * b.n;
    steps = [`Multiplica por el inverso: ${format(a)} × (${b.d}/${b.n}) = ${n}/${d}.`];
  }
  const value = format(simplify(n, d));
  steps.push(`Resultado simplificado: ${value}.`);
  return { value, steps: [...normalized, ...steps] };
}
