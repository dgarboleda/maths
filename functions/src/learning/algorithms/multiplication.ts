/**
 * Multiplicación en columnas, como se escribe en el cuaderno: el factor de
 * más cifras arriba, el otro debajo alineado por la derecha (no por la
 * coma). Se multiplica cada cifra de abajo por todo el número de arriba (un
 * producto parcial por fila, desplazado una columna más por cada posición),
 * se suman las filas y, si hay decimales, se separan tantas cifras como
 * decimales tengan entre los dos factores. Un solo trazado alimenta el
 * ejemplo animado, las pistas, el desarrollo, la hoja guiada y el
 * diagnóstico de errores (los «bugs» se reconocen por el producto que dan).
 *
 * Puro: sin React ni Firebase, compartido por Functions y el navegador.
 */
import { decimalsOf, digitsOf, fmt, fmtFixed, placeName } from "./columns";

export interface MultiplySpec {
  op: "multiply";
  /** Factor de arriba (el de más cifras; hasta 3 decimales). */
  a: number;
  /** Factor de abajo (hasta 3 cifras sin contar la coma). */
  b: number;
  /** Cifras escritas, incluidos ceros finales significativos. */
  scaleA?: number;
  scaleB?: number;
}

/** Una fila de productos parciales: todo el número de arriba por una cifra de abajo. */
export interface PartialRow {
  /** Posición de la cifra de abajo (0 = unidades). */
  shift: number;
  /** La cifra de abajo. */
  digit: number;
  /** Valor de la fila, ya desplazado (con los ceros de la derecha). */
  value: number;
  /** Cifras de la fila, de la columna 0 hacia la izquierda. */
  digits: number[];
  /** Llevada que entra en cada cifra de arriba (índice = cifra de arriba). */
  carries: number[];
}

export interface MultiplyStep {
  /** «row»: una cifra de un producto parcial; «sum»: una cifra de la suma
   *  de las filas; «comma»: cuántos decimales lleva el producto. */
  kind: "row" | "sum" | "comma";
  /** Fila de la cuadrícula (0…partials−1; la suma es la última). */
  row: number;
  /** Columna, desde la derecha (0 = la última cifra). */
  column: number;
  /** Lo que se escribe: una cifra, o el número de decimales. */
  digit: number;
  /** Llevada que sale hacia la columna siguiente. */
  carry: number;
  /** Para «row»: cifra de arriba que se multiplica (−1 en los ceros del desplazamiento o la llevada final). */
  topIndex: number;
  ask: string;
  why: string;
}

export interface MultiplyTrace {
  spec: MultiplySpec;
  /** Decimales de cada factor y del producto. */
  scaleA: number;
  scaleB: number;
  scale: number;
  /** Factores sin coma. */
  A: number;
  B: number;
  topDigits: number[];
  bottomDigits: number[];
  /** Filas de productos parciales (sin las de las cifras 0 de abajo). */
  partials: PartialRow[];
  /** Hay fila de suma (más de un producto parcial). */
  summed: boolean;
  /** Producto sin coma y sus cifras (de la columna 0 hacia la izquierda). */
  product: number;
  productDigits: number[];
  /** Cifras del resultado con los ceros que completan la parte decimal (0,06). */
  resultDigits: number[];
  result: number;
  /** Columnas de la cuadrícula. */
  width: number;
  steps: MultiplyStep[];
}

const fromDigits = (digits: number[]) => digits.reduceRight((acc, d) => acc * 10 + d, 0);
const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);

export function multiplyScaled(spec: MultiplySpec) {
  const scaleA = spec.scaleA ?? decimalsOf(spec.a), scaleB = spec.scaleB ?? decimalsOf(spec.b);
  return {
    scaleA,
    scaleB,
    A: Math.round(spec.a * 10 ** scaleA),
    B: Math.round(spec.b * 10 ** scaleB),
  };
}

export function validMultiplySpec(spec: MultiplySpec): boolean {
  if (!Number.isFinite(spec.a) || !Number.isFinite(spec.b) || spec.a <= 0 || spec.b <= 0) return false;
  const { scaleA, scaleB, A, B } = multiplyScaled(spec);
  return Number.isInteger(scaleA) && Number.isInteger(scaleB) && scaleA >= decimalsOf(spec.a) && scaleB >= decimalsOf(spec.b) && scaleA <= 3 && scaleB <= 3 && A < 1e6 && B < 1000 && Number.isSafeInteger(A * B);
}

