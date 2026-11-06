import { defineLesson } from "./defineLesson";
import { columnBugs, columnTrace, fmt, placeName } from "./algorithms/columns";
import { divisionBugs, divisionTrace } from "./algorithms/division";
import { factorTrace } from "./algorithms/factors";
import { divisorText, polynomialText, ruffiniTrace, sg } from "./algorithms/ruffini";
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
      "Sumar y restar números de varias cifras, también con decimales, en columnas, llevando y reagrupando con sentido del valor posicional.",
    purpose:
      "El almacén de la ciudad recibe y despacha miles de piezas. Para llevar la cuenta sin calculadora hay que operar en columnas y saber por qué funciona cada paso.",
    prerequisites: [],
    legacyModuleIds: ["aritmetica-d3"],
    visual: "columns",
    vocabulary: [
      { term: "Valor posicional", meaning: "Una cifra vale distinto según su columna: el 3 de 4 372 vale 300." },
      { term: "Alinear la coma", meaning: "Con decimales, la coma de un número va debajo de la del otro; los decimales que faltan se completan con ceros." },
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
          "Con decimales se alinea la coma: décimas bajo décimas, centésimas bajo centésimas. Si a un número le faltan decimales, se completa con ceros: 3,5 + 1,25 es 3,50 + 1,25.",
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
      columnExample({ op: "subtract", a: 125.5, b: 48.75 }, "Calcula 125,5 − 48,75: alinea la coma y completa con ceros."),
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
      // Litros y soles con decimales: se alinea la coma.
      const [ba, bb] = [[1204, 386], [2315.5, 748.75], [3050, 1275.45], [1432, 965], [4006.25, 2518.5], [2140.85, 876.95]][v];
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
            errors: [{ value: Number((ba + bb).toFixed(2)), feedback: "Sumaste las cantidades. Lo que se usa o se gasta se quita: es una resta." }],
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
        "Primero lo que llega se suma: 2 486 + 1 375 = 3 861 (llevas en las unidades y en las decenas).",
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
  defineLesson({
    id: "division-larga",
    unitId: "numeros",
    title: "La división larga",
    objective:
      "Dividir números de varias cifras entre divisores de una y dos cifras con la división larga, sin olvidar los ceros del cociente y comprobando con el resto.",
    purpose:
      "La planta reparte su producción en cajas, camiones y turnos iguales. Para saber cuánto toca a cada uno y cuánto sobra hay que dividir números grandes con un procedimiento seguro.",
    prerequisites: [],
    legacyModuleIds: ["aritmetica-division-larga"],
    visual: "long-division",
    vocabulary: [
      { term: "Dividendo y divisor", meaning: "En 756 ÷ 3, el dividendo es 756 (lo que se reparte) y el divisor es 3 (en cuántas partes)." },
      { term: "Cociente", meaning: "Cuánto le toca a cada parte: se escribe debajo del divisor, una cifra por cada paso." },
      { term: "Resto", meaning: "Lo que sobra al final. Siempre es menor que el divisor." },
      { term: "Bajar una cifra", meaning: "Escribir junto al resto la cifra siguiente del dividendo para formar el próximo número que se divide." },
    ],
    sections: [
      {
        title: "Se reparte de izquierda a derecha",
        paragraphs: [
          "En la suma se empieza por las unidades; en la división, por las cifras más altas. Primero se reparten las centenas, lo que sobra se cambia por decenas y se reparte con las decenas, y así hasta las unidades.",
          "El primer número que se divide es el más pequeño del principio del dividendo en el que cabe el divisor: en 1 385 ÷ 12, el 1 no alcanza y se empieza con 13.",
        ],
        formula: "756 ÷ 3 → 7 centenas, luego 15 decenas, luego 6 unidades",
      },
      {
        title: "Cabe, multiplica, resta y baja",
        paragraphs: [
          "En cada paso: cuántas veces cabe el divisor sin pasarse (esa es la cifra del cociente), multiplicas, restas y bajas la cifra siguiente junto a lo que sobró.",
          "Puedes escribir cada producto y restarlo debajo, o restar de memoria y escribir solo lo que sobra. Las dos formas son correctas y dan el mismo cociente.",
        ],
        formula: "7 ÷ 3 → 2;  2 × 3 = 6;  7 − 6 = 1;  bajas el 5 → 15",
      },
      {
        title: "El cero del cociente y la comprobación",
        paragraphs: [
          "Si al bajar una cifra el número es menor que el divisor, cabe 0 veces: se escribe 0 en el cociente y se baja la siguiente. En 612 ÷ 6 = 102, sin ese 0 saldría 12, y 12 × 6 = 72, muy lejos de 612.",
          "Al final, el resto siempre es menor que el divisor. Se comprueba multiplicando: cociente × divisor + resto = dividendo.",
        ],
        formula: "dividendo = divisor × cociente + resto,  con resto < divisor",
      },
    ],
    examples: [
      columnExample({ op: "divide", a: 756, b: 3 }, "Calcula 756 ÷ 3 con la división larga."),
      columnExample({ op: "divide", a: 612, b: 6 }, "Calcula 612 ÷ 6: atención al cero del cociente."),
      columnExample({ op: "divide", a: 1385, b: 12 }, "Calcula 1 385 ÷ 12: el divisor tiene dos cifras."),
    ],
    diagnostic: [
      n(
        "d-1",
        "¿Cuánto es 7 × 8?",
        56,
        ["7 × 8 son 7 grupos de 8, así que 7 × 8 = 56.", "Comprobación: 56 ÷ 8 = 7."],
        ["Piensa en 7 grupos de 8.", "7 × 8 = 7 × 10 − 7 × 2.", "70 − 14 = 56."],
      ),
      n(
        "d-2",
        "¿Cuántas veces cabe 6 en 45 sin pasarse?",
        7,
        ["6 × 7 = 42, que no pasa de 45; 6 × 8 = 48 ya se pasa.", "Cabe 7 veces y sobran 45 − 42 = 3."],
        ["Prueba con la tabla del 6.", "6 × 7 = 42 y 6 × 8 = 48.", "Elige el mayor que no pase de 45."],
      ),
      n(
        "d-3",
        "¿Cuánto es 84 ÷ 4?",
        21,
        ["8 decenas entre 4 son 2 decenas.", "4 unidades entre 4 es 1 unidad: 84 ÷ 4 = 21."],
        ["Reparte primero las decenas.", "8 ÷ 4 = 2 decenas.", "Luego 4 ÷ 4 = 1."],
      ),
    ],
    questions(v) {
      const concept = v % 3;
      const [ca, cb] = [[846, 3], [624, 6], [935, 4], [728, 7], [1224, 4], [918, 9]][v];
      const zeroStep = divisionTrace({ op: "divide", a: ca, b: cb }).steps.find((s) => s.index > 0 && s.digit === 0);
      const [wb, wr] = [[7, 9], [8, 11], [6, 8], [9, 12], [5, 7], [4, 6]][v];
      const [da, db] = [[757, 3], [938, 4], [1473, 5], [2189, 6], [879, 7], [3317, 8]][v];
      const [sa, sb] = [[745, 3], [856, 4], [917, 6], [538, 5], [763, 4], [689, 7]][v];
      const [za, zb] = [[612, 6], [1545, 5], [2436, 12], [4818, 6], [7245, 7], [5280, 24]][v];
      const [ea, eb] = [[824, 4], [945, 9], [1236, 6], [721, 7], [816, 8], [2754, 9]][v];
      const [ta, tb] = [[1428, 4], [2345, 5], [3192, 7], [1872, 8], [4956, 6], [2664, 9]][v];
      const [ba, bb] = [[250, 12], [500, 24], [347, 8], [1000, 36], [615, 25], [782, 15]][v];

      // q2: el número que se divide después del primer paso.
      const first = divisionTrace({ op: "divide", a: sa, b: sb }).steps[0];
      const next = first.rest * 10 + first.down!;

      // q4: el cociente sin el cero.
      const omitted = divisionBugs({ op: "divide", a: ea, b: eb }).find((bug) => bug.id === "cero-omitido")!;

      const contexts = [
        { a: "Una imprenta empaca", things: "cuadernos", in: "cajas", ask: "¿Cuántos cuadernos van en cada caja?" },
        { a: "Un club reparte", things: "soles", in: "equipos", ask: "¿Cuántos soles recibe cada equipo?" },
        { a: "Un colegio distribuye", things: "lápices", in: "aulas", ask: "¿Cuántos lápices recibe cada aula?" },
      ][v % 3];
      const boxes = Math.ceil(ba / bb);

      return [
        concept === 0
          ? c(
              "q0",
              `Al calcular ${fmt(ca)} ÷ ${cb}, ¿por qué se empieza por la izquierda, al revés que en la suma?`,
              [
                ["Porque así se escribe más rápido", "La rapidez no es la razón: el orden depende de qué se reparte primero."],
                ["Da igual: se puede empezar por las unidades", "Si empiezas por las unidades no sabes qué sobra de las cifras mayores para juntarlo con ellas."],
                "Porque se reparten primero las cifras más altas y lo que sobra se cambia por unidades menores para el paso siguiente",
              ],
              2,
              "Lo que sobra de las centenas se convierte en decenas y se reparte junto con ellas: por eso se avanza de izquierda a derecha.",
            )
          : concept === 1
            ? c(
                "q0",
                `Al dividir ${fmt(ca)} ÷ ${cb}, en un paso queda ${zeroStep!.part}, que es menor que ${cb}. ¿Qué se hace?`,
                [
                  "Se escribe 0 en el cociente y se baja la cifra siguiente",
                  ["Se baja otra cifra sin escribir nada en el cociente", "Sin ese 0 el cociente pierde una cifra y las demás quedan en una posición que no les corresponde."],
                  ["Se termina la división", "Todavía quedan cifras por bajar: la división termina cuando se usan todas."],
                ],
                0,
                `${cb} cabe 0 veces en ${zeroStep!.part}: ese 0 ocupa su lugar en el cociente, como en ${fmt(ca)} ÷ ${cb} = ${fmt(Math.floor(ca / cb))}.`,
              )
            : c(
                "q0",
                `En una división entre ${wb}, un paso deja un resto de ${wr}. ¿Qué indica?`,
                [
                  ["Que todo va bien: el resto puede ser cualquier número", `El resto siempre es menor que el divisor; ${wr} no puede quedar si se divide entre ${wb}.`],
                  `Que la cifra del cociente se quedó corta: ${wb} todavía cabe una vez más`,
                  ["Que hay que restar el divisor al final", "No se arregla al final: la cifra de ese paso ya está mal y cambia todo lo que sigue."],
                ],
                1,
                `Si sobra ${wr}, que es mayor o igual que ${wb}, cabía una vez más: hay que aumentar en 1 esa cifra del cociente.`,
              ),
        columnar("q1", { op: "divide", a: da, b: db }),
        n(
          "q2",
          `En ${fmt(sa)} ÷ ${sb}, el primer paso deja un resto de ${first.rest} y bajas el ${first.down}. ¿Qué número divides ahora entre ${sb}?`,
          next,
          [
            `La cifra que bajas se escribe a la derecha del resto: ${first.rest} y ${first.down} forman ${next}.`,
            `Es como cambiar el resto por unidades del orden siguiente: ${first.rest} × 10 + ${first.down} = ${next}.`,
          ],
          ["La cifra que bajas se pone al lado del resto.", `El resto ${first.rest} vale ${first.rest} × 10 en la columna siguiente.`, `${first.rest} × 10 + ${first.down}.`],
          {
            step: true,
            errors: [
              { value: first.down!, feedback: "Olvidaste el resto: lo que sobra se junta con la cifra que bajas." },
              { value: first.rest + first.down!, feedback: `No se suman: la cifra se escribe al lado del resto, ${first.rest} × 10 + ${first.down}.` },
            ].filter((e) => e.value !== next),
          },
        ),
        columnar("q3", { op: "divide", a: za, b: zb }),
        c(
          "q4",
          `Un compañero calcula ${fmt(ea)} ÷ ${eb} = ${fmt(omitted.value)}. ¿Qué falla?`,
          [
            ["Nada: el resultado es correcto", `Comprueba multiplicando: ${fmt(omitted.value)} × ${eb} = ${fmt(omitted.value * eb)}, lejos de ${fmt(ea)}.`],
            "Al bajar una cifra que no alcanzaba para el divisor, no escribió 0 en el cociente",
            ["Debía empezar a dividir por las unidades", "La división larga empieza por la izquierda; el problema es una cifra que falta en el cociente."],
          ],
          1,
          `Cada cifra que se baja da una cifra del cociente, aunque sea 0. Por eso ${fmt(ea)} ÷ ${eb} = ${fmt(Math.floor(ea / eb))}.`,
          "concept",
        ),
        columnar(
          "q5",
          { op: "divide", a: ta, b: tb },
          {
            prompt: `${contexts.a} ${fmt(ta)} ${contexts.things} en ${tb} ${contexts.in} iguales. ${contexts.ask}`,
            intent: "transfer",
            unit: contexts.things,
            errors: [
              { value: ta * tb, feedback: "Multiplicaste. Repartir en partes iguales es dividir." },
              { value: ta - tb, feedback: "Restaste. Repartir en partes iguales es dividir." },
            ],
          },
        ),
        n(
          "q6",
          `Hay que guardar ${fmt(ba)} botellas en cajas de ${bb}. ¿Cuántas cajas hacen falta para que no quede ninguna botella fuera?`,
          boxes,
          [
            `${fmt(ba)} ÷ ${bb} da cociente ${Math.floor(ba / bb)} y resto ${ba % bb}.`,
            ba % bb
              ? `Con ${Math.floor(ba / bb)} cajas quedan ${ba % bb} botellas fuera: hace falta una caja más, ${boxes} en total.`
              : `No sobra nada: bastan ${boxes} cajas.`,
            `Comprobación: ${boxes} cajas × ${bb} = ${fmt(boxes * bb)} lugares, suficientes para ${fmt(ba)}.`,
          ],
          ["Divide las botellas entre lo que cabe en una caja.", "Mira el resto: ¿quedan botellas sin caja?", "Si sobra algo, hace falta una caja más."],
          {
            intent: "transfer",
            unit: "cajas",
            errors: [
              { value: Math.floor(ba / bb), feedback: `Con ${Math.floor(ba / bb)} cajas quedan ${ba % bb} botellas fuera: hace falta una caja más para ellas.` },
              { value: ba % bb, feedback: "Ese es el resto: las botellas que sobran, no las cajas." },
            ].filter((e) => e.value !== boxes),
          },
        ),
      ];
    },
    application: n(
      "app",
      "La planta embotelló 9 876 botellas y las empaca en cajas de 24. Una caja solo se despacha si está llena. ¿Cuántas cajas se despachan?",
      411,
      [
        "9 876 ÷ 24: el 9 no alcanza, se empieza con 98. 24 cabe 4 veces (96) y sobran 2; bajas el 7 → 27.",
        "24 cabe 1 vez en 27 y sobran 3; bajas el 6 → 36. 24 cabe 1 vez en 36 y sobran 12.",
        "Cociente 411 y resto 12: se despachan 411 cajas llenas y quedan 12 botellas. Comprobación: 411 × 24 + 12 = 9 876.",
      ],
      ["Divide las botellas entre 24.", "El cociente son las cajas llenas; el resto, las botellas que sobran.", "Una caja con 12 botellas no está llena."],
      {
        intent: "transfer",
        unit: "cajas",
        errors: [
          { value: 412, feedback: "La caja número 412 tendría solo 12 botellas: no está llena y no se despacha." },
          { value: 12, feedback: "Ese es el resto: las botellas que sobran, no las cajas." },
          { value: 41, feedback: "Al cociente le falta una cifra: cada cifra que bajas da una cifra del cociente." },
        ],
      },
    ),
    outcome: "La producción de la planta se reparte sin errores: divides números grandes, cuidas los ceros del cociente y compruebas con el resto.",
    commonErrors: [
      "Olvidar el 0 del cociente cuando la cifra que se baja no alcanza (612 ÷ 6 = 12 en lugar de 102).",
      "Dejar un resto mayor o igual que el divisor.",
      "Dividir cada cifra por separado sin juntar lo que sobra con la cifra siguiente.",
      "Confundir el resto con el cociente en los problemas.",
    ],
  }),
];

