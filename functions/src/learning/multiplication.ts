import { defineLesson } from "./defineLesson";
import { choice as c, example, numeric as n } from "./questions";
import type { Lesson } from "./types";

/** «4 + 4 + 4» para mostrar la suma repetida que abrevia un producto. */
function repeated(times: number, size: number): string {
  return Array.from({ length: times }, () => String(size)).join(" + ");
}

/** Sumas parciales al contar fila por fila: «6, 12, 18». */
function runningTotals(times: number, size: number): string {
  return Array.from({ length: times }, (_, i) => String((i + 1) * size)).join(", ");
}

/**
 * Base de primaria: la multiplicación como grupos iguales y como filas y
 * columnas. Clase base opcional (ver `PERU_MAP`), con tutor visual guiado
 * en el navegador que no cuenta como comprobación.
 */
export const MULTIPLICATION_LESSONS: Lesson[] = [
  defineLesson({
    id: "multiplicacion-grupos",
    unitId: "numeros",
    title: "Multiplicar con grupos iguales",
    objective:
      "Interpretar la multiplicación como grupos iguales y como filas y columnas, usar que el orden de los factores no cambia el producto y separar un factor para calcular.",
    purpose:
      "La ciudad instala paneles solares en filas iguales, llena cajas y ordena sillas. Contar uno por uno es lento: con grupos iguales se cuenta mucho más rápido y sin errores.",
    prerequisites: [],
    legacyModuleIds: [],
    visual: "equal-groups",
    vocabulary: [
      { term: "Grupos iguales", meaning: "Colecciones que tienen la misma cantidad: 3 cajas con 4 mangos cada una." },
      { term: "Factor", meaning: "Cada número que se multiplica. En 3 × 4, los factores son 3 (cuántos grupos) y 4 (cuánto tiene cada grupo)." },
      { term: "Producto", meaning: "El resultado de multiplicar: el total de elementos. En 3 × 4 = 12, el producto es 12." },
      { term: "Arreglo", meaning: "Elementos ordenados en filas y columnas iguales, como paneles en un techo o sillas en un auditorio." },
    ],
    sections: [
      {
        title: "Grupos iguales",
        paragraphs: [
          "3 × 4 se lee «3 veces 4»: hay 3 grupos y cada grupo tiene 4 elementos. El total es 4 + 4 + 4 = 12.",
          "Multiplicar solo tiene sentido cuando los grupos son iguales. Si una caja tiene 3 mangos y otra 5, se suma 3 + 5; no se multiplica.",
        ],
        formula: "3 × 4 = 4 + 4 + 4 = 12",
      },
      {
        title: "Filas y columnas: el orden no cambia el total",
        paragraphs: [
          "Si los paneles se ordenan en 3 filas de 4, también forman 4 columnas de 3. Son los mismos paneles contados de dos maneras.",
          "Por eso 3 × 4 = 4 × 3. Conviene usar el orden que haga la cuenta más fácil: 9 × 2 se piensa mejor como 2 × 9, el doble de 9.",
        ],
        formula: "3 × 4 = 4 × 3 = 12",
      },
      {
        title: "Separar para multiplicar",
        paragraphs: [
          "Un arreglo grande se puede partir en dos más pequeños. 6 filas de 7 son 6 filas de 5 y 6 filas de 2, puestas lado a lado.",
          "Se multiplica cada parte y se suman los resultados: 6 × 5 = 30 y 6 × 2 = 12, así que 6 × 7 = 42. Así se usan productos que ya conoces.",
        ],
        formula: "6 × 7 = 6 × 5 + 6 × 2 = 30 + 12 = 42",
      },
    ],
    examples: [
      example(
        "Una huerta tiene 4 hileras con 6 plantas cada una. ¿Cuántas plantas hay?",
        [
          ["4 grupos de 6", "Cada hilera es un grupo y todas tienen la misma cantidad de plantas."],
          ["6 + 6 + 6 + 6", "Sumar el mismo número 4 veces es lo que abrevia la multiplicación 4 × 6."],
          ["6, 12, 18, 24", "Contando de 6 en 6, una vez por hilera, se llega al total sin contar planta por planta."],
        ],
        "4 × 6 = 24 plantas.",
      ),
      example(
        "En un auditorio hay 8 filas de 3 sillas. ¿Cuántas sillas hay? Usa el orden más cómodo.",
        [
          ["8 × 3 = 3 × 8", "Girar el arreglo convierte 8 filas de 3 en 3 filas de 8: son las mismas sillas."],
          ["8 + 8 + 8", "Sumar tres veces 8 es más corto que sumar ocho veces 3."],
          ["24", "8 + 8 = 16 y 16 + 8 = 24."],
        ],
        "8 × 3 = 3 × 8 = 24 sillas.",
      ),
      example(
        "Calcula 7 × 6 separando el 6 en 5 + 1.",
        [
          ["7 × 6 = 7 × 5 + 7 × 1", "6 columnas son 5 columnas y 1 columna más: se calcula cada parte por separado."],
          ["7 × 5 = 35 y 7 × 1 = 7", "Son productos más sencillos que ya se conocen."],
          ["35 + 7 = 42", "Se juntan las dos partes del arreglo para obtener el total."],
        ],
        "7 × 6 = 42.",
      ),
    ],
    diagnostic: [
      c("d-1", "¿Cuánto es 4 + 4 + 4?", ["8", "12", "444"], 1, "Son tres cuatros: 4 + 4 = 8 y 8 + 4 = 12."),
      n(
        "d-2",
        "Al contar de 5 en 5 se dice 5, 10, 15, 20… ¿Qué número sigue?",
        25,
        ["Al contar de 5 en 5, cada número es 5 más que el anterior: 10 es 5 + 5 y 15 es 10 + 5.", "Después de 20 viene 20 + 5 = 25."],
        ["Mira cuánto aumenta cada número.", "Cada salto suma 5.", "20 + 5."],
      ),
      c(
        "d-3",
        "¿Cuál de estas colecciones está formada por grupos iguales?",
        ["Una bolsa con 3 caramelos y otra con 5", "3 bolsas con 5 caramelos cada una", "5 bolsas con cantidades distintas"],
        1,
        "Hay grupos iguales cuando cada grupo tiene la misma cantidad: 3 bolsas de 5 caramelos.",
      ),
    ],
    questions(v) {
      const concept = v % 3;
      const [ca, cb] = [[3, 4], [5, 2], [4, 6], [2, 7], [6, 3], [3, 8]][v];
      const [pa, pb] = [[3, 6], [4, 7], [6, 5], [7, 4], [5, 8], [8, 3]][v];
      const [sr, sc, sk] = [[4, 6, 2], [5, 7, 3], [6, 8, 4], [5, 9, 2], [7, 6, 5], [4, 9, 2]][v];
      const [da, db, d1] = [[6, 7, 5], [7, 8, 5], [8, 6, 5], [9, 7, 5], [4, 9, 5], [7, 9, 5]][v];
      const d2 = db - d1;
      const [ea, eb] = [[3, 5], [4, 6], [6, 3], [5, 4], [7, 2], [2, 9]][v];
      const [ta, tb] = [[6, 4], [7, 5], [8, 4], [9, 3], [6, 7], [4, 8]][v];
      const [it, ic] = [[24, 6], [35, 5], [42, 7], [36, 4], [45, 9], [32, 8]][v];
      const rows = it / ic;

      const contexts = [
        { setup: `Un mercado recibe ${ta} cajas con ${tb} mangos en cada una.`, ask: "¿Cuántos mangos llegan?", unit: "mangos", group: "cajas", item: "mangos" },
        { setup: `Una profesora reparte ${ta} paquetes con ${tb} lápices cada uno.`, ask: "¿Cuántos lápices reparte?", unit: "lápices", group: "paquetes", item: "lápices" },
        { setup: `Un estadio tiene ${ta} bancas y en cada una se sientan ${tb} personas.`, ask: "¿Cuántas personas pueden sentarse?", unit: "personas", group: "bancas", item: "personas" },
      ][v % 3];

      return [
        concept === 0
          ? c(
              "q0",
              `En una instalación de paneles, ¿qué representa ${ca} × ${cb}?`,
              [
                `${ca} filas con ${cb} paneles en cada una`,
                [`Una fila de ${ca} paneles y otra de ${cb}`, `Eso es ${ca} + ${cb}: dos grupos distintos que se suman, no grupos iguales.`],
                [`${ca}${cb} paneles, uno al lado del otro`, "Juntar las cifras forma otro número; la multiplicación cuenta grupos iguales."],
              ],
              0,
              `${ca} × ${cb} son ${ca} grupos iguales de ${cb}, es decir, ${repeated(ca, cb)} = ${ca * cb}.`,
            )
          : concept === 1
            ? c(
                "q0",
                `¿Por qué ${ca} × ${cb} se puede calcular como ${repeated(ca, cb)}?`,
                [
                  ["Porque multiplicar es sumar los dos factores", `Sumar los factores da ${ca + cb}; multiplicar repite un grupo varias veces.`],
                  [`Solo funciona porque ${ca} y ${cb} son números pequeños`, "Funciona con cualquier número: un producto siempre abrevia una suma de grupos iguales."],
                  `Porque son ${ca} grupos iguales de ${cb}, y cada grupo se suma una vez`,
                ],
                2,
                `${ca} × ${cb} significa ${ca} veces ${cb}, es decir, ${repeated(ca, cb)} = ${ca * cb}.`,
              )
            : c(
                "q0",
                `Una instalación tiene ${ca} filas de ${cb} paneles. Si se gira, quedan ${cb} filas de ${ca}. ¿Qué pasa con el total?`,
                [
                  ["Aumenta, porque ahora hay más filas", "Hay más filas, pero cada una tiene menos paneles: los paneles son los mismos."],
                  "No cambia: son los mismos paneles contados por columnas",
                  ["Hay que volver a contar porque puede cambiar", "Girar no añade ni quita paneles; solo cambia la forma de contarlos."],
                ],
                1,
                `${ca} × ${cb} = ${cb} × ${ca} = ${ca * cb}: el orden de los factores no cambia el producto.`,
              ),
        n(
          "q1",
          `Calcula ${pa} × ${pb} pensando en ${pa} grupos de ${pb}.`,
          pa * pb,
          [
            `${pa} grupos de ${pb} se escriben como la suma ${repeated(pa, pb)}.`,
            `Contando de ${pb} en ${pb}, una vez por grupo: ${runningTotals(pa, pb)}. El total es ${pa * pb}.`,
          ],
          [`¿Cuántos grupos hay y cuánto tiene cada uno?`, `Suma ${pb} tantas veces como grupos hay.`, `Cuenta de ${pb} en ${pb} → ${pb}, ${2 * pb}, …`],
          {
            errors: [
              { value: pa + pb, feedback: `Sumaste los factores. ${pa} × ${pb} son ${pa} grupos de ${pb}: hay que sumar ${pb} varias veces.` },
              { value: (pa - 1) * pb, feedback: `Te falta un grupo: cuenta ${pa} grupos de ${pb}.` },
            ],
          },
        ),
        n(
          "q2",
          `Cuentas ${sr} filas de ${sc} paneles fila por fila. Después de ${sk} filas llevas ${sk * sc}. ¿Cuánto llevas al sumar la fila siguiente?`,
          (sk + 1) * sc,
          [
            `Cada fila añade el mismo número de paneles: ${sc}.`,
            `${sk * sc} + ${sc} = ${(sk + 1) * sc}, que son ${sk + 1} filas de ${sc}.`,
          ],
          ["Cada fila tiene la misma cantidad de paneles.", `La fila siguiente añade ${sc}.`, `${sk * sc} + ${sc}.`],
          {
            step: true,
            errors: [
              { value: sk * sc + 1, feedback: "Sumaste un solo panel; la fila completa tiene más." },
              { value: sr * sc, feedback: "Ese es el total de todas las filas. Pregunta cuánto llevas tras sumar solo una fila más." },
            ],
          },
        ),
        n(
          "q3",
          `Calcula ${da} × ${db} separando el ${db} en ${d1} + ${d2}.`,
          da * db,
          [
            `${da} × ${db} = ${da} × ${d1} + ${da} × ${d2}: el arreglo se parte en dos más pequeños.`,
            `${da} × ${d1} = ${da * d1} y ${da} × ${d2} = ${da * d2}.`,
            `Se juntan las dos partes: ${da * d1} + ${da * d2} = ${da * db}.`,
          ],
          [`Parte las ${db} columnas en ${d1} y ${d2}.`, `Calcula ${da} × ${d1} y ${da} × ${d2}.`, "Suma los dos resultados."],
          {
            errors: [
              { value: da * d1 + d2, feedback: `Multiplicaste solo la primera parte. También hay que calcular ${da} × ${d2}.` },
              { value: da * d1, feedback: `Falta la segunda parte del arreglo: ${da} × ${d2}.` },
            ],
          },
        ),
        c(
          "q4",
          `Un compañero dice que ${ea} filas de ${eb} paneles son ${ea + eb} paneles. ¿Qué falla?`,
          [
            ["Nada: el resultado es correcto", `Cuenta por filas: ${repeated(ea, eb)} no da ${ea + eb}.`],
            [`Debía restar: ${Math.max(ea, eb)} − ${Math.min(ea, eb)}`, "Juntar filas iguales aumenta el total; restar no cuenta los paneles."],
            `Sumó los factores; son ${ea} grupos de ${eb}, así que se multiplica: ${ea} × ${eb}`,
          ],
          2,
          `${ea} filas de ${eb} son ${repeated(ea, eb)} = ${ea} × ${eb} = ${ea * eb} paneles.`,
          "concept",
        ),
        n(
          "q5",
          `${contexts.setup} ${contexts.ask}`,
          ta * tb,
          [
            `Hay ${ta} ${contexts.group} iguales con ${tb} ${contexts.item} cada una: ${ta} × ${tb}.`,
            `${ta} × ${tb} = ${tb} × ${ta} = ${ta * tb}.`,
          ],
          [`Cada uno de los ${contexts.group} es un grupo igual.`, `Son ${ta} grupos de ${tb}.`, `Calcula ${ta} × ${tb}; puedes cambiar el orden.`],
          {
            intent: "transfer",
            unit: contexts.unit,
            errors: [{ value: ta + tb, feedback: `Sumaste las dos cantidades. Son ${ta} grupos iguales de ${tb}: se multiplica.` }],
          },
        ),
        n(
          "q6",
          `Se instalan ${it} paneles en filas de ${ic}. ¿Cuántas filas se forman?`,
          rows,
          [
            `Buscas cuántas filas de ${ic} hacen ${it}: ? × ${ic} = ${it}.`,
            `Cuentas de ${ic} en ${ic} → ${runningTotals(rows, ic)}. Son ${rows} filas.`,
            `Comprobación: ${rows} × ${ic} = ${it}.`,
          ],
          [`Cada fila tiene ${ic} paneles.`, `¿Cuántas veces ${ic} hacen ${it}?`, `Cuenta de ${ic} en ${ic} hasta llegar a ${it}.`],
          {
            intent: "transfer",
            errors: [
              { value: it - ic, feedback: `Restaste una sola fila. Busca cuántas filas de ${ic} hacen ${it}.` },
              { value: it * ic, feedback: `Multiplicaste los dos números. Ya sabes el total: busca cuántas filas de ${ic} lo forman.` },
            ].filter((e) => e.value !== rows),
          },
        ),
      ];
    },
    application: n(
      "app",
      "La ciudad instala paneles solares en 4 techos. En cada techo caben 3 filas de 6 paneles. ¿Cuántos paneles instala en total?",
      72,
      [
        "En un techo hay 3 filas de 6, así que 3 × 6 = 18 paneles.",
        "Hay 4 techos iguales de 18 paneles: 4 × 18 = 18 + 18 + 18 + 18 = 72.",
        "Otra forma: 4 × 18 = 4 × 10 + 4 × 8 = 40 + 32 = 72.",
      ],
      ["Primero calcula cuántos paneles caben en un techo.", "3 × 6 = 18 paneles por techo.", "Ahora son 4 grupos iguales de 18."],
      {
        intent: "transfer",
        unit: "paneles",
        errors: [
          { value: 18, feedback: "Esos son los paneles de un solo techo; hay 4 techos iguales." },
          { value: 13, feedback: "Sumaste 4 + 3 + 6. Hay grupos iguales dentro de grupos iguales: se multiplica." },
          { value: 24, feedback: "Calculaste 4 × 6: faltan las 3 filas de cada techo." },
        ],
      },
    ),
    outcome: "Los paneles de la ciudad quedan contados: reconoces grupos iguales, multiplicas en el orden más cómodo y separas un factor cuando el producto es grande.",
    commonErrors: [
      "Sumar los factores en lugar de multiplicarlos (3 filas de 4 = 7).",
      "Multiplicar cuando los grupos no son iguales.",
      "Al separar un factor, multiplicar solo una de las partes (6 × 7 = 6 × 5 + 2).",
      "Creer que girar el arreglo cambia el total.",
    ],
  }),
];
