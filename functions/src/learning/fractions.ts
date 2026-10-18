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
      const den = 4 + 2 * v,
        num = v + 1;
      return [
        c(
          "q0",
          `Un medidor marca ${num}/${den}. ¿Qué representa el ${den}?`,
          [
            "Las partes seleccionadas",
            "Las partes iguales de una unidad",
            "Las unidades completas que hay",
          ],
          1,
          `El denominador ${den} indica en cuántas partes iguales se divide una unidad.`,
        ),
        n(
          "q1",
          `Una barra tiene ${den} partes iguales y ${num} están marcadas. Escribe la fracción marcada.`,
          num / den,
          [`Hay ${num} partes marcadas de ${den}: ${num}/${den}.`],
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
          `¿Cuántas unidades completas representan ${den}/${den}?`,
          1,
          [`${den} partes de tamaño 1/${den} completan exactamente 1 unidad.`],
          [
            "Compara las partes tomadas con las partes de una unidad.",
            "Se han tomado todas las partes.",
            `${den}/${den} = 1.`,
          ],
        ),
        c(
          "q4",
          `¿Cuál describe correctamente ${den + 1}/${den}?`,
          [
            "Es imposible porque el numerador es mayor",
            "Es menor que una unidad",
            `Es una unidad y 1/${den} más`,
          ],
          2,
          `${den + 1}/${den} = ${den}/${den} + 1/${den} = 1 + 1/${den}.`,
        ),
        n(
          "q5",
          `Una ruta está dividida en ${den} tramos iguales. Ya reparaste ${num}. ¿Qué fracción de la ruta falta reparar?`,
          (den - num) / den,
          [
            `Faltan ${den} − ${num} = ${den - num} tramos.`,
            `Cada tramo vale 1/${den}; falta ${den - num}/${den} de la ruta.`,
          ],
          [
            "La unidad es la ruta completa.",
            "Resta los tramos reparados al total.",
            `Faltan ${den - num} de ${den} tramos.`,
          ],
          { intent: "transfer" },
        ),
      ];
    },
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
      const a = v + 1,
        b = v + 3,
        k = 2 + (v % 3);
      return [
        c(
          "q0",
          `Para construir una fracción equivalente a ${a}/${b}, ¿qué transformación conserva su valor?`,
          [
            `Sumar ${k} arriba y abajo`,
            `Multiplicar ambos por ${k}`,
            `Multiplicar solo el denominador por ${k}`,
          ],
          1,
          "Multiplicar ambos términos por el mismo factor distinto de cero conserva la razón entre ellos.",
        ),
        n(
          "q1",
          `Divide el numerador y el denominador de ${a * k}/${b * k} entre ${k}. ¿Cuál es el nuevo numerador?`,
          a,
          [`${a * k} ÷ ${k} = ${a} y ${b * k} ÷ ${k} = ${b}; se obtiene ${a}/${b}.`],
          [
            "Busca un divisor común.",
            `Ambos términos son múltiplos de ${k}.`,
            `El nuevo numerador es ${a * k} ÷ ${k} = ${a}.`,
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
                value: a + k,
                feedback:
                  "La equivalencia usa un factor multiplicativo, no sumar el mismo número.",
              },
            ],
          },
        ),
        n(
          "q3",
          `¿Qué fracción es mayor: ${a}/${b} o ${a}/${b + 1}? Escribe el valor de la mayor.`,
          a / b,
          [
            `Con el mismo numerador positivo, las partes de tamaño 1/${b} son mayores que las de tamaño 1/${b + 1}.`,
            `La mayor es ${a}/${b}.`,
          ],
          [
            "Imagina las dos barras del mismo tamaño.",
            "Más partes en una unidad significa partes más pequeñas.",
            `La mayor es ${a}/${b}.`,
          ],
        ),
        c(
          "q4",
          `Un compañero transforma ${a}/${b} en ${a + 1}/${b + 1} y dice que siempre son iguales. ¿Qué falla?`,
          [
            "Nada: sumar 1 siempre conserva una fracción",
            "Solo se pueden comparar fracciones con numerador 1",
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
            `${a} partes contienen ${a} × ${k} = ${a * k} litros; ${a}/${b} = ${a * k}/${b * k}.`,
          ],
          [
            "Relaciona la fracción con las marcas del sensor.",
            `Una de las ${b} partes ocupa ${k} marcas.`,
            `Toma ${a} grupos de ${k} marcas.`,
          ],
          { intent: "transfer", unit: "litros" },
        ),
      ];
    },
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
      const p = [25, 50, 75, 20, 40, 60][v],
        decimal = p / 100;
      return [
        c(
          "q0",
          `¿Qué significa ${p}%?`,
          [`${p} de cada 10`, `${p} unidades completas`, `${p} de cada 100`],
          2,
          `El símbolo % significa por cada cien: ${p}% = ${p}/100.`,
        ),
        n(
          "q1",
          `Escribe ${decimal.toLocaleString("es")} como porcentaje. Introduce el número que va antes de %.`,
          p,
          [
            `Multiplica ${decimal.toLocaleString("es")} por 100: ${p}.`,
            `La representación es ${p}%.`,
          ],
          [
            "El porcentaje compara con cien.",
            "Para pasar de decimal a porcentaje, multiplica por 100.",
            `El porcentaje es ${p}%.`,
          ],
          { unit: "%" },
        ),
        n(
          "q2",
          `Completa: ${p}% = ${p}/100 = __ en decimal.`,
          decimal,
          [`${p} ÷ 100 = ${decimal.toLocaleString("es")}.`],
          [
            "El símbolo % indica dividir entre cien.",
            `Calcula ${p} ÷ 100.`,
            `El decimal es ${decimal.toLocaleString("es")}.`,
          ],
          { step: true },
        ),
        n(
          "q3",
          `Escribe como decimal la fracción ${p}/100.`,
          decimal,
          [`${p} centésimas se escriben ${decimal.toLocaleString("es")}.`],
          [
            "Observa el denominador.",
            "Son centésimas.",
            `${p}/100 = ${decimal.toLocaleString("es")}.`,
          ],
        ),
        c(
          "q4",
          "Un panel tiene diez de sus diez partes cargadas. ¿Qué escritura decimal corresponde?",
          ["0,10", "1", "0,01"],
          1,
          "Diez décimos completan una unidad: 10/10 = 1. En cambio, 0,10 es una décima.",
        ),
        n(
          "q5",
          `Una pantalla indica que queda ${p}% de una reserva. Otra pantalla usa una escala de 0 a 1. ¿Qué número debe mostrar?`,
          decimal,
          [
            `Ambas pantallas deben conservar la proporción: ${p}/100 = ${decimal.toLocaleString("es")}.`,
          ],
          [
            "La reserva completa corresponde a 1.",
            "Convierte el porcentaje en una fracción con denominador 100.",
            `Divide ${p} entre 100.`,
          ],
          { intent: "transfer" },
        ),
      ];
    },
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
      const total = 40 + 20 * v,
        part = total / 4;
      return [
        c(
          "q0",
          `¿Por qué divides ${total} entre 4 para calcular 3/4 de ${total}?`,
          [
            "Porque siempre se divide entre el numerador",
            "Porque el total se reparte en cuatro grupos iguales",
            "Porque el resultado debe ser 4",
          ],
          1,
          "El denominador indica cuántos grupos iguales forman el total; después tomas los grupos que indica el numerador.",
        ),
        n(
          "q1",
          `Calcula 3/4 de ${total}.`,
          part * 3,
          [`${total} ÷ 4 = ${part}.`, `${part} × 3 = ${part * 3}.`],
          [
            "Calcula primero un cuarto del total.",
            `${total} ÷ 4 = ${part}.`,
            `Toma tres grupos de ${part}.`,
          ],
          {
            errors: [
              {
                value: (total * 4) / 3,
                feedback:
                  "Se divide entre el denominador y se multiplica por el numerador: revisa el papel de cada uno.",
              },
              {
                value: part,
                feedback:
                  "Encontraste un cuarto. Todavía debes tomar tres partes de ese tamaño.",
              },
            ],
          },
        ),
        n(
          "q2",
          `Completa el primer paso: 3/4 de ${total} = (${total} ÷ 4) × 3 = __ × 3.`,
          part,
          [`Un cuarto de ${total} es ${total} ÷ 4 = ${part}.`],
          [
            "Este paso busca una sola de las cuatro partes.",
            `Divide ${total} entre 4.`,
            `Cada parte vale ${part}.`,
          ],
          { step: true },
        ),
        n(
          "q3",
          `Calcula 5/4 de ${total}.`,
          part * 5,
          [
            `Un cuarto vale ${part}.`,
            `Cinco cuartos valen ${part} × 5 = ${part * 5}; supera ${total} porque 5/4 > 1.`,
          ],
          [
            "La fracción supera una unidad, pero el procedimiento se mantiene.",
            `Un cuarto vale ${part}.`,
            `Multiplica ${part} por 5.`,
          ],
        ),
        c(
          "q4",
          `Alguien calcula 3/4 de ${total} y obtiene ${total * 3}. ¿Qué paso falta?`,
          [
            "Multiplicar otra vez por 3",
            "Restar 4",
            "Dividir entre 4 para tener en cuenta el tamaño de las partes",
          ],
          2,
          `Multiplicar el total por 3 toma tres unidades completas; hay que dividir entre 4 para tomar tres cuartos.`,
        ),
        n(
          "q5",
          `Una reserva de ${total} unidades entrega 3/4 al hospital. ¿Cuántas unidades quedan para los otros edificios?`,
          part,
          [
            `El hospital recibe (${total} ÷ 4) × 3 = ${part * 3}.`,
            `Quedan ${total} − ${part * 3} = ${part}, el cuarto restante.`,
          ],
          [
            "Distingue lo entregado de lo que queda.",
            "Si se entregan tres cuartos, queda un cuarto.",
            `Calcula ${total} ÷ 4.`,
          ],
          { intent: "transfer", unit: "unidades" },
        ),
      ];
    },
    outcome:
      "Ya puedes planificar el suministro del hospital. En la aventura El apagón pondrás a prueba el reparto y verás sus consecuencias.",
    commonErrors: [
      "Dividir entre el numerador.",
      "Olvidar multiplicar por el número de partes tomadas.",
      "Dar como respuesta la cantidad entregada cuando se pregunta por la restante.",
    ],
  }),
];
