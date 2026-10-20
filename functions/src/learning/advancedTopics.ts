import { defineLesson } from "./defineLesson";
import { choice as c, example as ex, numeric as n } from "./questions";
import type { Lesson } from "./types";

/* Clases que completan el ciclo VII del CNEB donde el programa tenía huecos:
 * interés (cantidad, 4.°), progresiones (regularidad, 3.°) y distancia y punto
 * medio en el plano (forma, 4.°). Mismo contrato que el resto del programa. */

const fmt = (x: number) => x.toLocaleString("es", { maximumFractionDigits: 6 });
/** Redondea a 6 decimales para evitar restos de coma flotante (1,1² × 1000). */
const r6 = (x: number) => Math.round(x * 1e6) / 1e6;
const sg = (x: number) => (x < 0 ? `−${fmt(-x)}` : fmt(x));
const pt = (x: number, y: number) => `(${sg(x)}, ${sg(y)})`;
const soles = (x: number) => `S/ ${fmt(x)}`;

export const INTEREST_LESSONS: Lesson[] = [
  defineLesson({
    id: "interes-compuesto",
    unitId: "proporcionalidad",
    title: "Interés simple y compuesto",
    objective:
      "Calcular el interés y el monto con interés simple y compuesto, explicar por qué el compuesto crece más con el tiempo y aplicar aumentos y descuentos porcentuales repetidos.",
    purpose:
      "Comparar un ahorro, un préstamo o una deuda de tarjeta exige saber si el interés se calcula sobre el capital inicial o sobre lo acumulado.",
    prerequisites: ["porcentajes-aplicados", "potencias-raices"],
    legacyModuleIds: ["aritmetica-d9"],
    visual: "interest",
    vocabulary: [
      { term: "Capital", meaning: "Dinero que se deposita o se presta al inicio." },
      { term: "Interés", meaning: "Lo que se gana (o se paga) por usar ese dinero durante un tiempo." },
      { term: "Monto", meaning: "Capital más intereses al final del plazo." },
    ],
    sections: [
      {
        title: "Interés simple",
        paragraphs: [
          "Con interés simple, cada año se gana el mismo porcentaje del capital inicial: S/ 1000 al 5% anual dan S/ 50 cada año.",
          "En 3 años son 3 · 50 = 150 soles de interés, y el monto es 1000 + 150 = 1150.",
        ],
        formula: "I = C · r · t ÷ 100 · M = C + I",
      },
      {
        title: "Interés compuesto",
        paragraphs: [
          "Con interés compuesto, el interés de cada año se suma al capital y el año siguiente también gana interés.",
          "Aumentar un 10% es multiplicar por 1,1. Dos años seguidos: 1000 · 1,1 · 1,1 = 1210, no 1200.",
        ],
        formula: "M = C · (1 + r/100)ᵗ",
      },
      {
        title: "Por qué se separan",
        paragraphs: [
          "El simple suma siempre lo mismo (crece en línea recta); el compuesto multiplica por el mismo factor (crece como una exponencial).",
          "Al principio casi coinciden; con más años o tasas más altas, la diferencia crece rápido. Lo mismo vale para una deuda que no se paga.",
        ],
        formula: "simple: +C·r/100 por año · compuesto: ×(1 + r/100) por año",
      },
    ],
    examples: [
      ex("Se depositan S/ 2000 al 4% de interés simple anual durante 3 años. ¿Cuál es el monto?", [
        ["I = 2000 · 4 · 3 ÷ 100 = 240", "Cada año se gana el 4% de 2000, que son 80 soles; en 3 años, tres veces eso."],
        ["M = 2000 + 240 = 2240", "El monto suma el capital inicial y todos los intereses ganados."],
        ["Comprobación: 80 + 80 + 80 = 240", "Con interés simple, el interés de cada año es siempre el mismo."],
      ], "El monto es S/ 2240."),
      ex("Los mismos S/ 2000 al 4% compuesto anual durante 3 años. ¿Cuál es el monto?", [
        ["Año 1: 2000 · 1,04 = 2080", "Multiplicar por 1,04 suma el 4% en un solo paso."],
        ["Año 2: 2080 · 1,04 = 2163,2", "El interés del segundo año se calcula sobre 2080, no sobre 2000."],
        ["Año 3: 2163,2 · 1,04 = 2249,728 ≈ 2249,73", "Es lo mismo que 2000 · 1,04³; sale casi 10 soles más que con interés simple."],
      ], "El monto es unos S/ 2249,73."),
    ],
    diagnostic: [
      n("d-1", "¿Cuánto es el 10% de 450?", 45, ["450 ÷ 10 = 45."], ["El 10% es dividir entre 10.", "450 ÷ 10.", "45."]),
      n("d-2", "¿Cuánto es 1,05 × 200?", 210, ["1,05 × 200 = 200 + 10 = 210."], ["1 × 200 = 200.", "0,05 × 200 = 10.", "Suma."]),
      c("d-3", "Un precio de 100 soles sube 10% y luego otro 10%. ¿Cuánto cuesta al final?", ["121 soles", "120 soles", "110 soles"], 0, "El segundo 10% se aplica sobre 110: 110 + 11 = 121."),
    ],
    questions(v) {
      const [p1, r1, t1] = [[1000, 5, 3], [2000, 4, 2], [1500, 6, 4], [800, 10, 3], [2500, 8, 2], [1200, 5, 5]][v],
        i1 = (p1 * r1 * t1) / 100,
        [p2, r2] = [[1000, 10], [2000, 5], [5000, 20], [500, 10], [4000, 5], [1000, 20]][v],
        y1 = r6(p2 * (1 + r2 / 100)),
        m2 = r6(p2 * (1 + r2 / 100) ** 2),
        simple2 = p2 + (2 * p2 * r2) / 100,
        [p3, r3, t3] = [[3000, 5, 2], [1000, 6, 3], [2000, 3, 4], [4000, 2, 5], [600, 10, 2], [5000, 4, 3]][v],
        i3 = (p3 * r3 * t3) / 100,
        [p5, r5] = [[10000, 10], [8000, 20], [5000, 10], [20000, 5], [4000, 25], [6000, 20]][v],
        m5 = r6(p5 * (1 - r5 / 100) ** 2),
        [r6v, t6, i6] = [[5, 2, 300], [4, 3, 600], [10, 2, 500], [6, 5, 1800], [8, 4, 1280], [3, 2, 210]][v],
        p6 = (i6 * 100) / (r6v * t6);
      return [
        v % 2 === 0
          ? c(
              "q0",
              `Al ${r2}% anual, ¿por qué un depósito con interés compuesto termina con más dinero que con interés simple?`,
              [
                "Porque los intereses ya ganados también generan intereses",
                ["Porque el banco usa una tasa más alta", `La tasa es la misma (${r2}%); cambia sobre qué cantidad se aplica.`],
                ["Porque el compuesto se cobra solo al final", "En los dos casos el interés se cuenta cada año; la diferencia es la base del cálculo."],
              ],
              0,
              "En el compuesto, cada año el porcentaje se aplica al monto acumulado, que ya incluye intereses.",
            )
          : c(
              "q0",
              `Con interés simple del ${r1}% anual sobre ${soles(p1)}, ¿qué pasa con el interés de cada año?`,
              [
                ["Crece cada año", "Eso pasa con el compuesto; el simple siempre se calcula sobre el capital inicial."],
                ["Disminuye cada año", "No disminuye: la base (el capital inicial) no cambia."],
                `Es siempre el mismo: ${soles((p1 * r1) / 100)}`,
              ],
              2,
              "El interés simple se calcula siempre sobre el capital inicial: la misma cantidad cada año.",
            ),
        n(
          "q1",
          `Se depositan ${soles(p1)} al ${r1}% de interés simple anual durante ${t1} años. ¿Cuántos soles de interés se ganan en total?`,
          i1,
          [`Interés de un año: ${fmt(p1)} · ${r1} ÷ 100 = ${fmt((p1 * r1) / 100)}.`, `En ${t1} años: ${fmt((p1 * r1) / 100)} · ${t1} = ${fmt(i1)}.`],
          ["Calcula el interés de un solo año.", `Es el ${r1}% de ${fmt(p1)}.`, `Multiplícalo por ${t1}.`],
          {
            unit: "soles",
            errors: [
              { value: (p1 * r1) / 100, feedback: `Ese es el interés de un año; en ${t1} años se gana ${t1} veces eso.` },
              { value: p1 + i1, feedback: "Ese es el monto (capital + interés); se pide solo el interés." },
            ],
          },
        ),
        n(
          "q2",
          `Completa: ${soles(p2)} al ${r2}% compuesto anual durante 2 años dan ${fmt(p2)} · ${fmt(1 + r2 / 100)}² = __ soles.`,
          m2,
          [`Primer año: ${fmt(p2)} · ${fmt(1 + r2 / 100)} = ${fmt(y1)}.`, `Segundo año: ${fmt(y1)} · ${fmt(1 + r2 / 100)} = ${fmt(m2)}.`],
          ["Multiplica una vez por el factor.", "Vuelve a multiplicar el resultado por el factor.", `${fmt(m2)}.`],
          {
            step: true,
            unit: "soles",
            errors: [{ value: simple2, feedback: "Así sería con interés simple; en el compuesto el segundo año gana interés sobre el monto del primero." }],
          },
        ),
        n(
          "q3",
          `Un préstamo de ${soles(p3)} cobra ${r3}% de interés simple anual. ¿Cuánto se devuelve en total después de ${t3} años?`,
          p3 + i3,
          [`Interés: ${fmt(p3)} · ${r3} · ${t3} ÷ 100 = ${fmt(i3)}.`, `Monto: ${fmt(p3)} + ${fmt(i3)} = ${fmt(p3 + i3)}.`],
          ["Calcula primero el interés total.", "Se devuelve el capital más el interés.", "Suma."],
          { unit: "soles", errors: [{ value: i3, feedback: "Ese es solo el interés; también se devuelve el capital prestado." }] },
        ),
        c(
          "q4",
          `Para ${soles(p2)} al ${r2}% compuesto anual durante 2 años, Ana calcula ${fmt(p2)} + 2 · ${fmt((p2 * r2) / 100)} = ${fmt(simple2)}. ¿Qué falla?`,
          [
            ["Nada, está bien", "En el compuesto, el interés del 2.° año se calcula sobre el monto del 1.er año, no sobre el capital inicial."],
            `Usó interés simple: el 2.° año gana interés sobre ${fmt(y1)}, así que el monto es ${fmt(m2)}`,
            [`Debía multiplicar ${fmt(p2)} · ${r2} · 2`, "Eso no es un monto: falta dividir entre 100 y, en el compuesto, aplicar el factor dos veces."],
          ],
          1,
          "El compuesto multiplica dos veces por el factor (1 + r/100).",
        ),
        n(
          "q5",
          `Una moto de ${soles(p5)} pierde el ${r5}% de su valor cada año (sobre lo que vale ese año). ¿Cuánto vale después de 2 años?`,
          m5,
          [`Perder ${r5}% es multiplicar por ${fmt(1 - r5 / 100)}.`, `${fmt(p5)} · ${fmt(1 - r5 / 100)}² = ${fmt(m5)}.`],
          ["¿Por cuánto se multiplica el valor cada año?", `Por ${fmt(1 - r5 / 100)}.`, "Aplica el factor dos veces."],
          {
            intent: "transfer",
            unit: "soles",
            errors: [{ value: p5 * (1 - (2 * r5) / 100), feedback: `El segundo año pierde el ${r5}% de lo que vale ese año, no del precio inicial.` }],
          },
        ),
        n(
          "q6",
          `¿Qué capital, al ${r6v}% de interés simple anual, produce ${soles(i6)} de interés en ${t6} años?`,
          p6,
          [`I = C · ${r6v} · ${t6} ÷ 100 → ${fmt(i6)} = C · ${fmt((r6v * t6) / 100)}.`, `C = ${fmt(i6)} ÷ ${fmt((r6v * t6) / 100)} = ${fmt(p6)}.`],
          ["Escribe la fórmula del interés simple con C desconocido.", `C · ${r6v} · ${t6} ÷ 100 = ${fmt(i6)}.`, "Despeja C."],
          {
            intent: "transfer",
            unit: "soles",
            errors: [{ value: i6 / (r6v * t6), feedback: "Falta el ÷ 100 del porcentaje: el resultado queda 100 veces menor." }],
          },
        ),
      ];
    },
    application: n(
      "app",
      "El banco A paga 6% de interés simple anual y el banco B, 5% de interés compuesto anual. Si depositas S/ 10 000 durante 3 años, ¿cuántos soles más obtienes en el banco que más paga?",
      223.75,
      ["A: 10 000 · 6 · 3 ÷ 100 = 1800 → 11 800.", "B: 10 000 · 1,05³ = 11 576,25.", "Paga más A: 11 800 − 11 576,25 = 223,75."],
      ["Calcula el monto de A con interés simple.", "Calcula el monto de B multiplicando tres veces por 1,05.", "Resta el menor del mayor."],
      {
        intent: "transfer",
        unit: "soles",
        errors: [{ value: 300, feedback: "El banco B es compuesto: su monto es 10 000 · 1,05³, no 10 000 + 3 · 500." }],
      },
    ),
    outcome: "Puedes calcular y comparar interés simple y compuesto, y reconocer cuándo un porcentaje se aplica sobre lo acumulado.",
    commonErrors: [
      "Aplicar el compuesto como si fuera simple (sumar el mismo interés cada año).",
      "Confundir el interés con el monto final.",
      "Restar dos veces el mismo porcentaje del precio inicial en descuentos o depreciaciones sucesivas.",
    ],
  }),
];

