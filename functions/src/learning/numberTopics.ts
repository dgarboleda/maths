import { errorFollowup } from "./errorFollowup";
import { defineLesson } from "./defineLesson";
import { choice as c, example as ex, numeric as n, type ChoiceLabel } from "./questions";
import { dec, divisorPairs, divisors, frac, gcd, isPrime, list, powerForm, primeFactors, sup } from "./topicHelpers";
import type { Lesson } from "./types";

/**
 * Temas de números que faltaban en el programa: divisibilidad, primos,
 * números romanos, racionales e irracionales, radicales, números mixtos y
 * regla de tres compuesta. Se exportan por grupos para que cada uno quede en
 * el catálogo después de sus bases (`catalog.ts`).
 */

const digitsOf = (x: number) => String(x).split("").map(Number);
const sumDigits = (x: number) => digitsOf(x).reduce((a, b) => a + b, 0);

// ── Números romanos ────────────────────────────────────────────────────
const ROMAN: [number, string][] = [
  [1000, "M"], [900, "CM"], [500, "D"], [400, "CD"], [100, "C"], [90, "XC"],
  [50, "L"], [40, "XL"], [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"],
];
const SYMBOL: Record<string, number> = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };
export function toRoman(value: number): string {
  let rest = value;
  let out = "";
  for (const [v, s] of ROMAN)
    while (rest >= v) {
      out += s;
      rest -= v;
    }
  return out;
}
/** Grupos de un número romano en orden («MCMXC» → M, CM, XC) con su valor. */
function romanGroups(value: number): { text: string; value: number }[] {
  const groups: { text: string; value: number }[] = [];
  let rest = value;
  for (const [v, s] of ROMAN)
    while (rest >= v) {
      const last = groups.at(-1);
      // Los símbolos repetidos (CCC) forman un solo grupo.
      if (last && s.length === 1 && last.text.endsWith(s) && last.text.split("").every((ch) => ch === s)) {
        last.text += s;
        last.value += v;
      } else groups.push({ text: s, value: v });
      rest -= v;
    }
  return groups;
}
/** Suma de todos los símbolos sin restar (el error de leer IX como 11). */
const naiveRoman = (r: string) => r.split("").reduce((a, ch) => a + SYMBOL[ch], 0);

