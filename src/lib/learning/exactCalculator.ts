/** Operaciones exactas con racionales. Se usan enteros grandes para no redondear fracciones. */
export const EXACT_OPS = [
  { id: "add", label: "Sumar fracciones" },
  { id: "subtract", label: "Restar fracciones" },
  { id: "multiply", label: "Multiplicar fracciones" },
  { id: "divide", label: "Dividir fracciones" },
  { id: "simplify", label: "Simplificar fracción" },
  { id: "mcm", label: "MCM (mínimo común múltiplo)" },
  { id: "mcd", label: "MCD (máximo común divisor)" },
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

/** Máximo de valores en una cuenta de la misma operación. */
export const MAX_EXACT_VALUES = 8;

/** Combina valores sin pasar los resultados intermedios por la validación de entrada. */
export function calculateManyExact(op: ExactOp, values: string[]): ExactOutcome {
  if (op === "simplify") return calculateExact(op, values[0] ?? "", "");
  if (!EXACT_OPS.some((item) => item.id === op)) return { problem: "Elige una operación válida." };
  if (values.length < 2 || values.length > MAX_EXACT_VALUES) return { problem: `Escribe entre 2 y ${MAX_EXACT_VALUES} números.` };
  const parsed = values.map(parse);
  const invalid = parsed.findIndex((value) => value === null);
  if (invalid >= 0) return { problem: `Revisa el número ${invalid + 1}: escribe un entero, decimal o fracción válida; el denominador no puede ser 0.` };
  const numbers = parsed as Rational[];
  if (op === "mcm" || op === "mcd") {
    if (numbers.some((value) => value.d !== BigInt(1))) return { problem: "Para MCD y MCM escribe números enteros." };
    const integers = numbers.map((value) => abs(value.n));
    const common = integers.reduce((current, value) => gcd(current, value), BigInt(0));
    if (op === "mcd") {
      if (common === BigInt(0)) return { problem: "El MCD de números todos iguales a 0 no está definido." };
      return { value: `${common}`, steps: [`El mayor divisor común de ${integers.join(", ")} es ${common}.`] };
    }
    let multiple = BigInt(1);
    const steps: string[] = [];
    for (const value of integers) {
      const before = multiple;
      const divisor = gcd(before, value);
      multiple = divisor === BigInt(0) ? BigInt(0) : before / divisor * value;
      if (steps.length || before !== BigInt(1)) steps.push(`MCM(${before}, ${value}) = ${multiple}.`);
      else steps.push(`Empezamos con ${value}.`);
    }
    steps.push(`MCM de todos los números: ${multiple}.`);
    return { value: `${multiple}`, steps };
  }
  let result = numbers[0];
  const steps: string[] = [];
  const symbol = { add: "+", subtract: "−", multiply: "×", divide: "÷" }[op];
  for (let index = 1; index < numbers.length; index++) {
    const next = numbers[index];
    if (op === "divide" && next.n === BigInt(0)) return { problem: `El número ${index + 1} es 0: no se puede dividir entre 0.` };
    const before = format(result);
    if (op === "add" || op === "subtract") {
      const common = result.d / gcd(result.d, next.d) * next.d;
      const left = result.n * (common / result.d), right = next.n * (common / next.d);
      const numerator = op === "add" ? left + right : left - right;
      steps.push(`Denominador común de ${before} y ${format(next)}: ${common}.`);
      result = simplify(numerator, common);
    } else if (op === "multiply") result = simplify(result.n * next.n, result.d * next.d);
    else result = simplify(result.n * next.d, result.d * next.n);
    steps.push(`${before} ${symbol} (${format(next)}) = ${format(result)}.`);
  }
  return { value: format(result), steps };
}

/** Expresiones con +, −, ×, ÷ y paréntesis, sin evaluar código. */
export function calculateExpression(source: string): ExactOutcome {
  if (source.length > 256) return { problem: "La expresión admite hasta 256 caracteres." };
  const text = source.replace(/[−–]/g, "-").replace(/×/g, "*").replace(/÷/g, "/");
  const tokens: string[] = [];
  let position = 0, count = 0;
  while (position < text.length) {
    if (/\s/.test(text[position])) { position++; continue; }
    const rest = text.slice(position);
    const number = /^(?:\d{1,30}(?:[.,]\d{1,6})?|[.,]\d{1,6})/.exec(rest);
    if (number) { tokens.push(number[0]); position += number[0].length; count++; }
    else if ("+-*/()".includes(text[position])) { tokens.push(text[position++]); }
    else return { problem: "Usa números, +, −, ×, ÷ y paréntesis. No se admiten otras funciones." };
    if (tokens.length > 96 || count > 32) return { problem: "La expresión es demasiado larga: usa como máximo 32 números." };
  }
  if (!tokens.length) return { problem: "Escribe una expresión, por ejemplo (1/2 + 1/3) × 3." };
  let cursor = 0, depth = 0;
  const steps: string[] = [];
  const fail = (message: string): never => { throw new Error(message); };
  const combine = (left: Rational, right: Rational, op: string): Rational => {
    if (op === "/" && right.n === BigInt(0)) return fail("No se puede dividir entre 0.");
    let result: Rational;
    if (op === "+") result = simplify(left.n * right.d + right.n * left.d, left.d * right.d);
    else if (op === "-") result = simplify(left.n * right.d - right.n * left.d, left.d * right.d);
    else if (op === "*") result = simplify(left.n * right.n, left.d * right.d);
    else result = simplify(left.n * right.d, left.d * right.n);
    const symbol = op === "*" ? "×" : op === "/" ? "÷" : op === "-" ? "−" : "+";
    steps.push(`${format(left)} ${symbol} (${format(right)}) = ${format(result)}.`);
    return result;
  };
  const unary = (): Rational => {
    if (++depth > 32) return fail("Reduce los paréntesis o signos anidados.");
    const token = tokens[cursor++];
    let result: Rational;
    if (token === "+" || token === "-") {
      const value = unary();
      result = token === "-" ? { n: -value.n, d: value.d } : value;
    } else if (token === "(") {
      result = expression();
      if (tokens[cursor++] !== ")") return fail("Falta cerrar un paréntesis.");
    } else {
      const value = token && parse(token);
      if (!value) return fail("Revisa la expresión: falta un número o hay un operador de más.");
      result = value;
    }
    depth--;
    return result;
  };
  const product = (): Rational => {
    let value = unary();
    while (tokens[cursor] === "*" || tokens[cursor] === "/") {
      const op = tokens[cursor++];
      value = combine(value, unary(), op);
    }
    return value;
  };
  const expression = (): Rational => {
    let value = product();
    while (tokens[cursor] === "+" || tokens[cursor] === "-") {
      const op = tokens[cursor++];
      value = combine(value, product(), op);
    }
    return value;
  };
  try {
    const result = expression();
    if (cursor !== tokens.length) return { problem: "Revisa la expresión: puede faltar un operador o sobrar un paréntesis." };
    return { value: format(result), steps: steps.length ? steps : [`Resultado: ${format(result)}.`] };
  } catch (error) {
    return { problem: error instanceof Error ? error.message : "No se pudo calcular la expresión." };
  }
}