export const SEQUENCE_LESSONS: Lesson[] = [
  defineLesson({
    id: "progresiones",
    unitId: "expresiones",
    title: "Progresiones aritméticas y geométricas",
    objective:
      "Reconocer progresiones aritméticas y geométricas, hallar cualquier término con su regla general, sumar términos de una progresión aritmética y resolver problemas inversos.",
    purpose:
      "Planificar un ahorro que aumenta cada semana, predecir una población o una deuda: muchas situaciones avanzan sumando o multiplicando lo mismo en cada paso.",
    prerequisites: ["expresiones-algebraicas", "potencias-raices"],
    legacyModuleIds: ["algebra-d9"],
    visual: "sequence",
    vocabulary: [
      { term: "Progresión aritmética", meaning: "Cada término se obtiene sumando la misma diferencia d al anterior." },
      { term: "Progresión geométrica", meaning: "Cada término se obtiene multiplicando el anterior por la misma razón r." },
      { term: "Término general", meaning: "Fórmula que da el término de cualquier posición n sin calcular los anteriores." },
    ],
    sections: [
      {
        title: "Sumar siempre lo mismo",
        paragraphs: [
          "En 3, 7, 11, 15… se suma 4 cada vez: es una progresión aritmética con diferencia d = 4.",
          "Para llegar al término n se suman n − 1 diferencias al primero: el término 10 es 3 + 9 · 4 = 39.",
        ],
        formula: "aₙ = a₁ + (n − 1) · d",
      },
      {
        title: "Multiplicar siempre por lo mismo",
        paragraphs: [
          "En 2, 6, 18, 54… se multiplica por 3: es una progresión geométrica con razón r = 3.",
          "El término n multiplica n − 1 veces por r: el término 5 es 2 · 3⁴ = 162.",
        ],
        formula: "aₙ = a₁ · rⁿ⁻¹",
      },
      {
        title: "Sumar muchos términos",
        paragraphs: [
          "En una progresión aritmética, el primero más el último dan lo mismo que el segundo más el penúltimo: 1 + 10 = 2 + 9 = …",
          "Por eso la suma de n términos es n parejas iguales divididas entre 2.",
        ],
        formula: "Sₙ = n · (a₁ + aₙ) ÷ 2",
      },
    ],
    examples: [
      ex("¿Cuál es el término 20 de 5, 8, 11, 14…?", [
        ["d = 8 − 5 = 3", "La diferencia es lo que se suma de un término al siguiente."],
        ["a₂₀ = 5 + 19 · 3", "Del término 1 al 20 hay 19 pasos, no 20."],
        ["a₂₀ = 5 + 57 = 62", "Comprobación: a₄ = 5 + 3 · 3 = 14, coincide con la lista."],
      ], "El término 20 es 62."),
      ex("Una persona ahorra 10 soles la primera semana y cada semana 5 soles más que la anterior. ¿Cuánto ahorró en 8 semanas?", [
        ["a₈ = 10 + 7 · 5 = 45", "Primero el último término: lo que ahorra la semana 8."],
        ["S₈ = 8 · (10 + 45) ÷ 2", "La suma de una progresión aritmética son n parejas (primero + último) entre 2."],
        ["S₈ = 8 · 55 ÷ 2 = 220", "Comprobación rápida: 10 + 15 + 20 + 25 + 30 + 35 + 40 + 45 = 220."],
      ], "Ahorró 220 soles."),
    ],
    diagnostic: [
      n("d-1", "Continúa la secuencia: 3, 7, 11, 15, __", 19, ["Se suma 4: 15 + 4 = 19."], ["¿Cuánto aumenta de un número al siguiente?", "Aumenta 4.", "15 + 4."]),
      n("d-2", "¿Cuánto es 2⁵?", 32, ["2 · 2 · 2 · 2 · 2 = 32."], ["Multiplica 2 por sí mismo 5 veces.", "2 · 2 · 2 = 8.", "8 · 2 · 2."]),
      c("d-3", "¿Qué expresión da el término de la posición n en 5, 10, 15, 20…?", ["5n", "n + 5", "5 + 5 + n"], 0, "Cada término es 5 veces su posición."),
    ],
    questions(v) {
      const [a1, d1, k1] = [[3, 4, 10], [5, 3, 12], [2, 7, 8], [10, 5, 15], [1, 6, 20], [7, 2, 25]][v],
        t1 = a1 + (k1 - 1) * d1,
        [g1, r] = [[4, 3], [2, 5], [3, 2], [5, 2], [1, 4], [2, 3]][v],
        g = (k: number) => g1 * r ** (k - 1),
        [s1, sd, sn] = [[2, 3, 10], [1, 2, 20], [5, 5, 8], [3, 4, 12], [10, 2, 15], [4, 6, 9]][v],
        last = s1 + (sn - 1) * sd,
        sum = (sn * (s1 + last)) / 2,
        [h, grow, weeks] = [[12, 3, 8], [20, 2, 15], [5, 4, 10], [30, 5, 6], [8, 6, 9], [15, 1.5, 10]][v],
        [b1, bn, bk] = [[3, 10, 30], [5, 8, 40], [2, 6, 32], [10, 11, 80], [4, 9, 36], [1, 13, 97]][v],
        diff = (bk - b1) / (bn - 1),
        arith = [0, 1, 2, 3].map((i) => a1 + i * d1),
        geo = [1, 2, 3, 4].map(g);
      return [
        v % 2 === 0
          ? c(
              "q0",
              `¿Qué tipo de progresión es ${arith.join(", ")}…?`,
              [
                `Aritmética: se suma ${d1} cada vez`,
                ["Geométrica: se multiplica cada vez por lo mismo", `${arith[1]} ÷ ${arith[0]} y ${arith[2]} ÷ ${arith[1]} no dan lo mismo; lo que se repite es la diferencia.`],
                ["Ninguna: no sigue una regla", `Sí la sigue: la diferencia entre términos seguidos es siempre ${d1}.`],
              ],
              0,
              "La diferencia entre términos consecutivos es constante.",
            )
          : c(
              "q0",
              `¿Qué tipo de progresión es ${geo.join(", ")}…?`,
              [
                ["Aritmética: se suma lo mismo cada vez", `Las diferencias (${geo[1] - geo[0]}, ${geo[2] - geo[1]}…) cambian; lo constante es el cociente.`],
                `Geométrica: se multiplica por ${r} cada vez`,
                ["Ninguna: no sigue una regla", `Sí la sigue: cada término es ${r} veces el anterior.`],
              ],
              1,
              "El cociente entre términos consecutivos es constante.",
            ),
        n(
          "q1",
          `En la progresión aritmética ${arith.join(", ")}…, ¿cuál es el término ${k1}?`,
          t1,
          [`d = ${d1}.`, `a${k1} = ${a1} + (${k1} − 1) · ${d1} = ${a1} + ${(k1 - 1) * d1} = ${t1}.`],
          ["Halla la diferencia d.", `Del término 1 al ${k1} hay ${k1 - 1} pasos.`, `${a1} + ${k1 - 1} · ${d1}.`],
          { errors: [{ value: a1 + k1 * d1, feedback: `Del término 1 al ${k1} hay ${k1 - 1} diferencias, no ${k1}.` }] },
        ),
        n(
          "q2",
          `Completa: en la progresión geométrica ${geo.slice(0, 3).join(", ")}… el término 5 es ${g1} · ${r}⁴ = __.`,
          g(5),
          [`${r}⁴ = ${r ** 4}.`, `${g1} · ${r ** 4} = ${g(5)}.`],
          [`Calcula ${r}⁴.`, `Multiplica por ${g1}.`, `${g(5)}.`],
          {
            step: true,
            errors: [{ value: g(6), feedback: `Ese es el término 6: el término 5 multiplica 4 veces por ${r}, no 5.` }],
          },
        ),
        n(
          "q3",
          `¿Cuánto suman los ${sn} primeros términos de la progresión ${[0, 1, 2].map((i) => s1 + i * sd).join(", ")}…?`,
          sum,
          [`Último término: ${s1} + ${sn - 1} · ${sd} = ${last}.`, `S = ${sn} · (${s1} + ${last}) ÷ 2 = ${sum}.`],
          ["Halla primero el término " + sn + ".", "Suma el primero y el último.", `Multiplica por ${sn} y divide entre 2.`],
          { errors: [{ value: sn * (s1 + last), feedback: "Falta dividir entre 2: cada pareja (primero + último) se contó dos veces." }] },
        ),
        c(
          "q4",
          `En ${geo.join(", ")}…, Luis dice que el siguiente es ${geo[3] + geo[3] - geo[2]} porque "se suma ${geo[3] - geo[2]}". ¿Qué falla?`,
          [
            ["Nada: siempre se suma la última diferencia", `Las diferencias cambian (${geo[1] - geo[0]}, ${geo[2] - geo[1]}, ${geo[3] - geo[2]}): no es aritmética.`],
            `Es geométrica de razón ${r}: el siguiente es ${geo[3]} · ${r} = ${g(5)}`,
            [`El siguiente es ${geo[3]} + ${r}`, `Sumar ${r} no respeta la regla: cada término es ${r} veces el anterior.`],
          ],
          1,
          "Hay que comprobar qué se mantiene constante: la diferencia o el cociente.",
        ),
        n(
          "q5",
          `Una planta mide hoy ${fmt(h)} cm y crece ${fmt(grow)} cm cada semana. ¿Cuánto medirá dentro de ${weeks} semanas?`,
          r6(h + weeks * grow),
          [`Cada semana suma ${fmt(grow)}: es una progresión aritmética.`, `${fmt(h)} + ${weeks} · ${fmt(grow)} = ${fmt(r6(h + weeks * grow))}.`],
          ["¿Qué se suma cada semana?", `Dentro de ${weeks} semanas se suma ${weeks} veces.`, `${fmt(h)} + ${weeks} · ${fmt(grow)}.`],
          {
            intent: "transfer",
            unit: "cm",
            errors: [{ value: r6(h + (weeks - 1) * grow), feedback: `Hoy es el punto de partida: dentro de ${weeks} semanas habrá crecido ${weeks} veces.` }],
          },
        ),
        n(
          "q6",
          `En una progresión aritmética, el término 1 es ${b1} y el término ${bn} es ${bk}. ¿Cuál es la diferencia d?`,
          diff,
          [`Del término 1 al ${bn} hay ${bn - 1} diferencias.`, `(${bk} − ${b1}) ÷ ${bn - 1} = ${diff}.`],
          ["¿Cuánto aumenta en total del término 1 al " + bn + "?", `Ese aumento se reparte en ${bn - 1} pasos.`, "Divide."],
          {
            intent: "transfer",
            errors: [{ value: r6((bk - b1) / bn), feedback: `Entre el término 1 y el ${bn} hay ${bn - 1} pasos, no ${bn}.` }],
          },
        ),
      ];
    },
    application: n(
      "app",
      "Una persona ahorra 10 soles la primera semana y cada semana 5 soles más que la anterior. ¿En cuántas semanas habrá juntado por primera vez al menos 500 soles en total?",
      13,
      ["Sₙ = n · (10 + 10 + (n − 1) · 5) ÷ 2.", "S₁₂ = 12 · (10 + 65) ÷ 2 = 450: todavía no llega.", "S₁₃ = 13 · (10 + 70) ÷ 2 = 520: ya supera 500."],
      ["Escribe la suma de n semanas.", "Prueba con valores de n cercanos.", "Busca el primero que llega a 500."],
      {
        intent: "transfer",
        errors: [{ value: 12, feedback: "En 12 semanas lleva 450 soles: todavía no llega a 500." }],
      },
    ),
    outcome: "Puedes reconocer progresiones, hallar cualquier término y sumar términos sin escribirlos todos.",
    commonErrors: [
      "Contar n diferencias en lugar de n − 1 para llegar al término n.",
      "Tratar una progresión geométrica como aritmética (sumar la última diferencia).",
      "Olvidar dividir entre 2 en la suma de una progresión aritmética.",
    ],
  }),
];