export const NUMBER_THEORY_LESSONS: Lesson[] = [
  defineLesson({
    id: "divisibilidad",
    unitId: "numeros",
    title: "Divisores, múltiplos y criterios de divisibilidad",
    objective:
      "Distinguir divisores de múltiplos, encontrar todos los divisores de un número y usar los criterios de divisibilidad entre 2, 3, 5, 9 y 10 sin hacer la división.",
    purpose:
      "Saber si un reparto sale exacto sin dividir ahorra tiempo al armar grupos, cajas o turnos, y es el primer paso para encontrar números primos, el MCD y el MCM.",
    prerequisites: [],
    legacyModuleIds: [],
    visual: "equal-groups",
    vocabulary: [
      { term: "Divisor", meaning: "Un número es divisor de otro si lo divide exactamente, sin resto: 6 es divisor de 24." },
      { term: "Múltiplo", meaning: "Resultado de multiplicar un número por 1, 2, 3…: 24 es múltiplo de 6." },
      { term: "Divisible", meaning: "Un número es divisible entre otro si la división entre ellos es exacta." },
      { term: "Criterio de divisibilidad", meaning: "Regla que dice si un número es divisible entre otro mirando sus cifras, sin dividir." },
    ],
    sections: [
      {
        title: "Divisor y múltiplo: dos caras de la misma división",
        paragraphs: [
          "Si una división es exacta (resto 0), el divisor es divisor del dividendo y el dividendo es múltiplo del divisor. Como 24 ÷ 6 = 4 sin resto, 6 es divisor de 24 y 24 es múltiplo de 6.",
          "Los divisores positivos de un número natural mayor que 0 son finitos y no superan ese número. Sus múltiplos son infinitos: se obtienen multiplicando por 1, 2, 3, 4… sin fin.",
        ],
        formula: "24 = 6 × 4 → 6 divide a 24 y 24 es múltiplo de 6",
      },
      {
        title: "Encontrar todos los divisores por parejas",
        paragraphs: [
          "Se prueba con 1, 2, 3… y cada división exacta da dos divisores a la vez: el número que se prueba y el cociente. Se para cuando el número que se prueba alcanza al cociente.",
          "Para 36 las parejas son 1 y 36, 2 y 18, 3 y 12, 4 y 9, y 6 y 6. Sus divisores son 1, 2, 3, 4, 6, 9, 12, 18 y 36.",
        ],
        formula: "36 = 1 × 36 = 2 × 18 = 3 × 12 = 4 × 9 = 6 × 6",
      },
      {
        title: "Criterios: saber sin dividir",
        paragraphs: [
          "Un número es divisible entre 2 si su última cifra es par; entre 5, si termina en 0 o en 5; entre 10, si termina en 0.",
          "Es divisible entre 3 si la suma de sus cifras es múltiplo de 3, y entre 9 si esa suma es múltiplo de 9. En 738 las cifras suman 7 + 3 + 8 = 18, que es múltiplo de 9, así que 738 es divisible entre 9 y también entre 3.",
        ],
        formula: "2 → cifra final par;  3 → suma de cifras múltiplo de 3;  5 → termina en 0 o 5;  9 → suma de cifras múltiplo de 9;  10 → termina en 0",
      },
    ],
    examples: [
      ex(
        "¿Cuáles son todos los divisores de 48?",
        [
          ["48 = 1 × 48 = 2 × 24 = 3 × 16", "Probamos desde 1: cada división exacta da una pareja de divisores, el que probamos y su cociente."],
          ["48 = 4 × 12 = 6 × 8", "48 ÷ 5 deja resto 3 y 48 ÷ 7 deja resto 6, así que 5 y 7 no son divisores. 4 y 6 sí lo son."],
          ["1, 2, 3, 4, 6, 8, 12, 16, 24 y 48", "Al probar 7 el cociente ya sería menor que 8, que ya está en la lista: no hay parejas nuevas. Son 10 divisores."],
        ],
        "48 tiene 10 divisores. Buscar por parejas evita olvidar los grandes: cada divisor pequeño trae uno grande.",
      ),
      ex(
        "¿Es 2457 divisible entre 3? ¿Y entre 9?",
        [
          ["2 + 4 + 5 + 7 = 18", "Sumamos las cifras: el criterio del 3 y el del 9 miran esa suma, no la última cifra."],
          ["18 = 3 × 6 = 9 × 2", "La suma, 18, es múltiplo de 3 y también de 9."],
          ["2457 = 9 × 273", "Comprobamos dividiendo: 2457 ÷ 9 da 273 sin resto. También es divisible entre 3, porque 2457 = 3 × 819."],
        ],
        "Todo número divisible entre 9 también lo es entre 3, porque 9 = 3 × 3. Al revés no siempre: 12 es divisible entre 3, pero no entre 9.",
      ),
    ],
    diagnostic: [
      n("d-1", "¿Cuánto es 7 × 8?", 56, ["7 × 8 son 7 grupos de 8.", "7 × 8 = 56."], ["Piensa en la tabla del 8.", "7 × 8 = 8 × 7.", "Es 56."]),
      n("d-2", "Al dividir 29 entre 4, ¿cuánto sobra (el resto)?", 1, ["4 × 7 = 28 es el múltiplo de 4 más cercano sin pasarse.", "29 − 28 = 1, así que sobra 1."], ["Busca el múltiplo de 4 más cercano a 29.", "4 × 7 = 28.", "29 − 28 = 1."]),
      c("d-3", "¿Cuál de estas divisiones es exacta?", ["35 ÷ 4", "35 ÷ 5", "35 ÷ 6"], 1, "35 ÷ 5 = 7 sin resto; 35 ÷ 4 y 35 ÷ 6 dejan resto."),
    ],
    practiceCorrection: errorFollowup("¿Qué resto deja 84 al dividirlo entre 3?", 0, "Sumamos las cifras de 84 → 8 + 4 = 12, que es múltiplo de 3.", "Por tanto, 84 es divisible entre 3 y el resto es 0."),
    questions(v) {
      const [b, q] = [[6, 4], [7, 3], [8, 5], [9, 4], [5, 6], [12, 3]][v];
      const a = b * q;
      const zero = [370, 580, 470, 230, 610, 820][v];
      const concept = [
        c(
          "q0",
          `Como ${a} ÷ ${b} = ${q} sin resto, ¿qué afirmación es correcta?`,
          [
            `${b} es divisor de ${a} y ${a} es múltiplo de ${b}`,
            [`${a} es divisor de ${b}`, `Un divisor nunca es mayor que el número: ${a} es mayor que ${b}.`],
            [`${b} es múltiplo de ${a}`, `Los múltiplos de ${a} son ${a}, ${2 * a}, ${3 * a}… y ${b} es menor que ${a}.`],
          ],
          0,
          `Una división exacta relaciona las dos ideas: ${b} divide a ${a} y ${a} = ${b} × ${q} es múltiplo de ${b}.`,
        ),
        c(
          "q0",
          `¿Cuántos múltiplos tiene ${b}?`,
          [
            [`${b}, porque se cuentan hasta ${b} × ${b}`, `La lista no termina en ${b} × ${b}, porque ${b} × ${b + 1} = ${b * (b + 1)} también es múltiplo.`],
            `Infinitos: ${b}, ${2 * b}, ${3 * b}… y siempre se puede seguir`,
            [`Tantos como divisores`, "Los divisores se acaban; los múltiplos no, porque se puede multiplicar por números cada vez mayores."],
          ],
          1,
          `Para cada número natural k, ${b} × k es múltiplo de ${b}: nunca se acaban.`,
        ),
        c(
          "q0",
          `El número ${zero} termina en 0. Sin hacer la cuenta, ¿entre cuáles es seguro que se divide?`,
          [
            ["Solo entre 10", "Si termina en 0 también termina en cifra par (divisible entre 2) y en 0 o 5 (divisible entre 5)."],
            ["Entre 3 y 9", `El 3 y el 9 dependen de la suma de las cifras: en ${zero} suman ${sumDigits(zero)}.`],
            "Entre 2, 5 y 10",
          ],
          2,
          `Terminar en 0 cumple los criterios del 2, del 5 y del 10; por ejemplo, ${zero} ÷ 10 = ${zero / 10}.`,
        ),
      ][v % 3];

      const N = [36, 48, 60, 50, 40, 90][v];
      const pairs = divisorPairs(N);
      const all = divisors(N);
      const X = [738, 1254, 4581, 2364, 615, 9135][v];
      const sx = sumDigits(X);
      const [mb, L] = [[7, 100], [6, 50], [8, 90], [9, 80], [4, 30], [12, 100]][v];
      const mq = Math.floor(L / mb);
      const Z = [43, 76, 119, 226, 59, 133][v];
      const P = [24, 36, 30, 20, 18, 28][v];
      const pd = divisors(P);
      const inner = pd.filter((d) => d !== 1 && d !== P);
      const [K, d1, d2, bad] = [[84, 7, 12, 9], [90, 9, 15, 4], [72, 8, 9, 5], [60, 12, 15, 9], [96, 12, 16, 9], [120, 8, 15, 9]][v];
      return [
        concept,
        n(
          "q1",
          `¿Cuántos divisores tiene ${N}?`,
          all.length,
          [
            `Buscamos las parejas cuyo producto es ${N} → ${pairs.map(([x, y]) => `${x} × ${y}`).join(", ")}.`,
            `Cada pareja aporta dos divisores (uno solo si es un cuadrado como 6 × 6). Los divisores de ${N} son ${list(all)}, en total ${all.length}.`,
          ],
          ["Prueba con 1, 2, 3… y anota las divisiones exactas.", "Cada división exacta da dos divisores: el que pruebas y el cociente.", `Las parejas son ${pairs.map(([x, y]) => `${x} × ${y}`).join(", ")}.`],
          {
            errors: [
              { value: pairs.length, feedback: "Contaste las parejas: cada pareja aporta dos divisores, salvo un cuadrado como 6 × 6." },
              { value: all.length - 2, feedback: `Faltan el 1 y el propio ${N}: también son divisores.` },
            ].filter((e) => e.value !== all.length),
          },
        ),
        n(
          "q2",
          `¿Es ${X} divisible entre 3? Primer paso → suma sus cifras. ¿Cuánto da?`,
          sx,
          [
            `Las cifras de ${X} son ${list(digitsOf(X))} → ${digitsOf(X).join(" + ")} = ${sx}.`,
            `${sx} ${sx % 3 === 0 ? "es" : "no es"} múltiplo de 3, así que ${X} ${sx % 3 === 0 ? "es" : "no es"} divisible entre 3.`,
          ],
          ["El criterio del 3 no mira la última cifra: mira la suma de todas.", `Las cifras de ${X} son ${list(digitsOf(X))}.`, `Suma ${digitsOf(X).join(" + ")}.`],
          { step: true },
        ),
        n(
          "q3",
          `¿Cuántos múltiplos de ${mb} hay entre 1 y ${L}?`,
          mq,
          [
            `${mb} × ${mq} = ${mb * mq} no pasa de ${L}, pero ${mb} × ${mq + 1} = ${mb * (mq + 1)} ya se pasa.`,
            `Los múltiplos de ${mb} hasta ${L} van de ${mb} × 1 hasta ${mb} × ${mq}, así que hay ${mq}.`,
          ],
          [`Los múltiplos de ${mb} son ${mb} × 1, ${mb} × 2, ${mb} × 3…`, `Busca cuántas veces cabe ${mb} en ${L}.`, `${mb} × ${mq} = ${mb * mq} y ${mb} × ${mq + 1} = ${mb * (mq + 1)}.`],
          { errors: [{ value: mq + 1, feedback: `Contaste uno de más: ${mb} × ${mq + 1} = ${mb * (mq + 1)} ya supera ${L}.` }] },
        ),
        c(
          "q4",
          `Lucía dice que ${Z} es divisible entre 3 porque termina en ${Z % 10}, que es múltiplo de 3. ¿Tiene razón?`,
          [
            ["Sí: si la última cifra es múltiplo de 3, el número también", `${Z} ÷ 3 no es exacta: sobra ${Z % 3}.`],
            `No: el criterio del 3 mira la suma de las cifras, y ${sumDigits(Z)} no es múltiplo de 3`,
            ["Solo si además es impar", "Ser par o impar no decide la divisibilidad entre 3: la decide la suma de las cifras."],
          ],
          1,
          `${digitsOf(Z).join(" + ")} = ${sumDigits(Z)}, que no es múltiplo de 3. Por eso ${Z} no es divisible entre 3.`,
        ),
        n(
          "q5",
          `Se quieren poner ${P} sillas en filas iguales, con más de una fila y más de una silla por fila. ¿De cuántas formas se puede hacer, si ${inner[0]} filas de ${P / inner[0]} y ${P / inner[0]} filas de ${inner[0]} cuentan como formas distintas?`,
          inner.length,
          [
            `Cada forma es una pareja «filas × sillas por fila» que da ${P}: un divisor de ${P} y su cociente.`,
            `Los divisores de ${P} son ${list(pd)}. Sin el 1 ni el ${P} quedan ${list(inner)} → ${inner.length} formas.`,
          ],
          [`El número de filas tiene que dividir a ${P}.`, `Busca todos los divisores de ${P}.`, `Quita el 1 y el ${P}, que dan una sola fila o una sola silla por fila.`],
          {
            intent: "transfer",
            errors: [
              { value: pd.length, feedback: "Incluiste 1 fila o 1 silla por fila, que el enunciado no permite." },
              { value: Math.ceil(inner.length / 2), feedback: `Contaste ${inner[0]} × ${P / inner[0]} y ${P / inner[0]} × ${inner[0]} como una sola forma; el enunciado las distingue.` },
            ].filter((e) => e.value !== inner.length),
          },
        ),
        c(
          "q6",
          `Una caja de ${K} galletas se quiere repartir en paquetes iguales sin que sobre ninguna. ¿Cuál de estos tamaños de paquete no sirve?`,
          [
            [`Paquetes de ${d1}`, `${K} ÷ ${d1} = ${K / d1} sin resto: sí sirve.`],
            [`Paquetes de ${d2}`, `${K} ÷ ${d2} = ${K / d2} sin resto: sí sirve.`],
            `Paquetes de ${bad}`,
          ],
          2,
          `${K} ÷ ${bad} no es exacta (sobran ${K % bad}); ${d1} y ${d2} sí dividen a ${K}.`,
          "transfer",
        ),
      ];
    },
    outcome: "Puedes listar los divisores de un número por parejas, distinguirlos de sus múltiplos y decidir si es divisible entre 2, 3, 5, 9 o 10 sin dividir.",
    commonErrors: [
      "Confundir divisor con múltiplo: 6 es divisor de 24, no múltiplo.",
      "Aplicar el criterio del 3 a la última cifra en lugar de a la suma de todas las cifras.",
      "Olvidar el 1 y el propio número al contar los divisores.",
      "Contar solo las parejas y no los dos divisores de cada pareja.",
    ],
    application: n(
      "aplicacion",
      "Un colegio tiene 210 estudiantes y quiere formar equipos del mismo tamaño sin que nadie quede fuera. Cada equipo debe tener entre 11 y 20 integrantes, y un número impar de ellos. ¿Cuántos integrantes tiene cada equipo?",
      15,
      [
        "210 termina en 0, así que es divisible entre 2, 5 y 10; sus cifras suman 3, así que también entre 3.",
        "Entre 11 y 20, los divisores de 210 son 14 y 15, porque 210 = 14 × 15. El impar es 15.",
      ],
      ["El tamaño del equipo tiene que dividir a 210.", "Busca los divisores de 210 entre 11 y 20.", "De ellos, elige el impar."],
      { intent: "transfer" },
    ),
  }),

  defineLesson({
    id: "numeros-primos",
    unitId: "numeros",
    title: "Números primos y descomposición en factores primos",
    objective:
      "Distinguir números primos y compuestos, encontrar los primos menores que 100 con la criba de Eratóstenes y descomponer un número en producto de factores primos.",
    purpose:
      "Todo número natural mayor que 1 puede escribirse como producto de números primos. Conocer esos factores ayuda a calcular el MCD y el MCM y a simplificar fracciones y raíces.",
    prerequisites: ["divisibilidad"],
    legacyModuleIds: [],
    visual: "sieve",
    vocabulary: [
      { term: "Número primo", meaning: "Número natural mayor que 1 que solo se divide exactamente entre 1 y sí mismo: 2, 3, 5, 7, 11…" },
      { term: "Número compuesto", meaning: "Número mayor que 1 que tiene algún divisor además de 1 y de sí mismo: 4, 6, 9, 15…" },
      { term: "Criba de Eratóstenes", meaning: "Método para encontrar los primos tachando los múltiplos de cada primo." },
      { term: "Descomposición en factores primos", meaning: "Escribir un número como producto de primos: 60 = 2² × 3 × 5." },
    ],
    sections: [
      {
        title: "Primos y compuestos",
        paragraphs: [
          "Un número mayor que 1 es primo si tiene exactamente dos divisores: 1 y él mismo. Si tiene más, es compuesto: 15 es compuesto porque 15 = 3 × 5.",
          "El 1 no es primo ni compuesto, porque tiene un solo divisor. El 2 es el único primo par: cualquier otro número par es divisible entre 2.",
        ],
        formula: "7 → divisores 1 y 7 (primo);  9 → divisores 1, 3 y 9 (compuesto)",
      },
      {
        title: "La criba de Eratóstenes",
        paragraphs: [
          "Para hallar los primos hasta 100 se escriben los números del 2 al 100. Se deja el 2 y se tachan sus múltiplos; luego se deja el siguiente sin tachar, el 3, y se tachan los suyos; después se hace lo mismo con el 5 y con el 7.",
          "Basta con llegar al 7, porque 11 × 11 = 121 ya pasa de 100: todo compuesto menor que 100 tiene un factor primo menor que 10. Los que quedan sin tachar son los 25 primos menores que 100.",
        ],
        formula: "2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59, 61, 67, 71, 73, 79, 83, 89, 97",
      },
      {
        title: "Descomponer en factores primos",
        paragraphs: [
          "Se divide entre el menor primo que se pueda, se repite con el cociente y se sigue hasta llegar a 1. Los primos usados, multiplicados, dan el número.",
          "El resultado es siempre el mismo, aunque se empiece por otro primo: 60 = 2 × 2 × 3 × 5 = 2² × 3 × 5. Con potencias se escribe más corto.",
        ],
        formula: "60 | 2 → 30 | 2 → 15 | 3 → 5 | 5 → 1;  60 = 2² × 3 × 5",
      },
    ],
    examples: [
      ex(
        "¿Es 91 un número primo?",
        [
          ["91 no es divisible entre 2, 3 ni 5", "91 es impar, sus cifras suman 10 (no es múltiplo de 3) y no termina en 0 ni en 5."],
          ["91 = 7 × 13", "Probamos con 7 y la división es exacta: encontramos un divisor distinto de 1 y de 91."],
          ["91 es compuesto", "Tiene cuatro divisores: 1, 7, 13 y 91. Parecía primo porque no tiene divisores pequeños evidentes."],
        ],
        "Para decidir si un número es primo se prueba con los primos 2, 3, 5, 7… hasta que el cuadrado del primo supere al número. Para 91 basta con llegar al 7, porque 11 × 11 = 121.",
      ),
      ex(
        "Descompón 180 en factores primos.",
        [
          ["180 ÷ 2 = 90;  90 ÷ 2 = 45", "Empezamos por el menor primo: 180 y 90 son pares."],
          ["45 ÷ 3 = 15;  15 ÷ 3 = 5", "45 ya es impar; sus cifras suman 9, así que es divisible entre 3. Lo mismo pasa con 15."],
          ["5 ÷ 5 = 1 → 180 = 2² × 3² × 5", "Al llegar a 1 terminamos. Comprobación → 4 × 9 × 5 = 180."],
        ],
        "180 = 2 × 2 × 3 × 3 × 5. Cada número compuesto tiene una única descomposición en primos, sin importar el orden en que se divida.",
      ),
    ],
    diagnostic: [
      c("d-1", "¿Cuál de estos números es divisor de 21?", ["2", "7", "4"], 1, "21 ÷ 7 = 3 sin resto; 21 ÷ 2 y 21 ÷ 4 dejan resto."),
      n("d-2", "¿Cuántos divisores tiene 12?", 6, ["12 = 1 × 12 = 2 × 6 = 3 × 4.", "Los divisores son 1, 2, 3, 4, 6 y 12: en total 6."], ["Busca las parejas que multiplicadas dan 12.", "1 × 12, 2 × 6 y 3 × 4.", "Cada pareja da dos divisores."]),
      n("d-3", "¿Cuánto es 2 × 2 × 3 × 5?", 60, ["2 × 2 = 4 y 4 × 3 = 12.", "12 × 5 = 60."], ["Multiplica de izquierda a derecha.", "2 × 2 = 4.", "4 × 3 × 5 = 60."]),
    ],
    practiceCorrection: errorFollowup("En la descomposición prima de 60, ¿cuántos factores 2 aparecen?", 2, "Descomponemos 60 como 2 × 30 y después 30 como 2 × 15.", "Como 15 = 3 × 5, queda 60 = 2 × 2 × 3 × 5: aparecen dos factores 2."),
    questions(v) {
      const [p, comp, f] = [[13, 21, 3], [17, 27, 3], [19, 33, 3], [23, 35, 5], [29, 39, 3], [31, 49, 7]][v];
      const even = [34, 46, 58, 62, 74, 94][v];
      const concept = [
        c(
          "q0",
          `¿Por qué ${p} es primo y ${comp} no lo es?`,
          [
            [`Porque ${p} es impar`, `${comp} también es impar y no es primo: ${comp} = ${f} × ${comp / f}.`],
            `Porque ${p} solo se divide entre 1 y ${p}, y ${comp} también se divide entre ${f}`,
            [`Porque ${p} es menor que ${comp}`, "El tamaño no decide: 97 es primo y 4 no lo es."],
          ],
          1,
          `Un primo tiene exactamente dos divisores. ${comp} = ${f} × ${comp / f} tiene más, así que es compuesto.`,
        ),
        c(
          "q0",
          `Alguien dice que el 1 es primo, igual que el ${p}, porque también «se divide entre 1 y entre sí mismo». ¿Qué es correcto?`,
          [
            [`El 1 es primo, igual que el ${p}`, `El 1 tiene un único divisor; el ${p} tiene exactamente dos (1 y ${p}).`],
            ["El 1 es compuesto", "Un compuesto tiene más de dos divisores, y el 1 tiene uno solo."],
            "El 1 no es primo: un primo tiene exactamente dos divisores distintos, y el 1 tiene solo uno",
          ],
          2,
          "Por eso el 1 no es primo ni compuesto. Además, si el 1 fuera primo, la descomposición en primos dejaría de ser única.",
        ),
        c(
          "q0",
          `${even} es par y mayor que 2. ¿Puede ser primo?`,
          [
            `No: ${even} = 2 × ${even / 2}, así que tiene el divisor 2 además de 1 y ${even}`,
            ["Sí, si es suficientemente grande", "El tamaño no importa: todo número par es múltiplo de 2."],
            ["Depende de la suma de sus cifras", "La suma de las cifras decide la divisibilidad entre 3, no entre 2."],
          ],
          0,
          `Todo par mayor que 2 tiene al menos tres divisores (1, 2 y él mismo). ${even} es compuesto.`,
        ),
      ][v % 3];

      const N = [84, 130, 66, 150, 102, 152][v];
      const pf = primeFactors(N);
      const M = [48, 40, 96, 72, 80, 112][v];
      const e2 = primeFactors(M).filter((x) => x === 2).length;
      const halvings = Array.from({ length: e2 + 1 }, (_, i) => M / 2 ** i);
      const [ra, rb] = [[10, 20], [20, 30], [30, 40], [40, 50], [50, 60], [60, 70]][v];
      const primesIn = Array.from({ length: rb - ra - 1 }, (_, i) => ra + 1 + i).filter(isPrime);
      const [wn, wa, wb] = [[24, 4, 6], [36, 4, 9], [30, 5, 6], [40, 4, 10], [45, 5, 9], [18, 2, 9]][v];
      const composite = [wa, wb].filter((x) => !isPrime(x));
      const sq = [13, 17, 23, 29, 31, 37][v];
      const R = [72, 120, 84, 90, 150, 108][v];
      const misread = (() => {
        const counts = new Map<number, number>();
        for (const x of primeFactors(R)) counts.set(x, (counts.get(x) ?? 0) + 1);
        return [...counts].reduce((acc, [base, e]) => acc * base * e, 1);
      })();
      return [
        concept,
        n(
          "q1",
          `Descompón ${N} en factores primos. ¿Cuál es el mayor factor primo?`,
          pf.at(-1)!,
          [
            `Dividimos entre primos de menor a mayor → ${N} = ${pf.join(" × ")}.`,
            `El último primo que aparece, ${pf.at(-1)}, es el mayor factor primo de ${N}.`,
          ],
          ["Divide entre el menor primo posible y repite con el cociente.", `${N} ÷ ${pf[0]} = ${N / pf[0]}.`, `${N} = ${pf.join(" × ")}.`],
          { errors: [{ value: N / 2, feedback: `${N / 2} divide a ${N}, pero no es primo: todavía se puede descomponer.` }] },
        ),
        n(
          "q2",
          `Para descomponer ${M}, primero se divide entre 2 todas las veces que se pueda. ¿Cuántas veces se divide entre 2?`,
          e2,
          [
            `Dividimos entre 2 mientras el resultado sea par → ${halvings.join(" → ")}.`,
            `Se dividió ${e2} veces hasta llegar a ${M / 2 ** e2}, que es impar, así que ${M} = 2${sup(e2)} × ${M / 2 ** e2}.`,
          ],
          ["Divide entre 2 y mira si el resultado sigue siendo par.", `${M} ÷ 2 = ${M / 2}.`, `Sigue hasta llegar a un número impar: ${M / 2 ** e2}.`],
          { step: true },
        ),
        n(
          "q3",
          `¿Cuántos números primos hay entre ${ra} y ${rb}?`,
          primesIn.length,
          [
            `Entre ${ra} y ${rb} se descartan los pares, los que terminan en 5 y los múltiplos de 3 y de 7.`,
            `Quedan ${list(primesIn)}, que no tienen más divisores que 1 y ellos mismos; en total ${primesIn.length}.`,
          ],
          ["Descarta los números pares y los que terminan en 5.", "De los que quedan, descarta los múltiplos de 3 y de 7.", `Los primos son ${list(primesIn)}.`],
        ),
        c(
          "q4",
          `Un compañero descompone ${wn} así → ${wn} = ${wa} × ${wb}. ¿Ya terminó?`,
          [
            [`Sí: ya es un producto de dos números`, `Una descomposición en primos solo tiene factores primos, y ${list(composite)} todavía se ${composite.length > 1 ? "pueden" : "puede"} dividir.`],
            `No: ${list(composite)} no ${composite.length > 1 ? "son primos" : "es primo"}; la descomposición es ${wn} = ${powerForm(wn)}`,
            [`Sí, porque ${wa} × ${wb} = ${wn}`, `El producto es correcto, pero ${list(composite)} no ${composite.length > 1 ? "son primos" : "es primo"}.`],
          ],
          1,
          `Hay que seguir hasta que todos los factores sean primos → ${wn} = ${primeFactors(wn).join(" × ")} = ${powerForm(wn)}.`,
        ),
        n(
          "q5",
          `Un rectángulo tiene un área de ${sq} cm² y sus lados miden un número entero de centímetros. Como ${sq} es primo, ¿cuál es el perímetro del rectángulo?`,
          2 * (sq + 1),
          [
            `Como ${sq} es primo, la única forma de escribirlo como producto de dos enteros es 1 × ${sq}.`,
            `Los lados miden 1 cm y ${sq} cm, así que el perímetro es 2 × (1 + ${sq}) = ${2 * (sq + 1)} cm.`,
          ],
          [`Busca dos enteros cuyo producto sea ${sq}.`, `Un primo solo se escribe como 1 × ${sq}.`, `Suma los cuatro lados: 1 + ${sq} + 1 + ${sq}.`],
          {
            intent: "transfer",
            unit: "cm",
            errors: [
              { value: sq + 1, feedback: "Sumaste cada lado una sola vez: el perímetro suma los cuatro lados." },
              { value: sq, feedback: "Ese es el área; el perímetro es la suma de los lados." },
            ],
          },
        ),
        n(
          "q6",
          `Un número se descompone en factores primos como ${powerForm(R)}. ¿Qué número es?`,
          R,
          [`Calculamos cada potencia y multiplicamos → ${powerForm(R)} = ${primeFactors(R).join(" × ")}.`, `El producto es ${R}.`],
          ["Una potencia indica cuántas veces se repite el factor.", `Escribe ${powerForm(R)} sin potencias.`, `Multiplica ${primeFactors(R).join(" × ")}.`],
          {
            intent: "transfer",
            errors: misread !== R ? [{ value: misread, feedback: "Multiplicaste cada base por su exponente; una potencia como 2³ es 2 × 2 × 2 = 8." }] : [],
          },
        ),
      ];
    },
    outcome: "Puedes decidir si un número es primo o compuesto, encontrar los primos menores que 100 con la criba y descomponer un número en factores primos.",
    commonErrors: [
      "Pensar que el 1 es primo.",
      "Creer que todos los impares son primos: 9, 15, 21 y 91 son compuestos.",
      "Dejar factores compuestos en la descomposición, como 24 = 4 × 6.",
      "Probar divisores sin orden y olvidar alguno: conviene ir de los primos más pequeños a los mayores.",
    ],
    application: n(
      "aplicacion",
      "La clave de un candado es un número entre 100 y 130 que es primo y cuyas cifras suman 5. ¿Cuál es la clave?",
      113,
      [
        "Entre 100 y 130, las cifras suman 5 en 104, 113 y 122.",
        "104 y 122 son pares. 113 no es divisible entre 2, 3, 5 ni 7, y 11 × 11 = 121 ya pasa de 113, así que 113 es primo.",
      ],
      ["Primero busca los números entre 100 y 130 cuyas cifras suman 5.", "Descarta los pares.", "Comprueba si el que queda es primo probando con 2, 3, 5 y 7."],
      { intent: "transfer" },
    ),
  }),

  defineLesson({
    id: "numeros-romanos",
    unitId: "numeros",
    title: "Números romanos",
    objective:
      "Leer y escribir números romanos hasta 3999 aplicando las reglas de suma y resta de sus símbolos, y compararlos con nuestro sistema posicional.",
    purpose:
      "Se usan en capítulos, siglos, relojes y nombres de reyes y papas. Además, compararlos con nuestro sistema muestra por qué la posición de una cifra es tan útil.",
    prerequisites: [],
    legacyModuleIds: [],
    visual: "roman",
    vocabulary: [
      { term: "Símbolos romanos", meaning: "I vale 1, V vale 5, X vale 10, L vale 50, C vale 100, D vale 500 y M vale 1000." },
      { term: "Sistema aditivo", meaning: "Cada símbolo tiene un valor fijo y el número se obtiene sumándolos (y a veces restándolos)." },
      { term: "Sistema posicional", meaning: "El valor de una cifra depende del lugar que ocupa: en 555 cada 5 vale distinto." },
    ],
    sections: [
      {
        title: "Siete símbolos",
        paragraphs: [
          "Los romanos usaban siete letras: I (1), V (5), X (10), L (50), C (100), D (500) y M (1000).",
          "Los símbolos se escriben de mayor a menor y se suman. I, X, C y M se pueden repetir hasta tres veces seguidas; V, L y D nunca se repiten.",
        ],
        formula: "MDCLXVI → 1000 + 500 + 100 + 50 + 10 + 5 + 1 = 1666",
      },
      {
        title: "Restar para no repetir cuatro veces",
        paragraphs: [
          "Un símbolo menor escrito a la izquierda de uno mayor se resta. Solo se usan seis restas: IV (4), IX (9), XL (40), XC (90), CD (400) y CM (900).",
          "Así, 4 se escribe IV y no IIII, y 90 es XC. No vale restar cualquier símbolo: 99 es XCIX (90 más 9), no IC.",
        ],
        formula: "XC → 100 − 10 = 90;  CM → 1000 − 100 = 900",
      },
      {
        title: "Escribir por órdenes",
        paragraphs: [
          "Para pasar un número a romanos se separan sus millares, centenas, decenas y unidades, y cada parte se escribe por separado.",
          "1984 = 1000 + 900 + 80 + 4, que en romanos es M, CM, LXXX e IV → MCMLXXXIV. Nuestro sistema escribe 1984 con solo cuatro cifras porque cada posición vale diez veces la siguiente.",
        ],
        formula: "2024 = 2000 + 20 + 4 → MM + XX + IV → MMXXIV",
      },
    ],
    examples: [
      ex(
        "Escribe 1492 en números romanos.",
        [
          ["1492 = 1000 + 400 + 90 + 2", "Separamos millares, centenas, decenas y unidades."],
          ["1000 → M;  400 → CD;  90 → XC;  2 → II", "400 y 90 usan una resta, porque escribir CCCC o LXXXX repetiría cuatro veces un símbolo."],
          ["MCDXCII", "Juntamos las partes en orden, de mayor a menor."],
        ],
        "1492 se escribe MCDXCII. Cada orden de unidades se escribe por separado y después se juntan.",
      ),
      ex(
        "¿Qué número es MMCDXLIX?",
        [
          ["MM | CD | XL | IX", "Separamos en grupos: cada símbolo menor a la izquierda de uno mayor forma una resta."],
          ["2000 + 400 + 40 + 9", "MM vale 2000; CD vale 500 − 100 = 400; XL vale 50 − 10 = 40; IX vale 10 − 1 = 9."],
          ["2449", "Sumamos los grupos."],
        ],
        "MMCDXLIX vale 2000 + 400 + 40 + 9 = 2449.",
      ),
    ],
    diagnostic: [
      n("d-1", "¿Cuánto es 1000 + 500 + 50 + 1?", 1551, ["1000 + 500 = 1500.", "1500 + 50 + 1 = 1551."], ["Suma de a poco.", "1000 + 500 = 1500.", "Agrega 50 y 1."]),
      n("d-2", "En el número 3725, ¿cuánto vale la cifra 7?", 700, ["El 7 está en la tercera posición desde la derecha, la de las centenas.", "7 centenas son 7 × 100 = 700."], ["Mira en qué posición está el 7.", "Está en las centenas.", "7 × 100 = 700."]),
      c("d-3", "¿Cuál es la descomposición de 846?", ["800 + 40 + 6", "8 + 4 + 6", "80 + 40 + 6"], 0, "846 = 800 + 40 + 6."),
    ],
    practiceCorrection: errorFollowup("¿Qué número representa XLIV?", 44, "XL representa 40 porque X antes de L resta diez a cincuenta.", "IV representa 4 porque I antes de V resta una unidad: XLIV representa 40 + 4 = 44."),
    questions(v) {
      const repeat = v === 0 ? 40 : 400;
      const [pairA, pairB, pairText] = v === 1 ? ["XI", "IX", "XI = 10 + 1 y IX = 10 − 1: la I se suma o se resta según su lugar."] : ["LX", "XL", "LX = 50 + 10 y XL = 50 − 10: la X se suma o se resta según su lugar."];
      const long = v === 2 ? 388 : 3888;
      const concept = [
        c(
          "q0",
          `¿Por qué ${repeat} se escribe ${toRoman(repeat)} y no con un mismo símbolo repetido cuatro veces?`,
          [
            "Porque un símbolo no se repite más de tres veces seguidas: se usa una resta",
            ["Porque así ocupa menos espacio, pero las dos formas son correctas", "En la escritura romana actual no se repite un símbolo cuatro veces: la forma correcta es la resta."],
            ["Porque el símbolo de la izquierda se suma", "Un símbolo menor a la izquierda de uno mayor se resta, no se suma."],
          ],
          0,
          `${toRoman(repeat)} es una resta del símbolo mayor menos el menor, para no repetir cuatro veces el mismo.`,
        ),
        c(
          "q0",
          `En ${pairA} y ${pairB}, ¿por qué el mismo símbolo vale distinto?`,
          [
            ["No vale distinto: son el mismo número", `${pairA} vale ${naiveRoman(pairA)} y ${pairB} vale ${2 * SYMBOL[pairB[1]] - naiveRoman(pairB)}.`],
            "Porque a la derecha de un símbolo mayor se suma y a la izquierda se resta",
            ["Porque un símbolo solo vale algo cuando va al final", "Cada símbolo tiene su valor; lo que cambia es si se suma o se resta según su lugar."],
          ],
          1,
          pairText,
        ),
        c(
          "q0",
          `¿Por qué ${long} en romanos (${toRoman(long)}) necesita muchos más símbolos que cifras en nuestro sistema?`,
          [
            ["Porque cada símbolo romano vale menos que una cifra", "El valor no es el problema: M vale 1000. Lo que falta es que la posición multiplique el valor."],
            ["Porque en romanos se escribe de derecha a izquierda", "Se escribe de mayor a menor, de izquierda a derecha, como el nuestro."],
            "Porque el sistema romano es aditivo: cada símbolo tiene un valor fijo y hay que sumar muchos",
          ],
          2,
          "En nuestro sistema la posición multiplica el valor de cada cifra por 10, 100 o 1000; en el romano hay que repetir símbolos y sumarlos.",
        ),
      ][v % 3];

      const r1 = [74, 1944, 449, 2019, 3402, 891][v];
      const g1 = romanGroups(r1);
      const naive = naiveRoman(toRoman(r1));
      const [pairWord, pairIn] = [["CM", 1990], ["XC", 94], ["CD", 420], ["XL", 2045], ["IX", 799], ["CD", 1460]][v] as [string, number];
      const pairBig = SYMBOL[pairWord[1]],
        pairSmall = SYMBOL[pairWord[0]];
      const r3 = [39, 1776, 2499, 944, 3999, 1515][v];
      const g3 = romanGroups(r3);
      const naive3 = naiveRoman(toRoman(r3));
      const [wrongNum, wrongText, diagnosis] = [
        [99, "IC", "Restó un símbolo que no se puede restar: 99 es 90 más 9, XCIX"],
        [45, "VL", "La V nunca se resta: 45 es 40 más 5, XLV"],
        [1900, "MDCCCC", "Repitió C cuatro veces: 1900 es 1000 más 900, MCM"],
        [490, "XD", "Solo se restan las seis parejas permitidas: 490 es 400 más 90, CDXC"],
        [8, "IIX", "No se restan dos símbolos a la vez: 8 es 5 más 3, VIII"],
        [2400, "MMCCCC", "Repitió C cuatro veces: 2400 es 2000 más 400, MMCD"],
      ][v] as [number, string, string];
      const [y1, y2] = [[1776, 1914], [1549, 1821], [1969, 2024], [1895, 1945], [1492, 1615], [1854, 1973]][v];
      const triple = [
        [90, 88, 79],
        [400, 388, 390],
        [1900, 1880, 1890],
        [49, 38, 44],
        [900, 888, 890],
        [99, 89, 94],
      ][v];
      const best = Math.max(...triple);
      const bestIndex = triple.indexOf(best);
      return [
        concept,
        n(
          "q1",
          `¿Qué número es ${toRoman(r1)}?`,
          r1,
          [
            `Separamos en grupos de símbolos → ${g1.map((g) => g.text).join(" | ")}.`,
            `Los grupos valen ${g1.map((g) => g.value).join(" + ")}, y la suma es ${r1}.`,
          ],
          ["Busca los símbolos menores escritos antes de uno mayor: se restan.", `Los grupos son ${list(g1.map((g) => g.text))}.`, `Suma ${g1.map((g) => g.value).join(" + ")}.`],
          { errors: naive !== r1 ? [{ value: naive, feedback: "Sumaste todos los símbolos: el que va a la izquierda de uno mayor se resta." }] : [] },
        ),
        n(
          "q2",
          `En ${toRoman(pairIn)}, ¿cuánto vale el grupo ${pairWord}?`,
          pairBig - pairSmall,
          [
            `En ${pairWord}, la ${pairWord[0]} va a la izquierda de la ${pairWord[1]}, que es mayor, así que se resta.`,
            `${pairWord} vale ${pairBig} − ${pairSmall} = ${pairBig - pairSmall}.`,
          ],
          ["Fíjate si el primer símbolo es menor que el segundo.", `${pairWord[0]} vale ${pairSmall} y ${pairWord[1]} vale ${pairBig}.`, `Resta ${pairBig} − ${pairSmall}.`],
          { step: true, errors: [{ value: pairBig + pairSmall, feedback: "Sumaste los dos símbolos: el menor a la izquierda se resta." }] },
        ),
        n(
          "q3",
          `¿Qué número es ${toRoman(r3)}?`,
          r3,
          [
            `Separamos en grupos de símbolos → ${g3.map((g) => g.text).join(" | ")}.`,
            `Los grupos valen ${g3.map((g) => g.value).join(" + ")}, y la suma es ${r3}.`,
          ],
          ["Lee de izquierda a derecha y busca las restas.", `Los grupos son ${list(g3.map((g) => g.text))}.`, `Suma ${g3.map((g) => g.value).join(" + ")}.`],
          { errors: naive3 !== r3 ? [{ value: naive3, feedback: "Sumaste todos los símbolos: el que va a la izquierda de uno mayor se resta." }] : [] },
        ),
        c(
          "q4",
          `Alguien escribe ${wrongNum} como ${wrongText}. ¿Qué error cometió?`,
          [
            ["Ninguno: también es una forma correcta", `En la escritura romana esa forma no es válida; ${wrongNum} se escribe ${toRoman(wrongNum)}.`],
            ["Debió escribir los símbolos de menor a mayor", "Los símbolos van de mayor a menor; el problema es otro."],
            diagnosis,
          ],
          2,
          `${wrongNum} se escribe ${toRoman(wrongNum)}: cada orden de unidades por separado y solo con las restas permitidas.`,
        ),
        n(
          "q5",
          `Un libro antiguo se imprimió en el año ${toRoman(y1)} y se reeditó en ${toRoman(y2)}. ¿Cuántos años pasaron entre las dos ediciones?`,
          y2 - y1,
          [`${toRoman(y1)} es ${y1} y ${toRoman(y2)} es ${y2}.`, `Pasaron ${y2} − ${y1} = ${y2 - y1} años.`],
          ["Primero pasa los dos años a nuestro sistema.", `${toRoman(y1)} es ${y1}.`, `${toRoman(y2)} es ${y2}; resta.`],
          { intent: "transfer", unit: "años" },
        ),
        c(
          "q6",
          `¿Cuál de estos números romanos es el mayor: ${list(triple.map(toRoman))}?`,
          triple.map((x, i): ChoiceLabel =>
            i === bestIndex ? toRoman(x) : [toRoman(x), `${toRoman(x)} vale ${x}: tiene más símbolos, pero es menor que ${toRoman(best)}, que vale ${best}.`],
          ),
          bestIndex,
          `En nuestro sistema → ${triple.map((x) => `${toRoman(x)} vale ${x}`).join("; ")}. Más símbolos no significa un número mayor.`,
          "transfer",
        ),
      ];
    },
    outcome: "Puedes leer y escribir números romanos hasta 3999 y explicar por qué nuestro sistema posicional necesita menos cifras.",
    commonErrors: [
      "Repetir un símbolo cuatro veces (IIII, XXXX) en lugar de usar la resta.",
      "Restar parejas no permitidas, como IC para 99 o VL para 45.",
      "Sumar todos los símbolos sin restar el menor que va antes de uno mayor.",
      "Pensar que un número romano con más símbolos siempre es mayor.",
    ],
    application: n(
      "aplicacion",
      "En una placa se lee que un puente se construyó en MDCCCLXX y se restauró CXXV años después. ¿En qué año se restauró?",
      1995,
      ["MDCCCLXX vale 1000 + 500 + 300 + 50 + 20 = 1870 y CXXV vale 100 + 20 + 5 = 125.", "Se restauró en 1870 + 125 = 1995."],
      ["Pasa los dos números romanos a nuestro sistema.", "MDCCCLXX es 1870.", "Suma 1870 + 125."],
      { intent: "transfer" },
    ),
  }),
];

