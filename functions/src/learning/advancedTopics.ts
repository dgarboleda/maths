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