export const COORDINATE_LESSONS: Lesson[] = [
  defineLesson({
    id: "distancia-punto-medio",
    unitId: "geometria",
    title: "Distancia y punto medio en el plano",
    objective:
      "Calcular la distancia entre dos puntos con el teorema de Pitágoras, hallar el punto medio de un segmento y resolver problemas inversos con coordenadas.",
    purpose:
      "Ubicar una antena entre dos pueblos, medir distancias en un mapa con cuadrícula o programar el movimiento de un personaje usa coordenadas.",
    prerequisites: ["pitagoras", "enteros-suma-resta"],
    legacyModuleIds: ["geometria-d9"],
    visual: "distance",
    vocabulary: [
      { term: "Coordenadas", meaning: "Par (x, y) que ubica un punto: primero la posición horizontal y luego la vertical." },
      { term: "Distancia", meaning: "Longitud del segmento que une dos puntos (en línea recta)." },
      { term: "Punto medio", meaning: "Punto del segmento que está a la misma distancia de sus dos extremos." },
    ],
    sections: [
      {
        title: "Un triángulo escondido",
        paragraphs: [
          "Entre A(1, 2) y B(4, 6) se avanza Δx = 3 en horizontal y Δy = 4 en vertical. Esos desplazamientos son los catetos de un triángulo rectángulo.",
          "El segmento AB es la hipotenusa: AB = √(3² + 4²) = √25 = 5.",
        ],
        formula: "d = √((x₂ − x₁)² + (y₂ − y₁)²)",
      },
      {
        title: "El signo no importa al elevar",
        paragraphs: [
          "Si B está a la izquierda o abajo, Δx o Δy salen negativos, pero al elevarlos al cuadrado quedan positivos.",
          "La distancia de A a B es la misma que de B a A.",
        ],
        formula: "(−3)² = 3² = 9",
      },
      {
        title: "El punto medio",
        paragraphs: [
          "El punto medio promedia las coordenadas: la x es el promedio de las dos x y la y, el de las dos y.",
          "Si se conoce un extremo y el punto medio, el otro extremo está igual de lejos al otro lado: x_B = 2 · x_M − x_A.",
        ],
        formula: "M = ((x₁ + x₂) ÷ 2, (y₁ + y₂) ÷ 2)",
      },
    ],
    examples: [
      ex("¿Cuál es la distancia entre A(−2, 1) y B(4, 9)?", [
        ["Δx = 4 − (−2) = 6; Δy = 9 − 1 = 8", "Los desplazamientos horizontal y vertical son los catetos."],
        ["d = √(6² + 8²) = √(36 + 64)", "Teorema de Pitágoras: la distancia es la hipotenusa."],
        ["d = √100 = 10", "Comprobación: es mayor que cada cateto y menor que su suma (14)."],
      ], "La distancia es 10."),
      ex("M(3, 1) es el punto medio de AB y A = (−1, 4). ¿Cuáles son las coordenadas de B?", [
        ["De A a M: Δx = 3 − (−1) = 4; Δy = 1 − 4 = −3", "De A al punto medio se recorre la mitad del camino."],
        ["B = (3 + 4, 1 − 3)", "La otra mitad repite el mismo desplazamiento desde M."],
        ["B = (7, −2)", "Comprobación: ((−1 + 7) ÷ 2, (4 − 2) ÷ 2) = (3, 1)."],
      ], "B = (7, −2)."),
    ],
    diagnostic: [
      n("d-1", "Un triángulo rectángulo tiene catetos de 6 y 8. ¿Cuánto mide la hipotenusa?", 10, ["√(36 + 64) = √100 = 10."], ["Eleva cada cateto al cuadrado.", "Suma: 36 + 64.", "Saca la raíz cuadrada."]),
      n("d-2", "¿Cuánto es −2 − 5?", -7, ["Desde −2 se retroceden 5: −7."], ["Ubica −2 en la recta.", "Restar 5 es moverse 5 a la izquierda.", "−7."]),
      c("d-3", "¿En qué cuadrante está el punto (−2, 3)?", ["Segundo (II)", "Primero (I)", "Cuarto (IV)"], 0, "x negativa y y positiva: segundo cuadrante."),
    ],
    questions(v) {
      const [ax, ay, bx, by] = [[1, 2, 4, 6], [-2, 1, 4, 9], [0, -3, 5, 9], [3, 3, -6, 15], [-4, -1, 4, 14], [2, 5, -5, -19]][v],
        dx = bx - ax,
        dy = by - ay,
        dist = Math.hypot(dx, dy),
        [mx1, mx2] = [[2, 8], [-4, 6], [1, 13], [-7, -1], [3, -13], [10, 6]][v],
        [my1, my2] = [[-3, 7], [2, 10], [-5, -9], [4, -2], [0, 16], [-8, 2]][v],
        [hx, hy, sx, sy] = [[0, 0, 6, 8], [1, 1, 13, 6], [-2, 3, 7, 15], [2, -1, 10, 14], [-3, -4, 17, -19], [5, 2, -11, 14]][v],
        mapDist = Math.hypot(sx - hx, sy - hy),
        [m1, a1] = [[3, 1], [5, -2], [-1, 4], [0, 7], [-2, -6], [6, 9]][v];
      return [
        v % 2 === 0
          ? c(
              "q0",
              `¿Por qué la distancia entre ${pt(ax, ay)} y ${pt(bx, by)} se calcula con el teorema de Pitágoras?`,
              [
                "Porque Δx y Δy son los catetos de un triángulo rectángulo y el segmento es la hipotenusa",
                ["Porque los dos puntos están en el mismo cuadrante", "El cuadrante no importa; el triángulo rectángulo aparece siempre con los desplazamientos."],
                ["Porque la distancia es Δx + Δy", "Esa suma recorre los dos catetos; el segmento recto es la hipotenusa, más corta."],
              ],
              0,
              "Los desplazamientos horizontal y vertical forman un ángulo recto.",
            )
          : c(
              "q0",
              `¿Qué es el punto medio del segmento que une ${pt(ax, ay)} y ${pt(bx, by)}?`,
              [
                ["Cualquier punto entre los dos", "Hay muchos puntos entre ellos; el punto medio es el que está justo a la mitad."],
                "El punto del segmento que está a la misma distancia de ambos extremos",
                ["El punto cuyas coordenadas son las diferencias Δx y Δy", "Las diferencias dan el desplazamiento; el punto medio promedia las coordenadas."],
              ],
              1,
              "Está sobre el segmento y lo divide en dos partes iguales.",
            ),
        n(
          "q1",
          `¿Cuál es la distancia entre A${pt(ax, ay)} y B${pt(bx, by)}?`,
          dist,
          [`Δx = ${sg(dx)}, Δy = ${sg(dy)}.`, `d = √(${dx * dx} + ${dy * dy}) = √${dist * dist} = ${dist}.`],
          ["Calcula Δx y Δy.", "Eleva cada uno al cuadrado y súmalos.", "Saca la raíz cuadrada."],
          { errors: [{ value: Math.abs(dx) + Math.abs(dy), feedback: "Sumaste los catetos; la distancia en línea recta es la hipotenusa." }] },
        ),
        n(
          "q2",
          `Completa: la coordenada x del punto medio entre ${pt(mx1, my1)} y ${pt(mx2, my2)} es (${sg(mx1)} + ${sg(mx2)}) ÷ 2 = __.`,
          (mx1 + mx2) / 2,
          [`${sg(mx1)} + ${sg(mx2)} = ${sg(mx1 + mx2)}.`, `${sg(mx1 + mx2)} ÷ 2 = ${sg((mx1 + mx2) / 2)}.`],
          ["Suma las dos coordenadas x.", "Divide entre 2.", `${sg((mx1 + mx2) / 2)}.`],
          { step: true, errors: [{ value: (mx2 - mx1) / 2, feedback: "El punto medio promedia: se suman las coordenadas, no se restan." }] },
        ),
        n(
          "q3",
          `¿Cuál es la coordenada y del punto medio entre ${pt(mx1, my1)} y ${pt(mx2, my2)}?`,
          (my1 + my2) / 2,
          [`(${sg(my1)} + ${sg(my2)}) ÷ 2 = ${sg((my1 + my2) / 2)}.`],
          ["Usa las coordenadas y.", "Súmalas.", "Divide entre 2."],
          { errors: [{ value: my1 + my2, feedback: "Falta dividir entre 2: el punto medio es el promedio." }] },
        ),
        c(
          "q4",
          `Para la distancia entre ${pt(ax, ay)} y ${pt(bx, by)}, Rosa calcula |Δx| + |Δy| = ${Math.abs(dx) + Math.abs(dy)}. ¿Qué falla?`,
          [
            ["Nada: la distancia es la suma de los desplazamientos", "Esa suma recorre los catetos; el segmento recto es la hipotenusa."],
            `Sumó los catetos: la distancia es √(${dx * dx} + ${dy * dy}) = ${dist}`,
            [`Debía restar: |Δy| − |Δx| = ${Math.abs(Math.abs(dy) - Math.abs(dx))}`, "Restar no da la longitud del segmento."],
          ],
          1,
          "La distancia en línea recta es la hipotenusa del triángulo de catetos Δx y Δy.",
        ),
        n(
          "q5",
          `En un mapa con cuadrícula de 1 km, la casa está en ${pt(hx, hy)} y el colegio en ${pt(sx, sy)}. ¿A cuántos km están en línea recta?`,
          mapDist,
          [`Δx = ${sg(sx - hx)}, Δy = ${sg(sy - hy)}.`, `√(${(sx - hx) ** 2} + ${(sy - hy) ** 2}) = ${mapDist}.`],
          ["Halla los desplazamientos en cada eje.", "Usa el teorema de Pitágoras.", "La raíz es exacta."],
          {
            intent: "transfer",
            unit: "km",
            errors: [{ value: Math.abs(sx - hx) + Math.abs(sy - hy), feedback: "Eso es lo que se recorre por las calles de la cuadrícula; en línea recta es la hipotenusa." }],
          },
        ),
        n(
          "q6",
          `M es el punto medio de AB. Si la coordenada x de M es ${sg(m1)} y la de A es ${sg(a1)}, ¿cuál es la coordenada x de B?`,
          2 * m1 - a1,
          [`De A a M se avanza ${sg(m1)} − ${sg(a1)} = ${sg(m1 - a1)}.`, `De M a B se avanza lo mismo: ${sg(m1)} + ${sg(m1 - a1)} = ${sg(2 * m1 - a1)}.`],
          ["¿Cuánto se avanza de A a M?", "De M a B se avanza lo mismo.", "x_B = 2 · x_M − x_A."],
          {
            intent: "transfer",
            errors: [{ value: (m1 + a1) / 2, feedback: "Ese es el punto medio entre A y M; B está al otro lado de M." }],
          },
        ),
      ];
    },
    application: n(
      "app",
      "Dos antenas están en (−3, 2) y (9, 7), en km. Se instala una tercera en el punto medio entre ellas. ¿A cuántos km queda de la primera antena?",
      6.5,
      ["Punto medio: ((−3 + 9) ÷ 2, (2 + 7) ÷ 2) = (3; 4,5).", "Desde (−3, 2): Δx = 6, Δy = 2,5.", "√(36 + 6,25) = √42,25 = 6,5."],
      ["Halla el punto medio.", "Calcula Δx y Δy desde la primera antena.", "Usa Pitágoras."],
      {
        intent: "transfer",
        unit: "km",
        errors: [{ value: 13, feedback: "Esa es la distancia entre las dos antenas; la tercera está en la mitad." }],
      },
    ),
    outcome: "Puedes medir distancias y hallar puntos medios con coordenadas, también cuando falta un extremo.",
    commonErrors: [
      "Sumar |Δx| + |Δy| en vez de usar el teorema de Pitágoras.",
      "Restar las coordenadas al calcular el punto medio en lugar de promediarlas.",
      "Confundir el punto medio con el extremo que falta en los problemas inversos.",
    ],
  }),
];

