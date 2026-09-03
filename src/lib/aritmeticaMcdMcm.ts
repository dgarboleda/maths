import { type Problem, randInt } from "./problem";

export function gcd(a: number, b: number): number {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y !== 0) {
    [x, y] = [y, x % y];
  }
  return x;
}

export function lcm(a: number, b: number): number {
  return (a * b) / gcd(a, b);
}

/** Denominadores curados para que el MCM de dos de ellos quede manejable. */
const DENOMINATORS = [2, 3, 4, 5, 6, 8, 10, 12];

/** MCD/MCM: alterna entre pedir el máximo común divisor y el mínimo común múltiplo. */
export function generateMcdMcmProblem(): Problem {
  const id = crypto.randomUUID();
  const askMcd = Math.random() < 0.5;

  if (askMcd) {
    const a = randInt(4, 30);
    let b = randInt(4, 30);
    while (b === a) b = randInt(4, 30);
    return {
      id,
      difficulty: 6,
      kind: "mcd",
      prompt: `¿Cuál es el máximo común divisor (MCD) de ${a} y ${b}?`,
      answer: gcd(a, b),
      inputType: "integer",
    };
  }

  const a = randInt(2, 12);
  let b = randInt(2, 12);
  while (b === a) b = randInt(2, 12);
  return {
    id,
    difficulty: 6,
    kind: "mcm",
    prompt: `¿Cuál es el mínimo común múltiplo (MCM) de ${a} y ${b}?`,
    answer: lcm(a, b),
    inputType: "integer",
  };
}

/**
 * Suma de fracciones con distinto denominador: se buscan denominadores del
 * set curado para que el MCM (el denominador común) quede manejable, y se
 * responde solo el numerador — mismo patrón de entrada que las fracciones de
 * igual denominador (aritmetica-d7).
 */
export function generateUnlikeFractionsProblem(): Problem {
  const id = crypto.randomUUID();
  const d1 = DENOMINATORS[randInt(0, DENOMINATORS.length - 1)];
  let d2 = DENOMINATORS[randInt(0, DENOMINATORS.length - 1)];
  while (d2 === d1) d2 = DENOMINATORS[randInt(0, DENOMINATORS.length - 1)];
  const common = lcm(d1, d2);

  // Se reintenta hasta que el resultado sea una fracción propia (menor que
  // el denominador común) — igual que aritmetica-d7, para no meter números
  // mixtos antes de tiempo.
  let n1 = 0;
  let n2 = 0;
  let answer = common;
  while (answer >= common) {
    n1 = randInt(1, d1 - 1);
    n2 = randInt(1, d2 - 1);
    answer = n1 * (common / d1) + n2 * (common / d2);
  }

  return {
    id,
    difficulty: 7,
    kind: "fracciones_distinto_denominador",
    prompt: `¿Cuánto es ${n1}/${d1} + ${n2}/${d2}? Responde solo el numerador (el denominador común es ${common}).`,
    answer,
    inputType: "integer",
  };
}
