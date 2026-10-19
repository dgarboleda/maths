import { defineLesson } from "./defineLesson";
import { choice as c, example as ex, numeric as n } from "./questions";
import type { Lesson } from "./types";

const sg = (x: number) => (x < 0 ? `−${-x}` : `${x}`);
const p = (x: number) => (x < 0 ? `(−${-x})` : `${x}`);
/** « + 5» o « − 5» para continuar una expresión. */
const t = (x: number) => (x < 0 ? ` − ${-x}` : ` + ${x}`);
/** Coeficiente delante de x: 1 → «x», −1 → «−x». */
const cx = (k: number) => (k === 1 ? "x" : k === -1 ? "−x" : `${sg(k)}x`);
const fmt = (x: number) => x.toLocaleString("es", { maximumFractionDigits: 3 });

export const EXPRESSION_LESSONS: Lesson[] = [
  defineLesson({
    id: "expresiones-algebraicas",
    unitId: "expresiones",
    title: "Expresiones algebraicas",
    objective:
      "Evaluar expresiones algebraicas, reconocer términos semejantes y reducirlos.",
    purpose:
      "Las tarifas de la ciudad se escriben como expresiones. Para compararlas hay que saber evaluarlas y simplificarlas sin cambiar su valor.",
    prerequisites: ["ecuaciones-dos-pasos", "enteros-suma-resta"],
    legacyModuleIds: ["algebra-d6", "algebra-d1"],
    visual: "linear",
    vocabulary: [
      { term: "Expresión algebraica", meaning: "Combinación de números, letras y operaciones, sin signo igual: 3x + 5." },
      { term: "Términos semejantes", meaning: "Términos con la misma parte literal: 3x y −5x; se pueden sumar." },
      { term: "Coeficiente", meaning: "El número que multiplica a la letra: en −5x, el coeficiente es −5." },
    ],
    sections: [
      {
        title: "Una expresión no es una ecuación",
        paragraphs: [
          "3x + 5 describe un cálculo que depende de x: si x = 2, vale 11; si x = 10, vale 35. No afirma nada, por eso no se «resuelve».",
          "Una ecuación compara dos expresiones con un signo igual, como 3x + 5 = 20, y sí se resuelve.",
        ],
        formula: "3x + 5 con x = 2 → 3 × 2 + 5 = 11",
      },
      {
        title: "Evaluar es sustituir con cuidado",
        paragraphs: [
          "Para evaluar, reemplaza la letra por su valor entre paréntesis y respeta el orden de las operaciones: si x = −4, 2x − 3 = 2 × (−4) − 3 = −11.",
          "3x significa 3 × x; x² significa x × x.",
        ],
        formula: "x = −4: 2x − 3 = 2 × (−4) − 3 = −11",
      },
      {
        title: "Solo se reúnen términos semejantes",
        paragraphs: [
          "3x + 5x = 8x porque son 3 y 5 veces la misma cantidad. En cambio, 3x + 5 no se puede reducir: son cosas distintas.",
          "Para reducir, agrupa los términos con x y los números por separado: 4x + 7 − x + 2 = 3x + 9.",
        ],
        formula: "4x + 7 − x + 2 = 3x + 9",
      },
    ],
    examples: [
      ex("Evalúa 5x − 2 para x = −3.", [
        ["5 × (−3) − 2", "Sustituimos usando paréntesis para el negativo."],
        ["−15 − 2", "Multiplicamos antes de restar."],
        ["−17", "Restar 2 desplaza dos unidades a la izquierda."],
      ], "La expresión vale −17 cuando x = −3."),
      ex("Reduce 6x + 4 − 2x − 9.", [
        ["(6x − 2x) + (4 − 9)", "Agrupamos términos semejantes."],
        ["4x + (−5)", "Operamos cada grupo por separado."],
        ["4x − 5", "Comprobación con x = 1: 6 + 4 − 2 − 9 = −1 y 4 − 5 = −1."],
      ], "La expresión reducida tiene el mismo valor para cualquier x."),
    ],
    diagnostic: [
      n("d-1", "¿Cuánto vale 3 × 4 + 2?", 14, ["3 × 4 = 12; 12 + 2 = 14."], ["Multiplica primero.", "12 + 2.", "14."]),
      n("d-2", "¿Cuánto es −6 + 2?", -4, ["Signos distintos: 6 − 2 = 4, gana el signo de −6."], ["Empieza en −6.", "Avanza 2.", "−4."]),
      c("d-3", "En 2x + 7 = 15, ¿qué valor tiene x?", ["4", "11", "8"], 0, "2x = 8, así que x = 4."),
    ],
    questions(v) {
      const [a, b, x] = [[3, 5, 2], [4, -7, 3], [2, 9, -4], [5, -3, -2], [6, 1, -3], [3, -8, 5]][v],
        [c1, c2, c3] = [[5, 2, 3], [7, 3, 1], [4, 6, 2], [8, 5, 3], [6, 2, 5], [9, 4, 2]][v],
        [fixed, rate, km] = [[4, 3, 12], [5, 2, 15], [3, 4, 9], [6, 3, 14], [8, 2, 25], [2, 5, 11]][v],
        [m, q, r, val] = [[2, 3, 5, 10], [3, 4, 2, 6], [2, 5, 1, 8], [4, 1, 3, 7], [3, 6, 4, 9], [2, 7, 6, 12]][v];
      return [
        v % 2 === 0
          ? c(
              "q0",
              `¿Por qué ${c1}x + ${c2} no se puede escribir como ${c1 + c2}x?`,
              [
                [`Sí se puede: se suman los números`, `Prueba con x = 10: ${c1}x + ${c2} = ${c1 * 10 + c2}, pero ${c1 + c2}x = ${(c1 + c2) * 10}.`],
                `Porque ${c1}x y ${c2} no son términos semejantes`,
                ["Porque está prohibido sumar con letras", "Sí se suman términos con la misma letra: 3x + 2x = 5x."],
              ],
              1,
              "Solo se reúnen términos con la misma parte literal.",
            )
          : c(
              "q0",
              "¿Cuáles son términos semejantes?",
              [
                [`${c1}x y ${c1}`, "Uno tiene x y el otro no."],
                [`${c1}x y ${c2}x²`, "x y x² son partes literales distintas."],
                `${c1}x y −${c2}x`,
              ],
              2,
              "Son semejantes los términos con la misma letra y el mismo exponente.",
            ),
        n(
          "q1",
          `Evalúa ${a}x${t(b)} para x = ${sg(x)}.`,
          a * x + b,
          [`${a} × ${p(x)}${t(b)} = ${sg(a * x)}${t(b)} = ${sg(a * x + b)}.`],
          ["Sustituye x por su valor entre paréntesis.", "Multiplica antes de sumar.", `${a} × ${p(x)} = ${sg(a * x)}.`],
          {
            errors: [
              { value: a + x + b, feedback: `${a}x significa ${a} × x, no ${a} + x.` },
              ...(x < 0 ? [{ value: -a * x + b, feedback: "Revisa el signo: un positivo por un negativo da negativo." }] : []),
            ].filter((e) => e.value !== a * x + b),
          },
        ),
        n(
          "q2",
          `Completa: ${c1}x + ${c2}x = __x.`,
          c1 + c2,
          [`${c1} veces x más ${c2} veces x son ${c1 + c2} veces x.`],
          ["Son términos semejantes.", "Suma los coeficientes.", `${c1} + ${c2}.`],
          { step: true, errors: [{ value: c1 * c2, feedback: "Al sumar términos semejantes se suman los coeficientes, no se multiplican." }] },
        ),
        n(
          "q3",
          `Reduce ${c1}x + ${c3} − ${c2}x + ${c2} y escribe el coeficiente de x.`,
          c1 - c2,
          [`Términos con x: ${c1}x − ${c2}x = ${cx(c1 - c2)}.`, `Números: ${c3} + ${c2} = ${c3 + c2}. Resultado: ${cx(c1 - c2)} + ${c3 + c2}.`],
          ["Agrupa los términos con x.", `${c1}x − ${c2}x.`, `Resta los coeficientes ${c1} − ${c2}.`],
          { errors: [{ value: c1 + c2, feedback: `El término ${c2}x se resta: su coeficiente es −${c2}.` }] },
        ),
        c(
          "q4",
          `Un compañero reduce ${c1}x + ${c3} + ${c2}x como ${c1 + c2 + c3}x. ¿Qué falla?`,
          [
            ["Nada: se suman todos los números", `${c3} no tiene x; no es semejante a los otros términos.`],
            [`Debía escribir ${c1 * c2 * c3}x`, "Multiplicar tampoco es correcto: solo se reúnen términos semejantes."],
            `Sumó ${c3} con los términos en x; lo correcto es ${c1 + c2}x + ${c3}`,
          ],
          2,
          "Los números sin letra forman otro grupo de términos semejantes.",
        ),
        n(
          "q5",
          `Un taxi eléctrico cobra ${fixed} créditos fijos más ${rate} por kilómetro: ${rate}x + ${fixed}. ¿Cuánto cuesta un viaje de ${km} km?`,
          rate * km + fixed,
          [`${rate} × ${km} + ${fixed} = ${rate * km} + ${fixed} = ${rate * km + fixed}.`],
          ["x representa los kilómetros.", `Sustituye x = ${km}.`, "Multiplica y suma la tarifa fija."],
          {
            intent: "transfer",
            unit: "créditos",
            errors: [{ value: (rate + fixed) * km, feedback: "La tarifa fija se paga una vez, no por kilómetro." }],
          },
        ),
        n(
          "q6",
          `Ana tiene x cromos. Ben tiene ${q} más que ${m === 2 ? "el doble" : m === 3 ? "el triple" : "el cuádruple"} de Ana (${m}x + ${q}) y Cata tiene ${r} menos que Ana (x − ${r}). Si x = ${val}, ¿cuántos cromos tienen entre los tres?`,
          val + (m * val + q) + (val - r),
          [`Total: x + (${m}x + ${q}) + (x − ${r}) = ${m + 2}x${t(q - r)}.`, `Con x = ${val}: ${m + 2} × ${val}${t(q - r)} = ${val + (m * val + q) + (val - r)}.`],
          ["Escribe la expresión del total.", "Reduce los términos semejantes.", `Evalúa en x = ${val}.`],
          {
            intent: "transfer",
            unit: "cromos",
            errors: [{ value: val + (m * val + q) + (val + r), feedback: `Cata tiene ${r} menos que Ana: ese término se resta.` }],
          },
        ),
      ];
    },
    application: n(
      "app",
      "Tarifa A: 3x + 20 créditos; tarifa B: 5x + 4 créditos, donde x son las horas de uso. Para x = 7, ¿cuántos créditos ahorra quien elige la más barata?",
      2,
      ["A: 3 × 7 + 20 = 41.", "B: 5 × 7 + 4 = 39.", "Ahorro: 41 − 39 = 2 créditos con la tarifa B."],
      ["Evalúa ambas expresiones con x = 7.", "Compara los resultados.", "Resta el menor al mayor."],
      {
        intent: "transfer",
        unit: "créditos",
        errors: [
          { value: 39, feedback: "Ese es el costo de la tarifa más barata. Se pregunta cuánto se ahorra." },
          { value: 16, feedback: "Restaste las tarifas fijas sin considerar las horas." },
        ],
      },
    ),
    outcome: "Puedes evaluar y simplificar las tarifas de la ciudad sin cambiar su valor.",
    commonErrors: [
      "Sumar términos que no son semejantes.",
      "Interpretar 3x como 3 + x.",
      "Olvidar el paréntesis al sustituir un negativo.",
    ],
  }),
  defineLesson({
    id: "propiedad-distributiva",
    unitId: "expresiones",
    title: "La propiedad distributiva",
    objective:
      "Desarrollar productos de la forma a(x + b), sacar factor común y usar ambas transformaciones para resolver ecuaciones.",
    purpose:
      "Los pedidos de la ciudad se hacen por paquetes que combinan varios artículos. La distributiva permite contar el total de dos maneras equivalentes.",
    prerequisites: ["expresiones-algebraicas"],
    legacyModuleIds: ["algebra-d6", "algebra-d7"],
    visual: "area",
    vocabulary: [
      { term: "Desarrollar", meaning: "Escribir a(x + b) como ax + ab." },
      { term: "Factor común", meaning: "Un factor que divide a todos los términos: 6x + 9 = 3(2x + 3)." },
    ],
    sections: [
      {
        title: "Multiplicar una suma",
        paragraphs: [
          "3(x + 4) son tres grupos de (x + 4): x + 4 + x + 4 + x + 4 = 3x + 12. El 3 multiplica a cada término del paréntesis.",
          "Piensa en un rectángulo de altura 3 y base x + 4: su área es 3 × x más 3 × 4.",
        ],
        formula: "a(x + b) = ax + ab",
      },
      {
        title: "Cuidado con los signos",
        paragraphs: [
          "−2(x − 5) = −2x + 10: el −2 multiplica también al −5, y negativo por negativo da positivo.",
          "Un signo menos delante de un paréntesis cambia el signo de todos sus términos: −(x − 3) = −x + 3.",
        ],
        formula: "−2(x − 5) = −2x + 10",
      },
      {
        title: "Sacar factor común",
        paragraphs: [
          "El camino inverso agrupa: 6x + 9 = 3 × 2x + 3 × 3 = 3(2x + 3).",
          "En una ecuación como 4(x − 2) = 20 puedes desarrollar (4x − 8 = 20) o dividir ambos lados entre 4 (x − 2 = 5). Ambos caminos dan x = 7.",
        ],
        formula: "6x + 9 = 3(2x + 3)",
      },
    ],
    examples: [
      ex("Desarrolla 5(2x − 3).", [
        ["5 × 2x = 10x", "El 5 multiplica al primer término."],
        ["5 × (−3) = −15", "Y también al segundo, con su signo."],
        ["10x − 15", "Comprobación con x = 1: 5(2 − 3) = −5 y 10 − 15 = −5."],
      ], "5(2x − 3) = 10x − 15."),
      ex("Resuelve 3(x + 4) = 27.", [
        ["3x + 12 = 27", "Desarrollamos el paréntesis."],
        ["3x = 15", "Restamos 12 a ambos lados."],
        ["x = 5", "Comprobación: 3(5 + 4) = 27."],
      ], "También podía dividirse primero entre 3: x + 4 = 9."),
    ],
    diagnostic: [
      n("d-1", "¿Cuánto es 4 × (2 + 5)?", 28, ["2 + 5 = 7; 4 × 7 = 28."], ["Paréntesis primero.", "4 × 7.", "28."]),
      n("d-2", "¿Cuánto es (−3) × (−4)?", 12, ["Signos iguales: positivo."], ["Multiplica 3 × 4.", "Dos negativos dan positivo.", "12."]),
      c("d-3", "¿Cuánto es 2x + 5x?", ["7x", "10x", "7x²"], 0, "Son términos semejantes: 2 + 5 = 7."),
    ],
    questions(v) {
      const [a, b] = [[3, 4], [5, 2], [4, 6], [6, 3], [2, 7], [7, 5]][v],
        [na, nb] = [[2, 5], [3, 4], [4, 7], [5, 2], [6, 3], [3, 8]][v],
        [g, h, k] = [[3, 2, 4], [4, 3, 5], [5, 2, 3], [6, 5, 2], [2, 7, 3], [3, 4, 7]][v],
        [qa, qb, qt] = [[4, 3, 20], [3, 5, 12], [5, 2, 35], [6, 1, 18], [2, 9, 4], [7, 2, 21]][v],
        [packs, cab, xval] = [[4, 2, 6], [5, 3, 8], [3, 4, 10], [6, 5, 4], [7, 2, 3], [8, 1, 5]][v];
      return [
        v % 2 === 0
          ? c(
              "q0",
              `¿Qué significa ${a}(x + ${b})?`,
              [
                [`${a}x + ${b}`, `El ${a} multiplica a todo el paréntesis, también al ${b}.`],
                `${a} grupos de (x + ${b}), es decir ${a}x + ${a * b}`,
                [`${a} + x + ${b}`, "El número delante del paréntesis multiplica, no suma."],
              ],
              1,
              "El factor multiplica a cada término del paréntesis.",
            )
          : c(
              "q0",
              `¿Por qué −(x − ${b}) = −x + ${b}?`,
              [
                "Porque el signo menos multiplica por −1 a cada término",
                ["Porque se puede quitar el paréntesis sin cambiar nada", `Sin cambiar signos se obtendría −x − ${b}, un valor distinto.`],
                ["Porque los dos signos menos se anulan siempre", "Solo cambia el signo de cada término del paréntesis."],
              ],
              0,
              `−(x − ${b}) = (−1)(x) + (−1)(−${b}) = −x + ${b}.`,
            ),
        n(
          "q1",
          `Desarrolla −${na}(x − ${nb}). ¿Cuál es el término sin x?`,
          na * nb,
          [`−${na} × x = −${na}x.`, `−${na} × (−${nb}) = ${na * nb}.`, `Resultado: −${na}x + ${na * nb}.`],
          ["El −" + na + " multiplica a ambos términos.", "Negativo por negativo da positivo.", `−${na} × (−${nb}).`],
          { errors: [{ value: -na * nb, feedback: "Revisa el signo: (−) × (−) da positivo." }, { value: -nb, feedback: `Falta multiplicar el ${nb} por −${na}.` }] },
        ),
        n(
          "q2",
          `Completa: ${a}(x + ${b}) = ${a}x + __.`,
          a * b,
          [`${a} × ${b} = ${a * b}.`],
          ["El factor multiplica a cada término.", `Multiplica ${a} por ${b}.`, `${a * b}.`],
          { step: true, errors: [{ value: b, feedback: `El ${a} también multiplica al ${b}.` }] },
        ),
        n(
          "q3",
          `Saca factor común: ${g * h}x + ${g * k} = ${g}(${h}x + __).`,
          k,
          [`${g * k} ÷ ${g} = ${k}.`, `Comprobación: ${g}(${h}x + ${k}) = ${g * h}x + ${g * k}.`],
          ["Divide cada término entre el factor común.", `${g * k} ÷ ${g}.`, `${k}.`],
          { step: true, errors: [{ value: g * k, feedback: `Hay que dividir ${g * k} entre ${g}.` }] },
        ),
        c(
          "q4",
          `Un compañero escribe ${a}(x + ${b}) = ${a}x + ${b}. ¿Qué falla?`,
          [
            ["Nada, está bien", `Con x = 1: ${a}(1 + ${b}) = ${a * (1 + b)}, pero ${a} + ${b} = ${a + b}.`],
            ["Debía sumar los números: " + (a + b) + "x", "Tampoco: no son términos semejantes."],
            `El ${a} multiplica también al ${b}: ${a}x + ${a * b}`,
          ],
          2,
          "La distributiva aplica el factor a cada término del paréntesis.",
        ),
        n(
          "q5",
          `Se piden ${packs} paquetes, cada uno con x baterías y ${cab} cables: ${packs}(x + ${cab}) objetos. Si x = ${xval}, ¿cuántos objetos llegan?`,
          packs * (xval + cab),
          [`${packs}(${xval} + ${cab}) = ${packs} × ${xval + cab} = ${packs * (xval + cab)}.`, `También: ${packs * xval} + ${packs * cab}.`],
          ["Sustituye x.", "Calcula el paréntesis o desarrolla.", `${packs} × ${xval + cab}.`],
          {
            intent: "transfer",
            unit: "objetos",
            errors: [{ value: packs * xval + cab, feedback: `Los ${cab} cables vienen en cada paquete: también se multiplican por ${packs}.` }],
          },
        ),
        n(
          "q6",
          `Resuelve ${qa}(x − ${qb}) = ${qt}.`,
          qt / qa + qb,
          [`Divide entre ${qa}: x − ${qb} = ${fmt(qt / qa)}.`, `Suma ${qb}: x = ${fmt(qt / qa + qb)}.`, `Comprobación: ${qa}(${fmt(qt / qa + qb)} − ${qb}) = ${qt}.`],
          ["Puedes desarrollar o dividir ambos lados entre el factor.", `Divide ${qt} entre ${qa}.`, `Después suma ${qb}.`],
          {
            intent: "transfer",
            errors: [
              { value: (qt + qb) / qa, feedback: `Desarrollaste mal: ${qa}(x − ${qb}) = ${qa}x − ${qa * qb}.` },
              { value: qt / qa - qb, feedback: `Para deshacer la resta de ${qb}, suma ${qb}.` },
            ].filter((e) => e.value !== qt / qa + qb),
          },
        ),
      ];
    },
    application: n(
      "app",
      "Un jardín rectangular mide 6 m de ancho y (x + 4) m de largo. Se amplía para que su área sea 66 m². ¿Cuánto vale x?",
      7,
      ["Área: 6(x + 4) = 66.", "x + 4 = 11 (dividiendo entre 6) o 6x + 24 = 66.", "x = 7. Comprobación: 6 × 11 = 66."],
      ["El área del rectángulo es ancho × largo.", "Plantea 6(x + 4) = 66.", "Divide entre 6 y resta 4."],
      {
        intent: "transfer",
        unit: "m",
        errors: [
          { value: 11, feedback: "Ese es el largo total, x + 4. Falta restar 4." },
          { value: 62 / 6, feedback: "Desarrollaste 6(x + 4) como 6x + 4: el 6 también multiplica al 4." },
        ],
      },
    ),
    outcome: "Puedes contar pedidos por paquetes de dos maneras y resolver ecuaciones con paréntesis.",
    commonErrors: [
      "Multiplicar solo el primer término del paréntesis.",
      "No cambiar los signos al quitar un paréntesis precedido de −.",
      "Dividir solo un término al sacar factor común.",
    ],
  }),
  defineLesson({
    id: "ecuaciones-ambos-lados",
    unitId: "expresiones",
    title: "Ecuaciones con la incógnita en ambos lados",
    objective:
      "Resolver ecuaciones con la incógnita en ambos lados, incluidas las que tienen paréntesis, y reconocer ecuaciones sin solución.",
    purpose:
      "Para elegir entre dos planes de suministro hay que saber cuándo cuestan lo mismo. Eso exige igualar dos expresiones con la misma incógnita.",
    prerequisites: ["propiedad-distributiva"],
    legacyModuleIds: ["algebra-d7"],
    visual: "balance",
    vocabulary: [
      { term: "Reunir la incógnita", meaning: "Restar el mismo término con x a ambos lados para que x quede en un solo lado." },
      { term: "Ecuación sin solución", meaning: "Ecuación que ningún valor hace verdadera, como x + 2 = x + 5." },
    ],
    sections: [
      {
        title: "Lleva la x a un solo lado",
        paragraphs: [
          "En 5x + 3 = 2x + 15 hay x en ambos lados. Restar 2x a ambos lados conserva la igualdad y deja 3x + 3 = 15.",
          "Ahora es una ecuación de dos pasos: 3x = 12 y x = 4. Comprobación: 5 × 4 + 3 = 23 = 2 × 4 + 15.",
        ],
        formula: "5x + 3 = 2x + 15 → 3x + 3 = 15 → x = 4",
      },
      {
        title: "Primero, quita los paréntesis",
        paragraphs: [
          "En 3(x − 2) = x + 8, desarrolla: 3x − 6 = x + 8. Después reúne x: 2x − 6 = 8, 2x = 14, x = 7.",
          "Conviene restar el término con menor coeficiente para trabajar con un coeficiente positivo, aunque cualquier elección correcta da la misma solución.",
        ],
        formula: "3(x − 2) = x + 8 → x = 7",
      },
      {
        title: "Ninguna o infinitas soluciones",
        paragraphs: [
          "En 2x + 3 = 2x + 5, restar 2x deja 3 = 5, que es falso para cualquier x: no hay solución.",
          "En 2(x + 1) = 2x + 2, se obtiene 2 = 2, verdadero siempre: cualquier x es solución.",
        ],
        formula: "2x + 3 = 2x + 5 → 3 = 5 (sin solución)",
      },
    ],
    examples: [
      ex("Resuelve 7x − 4 = 3x + 12.", [
        ["7x − 3x − 4 = 12", "Restamos 3x a ambos lados."],
        ["4x = 16", "Sumamos 4 a ambos lados."],
        ["x = 4", "Comprobación: 24 = 24."],
      ], "x = 4."),
      ex("El plan A cuesta 20 + 3h y el plan B, 8 + 5h. ¿Con cuántas horas cuestan lo mismo?", [
        ["20 + 3h = 8 + 5h", "Igualamos los costos."],
        ["12 = 2h", "Restamos 3h y 8 a ambos lados."],
        ["h = 6", "Comprobación: 20 + 18 = 38 = 8 + 30."],
      ], "Con 6 horas cuestan lo mismo; con más horas conviene A."),
    ],
    diagnostic: [
      n("d-1", "Resuelve 3x + 4 = 19.", 5, ["3x = 15; x = 5."], ["Resta 4.", "Divide entre 3.", "5."]),
      n("d-2", "Desarrolla 2(x + 6): ¿cuál es el término sin x?", 12, ["2 × 6 = 12."], ["El 2 multiplica a ambos términos.", "2 × 6.", "12."]),
      c("d-3", "¿Qué conserva una igualdad?", ["Restar 2x solo a un lado", "Restar 2x a ambos lados", "Cambiar x por 2"], 1, "La misma operación en ambos lados."),
    ],
    questions(v) {
      const [a, b, cc, x] = [[5, 3, 2, 4], [7, 2, 3, 5], [6, 5, 4, 3], [9, 1, 5, 6], [4, 7, 1, 2], [8, 4, 3, 7]][v],
        d = a * x + b - cc * x,
        [pa, pb, pc, px] = [[3, 2, 1, 7], [4, 1, 2, 5], [2, 5, 1, 9], [5, 3, 2, 6], [3, 4, 2, 8], [6, 1, 4, 4]][v],
        pd = pa * (px - pb) - pc * px,
        [f1, r1, f2, r2] = [[20, 3, 8, 5], [30, 4, 6, 7], [18, 2, 3, 5], [40, 6, 10, 8], [25, 5, 5, 9], [36, 3, 12, 7]][v],
        [va, vp, vb, vq] = [[200, 6, 80, 4], [150, 5, 30, 3], [300, 8, 60, 4], [250, 7, 40, 3], [180, 4, 30, 2], [260, 9, 50, 5]][v];
      return [
        v % 2 === 0
          ? c(
              "q0",
              `Para resolver ${a}x + ${b} = ${cc}x + ${d}, ¿qué paso reúne la incógnita en un lado?`,
              [
                [`Restar ${cc}x solo a la derecha`, "Cambiar un solo lado rompe la igualdad."],
                `Restar ${cc}x a ambos lados`,
                [`Dividir entre x`, "Dividir entre la incógnita no la aísla y puede perder soluciones."],
              ],
              1,
              "La misma resta en ambos lados conserva la igualdad y deja x en un solo lado.",
            )
          : c(
              "q0",
              `¿Qué significa que x = ${x} sea solución de ${a}x + ${b} = ${cc}x + ${d}?`,
              [
                ["Que x vale lo mismo en ambos lados", "x vale siempre lo mismo; lo que coincide son los valores de las dos expresiones."],
                ["Que el lado izquierdo es mayor", "Una solución hace que los dos lados sean iguales."],
                `Que con x = ${x} ambos lados valen ${a * x + b}`,
              ],
              2,
              "Una solución hace verdadera la igualdad entre las dos expresiones.",
            ),
        n(
          "q1",
          `Resuelve ${a}x + ${b} = ${cc}x + ${d}.`,
          x,
          [`Resta ${cc}x: ${a - cc}x + ${b} = ${d}.`, `Resta ${b}: ${a - cc}x = ${d - b}.`, `x = ${x}. Comprobación: ${a * x + b} = ${cc * x + d}.`],
          [`Reúne la x restando ${cc}x a ambos lados.`, `Queda ${a - cc}x + ${b} = ${d}.`, `Resuelve la ecuación de dos pasos.`],
          { errors: [{ value: (d - b) / (a + cc), feedback: `Sumaste los coeficientes. Al restar ${cc}x a ambos lados queda ${a - cc}x.` }] },
        ),
        n(
          "q2",
          `Completa: ${a}x + ${b} = ${cc}x + ${d} → ${a - cc}x = __.`,
          d - b,
          [`Restando ${cc}x y ${b} a ambos lados: ${a - cc}x = ${d} − ${b} = ${d - b}.`],
          ["Reúne x a la izquierda y los números a la derecha.", `Resta ${b} a ${d}.`, `${d - b}.`],
          { step: true, errors: [{ value: d + b, feedback: `El ${b} se resta a ambos lados.` }] },
        ),
        n(
          "q3",
          `Resuelve ${pa}(x − ${pb}) = ${pc === 1 ? "" : pc}x${t(pd)}.`,
          px,
          [`Desarrolla: ${pa}x − ${pa * pb} = ${cx(pc)}${t(pd)}.`, `Reúne x: ${pa - pc}x = ${pd + pa * pb}.`, `x = ${px}.`],
          ["Quita primero el paréntesis.", `Resta ${cx(pc)} a ambos lados.`, `Divide entre ${pa - pc}.`],
          { errors: [{ value: (pd + pb) / (pa - pc), feedback: `Al desarrollar, el ${pa} multiplica también al ${pb}.` }].filter((e) => e.value !== px) },
        ),
        c(
          "q4",
          `Al resolver ${cc}x + ${b} = ${cc}x + ${b + 4} se obtiene ${b} = ${b + 4}. ¿Qué significa?`,
          [
            [`Que x = ${b + 4}`, "La x desapareció: el resultado no da un valor para x."],
            "Que la ecuación no tiene solución",
            ["Que cualquier número es solución", `${b} = ${b + 4} es falso, no verdadero.`],
          ],
          1,
          "Si al reunir x se llega a una igualdad falsa, ningún valor la cumple.",
        ),
        n(
          "q5",
          `El plan A cuesta ${f1} + ${r1}h créditos y el plan B, ${f2} + ${r2}h, donde h son horas. ¿Con cuántas horas cuestan lo mismo?`,
          (f1 - f2) / (r2 - r1),
          [`${f1} + ${r1}h = ${f2} + ${r2}h.`, `${f1 - f2} = ${r2 - r1}h.`, `h = ${fmt((f1 - f2) / (r2 - r1))}.`],
          ["Iguala ambas expresiones.", `Resta ${r1}h y ${f2} a ambos lados.`, `Divide ${f1 - f2} entre ${r2 - r1}.`],
          {
            intent: "transfer",
            unit: "horas",
            errors: [{ value: (f1 + f2) / (r1 + r2), feedback: "Sumaste en lugar de reunir: resta el mismo término a ambos lados." }],
          },
        ),
        n(
          "q6",
          `El depósito A tiene ${va} L y pierde ${vp} L por minuto; el B tiene ${vb} L y gana ${vq} L por minuto. ¿En cuántos minutos tendrán la misma cantidad?`,
          (va - vb) / (vp + vq),
          [`A: ${va} − ${vp}m; B: ${vb} + ${vq}m.`, `${va} − ${vp}m = ${vb} + ${vq}m → ${va - vb} = ${vp + vq}m.`, `m = ${fmt((va - vb) / (vp + vq))}.`],
          ["Escribe una expresión para cada depósito.", "Iguálalas y reúne m en un lado.", `Divide ${va - vb} entre ${vp + vq}.`],
          {
            intent: "transfer",
            unit: "minutos",
            errors: [{ value: (va - vb) / (vp - vq), feedback: "Uno pierde y el otro gana: al reunir m, los ritmos se suman." }],
          },
        ),
      ];
    },
    application: n(
      "app",
      "Mara tiene 34 años y su sobrino, 10. ¿Dentro de cuántos años la edad de Mara será el doble que la de su sobrino?",
      14,
      ["Dentro de t años: 34 + t = 2(10 + t).", "34 + t = 20 + 2t → 14 = t.", "Comprobación: 48 = 2 × 24."],
      ["Ambas edades aumentan t años.", "Plantea 34 + t = 2(10 + t).", "Desarrolla y reúne t."],
      {
        intent: "transfer",
        unit: "años",
        errors: [
          { value: 24, feedback: "24 es la diferencia de edades. Plantea la ecuación con la edad futura de ambos." },
          { value: 7, feedback: "Ese valor no cumple 34 + t = 2(10 + t). Desarrolla el paréntesis." },
        ],
      },
    ),
    outcome: "Puedes comparar planes y procesos que cambian en el tiempo igualando expresiones.",
    commonErrors: [
      "Cambiar de lado un término sin aplicar la operación a ambos lados.",
      "Sumar coeficientes de lados distintos.",
      "Interpretar una igualdad falsa como una solución.",
    ],
  }),
  defineLesson({
    id: "inecuaciones",
    unitId: "expresiones",
    title: "Inecuaciones lineales",
    objective:
      "Resolver inecuaciones lineales, interpretar su conjunto de soluciones y usar el cambio de sentido al multiplicar o dividir por un negativo.",
    purpose:
      "Muchas decisiones de la ciudad no exigen un valor exacto sino un límite: como máximo, al menos. Las inecuaciones describen esos rangos.",
    prerequisites: ["ecuaciones-ambos-lados"],
    legacyModuleIds: ["algebra-d8"],
    visual: "integers",
    vocabulary: [
      { term: "Inecuación", meaning: "Desigualdad con una incógnita, como 3x + 2 < 14." },
      { term: "Conjunto solución", meaning: "Todos los valores que hacen verdadera la desigualdad." },
    ],
    sections: [
      {
        title: "Muchas soluciones",
        paragraphs: [
          "x < 4 no tiene una única solución: la cumplen 3, 0, −2 o 3,9. En la recta, es todo lo que está a la izquierda del 4, sin incluirlo.",
          "≤ incluye el límite: x ≤ 4 también se cumple con x = 4.",
        ],
        formula: "x < 4;  x ≤ 4 incluye 4",
      },
      {
        title: "Se resuelven casi como ecuaciones",
        paragraphs: [
          "Sumar o restar el mismo número a ambos lados conserva la desigualdad. Multiplicar o dividir por un número positivo, también: 3x + 2 < 14 → 3x < 12 → x < 4.",
          "Comprueba con un valor: x = 0 cumple 2 < 14; x = 5 no, porque 17 < 14 es falso.",
        ],
        formula: "3x + 2 < 14 → x < 4",
      },
      {
        title: "El negativo invierte el sentido",
        paragraphs: [
          "Si −2x > 6, dividir entre −2 invierte la desigualdad: x < −3. Comprueba: x = −4 da 8 > 6, verdadero; x = 0 da 0 > 6, falso.",
          "Multiplicar por un negativo invierte el orden de la recta: 2 < 5, pero −2 > −5.",
        ],
        formula: "−2x > 6 → x < −3",
      },
    ],
    examples: [
      ex("Resuelve 5x − 3 ≤ 22.", [
        ["5x ≤ 25", "Sumamos 3 a ambos lados."],
        ["x ≤ 5", "Dividimos entre 5, que es positivo."],
        ["x = 5: 22 ≤ 22 ✓", "El límite se incluye porque la desigualdad es ≤."],
      ], "Todos los números menores o iguales que 5."),
      ex("Resuelve 10 − 3x > 1.", [
        ["−3x > −9", "Restamos 10 a ambos lados."],
        ["x < 3", "Dividimos entre −3 e invertimos el sentido."],
        ["x = 0: 10 > 1 ✓; x = 4: −2 > 1 ✗", "Comprobamos un valor de cada lado."],
      ], "Todos los números menores que 3."),
    ],
    diagnostic: [
      c("d-1", "¿Qué número cumple x > 7?", ["7", "8", "6"], 1, "8 es mayor que 7; 7 no es mayor que sí mismo."),
      n("d-2", "Resuelve 4x + 1 = 21.", 5, ["4x = 20; x = 5."], ["Resta 1.", "Divide entre 4.", "5."]),
      c("d-3", "¿Cuál es mayor: −3 o −8?", ["−3", "−8", "Son iguales"], 0, "−3 está a la derecha de −8."),
    ],
    questions(v) {
      const [a, b, cc] = [[3, 2, 17], [4, 5, 31], [5, 1, 24], [2, 7, 20], [6, 3, 40], [7, 4, 36]][v],
        bound = (cc - b) / a,
        [na, nc] = [[2, 8], [3, 12], [4, 20], [5, 15], [3, 18], [6, 24]][v],
        [budget, fee, price] = [[50, 8, 6], [70, 10, 7], [100, 12, 9], [60, 5, 8], [90, 15, 11], [80, 6, 10]][v],
        [fa, ra, rb] = [[30, 2, 5], [24, 3, 7], [40, 4, 9], [18, 2, 6], [50, 5, 8], [36, 4, 10]][v];
      const maxInt = Number.isInteger(bound) ? bound - 1 : Math.floor(bound);
      const minHours = Math.floor(fa / (rb - ra)) + 1;
      return [
        v % 2 === 0
          ? c(
              "q0",
              `¿Qué describe la inecuación x ≤ ${cc}?`,
              [
                [`Solo el número ${cc}`, `Muchos números cumplen la desigualdad, no solo ${cc}.`],
                `Todos los números menores o iguales que ${cc}`,
                [`Los números mayores que ${cc}`, "≤ indica menores o iguales."],
              ],
              1,
              "Una inecuación tiene un conjunto de soluciones.",
            )
          : c(
              "q0",
              `¿Por qué al dividir −${na}x > ${nc} entre −${na} el signo cambia a <?`,
              [
                "Porque dividir entre un negativo invierte el orden de los números",
                ["Porque siempre se invierte al dividir", "Con un número positivo el sentido se conserva."],
                ["Porque así lo pide la x", "No depende de la letra, sino del signo del divisor."],
              ],
              0,
              "Por ejemplo 2 < 5, pero −2 > −5: multiplicar o dividir por un negativo invierte el orden.",
            ),
        n(
          "q1",
          `¿Cuál es el mayor número entero que cumple ${a}x + ${b} < ${cc}?`,
          maxInt,
          [`${a}x < ${cc - b}, así que x < ${fmt(bound)}.`, `El mayor entero menor que ${fmt(bound)} es ${maxInt}.`],
          ["Resuelve como una ecuación, conservando el sentido.", `x < ${fmt(bound)}.`, "Busca el mayor entero que no llega a ese límite."],
          {
            errors: [
              ...(Number.isInteger(bound) ? [{ value: bound, feedback: `x < ${bound} no incluye ${bound}: la desigualdad es estricta.` }] : [{ value: Math.ceil(bound), feedback: `${Math.ceil(bound)} supera el límite ${fmt(bound)}.` }]),
            ],
          },
        ),
        n(
          "q2",
          `Completa: ${a}x + ${b} ≤ ${cc} → ${a}x ≤ __.`,
          cc - b,
          [`Restamos ${b} a ambos lados: ${cc} − ${b} = ${cc - b}.`],
          ["Igual que en una ecuación.", `Resta ${b} a ambos lados.`, `${cc - b}.`],
          { step: true, errors: [{ value: cc + b, feedback: `El ${b} se resta a ambos lados.` }] },
        ),
        n(
          "q3",
          `Resuelve −${na}x ≥ ${nc}. ¿Cuál es el mayor valor de x que la cumple?`,
          -nc / na,
          [`Dividimos entre −${na} e invertimos el sentido: x ≤ −${nc / na}.`, `El mayor valor es −${nc / na} (incluido por ≤).`],
          ["Divide entre el coeficiente.", "El coeficiente es negativo: invierte el sentido.", `x ≤ −${nc / na}.`],
          { errors: [{ value: nc / na, feedback: "Al dividir entre un negativo, el resultado también cambia de signo." }] },
        ),
        c(
          "q4",
          `Un compañero resuelve −${na}x > ${nc} y escribe x > −${nc / na}. ¿Qué falla?`,
          [
            ["Nada, está bien", `Prueba x = 0: −${na} × 0 > ${nc} es falso, aunque 0 > −${nc / na}.`],
            `Al dividir entre −${na} debía invertir el sentido: x < −${nc / na}`,
            [`Debía restar ${na}`, `−${na}x es un producto: se deshace dividiendo.`],
          ],
          1,
          "Dividir entre un negativo invierte la desigualdad.",
        ),
        n(
          "q5",
          `Con ${budget} créditos como máximo, un envío de ${fee} y sensores de ${price} cada uno, ¿cuántos sensores enteros se pueden comprar como máximo?`,
          Math.floor((budget - fee) / price),
          [`${price}x + ${fee} ≤ ${budget} → x ≤ ${fmt((budget - fee) / price)}.`, `El mayor entero es ${Math.floor((budget - fee) / price)}.`],
          ["Plantea una inecuación con ≤.", "Resta el envío y divide entre el precio.", "Redondea hacia abajo."],
          {
            intent: "transfer",
            unit: "sensores",
            errors: [{ value: Math.ceil((budget - fee) / price), feedback: "Redondeaste hacia arriba: superarías el presupuesto." }].filter((e) => e.value !== Math.floor((budget - fee) / price)),
          },
        ),
        n(
          "q6",
          `El plan A cuesta ${fa} + ${ra}h créditos y el B, ${rb}h, donde h son horas enteras. ¿A partir de cuántas horas el plan A es más barato?`,
          minHours,
          [`${fa} + ${ra}h < ${rb}h → ${fa} < ${rb - ra}h → h > ${fmt(fa / (rb - ra))}.`, `El menor entero mayor que ${fmt(fa / (rb - ra))} es ${minHours}.`],
          ["Plantea: costo de A < costo de B.", `Reúne h: ${fa} < ${rb - ra}h.`, "Busca el primer entero que cumple."],
          {
            intent: "transfer",
            unit: "horas",
            errors: [{ value: fa / (rb - ra), feedback: "Con ese número de horas ambos planes cuestan lo mismo: A todavía no es más barato." }].filter((e) => e.value !== minHours),
          },
        ),
      ];
    },
    application: n(
      "app",
      "Un generador funciona con 120 L de combustible y gasta 7 L por hora. Debe conservar al menos 15 L de reserva. ¿Cuántas horas enteras puede funcionar como máximo?",
      15,
      ["120 − 7h ≥ 15 → −7h ≥ −105.", "Dividimos entre −7 e invertimos: h ≤ 15.", "Comprobación: 120 − 105 = 15 L de reserva."],
      ["Plantea combustible restante ≥ reserva.", "Resta 120 y divide entre −7.", "Recuerda invertir el sentido."],
      {
        intent: "transfer",
        unit: "horas",
        errors: [
          { value: 17, feedback: "Sin la reserva serían 17 horas; hay que conservar 15 L." },
          { value: 16, feedback: "Con 16 horas quedarían 8 L, menos que la reserva." },
        ],
      },
    ),
    outcome: "Puedes expresar límites («como máximo», «al menos») y encontrar todos los valores que los cumplen.",
    commonErrors: [
      "No invertir el sentido al multiplicar o dividir por un negativo.",
      "Incluir el límite en una desigualdad estricta.",
      "Redondear hacia arriba un máximo.",
    ],
  }),
  defineLesson({
    id: "funciones-lineales",
    unitId: "expresiones",
    title: "Funciones lineales",
    objective:
      "Describir relaciones lineales y = mx + b a partir de tablas, interpretar la pendiente y el valor inicial y usarlos para predecir.",
    purpose:
      "El nivel de los depósitos cambia a ritmo constante. Con una función lineal se puede predecir cuándo se llenarán o vaciarán.",
    prerequisites: ["proporcionalidad", "expresiones-algebraicas"],
    legacyModuleIds: ["algebra-d9", "geometria-d8"],
    visual: "linear",
    vocabulary: [
      { term: "Pendiente (m)", meaning: "Lo que cambia y cuando x aumenta 1." },
      { term: "Valor inicial (b)", meaning: "El valor de y cuando x = 0." },
    ],
    sections: [
      {
        title: "Cambio constante",
        paragraphs: [
          "Un depósito tiene 20 L y recibe 5 L por minuto: 20, 25, 30, 35… Cada minuto, y aumenta 5. Esa es una relación lineal.",
          "Se escribe y = 5x + 20: 5 es la pendiente (cambio por minuto) y 20 el valor inicial (litros a los 0 minutos).",
        ],
        formula: "y = mx + b",
      },
      {
        title: "Leer la pendiente en una tabla",
        paragraphs: [
          "Si x aumenta de 1 en 1, la pendiente es la diferencia constante entre valores de y. Si x aumenta de 2 en 2, divide la diferencia entre 2.",
          "En general, m = (y₂ − y₁)/(x₂ − x₁). Una pendiente negativa indica que y disminuye.",
        ],
        formula: "m = (y₂ − y₁) ÷ (x₂ − x₁)",
      },
      {
        title: "Proporcional como caso particular",
        paragraphs: [
          "Si b = 0, la función es y = mx: una proporcionalidad directa. Con b ≠ 0 hay un valor fijo de partida y y/x no es constante.",
          "Para predecir, sustituye x. Para saber cuándo y alcanza un valor, resuelve la ecuación mx + b = valor.",
        ],
        formula: "y = 5x + 20 = 60 → x = 8",
      },
    ],
    examples: [
      ex("Tabla: x = 0, 1, 2, 3; y = 7, 10, 13, 16. Escribe la función.", [
        ["Diferencias: 3, 3, 3", "El cambio es constante: es lineal."],
        ["m = 3; b = 7", "y aumenta 3 por unidad y vale 7 en x = 0."],
        ["y = 3x + 7", "Comprobación: x = 3 → 16."],
      ], "y = 3x + 7."),
      ex("A los 2 min un depósito tiene 46 L y a los 6 min, 30 L. ¿Cuánto tenía al inicio?", [
        ["m = (30 − 46) ÷ (6 − 2) = −4", "Pierde 4 L por minuto."],
        ["46 = −4 × 2 + b", "Usamos un punto conocido."],
        ["b = 54", "Al inicio tenía 54 L."],
      ], "y = −4x + 54."),
    ],
    diagnostic: [
      n("d-1", "Evalúa 4x + 3 para x = 5.", 23, ["4 × 5 + 3 = 23."], ["Sustituye x.", "Multiplica primero.", "23."]),
      c("d-2", "En la secuencia 5, 8, 11, 14, ¿cuánto aumenta cada vez?", ["3", "5", "14"], 0, "8 − 5 = 3, y así sucesivamente."),
      n("d-3", "¿Cuánto es (20 − 8) ÷ 4?", 3, ["12 ÷ 4 = 3."], ["Paréntesis primero.", "12 ÷ 4.", "3."]),
    ],
    questions(v) {
      const [m, b] = [[3, 4], [5, 2], [4, 9], [-2, 15], [6, 1], [-3, 20]][v],
        xk = [6, 4, 7, 5, 8, 3][v],
        [x1, x2] = [[1, 5], [2, 6], [3, 7], [2, 8], [1, 4], [4, 9]][v],
        [fill, rate, mins] = [[40, 6, 12], [25, 8, 9], [60, 5, 14], [30, 7, 11], [15, 9, 6], [50, 4, 20]][v],
        [t1, y1, t2, y2] = [[2, 46, 6, 30], [3, 62, 8, 42], [2, 70, 6, 50], [4, 52, 10, 34], [2, 90, 7, 60], [5, 70, 9, 58]][v];
      const slope2 = (y2 - y1) / (t2 - t1);
      return [
        v % 2 === 0
          ? c(
              "q0",
              `En y = ${cx(m)}${t(b)}, ¿qué representa el ${sg(m)}?`,
              [
                [`El valor de y cuando x = 0`, `Ese es ${b}, el valor inicial.`],
                `Lo que cambia y cada vez que x aumenta 1`,
                ["El valor de x", "x es la variable; el coeficiente indica su efecto sobre y."],
              ],
              1,
              "La pendiente es el cambio de y por cada unidad de x.",
            )
          : c(
              "q0",
              `En y = ${cx(m)}${t(b)}, ¿qué representa el ${sg(b)}?`,
              [
                `El valor de y cuando x = 0`,
                ["Lo que cambia y por unidad", `Eso es la pendiente, ${sg(m)}.`],
                ["El mayor valor posible de y", "y puede crecer o decrecer sin límite."],
              ],
              0,
              "Con x = 0, el término mx vale 0 y queda y = b.",
            ),
        n(
          "q1",
          `Tabla: x = 0, 1, 2, 3; y = ${b}, ${b + m}, ${b + 2 * m}, ${b + 3 * m}. ¿Cuál es la pendiente?`,
          m,
          [`Diferencias: ${sg(m)} en cada paso.`, `m = ${sg(m)}.`],
          ["Mira cuánto cambia y de una fila a la siguiente.", `${b + m} − ${b}.`, `m = ${sg(m)}.`],
          { errors: [{ value: b, feedback: "Ese es el valor inicial. La pendiente es el cambio entre filas." }, ...(m < 0 ? [{ value: -m, feedback: "y disminuye: la pendiente es negativa." }] : [])] },
        ),
        n(
          "q2",
          `Completa: si y = ${cx(m)}${t(b)}, para x = ${xk}, y = ${sg(m)} × ${xk}${t(b)} = __.`,
          m * xk + b,
          [`${sg(m * xk)}${t(b)} = ${sg(m * xk + b)}.`],
          ["Sustituye x.", "Multiplica antes de sumar.", `${m} × ${xk} = ${sg(m * xk)}.`],
          { step: true, errors: [{ value: m * (xk + b), feedback: "Multiplica primero y suma después el valor inicial." }].filter((e) => e.value !== m * xk + b) },
        ),
        n(
          "q3",
          `Una función lineal pasa por (${x1}, ${sg(m * x1 + b)}) y (${x2}, ${sg(m * x2 + b)}). ¿Cuál es su pendiente?`,
          m,
          [`m = (${sg(m * x2 + b)} − ${p(m * x1 + b)}) ÷ (${x2} − ${x1}) = ${sg(m * (x2 - x1))} ÷ ${x2 - x1} = ${sg(m)}.`],
          ["La pendiente es el cambio de y dividido entre el cambio de x.", `Cambio de y: ${sg(m * x2 + b)} − ${p(m * x1 + b)}.`, `Divide entre ${x2 - x1}.`],
          { errors: [{ value: m * (x2 - x1), feedback: `Falta dividir entre el cambio de x, ${x2 - x1}.` }] },
        ),
        c(
          "q4",
          "¿Cuál de estas tablas corresponde a una función lineal?",
          [
            ["x: 0, 1, 2, 3 → y: 1, 2, 4, 8", "Las diferencias cambian (1, 2, 4): no es lineal."],
            [`x: 0, 1, 2, 3 → y: ${b}, ${b + 1}, ${b + 3}, ${b + 6}`, "Las diferencias crecen (1, 2, 3): no es lineal."],
            `x: 0, 1, 2, 3 → y: ${b}, ${b + m}, ${b + 2 * m}, ${b + 3 * m}`,
          ],
          2,
          "En una función lineal, la diferencia entre valores de y es constante.",
        ),
        n(
          "q5",
          `Un depósito tiene ${fill} L y recibe ${rate} L por minuto. ¿Cuántos litros tendrá a los ${mins} minutos?`,
          fill + rate * mins,
          [`y = ${rate}x + ${fill}.`, `${rate} × ${mins} + ${fill} = ${fill + rate * mins} L.`],
          ["Identifica la pendiente y el valor inicial.", `y = ${rate}x + ${fill}.`, `Sustituye x = ${mins}.`],
          {
            intent: "transfer",
            unit: "L",
            errors: [{ value: rate * mins, feedback: `Faltan los ${fill} L que había al inicio.` }],
          },
        ),
        n(
          "q6",
          `A los ${t1} minutos un depósito tiene ${y1} L y a los ${t2} minutos, ${y2} L, con un ritmo constante. ¿Cuántos litros tenía al inicio?`,
          y1 - slope2 * t1,
          [`m = (${y2} − ${y1}) ÷ (${t2} − ${t1}) = ${sg(slope2)} L/min.`, `${y1} = ${sg(slope2)} × ${t1} + b → b = ${y1 - slope2 * t1}.`],
          ["Calcula primero el ritmo (la pendiente).", "Usa uno de los puntos para despejar el valor inicial.", `b = ${y1} − (${sg(slope2)} × ${t1}).`],
          {
            intent: "transfer",
            unit: "L",
            errors: [
              { value: y1 + slope2 * t1, feedback: "Avanzaste en el tiempo en lugar de retroceder hasta x = 0." },
              { value: slope2, feedback: "Ese es el ritmo por minuto. Se pide el valor inicial." },
            ],
          },
        ),
      ];
    },
    application: n(
      "app",
      "Un depósito tiene 180 L y pierde 12 L por hora; otro, vacío, se llena a 8 L por hora. ¿Cuántas horas pasan hasta que el primero se vacía? Usa la función del primer depósito.",
      15,
      ["y = −12x + 180.", "Vacío: −12x + 180 = 0 → x = 15.", "El segundo depósito no influye en el primero: es un dato que sobra."],
      ["Escribe la función del primer depósito.", "«Vacío» significa y = 0.", "Resuelve −12x + 180 = 0."],
      {
        intent: "transfer",
        unit: "horas",
        errors: [
          { value: 9, feedback: "Combinaste ambos depósitos. Se pregunta solo cuándo se vacía el primero." },
          { value: 22.5, feedback: "Usaste el ritmo del segundo depósito." },
        ],
      },
    ),
    outcome: "Puedes predecir niveles y tiempos a partir de un ritmo constante.",
    commonErrors: [
      "Confundir la pendiente con el valor inicial.",
      "Olvidar dividir entre el cambio de x al calcular la pendiente.",
      "Creer que toda función lineal es proporcional.",
    ],
  }),
];