const PI = 3.14;
/** Polinomio x² + bx + c con signos tipográficos. */
const quad = (b: number, c: number) =>
  `x²${b === 0 ? "" : b < 0 ? ` − ${fmt(-b)}x` : ` + ${fmt(b)}x`}${c === 0 ? "" : c < 0 ? ` − ${fmt(-c)}` : ` + ${fmt(c)}`}`;
/** a(x − h)² + k con signos tipográficos. */
const vertexForm = (a: number, h: number, k: number) =>
  `${a === 1 ? "" : a === -1 ? "−" : sg(a)}(x ${h < 0 ? "+" : "−"} ${fmt(Math.abs(h))})²${k === 0 ? "" : k < 0 ? ` − ${fmt(-k)}` : ` + ${fmt(k)}`}`;

export const QUADRATIC_FUNCTION_LESSONS: Lesson[] = [
  defineLesson({
    id: "funcion-cuadratica",
    unitId: "expresiones",
    title: "Función cuadrática: vértice, máximos y mínimos",
    objective:
      "Interpretar la forma y = a(x − h)² + k, ubicar el vértice de una parábola, decidir si es un máximo o un mínimo y usarlo para optimizar áreas, ingresos y alturas.",
    purpose:
      "El área más grande con una cerca, el precio que da más ingresos o la altura máxima de una pelota se encuentran en el vértice de una parábola.",
    prerequisites: ["ecuaciones-cuadraticas", "funciones-lineales"],
    legacyModuleIds: ["algebra-d10"],
    visual: "vertex",
    vocabulary: [
      { term: "Parábola", meaning: "Gráfica de una función cuadrática: simétrica respecto de una recta vertical." },
      { term: "Vértice", meaning: "Punto más bajo (mínimo) o más alto (máximo) de la parábola." },
      { term: "Forma vértice", meaning: "y = a(x − h)² + k: el vértice es (h, k) y a indica hacia dónde abre." },
    ],
    sections: [
      {
        title: "La forma vértice",
        paragraphs: [
          "En y = (x − 3)² + 2, el cuadrado nunca es negativo: vale 0 cuando x = 3 y en ese punto y = 2. Por eso (3, 2) es el punto más bajo.",
          "Si delante hay un número negativo, y = −(x − 3)² + 2, la parábola abre hacia abajo y (3, 2) es el punto más alto.",
        ],
        formula: "y = a(x − h)² + k → vértice (h, k)",
      },
      {
        title: "Encontrar el vértice",
        paragraphs: [
          "En y = x² + bx + c, el vértice está en x = −b ÷ 2: es el punto medio entre las dos raíces, porque la parábola es simétrica.",
          "Para y = x² − 6x + 5: x = 3 y y = 9 − 18 + 5 = −4. El valor mínimo es −4.",
        ],
        formula: "x_v = −b ÷ (2a)",
      },
      {
        title: "Optimizar con el vértice",
        paragraphs: [
          "Con 20 m de cerca, un rectángulo de ancho x tiene largo 10 − x y área A = x(10 − x) = −x² + 10x: abre hacia abajo.",
          "El vértice está en x = 5: el cuadrado de 5 × 5 da el área máxima, 25 m².",
        ],
        formula: "A(x) = x(10 − x) → máximo en x = 5",
      },
    ],
    examples: [
      ex("Halla el vértice de y = x² + 4x + 1 y di si es máximo o mínimo.", [
        ["x_v = −4 ÷ 2 = −2", "Con a = 1, el vértice está en x = −b ÷ 2."],
        ["y = (−2)² + 4 · (−2) + 1 = 4 − 8 + 1 = −3", "Sustituimos x = −2 para obtener la altura del vértice."],
        ["a = 1 > 0 → abre hacia arriba", "Si a es positivo, el vértice es el punto más bajo: un mínimo."],
      ], "El vértice es (−2, −3) y es un mínimo."),
      ex("La altura de una pelota es h(t) = −5t² + 20t (metros, segundos). ¿Cuál es la altura máxima?", [
        ["t_v = −20 ÷ (2 · (−5)) = 2", "a = −5 es negativo: el vértice es un máximo."],
        ["h(2) = −5 · 4 + 20 · 2 = −20 + 40 = 20", "Sustituimos t = 2 en la función."],
        ["Comprobación: h(0) = 0 y h(4) = 0", "La pelota sube y baja simétricamente: el máximo está a mitad de camino, en t = 2."],
      ], "La altura máxima es 20 m, a los 2 segundos."),
    ],
    diagnostic: [
      n("d-1", "¿Cuánto es (−3)²?", 9, ["(−3) · (−3) = 9."], ["Multiplica −3 por sí mismo.", "Menos por menos es más.", "9."]),
      n("d-2", "Si y = x² + 1, ¿cuánto vale y cuando x = 4?", 17, ["4² + 1 = 16 + 1 = 17."], ["Eleva 4 al cuadrado.", "16.", "Suma 1."]),
      c("d-3", "¿Qué forma tiene la gráfica de y = x²?", ["Una parábola que abre hacia arriba", "Una recta", "Una parábola que abre hacia abajo"], 0, "x² nunca es negativo y crece hacia ambos lados del 0."),
    ],
    questions(v) {
      const [a, h, k, x] = [[2, 1, 3, 4], [-1, 2, 5, 5], [3, -1, -4, 1], [1, 3, -2, 7], [-2, -3, 9, -1], [1, -2, 1, 3]][v],
        y = a * (x - h) ** 2 + k,
        [b, cc] = [[-6, 5], [4, 1], [-10, 30], [8, 10], [-2, 0], [12, 40]][v],
        xv = -b / 2,
        yv = cc - (b * b) / 4,
        [vh, vk] = [[2, 5], [-1, 4], [3, -2], [1, 6], [-3, 1], [4, 3]][v],
        fence = [24, 40, 36, 20, 32, 48][v],
        speed = [20, 30, 10, 40, 15, 25][v];
      return [
        v % 2 === 0
          ? c(
              "q0",
              `En y = ${vertexForm(-1, vh, vk)}, ¿qué representa el ${sg(vk)}?`,
              [
                ["El punto donde la parábola corta el eje x", "Eso son las raíces; k es la altura del vértice."],
                `El valor máximo de y, que se alcanza cuando x = ${sg(vh)}`,
                ["El valor mínimo de y", "Con el signo menos delante, la parábola abre hacia abajo: k es el máximo."],
              ],
              1,
              "En la forma vértice, k es la altura del vértice; con a < 0 es el máximo.",
            )
          : c(
              "q0",
              `¿Por qué y = ${vertexForm(1, vh, vk)} nunca vale menos que ${sg(vk)}?`,
              [
                "Porque un cuadrado nunca es negativo, así que lo más pequeño que suma es 0",
                ["Porque x siempre es positivo", "x puede ser negativo; lo que nunca es negativo es el cuadrado."],
                [`Porque ${sg(vk)} es el término independiente`, `Ese número solo es el mínimo porque se le suma un cuadrado, que vale 0 en x = ${sg(vh)}.`],
              ],
              0,
              "(x − h)² ≥ 0, y vale 0 justo en x = h.",
            ),
        n(
          "q1",
          `Si y = ${vertexForm(a, h, k)}, ¿cuánto vale y cuando x = ${sg(x)}?`,
          y,
          [`x − ${sg(h)} = ${sg(x - h)}; al cuadrado: ${(x - h) ** 2}.`, `${sg(a)} · ${(x - h) ** 2} ${k < 0 ? "−" : "+"} ${fmt(Math.abs(k))} = ${sg(y)}.`],
          ["Calcula primero lo que está dentro del paréntesis.", "Eleva al cuadrado.", "Multiplica por a y suma k."],
          { errors: [{ value: a * (x - h) + k, feedback: "Falta elevar al cuadrado el paréntesis antes de multiplicar." }] },
        ),
        n(
          "q2",
          `Completa: el vértice de y = ${quad(b, cc)} está en x = −(${sg(b)}) ÷ 2 = __.`,
          xv,
          [`−(${sg(b)}) = ${sg(-b)}.`, `${sg(-b)} ÷ 2 = ${sg(xv)}.`],
          ["Cambia el signo de b.", "Divide entre 2.", `${sg(xv)}.`],
          { step: true, errors: [{ value: b / 2, feedback: "Falta el signo menos: el vértice está en x = −b ÷ 2." }] },
        ),
        n(
          "q3",
          `¿Cuál es el valor mínimo de y = ${quad(b, cc)}?`,
          yv,
          [`El vértice está en x = ${sg(xv)}.`, `y = (${sg(xv)})² + (${sg(b)}) · (${sg(xv)})${cc ? ` + ${fmt(cc)}` : ""} = ${sg(yv)}.`],
          ["Halla primero la x del vértice.", "Sustitúyela en la función.", "Ese valor de y es el mínimo."],
          { errors: [{ value: cc, feedback: "Ese es el valor en x = 0 (donde corta el eje y); el mínimo está en el vértice." }] },
        ),
        c(
          "q4",
          `Para y = ${vertexForm(-1, vh, vk)}, Marta dice que el vértice es un mínimo. ¿Qué falla?`,
          [
            ["Nada: todo vértice es un mínimo", "Solo cuando a > 0. Aquí a = −1 y la parábola abre hacia abajo."],
            `Con a negativo la parábola abre hacia abajo: el vértice ${pt(vh, vk)} es un máximo`,
            [`El vértice está en ${pt(-vh, vk)}`, `En a(x − h)² + k el vértice está en x = h = ${sg(vh)}.`],
          ],
          1,
          "El signo de a decide si el vértice es el punto más bajo o el más alto.",
        ),
        n(
          "q5",
          `Con ${fence} m de cerca se quiere encerrar un terreno rectangular. ¿Cuál es el área máxima posible?`,
          (fence / 4) ** 2,
          [`Ancho x, largo ${fence / 2} − x: A = x(${fence / 2} − x).`, `El vértice está en x = ${fence / 4}: es un cuadrado de ${fence / 4} m.`, `A = ${fence / 4}² = ${(fence / 4) ** 2}.`],
          ["Ancho + largo = la mitad de la cerca.", "Escribe el área en función del ancho.", "El máximo está en el vértice."],
          {
            intent: "transfer",
            unit: "m²",
            errors: [{ value: (fence / 2) ** 2, feedback: `Ancho + largo suman ${fence / 2}, no cada lado: el cuadrado óptimo tiene lado ${fence / 4}.` }],
          },
        ),
        n(
          "q6",
          `La altura (en metros) de una pelota lanzada hacia arriba es h(t) = −5t² + ${speed}t. ¿En qué segundo alcanza su altura máxima?`,
          speed / 10,
          [`t = −${speed} ÷ (2 · (−5)) = ${fmt(speed / 10)}.`, `Comprobación: vuelve al suelo en t = ${fmt(speed / 5)}; el máximo está a la mitad.`],
          ["Es una parábola que abre hacia abajo.", "El vértice está en t = −b ÷ (2a).", `a = −5 y b = ${speed}.`],
          {
            intent: "transfer",
            unit: "s",
            errors: [{ value: speed / 5, feedback: "Ese es el momento en que vuelve al suelo (h = 0); la altura máxima está a la mitad." }],
          },
        ),
      ];
    },
    application: n(
      "app",
      "Un cine vende 200 entradas a 20 soles. Por cada sol que baja el precio, vende 20 entradas más. ¿Con qué precio (en soles) obtiene el mayor ingreso?",
      15,
      ["Si baja x soles: I(x) = (20 − x)(200 + 20x) = −20x² + 200x + 4000.", "Vértice: x = −200 ÷ (2 · (−20)) = 5.", "Precio: 20 − 5 = 15 soles (ingreso 15 · 300 = 4500)."],
      ["Escribe precio y entradas en función de la rebaja x.", "Multiplica para obtener el ingreso.", "Busca el vértice."],
      {
        intent: "transfer",
        unit: "soles",
        errors: [
          { value: 20, feedback: "Con 20 soles ingresa 4000; bajando el precio a 15 vende 300 entradas e ingresa 4500." },
          { value: 5, feedback: "5 es la rebaja que conviene; se pregunta el precio final." },
        ],
      },
    ),
    outcome: "Puedes leer el vértice de una parábola, saber si es máximo o mínimo y usarlo para optimizar.",
    commonErrors: [
      "Olvidar el signo menos en x = −b ÷ (2a).",
      "Creer que el vértice siempre es un mínimo, sin mirar el signo de a.",
      "Confundir el valor en x = 0 (o las raíces) con el valor máximo o mínimo.",
    ],
  }),
];