/** MCD y MCM con la tabla de descomposición simultánea en factores primos. */
export const FACTOR_LESSONS: Lesson[] = [
  defineLesson({
    id: "mcd-mcm",
    unitId: "numeros",
    title: "Divisores y múltiplos comunes: MCD y MCM",
    objective:
      "Calcular el MCD y el MCM de dos o tres números con la tabla de factores primos y decidir cuál de los dos resuelve un problema.",
    purpose:
      "Los buses de la ciudad coinciden en el paradero cada cierto tiempo y las telas se cortan en trozos iguales sin desperdicio. Para saber cuándo y cuánto hay que encontrar múltiplos y divisores comunes.",
    prerequisites: [],
    legacyModuleIds: ["aritmetica-mcd-mcm"],
    visual: "factor-table",
    vocabulary: [
      { term: "Número primo", meaning: "Solo se divide exactamente entre 1 y sí mismo: 2, 3, 5, 7, 11…" },
      { term: "MCD", meaning: "Máximo común divisor: el mayor número que divide a todos a la vez." },
      { term: "MCM", meaning: "Mínimo común múltiplo: el menor número (distinto de 0) que es múltiplo de todos." },
      { term: "Tabla de factores", meaning: "Los números a la izquierda de una raya; a la derecha, en cada fila, un primo que divide a alguno." },
    ],
    sections: [
      {
        title: "La tabla de factores primos",
        paragraphs: [
          "Se escriben los números a la izquierda de una raya. En cada fila se elige un primo que divida a alguno (empezando por el menor), se divide a los que se pueda y se bajan sin cambiar los demás.",
          "Se sigue hasta que todos los números queden en 1. Si un primo divide a todos los de su fila, se marca: es un factor común.",
        ],
        formula: "12, 18 | 2 → 6, 9 | 2 → 3, 9 | 3 → 1, 3 | 3 → 1, 1",
      },
      {
        title: "MCM: todos los primos",
        paragraphs: [
          "El MCM es el producto de todos los primos de la derecha: en la tabla de 12 y 18, 2 × 2 × 3 × 3 = 36.",
          "Multiplicar los números (12 × 18 = 216) da un múltiplo común, pero no el menor: los factores que comparten se contarían dos veces.",
        ],
        formula: "MCM(12; 18) = 2 × 2 × 3 × 3 = 36",
      },
      {
        title: "MCD: los primos que dividen a todos",
        paragraphs: [
          "Para el MCD basta con dividir entre primos que dividan a todos los números a la vez y parar cuando ya no quede ninguno común: 12, 18 | 2 → 6, 9 | 3 → 2, 3. El MCD es el producto de esos primos, 2 × 3 = 6.",
          "Si ya hiciste la tabla completa hasta 1, también sirve: el MCD es el producto de los primos marcados, los que dividieron a todos.",
          "Para decidir cuál usar: si se busca cuándo vuelven a coincidir cosas que se repiten, es un múltiplo (MCM); si se busca partir en trozos iguales lo más grandes posible, es un divisor (MCD).",
        ],
        formula: "12, 18 | 2 → 6, 9 | 3 → 2, 3 (sin divisor común): MCD = 2 × 3 = 6",
      },
    ],
    examples: [
      columnExample({ op: "mcm", values: [12, 18] }, "Calcula el MCM de 12 y 18 con la tabla y marca los primos comunes."),
      columnExample({ op: "mcd", values: [24, 36, 60] }, "Calcula el MCD de 24, 36 y 60 con la tabla."),
    ],
    diagnostic: [
      c("d-1", "¿Cuál de estos números es divisor de 18?", ["4", "6", "8"], 1, "18 ÷ 6 = 3 exacto; 18 ÷ 4 y 18 ÷ 8 no son exactos."),
      n(
        "d-2",
        "Completa la descomposición: 12 = 2 × 2 × __",
        3,
        ["2 × 2 = 4 y 12 ÷ 4 = 3.", "3 es primo, así que 12 = 2 × 2 × 3."],
        ["Divide 12 entre 2 dos veces.", "12 ÷ 2 = 6 y 6 ÷ 2 = 3.", "Lo que queda es 3."],
      ),
      n(
        "d-3",
        "¿Cuál es el menor número distinto de 0 que es múltiplo de 4 y de 6?",
        12,
        ["Múltiplos de 4 → 4, 8, 12… Múltiplos de 6 → 6, 12…", "El primero que aparece en las dos listas es 12."],
        ["Escribe los primeros múltiplos de 4.", "Escribe los de 6.", "Busca el primero que se repite."],
      ),
    ],
    questions(v) {
      const concept = v % 3;
      const [ca, cb] = [[12, 18], [8, 20], [15, 25], [16, 24], [9, 21], [10, 14]][v];
      const ct = factorTrace({ op: "mcm", values: [ca, cb] });
      const [la, lb] = [[12, 18], [8, 12], [15, 20], [14, 21], [9, 12], [10, 25]][v];
      const [sa, sb] = [[12, 18], [20, 30], [16, 24], [28, 42], [24, 36], [18, 30]][v];
      const dv = [[24, 36], [18, 27], [30, 45, 60], [16, 40], [42, 56], [20, 30, 50]][v];
      const [ea, eb] = [[6, 8], [4, 6], [6, 9], [10, 15], [8, 12], [6, 10]][v];
      const [ba, bb] = [[12, 20], [15, 10], [8, 6], [20, 30], [9, 15], [14, 10]][v];
      const [ra, rb] = [[24, 36], [20, 32], [18, 30], [40, 60], [28, 42], [45, 60]][v];
      const g = factorTrace({ op: "mcd", values: [ra, rb] }).mcd;
      const lcmE = factorTrace({ op: "mcm", values: [ea, eb] }).mcm;
      const things = [
        { what: "Dos buses salen juntos del paradero", a: "uno pasa cada", b: "y el otro cada", unit: "minutos", ask: "¿Cada cuántos minutos vuelven a coincidir?" },
        { what: "Dos faros se encienden a la vez", a: "uno destella cada", b: "y el otro cada", unit: "segundos", ask: "¿Cada cuántos segundos vuelven a destellar juntos?" },
        { what: "Dos alarmas suenan juntas", a: "una suena cada", b: "y la otra cada", unit: "minutos", ask: "¿Cada cuántos minutos vuelven a sonar juntas?" },
      ][v % 3];
      return [
        concept === 0
          ? c(
              "q0",
              `En la tabla de ${ca} y ${cb}, ¿por qué para el MCD solo se multiplican los primos de las filas que dividen a los dos?`,
              [
                ["Porque esos primos son los más pequeños", "No depende del tamaño: depende de que dividan a todos."],
                "Porque el MCD tiene que dividir a los dos números, y solo esos factores los comparten",
                ["Porque los demás primos no son primos", "Todos los de la derecha son primos; lo que cambia es a quién dividen."],
              ],
              1,
              `Un divisor común solo puede tener factores que estén en los dos números: MCD(${ca}; ${cb}) = ${ct.mcd}.`,
            )
          : concept === 1
            ? c(
                "q0",
                `Alguien dice que el MCM de ${ca} y ${cb} es ${ca * cb}, porque ${ca} × ${cb} = ${ca * cb}. ¿Qué opinas?`,
                [
                  ["Tiene razón: el MCM siempre es el producto", `El producto es múltiplo común, pero puede no ser el menor: MCM(${ca}; ${cb}) = ${ct.mcm}.`],
                  ["El MCM es el número mayor de los dos", `${Math.max(ca, cb)} no siempre es múltiplo del otro número.`],
                  `${ca * cb} es múltiplo común, pero no el menor: los factores que comparten se cuentan una vez`,
                ].map((x, i) => (i === 2 && ca * cb === ct.mcm ? `${ca * cb} es el menor: no comparten factores` : x)) as [string, string, string],
                2,
                `MCM(${ca}; ${cb}) = ${ct.mcm}${ca * cb === ct.mcm ? ", igual a su producto porque no comparten factores" : `, menor que ${ca * cb}`}.`,
              )
            : c(
                "q0",
                `Si el MCD de ${ca} y ${cb} fuera 1, ¿qué significaría?`,
                [
                  "Que no comparten ningún factor primo: son primos entre sí",
                  ["Que uno de los dos es 1", "Dos números mayores que 1 pueden tener MCD 1, como 8 y 15."],
                  ["Que su MCM también es 1", "Si el MCD es 1, el MCM es el producto de los dos números, no 1."],
                ],
                0,
                `El MCD es 1 cuando ningún primo divide a los dos a la vez. Aquí MCD(${ca}; ${cb}) = ${ct.mcd}.`,
              ),
        columnar("q1", { op: "mcm", values: [la, lb] }),
        n(
          "q2",
          `En la tabla de ${sa} y ${sb}, la primera fila divide entre 2. ¿Qué número escribes debajo del ${sb}?`,
          sb / 2,
          [
            `2 divide a ${sb}: debajo se escribe el cociente, ${sb} ÷ 2 = ${sb / 2}.`,
            `En la misma fila, debajo de ${sa} va ${sa} ÷ 2 = ${sa / 2}; como 2 divide a los dos, cuenta para el MCD.`,
          ],
          ["Divide el número entre el primo de la fila.", `${sb} ÷ 2.`, `${sb / 2}.`],
          {
            step: true,
            errors: [
              { value: sb, feedback: "El 2 sí divide a ese número: se escribe el cociente, no el mismo número." },
              { value: sb * 2, feedback: "Multiplicaste. En la tabla se divide entre el primo." },
            ],
          },
        ),
        columnar("q3", { op: "mcd", values: dv }),
        c(
          "q4",
          `Un compañero calcula MCM(${ea}; ${eb}) = ${ea * eb}. ¿Qué falla?`,
          [
            ["Nada, el MCM es el producto", `${lcmE} también es múltiplo de los dos y es menor que ${ea * eb}.`],
            ["Debía sumar los números", "El MCM no se calcula sumando."],
            `Multiplicó los números: contó dos veces los factores que comparten; el MCM es ${lcmE}`,
          ],
          2,
          `Con la tabla: MCM(${ea}; ${eb}) = ${lcmE}.`,
          "concept",
        ),
        columnar(
          "q5",
          { op: "mcm", values: [ba, bb] },
          {
            prompt: `${things.what}: ${things.a} ${ba} ${things.unit} ${things.b} ${bb}. ${things.ask}`,
            intent: "transfer",
            unit: things.unit,
            errors: [{ value: factorTrace({ op: "mcd", values: [ba, bb] }).mcd, feedback: "Ese es el MCD. Para saber cuándo vuelven a coincidir se busca un múltiplo común: el MCM." }],
          },
        ),
        n(
          "q6",
          `Se cortan dos cintas de ${ra} cm y ${rb} cm en trozos iguales, lo más largos posible, sin que sobre nada. ¿Cuántos trozos salen en total?`,
          ra / g + rb / g,
          [
            `El largo de cada trozo es un divisor común lo más grande posible: MCD(${ra}; ${rb}) = ${g} cm.`,
            `Trozos: ${ra} ÷ ${g} = ${ra / g} y ${rb} ÷ ${g} = ${rb / g}; en total ${ra / g + rb / g}.`,
          ],
          ["Trozos iguales y lo más largos posible: MCD.", `Calcula MCD(${ra}; ${rb}).`, "Divide cada cinta entre ese largo y suma."],
          {
            intent: "transfer",
            unit: "trozos",
            errors: [
              { value: g, feedback: "Ese es el largo de cada trozo; la pregunta es cuántos trozos salen." },
              { value: factorTrace({ op: "mcm", values: [ra, rb] }).mcm, feedback: "Ese es el MCM. Para partir en trozos iguales se busca un divisor común." },
            ].filter((e) => e.value !== ra / g + rb / g),
          },
        ),
      ];
    },
    application: n(
      "app",
      "Tres semáforos de una avenida cambian a verde a la vez. Uno repite cada 6 minutos, otro cada 8 y otro cada 12. ¿Cada cuántos minutos vuelven a ponerse en verde los tres juntos?",
      24,
      [
        "Se repiten y se busca cuándo coinciden: es el MCM de 6, 8 y 12.",
        "Tabla: 6, 8, 12 | 2 → 3, 4, 6 | 2 → 3, 2, 3 | 2 → 3, 1, 3 | 3 → 1, 1, 1. MCM = 2 × 2 × 2 × 3 = 24.",
        "Comprobación: 24 es múltiplo de 6, de 8 y de 12.",
      ],
      ["¿Se busca un múltiplo o un divisor común?", "Haz la tabla de 6, 8 y 12.", "Multiplica todos los primos de la derecha."],
      {
        intent: "transfer",
        unit: "minutos",
        errors: [
          { value: 576, feedback: "Multiplicaste los tres números: es múltiplo común, pero no el menor." },
          { value: 2, feedback: "Ese es el MCD. Para saber cuándo coinciden se busca el MCM." },
          { value: 48, feedback: "48 es múltiplo de los tres, pero no el menor: revisa la tabla." },
        ],
      },
    ),
    outcome: "Los horarios y los cortes de la ciudad cuadran: calculas MCD y MCM con la tabla y sabes cuál usar en cada problema.",
    commonErrors: [
      "Calcular el MCM multiplicando los números.",
      "Incluir en el MCD primos que no dividen a todos.",
      "Usar el MCM cuando se busca partir en trozos iguales (o el MCD cuando se busca cuándo coinciden).",
      "Dividir entre un número que no es primo en la tabla.",
    ],
  }),
];

