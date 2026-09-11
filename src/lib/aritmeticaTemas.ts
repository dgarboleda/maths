import { type Problem, formatThousands, pick, randInt, round1, round2, shuffle, superscript, textChoices } from "./problem";
import { gcd } from "./aritmeticaMcdMcm";
import {
  ampliarFraccionHints,
  aumentoHints,
  cambioPorcentualHints,
  componerNumeroHints,
  compararFraccionesHints,
  decimalAPorcentajeHints,
  descuentoHints,
  divDecimalHints,
  dividirFraccionHints,
  divisionLargaHints,
  divisionRestoHints,
  duplicarHints,
  estimarRaizHints,
  exponenteCientificaHints,
  expandirCientificaHints,
  fraccionADecimalHints,
  fraccionAPorcentajeHints,
  fraccionConceptoHints,
  fraccionDeCantidadHints,
  jerarquiaHints,
  ladoCuadradoHints,
  multDecimalHints,
  multFraccionesHints,
  multVariasCifrasHints,
  porcentajeADecimalHints,
  potenciaHints,
  productoCientificaHints,
  raizHints,
  simplificarFraccionHints,
  valorCifraHints,
} from "./hints";

/**
 * Temas de Cantidad que completan la progresión hacia PISA
 * (docs/curricula-pisa.md), uno por módulo — mismo patrón que
 * aritmeticaMcdMcm.ts. El `difficulty` de cada problema es el del módulo.
 */

function coprimeNumerator(d: number): number {
  let n = randInt(1, d - 1);
  while (gcd(n, d) !== 1) n = randInt(1, d - 1);
  return n;
}

const PLACES = [
  { name: "centenas", value: 100 },
  { name: "decenas", value: 10 },
  { name: "unidades", value: 1 },
] as const;

/** 2.º grado — valor posicional hasta 1000. */
export function generateValorPosicionalProblem(): Problem {
  const id = crypto.randomUUID();
  // Tres cifras distintas y sin ceros, para que "la cifra 4" nunca sea ambigua.
  const digits = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]).slice(0, 3);
  const [c, d, u] = digits;
  const n = c * 100 + d * 10 + u;

  if (Math.random() < 0.5) {
    const pos = randInt(0, 2);
    const answer = digits[pos] * PLACES[pos].value;
    return {
      id,
      difficulty: 2,
      kind: "valor_posicional",
      prompt: `¿Cuánto vale la cifra ${digits[pos]} en el número ${n}?`,
      answer,
      inputType: "integer",
      hints: valorCifraHints(n, digits[pos], PLACES[pos].name, answer),
    };
  }

  // Las partes en desorden: si vinieran en orden, bastaría con copiar las cifras.
  const parts = shuffle([`${c} centenas`, `${d} decenas`, `${u} unidades`]);
  return {
    id,
    difficulty: 2,
    kind: "componer_numero",
    prompt: `¿Qué número se forma con ${parts[0]}, ${parts[1]} y ${parts[2]}?`,
    answer: n,
    inputType: "integer",
    hints: componerNumeroHints(c, d, u, n),
  };
}

/** 3.º grado — la fracción como parte de un entero. */
export function generateFraccionConceptoProblem(): Problem {
  const id = crypto.randomUUID();
  const d = pick([2, 3, 4, 5, 6, 8]);
  const n = randInt(1, d - 1);
  const [cosa, verbo] = pick([
    ["una pizza", "comiste"],
    ["una barra de chocolate", "regalaste"],
    ["una cinta", "usaste"],
  ] as const);
  const askLeft = Math.random() < 0.5;
  const k = askLeft ? d - n : n;
  const correct = `${k}/${d}`;
  const distractors = [...new Set([`${d}/${k}`, `${d - k}/${d}`, `${k}/${d + 1}`, `${k + 1}/${d}`])].filter((s) => s !== correct);
  return {
    id,
    difficulty: 3,
    kind: "fraccion_concepto",
    prompt: `Cortaste ${cosa} en ${d} partes iguales y ${verbo} ${n}. ¿Qué fracción ${askLeft ? "queda" : verbo}?`,
    ...textChoices([correct, ...distractors.slice(0, 2)]),
    inputType: "choice",
    hints: fraccionConceptoHints(k, d),
  };
}

