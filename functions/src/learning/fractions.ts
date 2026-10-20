import { defineLesson } from "./defineLesson";
import { choice as c, example as ex, numeric as n } from "./questions";
import type { Lesson } from "./types";

export const FRACTION_LESSONS: Lesson[] = [
  defineLesson({
    id: "fracciones-unidad",
    unitId: "fracciones",
    title: "Qué representa una fracción",
    objective:
      "Representar una fracción respecto de una unidad y explicar el papel de sus dos números.",
    purpose:
      "Los medidores de la ciudad muestran partes de una reserva. Para interpretarlos, primero hay que saber qué cuenta como una unidad.",
    prerequisites: [],
    legacyModuleIds: ["aritmetica-fraccion-concepto"],
    visual: "fraction",
    vocabulary: [
      {
        term: "Unidad",
        meaning:
          "El todo que tomamos como referencia; puede ser una batería, una longitud o una colección.",
      },
      {
        term: "Denominador",
        meaning: "Cantidad de partes iguales en las que se divide una unidad.",
      },
      {
        term: "Numerador",
        meaning: "Cantidad de esas partes que consideramos.",
      },
    ],
    sections: [
      {
        title: "Primero, identifica el todo",
        paragraphs: [
          "Una fracción expresa una cantidad tomando una unidad como referencia. Si una batería completa es la unidad, media batería es 1/2 de esa unidad.",
          "Las partes deben representar la misma cantidad. Pintar una de tres regiones de tamaños diferentes no garantiza haber pintado 1/3.",
        ],
        formula: "1 unidad = el todo de referencia",
      },
      {
        title: "El tamaño de la parte y cuántas tomas",
        paragraphs: [
          "En 3/4, el 4 indica que una unidad se dividió en cuatro partes iguales. El 3 indica que tomamos tres partes de ese tamaño.",
          "Al aumentar el denominador manteniendo la unidad, cada parte es más pequeña. Una mitad de la misma batería es mayor que un cuarto.",
        ],
        formula: "3/4 = 1/4 + 1/4 + 1/4",
      },
      {
        title: "Una fracción puede superar la unidad",
        paragraphs: [
          "Si tomamos cuatro cuartos, completamos una unidad: 4/4 = 1. Cinco cuartos representan una unidad y un cuarto más.",
          "Para comparar partes de objetos distintos, comprueba que las unidades sean del mismo tamaño: la mitad de un depósito grande puede contener más que un depósito pequeño completo.",
        ],
        formula: "5/4 = 4/4 + 1/4 = 1 + 1/4",
      },
    ],
    examples: [
      ex(
        "Un panel tiene 8 celdas iguales y 3 están cargadas. ¿Qué fracción del panel está cargada?",
        [
          ["Unidad: el panel completo", "Fijamos qué representa el todo."],
          [
            "Cada celda = 1/8 del panel",
            "Las ocho celdas contienen la misma parte de la carga total.",
          ],
          [
            "3 × 1/8 = 3/8",
            "Contamos las tres partes cargadas del mismo tamaño.",
          ],
        ],
        "La fracción cargada es 3/8; la que falta es 5/8.",
      ),
      ex(
        "Hay 7 piezas, cada una de 1/4 de metro. ¿Qué longitud forman?",
        [
          [
            "4 piezas = 4/4 m = 1 m",
            "Cuatro cuartos completan la unidad de longitud.",
          ],
          [
            "Sobran 3 piezas = 3/4 m",
            "Separamos lo que queda después de formar un metro.",
          ],
          [
            "7/4 m = 1 + 3/4 m",
            "La fracción cuenta piezas del mismo tamaño aunque supere una unidad.",
          ],
        ],
        "Una fracción mayor que 1 también representa una cantidad válida.",
      ),
      ex(
        "Un depósito lleno hasta 3/5 contiene 24 litros. ¿Cuál es su capacidad?",
        [
          ["3/5 = 3 partes de 1/5", "La cantidad conocida ocupa tres de las cinco partes iguales."],
          ["24 ÷ 3 = 8 litros por parte", "Repartimos entre las partes que ocupa para saber cuánto vale 1/5."],
          ["5 × 8 = 40 litros", "La unidad completa son cinco partes de ese tamaño."],
        ],
        "La capacidad es 40 litros; comprobación: 3/5 de 40 = 24.",
      ),
    ],
    diagnostic: [
      c(
        "d-1",
        "¿Cuál de estos repartos permite hablar de cuartos de una misma unidad?",
        [
          "4 partes de cualquier tamaño",
          "4 partes iguales",
          "Una parte grande y tres pequeñas",
        ],
        1,
        "Los cuartos son cuatro partes iguales de la misma unidad.",
      ),
      n(
        "d-2",
        "Si divides 12 objetos en 3 grupos iguales, ¿cuántos hay en cada grupo?",
        4,
        ["12 ÷ 3 = 4."],
        [
          "Piensa en un reparto igual.",
          "Reparte los 12 entre 3 grupos.",
          "12 ÷ 3 = 4.",
        ],
      ),
      c(
        "d-3",
        "Si juntas dos mitades de una misma unidad, obtienes…",
        ["Dos unidades", "Media unidad", "Una unidad"],
        2,
        "1/2 + 1/2 = 1.",
      ),
    ],
    questions(v) {
      // Parámetros independientes entre sí: ninguna respuesta se deduce de otra.
      const [num, den] = [[3, 4], [2, 6], [3, 5], [5, 8], [4, 10], [7, 12]][v],
        units = [2, 3, 2, 4, 3, 2][v],
        litres = [5, 3, 4, 2, 6, 3][v];
      return [
        v % 2 === 0
          ? c(
              "q0",
              `Un medidor marca ${num}/${den}. ¿Qué representa el ${den}?`,
              [
                ["Las partes seleccionadas", `Las partes seleccionadas las indica el numerador, ${num}.`],
                "Las partes iguales de una unidad",
                ["Las unidades completas que hay", `${num}/${den} es menor que una unidad: no hay ${den} unidades completas.`],
              ],
              1,
              `El denominador ${den} indica en cuántas partes iguales se divide una unidad.`,
            )
          : c(
              "q0",
              `Un medidor marca ${num}/${den}. ¿Qué representa el ${num}?`,
              [
                ["En cuántas partes iguales se divide la unidad", `Eso lo indica el denominador, ${den}.`],
                ["Cuánto mide cada parte", `Cada parte mide 1/${den}; el ${num} no es un tamaño.`],
                "Cuántas de esas partes iguales se consideran",
              ],
              2,
              `El numerador ${num} cuenta las partes de tamaño 1/${den} que se toman.`,
            ),
        n(
          "q1",
          `Una barra tiene ${den} partes iguales y ${num} están marcadas. Escribe la fracción marcada.`,
          num / den,
          [`Hay ${num} partes marcadas de ${den} → ${num}/${den}.`],
          [
            "Identifica el total de partes iguales.",
            "El total va en el denominador; las marcadas, en el numerador.",
            `La fracción es ${num}/${den}.`,
          ],
          {
            errors: [
              {
                value: den / num,
                feedback:
                  "Intercambiaste las funciones: el denominador cuenta todas las partes de la unidad.",
              },
              {
                value: (den - num) / den,
                feedback: "Esa es la fracción sin marcar. Cuenta las partes marcadas.",
              },
            ],
          },
        ),
        n(
          "q2",
          `Completa: si una unidad se divide en ${den} partes iguales, cada parte es 1/__.`,
          den,
          [`Cada parte es 1/${den} de la unidad.`],
          [
            "Se pregunta cuántas partes forman una unidad.",
            "El denominador cuenta las partes iguales.",
            `El denominador es ${den}.`,
          ],
          { step: true },
        ),
        n(
          "q3",
          `¿Cuántas unidades completas representan ${den * units}/${den}?`,
          units,
          [
            `Cada ${den}/${den} completa una unidad.`,
            `${den * units} partes forman ${den * units} ÷ ${den} = ${units} grupos de ${den} → ${units} unidades.`,
          ],
          [
            "Piensa cuántas partes de tamaño 1/" + den + " forman una unidad.",
            `Cada grupo de ${den} partes es una unidad.`,
            `Calcula ${den * units} ÷ ${den}.`,
          ],
          {
            errors: [
              {
                value: den * units,
                feedback: "Ese es el número de partes, no de unidades completas.",
              },
            ],
          },
        ),
        c(
          "q4",
          `¿Cuál describe correctamente ${den + num}/${den}?`,
          [
            ["Es imposible porque el numerador es mayor", "Una fracción puede superar la unidad: basta tomar más partes de las que forman una."],
            ["Es menor que una unidad", `Se toman ${den + num} partes y ${den} ya completan una unidad.`],
            `Es una unidad y ${num}/${den} más`,
          ],
          2,
          `${den + num}/${den} = ${den}/${den} + ${num}/${den} = 1 + ${num}/${den}.`,
        ),
        n(
          "q5",
          `Una ruta está dividida en ${den} tramos iguales. Ya reparaste ${num}. ¿Qué fracción de la ruta falta reparar?`,
          (den - num) / den,
          [
            `${den - num === 1 ? "Falta" : "Faltan"} ${den} − ${num} = ${den - num} ${den - num === 1 ? "tramo" : "tramos"}.`,
            `Cada tramo vale 1/${den}; falta ${den - num}/${den} de la ruta.`,
          ],
          [
            "La unidad es la ruta completa.",
            "Resta los tramos reparados al total.",
            `${den - num === 1 ? "Falta" : "Faltan"} ${den - num} de ${den} tramos.`,
          ],
          {
            intent: "transfer",
            errors: [
              {
                value: num / den,
                feedback: "Esa es la parte reparada. Se pregunta por la que falta.",
              },
            ],
          },
        ),
        n(
          "q6",
          `Un depósito lleno hasta ${num}/${den} de su capacidad contiene ${num * litres} litros. ¿Cuál es su capacidad total?`,
          den * litres,
          [
            `${num}/${den} son ${num} partes iguales: cada parte (1/${den}) contiene ${num * litres} ÷ ${num} = ${litres} litros.`,
            `La capacidad son ${den} partes: ${den} × ${litres} = ${den * litres} litros.`,
          ],
          [
            "Ahora conoces la parte y buscas el todo.",
            `Averigua primero cuánto contiene 1/${den}: reparte los ${num * litres} litros entre ${num} partes.`,
            `Cada parte tiene ${litres} litros; la unidad tiene ${den} partes.`,
          ],
          {
            intent: "transfer",
            unit: "litros",
            errors: [
              {
                value: (num * litres * num) / den,
                feedback: `Calculaste ${num}/${den} de los litros. Aquí los litros ya son ${num}/${den}: busca el depósito completo.`,
              },
              {
                value: num * litres * den,
                feedback: `Multiplicaste por ${den} sin repartir antes entre las ${num} partes que ya ocupan esos litros.`,
              },
            ],
          },
        ),
      ];
    },
    application: n(
      "app",
      "La ciudad tiene tres depósitos iguales: uno está lleno, otro a 1/2 y el tercero a 1/4. ¿Cuántos cuartos de depósito hay en total?",
      7,
      [
        "Un depósito lleno son 4/4; medio depósito, 2/4; y el tercero, 1/4.",
        "4/4 + 2/4 + 1/4 = 7/4: hay 7 cuartos, es decir, una unidad y 3/4 más.",
      ],
      [
        "Expresa cada depósito con partes del mismo tamaño: cuartos.",
        "¿Cuántos cuartos tiene un depósito lleno? ¿Y medio?",
        "Suma 4 + 2 + 1 cuartos.",
      ],
      {
        intent: "transfer",
        unit: "cuartos",
        errors: [
          { value: 3, feedback: "Contaste depósitos. Se pregunta cuántas partes de tamaño 1/4 hay." },
          { value: 7 / 4, feedback: "7/4 de depósito es correcto como cantidad, pero se pregunta cuántos cuartos son: el número de partes." },
        ],
      },
    ),
    outcome:
      "El medidor vuelve a ser legible: ahora puedes distinguir la reserva completa, la parte disponible y la que falta.",
    commonErrors: [
      "Confundir numerador y denominador.",
      "Contar regiones de tamaños diferentes como partes iguales.",
      "Creer que una fracción no puede superar 1.",
      "Comparar fracciones de unidades de distinto tamaño sin advertirlo.",
    ],
  }),
  defineLesson({
    id: "fracciones-equivalentes",
    unitId: "fracciones",
    title: "Equivalencia y comparación",
    objective:
      "Construir fracciones equivalentes y comparar cantidades usando una unidad común.",
    purpose:
      "Dos sensores muestran reservas con escalas diferentes. Necesitas saber si indican la misma cantidad antes de cambiar una batería.",
    prerequisites: ["fracciones-unidad"],
    legacyModuleIds: ["aritmetica-fracciones-equivalentes"],
    visual: "equivalence",
    vocabulary: [
      {
        term: "Equivalentes",
        meaning: "Fracciones que representan el mismo número.",
      },
      {
        term: "Denominador común",
        meaning:
          "Un tamaño de parte compartido que permite comparar o combinar fracciones.",
      },
    ],
    sections: [
      {
        title: "Cambiar las partes sin cambiar la cantidad",
        paragraphs: [
          "Si divides cada mitad en dos, la cantidad que ocupaba una mitad pasa a ocupar dos cuartos. La unidad y la cantidad seleccionada siguen iguales.",
          "Multiplicar numerador y denominador por el mismo número distinto de cero conserva el valor. Para simplificar, divide ambos por un divisor común distinto de cero.",
        ],
        formula: "1/2 = (1 × 2)/(2 × 2) = 2/4",
      },
      {
        title: "Comparar con partes del mismo tamaño",
        paragraphs: [
          "Con igual denominador, basta comparar los numeradores: siete doceavos son más que cinco doceavos.",
          "Si los denominadores son diferentes, busca fracciones equivalentes con un denominador común. Usa siempre la misma unidad como referencia.",
        ],
        formula: "2/3 = 8/12 > 6/12 = 1/2",
      },
      {
        title: "Evita comparar solo las cifras",
        paragraphs: [
          "Con el mismo numerador positivo y la misma unidad, un denominador mayor produce una cantidad menor: al repartir más, cada parte es más pequeña.",
          "Simplificar no es restar el mismo número arriba y abajo. Hay que dividir ambos por el mismo factor para conservar la cantidad.",
        ],
        formula: "3/8 < 3/5; 6/8 = 3/4",
      },
    ],
    examples: [
      ex(
        "¿2/3 y 8/12 indican la misma reserva?",
        [
          ["3 × 4 = 12", "Buscamos el factor que transforma el denominador."],
          [
            "2 × 4 = 8",
            "Multiplicamos también el numerador para conservar la cantidad.",
          ],
          [
            "2/3 = 8/12",
            "Cambió el tamaño de cada parte y cuántas contamos, pero no el valor.",
          ],
        ],
        "Los dos sensores indican la misma proporción de carga.",
      ),
      ex(
        "¿Qué es mayor: 3/4 o 2/3?",
        [
          ["3/4 = 9/12", "Dividimos cada cuarto en tres partes."],
          ["2/3 = 8/12", "Dividimos cada tercio en cuatro partes."],
          [
            "9/12 > 8/12",
            "Ahora las partes tienen el mismo tamaño; comparamos cuántas hay.",
          ],
        ],
        "3/4 supera a 2/3 por 1/12 de la misma unidad.",
      ),
    ],
    diagnostic: [
      c(
        "d-1",
        "En 2/5, ¿cuántas partes iguales forman una unidad?",
        ["2", "5", "7"],
        1,
        "El denominador 5 cuenta las partes iguales de una unidad.",
      ),
      n(
        "d-2",
        "Completa: 3 × __ = 12.",
        4,
        ["3 × 4 = 12."],
        [
          "Busca cuántos grupos de 3 hay en 12.",
          "Calcula 12 ÷ 3.",
          "El factor es 4.",
        ],
        { step: true },
      ),
      c(
        "d-3",
        "Dos barras iguales se dividen en 4 partes iguales cada una. ¿Qué es mayor?",
        ["3/4", "1/4", "Son iguales"],
        0,
        "Con partes del mismo tamaño, tres partes son más que una.",
      ),
    ],
    questions(v) {
      const [a, b, k] = [[1, 3, 2], [2, 5, 3], [3, 4, 4], [2, 7, 2], [5, 6, 3], [3, 8, 2]][v],
        // Pares con numeradores y denominadores distintos.
        [p, q, r, s] = [[2, 3, 3, 5], [3, 4, 5, 7], [5, 8, 3, 5], [4, 9, 1, 2], [7, 10, 2, 3], [5, 6, 7, 9]][v],
        bigger = p / q > r / s ? p / q : r / s,
        smaller = p / q > r / s ? r / s : p / q,
        tank = b * k * [1, 2, 1, 3, 2, 1][v];
      return [
        v % 2 === 0
          ? c(
              "q0",
              `Para construir una fracción equivalente a ${a}/${b}, ¿qué transformación conserva su valor?`,
              [
                [`Sumar ${k} arriba y abajo`, `Sumar no conserva la razón: ${a + k}/${b + k} no vale lo mismo que ${a}/${b}.`],
                `Multiplicar ambos por ${k}`,
                [`Multiplicar solo el denominador por ${k}`, "Cambiar un solo término hace las partes más pequeñas sin tomar más: la cantidad cambia."],
              ],
              1,
              "Multiplicar ambos términos por el mismo factor distinto de cero conserva la razón entre ellos.",
            )
          : c(
              "q0",
              `¿Por qué ${a}/${b + 2} es menor que ${a}/${b}?`,
              [
                [`No es menor: ${b + 2} es mayor que ${b}`, "Un denominador mayor no da una cantidad mayor: indica partes más pequeñas."],
                `Porque al dividir la unidad en ${b + 2} partes, cada parte es más pequeña que 1/${b}`,
                ["Porque hay que restar los denominadores", "Comparar no exige restar: con el mismo numerador basta comparar el tamaño de las partes."],
              ],
              1,
              `Con el mismo numerador, se toman ${a} partes en ambos casos; las de tamaño 1/${b + 2} son más pequeñas.`,
            ),
        n(
          "q1",
          `Simplifica ${a * k}/${b * k} hasta su forma irreducible. ¿Cuál es el nuevo numerador?`,
          a,
          [
            `${a * k} y ${b * k} tienen un divisor común: ${k}.`,
            `${a * k} ÷ ${k} = ${a} y ${b * k} ÷ ${k} = ${b}; se obtiene ${a}/${b}, que ya no se puede simplificar.`,
          ],
          [
            "Busca un número que divida a la vez al numerador y al denominador.",
            `Prueba con ${k}.`,
            `${a * k} ÷ ${k} = ${a}.`,
          ],
        ),
        n(
          "q2",
          `Completa la equivalencia: ${a}/${b} = __/${b * k}.`,
          a * k,
          [
            `El denominador se multiplicó por ${k}; el numerador también: ${a} × ${k} = ${a * k}.`,
          ],
          [
            "Busca cómo cambió el denominador.",
            `${b * k} ÷ ${b} = ${k}.`,
            `Multiplica ${a} por ${k}.`,
          ],
          {
            step: true,
            errors: [
              {
                value: a + (b * k - b),
                feedback:
                  "La equivalencia usa un factor multiplicativo, no sumar el mismo número.",
              },
            ],
          },
        ),
        n(
          "q3",
          `¿Qué fracción es mayor: ${p}/${q} o ${r}/${s}? Escribe la mayor.`,
          bigger,
          [
            `Con denominador común ${q * s} → ${p}/${q} = ${p * s}/${q * s} y ${r}/${s} = ${r * q}/${q * s}.`,
            `Ahora las partes tienen el mismo tamaño; la mayor es ${bigger === p / q ? `${p}/${q}` : `${r}/${s}`}.`,
          ],
          [
            "Las partes son de tamaños distintos: no compares las cifras directamente.",
            `Usa ${q * s} como denominador común.`,
            `Compara ${p * s}/${q * s} con ${r * q}/${q * s}.`,
          ],
          {
            errors: [
              {
                value: smaller,
                feedback: "Esa es la menor. Escribe ambas con el mismo denominador y compara cuántas partes tiene cada una.",
              },
            ],
          },
        ),
        c(
          "q4",
          `Un compañero transforma ${a}/${b} en ${a + 1}/${b + 1} y dice que siempre son iguales. ¿Qué falla?`,
          [
            ["Nada: sumar 1 siempre conserva una fracción", `Compruébalo: ${a}/${b} y ${a + 1}/${b + 1} no tienen el mismo valor.`],
            ["Solo se pueden comparar fracciones con numerador 1", "Se puede comparar cualquier par de fracciones con un denominador común."],
            "Sumar la misma cantidad no conserva necesariamente la razón",
          ],
          2,
          `Para conservar el valor de ${a}/${b} se necesita multiplicar o dividir ambos términos por el mismo factor, no sumar 1.`,
        ),
        n(
          "q5",
          `Un tanque de ${b * k} litros está lleno hasta ${a}/${b}. ¿Cuántas marcas de un litro debe mostrar otro sensor para indicar la misma reserva?`,
          a * k,
          [
            `Cada parte contiene ${b * k} ÷ ${b} = ${k} litros.`,
            `${a} ${a === 1 ? "parte contiene" : "partes contienen"} ${a} × ${k} = ${a * k} litros; ${a}/${b} = ${a * k}/${b * k}.`,
          ],
          [
            "Relaciona la fracción con las marcas del sensor.",
            `Una de las ${b} partes ocupa ${k} marcas.`,
            `Toma ${a} ${a === 1 ? "grupo" : "grupos"} de ${k} marcas.`,
          ],
          { intent: "transfer", unit: "litros" },
        ),
        n(
          "q6",
          `Un tanque de ${tank} litros contiene ${(tank / b) * a} litros. ¿Qué fracción del tanque está llena? Escríbela simplificada.`,
          a / b,
          [
            `La fracción es ${(tank / b) * a}/${tank}.`,
            `Dividiendo ambos términos entre ${tank / b} → ${a}/${b}.`,
          ],
          [
            "La parte va en el numerador y el total en el denominador.",
            `Escribe ${(tank / b) * a}/${tank} y busca un divisor común.`,
            `Divide ambos términos entre ${tank / b}.`,
          ],
          {
            intent: "transfer",
            errors: [
              {
                value: b / a,
                feedback: "Invertiste la fracción: el total del tanque va en el denominador.",
              },
            ],
          },
        ),
      ];
    },
    application: n(
      "app",
      "Tres sensores miden el mismo tanque y marcan 6/8, 9/12 y 2/3. Uno está averiado porque no coincide con los otros dos. ¿Qué fracción marca el sensor averiado?",
      2 / 3,
      [
        "6/8 = 3/4 y 9/12 = 3/4: estos dos sensores coinciden.",
        "2/3 = 8/12, mientras que 3/4 = 9/12: el sensor averiado marca 2/3.",
      ],
      [
        "Simplifica cada lectura o llévalas a un denominador común.",
        "Prueba con el denominador 12.",
        "6/8 = 9/12; compara 2/3 con 9/12.",
      ],
      {
        intent: "transfer",
        errors: [
          { value: 3 / 4, feedback: "6/8 y 9/12 valen 3/4: esos sensores coinciden. Busca la lectura distinta." },
        ],
      },
    ),
    outcome:
      "Los sensores quedan sincronizados: ya puedes comparar reservas aunque utilicen escalas diferentes.",
    commonErrors: [
      "Sumar el mismo número al numerador y al denominador.",
      "Multiplicar solo uno de los términos.",
      "Creer que un denominador mayor siempre significa una cantidad mayor.",
    ],
  }),
  defineLesson({
    id: "fraccion-decimal-porcentaje",
    unitId: "fracciones",
    title: "Una cantidad, tres representaciones",
    objective:
      "Relacionar fracciones, decimales y porcentajes conservando la unidad de referencia.",
    purpose:
      "El panel nuevo usa porcentajes; el antiguo, fracciones. Aprenderás a interpretar los dos sin alterar la reserva real.",
    prerequisites: ["fracciones-equivalentes"],
    legacyModuleIds: [
      "aritmetica-fraccion-decimal-porcentaje",
      "aritmetica-d8",
      "aritmetica-d9",
    ],
    visual: "percent",
    vocabulary: [
      {
        term: "Porcentaje",
        meaning: "Una proporción expresada por cada cien: p% = p/100.",
      },
      {
        term: "Decimal",
        meaning:
          "Representación de un número mediante unidades, décimas, centésimas y otras posiciones.",
      },
    ],
    sections: [
      {
        title: "El valor se conserva",
        paragraphs: [
          "1/2, 0,5 y 50% representan la misma proporción de una unidad. Cambia la escritura, no la cantidad.",
          "Para escribir una fracción como decimal, divide el numerador entre el denominador. Algunas divisiones son exactas y otras producen decimales periódicos.",
        ],
        formula: "3/4 = 3 ÷ 4 = 0,75",
      },
      {
        title: "Por ciento significa por cada cien",
        paragraphs: [
          "75% significa 75/100, equivalente a 3/4. Para pasar de decimal a porcentaje multiplicas por 100; para volver a decimal divides entre 100.",
          "El símbolo % forma parte del significado: 0,25 y 0,25% son cantidades distintas.",
        ],
        formula: "0,75 × 100 = 75; 0,75 = 75%",
      },
      {
        title: "Comprueba con referencias conocidas",
        paragraphs: [
          "0% corresponde a 0 y 100% corresponde a 1. Por eso diez décimos son 1, no 0,10. La mitad es 0,5 o 50%.",
          "Un porcentaje también puede superar el 100%: 150% equivale a 1,5 veces la referencia. Al hablar de capacidad física, distingue esa proporción de lo que cabe en el depósito.",
        ],
        formula: "10/10 = 1 = 100%; 1/10 = 0,1 = 10%",
      },
    ],
    examples: [
      ex(
        "Convierte 3/5 a decimal y porcentaje.",
        [
          ["3 ÷ 5 = 0,6", "Dividir expresa la fracción como número decimal."],
          [
            "3/5 = 60/100",
            "También podemos multiplicar ambos términos por 20.",
          ],
          ["0,6 = 60%", "Sesenta centésimas son sesenta por cada cien."],
        ],
        "Las tres escrituras indican la misma parte de la misma unidad.",
      ),
      ex(
        "Un indicador muestra 25%. ¿Qué fracción representa?",
        [
          ["25% = 25/100", "Escribimos literalmente por cada cien."],
          ["25/100 = 1/4", "Dividimos ambos términos entre 25."],
          ["25 ÷ 100 = 0,25", "La escritura decimal confirma el mismo valor."],
        ],
        "25%, 1/4 y 0,25 son equivalentes.",
      ),
    ],
    diagnostic: [
      n(
        "d-1",
        "Escribe 1/2 como decimal.",
        0.5,
        ["1 ÷ 2 = 0,5."],
        [
          "Piensa en repartir una unidad entre dos.",
          "Cinco décimos completan una mitad.",
          "1/2 = 0,5.",
        ],
      ),
      c(
        "d-2",
        "¿Cuál equivale a 1/4?",
        ["2/8", "2/5", "4/1"],
        0,
        "Multiplicar ambos términos por 2 da 2/8.",
      ),
      n(
        "d-3",
        "¿Cuánto es 30 ÷ 10?",
        3,
        ["30 ÷ 10 = 3."],
        [
          "Cuenta grupos de diez.",
          "Tres grupos de diez forman treinta.",
          "El cociente es 3.",
        ],
      ),
    ],
    questions(v) {
      const p = [35, 80, 12, 45, 5, 64][v],
        decimal = p / 100,
        [fn, fd] = [[1, 4], [2, 5], [3, 4], [1, 8], [7, 10], [4, 5]][v],
        [gn, gd] = [[3, 5], [1, 4], [7, 20], [3, 8], [9, 25], [1, 8]][v],
        dec = (x: number) => x.toLocaleString("es");
      const concept = [
        c(
          "q4",
          "Un panel tiene diez de sus diez partes cargadas. ¿Qué escritura decimal corresponde?",
          [
            ["0,10", "0,10 es una décima. Diez décimos completan la unidad."],
            "1",
            ["0,01", "0,01 es una centésima, mucho menos que el panel completo."],
          ],
          1,
          "Diez décimos completan una unidad: 10/10 = 1. En cambio, 0,10 es una décima.",
        ),
        c(
          "q4",
          "¿Representan la misma cantidad 0,25 y 0,25%?",
          [
            ["Sí, el símbolo % es solo decorativo", "El símbolo cambia el valor: 0,25% = 0,25/100."],
            "No: 0,25% es 0,25/100 = 0,0025, cien veces menos",
            ["No: 0,25% es 25", "25 sería 2500%. Dividir entre cien, no multiplicar."],
          ],
          1,
          "p% significa p/100 → 0,25% = 0,0025, mientras que 0,25 = 25%.",
        ),
        c(
          "q4",
          "Una reserva pasa al 150% de su nivel de ayer. ¿Qué significa?",
          [
            "Que ahora es 1,5 veces la de ayer",
            ["Que es imposible: un porcentaje no supera 100", "El 100% es la referencia; un porcentaje mayor indica más que esa referencia."],
            ["Que aumentó 150 unidades", "150% es una proporción de la referencia, no una cantidad de unidades."],
          ],
          0,
          "150% = 150/100 = 1,5 veces la cantidad de referencia.",
        ),
      ];
      return [
        c(
          "q0",
          `¿Qué significa ${p}%?`,
          [
            [`${p} de cada 10`, "El porcentaje compara con 100, no con 10."],
            [`${p} unidades completas`, "Un porcentaje es una proporción, no una cantidad de unidades."],
            `${p} de cada 100`,
          ],
          2,
          `El símbolo % significa por cada cien: ${p}% = ${p}/100.`,
        ),
        n(
          "q1",
          `Escribe ${dec(decimal)} como porcentaje. Introduce el número que va antes de %.`,
          p,
          [
            `Multiplica ${dec(decimal)} por 100 → ${p}.`,
            `La representación es ${p}%.`,
          ],
          [
            "El porcentaje compara con cien.",
            "Para pasar de decimal a porcentaje, multiplica por 100.",
            `El porcentaje es ${p}%.`,
          ],
          {
            unit: "%",
            errors: [
              { value: decimal * 10, feedback: "Multiplicaste por 10. Para un porcentaje se multiplica por 100." },
              { value: decimal, feedback: "Ese es el decimal. Multiplícalo por 100 para expresarlo por cada cien." },
            ],
          },
        ),
        n(
          "q2",
          `Completa: ${p}% = ${p}/100 = __ en decimal.`,
          decimal,
          [`${p} ÷ 100 = ${dec(decimal)}.`],
          [
            "El símbolo % indica dividir entre cien.",
            `Calcula ${p} ÷ 100.`,
            `El decimal es ${dec(decimal)}.`,
          ],
          {
            step: true,
            errors: [
              { value: p / 10, feedback: `Dividiste entre 10. ${p}% son ${p} centésimas: ${p} ÷ 100.` },
            ],
          },
        ),
        n(
          "q3",
          `Escribe como decimal la fracción ${fn}/${fd}.`,
          fn / fd,
          [`Divide el numerador entre el denominador: ${fn} ÷ ${fd} = ${dec(fn / fd)}.`],
          [
            "Una fracción también es una división.",
            `Calcula ${fn} ÷ ${fd}.`,
            `Puedes buscar una fracción equivalente con denominador 10, 100 o 1000.`,
          ],
          {
            errors: [
              { value: fd / fn, feedback: "Dividiste el denominador entre el numerador. Es numerador ÷ denominador." },
            ],
          },
        ),
        concept[v % 3],
        n(
          "q5",
          `Una pantalla indica que queda ${p}% de una reserva. Otra pantalla usa una escala de 0 a 1. ¿Qué número debe mostrar?`,
          decimal,
          [
            `Ambas pantallas deben conservar la proporción: ${p}/100 = ${dec(decimal)}.`,
          ],
          [
            "La reserva completa corresponde a 1.",
            "Convierte el porcentaje en una fracción con denominador 100.",
            `Divide ${p} entre 100.`,
          ],
          { intent: "transfer" },
        ),
        n(
          "q6",
          `Un medidor antiguo marca ${gn}/${gd} de la reserva. ¿Qué porcentaje debe mostrar el panel nuevo? Introduce el número que va antes de %.`,
          (gn / gd) * 100,
          [
            `${gn} ÷ ${gd} = ${dec(gn / gd)}.`,
            `${dec(gn / gd)} × 100 = ${dec((gn / gd) * 100)}: el panel muestra ${dec((gn / gd) * 100)}%.`,
          ],
          [
            "Pasa primero la fracción a decimal.",
            `Calcula ${gn} ÷ ${gd}.`,
            "Multiplica el decimal por 100.",
          ],
          {
            intent: "transfer",
            unit: "%",
            errors: [
              { value: gn / gd, feedback: "Ese es el decimal. Multiplica por 100 para expresarlo como porcentaje." },
              { value: gn, feedback: `El porcentaje no es el numerador: ${gn}/${gd} no tiene denominador 100.` },
            ],
          },
        ),
      ];
    },
    application: n(
      "app",
      "Tres paneles muestran la reserva de una central: el A marca 0,35; el B, 3/8; y el C, 36%. ¿Cuál indica más energía? Escribe su valor en decimal.",
      0.375,
      [
        "A = 0,35; B = 3 ÷ 8 = 0,375; C = 36/100 = 0,36.",
        "Comparando con tres cifras decimales: 0,350 < 0,360 < 0,375. El panel B indica más.",
      ],
      [
        "Lleva las tres lecturas a la misma representación.",
        "Convierte 3/8 y 36% a decimal.",
        "Compara 0,350, 0,375 y 0,360.",
      ],
      {
        intent: "transfer",
        errors: [
          { value: 0.36, feedback: "0,36 = 0,360, que es menor que 0,375. Compara cifra a cifra con el mismo número de decimales." },
          { value: 0.35, feedback: "0,35 es la lectura menor de las tres." },
          { value: 36, feedback: "Escribe el valor en decimal: 36% = 0,36, que no es el mayor." },
        ],
      },
    ),
    outcome:
      "Los paneles muestran la misma reserva con tres escrituras distintas. Puedes cambiar de interfaz sin confundir la cantidad.",
    commonErrors: [
      "Confundir 0,10 con diez décimos.",
      "Confundir 0,25 con 0,25%.",
      "Cambiar de unidad de referencia durante una conversión.",
    ],
  }),
  defineLesson({
    id: "fraccion-cantidad",
    unitId: "fracciones",
    title: "Calcular una fracción de una cantidad",
    objective:
      "Calcular una fracción de una cantidad y justificar el reparto en partes iguales.",
    purpose:
      "El hospital necesita tres cuartas partes de la reserva. Vas a calcular la energía que necesita antes de conectar la red.",
    prerequisites: ["fracciones-unidad", "fracciones-equivalentes"],
    legacyModuleIds: ["aritmetica-fraccion-de-cantidad"],
    visual: "quantity",
    vocabulary: [
      {
        term: "Fracción de una cantidad",
        meaning: "La cantidad resultante de tomar una proporción de un total.",
      },
      {
        term: "Cantidad total",
        meaning: "La referencia sobre la que se calcula la fracción.",
      },
    ],
    sections: [
      {
        title: "Busca cuánto vale una parte",
        paragraphs: [
          "Para calcular 3/4 de 120, imagina 120 unidades repartidas en cuatro grupos iguales. Cada cuarto contiene 120 ÷ 4 = 30.",
          "Dividimos por el denominador porque ese número indica cuántos grupos iguales forman la cantidad total.",
        ],
        formula: "1/4 de 120 = 120 ÷ 4 = 30",
      },
      {
        title: "Toma las partes necesarias",
        paragraphs: [
          "El numerador indica cuántos grupos tomar. Si cada cuarto vale 30, tres cuartos valen 3 × 30 = 90.",
          "También puedes multiplicar primero 120 × 3 y después dividir entre 4. Los dos procedimientos dan el mismo resultado.",
        ],
        formula: "3/4 de 120 = (120 ÷ 4) × 3 = 90",
      },
      {
        title: "Comprueba el resultado",
        paragraphs: [
          "Como 3/4 es menor que 1 y el total es positivo, el resultado debe ser menor que 120. Queda 1/4, es decir, 30 unidades.",
          "Si la fracción fuera mayor que 1, el resultado podría superar al total de referencia. La comprobación depende de la fracción utilizada.",
        ],
        formula: "90 + 30 = 120; 90/120 = 3/4",
      },
    ],
    examples: [
      ex(
        "¿Cuánto es 3/4 de 120 unidades de energía?",
        [
          [
            "120 ÷ 4 = 30",
            "Calculamos el valor de un cuarto repartiendo el total entre cuatro.",
          ],
          ["30 × 3 = 90", "Tomamos tres grupos del tamaño calculado."],
          ["120 − 90 = 30", "Comprobamos que queda el cuarto restante."],
        ],
        "El hospital necesita 90 unidades y quedan 30 para distribuir.",
      ),
      ex(
        "Un equipo revisa 2/5 de 80 sensores. ¿Cuántos revisa?",
        [
          ["80 ÷ 5 = 16", "Cada quinta parte contiene 16 sensores."],
          ["16 × 2 = 32", "Dos quintas partes contienen dos grupos de 16."],
          [
            "32/80 = 2/5",
            "La razón entre la parte y el total confirma el cálculo.",
          ],
        ],
        "Se revisan 32 sensores; quedan 48.",
      ),
      ex(
        "Los 3/4 de una reserva son 90 unidades. ¿Cuánto es la reserva completa?",
        [
          ["90 ÷ 3 = 30", "Las 90 unidades ocupan tres cuartos: cada cuarto contiene 30."],
          ["4 × 30 = 120", "La reserva completa tiene cuatro cuartos."],
          ["3/4 de 120 = 90", "Comprobamos aplicando la fracción al total encontrado."],
        ],
        "Conocer la parte y la fracción permite reconstruir el total: se reparte entre el numerador y se multiplica por el denominador.",
      ),
    ],
    diagnostic: [
      c(
        "d-1",
        "En 3/4 de una reserva, ¿qué indica el 4?",
        [
          "Las partes que tomas",
          "Los grupos iguales en los que divides el total",
          "La energía restante",
        ],
        1,
        "El denominador define el reparto en cuatro grupos iguales.",
      ),
      n(
        "d-2",
        "¿Cuánto es 60 ÷ 4?",
        15,
        ["4 × 15 = 60, así que 60 ÷ 4 = 15."],
        [
          "Piensa en cuatro grupos iguales.",
          "4 × 10 = 40 y faltan 20.",
          "Cada grupo contiene 15.",
        ],
      ),
      n(
        "d-3",
        "¿Cuánto es 3 × 15?",
        45,
        ["15 + 15 + 15 = 45."],
        ["Son tres grupos de 15.", "15 + 15 = 30.", "30 + 15 = 45."],
      ),
    ],
    questions(v) {
      const [num, den, total] = [[3, 4, 40], [2, 5, 60], [5, 6, 72], [3, 8, 80], [2, 3, 90], [4, 5, 150]][v],
        part = total / den,
        taken = part * num;
      return [
        v % 2 === 0
          ? c(
              "q0",
              `¿Por qué divides ${total} entre ${den} para calcular ${num}/${den} de ${total}?`,
              [
                ["Porque siempre se divide entre el numerador", `El numerador ${num} indica cuántas partes tomar, no en cuántas se reparte.`],
                `Porque el total se reparte en ${den} grupos iguales`,
                [`Porque el resultado debe ser ${den}`, `${den} es el número de grupos; el resultado es una cantidad del total.`],
              ],
              1,
              "El denominador indica cuántos grupos iguales forman el total; después tomas los grupos que indica el numerador.",
            )
          : c(
              "q0",
              `Sin calcular, ¿${num}/${den} de ${total} es mayor o menor que ${total}?`,
              [
                `Menor, porque ${num}/${den} es menor que 1`,
                ["Mayor, porque se multiplica", `Multiplicar por una fracción menor que 1 da menos que el total.`],
                ["Igual, porque se toma el total", `Se toma solo una parte: ${num} de ${den} partes.`],
              ],
              0,
              `${num}/${den} < 1, así que se toma menos que la cantidad total.`,
            ),
        n(
          "q1",
          `Calcula ${num}/${den} de ${total}.`,
          taken,
          [`${total} ÷ ${den} = ${part}.`, `${part} × ${num} = ${taken}.`],
          [
            `Calcula primero 1/${den} del total.`,
            `${total} ÷ ${den} = ${part}.`,
            `Toma ${num} ${num === 1 ? "grupo" : "grupos"} de ${part}.`,
          ],
          {
            errors: [
              {
                value: (total * den) / num,
                feedback:
                  "Se divide entre el denominador y se multiplica por el numerador: revisa el papel de cada uno.",
              },
              {
                value: part,
                feedback: `Encontraste 1/${den}. Todavía debes tomar ${num} partes de ese tamaño.`,
              },
              {
                value: total * num,
                feedback: `Tomaste ${num} veces el total completo. Falta dividir entre ${den}.`,
              },
            ],
          },
        ),
        n(
          "q2",
          `Completa el primer paso: ${num}/${den} de ${total} = (${total} ÷ ${den}) × ${num} = __ × ${num}.`,
          part,
          [`1/${den} de ${total} es ${total} ÷ ${den} = ${part}.`],
          [
            `Este paso busca una sola de las ${den} partes.`,
            `Divide ${total} entre ${den}.`,
            `Cada parte vale ${part}.`,
          ],
          { step: true },
        ),
        n(
          "q3",
          `Calcula ${den + 1}/${den} de ${total}.`,
          part * (den + 1),
          [
            `1/${den} vale ${part}.`,
            `${den + 1}/${den} valen ${part} × ${den + 1} = ${part * (den + 1)}; supera ${total} porque ${den + 1}/${den} > 1.`,
          ],
          [
            "La fracción supera una unidad, pero el procedimiento se mantiene.",
            `1/${den} vale ${part}.`,
            `Multiplica ${part} por ${den + 1}.`,
          ],
          {
            errors: [
              { value: part, feedback: `Encontraste 1/${den}. Toma ${den + 1} partes de ese tamaño.` },
            ],
          },
        ),
        c(
          "q4",
          `Alguien calcula ${num}/${den} de ${total} y obtiene ${total * num}. ¿Qué paso falta?`,
          [
            [`Multiplicar otra vez por ${num}`, "Volver a multiplicar aleja aún más el resultado del valor correcto."],
            [`Restar ${den}`, "Restar el denominador no tiene sentido como reparto."],
            `Dividir entre ${den} para tener en cuenta el tamaño de las partes`,
          ],
          2,
          `Multiplicar el total por ${num} toma ${num} totales completos; hay que dividir entre ${den} para tomar ${num}/${den}.`,
        ),
        n(
          "q5",
          `Una reserva de ${total} unidades entrega ${num}/${den} al hospital. ¿Cuántas unidades quedan para los otros edificios?`,
          total - taken,
          [
            `El hospital recibe (${total} ÷ ${den}) × ${num} = ${taken}.`,
            `Quedan ${total} − ${taken} = ${total - taken}, es decir, ${den - num}/${den} de la reserva.`,
          ],
          [
            "Distingue lo entregado de lo que queda.",
            `Si se entregan ${num}/${den}, quedan ${den - num}/${den}.`,
            `Calcula ${total} − ${taken}.`,
          ],
          {
            intent: "transfer",
            unit: "unidades",
            errors: [
              { value: taken, feedback: "Esa es la energía entregada al hospital. Se pregunta por la que queda." },
            ],
          },
        ),
        n(
          "q6",
          `El hospital recibió ${taken} unidades, que son ${num}/${den} de la reserva. ¿Cuántas unidades tenía la reserva completa?`,
          total,
          [
            `${taken} unidades son ${num} partes: cada parte (1/${den}) vale ${taken} ÷ ${num} = ${part}.`,
            `La reserva son ${den} partes: ${den} × ${part} = ${total}.`,
          ],
          [
            "Esta vez conoces la parte y buscas el total.",
            `Reparte las ${taken} unidades entre las ${num} partes que representan.`,
            `Multiplica el valor de una parte por ${den}.`,
          ],
          {
            intent: "transfer",
            unit: "unidades",
            errors: [
              {
                value: (taken * num) / den,
                feedback: `Calculaste ${num}/${den} de ${taken}. Aquí ${taken} ya es ${num}/${den} de la reserva: busca el todo.`,
              },
              {
                value: taken * den,
                feedback: `Multiplicaste por ${den} sin dividir antes entre ${num} → ${taken} ocupa ${num} partes, no una.`,
              },
            ],
          },
        ),
      ];
    },
    application: n(
      "app",
      "Una reserva de 180 unidades abastece al hospital con 2/3 y a la radio con 1/6 de la reserva original. El resto va al taller. ¿Cuántas unidades recibe el taller?",
      30,
      [
        "Hospital: 2/3 de 180 = (180 ÷ 3) × 2 = 120.",
        "Radio: 1/6 de 180 = 30.",
        "Taller: 180 − 120 − 30 = 30.",
      ],
      [
        "Ambas fracciones se calculan sobre la reserva original de 180.",
        "Calcula 2/3 de 180 y 1/6 de 180.",
        "Resta ambas cantidades a 180.",
      ],
      {
        intent: "transfer",
        unit: "unidades",
        errors: [
          { value: 50, feedback: "Calculaste 1/6 de lo que quedaba tras el hospital. La radio usa 1/6 de la reserva original." },
          { value: 60, feedback: "Ese es el resto tras el hospital. Falta descontar la radio." },
        ],
      },
    ),
    outcome:
      "Ya puedes planificar el suministro del hospital. En la aventura El apagón pondrás a prueba el reparto y verás sus consecuencias.",
    commonErrors: [
      "Dividir entre el numerador.",
      "Olvidar multiplicar por el número de partes tomadas.",
      "Dar como respuesta la cantidad entregada cuando se pregunta por la restante.",
    ],
  }),
];
