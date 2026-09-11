import { type Problem, randInt, shuffle } from "./problem";
import {
  compararHints,
  conteoHints,
  conteoTresHints,
  conversionUnidadesHints,
  dineroHints,
  mediaHints,
  medianaHints,
  modaHints,
  ordenamientosHints,
  probabilidadHints,
  rangoHints,
  tiempoHints,
} from "./hints";

const UNIT_CONVERSIONS: Array<[string, string, number]> = [
  ["metros", "centímetros", 100],
  ["kilogramos", "gramos", 1000],
  ["litros", "mililitros", 1000],
];

/** Sucesos sobre 20 tarjetas numeradas del 1 al 20, elegidos para que la probabilidad dé un porcentaje entero. */
const CARD_EVENTS: Array<{ suceso: string; casos: string; favorable: number }> = [
  { suceso: "un múltiplo de 5", casos: "son múltiplos de 5", favorable: 4 },
  { suceso: "un número par", casos: "son pares", favorable: 10 },
  { suceso: "un múltiplo de 4", casos: "son múltiplos de 4", favorable: 5 },
  { suceso: "un número mayor que 15", casos: "son mayores que 15", favorable: 5 },
  { suceso: "un múltiplo de 10", casos: "son múltiplos de 10", favorable: 2 },
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
        flavor: "📡 El centro de control registra el efectivo de la caja.",
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
      // Mismo delta a ambos lados: el promedio real de los 3 valores siempre
      // da `avg` exacto, nunca un decimal periódico con inputType "integer".
      const delta = randInt(1, 3);
      const values = [avg - delta, avg, avg + delta];
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
      const variant = randInt(0, 2);
      if (variant === 0) {
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
          answer: (favorable * 100) / total,
          inputType: "integer",
          hints: probabilidadHints(favorable, total, (favorable * 100) / total, "son rojas"),
        };
      }
      if (variant === 1) {
        const total = Math.random() < 0.5 ? 10 : 20;
        const favorable = randInt(1, total - 1);
        return {
          id,
          difficulty,
          kind: "probabilidad",
          prompt: `Una ruleta tiene ${total} casillas del mismo tamaño y ${favorable} son azules. Si la haces girar, ¿cuál es la probabilidad (en %) de que caiga en azul?`,
          answer: (favorable * 100) / total,
          inputType: "integer",
          hints: probabilidadHints(favorable, total, (favorable * 100) / total, "son azules"),
        };
      }
      const event = CARD_EVENTS[randInt(0, CARD_EVENTS.length - 1)];
      return {
        id,
        difficulty,
        kind: "probabilidad",
        prompt: `En una caja hay 20 tarjetas numeradas del 1 al 20. Si sacas una al azar, ¿cuál es la probabilidad (en %) de sacar ${event.suceso}?`,
        answer: (event.favorable * 100) / 20,
        inputType: "integer",
        hints: probabilidadHints(event.favorable, 20, (event.favorable * 100) / 20, event.casos),
      };
    }
    default: {
      const variant = randInt(0, 2);
      if (variant === 0) {
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
      if (variant === 1) {
        const entradas = randInt(2, 4);
        const platos = randInt(2, 4);
        const postres = randInt(2, 3);
        const answer = entradas * platos * postres;
        return {
          id,
          difficulty: 10,
          kind: "conteo_tres",
          prompt: `Un restaurante ofrece ${entradas} entradas, ${platos} platos principales y ${postres} postres. Si eliges uno de cada uno, ¿cuántos menús distintos puedes armar?`,
          answer,
          inputType: "integer",
          hints: conteoTresHints(entradas, platos, postres, answer),
        };
      }
      const n = randInt(3, 4);
      const answer = n === 3 ? 6 : 24;
      return {
        id,
        difficulty: 10,
        kind: "ordenamientos",
        prompt: `¿De cuántas formas distintas se pueden ordenar ${n} amigos en una fila para una foto?`,
        answer,
        inputType: "integer",
        hints: ordenamientosHints(n, answer),
      };
    }
  }
}