/** 4.º grado — división con resto, en contexto de reparto. */
export function generateDivisionRestoProblem(): Problem {
  const id = crypto.randomUUID();
  const b = randInt(2, 9);
  const q = randInt(2, 12);
  const r = randInt(1, b - 1);
  const a = b * q + r;
  const [cosas, grupos] = pick([
    ["caramelos", "niños"],
    ["figuritas", "amigos"],
    ["libros", "equipos"],
  ] as const);
  const askRemainder = Math.random() < 0.5;
  return {
    id,
    difficulty: 4,
    kind: askRemainder ? "division_resto" : "division_cociente",
    prompt: `Repartes ${a} ${cosas} en partes iguales entre ${b} ${grupos}, sin partir ninguno. ${
      askRemainder ? `¿Cuántos ${cosas} sobran?` : `¿Cuántos ${cosas} le tocan a cada uno?`
    }`,
    answer: askRemainder ? r : q,
    inputType: "integer",
    hints: divisionRestoHints(a, b, q, r, askRemainder),
  };
}

/** 4.º grado — multiplicación de varias cifras. */
export function generateMultVariasCifrasProblem(): Problem {
  const id = crypto.randomUUID();
  const twoByTwo = Math.random() < 0.4;
  const a = twoByTwo ? randInt(11, 40) : randInt(12, 99);
  const b = twoByTwo ? randInt(11, 30) : randInt(3, 9);
  return {
    id,
    difficulty: 4,
    kind: "mult_varias_cifras",
    prompt: `¿Cuánto es ${a} × ${b}?`,
    answer: a * b,
    inputType: "integer",
    hints: multVariasCifrasHints(a, b, a * b),
  };
}

/** 4.º grado — fracciones equivalentes: ampliar, simplificar y comparar. */
export function generateFraccionesEquivalentesProblem(): Problem {
  const id = crypto.randomUUID();
  const variant = randInt(0, 2);

  if (variant < 2) {
    const d = randInt(2, 9);
    const n = coprimeNumerator(d);
    const k = randInt(2, 6);
    if (variant === 0) {
      return {
        id,
        difficulty: 4,
        kind: "ampliar_fraccion",
        prompt: `Completa la fracción equivalente: ${n}/${d} = ?/${d * k}`,
        answer: n * k,
        inputType: "integer",
        hints: ampliarFraccionHints(n, d, k),
      };
    }
    return {
      id,
      difficulty: 4,
      kind: "simplificar_fraccion",
      prompt: `Simplifica al máximo: ${n * k}/${d * k} = ?/${d}`,
      answer: n,
      inputType: "integer",
      hints: simplificarFraccionHints(n * k, d * k, k, n, d),
    };
  }

  let n1 = 0;
  let d1 = 0;
  let n2 = 0;
  let d2 = 0;
  do {
    d1 = randInt(2, 9);
    d2 = randInt(2, 9);
    n1 = randInt(1, d1 - 1);
    n2 = randInt(1, d2 - 1);
  } while (n1 * d2 === n2 * d1);
  const first = `${n1}/${d1}`;
  const second = `${n2}/${d2}`;
  const bigger = n1 * d2 > n2 * d1 ? first : second;
  const smaller = bigger === first ? second : first;
  return {
    id,
    difficulty: 4,
    kind: "comparar_fracciones",
    prompt: `¿Cuál es mayor: ${first} o ${second}?`,
    ...textChoices([bigger, smaller, "Son iguales"]),
    inputType: "choice",
    hints: compararFraccionesHints(n1, d1, n2, d2, bigger),
  };
}

/** 5.º grado — división de varias cifras (exacta). */
export function generateDivisionLargaProblem(): Problem {
  const id = crypto.randomUUID();
  let a = 0;
  let b = 0;
  let q = 0;
  if (Math.random() < 0.6) {
    b = randInt(3, 9);
    q = randInt(12, Math.floor(999 / b));
  } else {
    b = randInt(11, 25);
    q = randInt(4, 40);
  }
  a = b * q;
  return {
    id,
    difficulty: 5,
    kind: "division_larga",
    prompt: `¿Cuánto es ${a} ÷ ${b}?`,
    answer: q,
    inputType: "integer",
    hints: divisionLargaHints(a, b, q),
  };
}

