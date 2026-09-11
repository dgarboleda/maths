import { type Problem, randInt, round1 } from "./problem";
import {
  decenasHints,
  divisionHints,
  enterosHints,
  fraccionMismoDenominadorHints,
  multiplicacionHints,
  porcentajeHints,
  restaHints,
  sumaHints,
  sumaRestaDecimalHints,
} from "./hints";

/** Nivel 1-10: fija el valor en estrellas (ver economy.ts), no la edad del niño. */
export function generateProblem(difficulty: number): Problem {
  const id = crypto.randomUUID();

  switch (difficulty) {
    case 1: {
      const a = randInt(1, 3);
      const b = randInt(1, Math.max(1, 5 - a));
      const answer = a + b;
      return {
        id,
        difficulty,
        kind: "suma_5",
        prompt: `¿Cuánto es ${a} + ${b}?`,
        answer,
        inputType: "numberLine",
        lineMin: 0,
        lineMax: 5,
        startValue: a,
        hints: sumaHints(a, b, answer),
        flavor: "⚡ La central necesita reservas de energía extra.",
      };
    }
    case 2: {
      if (Math.random() < 0.3) {
        const total = randInt(11, 19);
        return {
          id,
          difficulty,
          kind: "decenas",
          prompt: `¿Cuántas decenas y sueltas hay en ${total}?`,
          answer: 10,
          inputType: "groupTens",
          groupTotal: total,
          hints: decenasHints(total),
        };
      }
      const isAdd = Math.random() < 0.5;
      let a = randInt(0, 10);
      // La recta numérica termina en 10: una suma mayor no se podría marcar.
      let b = isAdd ? randInt(0, 10 - a) : randInt(0, 10);
      if (!isAdd && a < b) [a, b] = [b, a];
      const answer = isAdd ? a + b : a - b;
      return {
        id,
        difficulty,
        kind: isAdd ? "suma_10" : "resta_10",
        prompt: `¿Cuánto es ${a} ${isAdd ? "+" : "−"} ${b}?`,
        answer,
        inputType: "numberLine",
        lineMin: 0,
        lineMax: 10,
        startValue: a,
        hints: isAdd ? sumaHints(a, b, answer) : restaHints(a, b, answer),
      };
    }
    case 3: {
      const isAdd = Math.random() < 0.5;
      if (isAdd) {
        const a = randInt(10, 90);
        const b = randInt(1, 100 - a);
        return {
          id,
          difficulty,
          kind: "suma_100",
          prompt: `¿Cuánto es ${a} + ${b}?`,
          answer: a + b,
          inputType: "numberLine",
          lineMin: 0,
          lineMax: 100,
          startValue: a,
          hints: sumaHints(a, b, a + b),
        };
      }
      const a = randInt(10, 100);
      const b = randInt(0, a);
      return {
        id,
        difficulty,
        kind: "resta_100",
        prompt: `¿Cuánto es ${a} − ${b}?`,
        answer: a - b,
        inputType: "numberLine",
        lineMin: 0,
        lineMax: 100,
        startValue: a,
        hints: restaHints(a, b, a - b),
      };
    }
    case 4: {
      const isAdd = Math.random() < 0.5;
      let a = randInt(100, 999);
      let b = randInt(100, 999);
      if (!isAdd && a < b) [a, b] = [b, a];
      const answer = isAdd ? a + b : a - b;
      return {
        id,
        difficulty,
        kind: isAdd ? "suma_1000" : "resta_1000",
        prompt: `¿Cuánto es ${a} ${isAdd ? "+" : "−"} ${b}?`,
        answer,
        inputType: "integer",
        hints: isAdd ? sumaHints(a, b, answer) : restaHints(a, b, answer),
      };
    }
    case 5: {
      const a = randInt(2, 10);
      const b = randInt(2, 10);
      return {
        id,
        difficulty,
        kind: "multiplicacion",
        prompt: `¿Cuánto es ${a} × ${b}?`,
        answer: a * b,
        inputType: "integer",
        hints: multiplicacionHints(a, b, a * b),
      };
    }
    case 6: {
      const b = randInt(2, 10);
      const answer = randInt(2, 10);
      const a = b * answer;
      return {
        id,
        difficulty,
        kind: "division",
        prompt: `¿Cuánto es ${a} ÷ ${b}?`,
        answer,
        inputType: "integer",
        hints: divisionHints(a, b, answer),
      };
    }
    case 7: {
      const denom = randInt(4, 12);
      const num1 = randInt(1, denom - 2);
      const num2 = randInt(1, denom - 1 - num1);
      return {
        id,
        difficulty,
        kind: "fracciones",
        prompt: `¿Cuánto es ${num1}/${denom} + ${num2}/${denom}? Responde solo el numerador (el denominador sigue siendo ${denom}).`,
        answer: num1 + num2,
        inputType: "integer",
        hints: fraccionMismoDenominadorHints(num1, num2, denom, num1 + num2),
      };
    }
    case 8: {
      const isAdd = Math.random() < 0.5;
      let a = round1(randInt(10, 500) / 10);
      let b = round1(randInt(10, 500) / 10);
      if (!isAdd && a < b) [a, b] = [b, a];
      const answer = round1(isAdd ? a + b : a - b);
      return {
        id,
        difficulty,
        kind: isAdd ? "suma_decimales" : "resta_decimales",
        prompt: `¿Cuánto es ${a} ${isAdd ? "+" : "−"} ${b}?`,
        answer,
        inputType: "decimal",
        hints: sumaRestaDecimalHints(a, b, isAdd, answer),
      };
    }
    case 9: {
      const combos: Array<[number, number]> = [
        [10, randInt(1, 50) * 10],
        [20, randInt(1, 25) * 5],
        [25, randInt(1, 25) * 4],
        [50, randInt(1, 50) * 2],
      ];
      const [pct, base] = combos[randInt(0, combos.length - 1)];
      return {
        id,
        difficulty,
        kind: "porcentajes",
        prompt: `¿Cuánto es el ${pct}% de ${base}?`,
        answer: (base * pct) / 100,
        inputType: "integer",
        hints: porcentajeHints(pct, base, (base * pct) / 100),
      };
    }
    default: {
      const a = randInt(-10, 10);
      const b = randInt(1, 10);
      const ops = ["+", "−", "×"] as const;
      const op = ops[randInt(0, ops.length - 1)];
      const answer = op === "+" ? a + b : op === "−" ? a - b : a * b;
      return {
        id,
        difficulty: 10,
        kind: "enteros",
        prompt: `¿Cuánto es (${a}) ${op} ${b}?`,
        answer,
        inputType: "integer",
        hints: enterosHints(a, op, b, answer),
      };
    }
  }
}
