import { type Problem, randInt, choiceSet } from "./problem";
import {
  anguloComplementarioHints,
  anguloSuplementarioHints,
  areaRectanguloHints,
  areaTrianguloHints,
  coordenadasHints,
  cuadranteHints,
  cuerposHints,
  distanciaEjeHints,
  ladosHints,
  perimetroHints,
  pitagorasCatetoHints,
  pitagorasHipotenusaHints,
  semejanzaRazonHints,
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

/** Cuerpos geométricos de 1.º–2.º grado, con el artículo incluido para armar el enunciado. */
const SOLIDS: Array<{ nombre: string; caras: number; vertices: number; aristas: number }> = [
  { nombre: "un cubo", caras: 6, vertices: 8, aristas: 12 },
  { nombre: "un prisma rectangular", caras: 6, vertices: 8, aristas: 12 },
  { nombre: "un prisma triangular", caras: 5, vertices: 6, aristas: 9 },
  { nombre: "una pirámide de base cuadrada", caras: 5, vertices: 5, aristas: 8 },
  { nombre: "una pirámide de base triangular", caras: 4, vertices: 4, aristas: 6 },
];

const SOLID_FEATURES = ["caras", "vertices", "aristas"] as const;
const SOLID_FEATURE_QUESTION: Record<(typeof SOLID_FEATURES)[number], string> = {
  caras: "¿Cuántas caras",
  vertices: "¿Cuántos vértices",
  aristas: "¿Cuántas aristas",
};

/** Ternas pitagóricas primitivas y hasta qué múltiplo se escalan, para que
 * la hipotenusa/cateto siempre dé exacto sin números inmanejables. */
const PYTHAGOREAN_TRIPLES: Array<[number, number, number, number]> = [
  [3, 4, 5, 5],
  [5, 12, 13, 2],
  [8, 15, 17, 1],
  [7, 24, 25, 1],
];

function randNonZero(min: number, max: number): number {
  let n = 0;
  while (n === 0) n = randInt(min, max);
  return n;
}

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
      const solid = SOLIDS[randInt(0, SOLIDS.length - 1)];
      const feature = SOLID_FEATURES[randInt(0, SOLID_FEATURES.length - 1)];
      const answer = solid[feature];
      return {
        id,
        difficulty,
        kind: "cuerpos",
        prompt: `${SOLID_FEATURE_QUESTION[feature]} tiene ${solid.nombre}?`,
        answer,
        choices: choiceSet(answer, 2),
        inputType: "choice",
        hints: cuerposHints(solid.nombre, feature, answer),
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
      // Dentro de las tablas (hasta 10 × 10): las áreas con números de dos
      // cifras quedan para "Áreas de figuras compuestas", que ya exige
      // multiplicar con varias cifras.
      const largo = randInt(2, 10);
      const ancho = randInt(2, 10);
      return {
        id,
        difficulty,
        kind: "area_rectangulo",
        prompt: `¿Cuál es el área de un rectángulo de ${largo} × ${ancho}?`,
        answer: largo * ancho,
        inputType: "integer",
        hints: areaRectanguloHints(largo, ancho, largo * ancho),
        flavor: `🏗️ Construyes una plataforma de ${largo} por ${ancho} metros.`,
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
      const variant = randInt(0, 2);
      if (variant === 0) {
        const x = randNonZero(-9, 9);
        const y = randNonZero(-9, 9);
        const quadrant = x > 0 ? (y > 0 ? 1 : 4) : y > 0 ? 2 : 3;
        return {
          id,
          difficulty,
          kind: "cuadrante",
          prompt: `¿En qué cuadrante del plano está el punto (${x}, ${y})?`,
          answer: quadrant,
          choices: [1, 2, 3, 4],
          choiceLabels: ["I", "II", "III", "IV"],
          inputType: "choice",
          hints: cuadranteHints(x, y, quadrant),
        };
      }
      if (variant === 1) {
        const horizontal = Math.random() < 0.5;
        const fijo = randInt(-8, 8);
        const a = randInt(-9, 9);
        let b = randInt(-9, 9);
        while (b === a) b = randInt(-9, 9);
        const punto = (v: number) => (horizontal ? `(${v}, ${fijo})` : `(${fijo}, ${v})`);
        const answer = Math.abs(a - b);
        return {
          id,
          difficulty,
          kind: "distancia_eje",
          prompt: `¿Cuál es la distancia entre los puntos ${punto(a)} y ${punto(b)}?`,
          answer,
          inputType: "integer",
          hints: distanciaEjeHints(a, b, horizontal ? "x" : "y", answer),
        };
      }
      const eje = Math.random() < 0.5 ? "x" : "y";
      const x = randInt(-10, 10);
      const y = randInt(-10, 10);
      const d = randNonZero(-8, 8);
      const movimiento =
        eje === "x"
          ? d > 0
            ? `${d} unidades a la derecha`
            : `${-d} unidades a la izquierda`
          : d > 0
            ? `${d} unidades hacia arriba`
            : `${-d} unidades hacia abajo`;
      const inicial = eje === "x" ? x : y;
      return {
        id,
        difficulty,
        kind: "coordenadas",
        prompt: `El punto (${x}, ${y}) se traslada ${movimiento}. ¿Cuál es su nueva coordenada ${eje}?`,
        answer: inicial + d,
        inputType: "integer",
        hints: coordenadasHints(inicial, d, inicial + d, eje),
      };
    }
    case 9: {
      const [a0, b0, c0, maxScale] = PYTHAGOREAN_TRIPLES[randInt(0, PYTHAGOREAN_TRIPLES.length - 1)];
      const k = randInt(1, maxScale);
      // Cualquiera de los dos catetos puede ser el dato conocido.
      const [a, b] = Math.random() < 0.5 ? [a0 * k, b0 * k] : [b0 * k, a0 * k];
      const c = c0 * k;
      const askHypotenuse = Math.random() < 0.5;
      const context = randInt(0, 2);
      const prompts: Record<number, [string, string]> = {
        0: [
          `Un triángulo rectángulo tiene catetos de ${a} y ${b}. ¿Cuánto mide la hipotenusa?`,
          `Un triángulo rectángulo tiene hipotenusa ${c} y un cateto de ${a}. ¿Cuánto mide el otro cateto?`,
        ],
        1: [
          `Una escalera apoyada en una pared tiene el pie a ${a} m de la pared y llega a ${b} m de altura. ¿Cuánto mide la escalera?`,
          `Una escalera de ${c} m está apoyada en una pared, con el pie a ${a} m de la pared. ¿A qué altura de la pared llega?`,
        ],
        2: [
          `Una pantalla rectangular mide ${a} cm por ${b} cm. ¿Cuánto mide su diagonal?`,
          `Un rectángulo tiene una diagonal de ${c} cm y un lado de ${a} cm. ¿Cuánto mide el otro lado?`,
        ],
      };
      const [hypPrompt, legPrompt] = prompts[context];
      return {
        id,
        difficulty,
        kind: "pitagoras",
        prompt: askHypotenuse ? hypPrompt : legPrompt,
        answer: askHypotenuse ? c : b,
        inputType: "integer",
        hints: askHypotenuse ? pitagorasHipotenusaHints(a, b, c) : pitagorasCatetoHints(c, a, b),
      };
    }
    default: {
      // Razón de escala q/p, a menudo no entera (3/2, 5/4...): obliga a
      // razonar con la razón entre lados en vez de "multiplicar por 2".
      const p = randInt(2, 4);
      const q = randInt(p + 1, 2 * p);
      const k = randInt(1, 4);
      let m = randInt(1, 5);
      while (m === k) m = randInt(1, 5);
      const s1 = p * k;
      const g1 = q * k;
      const s2 = p * m;
      const answer = q * m;
      return {
        id,
        difficulty: 10,
        kind: "semejanza",
        prompt: `Dos triángulos son semejantes. Un lado del pequeño mide ${s1} cm y su lado correspondiente en el grande mide ${g1} cm. Otro lado del pequeño mide ${s2} cm: ¿cuánto mide su lado correspondiente en el grande?`,
        answer,
        inputType: "integer",
        hints: semejanzaRazonHints(s1, g1, s2, answer),
      };
    }
  }
}
