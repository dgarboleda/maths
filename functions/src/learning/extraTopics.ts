import { defineLesson } from "./defineLesson";
import { choice as c, example as ex, numeric as n } from "./questions";
import type { Lesson } from "./types";

const fmt = (x: number) => x.toLocaleString("es", { maximumFractionDigits: 6 });
/** Redondea a 6 decimales para evitar restos de coma flotante (0,1 × 3). */
const r6 = (x: number) => Math.round(x * 1e6) / 1e6;
const sg = (x: number) => (x < 0 ? `−${-x}` : `${x}`);
const sup = (k: number) =>
  String(k)
    .split("")
    .map((d) => (d === "-" ? "⁻" : "⁰¹²³⁴⁵⁶⁷⁸⁹"[Number(d)]))
    .join("");
const pow10 = (k: number) => `10${sup(k)}`;

export const NUMBER_EXTRA_LESSONS: Lesson[] = [
  defineLesson({
    id: "notacion-cientifica",
    unitId: "numeros",
    title: "Notación científica",
    objective:
      "Escribir, comparar y multiplicar números muy grandes o muy pequeños en notación científica.",
    purpose:
      "Los informes de la central hablan de millones de vatios y de milésimas de segundo. La notación científica permite leerlos y compararlos sin contar ceros.",
    prerequisites: ["potencias-raices"],
    legacyModuleIds: ["aritmetica-notacion-cientifica", "aritmetica-potencias"],
    visual: "integers",
    vocabulary: [
      { term: "Notación científica", meaning: "Escritura a × 10ⁿ con 1 ≤ a < 10 y n entero." },
      { term: "Exponente negativo", meaning: "10⁻³ = 1/1000 = 0,001: indica posiciones a la derecha de la coma." },
    ],
    sections: [
      {
        title: "Un número entre 1 y 10 por una potencia de 10",
        paragraphs: [
          "45 000 000 = 4,5 × 10 000 000 = 4,5 × 10⁷. El primer factor está entre 1 y 10; el exponente cuenta cuántas posiciones se movió la coma.",
          "32 × 10⁶ vale lo mismo que 3,2 × 10⁷, pero solo la segunda está en notación científica: 32 no está entre 1 y 10.",
        ],
        formula: "45 000 000 = 4,5 × 10⁷",
      },
      {
        title: "Números pequeños: exponente negativo",
        paragraphs: [
          "0,00052 = 5,2 × 10⁻⁴: la coma se movió cuatro posiciones a la derecha para llegar a 5,2.",
          "Un exponente negativo no hace el número negativo: 10⁻⁴ = 1/10 000, un número positivo muy pequeño.",
        ],
        formula: "0,00052 = 5,2 × 10⁻⁴",
      },
      {
        title: "Comparar y multiplicar",
        paragraphs: [
          "Para comparar, mira primero el exponente: 2 × 10⁵ > 9 × 10⁴, porque 10⁵ es diez veces 10⁴.",
          "Para multiplicar, multiplica los factores y suma los exponentes: (3 × 10⁴)(5 × 10²) = 15 × 10⁶ = 1,5 × 10⁷. Si el factor pasa de 10, se ajusta.",
        ],
        formula: "(a × 10ᵐ)(b × 10ⁿ) = (a × b) × 10ᵐ⁺ⁿ",
      },
    ],
    examples: [
      ex("Escribe 6 300 000 en notación científica.", [
        ["6,3", "Colocamos la coma después de la primera cifra no nula."],
        ["La coma se movió 6 posiciones", "Desde el final del número hasta después del 6."],
        ["6,3 × 10⁶", "Comprobación: 6,3 × 1 000 000 = 6 300 000."],
      ], "6 300 000 = 6,3 × 10⁶."),
      ex("Multiplica (4 × 10³) × (5 × 10⁴).", [
        ["4 × 5 = 20", "Multiplicamos los factores."],
        ["10³ × 10⁴ = 10⁷", "Sumamos los exponentes."],
        ["20 × 10⁷ = 2 × 10⁸", "Ajustamos: 20 = 2 × 10."],
      ], "El resultado es 2 × 10⁸."),
    ],
    diagnostic: [
      n("d-1", "¿Cuánto es 10⁴?", 10000, ["10 × 10 × 10 × 10 = 10 000."], ["Cuenta los factores 10.", "Son cuatro.", "10 000."]),
      n("d-2", "¿Cuánto es 3,7 × 100?", 370, ["Multiplicar por 100 desplaza la coma dos posiciones."], ["Multiplicar por 100.", "La coma se mueve a la derecha.", "370."]),
      c("d-3", "¿Cuál es mayor?", ["0,01", "0,001", "Son iguales"], 0, "0,01 son diez milésimas; 0,001, una."),
    ],
    questions(v) {
      const [big, bigExp] = [[45, 7], [63, 6], [82, 8], [27, 5], [91, 9], [36, 7]][v],
        bigValue = big * 10 ** (bigExp - 1),
        [coef, e3] = [[4.7, 3], [2.05, 4], [8.1, 2], [6.3, 5], [1.9, 3], [7.25, 4]][v],
        [small, smallExp] = [[52, -4], [37, -3], [81, -5], [26, -2], [44, -5], [93, -3]][v],
        smallValue = r6(small * 10 ** (smallExp - 1)),
        [a, ea, b, eb] = [[2, 3, 3, 4], [4, 5, 2, 2], [3, 6, 5, 3], [6, 2, 4, 5], [2, 7, 7, 1], [5, 4, 8, 3]][v],
        prod = a * b,
        prodExp = ea + eb + (prod >= 10 ? 1 : 0);
      return [
        v % 2 === 0
          ? c(
              "q0",
              `¿Qué significa ${fmt(coef)} × ${pow10(e3)}?`,
              [
                [`${fmt(coef)} multiplicado por 10, ${e3} veces seguidas sumado`, "La potencia de 10 multiplica: no se suma."],
                `${fmt(coef)} multiplicado por ${fmt(10 ** e3)}`,
                [`${fmt(coef)} seguido de ${e3} ceros`, `Con decimales no basta añadir ceros: la coma se mueve ${e3} posiciones.`],
              ],
              1,
              `${pow10(e3)} = ${fmt(10 ** e3)}; multiplicar por él desplaza la coma ${e3} posiciones a la derecha.`,
            )
          : c(
              "q0",
              `¿Por qué ${big} × ${pow10(bigExp - 2)} no está en notación científica?`,
              [
                ["Porque el exponente es demasiado pequeño", "El exponente puede ser cualquier entero."],
                [`Porque ${big} × ${pow10(bigExp - 2)} vale otra cantidad`, "Vale lo mismo; el problema es la forma."],
                `Porque ${big} no está entre 1 y 10; la forma correcta es ${fmt(big / 10)} × ${pow10(bigExp - 1)}`,
              ],
              2,
              "En notación científica, el primer factor cumple 1 ≤ a < 10.",
            ),
        n(
          "q1",
          `Escribe ${fmt(bigValue)} como ${fmt(big / 10)} × 10 elevado a n. ¿Cuánto vale n?`,
          bigExp,
          [`${fmt(bigValue)} = ${fmt(big / 10)} × ${fmt(10 ** bigExp)}.`, `${fmt(10 ** bigExp)} = ${pow10(bigExp)}: n = ${bigExp}.`],
          ["Cuenta cuántas posiciones se mueve la coma.", `Desde el final hasta después del ${String(big)[0]}.`, `n = ${bigExp}.`],
          { errors: [{ value: bigExp + 1, feedback: "Contaste todas las cifras. El exponente es el número de cifras menos una." }] },
        ),
        n(
          "q2",
          `Completa: ${fmt(coef)} × ${pow10(e3)} = __.`,
          r6(coef * 10 ** e3),
          [`Multiplicar por ${fmt(10 ** e3)} desplaza la coma ${e3} posiciones: ${fmt(r6(coef * 10 ** e3))}.`],
          ["Mueve la coma a la derecha.", `Son ${e3} posiciones.`, `${fmt(r6(coef * 10 ** e3))}.`],
          { step: true, errors: [{ value: r6(coef * 10 ** (e3 - 1)), feedback: "Moviste la coma una posición menos." }] },
        ),
        n(
          "q3",
          `Escribe ${fmt(smallValue)} como ${fmt(small / 10)} × 10 elevado a n. ¿Cuánto vale n?`,
          smallExp,
          [`La coma se mueve ${-smallExp} posiciones a la derecha hasta ${fmt(small / 10)}.`, `n = ${sg(smallExp)}.`],
          ["Es un número menor que 1: el exponente será negativo.", "Cuenta las posiciones hasta después de la primera cifra no nula.", `n = ${sg(smallExp)}.`],
          { errors: [{ value: -smallExp, feedback: "Un número menor que 1 lleva exponente negativo." }] },
        ),
        c(
          "q4",
          `¿Cuál es mayor: ${a} × ${pow10(-ea)} o ${b} × ${pow10(-ea - 1)}?`,
          [
            `${a} × ${pow10(-ea)}`,
            [`${b} × ${pow10(-ea - 1)}`, `Su exponente es menor: ${pow10(-ea - 1)} es diez veces más pequeño que ${pow10(-ea)}.`],
            ["Son iguales", "Los exponentes son distintos: compáralos primero."],
          ],
          0,
          `Compara primero los exponentes: ${pow10(-ea)} > ${pow10(-ea - 1)}, y ambos factores están entre 1 y 10.`,
        ),
        n(
          "q5",
          `La central A produce ${a} × ${pow10(ea)} W y funciona ${b} × ${pow10(eb)} s. La energía es potencia × tiempo. Escribe el resultado en notación científica: ¿cuál es el exponente?`,
          prodExp,
          [`${a} × ${b} = ${prod}; ${pow10(ea)} × ${pow10(eb)} = ${pow10(ea + eb)}.`, prod >= 10 ? `${prod} × ${pow10(ea + eb)} = ${fmt(prod / 10)} × ${pow10(prodExp)}.` : `Resultado: ${prod} × ${pow10(prodExp)}.`],
          ["Multiplica los factores y suma los exponentes.", `${a} × ${b} = ${prod}.`, prod >= 10 ? "El factor pasa de 10: ajústalo." : "El factor ya está entre 1 y 10."],
          {
            intent: "transfer",
            errors: [
              ...(prod >= 10 ? [{ value: ea + eb, feedback: `${prod} no está entre 1 y 10: hay que sumar 1 al exponente.` }] : []),
              { value: ea * eb, feedback: "Al multiplicar potencias de 10 se suman los exponentes." },
            ].filter((e) => e.value !== prodExp),
          },
        ),
        n(
          "q6",
          `Un cable de ${fmt(smallValue)} m de grosor se enrolla ${fmt(10 ** -smallExp)} vueltas, una encima de otra. ¿Qué grosor alcanza, en metros?`,
          r6(smallValue * 10 ** -smallExp),
          [`${fmt(small / 10)} × ${pow10(smallExp)} × ${pow10(-smallExp)} = ${fmt(small / 10)} × 10⁰.`, `= ${fmt(small / 10)} m.`],
          ["Multiplica el grosor por el número de vueltas.", `Exponentes opuestos: ${sg(smallExp)} + ${-smallExp} = 0.`, "10⁰ = 1."],
          {
            intent: "transfer",
            unit: "m",
            errors: [{ value: small, feedback: "Revisa los exponentes: se anulan y queda el factor entre 1 y 10." }],
          },
        ),
      ];
    },
    application: n(
      "app",
      "La ciudad consume 3,6 × 10⁹ W·h al año y una placa solar produce 4,5 × 10⁵ W·h al año. ¿Cuántas placas harían falta para cubrir todo el consumo?",
      8000,
      ["3,6 × 10⁹ ÷ 4,5 × 10⁵ = (3,6 ÷ 4,5) × 10⁴.", "0,8 × 10⁴ = 8 × 10³ = 8000 placas."],
      ["Divide los factores y resta los exponentes.", "3,6 ÷ 4,5 = 0,8.", "Ajusta 0,8 × 10⁴."],
      {
        intent: "transfer",
        unit: "placas",
        errors: [
          { value: 80000, feedback: "Revisa el ajuste: 0,8 × 10⁴ = 8 × 10³." },
          { value: 800, feedback: "Resta los exponentes: 9 − 5 = 4." },
        ],
      },
    ),
    outcome: "Puedes leer y comparar los informes de energía de la ciudad sin contar ceros.",
    commonErrors: [
      "Dejar un factor mayor que 10.",
      "Creer que un exponente negativo da un número negativo.",
      "Multiplicar los exponentes en lugar de sumarlos.",
    ],
  }),
];