/** Valor de un producto sin coma con `scale` decimales. */
const withScale = (n: number, scale: number) => Number((n / 10 ** scale).toFixed(scale));

/** «0,72» con los ceros de la parte decimal que hagan falta (0,06). */
export function fmtProduct(product: number, scale: number): string {
  if (!scale) return fmt(product);
  const text = String(product).padStart(scale + 1, "0");
  const int = text.slice(0, -scale), frac = text.slice(-scale);
  return `${fmt(Number(int))},${frac}`;
}

export function multiplyTrace(spec: MultiplySpec): MultiplyTrace {
  if (!validMultiplySpec(spec)) throw new Error(`Multiplicación no válida: ${JSON.stringify(spec)}`);
  const { scaleA, scaleB, A, B } = multiplyScaled(spec);
  const scale = scaleA + scaleB;
  const topDigits = digitsOf(A);
  const bottomDigits = digitsOf(B);
  const the = (column: number) => `las ${placeName(column)}`;
  const steps: MultiplyStep[] = [];
  const partials: PartialRow[] = [];
  const nonZero = bottomDigits.filter((d) => d !== 0).length;
  const summed = nonZero > 1;
  // Los ceros de abajo no necesitan fila: multiplicar por 0 da 0.
  let skipped: number[] = [];
  bottomDigits.forEach((d, shift) => {
    if (d === 0) {
      skipped.push(shift);
      return;
    }
    const row = partials.length;
    const carries: number[] = [];
    const digits: number[] = [];
    const skipNote = skipped.length
      ? `El 0 de ${skipped.map(the).join(" y ")} de abajo da una fila de ceros: no hace falta escribirla. `
      : "";
    skipped = [];
    for (let k = 0; k < shift; k++) {
      digits.push(0);
      steps.push({
        kind: "row",
        row,
        column: k,
        digit: 0,
        carry: 0,
        topIndex: -1,
        ask: `Ahora multiplicas por el ${d} de ${the(shift)}. ¿Qué escribes en ${the(k)}?`,
        why: `${k === 0 ? skipNote : ""}Multiplicas por ${d} ${placeName(shift)}: el resultado son ${placeName(shift)}, así que escribes 0 en ${the(k)} y empiezas una columna más a la izquierda.`,
      });
    }
    let carry = 0;
    topDigits.forEach((t, i) => {
      carries.push(carry);
      const value = t * d + carry;
      const digit = value % 10;
      const out = Math.floor(value / 10);
      const terms = carry ? `${d} × ${t} = ${t * d}, más ${carry} que llevabas, ${value}` : `${d} × ${t} = ${value}`;
      steps.push({
        kind: "row",
        row,
        column: shift + i,
        digit,
        carry: out,
        topIndex: i,
        ask: carry ? `Multiplica ${d} × ${t} y súmale ${carry} que llevas. ¿Qué cifra escribes?` : `Multiplica ${d} × ${t}. ¿Qué cifra escribes?`,
        why: `${terms}. ${out ? `Escribes ${digit} y llevas ${out}.` : `Escribes ${digit}; no llevas nada.`}`,
      });
      digits.push(digit);
      carry = out;
    });
    if (carry) {
      steps.push({
        kind: "row",
        row,
        column: shift + topDigits.length,
        digit: carry,
        carry: 0,
        topIndex: -1,
        ask: `No quedan cifras arriba, pero llevas ${carry}. ¿Qué escribes?`,
        why: `No quedan cifras arriba: escribes la llevada, ${carry}. La fila vale ${fmt(A * d * 10 ** shift)}.`,
      });
      digits.push(carry);
    }
    partials.push({ shift, digit: d, value: A * d * 10 ** shift, digits, carries });
  });

  const product = A * B;
  const productDigits = digitsOf(product);
  if (summed) {
    const row = partials.length;
    let carry = 0;
    for (let c = 0; c < productDigits.length; c++) {
      const terms = partials.map((p) => p.digits[c]).filter((x) => x !== undefined);
      const total = terms.reduce((s, x) => s + x, 0) + carry;
      const digit = total % 10;
      const out = Math.floor(total / 10);
      const sum = [...terms, ...(carry ? [carry] : [])];
      steps.push({
        kind: "sum",
        row,
        column: c,
        digit,
        carry: out,
        topIndex: -1,
        ask: `Suma la columna de ${the(c)}${carry ? ` y la llevada (${carry})` : ""}. ¿Qué cifra escribes?`,
        why: `Sumas ${the(c)}: ${sum.length > 1 ? `${sum.join(" + ")} = ${total}` : `${total}`}. ${out ? `Escribes ${digit} y llevas ${out}.` : `Escribes ${digit}.`}`,
      });
      carry = out;
    }
    if (fromDigits(steps.filter((s) => s.kind === "sum").map((s) => s.digit)) !== product)
      throw new Error("Trazado de multiplicación inconsistente");
  } else if (partials[0].value !== product) throw new Error("Trazado de multiplicación inconsistente");

  const resultDigits = [...productDigits];
  while (resultDigits.length < scale + 1) resultDigits.push(0);
  const result = withScale(product, scale);
  if (scale) {
    const missing = resultDigits.length - productDigits.length;
    steps.push({
      kind: "comma",
      row: summed ? partials.length : partials.length - 1,
      column: scale,
      digit: scale,
      carry: 0,
      topIndex: -1,
      ask: "¿Cuántas cifras decimales lleva el producto? Cuenta las de los dos factores.",
      why: `${fmtFixed(spec.a, scaleA)} tiene ${scaleA} ${plural(scaleA, "cifra decimal", "cifras decimales")} y ${fmtFixed(spec.b, scaleB)} tiene ${scaleB}: el producto lleva ${scale}. Separas ${scale} ${plural(scale, "cifra", "cifras")} desde la derecha${
        missing ? ` y, como no alcanzan, completas con ${missing === 1 ? "un cero" : `${missing} ceros`} a la izquierda` : ""
      }: ${fmtProduct(product, scale)}.`,
    });
  }
  const width = Math.max(resultDigits.length, topDigits.length + 1, bottomDigits.length + 1, ...partials.map((p) => p.digits.length));
  return {
    spec,
    scaleA,
    scaleB,
    scale,
    A,
    B,
    topDigits,
    bottomDigits,
    partials,
    summed,
    product,
    productDigits,
    resultDigits,
    result,
    width,
    steps,
  };
}

