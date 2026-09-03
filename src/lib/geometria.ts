import { type Problem, randInt, choiceSet } from "./problem";
import {
  anguloComplementarioHints,
  anguloSuplementarioHints,
  areaRectanguloHints,
  areaTrianguloHints,
  coordenadasHints,
  ladosHints,
  perimetroHints,
  pitagorasCatetoHints,
  pitagorasHipotenusaHints,
  semejanzaHints,
  verticesHints,
  volumenHints,
} from "./hints";

const SHAPES: Array<[string, number]> = [
  ["triángulo", 3],
  ["cuadrado", 4],
  ["rectángulo", 4],
  ["pentágono", 5],
  ["hexágono", 6],
  ["heptágono", 7],
  ["octágono", 8],
  ["rombo", 4],
];

/** Ternas pitagóricas enteras, para que la hipotenusa/cateto siempre dé exacto. */
const PYTHAGOREAN_TRIPLES: Array<[number, number, number]> = [
  [3, 4, 5],
  [6, 8, 10],
  [5, 12, 13],
  [8, 15, 17],
  [9, 12, 15],
  [7, 24, 25],
];

export function generateProblem(difficulty: number): Problem {
  const id = crypto.randomUUID();

  switch (difficulty) {
    case 1: {
      const [name, sides] = SHAPES[randInt(0, SHAPES.length - 1)];
      return {
        id,
        difficulty,
        kind: "lados",
        prompt: `¿Cuántos lados tiene un ${name}?`,
        answer: sides,
        choices: choiceSet(sides, 2),
        inputType: "choice",
        hints: ladosHints(name, sides),
      };
    }
    case 2: {
      const [name, sides] = SHAPES[randInt(0, SHAPES.length - 1)];
      return {
        id,
        difficulty,
        kind: "vertices",
        prompt: `¿Cuántos vértices tiene un ${name}? (en un polígono, los vértices son iguales a los lados)`,
        answer: sides,
        choices: choiceSet(sides, 2),
        inputType: "choice",
        hints: verticesHints(name, sides),
      };
    }
    case 3: {
      const largo = randInt(3, 20);
      const ancho = randInt(3, 20);
      return {
        id,
        difficulty,
        kind: "perimetro",
        prompt: `¿Cuál es el perímetro de un rectángulo de ${largo} × ${ancho}?`,
        answer: 2 * (largo + ancho),
        inputType: "integer",
        hints: perimetroHints(largo, ancho, 2 * (largo + ancho)),
      };
    }
    case 4: {
      const largo = randInt(3, 20);
      const ancho = randInt(3, 20);
      return {
        id,
        difficulty,
        kind: "area_rectangulo",
        prompt: `¿Cuál es el área de un rectángulo de ${largo} × ${ancho}?`,
        answer: largo * ancho,
        inputType: "integer",
        hints: areaRectanguloHints(largo, ancho, largo * ancho),
      };
    }
    case 5: {
      const base = randInt(2, 10) * 2;
      const altura = randInt(2, 12);
      return {
        id,
        difficulty,
        kind: "area_triangulo",
        prompt: `¿Cuál es el área de un triángulo con base ${base} y altura ${altura}?`,
        answer: (base * altura) / 2,
        inputType: "integer",
        hints: areaTrianguloHints(base, altura, (base * altura) / 2),
      };
    }
    case 6: {
      const grados = randInt(10, 89);
      const supl = Math.random() < 0.5;
      const answer = supl ? 180 - grados : Math.max(0, 90 - grados);
      return {
        id,
        difficulty,
        kind: supl ? "angulo_suplementario" : "angulo_complementario",
        prompt: supl
          ? `Un ángulo mide ${grados}°. ¿Cuánto mide su ángulo suplementario (para sumar 180°)?`
          : `Un ángulo mide ${grados}°. ¿Cuánto mide su ángulo complementario (para sumar 90°)?`,
        answer,
        inputType: "integer",
        hints: supl ? anguloSuplementarioHints(grados, answer) : anguloComplementarioHints(grados, answer),
      };
    }
    case 7: {
      const largo = randInt(2, 10);
      const ancho = randInt(2, 10);
      const alto = randInt(2, 10);
      return {
        id,
        difficulty,
        kind: "volumen_prisma",
        prompt: `¿Cuál es el volumen de un prisma rectangular de ${largo} × ${ancho} × ${alto}?`,
        answer: largo * ancho * alto,
        inputType: "integer",
        hints: volumenHints(largo, ancho, alto, largo * ancho * alto),
      };
    }
    case 8: {
      const x = randInt(-10, 10);
      const dx = randInt(-8, 8);
      return {
        id,
        difficulty,
        kind: "coordenadas",
        prompt: `El punto (${x}, y) se traslada ${dx >= 0 ? `${dx} unidades a la derecha` : `${Math.abs(dx)} unidades a la izquierda`}. ¿Cuál es su nueva coordenada x?`,
        answer: x + dx,
        inputType: "integer",
        hints: coordenadasHints(x, dx, x + dx),
      };
    }
    case 9: {
      const [a, b, c] = PYTHAGOREAN_TRIPLES[randInt(0, PYTHAGOREAN_TRIPLES.length - 1)];
      const askHypotenuse = Math.random() < 0.5;
      return {
        id,
        difficulty,
        kind: "pitagoras",
        prompt: askHypotenuse
          ? `Un triángulo rectángulo tiene catetos de ${a} y ${b}. ¿Cuánto mide la hipotenusa?`
          : `Un triángulo rectángulo tiene hipotenusa ${c} y un cateto de ${a}. ¿Cuánto mide el otro cateto?`,
        answer: askHypotenuse ? c : b,
        inputType: "integer",
        hints: askHypotenuse ? pitagorasHipotenusaHints(a, b, c) : pitagorasCatetoHints(c, a, b),
      };
    }
    default: {
      const scale = randInt(2, 4);
      const smallSide = randInt(2, 10);
      return {
        id,
        difficulty: 10,
        kind: "semejanza",
        prompt: `Dos figuras son semejantes con razón de escala ${scale}. Si un lado de la figura pequeña mide ${smallSide}, ¿cuánto mide el lado correspondiente de la figura grande?`,
        answer: smallSide * scale,
        inputType: "integer",
        hints: semejanzaHints(scale, smallSide, smallSide * scale),
      };
    }
  }
}