export const DECIMAL_LESSONS: Lesson[] = [
  defineLesson({
    id: "operaciones-decimales",
    unitId: "fracciones",
    title: "Operar con decimales",
    objective:
      "Comparar, multiplicar y dividir números decimales, justificar la posición de la coma y estimar el resultado.",
    purpose:
      "Los precios y las mediciones de la ciudad tienen decimales. Un error en la coma convierte 2,4 kg en 24 kg.",
    prerequisites: ["fraccion-decimal-porcentaje"],
    legacyModuleIds: ["aritmetica-d8", "aritmetica-decimales-mult-div"],
    visual: "percent",
    vocabulary: [
      { term: "Valor posicional", meaning: "Cada posición vale diez veces la de su derecha: décimas, centésimas, milésimas…" },
      { term: "Estimar", meaning: "Calcular aproximadamente para comprobar si un resultado es razonable." },
    ],
    sections: [
      {
        title: "Comparar cifra a cifra",
        paragraphs: [
          "0,5 > 0,45 porque 5 décimas son más que 4 décimas. Igualar el número de decimales ayuda: 0,50 frente a 0,45.",
          "Un número con más cifras decimales no es necesariamente mayor.",
        ],
        formula: "0,50 > 0,45",
      },
      {
        title: "Multiplicar: cuenta los decimales",
        paragraphs: [
          "2,4 × 0,3: multiplica 24 × 3 = 72 y coloca tantos decimales como sumen los factores (1 + 1 = 2): 0,72.",
          "Estima: 2,4 × 0,3 es algo menos que la tercera parte de 2,4. Multiplicar por un número menor que 1 da un resultado menor.",
        ],
        formula: "2,4 × 0,3 = 0,72",
      },
      {
        title: "Dividir: convierte el divisor en entero",
        paragraphs: [
          "6,3 ÷ 0,7: multiplica ambos por 10 y se mantiene el cociente: 63 ÷ 7 = 9.",
          "Dividir entre un número menor que 1 da un resultado mayor: en 6,3 caben 9 veces 0,7.",
        ],
        formula: "6,3 ÷ 0,7 = 63 ÷ 7 = 9",
      },
    ],
    examples: [
      ex("Calcula 1,25 × 0,4.", [
        ["125 × 4 = 500", "Multiplicamos sin coma."],
        ["2 + 1 = 3 decimales", "Contamos los decimales de los factores."],
        ["0,500 = 0,5", "Estimación: 0,4 de algo más que 1 es algo menos que 0,5."],
      ], "1,25 × 0,4 = 0,5."),
      ex("¿Cuántas botellas de 0,75 L se llenan con 6 L?", [
        ["6 ÷ 0,75 = 600 ÷ 75", "Multiplicamos ambos por 100."],
        ["600 ÷ 75 = 8", "Dividimos enteros."],
        ["8 × 0,75 = 6", "Comprobamos."],
      ], "Se llenan 8 botellas."),
    ],
    diagnostic: [
      c("d-1", "¿Cuál es mayor?", ["0,7", "0,65", "Son iguales"], 0, "0,70 > 0,65."),
      n("d-2", "¿Cuánto es 3,2 × 10?", 32, ["Multiplicar por 10 desplaza la coma una posición."], ["Multiplicar por 10.", "La coma va a la derecha.", "32."]),
      n("d-3", "¿Cuánto es 45 ÷ 9?", 5, ["9 × 5 = 45."], ["Busca un factor.", "9 × 5.", "5."]),
    ],
    questions(v) {
      const [a, b] = [[2.4, 0.3], [1.5, 0.6], [3.2, 0.25], [0.8, 0.7], [4.5, 1.2], [2.6, 0.5]][v],
        [d1, d2] = [[6.3, 0.7], [4.8, 0.6], [7.2, 0.09], [5.6, 0.8], [8.1, 0.9], [3.6, 0.04]][v],
        [k1, k2] = [[0.5, 0.45], [0.8, 0.75], [0.3, 0.29], [1.2, 1.15], [0.6, 0.55], [2.1, 2.05]][v],
        [kg, price] = [[2.5, 1.8], [1.25, 3.2], [3.5, 2.4], [0.75, 4.8], [2.25, 2.8], [1.5, 3.6]][v],
        [total, size] = [[10, 0.75], [5, 0.33], [8, 0.6], [12, 0.35], [7, 0.4], [9, 0.7]][v];
      const pdec = (x: number) => (String(x).split(".")[1] ?? "").length;
      return [
        v % 2 === 0
          ? c(
              "q0",
              `¿Por qué ${fmt(k1)} > ${fmt(k2)}, aunque ${fmt(k2)} tiene más cifras?`,
              [
                [`No es mayor: ${fmt(k2)} tiene más cifras`, "Más cifras decimales no significa más cantidad."],
                `Porque al igualar decimales, ${fmt(k1)} = ${k1.toFixed(2).replace(".", ",")} y supera a ${fmt(k2)}`,
                ["Porque se compara la última cifra", "Se compara de izquierda a derecha, empezando por la posición mayor."],
              ],
              1,
              "Se compara posición a posición, empezando por las unidades y las décimas.",
            )
          : c(
              "q0",
              `¿Por qué ${fmt(d1)} ÷ ${fmt(d2)} da un número mayor que ${fmt(d1)}?`,
              [
                ["Porque dividir siempre agranda", "Dividir entre un número mayor que 1 achica."],
                [`Porque es un error: debería ser menor`, "No es un error: el divisor es menor que 1."],
                `Porque ${fmt(d2)} es menor que 1: en ${fmt(d1)} caben más trozos de ${fmt(d2)} que unidades enteras`,
              ],
              2,
              "Dividir entre un número menor que 1 cuenta cuántas veces cabe esa parte pequeña.",
            ),
        n(
          "q1",
          `Calcula ${fmt(a)} × ${fmt(b)}.`,
          r6(a * b),
          [`Sin coma: ${Math.round(a * 10 ** pdec(a))} × ${Math.round(b * 10 ** pdec(b))} = ${Math.round(a * 10 ** pdec(a)) * Math.round(b * 10 ** pdec(b))}.`, `Decimales: ${pdec(a)} + ${pdec(b)} = ${pdec(a) + pdec(b)} → ${fmt(r6(a * b))}.`],
          ["Multiplica como si no hubiera coma.", "Cuenta los decimales de ambos factores.", "Coloca la coma y estima."],
          {
            errors: [
              { value: r6(a * b * 10), feedback: "Pusiste un decimal menos: cuenta los decimales de ambos factores." },
              { value: r6(a * b / 10), feedback: "Pusiste un decimal de más." },
            ],
          },
        ),
        n(
          "q2",
          `Completa: ${fmt(d1)} ÷ ${fmt(d2)} = ${fmt(r6(d1 * 10 ** pdec(d2)))} ÷ __.`,
          Math.round(d2 * 10 ** pdec(d2)),
          [`Multiplicamos ambos por ${fmt(10 ** pdec(d2))} para que el divisor sea entero: ${Math.round(d2 * 10 ** pdec(d2))}.`],
          ["El divisor debe quedar entero.", `Multiplica ${fmt(d2)} por ${fmt(10 ** pdec(d2))}.`, "El cociente no cambia si multiplicas ambos por lo mismo."],
          { step: true, errors: [{ value: d2, feedback: "Si multiplicas el dividendo, también hay que multiplicar el divisor." }] },
        ),
        n(
          "q3",
          `Calcula ${fmt(d1)} ÷ ${fmt(d2)}.`,
          r6(d1 / d2),
          [`${fmt(r6(d1 * 10 ** pdec(d2)))} ÷ ${Math.round(d2 * 10 ** pdec(d2))} = ${fmt(r6(d1 / d2))}.`],
          ["Convierte el divisor en un entero.", "Multiplica ambos por la misma potencia de 10.", "Divide."],
          { errors: [{ value: r6(d1 * d2), feedback: "Multiplicaste. Se pide cuántas veces cabe el divisor." }] },
        ),
        c(
          "q4",
          `Un compañero calcula ${fmt(b)} × ${fmt(b)} = ${fmt(r6(b * b * 10))}. ¿Qué falla?`,
          [
            ["Nada, está bien", `Estima: ${fmt(b)} × ${fmt(b)} es menor que ${fmt(b)}, porque se toma una parte.`],
            `Faltan decimales: cada factor aporta ${pdec(b)}, el resultado lleva ${2 * pdec(b)}: ${fmt(r6(b * b))}`,
            ["Debía sumar", "Es una multiplicación."],
          ],
          1,
          "El producto lleva tantos decimales como sumen los factores.",
        ),
        n(
          "q5",
          `Se compran ${fmt(kg)} kg de cable a ${fmt(price)} créditos el kilo. ¿Cuánto se paga?`,
          r6(kg * price),
          [`${fmt(kg)} × ${fmt(price)} = ${fmt(r6(kg * price))} créditos.`],
          ["Precio total = cantidad × precio por kilo.", "Multiplica sin coma y cuenta los decimales.", "Estima para comprobar."],
          { intent: "transfer", unit: "créditos", errors: [{ value: r6(kg * price * 10), feedback: "Revisa la posición de la coma." }] },
        ),
        n(
          "q6",
          `¿Cuántos envases completos de ${fmt(size)} L se llenan con ${total} L?`,
          Math.floor(r6(total / size)),
          [`${total} ÷ ${fmt(size)} = ${fmt(r6(total / size))}.`, `Envases completos: ${Math.floor(r6(total / size))}; el resto no llena otro.`],
          ["Divide el total entre la capacidad.", "Convierte el divisor en entero.", "Solo cuentan los envases llenos."],
          {
            intent: "transfer",
            unit: "envases",
            errors: [
              { value: Math.ceil(r6(total / size)), feedback: "El último envase no se llena: redondea hacia abajo." },
              { value: r6(total * size), feedback: "Multiplicaste; para saber cuántos caben se divide." },
            ].filter((e) => e.value !== Math.floor(r6(total / size))),
          },
        ),
      ];
    },
    application: n(
      "app",
      "Un taller compra 3,5 m de tubo a 2,4 créditos el metro y lo corta en trozos de 0,25 m. ¿Cuánto cuesta cada trozo?",
      0.6,
      ["Costo: 3,5 × 2,4 = 8,4 créditos.", "Trozos: 3,5 ÷ 0,25 = 14.", "Cada trozo: 8,4 ÷ 14 = 0,6 créditos (también 0,25 × 2,4)."],
      ["Calcula el costo total y el número de trozos.", "O directamente: longitud de un trozo × precio por metro.", "0,25 × 2,4."],
      {
        intent: "transfer",
        unit: "créditos",
        errors: [
          { value: 6, feedback: "Revisa la coma: un trozo de 0,25 m cuesta menos que un metro." },
          { value: 8.4, feedback: "Ese es el costo de todo el tubo." },
        ],
      },
    ),
    outcome: "Puedes calcular precios y medidas con decimales sin perder la coma.",
    commonErrors: [
      "Creer que un decimal con más cifras es mayor.",
      "Contar mal los decimales del producto.",
      "Dividir entre un decimal sin convertir el divisor en entero.",
    ],
  }),
];