export function multiplyExpression(spec: MultiplySpec): string {
  return `${fmtFixed(spec.a, spec.scaleA ?? decimalsOf(spec.a))} × ${fmtFixed(spec.b, spec.scaleB ?? decimalsOf(spec.b))}`;
}

export function multiplySolution(spec: MultiplySpec): string[] {
  const t = multiplyTrace(spec);
  const rows = t.partials.map((p) => {
    const carries = p.carries.filter((c) => c > 0).length;
    const base = `${fmt(t.A)} × ${p.digit} = ${fmt(t.A * p.digit)}`;
    const shifted = p.shift
      ? `: como el ${p.digit} está en las ${placeName(p.shift)}, la fila se escribe desplazada ${p.shift === 1 ? "una columna" : `${p.shift} columnas`} (${fmt(p.value)}).`
      : ".";
    return `${t.summed ? `Fila del ${p.digit} de las ${placeName(p.shift)}: ` : "Multiplicas cada cifra de arriba, de derecha a izquierda. "}${base}${shifted}${
      carries ? ` Llevas en ${carries} ${plural(carries, "columna", "columnas")}.` : ""
    }`;
  });
  const skipped = t.bottomDigits.includes(0);
  const sig = (x: number) => Number(x.toPrecision(1));
  const estimate = Number((sig(spec.a) * sig(spec.b)).toPrecision(6));
  return [
    t.scale
      ? `Multiplica sin mirar la coma, alineando por la derecha: ${fmt(t.A)} × ${fmt(t.B)}. La coma se coloca al final.`
      : `Escribe ${fmt(spec.a)} arriba y ${fmt(spec.b)} debajo, alineados por la derecha, y multiplica cada cifra de abajo por todo el número de arriba, de derecha a izquierda.`,
    ...(skipped ? [`El 0 de abajo da una fila de ceros: no hace falta escribirla, pero la fila siguiente se desplaza igual.`] : []),
    ...rows,
    ...(t.summed ? [`Sumas las filas: ${t.partials.map((p) => fmt(p.value)).join(" + ")} = ${fmt(t.product)}.`] : []),
    ...(t.scale ? [t.steps.at(-1)!.why] : []),
    t.scale
      ? `Resultado: ${fmtProduct(t.product, t.scale)}. Estimación: ${fmt(sig(spec.a))} × ${fmt(sig(spec.b))} = ${fmt(estimate)}, del mismo tamaño que ${fmtProduct(t.product, t.scale)}: la coma está bien colocada.`
      : `Resultado: ${fmt(t.product)}. Comprobación: ${fmt(t.product)} ÷ ${fmt(spec.b)} = ${fmt(spec.a)}.`,
  ];
}

