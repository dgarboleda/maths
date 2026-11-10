import { errorFollowup } from "./errorFollowup";
import { defineLesson } from "./defineLesson";
import { fmt } from "./algorithms/columns";
import { divisionTrace, exactPlaces } from "./algorithms/division";
import { fmtProduct, multiplyTrace } from "./algorithms/multiplication";
import { choice as c, columnExample, columnar, numeric as n } from "./questions";
import type { Lesson } from "./types";

/** «2,35» → 2.35 con todas sus cifras (sin errores de coma flotante). */
const dec = (x: number, places: number) => Number(x.toFixed(places));
/** Divisiones con cociente decimal exacto: se calculan tantos decimales como hagan falta. */
const exact = (a: number, b: number) => ({ op: "divide" as const, a, b, places: exactPlaces(a, b, 3) ?? 2 });

/**
 * Multiplicación en columnas: naturales de varias cifras (productos
 * parciales desplazados) y decimales (se multiplica sin coma y se cuentan
 * los decimales de los dos factores).
 */
export const MULTIPLY_COLUMN_LESSONS: Lesson[] = [
  defineLesson({
    id: "multiplicacion-columnas",
    unitId: "numeros",
    title: "Multiplicar en columnas",
    objective:
      "Multiplicar números de varias cifras, también con decimales, en columnas: llevar en cada producto, desplazar cada fila según su posición y colocar la coma contando los decimales.",
    purpose:
      "El almacén compra cajas por docenas y materiales por metros y kilos. Para calcular totales grandes sin calculadora hay que multiplicar en columnas y saber dónde va la coma.",
    prerequisites: ["multiplicacion-grupos"],
    legacyModuleIds: ["aritmetica-mult-varias-cifras"],
    visual: "column-multiplication",
    vocabulary: [
      { term: "Producto parcial", meaning: "El resultado de multiplicar todo el número de arriba por una sola cifra de abajo. Cada uno ocupa una fila." },
      { term: "Desplazar la fila", meaning: "La fila de las decenas empieza una columna a la izquierda (con un 0 en las unidades), porque multiplica por decenas." },
      { term: "Llevada", meaning: "Cuando un producto pasa de 9, se escribe su última cifra y lo demás se suma al producto de la columna siguiente." },
      { term: "Contar los decimales", meaning: "Con decimales, el producto lleva tantas cifras decimales como sumen los dos factores: 2,4 × 0,3 lleva 1 + 1 = 2." },
    ],
    sections: [
      {
        title: "Una cifra de abajo: multiplica y lleva",
        paragraphs: [
          "En 347 × 6 se multiplica cada cifra de arriba por 6, de derecha a izquierda. 6 × 7 = 42: escribes 2 y llevas 4 decenas.",
          "En las decenas, primero se multiplica y después se suma lo que llevabas: 6 × 4 = 24, más 4, son 28. Escribes 8 y llevas 2. Al final, 6 × 3 + 2 = 20. Resultado: 2 082.",
        ],
        formula: "347 × 6 = 2 082  (6 × 4 + 4 = 28 → escribes 8 y llevas 2)",
      },
      {
        title: "Varias cifras: una fila por cifra y se suman",
        paragraphs: [
          "En 347 × 25 se hace una fila por cada cifra de abajo. La del 5 es 347 × 5 = 1 735. La del 2 vale 2 decenas: se escribe un 0 en las unidades y debajo 347 × 2, así queda 6 940.",
          "Después se suman las filas: 1 735 + 6 940 = 8 675. Si abajo hay un 0, su fila serían solo ceros: se omite, pero la fila siguiente se desplaza igual.",
        ],
        formula: "347 × 25 = 347 × 5 + 347 × 20 = 1 735 + 6 940 = 8 675",
      },
      {
        title: "Con decimales: sin coma y se cuentan los decimales",
        paragraphs: [
          "Para multiplicar decimales no se alinea la coma: se escriben los números alineados por la derecha y se multiplican como si no tuvieran coma. 2,4 × 0,3 → 24 × 3 = 72.",
          "El producto lleva tantas cifras decimales como los dos factores juntos: 1 + 1 = 2, así que 0,72. Si no hay cifras suficientes se completan con ceros a la izquierda: 0,2 × 0,3 = 0,06. Estima para comprobar: 2,4 × 0,3 es menos que 1.",
        ],
        formula: "2,4 × 0,3 → 24 × 3 = 72 → 1 + 1 = 2 decimales → 0,72",
      },
    ],
    examples: [
      columnExample({ op: "multiply", a: 347, b: 6 }, "Calcula 347 × 6 en columnas: atención a las llevadas."),
      columnExample({ op: "multiply", a: 347, b: 25 }, "Calcula 347 × 25: una fila por cada cifra de abajo."),
      columnExample({ op: "multiply", a: 1.25, b: 0.4 }, "Calcula 1,25 × 0,4: multiplica sin coma y cuenta los decimales."),
    ],
    diagnostic: [
      n(
        "d-1",
        "¿Cuánto es 8 × 7?",
        56,
        ["8 × 7 son 8 grupos de 7, así que 8 × 7 = 56.", "Comprobación: 56 ÷ 7 = 8, así que el producto es correcto."],
        ["Piensa en 8 grupos de 7.", "8 × 7 = 7 × 10 − 7 × 2.", "70 − 14 = 56."],
      ),
      n(
        "d-2",
        "¿Cuánto es 40 × 6?",
        240,
        ["40 son 4 decenas; 4 decenas × 6 son 24 decenas.", "24 decenas son 240, por eso 40 × 6 = 240."],
        ["40 son 4 decenas.", "4 × 6 = 24.", "24 decenas = 240."],
      ),
      n(
        "d-3",
        "¿Cuánto es 1 735 + 6 940?",
        8675,
        ["Se suman en columnas desde las unidades: 5 + 0 = 5, 3 + 4 = 7 y 7 + 9 = 16 (escribes 6 y llevas 1).", "En los millares, 1 + 6 + 1 = 8: el resultado es 8 675."],
        ["Suma en columnas desde las unidades.", "En las centenas, 7 + 9 = 16: llevas 1.", "1 + 6 + 1 = 8 millares."],
      ),
    ],
    practiceCorrection: errorFollowup("Calcula 1,2 × 0,4.", 0.48, "Multiplicamos 12 × 4 = 48 y contamos dos cifras decimales entre los factores.", "El producto es 0,48; es menor que 1,2 porque tomamos cuatro décimos de esa cantidad."),
    questions(v) {
      const [oa, ob] = [[347, 6], [586, 7], [429, 8], [763, 4], [958, 3], [274, 9]][v];
      const [ta, td] = [[47, 6], [38, 7], [56, 4], [29, 8], [67, 3], [45, 9]][v];
      const [ma, mb] = [[347, 25], [218, 34], [526, 17], [143, 62], [275, 48], [213, 104]][v];
      const [sa, sb] = [[256, 34], [1.5, 0.6], [418, 23], [2.4, 0.5], [327, 46], [3.5, 0.4]][v];
      const [pa, pb] = [[347, 25], [218, 34], [526, 17], [143, 62], [275, 48], [364, 23]][v];
      const contexts = [
        { a: 2.35, b: 14, text: "Cada caja de clavos pesa 2,35 kg. ¿Cuánto pesan 14 cajas?", unit: "kg" },
        { a: 3.75, b: 12, text: "Cada rollo tiene 3,75 m de cable. ¿Cuántos metros hay en 12 rollos?", unit: "m" },
        { a: 1.8, b: 24, text: "Cada botella tiene 1,8 L de agua. ¿Cuántos litros hay en 24 botellas?", unit: "L" },
        { a: 12.5, b: 16, text: "Cada saco de cemento pesa 12,5 kg. ¿Cuánto pesan 16 sacos?", unit: "kg" },
        { a: 4.25, b: 18, text: "Una entrada cuesta 4,25 soles. ¿Cuánto cuestan 18 entradas?", unit: "soles" },
        { a: 0.75, b: 36, text: "Cada vaso lleva 0,75 L de refresco. ¿Cuántos litros hacen falta para 36 vasos?", unit: "L" },
      ][v];

      // q2: la cifra de las decenas tras la llevada de las unidades.
      const carry = Math.floor(((ta % 10) * td) / 10);
      const tens = Math.floor(ta / 10);
      const tensValue = tens * td + carry;

      // q6: mismas cifras, con dos decimales arriba y uno abajo.
      const product = pa * pb;
      const da = dec(pa / 100, 2), db = dec(pb / 10, 1);

      return [
        v % 2 === 0
          ? c(
              "q0",
              `Al calcular ${fmt(ma)} × ${mb}, ¿por qué la fila del ${Math.floor(mb / 10) % 10} empieza una columna más a la izquierda?`,
              [
                ["Para que las filas no se mezclen", "No es por orden: si la fila no se desplaza, el resultado cambia."],
                `Porque ese ${Math.floor(mb / 10) % 10} vale ${Math.floor(mb / 10) % 10} decenas: su producto son decenas`,
                ["Da igual dónde empiece: después se suman", "Al sumar, cada cifra cuenta según su columna: sin desplazar, la fila vale diez veces menos."],
              ],
              1,
              `La cifra de las decenas de ${mb} vale ${(Math.floor(mb / 10) % 10) * 10}, y ${fmt(ma)} × ${(Math.floor(mb / 10) % 10) * 10} = ${fmt(ma * (Math.floor(mb / 10) % 10) * 10)}: por eso su fila termina en 0.`,
            )
          : c(
              "q0",
              `¿Por qué ${fmt(sa)} × ${fmt(sb)} lleva dos cifras decimales, si cada factor solo tiene una?`,
              [
                ["Es un error: debería llevar una, como los factores", `Estima: ${fmt(sa)} × ${fmt(sb)} es menos que ${fmt(sa)}; con un decimal saldría ${fmt(dec(sa * sb * 10, 1))}, demasiado.`],
                ["Porque al multiplicar siempre se añade un decimal", "No siempre: el producto lleva tantos decimales como sumen los factores."],
                "Porque décimas por décimas son centésimas: 1 + 1 = 2 decimales",
              ],
              2,
              `${fmt(sa)} × ${fmt(sb)} = ${Math.round(sa * 10)} décimas × ${Math.round(sb * 10)} décimas = ${Math.round(sa * 10) * Math.round(sb * 10)} centésimas = ${fmtProduct(Math.round(sa * 10) * Math.round(sb * 10), 2)}.`,
            ),
        columnar("q1", { op: "multiply", a: oa, b: ob }),
        n(
          "q2",
          `En ${ta} × ${td}, primero ${td} × ${ta % 10} = ${(ta % 10) * td}: escribes ${((ta % 10) * td) % 10} y llevas ${carry}. ¿Qué número te sale en las decenas antes de escribir su cifra?`,
          tensValue,
          [
            `En las decenas primero se multiplica la cifra de arriba: ${td} × ${tens} = ${tens * td}.`,
            `Después se suma la llevada: ${tens * td} + ${carry} = ${tensValue}. Como no quedan cifras, escribes ${tensValue} y el producto es ${ta * td}.`,
          ],
          ["La llevada se suma después de multiplicar.", `${td} × ${tens} = ${tens * td}.`, `${tens * td} + ${carry}.`],
          {
            step: true,
            errors: [
              { value: (tens + carry) * td, feedback: "Sumaste la llevada antes de multiplicar. Primero se multiplica la cifra de arriba y después se suma lo que llevabas." },
              { value: tens * td, feedback: "Olvidaste sumar la llevada que viene de las unidades." },
            ].filter((e) => e.value !== tensValue),
          },
        ),
        columnar("q3", { op: "multiply", a: ma, b: mb }),
        v % 2 === 0
          ? (() => {
              const wrong = sa * (sb % 10) + sa * Math.floor(sb / 10);
              return c(
                "q4",
                `Un compañero calcula ${fmt(sa)} × ${sb} y obtiene ${fmt(wrong)}: sumó ${fmt(sa * (sb % 10))} + ${fmt(sa * Math.floor(sb / 10))}. ¿Qué falla?`,
                [
                  ["Nada: multiplicó por las dos cifras", `Estima: ${fmt(sa)} × ${sb} es más que ${fmt(sa)} × 10 = ${fmt(sa * 10)}; ${fmt(wrong)} es demasiado poco.`],
                  `La fila del ${Math.floor(sb / 10)} vale decenas: debía desplazarse una columna (${fmt(sa * Math.floor(sb / 10) * 10)})`,
                  ["Debía sumar en lugar de multiplicar", "Es una multiplicación; el fallo está en dónde se escribe la segunda fila."],
                ],
                1,
                `${fmt(sa)} × ${sb} = ${fmt(sa * (sb % 10))} + ${fmt(sa * Math.floor(sb / 10) * 10)} = ${fmt(sa * sb)}.`,
                "concept",
              );
            })()
          : (() => {
              const t = multiplyTrace({ op: "multiply", a: sa, b: sb });
              const wrong = dec(t.product / 10, 1);
              return c(
                "q4",
                `Un compañero calcula ${fmt(sa)} × ${fmt(sb)} = ${wrong.toFixed(1).replace(".", ",")} porque «los dos factores tienen un decimal». ¿Qué falla?`,
                [
                  ["Nada: la coma va donde estaba en los factores", `Estima: ${fmt(sb)} es menos que 1, así que el producto es menor que ${fmt(sa)}.`],
                  ["Debía alinear las comas antes de multiplicar", "En la multiplicación las comas no se alinean: se multiplica sin coma."],
                  `El producto lleva 1 + 1 = 2 cifras decimales: ${t.product} centésimas son ${fmtProduct(t.product, 2)}`,
                ],
                2,
                `Se multiplica sin coma (${t.A} × ${t.B} = ${t.product}) y se separan tantos decimales como sumen los factores: ${fmtProduct(t.product, 2)}.`,
                "concept",
              );
            })(),
        columnar("q5", { op: "multiply", a: contexts.a, b: contexts.b }, {
          prompt: contexts.text,
          intent: "transfer",
          unit: contexts.unit,
          errors: [{ value: dec(contexts.a + contexts.b, 2), feedback: "Sumaste. Muchas veces la misma cantidad es una multiplicación." }],
        }),
        n(
          "q6",
          `Sabiendo que ${fmt(pa)} × ${pb} = ${fmt(product)}, ¿cuánto es ${fmt(da)} × ${fmt(db)}?`,
          dec(product / 1000, 3),
          [
            `Sin coma, ${fmt(da)} × ${fmt(db)} se multiplica igual que ${fmt(pa)} × ${pb}: las cifras del producto son ${fmt(product)}.`,
            `${fmt(da)} tiene 2 cifras decimales y ${fmt(db)} tiene 1: el producto lleva 2 + 1 = 3, así que ${fmtProduct(product, 3)}.`,
            `Estimación: ${fmt(Math.round(da))} × ${fmt(Math.round(db))} = ${Math.round(da) * Math.round(db)}, cerca de ${fmtProduct(product, 3)}.`,
          ],
          ["Las cifras del producto son las mismas.", "Cuenta los decimales de los dos factores.", "Separa 3 cifras desde la derecha."],
          {
            intent: "transfer",
            errors: [
              { value: dec(product / 100, 2), feedback: "Pusiste dos decimales: cuenta los de los dos factores, 2 + 1 = 3." },
              { value: dec(product / 10, 1), feedback: "Pusiste un solo decimal: el producto lleva tantos como sumen los factores, 2 + 1 = 3." },
              { value: product, feedback: "Falta la coma: los factores tienen 3 cifras decimales entre los dos." },
            ],
          },
        ),
      ];
    },
    application: n(
      "app",
      "Un techo tiene 36 filas de 24 paneles solares, y cada panel produce 1,25 kWh al día. ¿Cuántos kWh produce el techo en un día?",
      1080,
      [
        "Primero los paneles: 36 × 24 = 864 (filas del 4 y del 2, desplazada, y se suman: 144 + 720).",
        "Después la energía: 864 × 1,25. Sin coma, 864 × 125 = 108 000, y con 2 decimales queda 1 080,00 = 1 080 kWh.",
        "Estimación: unos 860 paneles por algo más de 1 kWh dan algo más de 860 kWh.",
      ],
      ["Cuenta primero los paneles.", "36 × 24 = 864.", "Multiplica 864 × 1,25 y cuenta los decimales."],
      {
        intent: "transfer",
        unit: "kWh",
        errors: [
          { value: 864, feedback: "Esos son los paneles: falta multiplicar por lo que produce cada uno." },
          { value: 108000, feedback: "Falta la coma: 1,25 tiene dos cifras decimales, así que el producto también." },
          { value: 10800, feedback: "Revisa la coma: separa dos cifras decimales desde la derecha de 108 000." },
        ],
      },
    ),
    outcome: "Los pedidos del almacén cuadran: multiplicas números grandes y decimales en columnas y colocas la coma con seguridad.",
    commonErrors: [
      "Sumar la llevada antes de multiplicar: (4 + 4) × 6 en lugar de 6 × 4 + 4.",
      "No desplazar la fila de las decenas (sumar 1 735 + 694 en 347 × 25).",
      "Poner la coma como en la suma: 1,5 × 0,6 = 9,0 en lugar de 0,90.",
      "Olvidar los ceros a la izquierda cuando faltan cifras decimales (0,2 × 0,3 = 0,06).",
    ],
  }),
];

