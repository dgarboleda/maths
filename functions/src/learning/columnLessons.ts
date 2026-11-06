import { defineLesson } from "./defineLesson";
import { columnBugs, columnTrace, fmt, placeName } from "./algorithms/columns";
import { divisionBugs, divisionTrace } from "./algorithms/division";
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
          "Si al bajar una cifra el número es menor que el divisor, cabe 0 veces: se escribe 0 en el cociente y se baja la siguiente. En 612 ÷ 6 = 102, sin ese 0 saldría 12, que es diez veces menor.",
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
      const [da, db] = [[756, 3], [936, 4], [1470, 5], [2184, 6], [875, 7], [3312, 8]][v];
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
                  ["Se baja otra cifra sin escribir nada en el cociente", "Sin ese 0 el cociente pierde una posición y queda diez veces menor."],
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
