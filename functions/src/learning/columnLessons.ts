import { defineLesson } from "./defineLesson";
import { columnBugs, columnTrace, fmt, placeName } from "./algorithms/columns";
import { choice as c, columnExample, columnar, numeric as n } from "./questions";
import type { Lesson } from "./types";

/**
 * Base de cálculo escrito: sumar y restar naturales en columnas. Las
 * preguntas `columnar` se resuelven en la hoja de columnas y sus errores
 * previstos salen de los errores sistemáticos del algoritmo.
 */
export const COLUMN_LESSONS: Lesson[] = [
  defineLesson({
    id: "suma-resta-columnas",
    unitId: "numeros",
    title: "Sumar y restar en columnas",
    objective:
      "Sumar y restar números de varias cifras en columnas, llevando y reagrupando con sentido del valor posicional.",
    purpose:
      "El almacén de la ciudad recibe y despacha miles de piezas. Para llevar la cuenta sin calculadora hay que operar en columnas y saber por qué funciona cada paso.",
    prerequisites: [],
    legacyModuleIds: ["aritmetica-d3"],
    visual: "columns",
    vocabulary: [
      { term: "Valor posicional", meaning: "Una cifra vale distinto según su columna: el 3 de 4 372 vale 300." },
      { term: "Llevada", meaning: "Cuando una columna suma 10 o más, 10 de esa posición forman 1 de la siguiente y se pasa a la izquierda." },
      { term: "Pedir prestado", meaning: "Cambiar 1 de la columna de la izquierda por 10 de la tuya: el número no cambia, solo se reagrupa." },
      { term: "Compensar", meaning: "Sumar 10 arriba en una columna y 1 abajo en la siguiente: los dos números aumentan lo mismo y la diferencia se conserva." },
    ],
    sections: [
      {
        title: "Cada cifra en su columna",
        paragraphs: [
          "Para operar en columnas se escriben unidades bajo unidades, decenas bajo decenas y centenas bajo centenas. Si un número tiene menos cifras, se alinea por la derecha.",
          "Se empieza por las unidades, a la derecha, porque lo que sobra en una columna pasa a la siguiente de la izquierda.",
        ],
        formula: "4 372 = 4 000 + 300 + 70 + 2",
      },
      {
        title: "Llevar en la suma",
        paragraphs: [
          "En 347 + 285, las unidades suman 7 + 5 = 12. En una columna solo cabe una cifra: escribes 2 y llevas 1 a las decenas, porque 10 unidades forman 1 decena.",
          "En las decenas se suma también la llevada: 4 + 8 + 1 = 13. Escribes 3 y llevas 1 a las centenas. Al final, 3 + 2 + 1 = 6. Resultado: 632.",
        ],
        formula: "347 + 285 = 632  (7 + 5 = 12 → escribes 2 y llevas 1)",
      },
      {
        title: "Restar cuando arriba hay menos",
        paragraphs: [
          "En 325 − 148, las unidades piden 5 − 8. Nunca se cambia el orden (8 − 5): se reagrupa. Hay dos maneras correctas y puedes elegir la que te enseñaron.",
          "Pedir prestado: tomas 1 decena del 2, que queda en 1, y las unidades pasan a 15. Compensar: sumas 10 arriba (15) y 1 abajo en las decenas (4 + 1 = 5). Las dos dan 177. Comprueba siempre: 177 + 148 = 325.",
        ],
        formula: "pedir prestado → 1 decena = 10 unidades;  compensar → (a + 10) − (b + 10) = a − b",
      },
    ],
    examples: [
      columnExample({ op: "add", a: 347, b: 285 }, "Calcula 347 + 285 en columnas."),
      columnExample({ op: "subtract", a: 302, b: 158 }, "Calcula 302 − 158 en columnas: hay un cero arriba."),
    ],
    diagnostic: [
      c("d-1", "En el número 4 372, ¿cuánto vale la cifra 3?", ["3", "300", "30"], 1, "El 3 está en la columna de las centenas: vale 3 × 100 = 300."),
      n(
        "d-2",
        "¿Cuánto es 46 + 7?",
        53,
        ["6 + 7 = 13 unidades: 1 decena y 3 unidades.", "4 decenas + 1 decena = 5 decenas, con 3 unidades: 53."],
        ["Suma primero las unidades.", "6 + 7 = 13 pasa de 9: forma una decena.", "40 + 13 = 53."],
      ),
      n(
        "d-3",
        "¿Cuánto es 52 − 8?",
        44,
        ["2 no alcanza para quitar 8: se toma una decena y quedan 4 decenas y 12 unidades.", "12 − 8 = 4, con 4 decenas: 44."],
        ["Mira si 2 alcanza para quitar 8.", "Cambia una decena por 10 unidades.", "12 − 8 = 4 y quedan 4 decenas."],
      ),
    ],
    questions(v) {
      const concept = v % 3;
      const [ca, cb] = [[468, 257], [741, 368], [582, 236], [925, 487], [634, 179], [813, 245]][v];
      const [sa, sb] = [[347, 285], [586, 378], [1476, 2858], [2695, 1548], [739, 468], [3857, 2476]][v];
      const [ta, tb] = [[268, 157], [459, 283], [376, 248], [594, 238], [643, 279], [825, 186]][v];
      const [ra, rb] = [[325, 148], [503, 267], [4012, 1586], [3241, 1765], [700, 254], [6105, 2348]][v];
      const [ea, eb] = [[432, 175], [614, 238], [852, 367], [721, 346], [943, 568], [530, 174]][v];
      const [ba, bb] = [[1204, 386], [2315, 748], [3050, 1275], [1432, 965], [4006, 2518], [2140, 876]][v];
      const [ma, mb] = [[1000, 457], [812, 375], [2000, 1268], [1503, 726], [900, 384], [1250, 687]][v];

      // q2: la cifra de las decenas tras llevar desde las unidades.
      const tensSum = Math.floor(ta / 10) % 10 + Math.floor(tb / 10) % 10;
      const tensDigit = (tensSum + 1) % 10;

      // q4: el error «restar la cifra menor de la mayor».
      const smallerBug = columnBugs({ op: "subtract", a: ea, b: eb }).find((bug) => bug.id === "menor-del-mayor")!;
      const firstBorrow = columnTrace({ op: "subtract", a: ea, b: eb }).steps.find((s) => s.regroup)!;

      const contexts = [
        { what: "La biblioteca tenía", verb: "y prestó", left: "¿Cuántos libros quedan en los estantes?", unit: "libros", things: "libros" },
        { what: "Un tanque tenía", verb: "y se usaron", left: "¿Cuántos litros quedan?", unit: "litros", things: "litros" },
        { what: "Una familia ahorró", verb: "y gastó", left: "¿Cuántos soles le quedan?", unit: "soles", things: "soles" },
      ][v % 3];

      return [
        concept === 0
          ? c(
              "q0",
              `Al sumar ${fmt(ca)} + ${fmt(cb)}, ¿por qué conviene empezar por las unidades?`,
              [
                `Porque si una columna pasa de 9, lo que sobra se lleva a la columna de la izquierda`,
                ["Porque las unidades son las cifras más importantes", "Todas las cifras importan; las centenas valen más que las unidades."],
                ["Da igual: el orden de las columnas nunca cambia lo que se escribe", "Si empiezas por la izquierda, la llevada que llega después obliga a borrar y corregir."],
              ],
              0,
              "Cada columna puede enviar una llevada a la siguiente de la izquierda; por eso se resuelve de derecha a izquierda.",
            )
          : concept === 1
            ? c(
                "q0",
                `En ${fmt(ca)} − ${fmt(cb)}, las unidades piden ${ca % 10} − ${cb % 10}. ¿Qué significa «pedir 1 a las decenas»?`,
                [
                  ["Restar al revés, " + `${cb % 10} − ${ca % 10}` + ", porque así sí se puede", "Cambiar el orden calcula otra cosa: siempre se resta la cifra de abajo a la de arriba."],
                  "Cambiar 1 decena por 10 unidades: el número es el mismo, solo se reagrupa",
                  ["Sumar 1 al resultado al final", "El préstamo no se suma al resultado: se reagrupa el número de arriba."],
                ],
                1,
                `Una decena son 10 unidades: ${fmt(ca)} se reescribe con una decena menos y ${(ca % 10) + 10} unidades.`,
              )
            : c(
                "q0",
                `Para calcular ${fmt(ca)} − ${fmt(cb)} hay quien suma 10 arriba en las unidades y 1 abajo en las decenas. ¿Por qué el resultado no cambia?`,
                [
                  ["Porque 10 y 1 son lo mismo", "No lo son: 10 unidades arriba equivalen a 1 decena abajo, que es otra columna."],
                  ["Sí cambia: el resultado sale 9 de más", "Las dos cantidades añadidas valen 10, así que se cancelan."],
                  "Porque los dos números aumentan 10 y la diferencia entre ellos se conserva",
                ],
                2,
                "1 decena abajo vale 10 unidades: (a + 10) − (b + 10) = a − b.",
              ),
        columnar("q1", { op: "add", a: sa, b: sb }),
        n(
          "q2",
          `En ${fmt(ta)} + ${fmt(tb)}, las unidades suman ${(ta % 10) + (tb % 10)}. Escribes ${((ta % 10) + (tb % 10)) % 10} y llevas 1. ¿Qué cifra escribes en las decenas?`,
          tensDigit,
          [
            `En las decenas se suman sus cifras y la llevada que llegó de las unidades: ${Math.floor(ta / 10) % 10} + ${Math.floor(tb / 10) % 10} + 1 = ${tensSum + 1}.`,
            tensSum + 1 >= 10
              ? `${tensSum + 1} no cabe en una columna: escribes ${tensDigit} y llevas 1 a las centenas.`
              : `Escribes ${tensDigit} en las decenas; no llevas nada a las centenas.`,
          ],
          [
            "La llevada de las unidades también se suma en las decenas.",
            `Decenas: ${Math.floor(ta / 10) % 10} + ${Math.floor(tb / 10) % 10} + 1.`,
            `${tensSum + 1}: en la columna solo cabe la última cifra.`,
          ],
          {
            step: true,
            errors: [
              { value: tensSum % 10, feedback: "Olvidaste sumar la llevada que viene de las unidades." },
              { value: tensSum + 1, feedback: "En una columna solo cabe una cifra: escribe la de las unidades y lleva 1 a las centenas." },
            ].filter((e) => e.value !== tensDigit),
          },
        ),
        columnar("q3", { op: "subtract", a: ra, b: rb }),
        c(
          "q4",
          `Un compañero calcula ${fmt(ea)} − ${fmt(eb)} = ${fmt(smallerBug.value)}. ¿Qué falla?`,
          [
            ["Nada: el resultado es correcto", `Comprueba sumando: ${fmt(smallerBug.value)} + ${fmt(eb)} no da ${fmt(ea)}.`],
            ["Debía sumar en lugar de restar", "Es una resta; el error está en cómo restó una de las columnas."],
            `En las ${placeName(firstBorrow.column)} restó ${firstBorrow.bottom} − ${firstBorrow.top}: como arriba hay menos, debía reagrupar`,
          ],
          2,
          `Siempre se resta la cifra de abajo a la de arriba. Si arriba hay menos, se pide prestado o se compensa: ${fmt(ea)} − ${fmt(eb)} = ${fmt(ea - eb)}.`,
          "concept",
        ),
        columnar(
          "q5",
          { op: "subtract", a: ba, b: bb },
          {
            prompt: `${contexts.what} ${fmt(ba)} ${contexts.things} ${contexts.verb} ${fmt(bb)}. ${contexts.left}`,
            intent: "transfer",
            unit: contexts.unit,
            errors: [{ value: ba + bb, feedback: "Sumaste las cantidades. Lo que se usa o se gasta se quita: es una resta." }],
          },
        ),
        n(
          "q6",
          `¿Qué número hay que sumar a ${fmt(mb)} para obtener ${fmt(ma)}?`,
          ma - mb,
          [
            `Buscas el número que falta en ${fmt(mb)} + ? = ${fmt(ma)}.`,
            `Lo que falta se calcula restando en columnas: ${fmt(ma)} − ${fmt(mb)} = ${fmt(ma - mb)}.`,
            `Comprobación: ${fmt(mb)} + ${fmt(ma - mb)} = ${fmt(ma)}.`,
          ],
          ["Piensa en lo que le falta al número pequeño para llegar al grande.", `La operación inversa de sumar es restar: ${fmt(ma)} − ${fmt(mb)}.`, "Resta en columnas y comprueba sumando."],
          {
            intent: "transfer",
            errors: [
              { value: ma + mb, feedback: "Sumaste los dos números. Buscas lo que falta: se resta." },
              ...columnBugs({ op: "subtract", a: ma, b: mb }).map(({ value, feedback }) => ({ value, feedback })),
            ].filter((e, i, all) => e.value !== ma - mb && all.findIndex((o) => o.value === e.value) === i),
          },
        ),
      ];
    },
    application: n(
      "app",
      "El almacén tenía 2 486 piezas. Llegó un camión con 1 375 y luego se despacharon 948. ¿Cuántas piezas hay ahora en el almacén?",
      2913,
      [
        "Primero lo que llega se suma: 2 486 + 1 375 = 3 861 (llevas en las unidades, las decenas y las centenas).",
        "Después lo que sale se resta: 3 861 − 948 = 2 913 (reagrupas en las unidades y en las centenas).",
        "Comprobación: 2 913 + 948 = 3 861.",
      ],
      ["Traduce cada movimiento a una suma o una resta.", "2 486 + 1 375 = 3 861.", "Ahora resta los 948 que salieron."],
      {
        intent: "transfer",
        unit: "piezas",
        errors: [
          { value: 3861, feedback: "Falta el último movimiento: restar las 948 piezas despachadas." },
          { value: 4809, feedback: "Sumaste las piezas despachadas. Lo que sale del almacén se resta." },
          { value: 3127, feedback: "En 3 861 − 948 restaste la cifra menor de la mayor en algunas columnas. Si arriba hay menos, reagrupa." },
        ],
      },
    ),
    outcome: "El inventario del almacén cuadra: sumas y restas números grandes en columnas y compruebas cada resultado.",
    commonErrors: [
      "Olvidar sumar la llevada en la columna siguiente.",
      "Restar la cifra menor de la mayor en lugar de reagrupar (325 − 148 = 223).",
      "Al pedir prestado a un 0, dejarlo en 10 en lugar de 9.",
      "Sumar 10 arriba y no compensar en la columna siguiente.",
    ],
  }),
];