/** 5.º grado — jerarquía de operaciones. */
export function generateJerarquiaProblem(): Problem {
  const id = crypto.randomUUID();
  const b = randInt(2, 9);
  const c = randInt(2, 9);
  let text = "";
  let answer = 0;
  let first = "";
  let second = "";

  switch (randInt(0, 3)) {
    case 0: {
      const a = randInt(2, 20);
      answer = a + b * c;
      text = `${a} + ${b} × ${c}`;
      first = `Primero la multiplicación: ${b} × ${c} = ${b * c}.`;
      second = `Después la suma: ${a} + ${b * c} = ${answer}.`;
      break;
    }
    case 1: {
      const a = randInt(1, b * c - 1);
      answer = b * c - a;
      text = `${b} × ${c} − ${a}`;
      first = `Primero la multiplicación: ${b} × ${c} = ${b * c}.`;
      second = `Después la resta: ${b * c} − ${a} = ${answer}.`;
      break;
    }
    case 2: {
      const a = randInt(2, 12);
      answer = (a + b) * c;
      text = `(${a} + ${b}) × ${c}`;
      first = `Primero el paréntesis: ${a} + ${b} = ${a + b}.`;
      second = `Después la multiplicación: ${a + b} × ${c} = ${answer}.`;
      break;
    }
    default: {
      const q = randInt(1, 9);
      const a = randInt(q, 30);
      answer = a - q;
      text = `${a} − ${b * q} ÷ ${b}`;
      first = `Primero la división: ${b * q} ÷ ${b} = ${q}.`;
      second = `Después la resta: ${a} − ${q} = ${answer}.`;
      break;
    }
  }

  return {
    id,
    difficulty: 5,
    kind: "jerarquia",
    prompt: `¿Cuánto es ${text}?`,
    answer,
    inputType: "integer",
    hints: jerarquiaHints(first, second),
  };
}

/** 5.º grado — fracción de una cantidad. */
export function generateFraccionDeCantidadProblem(): Problem {
  const id = crypto.randomUUID();
  const d = pick([2, 3, 4, 5, 6, 8, 10]);
  const n = randInt(1, d - 1);
  const unit = randInt(2, 12);
  const total = d * unit;
  const prompt = pick([
    `¿Cuánto es ${n}/${d} de ${total}?`,
    `Una clase tiene ${total} alumnos y ${n}/${d} de ellos van en bicicleta. ¿Cuántos van en bicicleta?`,
    `Un tanque de ${total} litros está lleno hasta los ${n}/${d}. ¿Cuántos litros tiene?`,
  ]);
  return {
    id,
    difficulty: 5,
    kind: "fraccion_de_cantidad",
    prompt,
    answer: n * unit,
    inputType: "integer",
    hints: fraccionDeCantidadHints(n, d, total, n * unit),
  };
}

/** 6.º grado — potencias. */
export function generatePotenciasProblem(): Problem {
  const id = crypto.randomUUID();
  const variant = randInt(0, 2);

  if (variant === 0) {
    let base = 0;
    let exp = 0;
    do {
      base = randInt(2, 10);
      exp = randInt(2, 5);
    } while (base ** exp > 10000);
    return {
      id,
      difficulty: 6,
      kind: "potencia",
      prompt: `¿Cuánto es ${base}${superscript(exp)}?`,
      answer: base ** exp,
      inputType: "integer",
      hints: potenciaHints(base, exp, base ** exp),
    };
  }
  if (variant === 1) {
    const exp = randInt(2, 6);
    return {
      id,
      difficulty: 6,
      kind: "potencia_de_10",
      prompt: `¿Cuánto es 10${superscript(exp)}?`,
      answer: 10 ** exp,
      inputType: "integer",
      hints: potenciaHints(10, exp, 10 ** exp),
    };
  }
  const start = randInt(2, 5);
  const hours = randInt(2, 5);
  const answer = start * 2 ** hours;
  return {
    id,
    difficulty: 6,
    kind: "duplicar",
    prompt: `Una colonia de bacterias se duplica cada hora. Si empieza con ${start} bacterias, ¿cuántas habrá después de ${hours} horas?`,
    answer,
    inputType: "integer",
    hints: duplicarHints(start, hours, answer),
  };
}

/** 6.º grado — multiplicar y dividir fracciones. */
export function generateFraccionesMultDivProblem(): Problem {
  const id = crypto.randomUUID();
  if (Math.random() < 0.5) {
    const b = randInt(2, 7);
    const d = randInt(2, 7);
    const a = randInt(1, b - 1);
    const c = randInt(1, d - 1);
    return {
      id,
      difficulty: 6,
      kind: "multiplicar_fracciones",
      prompt: `${a}/${b} × ${c}/${d} = ?/${b * d}. ¿Cuál es el numerador?`,
      answer: a * c,
      inputType: "integer",
      hints: multFraccionesHints(a, b, c, d),
    };
  }
  // n ÷ (c/k) con resultado entero: n = c·m ⇒ n·k/c = m·k.
  const k = randInt(2, 6);
  const c = randInt(1, k - 1);
  const m = randInt(1, 5);
  const n = c * m;
  const answer = m * k;
  return {
    id,
    difficulty: 6,
    kind: "dividir_fracciones",
    prompt: `Tienes ${n} ${n === 1 ? "litro" : "litros"} de jugo y lo sirves en vasos de ${c}/${k} de litro. ¿Cuántos vasos llenas?`,
    answer,
    inputType: "integer",
    hints: dividirFraccionHints(n, c, k, answer),
  };
}