export const SOLID_LESSONS: Lesson[] = [
  defineLesson({
    id: "volumen-conos-esferas",
    unitId: "geometria",
    title: "Volumen de pirámides, conos y esferas",
    objective:
      "Calcular volúmenes de pirámides, conos y esferas, explicar por qué una pirámide o un cono ocupan un tercio del prisma o cilindro de igual base y altura, y resolver problemas inversos.",
    purpose:
      "Envases cónicos, silos, tanques esféricos y tiendas de campaña: para saber cuánto contienen hay que ir más allá de prismas y cilindros.",
    prerequisites: ["volumen", "potencias-raices"],
    legacyModuleIds: ["geometria-d7"],
    visual: "solids",
    vocabulary: [
      { term: "Pirámide", meaning: "Cuerpo con una base poligonal y caras triangulares que se juntan en un vértice." },
      { term: "Cono", meaning: "Cuerpo con base circular que termina en un vértice." },
      { term: "Esfera", meaning: "Cuerpo cuyos puntos están todos a la misma distancia (el radio) del centro." },
    ],
    sections: [
      {
        title: "Un tercio del prisma",
        paragraphs: [
          "Una pirámide cabe exactamente tres veces en el prisma de la misma base y altura: si se llena de arena, tres pirámides llenan el prisma.",
          "Por eso V = base × altura ÷ 3. Lo mismo vale para el cono respecto del cilindro.",
        ],
        formula: "V_pirámide = B · h ÷ 3 · V_cono = π · r² · h ÷ 3",
      },
      {
        title: "La esfera",
        paragraphs: [
          "Una esfera de radio r ocupa dos tercios del cilindro que la envuelve (radio r y altura 2r): (2/3) · π · r² · 2r = (4/3) · π · r³.",
          "Como el radio está al cubo, al duplicar el radio el volumen se multiplica por 2³ = 8.",
        ],
        formula: "V_esfera = 4 · π · r³ ÷ 3",
      },
      {
        title: "Medidas y unidades",
        paragraphs: [
          "Usamos π ≈ 3,14. Las longitudes deben estar en la misma unidad; el volumen queda en unidades cúbicas (cm³, m³).",
          "1 dm³ = 1 litro y 1 m³ = 1000 litros: así se pasa de volumen a capacidad.",
        ],
        formula: "1 m³ = 1000 L",
      },
    ],
    examples: [
      ex("Calcula el volumen de un cono de radio 3 cm y altura 8 cm (π ≈ 3,14).", [
        ["Base: 3,14 · 3² = 28,26 cm²", "El área de la base circular es π · r²."],
        ["Cilindro: 28,26 · 8 = 226,08 cm³", "Base por altura daría el cilindro de igual base y altura."],
        ["Cono: 226,08 ÷ 3 = 75,36 cm³", "El cono ocupa un tercio de ese cilindro."],
      ], "El cono tiene unos 75,36 cm³."),
      ex("Un tanque esférico tiene 3 m de radio. ¿Cuántos litros caben?", [
        ["V = 4 · 3,14 · 3³ ÷ 3", "Fórmula de la esfera con r = 3."],
        ["V = 4 · 3,14 · 27 ÷ 3 = 113,04 m³", "27 ÷ 3 = 9; 4 · 3,14 · 9 = 113,04."],
        ["113,04 · 1000 = 113 040 L", "Cada metro cúbico son 1000 litros."],
      ], "Caben unos 113 040 litros."),
    ],
    diagnostic: [
      n("d-1", "¿Cuál es el área de un círculo de radio 2? Usa π ≈ 3,14.", 12.56, ["3,14 · 2² = 3,14 · 4 = 12,56."], ["El área es π · r².", "2² = 4.", "3,14 · 4."]),
      n("d-2", "¿Cuánto es 2³ · 3?", 24, ["2³ = 8; 8 · 3 = 24."], ["2³ = 2 · 2 · 2.", "Es 8.", "Multiplica por 3."]),
      c("d-3", "¿Cuál de estos cuerpos tiene una base circular y termina en punta?", ["El cono", "El cilindro", "La esfera"], 0, "El cono tiene una base circular y un vértice."),
    ],
    questions(v) {
      const [side, ph] = [[6, 5], [3, 10], [9, 4], [12, 7], [5, 6], [4, 9]][v],
        pyramid = (side * side * ph) / 3,
        [cr, ch] = [[3, 4], [2, 6], [3, 10], [6, 5], [1, 9], [4, 3]][v],
        cone = r6((PI * cr * cr * ch) / 3),
        cylinder = r6(PI * cr * cr * ch),
        sr = [3, 6, 9, 1.5, 12, 4.5][v],
        sphere = r6((4 * PI * sr ** 3) / 3),
        [ta, tb, th] = [[3, 2, 2], [4, 3, 2], [2, 1.5, 2], [5, 3, 2], [6, 4, 3], [3, 3, 2]][v],
        tent = r6((ta * tb * th) / 3),
        [ir, ih] = [[2, 3], [3, 8], [1, 6], [4, 9], [5, 12], [2, 15]][v],
        iv = r6((PI * ir * ir * ih) / 3);
      return [
        v % 2 === 0
          ? c(
              "q0",
              `¿Por qué un cono de radio ${cr} cm y altura ${ch} cm ocupa un tercio del cilindro de igual radio y altura?`,
              [
                "Porque tres conos iguales llenan exactamente ese cilindro",
                ["Porque el cono tiene un tercio de la altura", `Tienen la misma altura (${ch} cm); el cono se va estrechando hasta la punta.`],
                ["Porque el cono tiene tres caras", "El cono tiene una base y una superficie curva; el tercio viene de comparar volúmenes."],
              ],
              0,
              "Se comprueba llenando el cilindro con tres conos de arena o agua.",
            )
          : c(
              "q0",
              `Si el radio de una esfera pasa de ${fmt(sr)} a ${fmt(2 * sr)} cm, ¿qué pasa con su volumen?`,
              [
                ["Se duplica", "El radio está al cubo: el volumen se multiplica por 2³."],
                ["Se multiplica por 4", "Eso pasaría con el área (r²); el volumen depende de r³."],
                "Se multiplica por 8",
              ],
              2,
              "V depende de r³: duplicar r multiplica el volumen por 2 · 2 · 2 = 8.",
            ),
        n(
          "q1",
          `Una pirámide tiene base cuadrada de ${side} cm de lado y ${ph} cm de altura. ¿Cuál es su volumen?`,
          pyramid,
          [`Base: ${side}² = ${side * side} cm².`, `V = ${side * side} · ${ph} ÷ 3 = ${fmt(pyramid)}.`],
          ["Calcula el área de la base.", "Multiplica por la altura.", "Divide entre 3."],
          { unit: "cm³", errors: [{ value: side * side * ph, feedback: "Ese es el prisma de igual base y altura; la pirámide ocupa un tercio." }] },
        ),
        n(
          "q2",
          `Completa: un cono de radio ${cr} cm y altura ${ch} cm tiene V = 3,14 · ${cr}² · ${ch} ÷ 3 = __ cm³.`,
          cone,
          [`3,14 · ${cr * cr} = ${fmt(r6(PI * cr * cr))}.`, `· ${ch} = ${fmt(cylinder)}; ÷ 3 = ${fmt(cone)}.`],
          [`${cr}² = ${cr * cr}.`, "Multiplica por 3,14 y por la altura.", "Divide entre 3."],
          { step: true, unit: "cm³", errors: [{ value: cylinder, feedback: "Falta dividir entre 3: ese es el volumen del cilindro." }] },
        ),
        n(
          "q3",
          `¿Cuál es el volumen de una esfera de radio ${fmt(sr)} dm? Usa π ≈ 3,14.`,
          sphere,
          [`${fmt(sr)}³ = ${fmt(sr ** 3)}.`, `V = 4 · 3,14 · ${fmt(sr ** 3)} ÷ 3 = ${fmt(sphere)}.`],
          ["Eleva el radio al cubo.", "Multiplica por 4 y por 3,14.", "Divide entre 3."],
          { unit: "dm³", errors: [{ value: r6(4 * PI * sr ** 3), feedback: "Falta dividir entre 3: V = 4 · π · r³ ÷ 3." }] },
        ),
        c(
          "q4",
          `Para el volumen de un cono de radio ${cr} cm y altura ${ch} cm, Pedro calcula 3,14 · ${cr}² · ${ch} = ${fmt(cylinder)} cm³. ¿Qué falla?`,
          [
            ["Nada, está bien", "Eso es el cilindro de igual base y altura; el cono ocupa un tercio."],
            `Calculó el cilindro: el cono es un tercio, ${fmt(cone)} cm³`,
            [`Debía usar el diámetro: 3,14 · ${(2 * cr) ** 2} · ${ch}`, "La fórmula usa el radio al cuadrado; con el diámetro saldría 4 veces más."],
          ],
          1,
          "Cono y pirámide: base por altura, dividido entre 3.",
        ),
        n(
          "q5",
          `Una tienda de campaña tiene forma de pirámide de base rectangular de ${fmt(ta)} m × ${fmt(tb)} m y ${fmt(th)} m de altura. ¿Qué volumen de aire contiene?`,
          tent,
          [`Base: ${fmt(ta)} · ${fmt(tb)} = ${fmt(ta * tb)} m².`, `V = ${fmt(ta * tb)} · ${fmt(th)} ÷ 3 = ${fmt(tent)}.`],
          ["La base es un rectángulo.", "Multiplica base por altura.", "Es una pirámide: divide entre 3."],
          {
            intent: "transfer",
            unit: "m³",
            errors: [{ value: r6(ta * tb * th), feedback: "Así sería una caja (prisma); la pirámide ocupa un tercio." }],
          },
        ),
        n(
          "q6",
          `Un cono de ${ir} cm de radio tiene un volumen de ${fmt(iv)} cm³ (π ≈ 3,14). ¿Cuál es su altura?`,
          ih,
          [`${fmt(iv)} = 3,14 · ${ir * ir} · h ÷ 3.`, `h = 3 · ${fmt(iv)} ÷ (3,14 · ${ir * ir}) = ${ih}.`],
          ["Escribe la fórmula del cono con h desconocida.", "Multiplica el volumen por 3.", `Divide entre 3,14 · ${ir * ir}.`],
          {
            intent: "transfer",
            unit: "cm",
            errors: [{ value: r6(iv / (PI * ir * ir)), feedback: "Falta multiplicar por 3: el volumen del cono es un tercio del cilindro." }],
          },
        ),
      ];
    },
    application: n(
      "app",
      "Una bola de helado esférica de 3 cm de radio se derrite dentro de un cucurucho cónico de 3 cm de radio y 10 cm de altura. ¿Cuántos cm³ de helado se desbordan? Usa π ≈ 3,14.",
      18.84,
      ["Esfera: 4 · 3,14 · 27 ÷ 3 = 113,04 cm³.", "Cono: 3,14 · 9 · 10 ÷ 3 = 94,2 cm³.", "Se desbordan 113,04 − 94,2 = 18,84 cm³."],
      ["Calcula el volumen de la bola.", "Calcula la capacidad del cono.", "Resta."],
      {
        intent: "transfer",
        unit: "cm³",
        errors: [{ value: 169.56, feedback: "Calculaste el cono sin dividir entre 3: su capacidad es 94,2 cm³, menor que la bola." }],
      },
    ),
    outcome: "Puedes calcular volúmenes de pirámides, conos y esferas y explicar de dónde salen sus fórmulas.",
    commonErrors: [
      "Olvidar dividir entre 3 en pirámides y conos.",
      "Usar el diámetro en lugar del radio.",
      "Creer que al duplicar el radio el volumen se duplica (se multiplica por 8).",
    ],
  }),
];