export const ANGLE_LESSONS: Lesson[] = [
  defineLesson({
    id: "angulos",
    unitId: "geometria",
    title: "Ángulos y polígonos",
    objective:
      "Usar ángulos complementarios, suplementarios y opuestos por el vértice, y la suma de los ángulos de triángulos y polígonos.",
    purpose:
      "Para instalar antenas y rampas hay que calcular ángulos que no se pueden medir directamente.",
    prerequisites: ["jerarquia-operaciones"],
    legacyModuleIds: ["geometria-d6", "geometria-d1"],
    visual: "area",
    vocabulary: [
      { term: "Complementarios", meaning: "Dos ángulos que suman 90°." },
      { term: "Suplementarios", meaning: "Dos ángulos que suman 180°." },
      { term: "Opuestos por el vértice", meaning: "Ángulos enfrentados al cruzarse dos rectas; son iguales." },
    ],
    sections: [
      {
        title: "Relaciones entre ángulos",
        paragraphs: [
          "Dos ángulos que forman una esquina recta suman 90°: son complementarios. Si forman una línea recta, suman 180°: son suplementarios.",
          "Al cruzarse dos rectas, los ángulos opuestos por el vértice son iguales, porque ambos son suplementarios del mismo ángulo vecino.",
        ],
        formula: "α + β = 90° (compl.);  α + β = 180° (supl.)",
      },
      {
        title: "Los ángulos de un triángulo suman 180°",
        paragraphs: [
          "Si recortas los tres ángulos de un triángulo y los colocas juntos, forman una línea recta: 180°.",
          "Con dos ángulos conocidos, el tercero es 180° menos su suma.",
        ],
        formula: "α + β + γ = 180°",
      },
      {
        title: "Polígonos: triángulos dentro",
        paragraphs: [
          "Un polígono de n lados se divide desde un vértice en n − 2 triángulos. Sus ángulos interiores suman (n − 2) × 180°.",
          "En un polígono regular todos los ángulos son iguales: cada uno mide (n − 2) × 180° ÷ n.",
        ],
        formula: "S = (n − 2) × 180°",
      },
    ],
    examples: [
      ex("Un triángulo tiene ángulos de 48° y 75°. ¿Cuánto mide el tercero?", [
        ["48° + 75° = 123°", "Sumamos los conocidos."],
        ["180° − 123° = 57°", "Lo que falta para 180°."],
        ["48 + 75 + 57 = 180", "Comprobamos."],
      ], "El tercer ángulo mide 57°."),
      ex("¿Cuánto mide cada ángulo de un hexágono regular?", [
        ["(6 − 2) × 180° = 720°", "Suma de los ángulos interiores."],
        ["720° ÷ 6 = 120°", "Son seis ángulos iguales."],
        ["120° × 6 = 720°", "Comprobamos."],
      ], "Cada ángulo mide 120°."),
    ],
    diagnostic: [
      n("d-1", "¿Cuánto es 180 − 65?", 115, ["180 − 65 = 115."], ["Resta por partes.", "180 − 60 = 120.", "120 − 5 = 115."]),
      c("d-2", "¿Cuánto mide un ángulo recto?", ["45°", "90°", "180°"], 1, "Un ángulo recto mide 90°."),
      n("d-3", "¿Cuánto es (5 − 2) × 180?", 540, ["3 × 180 = 540."], ["Paréntesis primero.", "3 × 180.", "540."]),
    ],
    questions(v) {
      const [t1, t2] = [[48, 75], [62, 39], [35, 105], [90, 27], [54, 68], [110, 23]][v],
        given = [65, 112, 38, 140, 73, 96][v],
        sides = [5, 7, 8, 9, 10, 12][v],
        reg = [6, 8, 5, 10, 12, 9][v],
        ramp = [25, 32, 18, 40, 15, 28][v];
      return [
        v % 2 === 0
          ? c(
              "q0",
              "¿Por qué los ángulos de un triángulo suman 180°?",
              [
                "Porque juntos forman un ángulo llano, una línea recta",
                ["Porque todo triángulo tiene un ángulo recto", "Muchos triángulos no tienen ángulo recto."],
                ["Porque cada ángulo mide 60°", "Solo en el triángulo equilátero."],
              ],
              0,
              "Al colocar los tres ángulos uno junto a otro se forma una línea recta: 180°.",
            )
          : c(
              "q0",
              "Al cruzarse dos rectas, ¿por qué los ángulos opuestos por el vértice son iguales?",
              [
                ["Porque todos los ángulos de un cruce miden 90°", "Solo si las rectas son perpendiculares."],
                "Porque ambos son suplementarios del mismo ángulo vecino",
                ["Porque están a la misma distancia", "La distancia no define la medida de un ángulo."],
              ],
              1,
              "Si α + β = 180° y γ + β = 180°, entonces α = γ.",
            ),
        n(
          "q1",
          `Un triángulo tiene ángulos de ${t1}° y ${t2}°. ¿Cuánto mide el tercero?`,
          180 - t1 - t2,
          [`${t1} + ${t2} = ${t1 + t2}.`, `180 − ${t1 + t2} = ${180 - t1 - t2}°.`],
          ["Los tres ángulos suman 180°.", "Suma los dos conocidos.", "Resta de 180."],
          { unit: "°", errors: [{ value: 360 - t1 - t2, feedback: "Los ángulos de un triángulo suman 180°, no 360°." }] },
        ),
        n(
          "q2",
          `Completa: el suplementario de ${given}° mide 180° − ${given}° = __°.`,
          180 - given,
          [`180 − ${given} = ${180 - given}.`],
          ["Suplementarios suman 180°.", `Resta ${given} de 180.`, `${180 - given}.`],
          { step: true, unit: "°", errors: [{ value: 90 - given, feedback: "Eso sería el complementario (suma 90°)." }].filter((e) => e.value > 0) },
        ),
        n(
          "q3",
          `¿Cuánto suman los ángulos interiores de un polígono de ${sides} lados?`,
          (sides - 2) * 180,
          [`(${sides} − 2) × 180 = ${(sides - 2) * 180}°.`],
          ["Divide el polígono en triángulos desde un vértice.", `Salen ${sides} − 2 triángulos.`, "Multiplica por 180."],
          { unit: "°", errors: [{ value: sides * 180, feedback: `Desde un vértice salen ${sides - 2} triángulos, no ${sides}.` }] },
        ),
        c(
          "q4",
          `Dos rectas se cruzan y un ángulo mide ${given}°. Un compañero dice que el opuesto por el vértice mide ${180 - given}°. ¿Qué falla?`,
          [
            ["Nada", `${180 - given}° es el ángulo vecino (suplementario), no el opuesto.`],
            ["El opuesto mide 90°", "Solo si las rectas fueran perpendiculares."],
            `El opuesto por el vértice es igual: ${given}°; ${180 - given}° es el vecino`,
          ],
          2,
          "Los opuestos por el vértice son iguales; los vecinos son suplementarios.",
        ),
        n(
          "q5",
          `Una rampa forma ${ramp}° con el suelo horizontal. ¿Qué ángulo forma con una pared vertical que la toca?`,
          90 - ramp,
          [`Suelo y pared forman 90°: la rampa forma con ellos un triángulo rectángulo.`, `90 − ${ramp} = ${90 - ramp}°.`],
          ["Suelo y pared son perpendiculares.", "Los otros dos ángulos del triángulo rectángulo son complementarios.", `90 − ${ramp}.`],
          { intent: "transfer", unit: "°", errors: [{ value: 180 - ramp, feedback: "Ese sería el suplementario; aquí los dos ángulos completan el ángulo recto." }] },
        ),
        n(
          "q6",
          `¿Cuánto mide cada ángulo interior de un polígono regular de ${reg} lados?`,
          ((reg - 2) * 180) / reg,
          [`Suma: (${reg} − 2) × 180 = ${(reg - 2) * 180}°.`, `Cada uno: ${(reg - 2) * 180} ÷ ${reg} = ${fmt(((reg - 2) * 180) / reg)}°.`],
          ["Calcula primero la suma de los ángulos.", "En un polígono regular todos son iguales.", `Divide entre ${reg}.`],
          { intent: "transfer", unit: "°", errors: [{ value: (reg - 2) * 180, feedback: "Esa es la suma de todos los ángulos. Divide entre el número de ángulos." }, { value: 360 / reg, feedback: "Ese es el ángulo exterior (o central), no el interior." }] },
        ),
      ];
    },
    application: n(
      "app",
      "Una antena se sujeta con un cable que forma 58° con el suelo. Otro cable, del otro lado y en el mismo plano, forma con el primero un ángulo de 70° en lo alto de la antena. ¿Qué ángulo forma el segundo cable con el suelo?",
      52,
      ["Los dos cables y el suelo forman un triángulo.", "180 − 58 − 70 = 52°."],
      ["Dibuja el triángulo que forman los cables y el suelo.", "Conoces dos de sus ángulos.", "Los tres suman 180°."],
      {
        intent: "transfer",
        unit: "°",
        errors: [
          { value: 32, feedback: "Calculaste el complementario de 58°; usa el triángulo completo." },
          { value: 128, feedback: "Ese es el suplementario de 52°: el ángulo exterior." },
        ],
      },
    ),
    outcome: "Puedes calcular ángulos de rampas, antenas y piezas poligonales.",
    commonErrors: [
      "Confundir complementarios y suplementarios.",
      "Creer que los ángulos de un triángulo suman 360°.",
      "Usar n triángulos en lugar de n − 2 en un polígono.",
    ],
  }),
];