const ruf = (coefficients: number[], root: number) => ({ op: "ruffini" as const, coefficients, root });

/** División de polinomios entre (x − r) con la regla de Ruffini. */
export const RUFFINI_LESSONS: Lesson[] = [
  defineLesson({
    id: "ruffini",
    unitId: "expresiones",
    title: "División de polinomios: regla de Ruffini",
    objective:
      "Dividir un polinomio entre (x − r) con la regla de Ruffini, interpretar el cociente y el resto, y usar el teorema del resto para saber si (x − r) es un factor.",
    purpose:
      "Los ingenieros de la ciudad modelan volúmenes y costos con polinomios. Para simplificarlos o saber si un factor encaja, hay que dividirlos con un procedimiento rápido y seguro.",
    prerequisites: ["expresiones-algebraicas"],
    legacyModuleIds: [],
    visual: "ruffini",
    vocabulary: [
      { term: "Coeficiente", meaning: "El número que multiplica a cada potencia de x: en 2x³ − 3x² + 5, son 2, −3, 0 y 5." },
      { term: "Esquina", meaning: "En la tabla de Ruffini, el valor de x que anula el divisor: para (x − 2) es 2; para (x + 3) es −3." },
      { term: "Resto", meaning: "La última casilla de la fila de abajo. Si es 0, (x − r) es un factor del polinomio." },
      { term: "Teorema del resto", meaning: "El resto de dividir P(x) entre (x − r) es P(r)." },
    ],
    sections: [
      {
        title: "Preparar la tabla",
        paragraphs: [
          "Arriba se escriben los coeficientes en orden de grado, de mayor a menor. Si falta un término, se escribe 0 en su lugar: en x³ − 7x + 6 falta x², así que los coeficientes son 1, 0, −7 y 6.",
          "En la esquina va el valor que anula el divisor: para dividir entre (x − 2) se escribe 2; para (x + 3), que es x − (−3), se escribe −3.",
        ],
        formula: "x − r = 0  →  x = r (va en la esquina)",
      },
      {
        title: "Bajar, multiplicar y sumar",
        paragraphs: [
          "Se baja el primer coeficiente. Después, en cada columna, se multiplica la esquina por el número de abajo de la columna anterior, se escribe en la fila del medio y se suma con el coeficiente.",
          "La fila de abajo da los coeficientes del cociente, que tiene un grado menos que el dividendo; la última casilla es el resto.",
        ],
        formula: "(2x³ − 3x² + x + 5) ÷ (x − 2)  →  cociente 2x² + x + 3, resto 11",
      },
      {
        title: "El teorema del resto",
        paragraphs: [
          "El resto de dividir P(x) entre (x − r) es P(r): para (2x³ − 3x² + x + 5) ÷ (x − 2), P(2) = 16 − 12 + 2 + 5 = 11.",
          "Si el resto es 0, (x − r) es un factor: P(x) = (x − r) × cociente. Así se comprueba una división o se busca un factor sin dividir.",
        ],
        formula: "resto de P(x) ÷ (x − r) = P(r)",
      },
    ],
    examples: [
      columnExample(ruf([2, -3, 1, 5], 2), "Divide (2x³ − 3x² + x + 5) ÷ (x − 2) con Ruffini."),
      columnExample(ruf([1, 0, -7, 6], -3), "Divide (x³ − 7x + 6) ÷ (x + 3): falta un término y la esquina es negativa."),
    ],
    diagnostic: [
      n(
        "d-1",
        "¿Cuánto vale 2x² − 3x + 1 cuando x = 2?",
        3,
        ["2 × 2² = 8 y 3 × 2 = 6.", "8 − 6 + 1 = 3."],
        ["Reemplaza x por 2.", "2 × 4 − 3 × 2 + 1.", "8 − 6 + 1."],
      ),
      c("d-2", "¿Cuál es el grado de 3x⁴ − x + 2?", ["1", "3", "4"], 2, "El grado es el mayor exponente de x: 4."),
      n(
        "d-3",
        "¿Cuánto es (−2) × 5 + 3?",
        -7,
        ["Primero se multiplica: un negativo por un positivo da negativo, (−2) × 5 = −10.", "Después se suma: −10 + 3 = −7, porque 3 no alcanza para compensar el −10."],
        ["Primero el producto.", "(−2) × 5 = −10.", "−10 + 3."],
      ),
    ],
    questions(v) {
      const concept = v % 3;
      const [p1, r1] = ([[[2, -3, 1, 5], 2], [[1, 4, -2, 3], 1], [[3, -5, 2, -4], 2], [[1, -2, 4, 1], 3], [[2, 1, -3, 7], -1], [[1, 3, -4, 2], 2]] as [number[], number][])[v];
      const [a0, a1, r2] = [[2, -3, 2], [3, 1, -2], [1, 5, 3], [4, -1, -1], [2, 0, -3], [5, 2, 2]][v];
      const [p3, r3] = ([[[1, 0, -7, 6], -3], [[2, 0, -5, 3], -1], [[1, 0, 0, -8], 2], [[3, 0, -4, 1], -2], [[1, -2, 0, 5], -2], [[2, 0, 1, -3], -1]] as [number[], number][])[v];
      const [p4, k4] = ([[[1, 2, -3, 4], 2], [[2, -1, 0, 3], 1], [[1, -3, 2, -1], 3], [[3, 1, -2, 2], 1], [[1, 0, -3, 5], 2], [[2, 3, -1, 1], 3]] as [number[], number][])[v];
      const [p5, r5] = ([[[1, -6, 11, -6], 1], [[1, 2, -5, -6], 2], [[1, -1, -4, 4], 2], [[2, -3, -2, 1], 1], [[1, 0, -7, 6], 2], [[1, 4, 1, -6], 1]] as [number[], number][])[v];
      const [q6r, q6c] = [[2, -6], [3, -12], [2, -10], [-1, -5], [4, -8], [-2, -6]][v];
      const k6 = -(q6r * q6r + q6c) / q6r;
      const good = ruffiniTrace(ruf(p4, -k4)).remainder;
      const bad = ruffiniTrace(ruf(p4, k4)).remainder;
      const p2 = [a0, a1, 1, -2];
      return [
        concept === 0
          ? c(
              "q0",
              `Para dividir ${polynomialText(p1)} entre (${divisorText(-Math.abs(r1) - 1)}) con Ruffini, ¿qué número va en la esquina?`,
              [
                `${sg(-Math.abs(r1) - 1)}, porque ${divisorText(-Math.abs(r1) - 1)} = 0 cuando x = ${sg(-Math.abs(r1) - 1)}`,
                [`${Math.abs(r1) + 1}, el número que aparece en el divisor`, `Con ${Math.abs(r1) + 1} en la esquina se dividiría entre (x − ${Math.abs(r1) + 1}).`],
                ["El primer coeficiente del polinomio", "El primer coeficiente se baja; en la esquina va el valor que anula el divisor."],
              ],
              0,
              `x + ${Math.abs(r1) + 1} = x − (${sg(-Math.abs(r1) - 1)}): en la esquina va ${sg(-Math.abs(r1) - 1)}.`,
            )
          : concept === 1
            ? c(
                "q0",
                `¿Por qué en la tabla de ${polynomialText(p3)} ÷ (${divisorText(r3)}) hay que escribir un 0 arriba?`,
                [
                  ["Porque la esquina es negativa", "El 0 no depende de la esquina, sino de los términos del polinomio."],
                  "Porque falta un término del polinomio y cada coeficiente tiene que quedar en la columna de su grado",
                  ["Porque el resto siempre es 0", "El resto se calcula; el 0 de arriba es un coeficiente que falta."],
                ],
                1,
                `Los coeficientes de ${polynomialText(p3)} son ${p3.map(sg).join(", ")}: el 0 ocupa el lugar del término que falta.`,
              )
            : c(
                "q0",
                `Sin hacer la tabla, ¿qué indica el teorema del resto sobre ${polynomialText(p1)} ÷ (${divisorText(r1)})?`,
                [
                  ["Que el resto es el término independiente", "Eso solo pasa al dividir entre x (esquina 0)."],
                  ["Que el resto siempre es 0", "Solo es 0 si (x − r) es un factor."],
                  `Que el resto es P(${sg(r1)}): el valor del polinomio cuando x = ${sg(r1)}`,
                ],
                2,
                `Resto de P(x) ÷ (${divisorText(r1)}) = P(${sg(r1)}) = ${sg(ruffiniTrace(ruf(p1, r1)).remainder)}.`,
              ),
        columnar("q1", ruf(p1, r1)),
        n(
          "q2",
          `En la tabla de (${polynomialText(p2)}) ÷ (${divisorText(r2)}), ya bajaste el ${sg(a0)}. ¿Qué número escribes en la fila del medio, debajo del ${sg(a1)}?`,
          r2 * a0,
          [
            `Se multiplica la esquina por el número que acabas de bajar: ${sg(r2)} × ${a0 < 0 ? `(${sg(a0)})` : a0} = ${sg(r2 * a0)}.`,
            `Después se suma con el coeficiente: ${sg(a1)} + ${r2 * a0 < 0 ? `(${sg(r2 * a0)})` : r2 * a0} = ${sg(a1 + r2 * a0)}.`,
          ],
          [`En la esquina va ${sg(r2)}.`, "Multiplica la esquina por el número de abajo.", `${sg(r2)} × ${sg(a0)}.`],
          {
            step: true,
            errors: [
              { value: -r2 * a0, feedback: `Revisa la esquina: para ${divisorText(r2)} es ${sg(r2)}.` },
              { value: a1 + r2 * a0, feedback: "Esa es la suma de la columna; en la fila del medio va el producto." },
            ].filter((e) => e.value !== r2 * a0),
          },
        ),
        columnar("q3", ruf(p3, r3)),
        c(
          "q4",
          `Un compañero divide ${polynomialText(p4)} entre (${divisorText(-k4)}) y escribe ${k4} en la esquina. Le sale resto ${sg(bad)}. ¿Qué falla?`,
          [
            ["Nada: el resto es correcto", `Con ${k4} en la esquina se divide entre (x − ${k4}); el resto correcto es ${sg(good)}.`],
            `En la esquina va ${sg(-k4)}, el valor que anula ${divisorText(-k4)}; el resto correcto es ${sg(good)}`,
            ["Debía restar en lugar de sumar", "En Ruffini se suma; el problema está en la esquina."],
          ],
          1,
          `${divisorText(-k4)} = 0 cuando x = ${sg(-k4)}; por el teorema del resto, el resto es P(${sg(-k4)}) = ${sg(good)}.`,
          "concept",
        ),
        columnar("q5", ruf(p5, r5), {
          prompt: `¿Es (${divisorText(r5)}) un factor de ${polynomialText(p5)}? Divide con Ruffini y escribe el resto (si es 0, sí lo es).`,
          intent: "transfer",
        }),
        n(
          "q6",
          `¿Qué valor de k hace que x² + kx ${q6c < 0 ? `− ${-q6c}` : `+ ${q6c}`} sea divisible entre (${divisorText(q6r)})?`,
          k6,
          [
            `Divisible significa resto 0, y por el teorema del resto el resto es P(${sg(q6r)}).`,
            `P(${sg(q6r)}) = ${q6r * q6r} ${q6r < 0 ? "−" : "+"} ${Math.abs(q6r) === 1 ? "" : Math.abs(q6r)}k ${q6c < 0 ? `− ${-q6c}` : `+ ${q6c}`} = 0, así que k = ${sg(k6)}.`,
            `Comprobación: con k = ${sg(k6)}, P(${sg(q6r)}) = ${q6r * q6r} ${k6 * q6r < 0 ? `− ${-k6 * q6r}` : `+ ${k6 * q6r}`} ${q6c < 0 ? `− ${-q6c}` : `+ ${q6c}`} = 0.`,
          ],
          ["Divisible: el resto tiene que ser 0.", `El resto es P(${sg(q6r)}).`, `Iguala P(${sg(q6r)}) a 0 y despeja k.`],
          {
            intent: "transfer",
            errors: [{ value: -k6, feedback: `Revisa el signo: el resto es P(${sg(q6r)}), con x = ${sg(q6r)}.` }].filter((e) => e.value !== k6),
          },
        ),
      ];
    },
    application: n(
      "app",
      "El volumen de una caja es V(x) = x³ + 6x² + 11x + 6 cm³ y una de sus aristas mide (x + 1) cm. El área de la base es el cociente de dividir V(x) entre (x + 1). ¿Cuánto mide esa área cuando x = 2?",
      20,
      [
        "Ruffini con −1 en la esquina: 1, 6, 11, 6 → 1, 5, 6 y resto 0. Cociente x² + 5x + 6.",
        "Para x = 2 se reemplaza en el cociente → 2² + 5 × 2 + 6 = 4 + 10 + 6 = 20 cm².",
        "Comprobación: V(2) = 60 = (2 + 1) × 20.",
      ],
      ["Divide V(x) entre (x + 1): en la esquina va −1.", "El cociente es x² + 5x + 6.", "Reemplaza x por 2 en el cociente."],
      {
        intent: "transfer",
        unit: "cm²",
        errors: [
          { value: 60, feedback: "Ese es el volumen V(2). El área de la base es el cociente evaluado en x = 2." },
          { value: 36, feedback: "Revisa la esquina: para (x + 1) es −1, no 1." },
          { value: 0, feedback: "Ese es el resto de la división. Se pide el cociente evaluado en x = 2." },
        ],
      },
    ),
    outcome: "Los modelos de la ciudad se simplifican: divides polinomios con Ruffini y reconoces sus factores con el teorema del resto.",
    commonErrors: [
      "Escribir en la esquina el número del divisor con su signo (2 para x + 2).",
      "Olvidar el 0 de un término que falta.",
      "Restar en lugar de sumar en cada columna.",
      "Confundir el cociente con el resto.",
    ],
  }),
];
