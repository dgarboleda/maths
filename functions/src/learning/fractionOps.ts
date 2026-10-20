import { defineLesson } from "./defineLesson";
import { choice as c, example as ex, numeric as n } from "./questions";
import type { Lesson } from "./types";

const gcd = (a: number, b: number): number => (b === 0 ? Math.abs(a) : gcd(b, a % b));
const lcm = (a: number, b: number) => (a * b) / gcd(a, b);
/** Fracción irreducible escrita como texto. */
const fr = (num: number, den: number) => {
  const g = gcd(num, den);
  return den / g === 1 ? `${num / g}` : `${num / g}/${den / g}`;
};

export const FRACTION_OPERATION_LESSONS: Lesson[] = [
  defineLesson({
    id: "fracciones-suma-resta",
    unitId: "fracciones",
    title: "Sumar y restar fracciones",
    objective:
      "Sumar y restar fracciones con distinto denominador usando un denominador común y justificar por qué es necesario.",
    purpose:
      "La reserva se llena desde varias fuentes que informan en fracciones distintas. Para saber cuánto hay en total, las partes deben ser del mismo tamaño.",
    prerequisites: ["fracciones-equivalentes"],
    legacyModuleIds: ["aritmetica-fracciones-2", "aritmetica-mcd-mcm"],
    visual: "equivalence",
    vocabulary: [
      { term: "Denominador común", meaning: "Un múltiplo de ambos denominadores; permite expresar las fracciones con partes del mismo tamaño." },
      { term: "Mínimo común múltiplo", meaning: "El menor múltiplo común; da las fracciones más sencillas." },
    ],
    sections: [
      {
        title: "Solo se suman partes del mismo tamaño",
        paragraphs: [
          "2/7 + 3/7 = 5/7: son séptimos en ambos casos, así que se cuentan juntos. El denominador indica el tamaño de las partes y no cambia.",
          "Sumar los denominadores sería cambiar el tamaño de las partes: 1/2 + 1/2 daría 2/4, que es solo media unidad.",
        ],
        formula: "2/7 + 3/7 = 5/7",
      },
      {
        title: "Busca un denominador común",
        paragraphs: [
          "Para 1/2 + 1/3, los medios y los tercios tienen tamaños distintos. Ambos se pueden dividir en sextos: 1/2 = 3/6 y 1/3 = 2/6.",
          "Ahora se suman los sextos: 3/6 + 2/6 = 5/6. Cualquier múltiplo común sirve; el mínimo común múltiplo da números más pequeños.",
        ],
        formula: "1/2 + 1/3 = 3/6 + 2/6 = 5/6",
      },
      {
        title: "Restar y simplificar",
        paragraphs: [
          "La resta funciona igual: 3/4 − 1/6 = 9/12 − 2/12 = 7/12.",
          "Al final, simplifica si es posible y comprueba el tamaño: 1/2 + 1/3 debe ser algo menos que 1, porque ambas son menores que 1/2 + 1/2.",
        ],
        formula: "3/4 − 1/6 = 9/12 − 2/12 = 7/12",
      },
    ],
    examples: [
      ex("Calcula 2/3 + 1/4.", [
        ["mcm(3, 4) = 12", "Buscamos un tamaño de parte que sirva para ambas fracciones."],
        ["2/3 = 8/12; 1/4 = 3/12", "Expresamos cada fracción en doceavos."],
        ["8/12 + 3/12 = 11/12", "Sumamos partes del mismo tamaño."],
      ], "2/3 + 1/4 = 11/12."),
      ex("Un depósito tenía 5/6 y se usaron 1/4. ¿Cuánto queda?", [
        ["mcm(6, 4) = 12", "El denominador común más pequeño."],
        ["5/6 = 10/12; 1/4 = 3/12", "Convertimos ambas fracciones."],
        ["10/12 − 3/12 = 7/12", "Restamos doceavos."],
      ], "Quedan 7/12 del depósito."),
    ],
    diagnostic: [
      n("d-1", "Completa: 1/3 = __/12.", 4, ["3 × 4 = 12; 1 × 4 = 4."], ["Busca el factor del denominador.", "12 ÷ 3 = 4.", "Multiplica 1 por 4."], { step: true }),
      c("d-2", "¿Cuánto es 2/9 + 5/9?", ["7/18", "7/9", "10/9"], 1, "Con el mismo denominador se suman los numeradores."),
      n("d-3", "¿Cuál es el menor múltiplo común de 4 y 6?", 12, ["Múltiplos de 4 → 4, 8, 12…; de 6 → 6, 12…"], ["Escribe los múltiplos de cada uno.", "Busca el primero que se repite.", "12."]),
    ],
    questions(v) {
      const [a, b, cc, d] = [[1, 2, 1, 3], [2, 3, 1, 4], [3, 4, 1, 6], [2, 5, 1, 3], [1, 4, 5, 6], [3, 8, 1, 6]][v],
        [s1, s2, s3, s4] = [[3, 4, 1, 3], [5, 6, 1, 4], [4, 5, 1, 2], [7, 8, 1, 6], [2, 3, 1, 5], [5, 9, 1, 6]][v],
        [u1, u2, u3, u4] = [[1, 4, 1, 3], [1, 3, 2, 5], [1, 6, 3, 8], [2, 9, 1, 3], [1, 5, 3, 10], [1, 2, 1, 7]][v];
      const L = lcm(b, d), sum = a / b + cc / d, diff = s1 / s2 - s3 / s4, left = 1 - u1 / u2 - u3 / u4;
      return [
        v % 2 === 0
          ? c(
              "q0",
              `¿Por qué ${a}/${b} + ${cc}/${d} no es ${a + cc}/${b + d}?`,
              [
                [`Sí lo es: se suman numeradores y denominadores`, `Prueba con 1/2 + 1/2: daría 2/4, solo media unidad.`],
                "Porque las partes tienen tamaños distintos: hay que expresarlas con un denominador común",
                ["Porque hay que multiplicar las fracciones", "Es una suma; multiplicar responde otra pregunta."],
              ],
              1,
              "Solo se pueden contar juntas partes del mismo tamaño.",
            )
          : c(
              "q0",
              `En ${s3}/${s2} + ${s1}/${s2}, ¿por qué el denominador sigue siendo ${s2}?`,
              [
                ["Porque se copia el mayor", "No se elige el mayor: el denominador es el tamaño de las partes."],
                [`Porque hay que sumarlo: ${s2 * 2}`, "Sumar denominadores cambiaría el tamaño de las partes."],
                `Porque las partes siguen siendo de tamaño 1/${s2}; solo cambia cuántas hay`,
              ],
              2,
              "Al sumar fracciones con igual denominador se cuentan partes del mismo tamaño.",
            ),
        n(
          "q1",
          `Calcula ${a}/${b} + ${cc}/${d}.`,
          sum,
          [`Denominador común: ${L}.`, `${a}/${b} = ${(a * L) / b}/${L}; ${cc}/${d} = ${(cc * L) / d}/${L}.`, `Suma: ${(a * L) / b + (cc * L) / d}/${L} = ${fr((a * L) / b + (cc * L) / d, L)}.`],
          ["Las partes tienen tamaños distintos.", `Usa ${L} como denominador común.`, `Suma ${(a * L) / b}/${L} y ${(cc * L) / d}/${L}.`],
          { errors: [{ value: (a + cc) / (b + d), feedback: "Sumaste numeradores y denominadores. Expresa las fracciones con un denominador común." }] },
        ),
        n(
          "q2",
          `Completa: ${a}/${b} + ${cc}/${d} = ${(a * L) / b}/${L} + __/${L}.`,
          (cc * L) / d,
          [`${L} ÷ ${d} = ${L / d}; ${cc} × ${L / d} = ${(cc * L) / d}.`],
          ["Busca el factor que transforma el denominador.", `${L} ÷ ${d} = ${L / d}.`, `Multiplica ${cc} por ${L / d}.`],
          { step: true, errors: [{ value: cc, feedback: "Si cambias el denominador, el numerador cambia por el mismo factor." }] },
        ),
        n(
          "q3",
          `Calcula ${s1}/${s2} − ${s3}/${s4}.`,
          diff,
          [`Denominador común: ${lcm(s2, s4)}.`, `${s1}/${s2} − ${s3}/${s4} = ${(s1 * lcm(s2, s4)) / s2}/${lcm(s2, s4)} − ${(s3 * lcm(s2, s4)) / s4}/${lcm(s2, s4)} = ${fr((s1 * lcm(s2, s4)) / s2 - (s3 * lcm(s2, s4)) / s4, lcm(s2, s4))}.`],
          ["Igual que en la suma, necesitas partes del mismo tamaño.", `Usa ${lcm(s2, s4)} como denominador.`, "Resta los numeradores convertidos."],
          { errors: [{ value: (s1 - s3) / (s2 - s4), feedback: "Restaste numeradores y denominadores. Usa un denominador común." }].filter((e) => Number.isFinite(e.value)) },
        ),
        c(
          "q4",
          `Un compañero calcula ${s3}/${s2} + ${s1}/${s2} = ${s3 + s1}/${2 * s2}. ¿Qué falla?`,
          [
            ["Nada, está bien", `Con igual denominador, el resultado son ${s3 + s1} partes de tamaño 1/${s2}.`],
            `Sumó los denominadores: debía ser ${s3 + s1}/${s2}`,
            ["Debía multiplicar los numeradores", "En una suma se cuentan partes, no se multiplican."],
          ],
          1,
          "El denominador indica el tamaño de las partes y no se suma.",
        ),
        n(
          "q5",
          `Un depósito estaba a ${a}/${b} y una bomba añadió ${cc}/${d} de su capacidad. ¿Qué fracción está llena ahora?`,
          sum,
          [`${a}/${b} + ${cc}/${d} = ${fr((a * L) / b + (cc * L) / d, L)}.`],
          ["Es una suma de fracciones de la misma capacidad.", `Denominador común: ${L}.`, "Suma y simplifica."],
          {
            intent: "transfer",
            errors: [{ value: (a + cc) / (b + d), feedback: "Sumar denominadores cambia el tamaño de las partes." }],
          },
        ),
        n(
          "q6",
          `De una reserva se usaron ${u1}/${u2} para el hospital y ${u3}/${u4} para la radio. ¿Qué fracción de la reserva queda?`,
          left,
          [`Usado: ${u1}/${u2} + ${u3}/${u4} = ${fr(u1 * (lcm(u2, u4) / u2) + u3 * (lcm(u2, u4) / u4), lcm(u2, u4))}.`, `Queda: 1 − ${fr(u1 * (lcm(u2, u4) / u2) + u3 * (lcm(u2, u4) / u4), lcm(u2, u4))} = ${fr(lcm(u2, u4) - u1 * (lcm(u2, u4) / u2) - u3 * (lcm(u2, u4) / u4), lcm(u2, u4))}.`],
          ["La reserva completa es 1.", "Suma primero lo usado.", `Escribe 1 como ${lcm(u2, u4)}/${lcm(u2, u4)} y resta.`],
          {
            intent: "transfer",
            errors: [{ value: u1 / u2 + u3 / u4, feedback: "Esa es la fracción usada. Se pregunta por la que queda." }],
          },
        ),
      ];
    },
    application: n(
      "app",
      "Tres paneles solares cargan una batería: el primero aporta 1/4, el segundo 1/3 y el tercero 1/6 de su capacidad. ¿Qué fracción falta para llenarla?",
      1 / 4,
      ["Denominador común 12 → 3/12 + 4/12 + 2/12 = 9/12.", "Falta 12/12 − 9/12 = 3/12 = 1/4."],
      ["Suma primero los tres aportes.", "Usa 12 como denominador común.", "Resta el total a 1."],
      {
        intent: "transfer",
        errors: [
          { value: 3 / 4, feedback: "Esa es la fracción cargada. Se pregunta cuánto falta." },
          { value: 3 / 13, feedback: "Sumaste numeradores y denominadores: las partes tienen tamaños distintos." },
        ],
      },
    ),
    outcome: "Puedes combinar aportes y consumos medidos en fracciones distintas.",
    commonErrors: [
      "Sumar numeradores y denominadores.",
      "Cambiar el denominador sin cambiar el numerador.",
      "Olvidar que la unidad completa es 1 al calcular lo que queda.",
    ],
  }),
  defineLesson({
    id: "fracciones-producto-cociente",
    unitId: "fracciones",
    title: "Multiplicar y dividir fracciones",
    objective:
      "Multiplicar y dividir fracciones interpretando el producto como «fracción de» y el cociente como «cuántas veces cabe».",
    purpose:
      "Para repartir la reserva en envases y calcular partes de partes, hay que multiplicar y dividir fracciones con sentido.",
    prerequisites: ["fraccion-cantidad", "fracciones-suma-resta"],
    legacyModuleIds: ["aritmetica-fracciones-mult-div"],
    visual: "quantity",
    vocabulary: [
      { term: "Inverso", meaning: "La fracción que multiplicada por otra da 1: el inverso de 3/4 es 4/3." },
      { term: "Fracción de una fracción", meaning: "2/3 de 3/4 es 2/3 × 3/4." },
    ],
    sections: [
      {
        title: "Multiplicar es tomar una fracción de otra",
        paragraphs: [
          "2/3 × 3/4 significa 2/3 de 3/4. Se multiplican numeradores y denominadores: 6/12 = 1/2.",
          "Multiplicar por una fracción menor que 1 da un resultado menor: tomar 2/3 de algo deja menos que el todo.",
        ],
        formula: "a/b × c/d = (a × c)/(b × d)",
      },
      {
        title: "Dividir es preguntar cuántas veces cabe",
        paragraphs: [
          "6 ÷ 1/2 pregunta cuántos medios caben en 6: caben 12. Dividir entre una fracción menor que 1 da un resultado mayor.",
          "Para dividir, multiplica por el inverso: 3/4 ÷ 1/8 = 3/4 × 8/1 = 6. Seis octavos caben en tres cuartos.",
        ],
        formula: "a/b ÷ c/d = a/b × d/c",
      },
      {
        title: "Simplifica y estima",
        paragraphs: [
          "Puedes simplificar antes de multiplicar: 4/9 × 3/8 = (4 × 3)/(9 × 8); el 4 y el 8 comparten 4, el 3 y el 9 comparten 3 → 1/6.",
          "Estima siempre: 5 ÷ 2/3 debe ser mayor que 5; 5 × 2/3, menor.",
        ],
        formula: "4/9 × 3/8 = 1/6",
      },
    ],
    examples: [
      ex("¿Cuánto es 3/5 de 2/3 de un depósito?", [
        ["3/5 × 2/3", "«De» indica multiplicación."],
        ["(3 × 2)/(5 × 3) = 6/15", "Multiplicamos numeradores y denominadores."],
        ["6/15 = 2/5", "Simplificamos dividiendo entre 3."],
      ], "3/5 de 2/3 es 2/5 del depósito."),
      ex("¿Cuántos envases de 3/4 L se llenan con 6 L?", [
        ["6 ÷ 3/4", "Preguntamos cuántas veces cabe 3/4 en 6."],
        ["6 × 4/3 = 24/3", "Dividir es multiplicar por el inverso."],
        ["24/3 = 8", "Comprobación: 8 × 3/4 = 6."],
      ], "Se llenan 8 envases."),
    ],
    diagnostic: [
      n("d-1", "¿Cuánto es 1/2 de 10?", 5, ["10 ÷ 2 = 5."], ["Reparte en dos partes iguales.", "10 ÷ 2.", "5."]),
      c("d-2", "¿Cuántos medios caben en 3 unidades?", ["3", "6", "1,5"], 1, "Cada unidad tiene 2 medios: 3 × 2 = 6."),
      n("d-3", "Simplifica 6/8. ¿Cuál es el nuevo numerador?", 3, ["6 ÷ 2 = 3 y 8 ÷ 2 = 4."], ["Busca un divisor común.", "Ambos son pares.", "6 ÷ 2 = 3."]),
    ],
    questions(v) {
      const [a, b, cc, d] = [[2, 3, 3, 4], [1, 2, 4, 5], [3, 5, 2, 3], [3, 4, 2, 7], [2, 5, 5, 6], [5, 8, 2, 3]][v],
        [p, q, r, s] = [[3, 4, 1, 8], [2, 3, 1, 6], [5, 6, 1, 3], [4, 5, 2, 15], [3, 5, 3, 10], [7, 8, 1, 4]][v],
        [litres, an, ad] = [[6, 3, 4], [10, 2, 5], [9, 3, 4], [8, 2, 3], [12, 3, 5], [15, 5, 6]][v],
        [kn, kd, rn, rd] = [[2, 3, 4, 9], [3, 4, 3, 8], [4, 5, 2, 5], [2, 5, 3, 10], [5, 6, 5, 12], [3, 7, 6, 35]][v];
      return [
        v % 2 === 0
          ? c(
              "q0",
              `¿Qué significa ${a}/${b} × ${cc}/${d}?`,
              [
                `Tomar ${a}/${b} de ${cc}/${d}`,
                [`Sumar ${a}/${b} y ${cc}/${d}`, "Sumar es otra operación: aquí se toma una parte de otra."],
                [`Cuántas veces cabe ${cc}/${d} en ${a}/${b}`, "Eso es una división."],
              ],
              0,
              "Multiplicar por una fracción es tomar esa fracción de la cantidad.",
            )
          : c(
              "q0",
              `¿Por qué ${litres} ÷ 1/2 da un número mayor que ${litres}?`,
              [
                ["Porque dividir siempre agranda", "Dividir entre un número mayor que 1 achica; aquí se divide entre algo menor que 1."],
                `Porque se pregunta cuántos medios caben en ${litres}, y caben ${litres * 2}`,
                ["Porque es un error de cálculo", "No es un error: en cada unidad caben dos medios."],
              ],
              1,
              "Dividir entre una fracción menor que 1 cuenta cuántas veces cabe esa parte pequeña.",
            ),
        n(
          "q1",
          `Calcula ${a}/${b} × ${cc}/${d}.`,
          (a * cc) / (b * d),
          [`(${a} × ${cc})/(${b} × ${d}) = ${a * cc}/${b * d} = ${fr(a * cc, b * d)}.`],
          ["Multiplica numeradores entre sí y denominadores entre sí.", `${a} × ${cc} y ${b} × ${d}.`, "Simplifica si puedes."],
          { errors: [{ value: (a * d + cc * b) / (b * d), feedback: "Eso es la suma. En el producto se multiplican numeradores y denominadores." }] },
        ),
        n(
          "q2",
          `Completa: ${p}/${q} ÷ ${r}/${s} = ${p}/${q} × __.`,
          s / r,
          [`Dividir entre ${r}/${s} es multiplicar por su inverso, ${s}/${r}.`],
          ["Dividir es multiplicar por el inverso.", `El inverso de ${r}/${s} intercambia sus términos.`, `${s}/${r}.`],
          { step: true, errors: [{ value: r / s, feedback: "Hay que invertir el divisor: intercambia numerador y denominador." }] },
        ),
        n(
          "q3",
          `Calcula ${p}/${q} ÷ ${r}/${s}.`,
          (p * s) / (q * r),
          [`${p}/${q} × ${s}/${r} = ${p * s}/${q * r} = ${fr(p * s, q * r)}.`],
          ["Multiplica por el inverso del divisor.", `${p}/${q} × ${s}/${r}.`, "Simplifica."],
          { errors: [{ value: (p * r) / (q * s), feedback: "Multiplicaste sin invertir el divisor." }] },
        ),
        c(
          "q4",
          `Alguien dice que ${a}/${b} × ${cc}/${d} debe ser mayor que ${cc}/${d} "porque multiplicar agranda". ¿Qué responde?`,
          [
            ["Tiene razón: multiplicar siempre agranda", `Multiplicar por ${a}/${b}, menor que 1, toma solo una parte.`],
            `No: multiplicar por ${a}/${b} < 1 toma una parte, así que el resultado es menor`,
            ["Depende de si los números son pares", "La paridad no importa: importa si el factor es mayor o menor que 1."],
          ],
          1,
          "Un factor menor que 1 reduce; uno mayor que 1 aumenta.",
        ),
        n(
          "q5",
          `¿Cuántos envases de ${an}/${ad} L se llenan con ${litres} L?`,
          (litres * ad) / an,
          [`${litres} ÷ ${an}/${ad} = ${litres} × ${ad}/${an} = ${fr(litres * ad, an)}.`, `Comprobación: ${fr(litres * ad, an)} × ${an}/${ad} = ${litres}.`],
          ["Se pregunta cuántas veces cabe un envase.", "Es una división entre una fracción.", "Multiplica por el inverso."],
          {
            intent: "transfer",
            unit: "envases",
            errors: [{ value: (litres * an) / ad, feedback: "Multiplicaste por la capacidad. Para saber cuántos caben, divide." }],
          },
        ),
        n(
          "q6",
          `Los ${kn}/${kd} de una cantidad son ${rn}/${rd}. ¿Cuál es la cantidad?`,
          (rn / rd) / (kn / kd),
          [`${kn}/${kd} × x = ${rn}/${rd}.`, `x = ${rn}/${rd} ÷ ${kn}/${kd} = ${rn}/${rd} × ${kd}/${kn} = ${fr(rn * kd, rd * kn)}.`],
          ["Escribe la relación como una multiplicación con un factor desconocido.", "Deshaz la multiplicación dividiendo.", `Divide ${rn}/${rd} entre ${kn}/${kd}.`],
          {
            intent: "transfer",
            errors: [{ value: (rn / rd) * (kn / kd), feedback: `Calculaste ${kn}/${kd} de ${rn}/${rd}. Aquí ${rn}/${rd} ya es la parte: busca el todo.` }],
          },
        ),
      ];
    },
    application: n(
      "app",
      "La reserva tiene 3/4 de su capacidad de 120 L. Se reparte en bidones de 2/5 L. ¿Cuántos bidones se llenan?",
      225,
      ["Reserva: 3/4 × 120 = 90 L.", "Bidones: 90 ÷ 2/5 = 90 × 5/2 = 225."],
      ["Calcula primero los litros de la reserva.", "Después cuenta cuántas veces caben 2/5 L.", "Divide multiplicando por el inverso."],
      {
        intent: "transfer",
        unit: "bidones",
        errors: [
          { value: 36, feedback: "Multiplicaste por 2/5. Para contar bidones se divide." },
          { value: 300, feedback: "Usaste los 120 L completos: la reserva está a 3/4." },
        ],
      },
    ),
    outcome: "Puedes calcular partes de partes y repartir cantidades en envases de tamaño fraccionario.",
    commonErrors: [
      "Multiplicar sin invertir el divisor al dividir.",
      "Creer que multiplicar siempre agranda y dividir siempre achica.",
      "Buscar un denominador común para multiplicar.",
    ],
  }),
];