/** 6.º grado — multiplicar y dividir decimales. */
export function generateDecimalesMultDivProblem(): Problem {
  const id = crypto.randomUUID();
  const variant = randInt(0, 2);

  if (variant === 0) {
    const a = round1(randInt(11, 99) / 10);
    const b = randInt(2, 9);
    const answer = round2(a * b);
    return {
      id,
      difficulty: 6,
      kind: "multiplicar_decimales",
      prompt:
        Math.random() < 0.5
          ? `¿Cuánto es ${a} × ${b}?`
          : `Un kilo de manzanas cuesta $${a}. ¿Cuánto cuestan ${b} kilos?`,
      answer,
      inputType: "decimal",
      hints: multDecimalHints(a, b, answer),
    };
  }
  if (variant === 1) {
    const q = round1(randInt(11, 99) / 10);
    const b = randInt(2, 9);
    const a = round1(q * b);
    return {
      id,
      difficulty: 6,
      kind: "dividir_decimales",
      prompt: `¿Cuánto es ${a} ÷ ${b}?`,
      answer: q,
      inputType: "decimal",
      hints: divDecimalHints(a, b, q),
    };
  }
  const a = randInt(1, 9) / 10;
  const b = randInt(1, 9) / 10;
  const answer = round2(a * b);
  return {
    id,
    difficulty: 6,
    kind: "multiplicar_decimales",
    prompt: `¿Cuánto es ${a} × ${b}?`,
    answer,
    inputType: "decimal",
    hints: multDecimalHints(a, b, answer),
  };
}

/** Denominadores que dividen a 100: la conversión a porcentaje y a decimal siempre es exacta. */
const FRACTIONS_TO_100: Array<[number, number]> = [
  [1, 2],
  [1, 4],
  [3, 4],
  [1, 5],
  [2, 5],
  [3, 5],
  [4, 5],
  [1, 10],
  [3, 10],
  [7, 10],
  [9, 10],
  [1, 20],
  [3, 20],
  [1, 25],
  [1, 50],
];

/** 6.º grado — conversiones entre fracción, decimal y porcentaje. */
export function generateFraccionDecimalPorcentajeProblem(): Problem {
  const id = crypto.randomUUID();
  const variant = randInt(0, 3);
  const [n, d] = pick(FRACTIONS_TO_100);
  const pct = (n * 100) / d;

  if (variant === 0) {
    return {
      id,
      difficulty: 6,
      kind: "fraccion_a_porcentaje",
      prompt: `¿Qué porcentaje es ${n}/${d}?`,
      answer: pct,
      inputType: "integer",
      hints: fraccionAPorcentajeHints(n, d, pct),
    };
  }
  if (variant === 1) {
    return {
      id,
      difficulty: 6,
      kind: "fraccion_a_decimal",
      prompt: `Escribe ${n}/${d} como número decimal.`,
      answer: pct / 100,
      inputType: "decimal",
      hints: fraccionADecimalHints(n, d, pct / 100),
    };
  }
  const p = randInt(1, 19) * 5;
  if (variant === 2) {
    return {
      id,
      difficulty: 6,
      kind: "decimal_a_porcentaje",
      prompt: `Escribe ${p / 100} como porcentaje.`,
      answer: p,
      inputType: "integer",
      hints: decimalAPorcentajeHints(p / 100, p),
    };
  }
  return {
    id,
    difficulty: 6,
    kind: "porcentaje_a_decimal",
    prompt: `Escribe ${p}% como número decimal.`,
    answer: p / 100,
    inputType: "decimal",
    hints: porcentajeADecimalHints(p, p / 100),
  };
}