// ── Racionales, irracionales y radicales ──────────────────────────────
const isSquare = (x: number) => Number.isInteger(Math.sqrt(x));
/** Mayor cuadrado perfecto (> 1) que divide a x; 1 si no hay. */
function largestSquare(x: number): number {
  let best = 1;
  for (let r = 2; r * r <= x; r++) if (x % (r * r) === 0) best = r * r;
  return best;
}

export const REAL_NUMBER_LESSONS: Lesson[] = [
  defineLesson({
    id: "numeros-reales",
    unitId: "numeros",
    title: "Números racionales e irracionales",
    objective:
      "Clasificar números en naturales, enteros, racionales e irracionales, escribir decimales periódicos como fracción y ubicar raíces no exactas entre dos enteros.",
    purpose:
      "Al medir la diagonal de un cuadrado o la longitud de una circunferencia aparecen números que ninguna fracción escribe exactamente. Saber qué tipo de número tienes indica cómo escribirlo y cuánto conviene redondearlo.",
    prerequisites: ["potencias-raices", "fraccion-decimal-porcentaje"],
    legacyModuleIds: [],
    visual: "square-root",
    vocabulary: [
      { term: "Número racional", meaning: "El que se puede escribir como fracción a/b de enteros, con b distinto de 0: 3, −2, 0,75 o 0,333…" },
      { term: "Decimal periódico", meaning: "Decimal con un grupo de cifras que se repite sin fin, como 0,272727…" },
      { term: "Número irracional", meaning: "Número cuyo decimal es infinito y no periódico: no es ninguna fracción. Por ejemplo, √2 y π." },
      { term: "Números reales", meaning: "Los racionales y los irracionales juntos: todos los puntos de la recta numérica." },
    ],
    sections: [
      {
        title: "Cada conjunto contiene al anterior",
        paragraphs: [
          "Los naturales (0, 1, 2, 3…) están dentro de los enteros, que añaden los negativos. Los enteros están dentro de los racionales, porque 5 = 5/1.",
          "Un número racional es un cociente de enteros a/b con b distinto de 0. Su decimal es exacto, como 3/4 = 0,75, o periódico, como el de 1/3, que da 0,333…",
        ],
        formula: "ℕ ⊂ ℤ ⊂ ℚ ⊂ ℝ",
      },
      {
        title: "Del decimal periódico a la fracción",
        paragraphs: [
          "Si el periodo empieza justo después de la coma, la fracción lleva el periodo en el numerador y, en el denominador, tantos nueves como cifras tenga el periodo.",
          "0,777… se escribe 7/9 y 0,363636… se escribe 36/99, que simplificada es 4/11. Se comprueba dividiendo: 4 ÷ 11 da 0,3636…",
        ],
        formula: "0,777… → 7/9;  0,363636… → 36/99 → 4/11",
      },
      {
        title: "Irracionales: decimales sin periodo",
        paragraphs: [
          "√2, √3, √5 y π no se pueden escribir como fracción: su decimal no termina ni se repite. Una calculadora solo muestra aproximaciones, como √2 ≈ 1,414.",
          "Para ubicar una raíz no exacta se busca entre qué cuadrados perfectos está el número: 6² = 36 y 7² = 49, y como 40 está entre 36 y 49, √40 está entre 6 y 7. La raíz de un natural que no es cuadrado perfecto es irracional.",
        ],
        formula: "√2 ≈ 1,414…;  π ≈ 3,1416…;  6 < √40 < 7",
      },
    ],
    examples: [
      ex(
        "Escribe 0,454545… como fracción irreducible.",
        [
          ["periodo → 45 (dos cifras)", "Las cifras 45 se repiten sin fin, justo después de la coma."],
          ["0,4545… → 45/99", "En el numerador va el periodo; en el denominador, un 9 por cada cifra del periodo."],
          ["45/99 = 5/11", "Simplificamos dividiendo entre 9, el MCD de 45 y 99. Comprobación → 5 ÷ 11 da 0,4545…"],
        ],
        "0,4545… es la fracción 5/11: un decimal periódico es un número racional.",
      ),
      ex(
        "¿Entre qué dos enteros consecutivos está √70? ¿Es racional?",
        [
          ["8² = 64 y 9² = 81", "Buscamos los cuadrados perfectos más cercanos a 70, uno por debajo y otro por encima."],
          ["64 < 70 < 81 → 8 < √70 < 9", "La raíz conserva el orden: si el número está entre 64 y 81, su raíz está entre 8 y 9."],
          ["√70 ≈ 8,37 es irracional", "70 no es un cuadrado perfecto, así que su raíz no es entera ni ninguna fracción: su decimal no termina ni se repite."],
        ],
        "√70 está entre 8 y 9, más cerca de 8, porque 70 está más cerca de 64 que de 81.",
      ),
    ],
    diagnostic: [
      n("d-1", "Escribe 3/4 como número decimal.", 0.75, ["Una fracción es una división: 3/4 es 3 ÷ 4.", "Al dividir, 3 ÷ 4 = 0,75."], ["Una fracción es una división.", "Divide 3 entre 4.", "Da 0,75."]),
      n("d-2", "¿Cuánto es √81?", 9, ["Buscamos el número que multiplicado por sí mismo da 81.", "9 × 9 = 81, así que √81 es 9."], ["Piensa en los cuadrados perfectos.", "¿Qué número por sí mismo da 81?", "9 × 9 = 81."]),
      c("d-3", "¿Cuál de estos números es entero?", ["−7", "2,5", "1/2"], 0, "−7 es un entero negativo; 2,5 y 1/2 no son enteros."),
    ],
    practiceCorrection: errorFollowup("Escribe 0,375 como fracción. Introduce una fracción equivalente.", 0.375, "El decimal exacto 0,375 equivale a 375/1000 porque tiene tres cifras decimales.", "Al dividir numerador y denominador entre 125 obtenemos 3/8; por eso es racional."),
    questions(v) {
      const [pn, pd, pDec] = v === 3 ? [5, 11, "0,4545…"] : [2, 3, "0,666…"];
      const [ns, ms] = v === 1 ? [12, 16] : [50, 49];
      const endless = v === 2 ? "0,1010010001…" : "3,1211211121112…";
      const concept = [
        c(
          "q0",
          `¿Por qué ${pn}/${pd} es un número racional, aunque su decimal (${pDec}) no termine?`,
          [
            ["No es racional: los racionales tienen decimal exacto", `Los racionales tienen decimal exacto o periódico, y ${pDec} es periódico.`],
            "Porque se puede escribir como cociente de dos enteros, y eso es lo que define a un racional",
            ["Porque es menor que 1", "Ser menor que 1 no decide nada: la mitad de √2 también lo es y es irracional."],
          ],
          1,
          `Todo cociente de enteros con denominador distinto de 0 es racional; su decimal es exacto o, como ${pDec}, periódico.`,
        ),
        c(
          "q0",
          `¿Por qué √${ns} es irracional y √${ms} no?`,
          [
            `Porque ${ms} es un cuadrado perfecto (${Math.sqrt(ms)}² = ${ms}) y ${ns} no lo es`,
            [`Porque ${ns} ${ns < ms ? "es menor" : "es mayor"} que ${ms}`, "El tamaño no importa: √100 es 10, racional, y √2 no lo es."],
            [`√${ns} sí es racional: es ${dec(Math.round(Math.sqrt(ns) * 100) / 100)}`, `Ese decimal es una aproximación: el de √${ns} no termina ni se repite.`],
          ],
          0,
          `√${ms} es ${Math.sqrt(ms)}; ${ns} está entre ${Math.floor(Math.sqrt(ns))}² y ${Math.ceil(Math.sqrt(ns))}², así que √${ns} no es entera ni fraccionaria.`,
        ),
        c(
          "q0",
          `El número ${endless} tiene infinitas cifras decimales que no forman ningún periodo. ¿Qué tipo de número es?`,
          [
            ["Racional, porque tiene decimales", "Un racional tiene decimal exacto o periódico; este no se repite nunca."],
            "Irracional",
            [`Entero, porque empieza en ${endless.split(",")[0]}`, "Tiene parte decimal, así que no es entero."],
          ],
          1,
          "Un decimal infinito y sin periodo no se puede escribir como fracción: es irracional.",
        ),
      ][v % 3];

      const [period, perLen] = [["7", 1], ["45", 2], ["18", 2], ["3", 1], ["81", 2], ["27", 2]][v] as [string, number];
      const nines = 10 ** perLen - 1;
      const per = Number(period);
      const g = gcd(per, nines);
      const repeated = perLen === 1 ? `0,${period.repeat(3)}…` : `0,${period.repeat(2)}…`;
      const root = [20, 45, 90, 30, 60, 110][v];
      const fl = Math.floor(Math.sqrt(root));
      const items = [
        ["√16", "√7", "0,5", "π", "−3"],
        ["√2", "√25", "3/8", "√10", "0,121212…"],
        ["√36", "√3", "√11", "2π", "1,5"],
        ["√49", "0,333…", "√8", "−5/2", "7"],
        ["√1", "√6", "π/2", "√15", "4,25"],
        ["√64", "√20", "1/7", "0,75", "√99"],
      ][v];
      const irrational = items.filter((t) => t.includes("π") || (t.startsWith("√") && !isSquare(Number(t.slice(1)))));
      const rational = items.filter((t) => !irrational.includes(t));
      const roots = items.filter((t) => t.startsWith("√")).length;
      const exact = ["3,14", "0,125", "2,71828", "1,41", "0,0625", "9,8696"][v];
      const [eInt, eFrac = ""] = exact.split(",");
      const eNum = Number(eInt + eFrac),
        eDen = 10 ** eFrac.length;
      const area = [40, 60, 90, 72, 42, 110][v];
      const side = Math.sqrt(area);
      const near = Math.round(side);
      const other = near === Math.floor(side) ? near + 1 : near - 1;
      const k = [3, 4, 5, 6, 7, 8][v];
      const inside = k * k + k,
        above = (k + 1) * (k + 1) + 1,
        below = k * k - 1;
      return [
        concept,
        n(
          "q1",
          `Escribe ${repeated} como fracción irreducible.`,
          per / nines,
          [
            `El periodo es ${period}, de ${perLen} ${perLen === 1 ? "cifra" : "cifras"}, así que la fracción es ${period}/${nines}.`,
            g > 1 ? `Simplificamos dividiendo entre ${g} → ${frac(per, nines)}.` : `${period}/${nines} ya es irreducible, porque ${period} y ${nines} no tienen divisores comunes.`,
          ],
          ["El periodo empieza justo después de la coma.", "En el denominador va un 9 por cada cifra del periodo.", `${period}/${nines}; ahora simplifica.`],
          { errors: [{ value: per / 10 ** perLen, feedback: `Esa fracción vale ${dec(per / 10 ** perLen)} exacto, sin repetirse: para un periodo el denominador lleva nueves.` }] },
        ),
        n(
          "q2",
          `Para ubicar √${root}, ¿cuál es el mayor entero cuyo cuadrado no pasa de ${root}?`,
          fl,
          [`${fl}² = ${fl * fl} no pasa de ${root}, pero ${fl + 1}² = ${(fl + 1) ** 2} sí pasa.`, `Por eso ${fl} < √${root} < ${fl + 1}, y el entero buscado es ${fl}.`],
          ["Prueba con los cuadrados perfectos: 1, 4, 9, 16, 25…", `Busca el último cuadrado que no pasa de ${root}.`, `${fl}² = ${fl * fl}.`],
          { step: true, errors: [{ value: fl + 1, feedback: `${fl + 1}² = ${(fl + 1) ** 2} ya pasa de ${root}.` }] },
        ),
        n(
          "q3",
          `¿Cuántos de estos números son irracionales? ${items.join(";  ")}`,
          irrational.length,
          [
            `Son racionales ${list(rational)}: enteros, fracciones o decimales exactos o periódicos${items.some((t) => t.startsWith("√") && isSquare(Number(t.slice(1)))) ? `, y las raíces exactas como ${items.find((t) => t.startsWith("√") && isSquare(Number(t.slice(1))))}` : ""}.`,
            `Son irracionales ${list(irrational)}, porque su decimal no termina ni se repite; en total ${irrational.length}.`,
          ],
          ["Una raíz de un cuadrado perfecto es un número entero.", "π y sus múltiplos o mitades son irracionales.", `Las raíces no exactas son irracionales.`],
          { errors: roots !== irrational.length ? [{ value: roots, feedback: "Contaste todas las raíces: la raíz de un cuadrado perfecto es un número entero." }] : [] },
        ),
        c(
          "q4",
          `Alguien dice que ${exact} es irracional porque tiene muchas cifras decimales. ¿Tiene razón?`,
          [
            ["Sí: muchas cifras decimales indican un irracional", "Lo que importa es si el decimal termina o se repite; este termina."],
            `No: es un decimal exacto, igual a la fracción ${frac(eNum, eDen)}`,
            ["Solo sería racional si fuera entero", "Las fracciones también son racionales, como 1/2, que vale 0,5."],
          ],
          1,
          `${exact} = ${frac(eNum, eDen)}: un decimal que termina siempre es una fracción, aunque tenga muchas cifras.`,
        ),
        n(
          "q5",
          `Un cuadrado tiene un área de ${area} m². ¿Cuál es el número entero de metros más cercano a la longitud de su lado?`,
          near,
          [
            `El lado mide √${area} m; como ${Math.floor(side)}² = ${Math.floor(side) ** 2} y ${Math.ceil(side)}² = ${Math.ceil(side) ** 2}, está entre ${Math.floor(side)} y ${Math.ceil(side)}.`,
            `√${area} ≈ ${dec(Math.round(side * 100) / 100)}, que está más cerca de ${near}.`,
          ],
          ["El lado de un cuadrado es la raíz cuadrada de su área.", `Busca entre qué cuadrados perfectos está ${area}.`, `√${area} ≈ ${dec(Math.round(side * 100) / 100)}.`],
          { intent: "transfer", unit: "m", errors: [{ value: other, feedback: `Compara √${area} ≈ ${dec(Math.round(side * 100) / 100)} con los dos enteros: está más cerca del otro.` }] },
        ),
        c(
          "q6",
          `¿Cuál de estos números está entre ${k} y ${k + 1}?`,
          [
            [`√${above}`, `√${above} es mayor que ${k + 1}, porque ${k + 1}² = ${(k + 1) ** 2} y ${above} es mayor.`],
            `√${inside}`,
            [`√${below}`, `√${below} es menor que ${k}, porque ${k}² = ${k * k} y ${below} es menor.`],
          ],
          1,
          `${k}² = ${k * k} y ${k + 1}² = ${(k + 1) ** 2}; ${inside} está entre esos cuadrados, así que √${inside} está entre ${k} y ${k + 1}.`,
          "transfer",
        ),
      ];
    },
    outcome: "Puedes clasificar un número como racional o irracional, pasar un decimal periódico a fracción y ubicar una raíz no exacta entre dos enteros.",
    commonErrors: [
      "Pensar que todo número con raíz es irracional, aunque √49 sea el natural 7.",
      "Creer que un decimal periódico no es racional.",
      "Confundir una aproximación, como √2 ≈ 1,41, con el valor exacto.",
      "Escribir un periódico como si fuera exacto: 0,454545… no es 45/100.",
    ],
    application: n(
      "aplicacion",
      "La diagonal de una baldosa cuadrada de 1 m de lado mide √2 m. Un carpintero tiene varillas de 1,4 m, 1,42 m y 1,5 m. Si la varilla debe ser al menos tan larga como la diagonal y sobrar lo menos posible, ¿cuántos centímetros mide la que elige?",
      142,
      ["1,4² = 1,96, que es menor que 2, así que 1,4 m es menor que √2 m y no alcanza.", "1,42² = 2,0164, que ya pasa de 2, así que 1,42 m supera la diagonal y sobra menos que con 1,5 m. Elige la de 142 cm."],
      ["Compara el cuadrado de cada medida con 2.", "1,4² = 1,96.", "1,42² = 2,0164."],
      { intent: "transfer", unit: "cm" },
    ),
  }),

  defineLesson({
    id: "radicales",
    unitId: "numeros",
    title: "Simplificar y operar con raíces",
    objective:
      "Simplificar raíces cuadradas sacando factores que son cuadrados perfectos, multiplicar y dividir raíces y sumar radicales semejantes.",
    purpose:
      "Las medidas que salen del teorema de Pitágoras o de un área suelen ser raíces como √50. Simplificarlas a 5√2 permite compararlas, sumarlas y estimarlas sin calculadora.",
    prerequisites: ["numeros-primos", "numeros-reales"],
    legacyModuleIds: [],
    visual: "square-root",
    vocabulary: [
      { term: "Radicando", meaning: "Número que está dentro de la raíz: en √50 es 50." },
      { term: "Coeficiente", meaning: "Número que multiplica a una raíz: en 5√2 es 5." },
      { term: "Radicales semejantes", meaning: "Raíces con el mismo radicando después de simplificar, como 3√2 y 5√2." },
    ],
    sections: [
      {
        title: "La raíz de un producto",
        paragraphs: [
          "La raíz de un producto es el producto de las raíces, para números positivos. Así, √36 = √4 × √9, y por eso √36 es 2 × 3 = 6.",
          "Esto permite simplificar: se busca en el radicando el mayor cuadrado perfecto que lo divide y se saca su raíz.",
        ],
        formula: "√(a × b) = √a × √b",
      },
      {
        title: "Sacar factores de la raíz",
        paragraphs: [
          "√72 = √(36 × 2) = 6√2, porque 36 es el mayor cuadrado perfecto que divide a 72.",
          "Con la descomposición en primos se ve qué sale: 72 = 2³ × 3². Cada pareja de factores iguales sale de la raíz como uno solo (2 y 3, que dan 6), y queda dentro el 2 sin pareja.",
        ],
        formula: "√72 = √(36 × 2) = 6√2",
      },
      {
        title: "Operar con radicales",
        paragraphs: [
          "Para multiplicar o dividir, se multiplican o dividen los radicandos: √8 × √2 es √16, que vale 4, y √50 ÷ √2 es √25, que vale 5.",
          "Solo se suman radicales semejantes, igual que términos semejantes: 3√2 más 5√2 es 8√2. En cambio, √2 + √3 no es √5: se deja indicado.",
        ],
        formula: "a√c + b√c = (a + b)√c",
      },
    ],
    examples: [
      ex(
        "Simplifica √180.",
        [
          ["180 = 2² × 3² × 5", "Descomponemos en primos para ver las parejas de factores iguales."],
          ["√180 = √(36 × 5)", "2² × 3² = 36 es un cuadrado perfecto; el 5 queda sin pareja."],
          ["√180 = 6√5", "√36 es 6, que sale de la raíz y multiplica a √5. Comprobación → 6² × 5 = 36 × 5 = 180."],
        ],
        "√180 = 6√5. Cuando el radicando que queda no tiene ningún cuadrado perfecto mayor que 1, la raíz está simplificada.",
      ),
      ex(
        "Calcula √12 + √75.",
        [
          ["√12 = √(4 × 3) = 2√3", "12 contiene el cuadrado perfecto 4."],
          ["√75 = √(25 × 3) = 5√3", "75 contiene el cuadrado perfecto 25. Ahora los dos radicales tienen el mismo radicando, 3."],
          ["2√3 + 5√3 = 7√3", "Son semejantes: se suman los coeficientes, como 2x + 5x = 7x."],
        ],
        "√12 + √75 = 7√3. Sin simplificar parecían imposibles de sumar.",
      ),
    ],
    diagnostic: [
      n("d-1", "¿Cuánto es √49?", 7, ["Buscamos el número que multiplicado por sí mismo da 49.", "7 × 7 = 49, así que √49 es 7."], ["Piensa en la tabla del 7.", "¿Qué número por sí mismo da 49?", "7 × 7 = 49."]),
      n("d-2", "Completa 72 = 8 × __", 9, ["72 ÷ 8 = 9.", "Comprobación → 8 × 9 = 72."], ["Divide 72 entre 8.", "Piensa en la tabla del 8.", "8 × 9 = 72."]),
      c("d-3", "¿Cuál de estos números es un cuadrado perfecto?", ["50", "64", "72"], 1, "64 = 8 × 8; 50 y 72 no son el cuadrado de ningún entero."),
    ],
    practiceCorrection: errorFollowup("Si √45 = a√5, ¿cuánto vale a?", 3, "Descomponemos 45 como 9 × 5, donde 9 tiene raíz cuadrada exacta.", "Entonces √45 = √9 × √5 = 3√5, de modo que a vale 3."),
    questions(v) {
      const [ca, cb] = v === 0 ? [5, 2] : [3, 5];
      const [s1, s2] = v === 1 ? [9, 16] : [36, 64];
      const [ka, kb, kk] = v === 2 ? [3, 2, 2] : [2, 3, 3];
      const concept = [
        c(
          "q0",
          `¿Por qué √${ca * ca * cb} = ${ca}√${cb}?`,
          [
            `Porque ${ca * ca * cb} = ${ca * ca} × ${cb} y la raíz de ${ca * ca} es ${ca}`,
            [`Porque se divide ${ca * ca * cb} entre ${ca}`, `${ca * ca * cb} ÷ ${ca} = ${ca * cb}: así no se saca un factor de la raíz.`],
            ["Porque la raíz se reparte en las sumas", "La raíz se reparte en productos, no en sumas: la raíz de 9 + 16 es 5, no 3 + 4."],
          ],
          0,
          `√${ca * ca * cb} = √${ca * ca} × √${cb}, y √${ca * ca} es ${ca}.`,
        ),
        c(
          "q0",
          `Alguien escribe √${s1} + √${s2} = √${s1 + s2}. ¿Es correcto?`,
          [
            ["Sí: la raíz de una suma es la suma de las raíces", "Esa propiedad vale para productos, no para sumas."],
            ["Sí, porque los dos lados tienen raíz", "Tener raíz no basta: hay que calcular cada lado."],
            `No: √${s1} + √${s2} da ${Math.sqrt(s1)} + ${Math.sqrt(s2)}, que es ${Math.sqrt(s1) + Math.sqrt(s2)}, pero √${s1 + s2} es ${Math.sqrt(s1 + s2)}`,
          ],
          2,
          `${Math.sqrt(s1)} + ${Math.sqrt(s2)} = ${Math.sqrt(s1) + Math.sqrt(s2)}, y ${Math.sqrt(s1 + s2)} × ${Math.sqrt(s1 + s2)} = ${s1 + s2}: los dos lados no coinciden.`,
        ),
        c(
          "q0",
          `¿Se pueden juntar ${ka}√${kb} y √${kb * kk * kk} en un solo término?`,
          [
            ["No: solo se suman raíces que ya tienen el mismo número dentro", "Primero simplifica: después de sacar factores, tienen el mismo radicando."],
            `Sí: √${kb * kk * kk} = ${kk}√${kb}, que es semejante a ${ka}√${kb}, y la suma es ${ka + kk}√${kb}`,
            [`Sí, sumando los radicandos → √${kb + kb * kk * kk}`, "Los radicandos no se suman: se suman los coeficientes de radicales semejantes."],
          ],
          1,
          `√${kb * kk * kk} = √(${kk * kk} × ${kb}) = ${kk}√${kb}; con ${ka}√${kb} suman ${ka + kk}√${kb}.`,
        ),
      ][v % 3];

      const [a1, b1] = [[5, 2], [6, 2], [4, 3], [3, 5], [10, 2], [6, 3]][v];
      const N1 = a1 * a1 * b1;
      const smaller = Array.from({ length: a1 - 1 }, (_, i) => i + 2).filter((r) => N1 % (r * r) === 0 && r !== a1);
      const N2 = [18, 80, 75, 98, 24, 63][v];
      const sq2 = largestSquare(N2);
      const squares2 = Array.from({ length: Math.floor(Math.sqrt(N2)) - 1 }, (_, i) => (i + 2) ** 2).filter((s) => N2 % s === 0);
      const [x3, y3] = [[2, 8], [3, 12], [5, 20], [2, 18], [3, 27], [6, 24]][v];
      const r3 = Math.sqrt(x3 * y3);
      const [wa, wb] = [[3, 2], [2, 5], [5, 3], [4, 2], [3, 3], [2, 7]][v];
      const [pa, pb] = [[3, 2], [2, 3], [5, 2], [2, 5], [3, 3], [4, 2]][v];
      const A5 = pa * pa * pb;
      const options = [
        [["3√5", 45], ["√50", 50], ["4√3", 48]],
        [["2√7", 28], ["3√3", 27], ["√30", 30]],
        [["5√2", 50], ["2√13", 52], ["√51", 51]],
        [["6√2", 72], ["4√5", 80], ["5√3", 75]],
        [["2√10", 40], ["√42", 42], ["6", 36]],
        [["7√2", 98], ["4√6", 96], ["√99", 99]],
      ][v] as [string, number][];
      const top = Math.max(...options.map(([, val]) => val));
      const topIndex = options.findIndex(([, val]) => val === top);
      return [
        concept,
        n(
          "q1",
          `Simplifica √${N1}. Si queda a√b, con b lo más pequeño posible, ¿cuánto vale a?`,
          a1,
          [`${N1} = ${a1 * a1} × ${b1}, y ${a1 * a1} es el mayor cuadrado perfecto que divide a ${N1}.`, `√${N1} = √${a1 * a1} × √${b1} = ${a1}√${b1}, así que a vale ${a1}.`],
          [`Busca el mayor cuadrado perfecto que divide a ${N1}.`, `${N1} = ${a1 * a1} × ${b1}.`, `√${a1 * a1} = ${a1}.`],
          { errors: smaller.slice(0, 1).map((r) => ({ value: r, feedback: `Sacaste ${r * r}, que es un cuadrado perfecto, pero no el mayor: todavía se puede simplificar más.` })) },
        ),
        n(
          "q2",
          `Para simplificar √${N2}, ¿cuál es el mayor cuadrado perfecto que divide a ${N2}?`,
          sq2,
          [
            `Los cuadrados perfectos (mayores que 1) que dividen a ${N2} son ${list(squares2)}.`,
            `El mayor es ${sq2}, porque ${N2} = ${sq2} × ${N2 / sq2} y ${N2 / sq2} ya no contiene cuadrados perfectos.`,
          ],
          ["Prueba con 4, 9, 16, 25, 36, 49…", `Mira cuáles dividen a ${N2}.`, `Quédate con el mayor: ${N2} = ${sq2} × ${N2 / sq2}.`],
          { step: true, errors: squares2.filter((s) => s !== sq2).slice(0, 1).map((s) => ({ value: s, feedback: `${s} divide a ${N2}, pero hay un cuadrado perfecto mayor que también lo divide.` })) },
        ),
        n(
          "q3",
          `Calcula √${x3} × √${y3}. Da el resultado entero.`,
          r3,
          [`√${x3} × √${y3} = √${x3 * y3}, porque la raíz de un producto es el producto de las raíces.`, `${x3 * y3} = ${r3} × ${r3}, así que √${x3 * y3} es ${r3}.`],
          ["Multiplica primero los radicandos.", `${x3} × ${y3} = ${x3 * y3}.`, `¿Qué número por sí mismo da ${x3 * y3}?`],
          { errors: [{ value: x3 * y3, feedback: "Multiplicaste los radicandos, pero falta sacar la raíz." }] },
        ),
        c(
          "q4",
          `Alguien simplifica √${wa * wa * wb} y escribe ${wa * wa}√${wb}. ¿Qué hizo mal?`,
          [
            ["Nada: está bien simplificado", `Si se eleva ${wa * wa}√${wb} al cuadrado da ${wa ** 4 * wb}, no ${wa * wa * wb}.`],
            [`Debió sumar ${wa * wa} + ${wb}`, "Sacar un factor de la raíz es un producto, no una suma."],
            `Sacó el ${wa * wa} sin calcular su raíz: √${wa * wa * wb} = ${wa}√${wb}`,
          ],
          2,
          `De la raíz sale √${wa * wa}, que es ${wa}, no ${wa * wa}.`,
        ),
        n(
          "q5",
          `Un cuadrado tiene un área de ${A5} cm². Su perímetro se puede escribir como k√${pb} cm. ¿Cuánto vale k?`,
          4 * pa,
          [`El lado mide √${A5} = √(${pa * pa} × ${pb}) = ${pa}√${pb} cm.`, `El perímetro son cuatro lados → 4 × ${pa}√${pb} = ${4 * pa}√${pb} cm, así que k vale ${4 * pa}.`],
          ["El lado de un cuadrado es la raíz de su área.", `Simplifica √${A5}.`, `Multiplica el lado por 4.`],
          { intent: "transfer", errors: [{ value: pa, feedback: "Ese es el coeficiente del lado; el perímetro suma cuatro lados." }] },
        ),
        c(
          "q6",
          `¿Cuál de estos números es el mayor: ${list(options.map(([t]) => t))}?`,
          options.map(([t, val], i): ChoiceLabel => (i === topIndex ? t : [t, `${t} es √${val}, y ${val} es menor que ${top}.`])),
          topIndex,
          `Para comparar, se mete todo dentro de la raíz → ${options.map(([t, val]) => (t.startsWith("√") ? t : `${t} es √${val}`)).join("; ")}. El mayor es ${options[topIndex][0]}.`,
          "transfer",
        ),
      ];
    },
    outcome: "Puedes simplificar una raíz sacando sus factores cuadrados, multiplicar raíces y sumar radicales semejantes.",
    commonErrors: [
      "Sumar radicandos: √9 + √16 no es √25.",
      "Sacar de la raíz un factor que no es cuadrado perfecto.",
      "Olvidar sacar la raíz del cuadrado: √50 no es 25√2.",
      "No simplificar del todo porque se eligió un cuadrado que no era el mayor.",
    ],
    application: n(
      "aplicacion",
      "Una escalera apoyada en una pared forma un triángulo rectángulo con catetos de 2 m y 4 m. Su longitud es la raíz de 2² + 4², que se puede escribir como a√5 m. ¿Cuánto vale a?",
      2,
      ["2² + 4² = 4 + 16 = 20, así que la escalera mide √20 m.", "√20 = √(4 × 5) = 2√5 m, de modo que a vale 2."],
      ["Calcula 2² + 4².", "Simplifica la raíz del resultado.", "√20 = √(4 × 5)."],
      { intent: "transfer" },
    ),
  }),
];

