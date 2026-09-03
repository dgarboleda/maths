import { type Problem, randInt, shuffle } from "./problem";
import {
  balanzaHints,
  cuadraticaHints,
  desigualdadHints,
  ecuacionDosPasosHints,
  ecuacionMultiplicacionHints,
  ecuacionRestaHints,
  ecuacionSumaHints,
  evaluarExpresionHints,
  funcionHints,
  patronHints,
  proporcionesHints,
} from "./hints";

const PATTERN_SYMBOLS = ["●", "■", "▲"];

export function generateProblem(difficulty: number): Problem {
  const id = crypto.randomUUID();

  switch (difficulty) {
    case 1: {
      const unitLength = Math.random() < 0.5 ? 2 : 3;
      const unit = Array.from({ length: unitLength }, () => randInt(0, 2));
      const sequenceLength = 6;
      const sequence = Array.from({ length: sequenceLength }, (_, i) => unit[i % unitLength]);
      const nextId = unit[sequenceLength % unitLength];
      const choiceIds = shuffle([0, 1, 2]);
      return {
        id,
        difficulty,
        kind: "patrones",
        prompt: `${sequence.map((s) => PATTERN_SYMBOLS[s]).join(" ")}  →  ?`,
        answer: nextId,
        choices: choiceIds,
        choiceLabels: choiceIds.map((c) => PATTERN_SYMBOLS[c]),
        inputType: "choice",
        hints: patronHints(),
      };
    }
    case 2: {
      const a = randInt(1, 8);
      const missing = randInt(1, 8);
      const total = a + missing;
      const weights = new Set<number>([missing]);
      while (weights.size < 5) weights.add(randInt(1, 9));
      return {
        id,
        difficulty,
        kind: "balanza",
        prompt: `${a} + x = ${total}. Elige el peso que equilibra la balanza.`,
        answer: missing,
        inputType: "balanceWeight",
        balanceLeftFixed: a,
        balanceRightFixed: total,
        balanceWeights: shuffle([...weights]),
        hints: balanzaHints(a, total, missing),
      };
    }
    case 3: {
      const x = randInt(1, 15);
      const b = randInt(1, 10);
      return {
        id,
        difficulty,
        kind: "ecuacion_suma",
        prompt: `x + ${b} = ${x + b}. ¿Cuánto vale x?`,
        answer: x,
        inputType: "integer",
        hints: ecuacionSumaHints(b, x + b, x),
        flavor: "🧪 Un experimento del laboratorio esconde una cantidad x.",
      };
    }
    case 4: {
      const isMultiply = Math.random() < 0.5;
      if (isMultiply) {
        const x = randInt(2, 12);
        const m = randInt(2, 9);
        return {
          id,
          difficulty,
          kind: "ecuacion_multiplicacion",
          prompt: `${m}x = ${m * x}. ¿Cuánto vale x?`,
          answer: x,
          inputType: "integer",
          hints: ecuacionMultiplicacionHints(m, m * x, x),
        };
      }
      const x = randInt(1, 20);
      const b = randInt(1, 15);
      return {
        id,
        difficulty,
        kind: "ecuacion_resta",
        prompt: `x − ${b} = ${x - b}. ¿Cuánto vale x?`,
        answer: x,
        inputType: "integer",
        hints: ecuacionRestaHints(b, x - b, x),
      };
    }
    case 5: {
      const unitPrice = randInt(2, 9);
      const unitQty = randInt(2, 5);
      const targetQty = randInt(2, 8) * unitQty;
      const unitCost = unitPrice * unitQty;
      return {
        id,
        difficulty,
        kind: "proporciones",
        prompt: `Si ${unitQty} manzanas cuestan ${unitCost}, ¿cuánto cuestan ${targetQty} manzanas?`,
        answer: (unitCost / unitQty) * targetQty,
        inputType: "integer",
        hints: proporcionesHints(unitQty, unitCost, targetQty, (unitCost / unitQty) * targetQty),
      };
    }
    case 6: {
      const x = randInt(2, 10);
      const m = randInt(2, 6);
      const b = randInt(1, 10);
      return {
        id,
        difficulty,
        kind: "evaluar_expresion",
        prompt: `Si x = ${x}, ¿cuánto vale ${m}x + ${b}?`,
        answer: m * x + b,
        inputType: "integer",
        hints: evaluarExpresionHints(x, m, b, m * x + b),
      };
    }
    case 7: {
      const x = randInt(1, 12);
      const m = randInt(2, 6);
      const b = randInt(1, 15);
      return {
        id,
        difficulty,
        kind: "ecuacion_dos_pasos",
        prompt: `${m}x + ${b} = ${m * x + b}. ¿Cuánto vale x?`,
        answer: x,
        inputType: "integer",
        hints: ecuacionDosPasosHints(m, b, m * x + b, x),
      };
    }
    case 8: {
      const b = randInt(3, 20);
      return {
        id,
        difficulty,
        kind: "desigualdad",
        prompt: `¿Cuál es el menor número entero que cumple x > ${b}?`,
        answer: b + 1,
        inputType: "integer",
        hints: desigualdadHints(b, b + 1),
      };
    }
    case 9: {
      const m = randInt(2, 6);
      const b = randInt(-10, 10);
      const x = randInt(1, 10);
      return {
        id,
        difficulty,
        kind: "funcion",
        prompt: `f(x) = ${m}x ${b >= 0 ? "+" : "−"} ${Math.abs(b)}. ¿Cuánto es f(${x})?`,
        answer: m * x + b,
        inputType: "integer",
        hints: funcionHints(m, b, x, m * x + b),
      };
    }
    default: {
      const root = randInt(2, 15);
      const square = root * root;
      return {
        id,
        difficulty: 10,
        kind: "ecuacion_cuadratica",
        prompt: `x² = ${square}. ¿Cuánto vale x (el valor positivo)?`,
        answer: root,
        inputType: "integer",
        hints: cuadraticaHints(square, root),
      };
    }
  }
}