/** 7.º grado — aumentos, descuentos y porcentaje de cambio (varios pasos, en contexto). */
export function generatePorcentajeAplicadoProblem(): Problem {
  const id = crypto.randomUUID();
  const variant = randInt(0, 2);

  // Precios múltiplos de 20 y porcentajes múltiplos de 5: el resultado siempre es entero.
  if (variant === 0) {
    const price = randInt(2, 30) * 20;
    const pct = pick([10, 20, 25, 30, 40, 50]);
    const final = (price * (100 - pct)) / 100;
    return {
      id,
      difficulty: 7,
      kind: "descuento",
      prompt: `Un par de zapatillas cuesta $${price} y tiene un ${pct}% de descuento. ¿Cuánto pagas?`,
      answer: final,
      inputType: "integer",
      hints: descuentoHints(price, pct, final),
    };
  }
  if (variant === 1) {
    const price = randInt(2, 40) * 20;
    const pct = pick([5, 10, 15, 20, 25]);
    const final = (price * (100 + pct)) / 100;
    return {
      id,
      difficulty: 7,
      kind: "aumento",
      prompt: `El precio de un abono de $${price} sube un ${pct}%. ¿Cuánto cuesta ahora?`,
      answer: final,
      inputType: "integer",
      hints: aumentoHints(price, pct, final),
    };
  }
  const base = randInt(1, 20) * 20;
  const pct = pick([10, 20, 25, 50]);
  const change = (base * pct) / 100;
  const subio = Math.random() < 0.5;
  const nuevo = subio ? base + change : base - change;
  return {
    id,
    difficulty: 7,
    kind: "cambio_porcentual",
    prompt: `Una entrada costaba $${base} y ahora cuesta $${nuevo}. ¿En qué porcentaje ${subio ? "aumentó" : "bajó"} su precio?`,
    answer: pct,
    inputType: "integer",
    hints: cambioPorcentualHints(base, nuevo, pct),
  };
}

/** 8.º grado — raíz cuadrada: exacta, en contexto y estimada. */
export function generateRaicesProblem(): Problem {
  const id = crypto.randomUUID();
  const variant = randInt(0, 2);

  if (variant === 0) {
    const r = randInt(2, 20);
    return {
      id,
      difficulty: 8,
      kind: "raiz_cuadrada",
      prompt: `¿Cuánto es √${r * r}?`,
      answer: r,
      inputType: "integer",
      hints: raizHints(r * r, r),
    };
  }
  if (variant === 1) {
    const r = randInt(3, 25);
    return {
      id,
      difficulty: 8,
      kind: "lado_cuadrado",
      prompt: `Un terreno cuadrado tiene ${r * r} m² de área. ¿Cuánto mide cada lado, en metros?`,
      answer: r,
      inputType: "integer",
      hints: ladoCuadradoHints(r * r, r),
    };
  }
  const r = randInt(2, 12);
  const n = randInt(r * r + 1, (r + 1) * (r + 1) - 1);
  return {
    id,
    difficulty: 8,
    kind: "estimar_raiz",
    prompt: `√${n} está entre dos números enteros consecutivos. ¿Cuál es el menor de los dos?`,
    answer: r,
    inputType: "integer",
    hints: estimarRaizHints(n, r),
  };
}

/** 8.º grado — notación científica. */
export function generateNotacionCientificaProblem(): Problem {
  const id = crypto.randomUUID();
  const variant = randInt(0, 2);
  // Mantisa de dos cifras significativas (1.1 a 9.9), guardada ×10 para no arrastrar decimales.
  const m10 = randInt(11, 99);
  const mantissa = m10 / 10;

  if (variant === 0) {
    const e = randInt(3, 7);
    const n = m10 * 10 ** (e - 1);
    return {
      id,
      difficulty: 8,
      kind: "expandir_cientifica",
      prompt: `Escribe ${mantissa} × 10${superscript(e)} como número entero.`,
      answer: n,
      inputType: "integer",
      hints: expandirCientificaHints(mantissa, e, n),
    };
  }
  if (variant === 1) {
    const e = randInt(3, 8);
    const n = m10 * 10 ** (e - 1);
    return {
      id,
      difficulty: 8,
      kind: "exponente_cientifica",
      prompt: `${formatThousands(n)} = ${mantissa} × 10^?. ¿Cuál es el exponente?`,
      answer: e,
      inputType: "integer",
      hints: exponenteCientificaHints(n, mantissa, e),
    };
  }
  const a = randInt(2, 4);
  const b = randInt(1, 2);
  const e1 = randInt(2, 6);
  const e2 = randInt(2, 6);
  return {
    id,
    difficulty: 8,
    kind: "producto_cientifica",
    prompt: `(${a} × 10${superscript(e1)}) × (${b} × 10${superscript(e2)}) = ${a * b} × 10^?. ¿Cuál es el exponente?`,
    answer: e1 + e2,
    inputType: "integer",
    hints: productoCientificaHints(a, e1, b, e2),
  };
}