// ── Números mixtos ─────────────────────────────────────────────────────
const PART_NAME: Record<number, string> = { 2: "medios", 3: "tercios", 4: "cuartos", 5: "quintos", 6: "sextos", 7: "séptimos", 8: "octavos", 9: "novenos", 10: "décimos" };

export const MIXED_NUMBER_LESSONS: Lesson[] = [
  defineLesson({
    id: "numeros-mixtos",
    unitId: "fracciones",
    title: "Fracciones impropias y números mixtos",
    objective: "Pasar de fracción impropia a número mixto y al revés, ubicarlos en la recta numérica y sumar números mixtos.",
    purpose:
      "En recetas, medidas y tiempos se dice «2 tazas y media» o «1 hora y tres cuartos». El número mixto expresa esas cantidades y la fracción impropia permite operar con ellas.",
    prerequisites: ["fracciones-unidad", "fracciones-suma-resta"],
    legacyModuleIds: [],
    visual: "fraction",
    vocabulary: [
      { term: "Fracción propia", meaning: "Su numerador es menor que el denominador: vale menos que 1, como 3/4." },
      { term: "Fracción impropia", meaning: "Su numerador es mayor o igual que el denominador: vale 1 o más, como 11/4." },
      { term: "Número mixto", meaning: "Un entero y una fracción propia juntos: 2 3/4 significa 2 enteros más 3/4." },
    ],
    sections: [
      {
        title: "Más de una unidad",
        paragraphs: [
          "Cuando el numerador supera al denominador, la fracción contiene unidades completas. En 11/4 hay 8 cuartos, que forman 2 enteros, y sobran 3 cuartos.",
          "El número mixto 2 3/4 dice lo mismo de otra forma: 2 enteros y 3/4 más.",
        ],
        formula: "11/4 = 8/4 + 3/4 = 2 + 3/4",
      },
      {
        title: "De impropia a mixto: dividir",
        paragraphs: [
          "Se divide el numerador entre el denominador. El cociente es la parte entera y el resto es el nuevo numerador; el denominador no cambia.",
          "Para 17/5, 17 ÷ 5 da 3 y sobran 2, así que 17/5 es 3 2/5. Comprobación → 3 × 5 + 2 = 17.",
        ],
        formula: "a/b → cociente de a ÷ b (enteros) y resto/b",
      },
      {
        title: "De mixto a impropia: multiplicar y sumar",
        paragraphs: [
          "Se multiplica el entero por el denominador y se suma el numerador. Para 4 1/3 → (4 × 3 + 1)/3 = 13/3.",
          "Para sumar mixtos se suman los enteros con los enteros y las fracciones con las fracciones. Si la suma de las fracciones pasa de 1, ese entero se agrega a la parte entera.",
        ],
        formula: "entero y n/d → (entero × d + n)/d",
      },
    ],
    examples: [
      ex(
        "Escribe 23/6 como número mixto.",
        [
          ["23 ÷ 6 da 3 y sobran 5", "6 × 3 = 18 y 23 − 18 = 5: caben 3 enteros de seis sextos cada uno."],
          ["3 enteros y 5/6", "El cociente es la parte entera y el resto queda como sextos."],
          ["3 5/6", "Comprobación → 3 × 6 + 5 = 23, el numerador inicial."],
        ],
        "23/6 es 3 5/6. El denominador no cambia: los sextos siguen siendo sextos.",
      ),
      ex(
        "Calcula 2 3/4 + 1 1/2.",
        [
          ["2 + 1 = 3", "Sumamos las partes enteras."],
          ["3/4 + 1/2 = 3/4 + 2/4 = 5/4", "Sumamos las fracciones con el denominador común 4."],
          ["3 + 5/4 = 3 + 1 + 1/4 = 4 + 1/4", "5/4 es más de un entero: 5/4 = 1 + 1/4, y ese entero se suma a los otros. El resultado es 4 1/4."],
        ],
        "2 3/4 + 1 1/2 da 4 1/4. Si la suma de las fracciones pasa de 1, ese entero se suma a la parte entera.",
      ),
    ],
    diagnostic: [
      n("d-1", "¿Cuánto es 3/8 + 4/8? Responde con una fracción.", 7 / 8, ["Con el mismo denominador se suman los numeradores.", "3 + 4 = 7, así que 3/8 + 4/8 = 7/8."], ["Los octavos se suman como objetos.", "Suma 3 + 4.", "Son 7 octavos."]),
      n("d-2", "¿Cuántos cuartos hay en 2 enteros?", 8, ["Cada entero está formado por 4 cuartos.", "Dos enteros son 2 × 4 = 8 cuartos."], ["Un entero son 4/4.", "Dos enteros son dos veces 4/4.", "2 × 4 = 8."]),
      c("d-3", "¿Qué fracción es mayor que 1?", ["3/5", "7/4", "4/7"], 1, "7/4 tiene más cuartos de los que forman un entero (4/4)."),
    ],
    practiceCorrection: errorFollowup("Al expresar 19/4 como número mixto, ¿cuántas unidades completas hay?", 4, "Dividimos 19 entre 4: el cociente es 4 y el resto es 3.", "Así, 19/4 son 4 unidades y 3/4; el número de unidades completas es 4."),
    questions(v) {
      const [w, nn, d] = [[2, 3, 4], [1, 2, 5], [3, 1, 6], [4, 2, 3], [2, 5, 8], [5, 1, 2]][v];
      const imp = w * d + nn;
      const concept = [
        c(
          "q0",
          `¿Qué significa el número mixto ${w} ${nn}/${d}?`,
          [
            [`${w} × ${nn}/${d}`, `Un número mixto es una suma, no un producto: ${w} ${nn}/${d} es ${w} + ${nn}/${d}.`],
            `${w} enteros más ${nn}/${d}`,
            [`El número ${w}${nn} dividido entre ${d}`, `El ${w} cuenta enteros, no se junta con el numerador.`],
          ],
          1,
          `${w} ${nn}/${d} son ${w} enteros y ${nn}/${d} más, es decir, ${imp}/${d}.`,
        ),
        c(
          "q0",
          `¿Por qué ${imp}/${d} es mayor que 1?`,
          [
            [`Porque el numerador es ${imp % 2 ? "impar" : "par"}`, "Que sea par o impar no importa: hay que compararlo con el denominador."],
            [`Porque ${d} es un número pequeño`, `El denominador solo dice cuántas partes forman el entero; lo decisivo es que ${imp} > ${d}.`],
            `Porque tiene más ${PART_NAME[d]} (${imp}) de los que forman un entero (${d})`,
          ],
          2,
          `Un entero son ${d}/${d}; ${imp}/${d} tiene ${imp - d} ${PART_NAME[d]} más.`,
        ),
        c(
          "q0",
          `En la recta numérica, ¿entre qué enteros está ${imp}/${d}?`,
          [
            `Entre ${w} y ${w + 1}, porque ${imp}/${d} = ${w} + ${nn}/${d}`,
            [`Entre ${imp - 1} y ${imp}`, `Eso sería el número ${imp}; ${imp}/${d} son ${imp} partes de tamaño 1/${d}.`],
            ["Entre 0 y 1", `Solo las fracciones propias están entre 0 y 1, y ${imp} es mayor que ${d}.`],
          ],
          0,
          `${w} × ${d} = ${w * d} es el mayor múltiplo de ${d} que no pasa de ${imp}: hay ${w} enteros y sobran ${nn}/${d}.`,
        ),
      ][v % 3];

      const [num2, d2] = [[17, 5], [29, 6], [22, 7], [35, 8], [19, 4], [41, 9]][v];
      const q2 = Math.floor(num2 / d2),
        r2 = num2 % d2;
      const [d3, w31, n31, w32, n32] = [[4, 1, 3, 2, 3], [5, 2, 4, 1, 3], [6, 3, 5, 1, 4], [8, 1, 7, 3, 5], [3, 2, 2, 4, 2], [10, 1, 9, 2, 3]][v];
      const total3 = w31 + w32 + (n31 + n32) / d3;
      const [bn, bd] = [[17, 5], [23, 4], [26, 7], [31, 6], [38, 9], [47, 10]][v];
      const bq = Math.floor(bn / bd),
        br = bn % bd;
      const [w5, n5, d5, k5] = [[2, 1, 2, 3], [1, 3, 4, 2], [1, 1, 4, 4], [2, 1, 4, 3], [1, 1, 2, 5], [3, 1, 2, 2]][v];
      const per5 = w5 + n5 / d5;
      const trio = [
        [["11/4", 11 / 4], ["2 2/3", 8 / 3], ["2,7", 2.7]],
        [["7/2", 3.5], ["3 3/5", 3.6], ["3,55", 3.55]],
        [["9/4", 2.25], ["2 1/5", 2.2], ["2,3", 2.3]],
        [["17/5", 3.4], ["3 1/3", 10 / 3], ["3,35", 3.35]],
        [["13/6", 13 / 6], ["2 1/4", 2.25], ["2,2", 2.2]],
        [["15/8", 1.875], ["1 4/5", 1.8], ["1,9", 1.9]],
      ][v] as [string, number][];
      const read = (x: number) => (Math.abs(x * 1000 - Math.round(x * 1000)) < 1e-9 ? `vale ${dec(x)}` : `vale unos ${dec(Math.round(x * 1000) / 1000)}`);
      const max = Math.max(...trio.map(([, x]) => x));
      const maxIndex = trio.findIndex(([, x]) => x === max);
      return [
        concept,
        n(
          "q1",
          `Escribe ${w} ${nn}/${d} como fracción impropia.`,
          imp / d,
          [`Multiplicamos el entero por el denominador → ${w} × ${d} = ${w * d} ${PART_NAME[d]}.`, `Sumamos el numerador → ${w * d} + ${nn} = ${imp}, así que ${w} ${nn}/${d} es ${imp}/${d}.`],
          [`Cada entero son ${d} ${PART_NAME[d]}.`, `${w} enteros son ${w} × ${d} ${PART_NAME[d]}.`, `Suma los ${nn} ${PART_NAME[d]} que faltan.`],
          { errors: [{ value: (w + nn) / d, feedback: `Sumaste el entero al numerador: cada entero son ${d} ${PART_NAME[d]}, no uno.` }] },
        ),
        n(
          "q2",
          `Para pasar ${num2}/${d2} a número mixto se divide ${num2} entre ${d2}. ¿Cuánto sobra (el resto)?`,
          r2,
          [`${d2} × ${q2} = ${d2 * q2} no pasa de ${num2}, pero ${d2} × ${q2 + 1} = ${d2 * (q2 + 1)} ya se pasa.`, `Sobran ${num2} − ${d2 * q2} = ${r2}, así que ${num2}/${d2} es ${q2} ${r2}/${d2}.`],
          [`Busca el mayor múltiplo de ${d2} que no pase de ${num2}.`, `${d2} × ${q2} = ${d2 * q2}.`, `Resta ${num2} − ${d2 * q2}.`],
          { step: true, errors: [{ value: q2, feedback: "Ese es el cociente, la parte entera. El resto es lo que sobra." }] },
        ),
        n(
          "q3",
          `Calcula ${w31} ${n31}/${d3} + ${w32} ${n32}/${d3}. Escribe el resultado como fracción.`,
          total3,
          [
            `Enteros → ${w31} + ${w32} = ${w31 + w32}. Fracciones → ${n31}/${d3} + ${n32}/${d3} = ${n31 + n32}/${d3}.`,
            `${n31 + n32}/${d3} = 1 + ${n31 + n32 - d3}/${d3}, así que el total es ${w31 + w32 + 1} ${n31 + n32 - d3}/${d3}, es decir, ${(w31 + w32 + 1) * d3 + n31 + n32 - d3}/${d3}.`,
          ],
          ["Suma los enteros por un lado y las fracciones por otro.", `${n31}/${d3} + ${n32}/${d3} = ${n31 + n32}/${d3}, que pasa de 1.`, "Pasa a la parte entera el entero que sale de la suma de las fracciones."],
          { errors: [{ value: w31 + w32 + (n31 + n32) / (2 * d3), feedback: `Sumaste también los denominadores: los ${PART_NAME[d3]} no cambian de tamaño al sumarlos.` }] },
        ),
        c(
          "q4",
          `Alguien convierte ${bn}/${bd} en número mixto y escribe ${br} ${bq}/${bd}. ¿Qué error cometió?`,
          [
            ["Ninguno: está bien", `${br} enteros y ${bq}/${bd} son ${br * bd + bq} ${PART_NAME[bd]}, no ${bn}.`],
            `Intercambió el cociente y el resto: es ${bq} ${br}/${bd}`,
            [`Debió poner ${bn} como denominador`, "El denominador no cambia al pasar a número mixto."],
          ],
          1,
          `${bn} ÷ ${bd} da ${bq} y sobran ${br}: el cociente es la parte entera y el resto el numerador. Comprobación → ${bq} × ${bd} + ${br} = ${bn}.`,
        ),
        n(
          "q5",
          `Una receta usa ${w5} ${n5}/${d5} tazas de harina por torta. ¿Cuántas tazas se necesitan para ${k5} tortas?`,
          k5 * per5,
          [`${w5} ${n5}/${d5} es ${w5 * d5 + n5}/${d5} de taza por torta.`, `${k5} × ${w5 * d5 + n5}/${d5} = ${k5 * (w5 * d5 + n5)}/${d5}, es decir, ${dec(k5 * per5)} tazas.`],
          ["Pasa el número mixto a fracción impropia.", `Multiplica por ${k5}.`, `${k5} × ${w5 * d5 + n5}/${d5}.`],
          { intent: "transfer", unit: "tazas", errors: [{ value: k5 * w5 + n5 / d5, feedback: "Multiplicaste solo los enteros: también hay que multiplicar la fracción." }] },
        ),
        c(
          "q6",
          `¿Cuál de estas cantidades es la mayor: ${list(trio.map(([t]) => t))}?`,
          trio.map(([t, x], i): ChoiceLabel => (i === maxIndex ? t : [t, `${t} ${read(x)}, menos que ${trio[maxIndex][0]}, que ${read(max)}.`])),
          maxIndex,
          `Al pasar todo a decimal → ${trio.map(([t, x]) => `${t} ${read(x)}`).join("; ")}. La mayor es ${trio[maxIndex][0]}.`,
          "transfer",
        ),
      ];
    },
    outcome: "Puedes pasar de fracción impropia a número mixto y al revés, compararlos y sumarlos.",
    commonErrors: [
      "Sumar el entero al numerador: 2 3/4 no es 5/4.",
      "Intercambiar el cociente y el resto al pasar a número mixto.",
      "Cambiar el denominador al convertir: los cuartos siguen siendo cuartos.",
      "Olvidar pasar a enteros la parte de la suma de fracciones que supera 1.",
    ],
    application: n(
      "aplicacion",
      "Una cinta mide 5 1/4 m. Se cortan 2 trozos de 1 3/4 m cada uno. ¿Cuántos metros de cinta quedan? Responde con un número decimal.",
      1.75,
      ["Los trozos son 2 × 7/4 = 14/4 = 3,5 m en total.", "La cinta es 21/4 = 5,25 m, y 5,25 − 3,5 = 1,75 m."],
      ["Pasa los números mixtos a fracciones o a decimales.", "1 3/4 es 1,75 y 5 1/4 es 5,25.", "Resta lo cortado: 2 × 1,75."],
      { intent: "transfer", unit: "m" },
    ),
  }),
];