export function multiplyHints(spec: MultiplySpec): [string, string, string] {
  const t = multiplyTrace(spec);
  const first = t.steps.find((s) => s.kind === "row" && s.topIndex === 0)!;
  return [
    "Multiplica cada cifra de arriba por la cifra de las unidades de abajo, de derecha a izquierda, llevando lo que pase de 9." +
      (t.summed ? " Después repite con la cifra siguiente de abajo, empezando una columna más a la izquierda, y suma las filas." : "") +
      (t.scale ? " Al final, cuenta los decimales de los dos factores para colocar la coma." : ""),
    first.why,
    t.summed
      ? `Las filas son ${t.partials.map((p) => fmt(p.value)).join(" y ")}: solo falta sumarlas${t.scale ? ` y separar ${t.scale} ${plural(t.scale, "decimal", "decimales")}` : ""}.`
      : t.scale
        ? `Sin coma, el producto es ${fmt(t.product)}: falta separar ${t.scale} ${plural(t.scale, "cifra decimal", "cifras decimales")}.`
        : `El producto termina en …${String(t.product).slice(1)}: solo falta la primera cifra.`,
  ];
}

export interface MultiplyBug {
  id: "llevada-antes" | "sin-llevar" | "sin-desplazar" | "coma-como-suma" | "coma-olvidada";
  value: number;
  feedback: string;
}

/** Errores sistemáticos de la multiplicación en columnas, por el producto que dan. */
export function multiplyBugs(spec: MultiplySpec): MultiplyBug[] {
  const t = multiplyTrace(spec);
  const bugs: MultiplyBug[] = [];
  const rowValue = (d: number, rule: (t: number, carry: number) => [number, number]) => {
    let carry = 0;
    const digits = t.topDigits.map((x) => {
      const [digit, out] = rule(x, carry);
      carry = out;
      return digit;
    });
    if (carry) digits.push(...digitsOf(carry));
    return fromDigits(digits);
  };
  const total = (rule: (x: number, d: number, carry: number) => [number, number]) =>
    t.partials.reduce((s, p) => s + rowValue(p.digit, (x, c) => rule(x, p.digit, c)) * 10 ** p.shift, 0);
  const anyCarry = t.partials.some((p) => p.carries.some((c) => c > 0));
  if (anyCarry) {
    // Sumar la llevada antes de multiplicar: (cifra + llevada) × d.
    const early = total((x, d, c) => [((x + c) * d) % 10, Math.floor(((x + c) * d) / 10)]);
    bugs.push({
      id: "llevada-antes",
      value: withScale(early, t.scale),
      feedback: "Sumaste la llevada antes de multiplicar. Primero se multiplica la cifra de arriba y después se suma lo que llevabas: 7 × 4 + 2, no (7 + 2) × 4.",
    });
    const none = total((x, d) => [(x * d) % 10, 0]);
    bugs.push({
      id: "sin-llevar",
      value: withScale(none, t.scale),
      feedback: "Olvidaste las llevadas: cuando un producto pasa de 9, escribes la última cifra y sumas las demás al producto de la columna siguiente.",
    });
  }
  if (t.summed) {
    const flat = t.partials.reduce((s, p) => s + t.A * p.digit, 0);
    bugs.push({
      id: "sin-desplazar",
      value: withScale(flat, t.scale),
      feedback: "Sumaste las filas sin desplazarlas. La cifra de las decenas de abajo vale decenas: su fila empieza una columna más a la izquierda (o con un 0 en las unidades).",
    });
  }
  if (t.scaleA && t.scaleB) {
    bugs.push({
      id: "coma-como-suma",
      value: withScale(t.product, Math.max(t.scaleA, t.scaleB)),
      feedback: `Pusiste la coma como en la suma. En la multiplicación se cuentan los decimales de los dos factores: ${t.scaleA} + ${t.scaleB} = ${t.scale}.`,
    });
  }
  if (t.scale)
    bugs.push({
      id: "coma-olvidada",
      value: t.product,
      feedback: `Falta la coma: multiplicaste sin ella, pero el producto lleva ${t.scale} ${plural(t.scale, "cifra decimal", "cifras decimales")}, tantas como sumen los factores.`,
    });
  const seen = new Set([t.result]);
  return bugs.filter((bug) => (seen.has(bug.value) ? false : (seen.add(bug.value), true)));
}
