import { type Problem, randInt, shuffle } from "./problem";
import {
  compararHints,
  conteoHints,
  conversionUnidadesHints,
  dineroHints,
  mediaHints,
  medianaHints,
  modaHints,
  probabilidadHints,
  rangoHints,
  tiempoHints,
} from "./hints";

const UNIT_CONVERSIONS: Array<[string, string, number]> = [
  ["metros", "centímetros", 100],
  ["kilogramos", "gramos", 1000],
  ["litros", "mililitros", 1000],
];

export function generateProblem(difficulty: number): Problem {
  const id = crypto.randomUUID();

  switch (difficulty) {
    case 1: {
      const a = randInt(1, 20);
      let b = randInt(1, 20);
      while (b === a) b = randInt(1, 20);
      const answer = Math.max(a, b);
      return {
        id,
        difficulty,
        kind: "comparar",
        prompt: `¿Cuál número es mayor: ${a} o ${b}?`,
        answer,
        choices: shuffle([a, b]),
        inputType: "choice",
        hints: compararHints(a, b, answer),
      };
    }
    case 2: {
      const monedas5 = randInt(1, 5);
      const monedas10 = randInt(1, 5);
      const answer = monedas5 * 5 + monedas10 * 10;
      return {
        id,
        difficulty,
        kind: "dinero",
        prompt: `Tienes ${monedas5} moneda(s) de 5 y ${monedas10} moneda(s) de 10. ¿Cuánto dinero tienes en total?`,
        answer,
        choices: shuffle([answer, answer + 5, Math.max(0, answer - 10)]),
        inputType: "choice",
        hints: dineroHints(monedas5, monedas10, answer),
      };
    }
    case 3: {
      const inicio = randInt(1, 12);
      const duracion = randInt(1, 10);
      let final = (inicio + duracion) % 12;
      if (final === 0) final = 12;
      return {
        id,
        difficulty,
        kind: "tiempo",
        prompt: `Si son las ${inicio} en punto y pasan ${duracion} horas, ¿qué hora es? (responde de 1 a 12)`,
        answer: final,
        inputType: "integer",
        hints: tiempoHints(inicio, duracion, final),
      };
    }
    case 4: {
      const [from, to, factor] = UNIT_CONVERSIONS[randInt(0, UNIT_CONVERSIONS.length - 1)];
      const amount = randInt(2, 9);
      return {
        id,
        difficulty,
        kind: "conversion_unidades",
        prompt: `¿Cuántos ${to} son ${amount} ${from}?`,
        answer: amount * factor,
        inputType: "integer",
        hints: conversionUnidadesHints(from, to, amount, factor, amount * factor),
      };
    }
    case 5: {
      const count = 3;
      const avg = randInt(2, 15);
      const values = [avg - randInt(1, 3), avg, avg + randInt(1, 3)];
      const total = values.reduce((s, v) => s + v, 0);
      return {
        id,
        difficulty,
        kind: "media",
        prompt: `¿Cuál es el promedio de ${values.join(", ")}? (suman ${total}, entre ${count})`,
        answer: total / count,
        inputType: "integer",
        hints: mediaHints(values, total, count, total / count),
      };
    }
    case 6: {
      const values = shuffle([randInt(1, 30), randInt(1, 30), randInt(1, 30), randInt(1, 30), randInt(1, 30)]);
      const sorted = [...values].sort((a, b) => a - b);
      return {
        id,
        difficulty,
        kind: "mediana",
        prompt: `¿Cuál es la mediana de este conjunto: ${values.join(", ")}?`,
        answer: sorted[2],
        inputType: "integer",
        hints: medianaHints(sorted, sorted[2]),
      };
    }
    case 7: {
      const repeated = randInt(1, 20);
      const others: number[] = [];
      while (others.length < 3) {
        const candidate = randInt(1, 20);
        if (candidate !== repeated && !others.includes(candidate)) others.push(candidate);
      }
      const values = shuffle([repeated, repeated, ...others]);
      return {
        id,
        difficulty,
        kind: "moda",
        prompt: `¿Cuál es la moda (el valor que más se repite) de: ${values.join(", ")}?`,
        answer: repeated,
        inputType: "integer",
        hints: modaHints(repeated),
      };
    }
    case 8: {
      const values = [randInt(1, 50), randInt(1, 50), randInt(1, 50), randInt(1, 50)];
      const max = Math.max(...values);
      const min = Math.min(...values);
      return {
        id,
        difficulty,
        kind: "rango",
        prompt: `¿Cuál es el rango (máximo menos mínimo) de: ${values.join(", ")}?`,
        answer: max - min,
        inputType: "integer",
        hints: rangoHints(max, min, max - min),
      };
    }
    case 9: {
      const combos: Array<[number, number]> = [
        [1, 2],
        [1, 4],
        [3, 4],
        [1, 5],
        [2, 5],
        [1, 10],
        [1, 20],
        [1, 25],
        [3, 25],
        [7, 20],
        [9, 10],
        [1, 50],
      ];
      const [favorable, total] = combos[randInt(0, combos.length - 1)];
      return {
        id,
        difficulty,
        kind: "probabilidad",
        prompt: `Una bolsa tiene ${total} bolas en total, y ${favorable} son rojas. Si sacas una al azar, ¿cuál es la probabilidad de que sea roja, en porcentaje?`,
        answer: (favorable / total) * 100,
        inputType: "integer",
        hints: probabilidadHints(favorable, total, (favorable / total) * 100),
      };
    }
    default: {
      const opciones1 = randInt(2, 5);
      const opciones2 = randInt(2, 5);
      return {
        id,
        difficulty: 10,
        kind: "conteo",
        prompt: `Tienes ${opciones1} camisetas y ${opciones2} pantalones. ¿De cuántas formas distintas puedes combinarlos?`,
        answer: opciones1 * opciones2,
        inputType: "integer",
        hints: conteoHints(opciones1, opciones2, opciones1 * opciones2),
      };
    }
  }
}