// ── Regla de tres compuesta ───────────────────────────────────────────
/** Valor «bonito» (como mucho dos decimales) para usar como error previsto. */
const nice = (x: number) => Number.isFinite(x) && Math.abs(x * 100 - Math.round(x * 100)) < 1e-9;

export const COMPOUND_RULE_LESSONS: Lesson[] = [
  defineLesson({
    id: "regla-tres-compuesta",
    unitId: "proporcionalidad",
    title: "Regla de tres compuesta",
    objective: "Resolver problemas con tres o más magnitudes proporcionales decidiendo, para cada una, si su relación con la incógnita es directa o inversa.",
    purpose:
      "Si el trabajo total y el ritmo por persona se mantienen, la regla de tres compuesta permite calcular cuántos trabajadores se necesitan cuando cambian los días y las horas de trabajo.",
    prerequisites: ["proporcionalidad", "proporcionalidad-inversa"],
    legacyModuleIds: [],
    visual: "inverse",
    vocabulary: [
      { term: "Magnitud", meaning: "Algo que se puede medir o contar: obreros, días, metros, litros." },
      { term: "Regla de tres compuesta", meaning: "Problema con más de dos magnitudes proporcionales en el que una es la incógnita." },
      { term: "Relación directa", meaning: "Si una magnitud se multiplica por k, la otra también: más metros, más días." },
      { term: "Relación inversa", meaning: "Si una magnitud se multiplica por k, la otra se divide entre k: más obreros, menos días." },
    ],
    sections: [
      {
        title: "Una magnitud cada vez",
        paragraphs: [
          "Se compara cada magnitud con la incógnita por separado, suponiendo que las demás no cambian.",
          "Si al aumentar una magnitud aumenta la incógnita, la relación es directa; si al aumentar una la incógnita disminuye, es inversa.",
        ],
        formula: "más obreros → menos días (inversa);  más metros → más días (directa)",
      },
      {
        title: "Multiplicar por una razón por cada magnitud",
        paragraphs: [
          "Se parte del valor conocido de la incógnita y se multiplica por una razón por cada magnitud: nuevo/antiguo si la relación es directa y antiguo/nuevo si es inversa.",
          "Si 6 obreros hacen 30 m en 10 días, 4 obreros tardan en hacer 36 m un número de días igual a 10 × 6/4 × 36/30 = 18.",
        ],
        formula: "incógnita = valor conocido × razón de cada magnitud",
      },
      {
        title: "Comprobar con el sentido",
        paragraphs: [
          "Antes de calcular, anticipa si la respuesta debe subir o bajar: con menos obreros y más metros tienen que salir más días.",
          "También se puede comprobar por unidad: 6 obreros en 10 días hacen 30 m, así que cada obrero hace medio metro por día; 4 obreros en 18 días hacen 4 × 18 × 0,5 = 36 m.",
        ],
        formula: "trabajo = obreros × días × rendimiento",
      },
    ],
    examples: [
      ex(
        "5 grifos llenan un tanque de 6000 L en 4 horas. ¿Cuántas horas tardarán 8 grifos en llenar 9600 L?",
        [
          ["grifos → inversa;  litros → directa", "Más grifos llenan más rápido (menos horas); más litros necesitan más horas."],
          ["horas = 4 × 5/8 × 9600/6000", "La razón de los grifos va invertida (5/8) por ser inversa; la de los litros va igual (9600/6000) por ser directa."],
          ["4 × 5/8 × 8/5 = 4", "9600/6000 se simplifica a 8/5. Las dos razones se compensan: siguen siendo 4 horas."],
        ],
        "Tardan 4 horas: con 8 grifos el caudal es 8/5 del original, justo lo que aumentaron los litros.",
      ),
      ex(
        "12 vacas comen 360 kg de pasto en 5 días. ¿Cuántos kilogramos comerán 15 vacas en 8 días?",
        [
          ["vacas → directa;  días → directa", "Más vacas comen más; más días, también."],
          ["kg = 360 × 15/12 × 8/5", "Las dos razones van como nuevo/antiguo porque las dos relaciones son directas."],
          ["360 × 15/12 = 450 y 450 × 8/5 = 720", "Multiplicamos por una razón y después por la otra."],
        ],
        "Comerán 720 kg. Comprobación → cada vaca come 360 ÷ (12 × 5) = 6 kg por día, y 15 × 8 × 6 = 720.",
      ),
    ],
    diagnostic: [
      n("d-1", "Si 3 cuadernos cuestan 12 soles, ¿cuánto cuestan 5 cuadernos?", 20, ["Un cuaderno cuesta 12 ÷ 3 = 4 soles.", "5 cuadernos cuestan 5 × 4 = 20 soles."], ["Calcula el precio de un cuaderno.", "12 ÷ 3 = 4.", "Multiplica por 5."], { unit: "soles" }),
      n("d-2", "4 pintores pintan una casa en 6 días. Trabajando igual, ¿en cuántos días la pintan 8 pintores?", 3, ["Con el doble de pintores se tarda la mitad.", "6 ÷ 2 = 3 días."], ["¿Más pintores tardan más o menos?", "Es una relación inversa.", "El doble de pintores, la mitad de días."], { unit: "días" }),
      c("d-3", "Para hacer la misma obra con más trabajadores, ¿qué relación hay entre trabajadores y días?", ["Directa", "Inversa", "No se relacionan"], 1, "Si se duplican los trabajadores, los días se reducen a la mitad: es inversa."),
    ],
    practiceCorrection: errorFollowup("Cuatro personas terminan un trabajo en 6 días. ¿Cuántos días necesitan 8 personas al mismo ritmo para el mismo trabajo?", 3, "Para un trabajo fijo, personas y tiempo son inversamente proporcionales.", "Al duplicar las personas, el tiempo se divide entre dos: 6 ÷ 2 = 3 días."),
    questions(v) {
      const [W1, M1, D1, W2, M2] = [[6, 30, 10, 4, 36], [8, 40, 15, 10, 60], [5, 20, 12, 6, 30], [9, 45, 8, 6, 60], [4, 24, 9, 6, 40], [10, 50, 6, 12, 80]][v];
      const D2 = (D1 * W1 * M2) / (W2 * M1);
      const step = (D1 * W1) / W2;
      const wrongD = (D1 * W2 * M2) / (W1 * M1);
      const concept = [
        c(
          "q0",
          `${W1} obreros hacen ${M1} m de muro en ${D1} días. Si hubiera más obreros para el mismo muro, ¿qué pasaría con los días?`,
          [
            "Disminuirían: obreros y días son inversamente proporcionales",
            ["Aumentarían, porque las dos cantidades cambian", "Con más manos, el mismo trabajo se termina antes."],
            ["No cambiarían", "El trabajo se reparte entre más obreros: cada uno hace menos."],
          ],
          0,
          `Con el doble de obreros, el muro de ${M1} m se termina en la mitad de días: la relación es inversa.`,
        ),
        c(
          "q0",
          `Con los mismos ${W1} obreros, si el muro midiera más de ${M1} m, ¿qué relación hay entre los metros y los días?`,
          [
            ["Inversa: más metros, menos días", "Más metros es más trabajo para los mismos obreros: necesitan más días."],
            "Directa: el doble de metros necesita el doble de días",
            ["No hay relación", "Los metros son el trabajo que hay que hacer: cambian los días."],
          ],
          1,
          `Si ${W1} obreros tardan ${D1} días en ${M1} m, en ${2 * M1} m tardan ${2 * D1} días.`,
        ),
        c(
          "q0",
          `En un problema de obreros, metros y días, ¿por qué la razón de los obreros se escribe invertida (${W1}/${W2}) para calcular los días?`,
          [
            ["Porque siempre se pone el número mayor arriba", "No depende de cuál es mayor: depende de si la relación es directa o inversa."],
            ["Por costumbre: daría lo mismo sin invertirla", "Sin invertirla, al poner más obreros saldrían más días, y eso no tiene sentido."],
            "Porque la relación es inversa: si los obreros se multiplican por k, los días se dividen entre k",
          ],
          2,
          "Las relaciones inversas entran con la razón antiguo/nuevo y las directas con nuevo/antiguo.",
        ),
      ][v % 3];

      const [A1, K1, T1, A2, T2] = [[12, 360, 5, 15, 8], [10, 200, 4, 15, 6], [8, 240, 6, 6, 10], [5, 150, 3, 8, 6], [20, 600, 10, 16, 5], [6, 180, 9, 9, 12]][v];
      const K2 = (K1 * A2 * T2) / (A1 * T1);
      const [G1, L1, H1, G2, L2] = [[5, 6000, 4, 8, 9600], [3, 1200, 6, 4, 2400], [4, 800, 5, 5, 1500], [6, 3000, 10, 5, 2000], [2, 900, 9, 3, 1800], [8, 4000, 3, 6, 6000]][v];
      const H2 = (H1 * G1 * L2) / (G2 * L1);
      const [M3, D3] = [[45, 9], [60, 12], [40, 8], [30, 4], [36, 6], [75, 9]][v];
      const W3 = (W1 * D1 * M3) / (D3 * M1);
      return [
        concept,
        n(
          "q1",
          `${W1} obreros construyen ${M1} m de muro en ${D1} días. ¿Cuántos días tardarán ${W2} obreros en construir ${M2} m, trabajando al mismo ritmo?`,
          D2,
          [`Los obreros tienen relación inversa con los días (razón ${W1}/${W2}) y los metros, directa (razón ${M2}/${M1}).`, `Días = ${D1} × ${W1}/${W2} × ${M2}/${M1} = ${dec(D2)}.`],
          ["Decide si cada magnitud es directa o inversa con los días.", `Obreros → inversa; metros → directa.`, `${D1} × ${W1}/${W2} × ${M2}/${M1}.`],
          { unit: "días", errors: nice(wrongD) && wrongD !== D2 ? [{ value: wrongD, feedback: "Tomaste la relación de los obreros como directa: con más obreros los días deberían bajar." }] : [] },
        ),
        n(
          "q2",
          `${W1} obreros hacen ${M1} m en ${D1} días. Primer paso → si fueran ${W2} obreros para los mismos ${M1} m, ¿cuántos días tardarían?`,
          step,
          [`Es una relación inversa: el trabajo total es ${W1} × ${D1} = ${W1 * D1} jornadas de obrero.`, `Repartidas entre ${W2} obreros → ${W1 * D1} ÷ ${W2} = ${dec(step)} días.`],
          ["Con otro número de obreros, ¿los días suben o bajan?", `Calcula las jornadas → ${W1} × ${D1}.`, `Divide entre ${W2}.`],
          { step: true, unit: "días", errors: nice((D1 * W2) / W1) && (D1 * W2) / W1 !== step ? [{ value: (D1 * W2) / W1, feedback: "Lo calculaste como directa; con otro número de obreros los días cambian al revés." }] : [] },
        ),
        n(
          "q3",
          `${A1} vacas comen ${K1} kg de pasto en ${T1} días. ¿Cuántos kilogramos comerán ${A2} vacas en ${T2} días?`,
          K2,
          [`Las vacas tienen relación directa con el pasto (razón ${A2}/${A1}) y los días también (razón ${T2}/${T1}).`, `kg = ${K1} × ${A2}/${A1} × ${T2}/${T1} = ${dec(K2)}.`],
          ["Más vacas comen más; más días, también.", "Las dos razones van como nuevo/antiguo.", `${K1} × ${A2}/${A1} × ${T2}/${T1}.`],
          { unit: "kg" },
        ),
        c(
          "q4",
          `Para saber cuántos días tardan ${W2} obreros en hacer ${M2} m, si ${W1} obreros hacen ${M1} m en ${D1} días, alguien calcula ${D1} × ${W2}/${W1} × ${M2}/${M1}. ¿Qué error cometió?`,
          [
            ["Ninguno: así se calcula", "Con esa cuenta, más obreros darían más días, y eso no tiene sentido."],
            ["Debió invertir la razón de los metros", "Metros y días son directamente proporcionales: esa razón está bien."],
            `Puso directa la razón de los obreros: debía ir invertida (${W1}/${W2})`,
          ],
          2,
          `Obreros y días son inversos: Días = ${D1} × ${W1}/${W2} × ${M2}/${M1} = ${dec(D2)}.`,
        ),
        n(
          "q5",
          `${G1} grifos llenan ${L1} L en ${H1} horas. ¿Cuántas horas tardarán ${G2} grifos en llenar ${L2} L?`,
          H2,
          [`Los grifos tienen relación inversa con las horas (razón ${G1}/${G2}) y los litros, directa (razón ${L2}/${L1}).`, `Horas = ${H1} × ${G1}/${G2} × ${L2}/${L1} = ${dec(H2)}.`],
          ["Más grifos llenan más rápido; más litros tardan más.", "Grifos → inversa; litros → directa.", `${H1} × ${G1}/${G2} × ${L2}/${L1}.`],
          { intent: "transfer", unit: "horas" },
        ),
        n(
          "q6",
          `${W1} obreros hacen ${M1} m de muro en ${D1} días. ¿Cuántos obreros hacen falta para hacer ${M3} m en ${D3} días?`,
          W3,
          [`Ahora la incógnita son los obreros. Los días tienen relación inversa con ellos (razón ${D1}/${D3}) y los metros, directa (razón ${M3}/${M1}).`, `Obreros = ${W1} × ${D1}/${D3} × ${M3}/${M1} = ${dec(W3)}.`],
          ["Con menos días, ¿hacen falta más o menos obreros?", "Días → inversa; metros → directa.", `${W1} × ${D1}/${D3} × ${M3}/${M1}.`],
          { intent: "transfer", unit: "obreros" },
        ),
      ];
    },
    outcome: "Puedes resolver problemas con varias magnitudes proporcionales decidiendo, una por una, si son directas o inversas respecto de la incógnita.",
    commonErrors: [
      "Tratar todas las magnitudes como directas.",
      "Invertir una razón directa en lugar de la inversa.",
      "Comparar dos magnitudes conocidas entre sí en lugar de cada una con la incógnita.",
      "No comprobar si el resultado tiene sentido: menos obreros tienen que tardar más.",
    ],
    application: n(
      "aplicacion",
      "Una imprenta, con 3 máquinas trabajando 8 horas diarias, imprime 9600 folletos. ¿Cuántos folletos imprimirá con 5 máquinas trabajando 6 horas diarias?",
      12000,
      ["Las máquinas y las horas tienen relación directa con los folletos → razones 5/3 y 6/8.", `9600 × 5/3 × 6/8 = 16${" "}000 × 3/4 = 12${" "}000 folletos.`],
      ["Más máquinas imprimen más; menos horas, menos.", "Las dos razones van como nuevo/antiguo.", "9600 × 5/3 × 6/8."],
      { intent: "transfer", unit: "folletos" },
    ),
  }),
];