export const CONDITIONAL_LESSONS: Lesson[] = [
  defineLesson({
    id: "probabilidad-condicional",
    unitId: "datos",
    title: "Probabilidad condicional y tablas de doble entrada",
    objective:
      "Organizar datos en tablas de doble entrada, calcular probabilidades condicionadas, distinguir P(A | B) de P(B | A) e interpretar resultados de pruebas y encuestas.",
    purpose:
      "Interpretar una prueba médica, una encuesta o un titular exige saber de qué grupo se está hablando: no es lo mismo el porcentaje de los enfermos que dan positivo que el de los positivos que están enfermos.",
    prerequisites: ["probabilidad-compuesta", "fraccion-decimal-porcentaje"],
    legacyModuleIds: ["medicion-d10"],
    visual: "two-way",
    vocabulary: [
      { term: "Tabla de doble entrada", meaning: "Tabla que clasifica cada caso según dos características a la vez." },
      { term: "Probabilidad condicionada", meaning: "P(A | B): probabilidad de A sabiendo que ocurrió B; se calcula dentro del grupo B." },
      { term: "Independencia", meaning: "Saber que ocurrió B no cambia la probabilidad de A: P(A | B) = P(A)." },
    ],
    sections: [
      {
        title: "Dentro de un grupo",
        paragraphs: [
          "En una encuesta, 20 estudiantes son de 5.°; de ellos, 14 prefieren vóley. P(vóley | 5.°) = 14/20 = 0,7.",
          "La barra | se lee «sabiendo que»: el denominador es el total del grupo que ya sabemos, no el total de la encuesta.",
        ],
        formula: "P(A | B) = casos con A y B ÷ casos con B",
      },
      {
        title: "No es lo mismo al revés",
        paragraphs: [
          "Si 22 estudiantes prefieren vóley y 14 son de 5.°, P(5.° | vóley) = 14/22 ≈ 0,64, distinto de 0,7.",
          "Confundir P(A | B) con P(B | A) es un error frecuente en titulares y en la interpretación de pruebas médicas.",
        ],
        formula: "P(vóley | 5.°) ≠ P(5.° | vóley)",
      },
      {
        title: "Cuando el grupo no importa",
        paragraphs: [
          "Si P(vóley | 5.°) es igual a P(vóley) en toda la encuesta, saber el grado no cambia nada: los sucesos son independientes.",
          "Si son distintas, las dos características están relacionadas en esos datos (lo que no prueba que una cause la otra).",
        ],
        formula: "independientes ⇔ P(A | B) = P(A)",
      },
    ],
    examples: [
      ex("En una encuesta, de 30 estudiantes de 4.°, 18 prefieren fútbol; de 20 de 5.°, 8 prefieren fútbol. ¿Cuál es P(4.° | fútbol)?", [
        ["Fútbol en total: 18 + 8 = 26", "El grupo que conocemos es el de quienes prefieren fútbol."],
        ["De esos 26, son de 4.°: 18", "Contamos los casos que cumplen las dos condiciones."],
        ["P(4.° | fútbol) = 18/26 = 9/13 ≈ 0,69", "Se divide entre el total del grupo conocido, no entre los 50."],
      ], "P(4.° | fútbol) = 9/13."),
      ex("El 2% de una población tiene una infección. Una prueba detecta al 90% de los infectados y da falso positivo en el 5% de los sanos. De 1000 personas, ¿qué fracción de los positivos está infectada?", [
        ["Infectados: 20; positivos entre ellos: 18", "El 90% de 20 son 18."],
        ["Sanos: 980; falsos positivos: 49", "El 5% de 980 son 49."],
        ["P(infectado | positivo) = 18 ÷ (18 + 49) = 18/67 ≈ 0,27", "Hay muchos más sanos, así que la mayoría de positivos son falsos."],
      ], "Solo un 27% aproximado de los positivos está infectado."),
    ],
    diagnostic: [
      n("d-1", "¿Cuánto es 12/20 como decimal?", 0.6, ["12 ÷ 20 = 0,6."], ["Simplifica: 12/20 = 3/5.", "3 ÷ 5.", "0,6."]),
      n("d-2", "En un aula de 30 estudiantes, 12 son mujeres. ¿Qué fracción son mujeres? Escríbela como decimal.", 0.4, ["12/30 = 0,4."], ["Mujeres ÷ total.", "12 ÷ 30.", "0,4."]),
      c("d-3", "Al lanzar un dado, ¿cuál es la probabilidad de obtener un número par?", ["1/2", "1/3", "1/6"], 0, "Hay 3 pares (2, 4, 6) de 6 resultados."),
    ],
    questions(v) {
      const [f4, v4, f5, v5] = [[12, 8, 6, 14], [10, 15, 5, 20], [9, 3, 6, 9], [16, 4, 5, 15], [7, 13, 14, 6], [21, 9, 10, 10]][v],
        total = f4 + v4 + f5 + v5,
        table = `4.°: ${f4} fútbol y ${v4} vóley; 5.°: ${f5} fútbol y ${v5} vóley`,
        pv5 = v5 / (f5 + v5),
        pf4 = f4 / (f4 + v4),
        p5v = v5 / (v4 + v5),
        [, infected, truePos, falsePos] = [[200, 20, 18, 18], [500, 50, 45, 90], [100, 10, 9, 27], [400, 40, 36, 12], [300, 30, 27, 63], [1000, 100, 90, 60]][v],
        [share, voley] = [[0.6, 25], [0.75, 40], [0.4, 35], [0.25, 48], [0.8, 30], [0.3, 30]][v];
      return [
        v % 2 === 0
          ? c(
              "q0",
              `En una encuesta (${table}), ¿qué significa P(vóley | 5.°)?`,
              [
                "De los estudiantes de 5.°, la fracción que prefiere vóley",
                ["De los que prefieren vóley, la fracción que es de 5.°", "Eso es P(5.° | vóley): el grupo conocido sería el de vóley."],
                [`La fracción de toda la encuesta que es de 5.° y prefiere vóley`, `Eso es P(5.° y vóley), con denominador ${total}.`],
              ],
              0,
              "Lo que va después de la barra es el grupo dentro del cual se calcula.",
            )
          : c(
              "q0",
              `En una encuesta (${table}), ¿por qué P(5.° | vóley) y P(vóley | 5.°) suelen dar resultados distintos?`,
              [
                ["Porque una de las dos está mal calculada", "Las dos pueden estar bien: responden preguntas diferentes."],
                "Porque se divide entre totales distintos: los que prefieren vóley o los de 5.°",
                ["Porque el orden de las letras cambia el numerador", `El numerador es el mismo (${v5}); cambia el denominador.`],
              ],
              1,
              "El grupo conocido cambia, y con él el denominador.",
            ),
        n(
          "q1",
          `En una encuesta (${table}), ¿cuál es P(vóley | 5.°)? Escríbela como decimal o fracción.`,
          pv5,
          [`Estudiantes de 5.°: ${f5} + ${v5} = ${f5 + v5}.`, `P = ${v5}/${f5 + v5} = ${fmt(pv5)}.`],
          ["El grupo conocido es el de 5.°.", "¿Cuántos de 5.° prefieren vóley?", "Divide entre el total de 5.°."],
          { errors: [{ value: r6(v5 / total), feedback: `Dividiste entre toda la encuesta (${total}); se calcula solo dentro de 5.°.` }] },
        ),
        n(
          "q2",
          `Completa: con los datos (${table}), P(fútbol | 4.°) = ${f4} ÷ (${f4} + ${v4}) = __.`,
          pf4,
          [`${f4} + ${v4} = ${f4 + v4}.`, `${f4} ÷ ${f4 + v4} = ${fmt(pf4)}.`],
          ["Suma los de 4.°.", "Divide los de 4.° que prefieren fútbol entre ese total.", `${fmt(pf4)}.`],
          { step: true, errors: [{ value: r6(f4 / total), feedback: `El denominador es el total de 4.° (${f4 + v4}), no el de la encuesta.` }] },
        ),
        n(
          "q3",
          `En una encuesta (${table}), ¿cuál es P(5.° | vóley)? Escríbela como fracción.`,
          p5v,
          [`Prefieren vóley: ${v4} + ${v5} = ${v4 + v5}.`, `De ellos son de 5.°: ${v5}. P = ${v5}/${v4 + v5}.`],
          ["El grupo conocido es el de vóley.", "¿Cuántos de ese grupo son de 5.°?", "Divide entre el total de vóley."],
          { errors: [{ value: pv5, feedback: "Esa es P(vóley | 5.°): dividiste entre los de 5.°, no entre los de vóley." }] },
        ),
        c(
          "q4",
          `Con los datos (${table}), un titular dice: «el ${fmt(pv5 * 100)}% de los de 5.° prefiere vóley, así que el ${fmt(pv5 * 100)}% de quienes prefieren vóley son de 5.°». ¿Qué falla?`,
          [
            ["Nada: es la misma probabilidad", "Se divide entre totales distintos: los de 5.° o los de vóley."],
            `Confunde P(vóley | 5.°) con P(5.° | vóley), que es ${v5}/${v4 + v5}`,
            ["Que debía usar el total de la encuesta", `Con el total (${total}) se obtiene P(5.° y vóley), otra cosa distinta.`],
          ],
          1,
          "Invertir la condición cambia el grupo de referencia.",
        ),
        n(
          "q5",
          `De ${[200, 500, 100, 400, 300, 1000][v]} personas, ${infected} tienen un virus. La prueba da positivo en ${truePos} de los que lo tienen y en ${falsePos} de los que no. Si alguien da positivo, ¿qué probabilidad hay de que tenga el virus? Escríbela como fracción o decimal.`,
          truePos / (truePos + falsePos),
          [`Positivos: ${truePos} + ${falsePos} = ${truePos + falsePos}.`, `Con virus entre los positivos: ${truePos}/${truePos + falsePos} = ${fmt(truePos / (truePos + falsePos))}.`],
          ["El grupo conocido es el de los positivos.", "Cuenta todos los positivos.", "¿Cuántos de ellos tienen el virus?"],
          {
            intent: "transfer",
            errors: [{ value: truePos / infected, feedback: "Ese es el porcentaje de infectados que da positivo; se pide, entre los positivos, cuántos están infectados." }],
          },
        ),
        n(
          "q6",
          `En una encuesta, ${voley} estudiantes prefieren vóley y P(5.° | vóley) = ${fmt(share * 100)}%. ¿Cuántos estudiantes son de 5.° y prefieren vóley?`,
          r6(share * voley),
          [`P(5.° | vóley) = (5.° y vóley) ÷ ${voley}.`, `(5.° y vóley) = ${fmt(share)} · ${voley} = ${fmt(r6(share * voley))}.`],
          ["El denominador es el grupo de vóley.", "Despeja el numerador.", "Multiplica."],
          {
            intent: "transfer",
            errors: [{ value: r6(voley - share * voley), feedback: "Esos son los de vóley que no son de 5.°." }],
          },
        ),
      ];
    },
    application: n(
      "app",
      "En un colegio, el 60% de los estudiantes llega en bus y el 40% caminando. Llega tarde el 10% de los que van en bus y el 25% de los que caminan. Si un estudiante llegó tarde, ¿qué probabilidad hay de que haya ido en bus? Escríbela como decimal.",
      0.375,
      ["De cada 100: 60 en bus (6 tarde) y 40 caminando (10 tarde).", "Llegan tarde 6 + 10 = 16.", "P(bus | tarde) = 6/16 = 0,375."],
      ["Imagina 100 estudiantes.", "Cuenta cuántos llegan tarde en cada grupo.", "Divide entre todos los que llegan tarde."],
      {
        intent: "transfer",
        errors: [
          { value: 0.1, feedback: "Esa es P(tarde | bus); se pide P(bus | tarde)." },
          { value: 0.6, feedback: "Esa es la proporción de todos los que van en bus; entre los que llegan tarde es otra." },
        ],
      },
    ),
    outcome: "Puedes calcular probabilidades dentro de un grupo y evitar confundir P(A | B) con P(B | A).",
    commonErrors: [
      "Dividir entre el total de la encuesta en vez del total del grupo conocido.",
      "Confundir P(A | B) con P(B | A).",
      "Interpretar una relación en los datos como prueba de que una cosa causa la otra.",
    ],
  }),
];