/**
 * División con decimales en la galera: seguir dividiendo tras la coma
 * añadiendo ceros, dividendo con coma y divisor con coma (se convierte en
 * entero multiplicando los dos por 10, 100…).
 */
export const DECIMAL_DIVISION_LESSONS: Lesson[] = [
  defineLesson({
    id: "division-decimales",
    unitId: "fracciones",
    title: "Dividir con decimales",
    objective:
      "Dividir con la galera hasta obtener un cociente decimal: añadir ceros para seguir repartiendo, colocar la coma en el cociente y convertir un divisor decimal en entero.",
    purpose:
      "En la cooperativa se reparten litros, kilos y metros en partes iguales. Quedarse con el resto no basta: hay que repartirlo también y saber dónde va la coma.",
    prerequisites: ["division-larga", "operaciones-decimales"],
    legacyModuleIds: [],
    visual: "decimal-division",
    vocabulary: [
      { term: "Añadir ceros", meaning: "Escribir ceros a la derecha del dividendo tras la coma: 3 = 3,0 = 3,00. El valor no cambia y se puede seguir dividiendo." },
      { term: "Coma del cociente", meaning: "Se pone en el cociente justo cuando se baja la primera cifra decimal del dividendo." },
      { term: "Divisor entero", meaning: "Si el divisor tiene coma, se multiplican dividendo y divisor por 10, 100… hasta que el divisor sea entero; el cociente no cambia." },
      { term: "División exacta", meaning: "Cuando, añadiendo ceros, el resto llega a 0." },
    ],
    sections: [
      {
        title: "Seguir dividiendo después de la coma",
        paragraphs: [
          "27 ÷ 4 da 6 y sobran 3. Esas 3 unidades se pueden repartir: son 30 décimas. Se escribe la coma en el cociente, se añade un 0 al dividendo y se sigue: 30 ÷ 4 = 7 y sobran 2.",
          "Las 2 décimas que sobran son 20 centésimas: otro 0 y 20 ÷ 4 = 5. El resto es 0, así que 27 ÷ 4 = 6,75. Comprueba: 6,75 × 4 = 27.",
        ],
        formula: "27 ÷ 4 = 6,75  (3 unidades = 30 décimas; 2 décimas = 20 centésimas)",
      },
      {
        title: "Dividendo con coma: la coma sube al cociente",
        paragraphs: [
          "En 38,25 ÷ 5 se divide como siempre: 38 ÷ 5 = 7 y sobran 3. Al bajar el 2, que son décimas, se pone la coma en el cociente: 32 ÷ 5 = 6, sobran 2; bajas el 5 y 25 ÷ 5 = 5. Resultado: 7,65.",
          "Si el divisor no cabe en la parte entera, se escribe 0 en el cociente: en 1,2 ÷ 4, el 4 no cabe en 1, así que va un 0; al bajar el 2 se pone la coma y 12 décimas ÷ 4 = 3 décimas. Resultado: 0,3.",
        ],
        formula: "38,25 ÷ 5 = 7,65;  1,2 ÷ 4 = 0,3",
      },
      {
        title: "Divisor con coma: hazlo entero",
        paragraphs: [
          "Si el divisor tiene coma, se multiplican dividendo y divisor por 10, 100… hasta que el divisor sea entero. Repartir en partes 10 veces más pequeñas da las mismas veces: 7,35 ÷ 0,5 = 73,5 ÷ 5.",
          "Luego se divide como en el caso anterior: 73,5 ÷ 5 = 14,7. Dividir entre un número menor que 1 da un resultado mayor que el dividendo.",
        ],
        formula: "7,35 ÷ 0,5 = 73,5 ÷ 5 = 14,7",
      },
    ],
    examples: [
      columnExample(exact(27, 4), "Calcula 27 ÷ 4 hasta que no sobre nada: añade ceros."),
      columnExample({ op: "divide", a: 38.25, b: 5 }, "Calcula 38,25 ÷ 5: la coma sube al cociente."),
      columnExample({ op: "divide", a: 7.35, b: 0.5 }, "Calcula 7,35 ÷ 0,5: primero haz entero el divisor."),
    ],
    diagnostic: [
      n(
        "d-1",
        "¿Cuánto es 3,6 × 10?",
        36,
        ["Multiplicar por 10 convierte cada décima en una unidad: la coma se mueve una posición a la derecha.", "3,6 × 10 = 36. Comprobación: 36 ÷ 10 = 3,6."],
        ["Multiplicar por 10.", "La coma va una posición a la derecha.", "36."],
      ),
      n(
        "d-2",
        "¿Cuántas veces cabe 4 en 30 sin pasarse?",
        7,
        ["4 × 7 = 28, que no pasa de 30; 4 × 8 = 32 ya se pasa.", "Cabe 7 veces y sobran 30 − 28 = 2."],
        ["Prueba con la tabla del 4.", "4 × 7 = 28 y 4 × 8 = 32.", "Elige el mayor que no pase de 30."],
      ),
      n(
        "d-3",
        "¿Cuánto es 756 ÷ 3?",
        252,
        ["7 centenas entre 3 son 2 y sobra 1; con el 5 forman 15 decenas, que entre 3 son 5.", "Bajas el 6, y 6 ÷ 3 = 2. El cociente es 252 y no sobra nada."],
        ["Reparte primero las centenas.", "Lo que sobra se junta con la cifra siguiente.", "7 → 2, 15 → 5, 6 → 2."],
      ),
    ],
    practiceCorrection: errorFollowup("Calcula 3,6 ÷ 0,6.", 6, "Multiplicamos tanto el dividendo como el divisor por 10 para mantener el cociente.", "La división equivalente es 36 ÷ 6 = 6; comprobamos que 6 × 0,6 = 3,6."),
    questions(v) {
      const [ra, rb] = [[23, 4], [19, 8], [38, 5], [31, 4], [17, 8], [45, 6]][v];
      const [ka, kb, KA, KB] = [[0, 0, 0, 0], [6.3, 0.7, 63, 7], [0, 0, 0, 0], [4.8, 0.06, 480, 6], [0, 0, 0, 0], [2.4, 0.3, 24, 3]][v];
      const [na, nb] = [[27, 4], [33, 8], [46, 5], [51, 4], [39, 8], [57, 6]][v];
      const [sa, sb] = [[29, 4], [17, 8], [38, 5], [45, 4], [13, 8], [33, 6]][v];
      const [da, db] = [[38.25, 5], [9.36, 4], [14.7, 3], [52.8, 6], [0.96, 8], [7.44, 3]][v];
      const [ea, eb] = [[8.64, 4], [4.8, 0.6], [5.25, 5], [3.6, 0.4], [9.12, 3], [7.2, 0.8]][v];
      const [ta, tb] = [[9, 4], [15, 6], [7, 8], [21, 4], [13, 5], [30, 8]][v];
      const [ca, cb] = [[7.2, 0.4], [4.5, 0.15], [9.6, 0.3], [6.3, 0.35], [8.4, 0.12], [5.4, 0.45]][v];
      const share = [
        { what: "L de jugo", in: "jarras", unit: "L" },
        { what: "kg de arroz", in: "bolsas", unit: "kg" },
        { what: "m de cinta", in: "trozos", unit: "m" },
      ][v % 3];

      const rest = sa % sb;
      const q = Math.floor(sa / sb);
      const wrongComma = Number(divisionTrace({ op: "divide", a: ea, b: eb }).steps.map((s) => s.digit).join(""));
      const right = divisionTrace({ op: "divide", a: ea, b: eb }).quotientText;
      const shifted = dec(ea / Math.round(eb * 10), 6);

      return [
        v % 2 === 0
          ? c(
              "q0",
              `Al dividir ${ra} ÷ ${rb} el cociente entero es ${Math.floor(ra / rb)} y sobran ${ra % rb}. ¿Cómo se puede seguir repartiendo?`,
              [
                ["No se puede: la división termina con el resto", `Las ${ra % rb} unidades que sobran también se pueden repartir si se cambian por décimas.`],
                `Se pone la coma en el cociente y se añade un 0, porque ${ra % rb} unidades son ${(ra % rb) * 10} décimas`,
                ["Se vuelve a bajar la última cifra del dividendo", "Cada cifra se baja una sola vez: lo que se baja ahora es un 0 nuevo, tras la coma."],
              ],
              1,
              `${ra} = ${ra},0: las ${ra % rb} unidades que sobran son ${(ra % rb) * 10} décimas, y se siguen repartiendo entre ${rb}.`,
            )
          : c(
              "q0",
              `¿Por qué ${fmt(ka)} ÷ ${fmt(kb)} da lo mismo que ${fmt(KA)} ÷ ${KB}?`,
              [
                ["Porque en la división la coma no importa", `Sí importa: ${fmt(ka)} ÷ ${KB} no da lo mismo; aquí cambian los dos números a la vez.`],
                ["No dan lo mismo: el segundo es mayor", "Los dos números crecen igual, así que el divisor cabe las mismas veces."],
                `Porque dividendo y divisor se multiplicaron por ${fmt(Math.round(KB / kb))}: el divisor cabe las mismas veces`,
              ],
              2,
              `Si dividendo y divisor se multiplican por el mismo número, el cociente no cambia: ${fmt(ka)} ÷ ${fmt(kb)} = ${fmt(KA)} ÷ ${KB} = ${fmt(KA / KB)}.`,
            ),
        columnar("q1", exact(na, nb), {
          prompt: `Calcula ${na} ÷ ${nb} con la galera hasta que no sobre nada.`,
          errors: [{ value: Math.floor(na / nb), feedback: "Te quedaste en el cociente entero: lo que sobra se sigue repartiendo si añades ceros tras la coma." }],
        }),
        n(
          "q2",
          `En ${sa} ÷ ${sb} el cociente entero es ${q} y sobran ${rest}. Pones la coma en el cociente, añades un 0 y lo bajas. ¿Qué número divides ahora entre ${sb}?`,
          rest * 10,
          [
            `Las ${rest} unidades que sobran son ${rest * 10} décimas: el 0 añadido se escribe a la derecha del resto.`,
            `Ahora divides ${rest * 10} ÷ ${sb}: ese reparto da la cifra de las décimas del cociente.`,
          ],
          ["El 0 se escribe al lado del resto.", `${rest} unidades son ${rest * 10} décimas.`, `${rest} × 10.`],
          {
            step: true,
            errors: [
              { value: rest, feedback: "Olvidaste el 0 que bajas: el resto se junta con él y forma un número diez veces mayor." },
              { value: sa * 10, feedback: "No se vuelve a empezar: el 0 se baja junto a lo que sobró." },
            ].filter((e) => e.value !== rest * 10),
          },
        ),
        columnar("q3", { op: "divide", a: da, b: db }),
        v % 2 === 0
          ? c(
              "q4",
              `Un compañero calcula ${fmt(ea)} ÷ ${eb} = ${fmt(wrongComma)}. ¿Qué falla?`,
              [
                ["Nada: los repartos son correctos", `Estima: ${fmt(Math.floor(ea))} ÷ ${eb} es poco más de ${fmt(Math.floor(ea / eb))}; ${fmt(wrongComma)} es demasiado.`],
                `Olvidó la coma: al bajar las décimas del dividendo, se pone en el cociente (${right})`,
                ["Debía multiplicar", `Repartir ${fmt(ea)} en ${eb} partes es dividir; el fallo está en la coma.`],
              ],
              1,
              `Las cifras son correctas, pero al bajar la primera cifra decimal se pone la coma: ${fmt(ea)} ÷ ${eb} = ${right}.`,
              "concept",
            )
          : c(
              "q4",
              `Un compañero calcula ${fmt(ea)} ÷ ${fmt(eb)} así: ${fmt(ea)} ÷ ${Math.round(eb * 10)} = ${fmt(shifted)}. ¿Qué falla?`,
              [
                ["Nada: dividir siempre achica", `Dividir entre un número menor que 1 da más: en ${fmt(ea)} caben muchos ${fmt(eb)}.`],
                ["Debía multiplicar los dos números entre sí", "Se pregunta cuántas veces cabe: es una división."],
                `Multiplicó solo el divisor por 10: también hay que multiplicar el dividendo (${fmt(ea * 10)} ÷ ${Math.round(eb * 10)})`,
              ],
              2,
              `Para no cambiar el cociente, los dos se multiplican por 10, y ${fmt(ea)} ÷ ${fmt(eb)} = ${fmt(ea * 10)} ÷ ${Math.round(eb * 10)} = ${right}.`,
              "concept",
            ),
        columnar("q5", exact(ta, tb), {
          prompt: `Se reparten ${ta} ${share.what} en ${tb} ${share.in} iguales, sin que sobre nada. ¿Cuánto va en cada una?`,
          intent: "transfer",
          unit: share.unit,
          errors: [
            { value: Math.floor(ta / tb), feedback: "Ese es el cociente entero: lo que sobra también se reparte, añadiendo ceros tras la coma." },
            { value: dec(tb / ta, 6), feedback: "Dividiste al revés: lo que se reparte va en el dividendo." },
          ],
        }),
        columnar("q6", { op: "divide", a: ca, b: cb }, {
          prompt: `Una cinta de ${fmt(ca)} m se corta en trozos de ${fmt(cb)} m. ¿Cuántos trozos salen?`,
          intent: "transfer",
          unit: "trozos",
          errors: [{ value: dec(ca * cb, 6), feedback: "Multiplicaste. Para saber cuántos trozos caben, se divide." }],
        }),
      ];
    },
    application: n(
      "app",
      "La cooperativa paga 31,25 soles por 12,5 m de tubo. ¿Cuánto cuesta cada metro?",
      2.5,
      [
        "Precio por metro = precio total ÷ metros: 31,25 ÷ 12,5.",
        "El divisor tiene un decimal: se multiplican los dos por 10 y queda 312,5 ÷ 125.",
        "125 cabe 2 veces en 312 (sobran 62); bajas el 5, que son décimas, y pones la coma: 625 ÷ 125 = 5. Cada metro cuesta 2,5 soles. Comprobación: 2,5 × 12,5 = 31,25.",
      ],
      ["Divide el precio entre los metros.", "Haz entero el divisor: multiplica los dos por 10.", "312,5 ÷ 125."],
      {
        intent: "transfer",
        unit: "soles",
        errors: [
          { value: 25, feedback: "Falta la coma: al bajar el 5 de las décimas, se pone en el cociente." },
          { value: 0.25, feedback: "Multiplicaste solo el divisor por 10: el dividendo también se multiplica." },
          { value: 0.4, feedback: "Dividiste al revés: el precio total va en el dividendo." },
        ],
      },
    ),
    outcome: "Los repartos de la cooperativa salen exactos: sigues dividiendo tras la coma, la colocas bien en el cociente y conviertes el divisor en entero.",
    commonErrors: [
      "Quedarse con el resto en vez de seguir dividiendo con ceros tras la coma.",
      "Olvidar la coma del cociente al bajar la primera cifra decimal (14,7 ÷ 3 = 49).",
      "Multiplicar por 10 solo el divisor y no el dividendo.",
      "No escribir el 0, del cociente cuando el divisor no cabe en la parte entera (1,2 ÷ 4 = 0,3).",
    ],
  }),
];