export const SIMILARITY_LESSONS: Lesson[] = [
  defineLesson({
    id: "semejanza",
    unitId: "geometria",
    title: "Semejanza y escalas",
    objective:
      "Reconocer figuras semejantes, calcular longitudes con la razón de semejanza, usar escalas y relacionar la escala con el área.",
    purpose:
      "Los planos de la ciudad están a escala y la altura de un edificio se puede medir con su sombra. Ambas ideas se basan en la semejanza.",
    prerequisites: ["razones", "perimetro-area"],
    legacyModuleIds: ["geometria-d10", "algebra-d5"],
    visual: "ratio",
    vocabulary: [
      { term: "Semejantes", meaning: "Figuras con la misma forma: ángulos iguales y lados proporcionales." },
      { term: "Razón de semejanza (k)", meaning: "El factor por el que se multiplican todas las longitudes." },
      { term: "Escala", meaning: "Razón entre una medida en el plano y la real, como 1:500." },
    ],
    sections: [
      {
        title: "Misma forma, distinto tamaño",
        paragraphs: [
          "Dos figuras son semejantes si una es una ampliación o reducción de la otra: todas las longitudes se multiplican por el mismo factor k.",
          "Sumar lo mismo a todos los lados no conserva la forma; multiplicarlos sí.",
        ],
        formula: "a′ = k × a, b′ = k × b, …",
      },
      {
        title: "Escalas de planos y mapas",
        paragraphs: [
          "En un plano 1:500, 1 cm del papel representa 500 cm reales, es decir, 5 m.",
          "Para pasar del plano a la realidad, multiplica por el factor; para pasar de la realidad al plano, divide.",
        ],
        formula: "real = plano × escala",
      },
      {
        title: "El área escala con k²",
        paragraphs: [
          "Si las longitudes se multiplican por k, las áreas se multiplican por k²: una figura con lados el doble ocupa cuatro veces más.",
          "Con sombras: a la misma hora, objetos y sombras forman triángulos semejantes, así que altura/sombra es igual para todos.",
        ],
        formula: "área′ = k² × área",
      },
    ],
    examples: [
      ex("Un poste de 2 m da una sombra de 1,5 m. A la misma hora, un edificio da 18 m de sombra. ¿Qué altura tiene?", [
        ["2 ÷ 1,5 = altura ÷ 18", "Los triángulos son semejantes."],
        ["k = 18 ÷ 1,5 = 12", "La sombra del edificio es 12 veces la del poste."],
        ["2 × 12 = 24 m", "La altura escala con el mismo factor."],
      ], "El edificio mide 24 m."),
      ex("En un plano 1:200, una sala mide 4 cm × 3 cm. ¿Qué área real tiene?", [
        ["4 × 200 = 800 cm = 8 m", "Largo real."],
        ["3 × 200 = 600 cm = 6 m", "Ancho real."],
        ["8 × 6 = 48 m²", "Área real (el área del plano, 12 cm², se multiplica por 200²)."],
      ], "La sala ocupa 48 m²."),
    ],
    diagnostic: [
      n("d-1", "Completa: 3:4 = 9:__.", 12, ["Factor 3: 4 × 3 = 12."], ["Busca el factor.", "3 × 3 = 9.", "4 × 3."], { step: true }),
      n("d-2", "¿Cuántos cm hay en 7 m?", 700, ["1 m = 100 cm."], ["1 m = 100 cm.", "7 × 100.", "700."]),
      c("d-3", "Si un cuadrado de lado 2 pasa a lado 4, ¿su área…?", ["se duplica", "se multiplica por 4", "no cambia"], 1, "De 4 a 16: por 4."),
    ],
    questions(v) {
      const [a, b, a2] = [[4, 6, 10], [3, 5, 12], [6, 9, 9], [5, 8, 15], [2, 7, 6], [8, 12, 6]][v],
        [scale, cm] = [[500, 6], [200, 7.5], [1000, 4.2], [250, 12], [100, 9.5], [2000, 3.5]][v],
        [post, shadow, bshadow] = [[2, 1.5, 18], [1.6, 2, 15], [3, 2.5, 20], [1.8, 1.2, 14], [2.5, 2, 16], [1.2, 0.8, 10]][v],
        [area, k] = [[30, 3], [12, 5], [20, 4], [45, 2], [8, 6], [15, 3]][v];
      const ratio = a2 / a;
      return [
        v % 2 === 0
          ? c(
              "q0",
              "¿Qué significa que dos triángulos sean semejantes?",
              [
                ["Que tienen el mismo tamaño", "Eso sería congruentes; los semejantes pueden tener tamaños distintos."],
                "Que tienen los mismos ángulos y sus lados son proporcionales",
                ["Que sus lados difieren en la misma cantidad", "Sumar lo mismo cambia la forma; hay que multiplicar."],
              ],
              1,
              "Semejanza: misma forma, longitudes multiplicadas por un mismo factor.",
            )
          : c(
              "q0",
              `Si todas las longitudes de una figura se multiplican por ${k}, ¿qué ocurre con su área?`,
              [
                [`Se multiplica por ${k}`, "El área depende de dos longitudes, ambas multiplicadas por k."],
                [`Se multiplica por ${k * k * k}`, "k³ corresponde al volumen; el área solo tiene dos dimensiones."],
                `Se multiplica por ${k * k}`,
              ],
              2,
              `Área′ = k² × área = ${k}² × área.`,
            ),
        n(
          "q1",
          `Un triángulo tiene lados de ${a} cm y ${b} cm. En otro semejante, el lado que corresponde a ${a} cm mide ${a2} cm. ¿Cuánto mide el que corresponde a ${b} cm?`,
          r6(b * ratio),
          [`k = ${a2} ÷ ${a} = ${fmt(ratio)}.`, `${b} × ${fmt(ratio)} = ${fmt(r6(b * ratio))} cm.`],
          ["Busca el factor entre lados correspondientes.", `${a2} ÷ ${a}.`, `Multiplica ${b} por ese factor.`],
          { unit: "cm", errors: [{ value: b + (a2 - a), feedback: "Sumaste la diferencia. En figuras semejantes las longitudes se multiplican por un factor." }] },
        ),
        n(
          "q2",
          `Completa: la razón de semejanza es ${a2} ÷ ${a} = __.`,
          ratio,
          [`${a2} ÷ ${a} = ${fmt(ratio)}.`],
          ["Divide la medida nueva entre la original.", `${a2} ÷ ${a}.`, `${fmt(ratio)}.`],
          { step: true, errors: [{ value: a / a2, feedback: "Invertiste la división: nueva ÷ original." }] },
        ),
        n(
          "q3",
          `En un plano a escala 1:${scale}, un muro mide ${fmt(cm)} cm. ¿Cuántos metros mide en la realidad?`,
          r6((cm * scale) / 100),
          [`${fmt(cm)} × ${scale} = ${fmt(cm * scale)} cm.`, `${fmt(cm * scale)} cm = ${fmt(r6((cm * scale) / 100))} m.`],
          ["Cada cm del plano representa " + scale + " cm reales.", "Multiplica.", "Convierte cm a m dividiendo entre 100."],
          { unit: "m", errors: [{ value: cm * scale, feedback: "Ese resultado está en centímetros: conviértelo a metros." }] },
        ),
        c(
          "q4",
          `Un compañero amplía un rectángulo de ${a} × ${b} sumando ${a2 - a} a cada lado y dice que es semejante. ¿Qué responde?`,
          [
            ["Tiene razón: creció igual por todos lados", "Sumar lo mismo cambia las proporciones."],
            `No: ${a}/${b} ≠ ${a2}/${b + a2 - a}; para conservar la forma hay que multiplicar ambos lados`,
            ["Solo es semejante si es un cuadrado", "Ni siquiera: hay que multiplicar."],
          ],
          1,
          "La semejanza exige un factor multiplicativo común.",
        ),
        n(
          "q5",
          `Un poste de ${fmt(post)} m da una sombra de ${fmt(shadow)} m. A la misma hora, un edificio da una sombra de ${bshadow} m. ¿Qué altura tiene el edificio?`,
          r6((post * bshadow) / shadow),
          [`k = ${bshadow} ÷ ${fmt(shadow)} = ${fmt(r6(bshadow / shadow))}.`, `Altura = ${fmt(post)} × ${fmt(r6(bshadow / shadow))} = ${fmt(r6((post * bshadow) / shadow))} m.`],
          ["Objeto y sombra forman triángulos semejantes.", "Compara las sombras.", "Aplica el mismo factor a la altura."],
          { intent: "transfer", unit: "m", errors: [{ value: r6(bshadow + (post - shadow)), feedback: "La relación es multiplicativa, no una diferencia fija." }] },
        ),
        n(
          "q6",
          `Una pieza tiene ${area} cm² de área. Se fabrica otra semejante con todas las longitudes multiplicadas por ${k}. ¿Qué área tiene?`,
          area * k * k,
          [`El área se multiplica por ${k}² = ${k * k}.`, `${area} × ${k * k} = ${area * k * k} cm².`],
          ["Las longitudes se multiplican por k.", "El área depende de dos longitudes.", `Multiplica por ${k}².`],
          { intent: "transfer", unit: "cm²", errors: [{ value: area * k, feedback: "Multiplicaste solo por k; el área se multiplica por k²." }] },
        ),
      ];
    },
    application: n(
      "app",
      "La maqueta del nuevo parque está a escala 1:400 y su césped ocupa 50 cm² en la maqueta. ¿Cuántos m² de césped habrá que plantar?",
      800,
      ["El área real es 400² = 160 000 veces la de la maqueta.", "50 × 160 000 = 8 000 000 cm².", "8 000 000 cm² = 800 m² (1 m² = 10 000 cm²)."],
      ["Las áreas escalan con el cuadrado de la escala.", "Calcula 50 × 400².", "Convierte cm² a m² dividiendo entre 10 000."],
      {
        intent: "transfer",
        unit: "m²",
        errors: [
          { value: 2, feedback: "Multiplicaste por 400, no por 400²." },
          { value: 8000000, feedback: "Esos son cm²: divide entre 10 000 para pasar a m²." },
        ],
      },
    ),
    outcome: "Puedes leer planos a escala y medir alturas con sombras.",
    commonErrors: [
      "Sumar en lugar de multiplicar al ampliar.",
      "Aplicar la escala lineal a un área.",
      "Olvidar convertir unidades al final.",
    ],
  }),
];

export const QUADRATIC_LESSONS: Lesson[] = [
  defineLesson({
    id: "ecuaciones-cuadraticas",
    unitId: "expresiones",
    title: "Ecuaciones de segundo grado",
    objective:
      "Resolver ecuaciones cuadráticas sencillas (x² = c y por factorización), usar la propiedad del producto nulo e interpretar las soluciones en un contexto.",
    purpose:
      "Al diseñar placas y parcelas aparecen áreas que dependen de una longitud desconocida al cuadrado.",
    prerequisites: ["propiedad-distributiva", "potencias-raices"],
    legacyModuleIds: ["algebra-d10", "aritmetica-raices"],
    visual: "area",
    vocabulary: [
      { term: "Ecuación cuadrática", meaning: "Ecuación en la que la incógnita aparece al cuadrado: ax² + bx + c = 0." },
      { term: "Producto nulo", meaning: "Si un producto vale 0, al menos uno de los factores vale 0." },
    ],
    sections: [
      {
        title: "x² = c tiene dos soluciones",
        paragraphs: [
          "x² = 49 se cumple con x = 7 y con x = −7, porque (−7)² = 49. Se escribe x = ±7.",
          "En un contexto como la longitud de un lado, solo tiene sentido la solución positiva; pero hay que decidirlo, no olvidarlo.",
        ],
        formula: "x² = 49 → x = 7 o x = −7",
      },
      {
        title: "Producto nulo",
        paragraphs: [
          "(x − 3)(x + 5) = 0 solo es posible si x − 3 = 0 o x + 5 = 0: las soluciones son 3 y −5.",
          "Factorizar convierte una cuadrática en un producto: x² + 2x − 15 = (x − 3)(x + 5). Busca dos números que sumen 2 y multipliquen −15.",
        ],
        formula: "x² + bx + c = (x − p)(x − q) con p + q = −b, p · q = c",
      },
      {
        title: "No dividas entre x",
        paragraphs: [
          "En x² = 6x, dividir entre x da x = 6 y pierde la solución x = 0. Mejor: x² − 6x = 0 → x(x − 6) = 0 → x = 0 o x = 6.",
          "Comprueba siempre sustituyendo cada solución.",
        ],
        formula: "x² = 6x → x(x − 6) = 0",
      },
    ],
    examples: [
      ex("Resuelve x² − 5x + 6 = 0.", [
        ["Buscamos p y q: suma 5, producto 6", "2 + 3 = 5 y 2 · 3 = 6, así que son 2 y 3."],
        ["(x − 2)(x − 3) = 0", "Factorizamos."],
        ["x = 2 o x = 3", "Producto nulo. Comprobación: 4 − 10 + 6 = 0 y 9 − 15 + 6 = 0."],
      ], "Las soluciones son 2 y 3."),
      ex("Una parcela rectangular tiene 4 m más de largo que de ancho y 45 m² de área. ¿Cuál es su ancho?", [
        ["x(x + 4) = 45", "Área = ancho × largo."],
        ["x² + 4x − 45 = 0 → (x + 9)(x − 5) = 0", "Números que suman 4 y multiplican −45: 9 y −5."],
        ["x = 5 (x = −9 no es una longitud)", "Interpretamos en el contexto."],
      ], "El ancho mide 5 m y el largo 9 m."),
    ],
    diagnostic: [
      n("d-1", "¿Cuánto es (−6)²?", 36, ["(−6) × (−6) = 36."], ["Multiplica −6 por sí mismo.", "Dos negativos dan positivo.", "36."]),
      n("d-2", "Desarrolla x(x + 4): ¿cuál es el coeficiente de x?", 4, ["x · x + x · 4 = x² + 4x."], ["Distributiva.", "x × 4 = 4x.", "4."]),
      c("d-3", "Si a × b = 0, entonces…", ["a y b son 0", "al menos uno de los dos es 0", "a = b"], 1, "Un producto es 0 si alguno de sus factores es 0."),
    ],
    questions(v) {
      const sq = [7, 9, 6, 12, 8, 11][v],
        [p, q] = [[3, -5], [-2, 7], [4, -6], [-3, 8], [5, -2], [-4, 9]][v],
        [r1, r2] = [[2, 3], [1, 6], [3, 4], [2, 5], [1, 4], [3, 6]][v],
        side = [9, 14, 13, 15, 16, 11][v],
        [w, extra] = [[5, 4], [6, 3], [4, 7], [8, 2], [7, 5], [3, 9]][v],
        m = [6, 4, 9, 5, 7, 8][v];
      return [
        v % 2 === 0
          ? c(
              "q0",
              `¿Por qué x² = ${sq * sq} tiene dos soluciones?`,
              [
                ["Porque todas las ecuaciones tienen dos soluciones", "Las lineales tienen una; depende de la ecuación."],
                `Porque ${sq}² y (−${sq})² valen ${sq * sq}`,
                ["Porque hay que dividir entre 2", "No se divide: se busca qué números al cuadrado dan el valor."],
              ],
              1,
              "Un número y su opuesto tienen el mismo cuadrado.",
            )
          : c(
              "q0",
              `Si (x ${p < 0 ? `+ ${-p}` : `− ${p}`})(x ${q < 0 ? `+ ${-q}` : `− ${q}`}) = 0, ¿por qué x = ${sg(p)} o x = ${sg(q)}?`,
              [
                "Porque un producto es 0 solo si alguno de sus factores es 0",
                ["Porque se suman los números", "No se suman: cada factor se iguala a 0."],
                ["Porque hay que desarrollar primero", "Ya está factorizada: basta el producto nulo."],
              ],
              0,
              "Producto nulo: cada factor igualado a 0 da una solución.",
            ),
        n(
          "q1",
          `Resuelve x² = ${sq * sq}. Escribe la solución negativa.`,
          -sq,
          [`${sq}² = ${sq * sq} y (−${sq})² = ${sq * sq}.`, `Soluciones: ${sq} y −${sq}.`],
          ["Busca un número que al cuadrado dé el valor.", "Su opuesto también funciona.", `−${sq}.`],
          { errors: [{ value: sq, feedback: "Esa es la solución positiva; también hay una negativa." }, { value: -(sq * sq) / 2, feedback: "No se divide entre 2: se calcula la raíz." }] },
        ),
        n(
          "q2",
          `Completa: si (x − ${r1})(x − ${r2 * 2}) = 0, entonces x = ${r1} o x = __.`,
          r2 * 2,
          [`x − ${r2 * 2} = 0 → x = ${r2 * 2}.`],
          ["Iguala el segundo factor a 0.", `x − ${r2 * 2} = 0.`, `${r2 * 2}.`],
          { step: true, errors: [{ value: -r2 * 2, feedback: `x − ${r2 * 2} = 0 se cumple con x = ${r2 * 2}, positivo.` }] },
        ),
        n(
          "q3",
          `Resuelve x² − ${r1 + r2}x + ${r1 * r2} = 0. Escribe la solución mayor.`,
          Math.max(r1, r2),
          [`Números que suman ${r1 + r2} y multiplican ${r1 * r2}: ${r1} y ${r2}.`, `(x − ${r1})(x − ${r2}) = 0 → x = ${r1} o x = ${r2}.`],
          [`Busca dos números con suma ${r1 + r2} y producto ${r1 * r2}.`, "Factoriza.", "Producto nulo."],
          { errors: [{ value: -Math.max(r1, r2), feedback: "Revisa los signos: si suman positivo y multiplican positivo, ambos son positivos." }] },
        ),
        c(
          "q4",
          `Alguien resuelve x² = ${m}x dividiendo entre x y obtiene solo x = ${m}. ¿Qué falla?`,
          [
            ["Nada, es la única solución", "x = 0 también la cumple: 0² = " + m + " × 0."],
            ["Debía restar x", "Restar no ayuda; hay que factorizar."],
            `Al dividir entre x pierde x = 0; mejor x(x − ${m}) = 0 → x = 0 o x = ${m}`,
          ],
          2,
          "Dividir entre una expresión que puede valer 0 pierde soluciones.",
        ),
        n(
          "q5",
          `Una placa cuadrada debe tener ${side * side} cm² de área. ¿Cuánto mide su lado?`,
          side,
          [`x² = ${side * side} → x = ±${side}.`, `Una longitud es positiva: ${side} cm.`],
          ["Plantea x² = área.", "Calcula la raíz.", "Descarta la solución negativa."],
          { intent: "transfer", unit: "cm", errors: [{ value: -side, feedback: "Una longitud no puede ser negativa." }] },
        ),
        n(
          "q6",
          `Una parcela rectangular tiene ${extra} m más de largo que de ancho y ${w * (w + extra)} m² de área. ¿Cuánto mide su ancho?`,
          w,
          [`x(x + ${extra}) = ${w * (w + extra)} → x² + ${extra}x − ${w * (w + extra)} = 0.`, `(x − ${w})(x + ${w + extra}) = 0 → x = ${w} (descartamos −${w + extra}).`],
          ["Área = ancho × largo, con largo = ancho + " + extra + ".", "Pasa todo a un lado y factoriza.", "Descarta la solución negativa."],
          {
            intent: "transfer",
            unit: "m",
            errors: [
              { value: w + extra, feedback: "Ese es el largo; se pide el ancho." },
              { value: Math.sqrt(w * (w + extra)), feedback: "Eso sería si la parcela fuera cuadrada." },
            ].filter((e) => e.value !== w),
          },
        ),
      ];
    },
    application: n(
      "app",
      "Se quiere un marco de ancho uniforme x alrededor de un panel de 6 m × 4 m, de modo que el conjunto ocupe 48 m². ¿Qué ancho debe tener el marco?",
      1,
      ["(6 + 2x)(4 + 2x) = 48.", "4x² + 20x + 24 = 48 → x² + 5x − 6 = 0 → (x + 6)(x − 1) = 0.", "x = 1 m (descartamos −6)."],
      ["El marco añade x a cada lado: 2x en cada dimensión.", "Desarrolla y pasa todo a un lado.", "Factoriza y descarta lo que no sea una longitud."],
      {
        intent: "transfer",
        unit: "m",
        errors: [
          { value: 2, feedback: "Con x = 2 el conjunto mide 10 × 8 = 80 m². Recuerda que el marco suma 2x a cada dimensión." },
          { value: -6, feedback: "Una longitud no puede ser negativa." },
        ],
      },
    ),
    outcome: "Puedes dimensionar placas, parcelas y marcos a partir de su área.",
    commonErrors: [
      "Olvidar la solución negativa de x² = c (o no descartarla en un contexto).",
      "Dividir entre x y perder la solución x = 0.",
      "Equivocar los signos al factorizar.",
    ],
  }),
];
