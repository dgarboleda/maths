import { defineLesson } from "./defineLesson";
import { choice as c, example as ex, numeric as n } from "./questions";
import type { Lesson } from "./types";

/** Escritura con el signo menos tipográfico. */
const sg = (x: number) => (x < 0 ? `−${-x}` : `${x}`);
/** Exponente en superíndice, de cualquier número de cifras. */
const sup = (k: number) =>
  String(k)
    .split("")
    .map((d) => "⁰¹²³⁴⁵⁶⁷⁸⁹"[Number(d)])
    .join("");
/** Entre paréntesis si es negativo, para escribirlo dentro de una operación. */
const p = (x: number) => (x < 0 ? `(−${-x})` : `${x}`);

export const NUMBER_LESSONS: Lesson[] = [
  defineLesson({
    id: "enteros-recta",
    unitId: "numeros",
    title: "Números enteros en la recta",
    objective:
      "Ubicar, comparar y ordenar números enteros usando la recta numérica, el opuesto y el valor absoluto.",
    purpose:
      "Los sensores de la ciudad registran temperaturas bajo cero y niveles bajo el suelo. Para leerlos hay que saber qué indica el signo.",
    prerequisites: [],
    legacyModuleIds: ["aritmetica-d10", "medicion-d1"],
    visual: "integers",
    vocabulary: [
      { term: "Número entero", meaning: "Los naturales, el cero y sus opuestos negativos: …, −2, −1, 0, 1, 2, …" },
      { term: "Opuesto", meaning: "El número a la misma distancia del cero pero al otro lado: el opuesto de −4 es 4." },
      { term: "Valor absoluto", meaning: "La distancia de un número al cero, sin signo: |−4| = 4." },
    ],
    sections: [
      {
        title: "El cero separa dos sentidos",
        paragraphs: [
          "En la recta numérica, los positivos quedan a la derecha del cero y los negativos a la izquierda. El signo indica el sentido respecto de una referencia: −5 °C son cinco grados por debajo de cero.",
          "Cada entero tiene un opuesto a la misma distancia del cero: 3 y −3. Sumar un número y su opuesto da 0.",
        ],
        formula: "… −3 −2 −1 0 1 2 3 …",
      },
      {
        title: "Más a la derecha, mayor",
        paragraphs: [
          "De dos números, es mayor el que está más a la derecha. Por eso −2 > −7: −2 está más cerca del cero por la izquierda.",
          "Con negativos, la cifra mayor no indica el número mayor: −7 tiene más unidades que −2, pero está más a la izquierda.",
        ],
        formula: "−7 < −2 < 0 < 3",
      },
      {
        title: "Distancia y valor absoluto",
        paragraphs: [
          "El valor absoluto mide la distancia al cero: |−6| = 6 y |6| = 6. Una distancia nunca es negativa.",
          "La distancia entre dos enteros es el valor absoluto de su diferencia. Entre −3 y 5 hay 3 unidades hasta el cero y 5 más: 8.",
        ],
        formula: "distancia(−3, 5) = |5 − (−3)| = 8",
      },
    ],
    examples: [
      ex(
        "Ordena de menor a mayor: 4, −6, 0, −1.",
        [
          ["−6 está más a la izquierda", "Entre los negativos, el más alejado del cero es el menor."],
          ["−6 < −1 < 0", "−1 está a la izquierda del cero pero más cerca que −6."],
          ["−6 < −1 < 0 < 4", "El positivo queda a la derecha de todos."],
        ],
        "Al ordenar, imagina la recta: de izquierda a derecha los números crecen.",
      ),
      ex(
        "Un sensor marca −4 °C a las 6:00 y 7 °C a mediodía. ¿Cuántos grados subió?",
        [
          ["De −4 a 0 hay 4 grados", "Primero llegamos a la referencia."],
          ["De 0 a 7 hay 7 grados", "Después contamos lo que queda por encima de cero."],
          ["4 + 7 = 11", "La distancia es |7 − (−4)| = 11."],
        ],
        "Subió 11 grados: la distancia en la recta no depende del signo de los extremos.",
      ),
    ],
    diagnostic: [
      c("d-1", "Si hace 3 grados bajo cero, ¿cómo se escribe?", ["3 °C", "−3 °C", "0,3 °C"], 1, "Bajo cero se indica con el signo menos."),
      n("d-2", "¿Cuánto es 9 − 4?", 5, ["9 − 4 = 5."], ["Cuenta hacia atrás desde 9.", "Faltan 5 para llegar de 4 a 9.", "El resultado es 5."]),
      c("d-3", "¿Qué número está más cerca del 0?", ["7", "2", "5"], 1, "2 está a dos unidades del cero; los otros, más lejos."),
    ],
    questions(v) {
      const [a, b, k] = [[2, 7, 5], [5, 3, 9], [8, 4, 6], [3, 9, 2], [6, 1, 7], [4, 6, 3]][v],
        mid = [[-6, 4], [-8, 2], [-5, 9], [-10, 4], [-3, 7], [-12, 6]][v];
      const [m1, m2] = mid;
      return [
        v % 2 === 0
          ? c(
              "q0",
              `Un sensor marca −${k} °C. ¿Qué indica el signo menos?`,
              [
                "Que la temperatura está por debajo de cero",
                ["Que el sensor tiene un error", "Un número negativo es una medida válida: indica el sentido respecto del cero."],
                [`Que hace ${k} grados más que ayer`, "El signo compara con el cero, no con otro día."],
              ],
              0,
              `−${k} °C son ${k} grados por debajo de la referencia 0 °C.`,
            )
          : c(
              "q0",
              `¿Qué significa |−${k}| = ${k}?`,
              [
                ["Que −" + k + " es positivo", "El número sigue siendo negativo; lo positivo es su distancia al cero."],
                `Que −${k} está a ${k} unidades del cero`,
                [`Que hay que restar ${k}`, "Las barras no indican una resta: miden distancia."],
              ],
              1,
              "El valor absoluto es la distancia al cero, que nunca es negativa.",
            ),
        n(
          "q1",
          `Escribe el mayor de estos números: −${a}, −${b}, −${k}.`,
          -Math.min(a, b, k),
          [
            "Entre negativos, el mayor es el más cercano al cero.",
            `El mayor es ${sg(-Math.min(a, b, k))}.`,
          ],
          ["Imagina los tres en la recta.", "¿Cuál queda más a la derecha?", `El más cercano a 0 es ${sg(-Math.min(a, b, k))}.`],
          {
            errors: [
              { value: -Math.max(a, b, k), feedback: "Ese es el menor: tiene más unidades, pero está más lejos del cero por la izquierda." },
              { value: Math.max(a, b, k), feedback: "Todos los números son negativos: la respuesta también debe serlo." },
            ],
          },
        ),
        n(
          "q2",
          `Completa: la distancia de −${a} al cero es |−${a}| = __.`,
          a,
          [`−${a} está a ${a} unidades del cero.`],
          ["El valor absoluto mide distancia.", "Una distancia no es negativa.", `|−${a}| = ${a}.`],
          { step: true, errors: [{ value: -a, feedback: "Una distancia nunca es negativa." }] },
        ),
        n(
          "q3",
          `¿Cuántas unidades hay entre −${a} y ${b} en la recta?`,
          a + b,
          [`De −${a} a 0 hay ${a}; de 0 a ${b} hay ${b}.`, `${a} + ${b} = ${a + b}.`],
          ["Pasa por el cero.", `De −${a} a 0 hay ${a} unidades.`, `Suma ${a} y ${b}.`],
          {
            errors: [{ value: Math.abs(b - a), feedback: `Restaste las cifras. Los números están a lados distintos del cero: las distancias se suman.` }],
          },
        ),
        c(
          "q4",
          `¿Por qué −${Math.max(a, b)} < −${Math.min(a, b)}?`,
          [
            [`Porque ${Math.max(a, b)} > ${Math.min(a, b)}`, "Esa comparación vale para positivos; con negativos el orden se invierte."],
            `Porque −${Math.max(a, b)} está más a la izquierda en la recta`,
            ["Porque los dos son iguales en valor absoluto", "Tienen valores absolutos distintos."],
          ],
          1,
          "En la recta, el número de la izquierda es el menor.",
        ),
        n(
          "q5",
          `A las 6:00 un sensor marca −${a} °C y a mediodía ${b} °C. ¿Cuántos grados subió la temperatura?`,
          a + b,
          [`De −${a} a 0 sube ${a}; de 0 a ${b}, ${b} más.`, `Subió ${a + b} grados.`],
          ["Dibuja ambas temperaturas en la recta.", "Cuenta hasta el cero y después hasta el final.", `${a} + ${b} = ${a + b}.`],
          {
            intent: "transfer",
            unit: "°C",
            errors: [{ value: Math.abs(b - a), feedback: "Restaste las cifras sin considerar que una temperatura es negativa." }],
          },
        ),
        n(
          "q6",
          `¿Qué número está justo en el punto medio entre ${sg(m1)} y ${m2} en la recta?`,
          (m1 + m2) / 2,
          [
            `La distancia entre ambos es ${m2 - m1}; la mitad es ${(m2 - m1) / 2}.`,
            `${sg(m1)} + ${(m2 - m1) / 2} = ${sg((m1 + m2) / 2)}.`,
          ],
          [
            "Calcula primero la distancia entre los dos números.",
            "Toma la mitad de esa distancia.",
            `Avanza esa mitad desde ${sg(m1)}.`,
          ],
          {
            intent: "transfer",
            errors: [
              { value: (m2 - m1) / 2, feedback: "Esa es la mitad de la distancia. Súmala al número de la izquierda para llegar al punto medio." },
            ],
          },
        ),
      ];
    },
    application: n(
      "app",
      "El ascensor de la central está en el piso −3 (tercer sótano). Sube 8 pisos y después baja 2. ¿En qué piso queda?",
      3,
      ["−3 + 8 = 5.", "5 − 2 = 3: queda en el piso 3."],
      ["Representa los pisos en una recta vertical.", "Primero sube 8 desde −3.", "Después baja 2."],
      {
        intent: "transfer",
        errors: [
          { value: 9, feedback: "Trataste −3 como 3. El ascensor empieza bajo el piso 0." },
          { value: 5, feedback: "Ese es el piso después de subir. Falta bajar 2." },
        ],
      },
    ),
    outcome: "Los sensores de temperatura y nivel ya son legibles: sabes ubicar, comparar y medir distancias con negativos.",
    commonErrors: [
      "Creer que −7 es mayor que −2 porque 7 > 2.",
      "Dar un valor absoluto negativo.",
      "Restar las cifras al medir la distancia entre un negativo y un positivo.",
    ],
  }),
  defineLesson({
    id: "enteros-suma-resta",
    unitId: "numeros",
    title: "Sumar y restar enteros",
    objective:
      "Sumar y restar números enteros interpretando cada operación como un desplazamiento en la recta.",
    purpose:
      "El balance de energía de la ciudad combina ingresos y consumos. Para saber cuánto queda hay que operar con positivos y negativos.",
    prerequisites: ["enteros-recta"],
    legacyModuleIds: ["aritmetica-d10"],
    visual: "integers",
    vocabulary: [
      { term: "Desplazamiento", meaning: "Sumar un positivo avanza a la derecha; sumar un negativo, a la izquierda." },
      { term: "Opuesto", meaning: "Restar un número es lo mismo que sumar su opuesto." },
    ],
    sections: [
      {
        title: "Sumar es desplazarse",
        paragraphs: [
          "En −3 + 5, empiezas en −3 y avanzas 5 hacia la derecha: llegas a 2. En 4 + (−6), empiezas en 4 y retrocedes 6: llegas a −2.",
          "Con signos iguales, se suman las distancias y se conserva el signo. Con signos distintos, se restan las distancias y gana el signo del que está más lejos del cero.",
        ],
        formula: "−3 + 5 = 2;  4 + (−6) = −2;  −2 + (−5) = −7",
      },
      {
        title: "Restar es sumar el opuesto",
        paragraphs: [
          "Restar 6 equivale a sumar −6. Por eso 2 − 6 = 2 + (−6) = −4.",
          "Restar un negativo equivale a sumar un positivo: 3 − (−4) = 3 + 4 = 7. Quitar una deuda aumenta el saldo.",
        ],
        formula: "a − b = a + (−b);  3 − (−4) = 7",
      },
      {
        title: "Comprueba con el contexto",
        paragraphs: [
          "Si gastas más de lo que tienes, el saldo queda negativo: 5 − 8 = −3.",
          "La variación de una cantidad es final − inicial. Si la temperatura pasa de −2 a −7, la variación es −7 − (−2) = −5: bajó 5 grados.",
        ],
        formula: "variación = final − inicial",
      },
    ],
    examples: [
      ex("Calcula −7 + 3.", [
        ["Empieza en −7", "El primer sumando fija el punto de partida."],
        ["Avanza 3 a la derecha", "Sumar un positivo desplaza hacia la derecha."],
        ["−7 + 3 = −4", "Las distancias 7 y 3 tienen signos distintos: 7 − 3 = 4 y gana el signo de −7."],
      ], "−7 + 3 = −4."),
      ex("Calcula 2 − (−5).", [
        ["2 − (−5) = 2 + 5", "Restar un número es sumar su opuesto."],
        ["2 + 5 = 7", "Ahora es una suma de positivos."],
        ["7 − 2 = 5 = −(−5)", "Comprobación: la distancia de 2 a 7 es 5."],
      ], "2 − (−5) = 7: quitar una deuda de 5 aumenta el saldo en 5."),
    ],
    diagnostic: [
      c("d-1", "¿Cuál es mayor?", ["−5", "−1", "−9"], 1, "−1 es el más cercano al cero por la izquierda."),
      n("d-2", "¿Cuánto es 12 − 7?", 5, ["12 − 7 = 5."], ["Cuenta desde 7 hasta 12.", "Faltan 5.", "El resultado es 5."]),
      c("d-3", "¿Cuál es el opuesto de 6?", ["1/6", "−6", "0"], 1, "El opuesto está a la misma distancia del cero, al otro lado."),
    ],
    questions(v) {
      const [a, b] = [[-6, 9], [-8, 3], [5, -11], [-4, 10], [7, -12], [-9, 5]][v],
        [c1, c2] = [[3, 5], [6, 4], [2, 9], [7, 8], [5, 6], [4, 7]][v],
        [money, spend] = [[20, 35], [15, 22], [40, 47], [12, 30], [25, 31], [18, 26]][v],
        [t1, t2] = [[-2, -9], [-5, -1], [3, -4], [-7, -3], [-1, -8], [4, -6]][v];
      return [
        v % 2 === 0
          ? c(
              "q0",
              `Restar ${c2} equivale a…`,
              [
                [`Sumar ${c2}`, "Sumar lo mismo que se resta cambia el resultado: hay que sumar el opuesto."],
                `Sumar −${c2}`,
                [`Restar −${c2}`, `Restar −${c2} es sumar ${c2}, lo contrario.`],
              ],
              1,
              "Restar un número es sumar su opuesto.",
            )
          : c(
              "q0",
              `¿Por qué ${sg(-c1)} + ${c1 + c2} da un resultado positivo?`,
              [
                [`Porque en una suma el resultado siempre es positivo`, "Una suma puede dar negativo, por ejemplo −5 + 2."],
                `Porque ${c1 + c2} está más lejos del cero que ${sg(-c1)}`,
                ["Porque se ignoran los signos", "Los signos indican sentido: no se pueden ignorar."],
              ],
              1,
              "Con signos distintos, gana el signo del número con mayor valor absoluto.",
            ),
        n(
          "q1",
          `Calcula ${sg(a)} + ${p(b)}.`,
          a + b,
          [`Signos distintos: ${Math.abs(a)} y ${Math.abs(b)} → ${Math.abs(Math.abs(a) - Math.abs(b))}.`, `Gana el signo del más alejado del cero: ${sg(a + b)}.`],
          [`Empieza en ${sg(a)} en la recta.`, `Desplázate ${Math.abs(b)} hacia la ${b > 0 ? "derecha" : "izquierda"}.`, `El resultado es ${sg(a + b)}.`],
          {
            errors: [
              { value: -(a + b), feedback: "El signo está invertido: gana el signo del número más alejado del cero." },
              { value: Math.abs(a) + Math.abs(b), feedback: "Sumaste las distancias. Con signos distintos se restan." },
            ],
          },
        ),
        n(
          "q2",
          `Completa: ${c1} − (−${c2}) = ${c1} + __.`,
          c2,
          [`Restar −${c2} es sumar su opuesto, ${c2}.`],
          ["Restar es sumar el opuesto.", `El opuesto de −${c2} es ${c2}.`, `${c1} + ${c2}.`],
          { step: true, errors: [{ value: -c2, feedback: `Restar −${c2} es sumar el opuesto de −${c2}, que es positivo.` }] },
        ),
        n(
          "q3",
          `Calcula −${c1} − ${c2}.`,
          -c1 - c2,
          [`−${c1} − ${c2} = −${c1} + (−${c2}).`, `Mismo signo: se suman las distancias y se conserva el signo: −${c1 + c2}.`],
          ["Escribe la resta como suma del opuesto.", "Los dos sumandos son negativos.", `−(${c1} + ${c2}).`],
          {
            errors: [
              { value: c2 - c1, feedback: `Calculaste −${c1} + ${c2}. Restar ${c2} desplaza a la izquierda.` },
              { value: c1 + c2, feedback: "Los dos desplazamientos son hacia la izquierda: el resultado es negativo." },
            ],
          },
        ),
        c(
          "q4",
          `Un compañero escribe −${c1} − ${c2} = ${sg(c2 - c1)}. ¿Qué falla?`,
          [
            ["Nada: los signos menos se cancelan", "Solo se cancelan dos signos seguidos, como en −(−3). Aquí no hay un negativo restado."],
            `Restar ${c2} desplaza ${c2} a la izquierda: el resultado es −${c1 + c2}`,
            ["Debía multiplicar los números", "Es una resta: no hay ninguna multiplicación."],
          ],
          1,
          "−a − b = −a + (−b) = −(a + b).",
        ),
        n(
          "q5",
          `Una cuenta tiene ${money} créditos y se pagan ${spend}. ¿Cuál es el saldo?`,
          money - spend,
          [`${money} − ${spend} = ${sg(money - spend)}.`, "El saldo es negativo: se debe más de lo que había."],
          ["Gastar es restar.", `Restar ${spend} desde ${money} cruza el cero.`, `El saldo es ${sg(money - spend)}.`],
          {
            intent: "transfer",
            unit: "créditos",
            errors: [{ value: spend - money, feedback: "Restaste al revés. Al gastar más de lo que hay, el saldo queda negativo." }],
          },
        ),
        n(
          "q6",
          `La temperatura pasó de ${sg(t1)} °C a ${sg(t2)} °C. ¿Cuál fue la variación (final − inicial)?`,
          t2 - t1,
          [`Variación = ${sg(t2)} − ${p(t1)} = ${sg(t2)} + ${-t1 >= 0 ? -t1 : `(${sg(-t1)})`}.`, `= ${sg(t2 - t1)}: ${t2 - t1 > 0 ? "subió" : "bajó"} ${Math.abs(t2 - t1)} grados.`],
          ["La variación es final menos inicial.", `Escribe ${sg(t2)} − ${p(t1)}.`, "Restar un negativo es sumar su opuesto."],
          {
            intent: "transfer",
            unit: "°C",
            errors: [
              { value: t1 - t2, feedback: "Restaste inicial − final. La variación es final − inicial: su signo dice si subió o bajó." },
              { value: t2 + t1, feedback: "Sumaste las temperaturas. La variación se calcula restando la inicial." },
            ].filter((e) => e.value !== t2 - t1),
          },
        ),
      ];
    },
    application: n(
      "app",
      "El balance de energía de la central empieza en −15 unidades. Recibe 40 de la presa, consume 32 y le devuelven una deuda de −6 (se cancela una deuda de 6). ¿Cuál es el balance final?",
      -1,
      ["−15 + 40 = 25.", "25 − 32 = −7.", "Cancelar una deuda de 6 es restar −6: −7 − (−6) = −1."],
      ["Traduce cada movimiento a una suma o resta.", "Cancelar una deuda aumenta el balance.", "Calcula paso a paso desde −15."],
      {
        intent: "transfer",
        unit: "unidades",
        errors: [
          { value: -13, feedback: "Restaste 6 en lugar de cancelar la deuda. Quitar una deuda de 6 aumenta el balance." },
          { value: -7, feedback: "Falta el último movimiento: cancelar la deuda de 6." },
        ],
      },
    ),
    outcome: "El balance de energía cuadra aunque haya deudas: sumas y restas con signo en la recta.",
    commonErrors: [
      "Ignorar los signos y sumar las distancias.",
      "Creer que restar un negativo hace el resultado más pequeño.",
      "Calcular la variación como inicial − final.",
    ],
  }),
  defineLesson({
    id: "enteros-producto-cociente",
    unitId: "numeros",
    title: "Multiplicar y dividir enteros",
    objective:
      "Multiplicar y dividir números enteros justificando la regla de los signos.",
    purpose:
      "Un vehículo de rescate desciende a velocidad constante. Para saber dónde estará hay que multiplicar con negativos.",
    prerequisites: ["enteros-suma-resta"],
    legacyModuleIds: ["aritmetica-d10", "aritmetica-d5", "aritmetica-d6"],
    visual: "integers",
    vocabulary: [
      { term: "Regla de los signos", meaning: "Signos iguales dan positivo; signos distintos dan negativo." },
      { term: "Cociente", meaning: "Resultado de una división." },
    ],
    sections: [
      {
        title: "Multiplicar es sumar grupos iguales",
        paragraphs: [
          "3 × (−4) son tres grupos de −4: −4 − 4 − 4 = −12. Un positivo por un negativo da negativo.",
          "Multiplicar por −1 da el opuesto: −1 × 5 = −5. Por eso (−3) × 4 = −(3 × 4) = −12.",
        ],
        formula: "3 × (−4) = −12",
      },
      {
        title: "Negativo por negativo",
        paragraphs: [
          "(−3) × (−4) es el opuesto de 3 × (−4) = −12, es decir, 12. Cambiar de sentido dos veces devuelve al sentido original.",
          "Observa el patrón: (−3) × 2 = −6, (−3) × 1 = −3, (−3) × 0 = 0, (−3) × (−1) = 3. Cada vez que el segundo factor baja 1, el producto sube 3.",
        ],
        formula: "(−3) × (−4) = 12",
      },
      {
        title: "La división sigue la misma regla",
        paragraphs: [
          "Dividir deshace la multiplicación: como (−3) × 4 = −12, entonces −12 ÷ 4 = −3 y −12 ÷ (−3) = 4.",
          "Con varios factores, cuenta los negativos: un número par de signos menos da positivo; uno impar, negativo.",
        ],
        formula: "(−20) ÷ (−5) = 4;  (−2)(−1)(−3) = −6",
      },
    ],
    examples: [
      ex("Un dron desciende 3 m por segundo. ¿Cuánto cambia su altura en 5 s?", [
        ["Cambio por segundo: −3 m", "Descender es un cambio negativo de altura."],
        ["5 × (−3) = −15", "Cinco grupos de −3."],
        ["La altura baja 15 m", "El signo negativo indica descenso."],
      ], "El cambio es −15 m."),
      ex("Calcula (−24) ÷ (−6).", [
        ["Signos iguales → positivo", "Ambos son negativos."],
        ["24 ÷ 6 = 4", "Dividimos los valores absolutos."],
        ["(−6) × 4 = −24", "Comprobamos con la multiplicación inversa."],
      ], "(−24) ÷ (−6) = 4."),
    ],
    diagnostic: [
      n("d-1", "¿Cuánto es 7 × 6?", 42, ["7 × 6 = 42."], ["Piensa en 7 grupos de 6.", "7 × 5 = 35; añade 7.", "42."]),
      n("d-2", "¿Cuánto es −4 − 4 − 4?", -12, ["Tres desplazamientos de 4 a la izquierda: −12."], ["Empieza en −4.", "Retrocede 4 dos veces más.", "−12."]),
      c("d-3", "¿Qué deshace multiplicar por 5?", ["Restar 5", "Dividir entre 5", "Sumar 5"], 1, "Multiplicar y dividir por el mismo número distinto de cero son inversas."),
    ],
    questions(v) {
      const [a, b] = [[4, 7], [6, 3], [9, 5], [8, 4], [7, 6], [5, 9]][v],
        [d, q] = [[56, 8], [42, 6], [72, 9], [36, 4], [63, 7], [48, 6]][v],
        [rate, time] = [[2, 6], [4, 5], [3, 9], [5, 7], [6, 4], [8, 3]][v],
        [x, y] = [[3, 8], [6, 7], [4, 9], [7, 5], [2, 11], [9, 4]][v];
      return [
        v % 2 === 0
          ? c(
              "q0",
              `¿Por qué (−${a}) × (−${b}) es positivo?`,
              [
                ["Porque dos negativos se suman", "Es una multiplicación, no una suma."],
                `Porque es el opuesto de ${a} × (−${b}) = −${a * b}`,
                ["Porque el signo se ignora al multiplicar", "El signo importa: un solo factor negativo da negativo."],
              ],
              1,
              "Multiplicar por −1 da el opuesto; hacerlo dos veces vuelve al sentido positivo.",
            )
          : c(
              "q0",
              "¿Qué signo tiene el producto de tres números negativos?",
              [
                "Negativo",
                ["Positivo", "Dos negativos dan positivo, pero el tercero vuelve a cambiar el signo."],
                ["Depende de cuáles sean", "Solo importa cuántos factores son negativos."],
              ],
              0,
              "Un número impar de factores negativos da negativo.",
            ),
        n(
          "q1",
          `Calcula (−${a}) × ${b}.`,
          -a * b,
          [`${a} × ${b} = ${a * b}.`, `Signos distintos → negativo: −${a * b}.`],
          ["Multiplica los valores absolutos.", "Un factor es negativo y el otro positivo.", `−${a * b}.`],
          { errors: [{ value: a * b, feedback: "Signos distintos dan un producto negativo." }] },
        ),
        n(
          "q2",
          `Completa: (−${a}) × (−${b}) = +__.`,
          a * b,
          [`Signos iguales → positivo; ${a} × ${b} = ${a * b}.`],
          ["Multiplica los valores absolutos.", "Los dos factores tienen el mismo signo.", `${a * b}.`],
          { step: true, errors: [{ value: -a * b, feedback: "Ya está el signo +: escribe el valor del producto." }] },
        ),
        n(
          "q3",
          `Calcula (−${d}) ÷ ${q}.`,
          -d / q,
          [`${d} ÷ ${q} = ${d / q}.`, `Signos distintos → negativo: −${d / q}.`],
          ["La división sigue la regla de los signos.", `Divide ${d} entre ${q}.`, `Comprueba: ${q} × (−${d / q}) = −${d}.`],
          { errors: [{ value: d / q, feedback: "Signos distintos dan un cociente negativo." }] },
        ),
        c(
          "q4",
          `Un compañero dice que (−${d}) ÷ (−${q}) = −${d / q} "porque hay signos menos". ¿Qué responde?`,
          [
            ["Tiene razón: si hay negativos, el resultado es negativo", "Dos negativos dan positivo, también al dividir."],
            [`Que hay que restar: −${d} − (−${q})`, "Es una división; restar es otra operación."],
            `No: signos iguales dan positivo, ${d / q}, porque (−${q}) × ${d / q} = −${d}`,
          ],
          2,
          "La división deshace la multiplicación y sigue la misma regla de los signos.",
        ),
        n(
          "q5",
          `Un vehículo de rescate desciende ${rate} m por minuto. ¿Cuánto cambia su altura en ${time} minutos?`,
          -rate * time,
          [`Cambio por minuto: −${rate} m.`, `${time} × (−${rate}) = −${rate * time} m.`],
          ["Descender es un cambio negativo.", `Son ${time} grupos de −${rate}.`, `Multiplica ${time} por −${rate}.`],
          {
            intent: "transfer",
            unit: "m",
            errors: [{ value: rate * time, feedback: "Al descender, la altura disminuye: el cambio es negativo." }],
          },
        ),
        n(
          "q6",
          `¿Qué número multiplicado por −${x} da ${x * y}?`,
          -y,
          [`Buscamos n con (−${x}) × n = ${x * y}.`, `n = ${x * y} ÷ (−${x}) = −${y}.`],
          ["Es una multiplicación con un factor desconocido.", "Deshazla con una división.", `Divide ${x * y} entre −${x}.`],
          {
            intent: "transfer",
            errors: [{ value: y, feedback: `Comprueba: (−${x}) × ${y} = −${x * y}. Para obtener un positivo, el otro factor debe ser negativo.` }],
          },
        ),
      ];
    },
    application: n(
      "app",
      "Un buzo está a −12 m. Sube 2 m por minuto durante 4 minutos y después desciende 3 m por minuto durante 5 minutos. ¿A qué profundidad termina?",
      -19,
      ["Subida: 4 × 2 = 8 m → −12 + 8 = −4.", "Descenso: 5 × (−3) = −15 → −4 − 15 = −19."],
      ["Calcula el cambio de cada tramo con su signo.", "Subir es positivo; descender, negativo.", "Suma ambos cambios a −12."],
      {
        intent: "transfer",
        unit: "m",
        errors: [
          { value: -35, feedback: "El primer tramo es de subida: su cambio es positivo." },
          { value: -4, feedback: "Ese es el nivel tras la subida. Falta el descenso." },
        ],
      },
    ),
    outcome: "Puedes predecir posiciones y cambios con velocidades negativas.",
    commonErrors: [
      "Creer que dos negativos dan negativo.",
      "Aplicar la regla de la suma a la multiplicación.",
      "Olvidar que la división sigue la misma regla de los signos.",
    ],
  }),
  defineLesson({
    id: "jerarquia-operaciones",
    unitId: "numeros",
    title: "Orden de las operaciones",
    objective:
      "Calcular expresiones con varias operaciones respetando paréntesis, potencias, productos y sumas, y escribir expresiones que modelen una situación.",
    purpose:
      "Las hojas de cálculo de la central combinan varias operaciones. Si se calculan en otro orden, el resultado cambia.",
    prerequisites: ["enteros-producto-cociente"],
    legacyModuleIds: ["aritmetica-jerarquia", "logica-d5"],
    visual: "equation",
    vocabulary: [
      { term: "Prioridad", meaning: "Orden convenido: paréntesis, potencias, multiplicaciones y divisiones, sumas y restas." },
      { term: "De izquierda a derecha", meaning: "Entre operaciones del mismo nivel, se calcula en el orden en que aparecen." },
    ],
    sections: [
      {
        title: "Un acuerdo para que todos obtengan lo mismo",
        paragraphs: [
          "En 3 + 4 × 5, si cada persona eligiera el orden, unos obtendrían 35 y otros 23. Por acuerdo, se multiplica antes de sumar: 3 + 20 = 23.",
          "El orden es: paréntesis, potencias, multiplicaciones y divisiones, y por último sumas y restas.",
        ],
        formula: "3 + 4 × 5 = 3 + 20 = 23",
      },
      {
        title: "Mismo nivel: de izquierda a derecha",
        paragraphs: [
          "Multiplicar y dividir tienen la misma prioridad; se calculan de izquierda a derecha: 24 ÷ 4 × 2 = 6 × 2 = 12.",
          "Lo mismo con sumas y restas: 10 − 3 + 2 = 7 + 2 = 9, no 10 − 5.",
        ],
        formula: "10 − 3 + 2 = 9;  24 ÷ 4 × 2 = 12",
      },
      {
        title: "Los paréntesis cambian el orden",
        paragraphs: [
          "Los paréntesis indican qué calcular primero: (3 + 4) × 5 = 35. Úsalos al traducir situaciones: el precio de 3 paquetes de 4 cuadernos y 2 lápices sueltos es 3 × 4 + 2.",
          "Con paréntesis dentro de otros, resuelve desde el más interno.",
        ],
        formula: "2 × [10 − (3 + 4)] = 2 × 3 = 6",
      },
    ],
    examples: [
      ex("Calcula 18 − 2 × (3 + 4).", [
        ["3 + 4 = 7", "Primero el paréntesis."],
        ["2 × 7 = 14", "Después la multiplicación."],
        ["18 − 14 = 4", "Por último la resta."],
      ], "18 − 2 × (3 + 4) = 4."),
      ex("Calcula 20 ÷ 5 × 2 − 3.", [
        ["20 ÷ 5 = 4", "División y multiplicación, de izquierda a derecha."],
        ["4 × 2 = 8", "Seguimos en el mismo nivel."],
        ["8 − 3 = 5", "La resta al final."],
      ], "Si se multiplicara primero, se obtendría 20 ÷ 10 − 3 = −1: el orden importa."),
    ],
    diagnostic: [
      n("d-1", "¿Cuánto es 6 × 4?", 24, ["6 × 4 = 24."], ["Seis grupos de 4.", "4 + 4 + 4 + 4 + 4 + 4.", "24."]),
      n("d-2", "¿Cuánto es 15 − 9?", 6, ["15 − 9 = 6."], ["Cuenta desde 9.", "Hasta 15 faltan 6.", "6."]),
      c("d-3", "En (2 + 3) × 4, ¿qué se calcula primero?", ["2 + 3", "3 × 4", "Da igual"], 0, "Los paréntesis se calculan primero."),
    ],
    questions(v) {
      const [a, b, k] = [[5, 3, 4], [7, 2, 6], [4, 5, 3], [9, 3, 2], [6, 4, 5], [8, 2, 7]][v],
        [m, q, r, s] = [[3, 4, 2, 5], [5, 2, 6, 3], [4, 6, 3, 2], [2, 7, 5, 4], [6, 3, 4, 3], [3, 8, 2, 6]][v],
        [t, u, w] = [[20, 6, 4], [30, 9, 5], [24, 10, 3], [40, 13, 6], [18, 4, 2], [35, 11, 7]][v];
      return [
        v % 2 === 0
          ? c(
              "q0",
              `En ${a} + ${b} × ${k}, ¿qué se calcula primero?`,
              [
                [`${a} + ${b}`, "La suma tiene menor prioridad que la multiplicación."],
                `${b} × ${k}`,
                ["Da igual el orden", `No da igual: (${a} + ${b}) × ${k} = ${(a + b) * k}, pero ${a} + ${b} × ${k} = ${a + b * k}.`],
              ],
              1,
              "Sin paréntesis, se multiplica antes de sumar.",
            )
          : c(
              "q0",
              `¿Por qué ${t} − ${u} + ${w} no se calcula como ${t} − ${u + w}?`,
              [
                "Porque sumas y restas del mismo nivel se calculan de izquierda a derecha",
                ["Porque la suma siempre va primero", "La suma y la resta tienen la misma prioridad."],
                ["Porque hay que restar todo al final", "No hay una regla de restar al final."],
              ],
              0,
              `${t} − ${u} + ${w} = ${t - u} + ${w} = ${t - u + w}.`,
            ),
        n(
          "q1",
          `Calcula ${a} + ${b} × ${k}.`,
          a + b * k,
          [`${b} × ${k} = ${b * k}.`, `${a} + ${b * k} = ${a + b * k}.`],
          ["Busca la operación de mayor prioridad.", `Calcula primero ${b} × ${k}.`, `Suma ${a}.`],
          { errors: [{ value: (a + b) * k, feedback: "Sumaste primero. Sin paréntesis, la multiplicación va antes." }] },
        ),
        n(
          "q2",
          `Completa el primer paso de ${t} − ${m} × ${q}: ${m} × ${q} = __.`,
          m * q,
          [`${m} × ${q} = ${m * q}; después, ${t} − ${m * q} = ${t - m * q}.`],
          ["La multiplicación va primero.", `Multiplica ${m} por ${q}.`, `${m * q}.`],
          { step: true, errors: [{ value: t - m, feedback: "Ese paso no corresponde: la resta va después de la multiplicación." }] },
        ),
        n(
          "q3",
          `Calcula (${m} + ${r}) × ${s} − ${q}.`,
          (m + r) * s - q,
          [`Paréntesis: ${m} + ${r} = ${m + r}.`, `${m + r} × ${s} = ${(m + r) * s}.`, `${(m + r) * s} − ${q} = ${(m + r) * s - q}.`],
          ["Empieza por el paréntesis.", "Después multiplica.", "Resta al final."],
          {
            errors: [
              { value: (m + r) * (s - q), feedback: "Restaste antes de multiplicar. La multiplicación tiene prioridad." },
              { value: m + r * s - q, feedback: "Ignoraste el paréntesis: la suma de dentro va primero." },
            ].filter((e) => e.value !== (m + r) * s - q),
          },
        ),
        c(
          "q4",
          `Un compañero calcula ${t} ÷ ${w} × 2 como ${t} ÷ ${w * 2}. ¿Qué falla?`,
          [
            ["Nada: la multiplicación va antes que la división", "Tienen la misma prioridad."],
            `División y multiplicación se calculan de izquierda a derecha: (${t} ÷ ${w}) × 2`,
            ["Debía sumar primero", "No hay ninguna suma."],
          ],
          1,
          "Las operaciones del mismo nivel se resuelven en el orden en que aparecen.",
        ),
        n(
          "q5",
          `Compras ${m} paquetes de ${q} baterías a ${k} créditos cada batería, y pagas ${r} créditos de envío. ¿Cuánto pagas?`,
          m * q * k + r,
          [`Baterías: ${m} × ${q} = ${m * q}.`, `Costo: ${m * q} × ${k} + ${r} = ${m * q * k + r}.`],
          ["Cuenta primero las baterías.", "Multiplica por el precio y suma el envío una vez.", `${m} × ${q} × ${k} + ${r}.`],
          {
            intent: "transfer",
            unit: "créditos",
            errors: [{ value: m * q * (k + r), feedback: "Sumaste el envío a cada batería. El envío se paga una sola vez." }],
          },
        ),
        n(
          "q6",
          `Calcula 2 × [${t} − (${u} − ${w})].`,
          2 * (t - (u - w)),
          [`Paréntesis interno: ${u} − ${w} = ${u - w}.`, `Corchete: ${t} − ${u - w} = ${t - (u - w)}.`, `2 × ${t - (u - w)} = ${2 * (t - (u - w))}.`],
          ["Resuelve desde el paréntesis más interno.", `${u} − ${w} = ${u - w}.`, `Después ${t} − ${u - w} y multiplica por 2.`],
          {
            intent: "transfer",
            errors: [{ value: 2 * (t - u - w), feedback: `Restar el paréntesis (${u} − ${w}) es restar ${u} y sumar ${w}.` }],
          },
        ),
      ];
    },
    application: n(
      "app",
      "La central compra 4 cajas con 6 fusibles a 3 créditos cada uno, y devuelve 5 fusibles defectuosos por los que le reintegran su precio. ¿Cuánto paga en total? Escribe primero la expresión.",
      57,
      ["Expresión: 4 × 6 × 3 − 5 × 3.", "4 × 6 × 3 = 72 y 5 × 3 = 15.", "72 − 15 = 57."],
      ["Cuenta los fusibles comprados y su precio.", "El reintegro es el precio de los 5 devueltos.", "Calcula 4 × 6 × 3 − 5 × 3."],
      {
        intent: "transfer",
        unit: "créditos",
        errors: [
          { value: 67, feedback: "Restaste 5 créditos, no el precio de 5 fusibles." },
        ],
      },
    ),
    outcome: "Las hojas de cálculo de la central se leen igual para todos: respetas el orden de las operaciones.",
    commonErrors: [
      "Calcular siempre de izquierda a derecha sin considerar la prioridad.",
      "Multiplicar antes de dividir aunque la división aparezca primero.",
      "Restar un paréntesis sin cambiar el signo de su segundo término.",
    ],
  }),
  defineLesson({
    id: "potencias-raices",
    unitId: "numeros",
    title: "Potencias y raíces",
    objective:
      "Calcular potencias y raíces cuadradas, usar las propiedades de las potencias de igual base y estimar raíces no exactas.",
    purpose:
      "Las placas solares son cuadradas y los depósitos cúbicos. Para dimensionarlos hay que pasar del área o el volumen a la medida del lado.",
    prerequisites: ["jerarquia-operaciones"],
    legacyModuleIds: ["aritmetica-potencias", "aritmetica-raices"],
    visual: "area",
    vocabulary: [
      { term: "Potencia", meaning: "Multiplicación repetida de un mismo factor: 2⁴ = 2 × 2 × 2 × 2." },
      { term: "Raíz cuadrada", meaning: "El número no negativo que elevado al cuadrado da el valor: √49 = 7." },
    ],
    sections: [
      {
        title: "Una potencia abrevia un producto",
        paragraphs: [
          "En 3⁴, la base 3 se multiplica 4 veces: 3 × 3 × 3 × 3 = 81. No es 3 × 4.",
          "Con base negativa, el paréntesis importa: (−2)² = 4, pero −2² = −(2²) = −4.",
        ],
        formula: "3⁴ = 3 × 3 × 3 × 3 = 81",
      },
      {
        title: "Propiedades de igual base",
        paragraphs: [
          "Al multiplicar potencias de igual base se suman los exponentes: 2³ × 2² = 2⁵, porque son 3 + 2 factores iguales.",
          "Al dividir se restan: 5⁶ ÷ 5⁴ = 5². Al elevar una potencia, se multiplican: (3²)³ = 3⁶.",
        ],
        formula: "aᵐ × aⁿ = aᵐ⁺ⁿ;  aᵐ ÷ aⁿ = aᵐ⁻ⁿ",
      },
      {
        title: "La raíz deshace el cuadrado",
        paragraphs: [
          "√64 = 8 porque 8² = 64. Un cuadrado de 64 m² tiene lados de 8 m.",
          "Si el número no es un cuadrado perfecto, la raíz está entre dos enteros: √50 está entre 7 (√49) y 8 (√64), más cerca de 7.",
        ],
        formula: "√64 = 8;  7 < √50 < 8",
      },
    ],
    examples: [
      ex("Calcula 2⁵.", [
        ["2 × 2 = 4", "Multiplicamos la base por sí misma."],
        ["4 × 2 × 2 × 2 = 32", "Completamos los cinco factores."],
        ["2⁵ = 32 ≠ 2 × 5", "Una potencia no es un producto base × exponente."],
      ], "2⁵ = 32."),
      ex("Una placa cuadrada tiene 81 dm². ¿Cuánto mide su lado?", [
        ["lado² = 81", "El área de un cuadrado es lado × lado."],
        ["√81 = 9", "Buscamos el número que al cuadrado da 81."],
        ["9 × 9 = 81", "Comprobamos."],
      ], "El lado mide 9 dm."),
    ],
    diagnostic: [
      n("d-1", "¿Cuánto es 6 × 6?", 36, ["6 × 6 = 36."], ["Seis grupos de 6.", "30 + 6.", "36."]),
      c("d-2", "¿Qué número multiplicado por sí mismo da 25?", ["5", "12,5", "25"], 0, "5 × 5 = 25."),
      n("d-3", "¿Cuánto es 2 × 2 × 2?", 8, ["2 × 2 = 4; 4 × 2 = 8."], ["Multiplica de dos en dos.", "2 × 2 = 4.", "4 × 2 = 8."]),
    ],
    questions(v) {
      const [base, exp] = [[3, 3], [2, 6], [5, 3], [4, 3], [3, 4], [2, 5]][v],
        [e1, e2] = [[3, 4], [5, 2], [2, 6], [4, 3], [6, 3], [3, 5]][v],
        root = [7, 9, 12, 6, 11, 8][v],
        side = [13, 15, 9, 14, 16, 10][v],
        nonSquare = [50, 30, 90, 70, 20, 110][v];
      const lower = Math.floor(Math.sqrt(nonSquare));
      return [
        v % 2 === 0
          ? c(
              "q0",
              `¿Qué significa ${base}${sup(exp)}?`,
              [
                [`${base} × ${exp}`, "Eso sería multiplicar la base por el exponente; la potencia repite la base como factor."],
                `${base} multiplicado por sí mismo ${exp} veces`,
                [`${base} sumado ${exp} veces`, "Sumar repetidamente es multiplicar; la potencia repite una multiplicación."],
              ],
              1,
              `${base}${sup(exp)} = ${Array(exp).fill(base).join(" × ")}.`,
            )
          : c(
              "q0",
              `¿Son iguales (−${base})² y −${base}²?`,
              [
                ["Sí, los dos valen " + base * base, `−${base}² es el opuesto de ${base}², es decir −${base * base}.`],
                ["Sí, los dos valen −" + base * base, `(−${base})² = (−${base}) × (−${base}) = ${base * base}.`],
                `No: (−${base})² = ${base * base} y −${base}² = −${base * base}`,
              ],
              2,
              "El paréntesis indica que la base es negativa; sin él, el exponente afecta solo al número.",
            ),
        n(
          "q1",
          `Calcula ${base}${sup(exp)}.`,
          base ** exp,
          [`${Array(exp).fill(base).join(" × ")} = ${base ** exp}.`],
          ["Escribe la multiplicación repetida.", `Son ${exp} factores iguales a ${base}.`, `Multiplica paso a paso.`],
          { errors: [{ value: base * exp, feedback: "Multiplicaste base por exponente. La base se multiplica por sí misma." }] },
        ),
        n(
          "q2",
          `Completa: 2${sup(e1)} × 2${sup(e2)} = 2 elevado a __.`,
          e1 + e2,
          [`Hay ${e1} + ${e2} = ${e1 + e2} factores iguales a 2.`],
          ["Cuenta cuántos factores 2 hay en total.", "Con igual base, los exponentes se suman.", `${e1} + ${e2}.`],
          { step: true, errors: [{ value: e1 * e2, feedback: "Multiplicaste los exponentes. Al multiplicar potencias de igual base, se suman." }] },
        ),
        n(
          "q3",
          `Calcula √${root * root}.`,
          root,
          [`${root} × ${root} = ${root * root}, así que √${root * root} = ${root}.`],
          ["Busca un número que al cuadrado dé ese valor.", `Prueba con números cercanos a ${root}.`, `${root}² = ${root * root}.`],
          { errors: [{ value: (root * root) / 2, feedback: "La raíz no es la mitad: busca el número que multiplicado por sí mismo da el valor." }] },
        ),
        c(
          "q4",
          `Alguien dice que 3${sup(e1)} × 3${sup(e2)} = 9${sup(e1 + e2)}. ¿Qué falla?`,
          [
            ["Nada: se multiplican las bases y se suman los exponentes", "La base no cambia: hay que contar factores 3."],
            `La base se conserva: 3${sup(e1 + e2)}`,
            [`Los exponentes se multiplican: 3${sup(e1 * e2)}`, "Los exponentes se multiplican al elevar una potencia, no al multiplicar dos."],
          ],
          1,
          `Son ${e1} + ${e2} factores iguales a 3: 3 elevado a ${e1 + e2}.`,
        ),
        n(
          "q5",
          `Una placa solar cuadrada tiene ${side * side} dm² de área. ¿Cuánto mide su lado?`,
          side,
          [`lado² = ${side * side}.`, `√${side * side} = ${side} dm.`],
          ["El área del cuadrado es lado × lado.", "Busca el lado con una raíz cuadrada.", `${side} × ${side} = ${side * side}.`],
          {
            intent: "transfer",
            unit: "dm",
            errors: [{ value: (side * side) / 4, feedback: "Dividiste entre 4, como si fuera el perímetro. Para el área se usa la raíz cuadrada." }],
          },
        ),
        n(
          "q6",
          `√${nonSquare} no es exacta: está entre dos enteros consecutivos. Escribe el menor de ellos.`,
          lower,
          [`${lower}² = ${lower * lower} y ${lower + 1}² = ${(lower + 1) ** 2}.`, `${lower * lower} < ${nonSquare} < ${(lower + 1) ** 2}, así que ${lower} < √${nonSquare} < ${lower + 1}.`],
          ["Busca los cuadrados perfectos más cercanos.", `¿Qué cuadrado es el mayor que no supera ${nonSquare}?`, `Prueba con ${lower} y ${lower + 1}.`],
          {
            intent: "transfer",
            errors: [
              { value: lower + 1, feedback: `Ese es el entero mayor: ${lower + 1}² = ${(lower + 1) ** 2} ya supera ${nonSquare}.` },
              { value: nonSquare / 2, feedback: "La raíz no es la mitad del número." },
            ],
          },
        ),
      ];
    },
    application: n(
      "app",
      "Un depósito cúbico guarda 125 m³ de agua y se quiere otro con el doble de arista. ¿Cuántos m³ cabrán en el nuevo depósito?",
      1000,
      ["Arista actual: el número que al cubo da 125, es decir 5 m.", "Nueva arista: 10 m.", "Volumen: 10³ = 1000 m³ (ocho veces más, no el doble)."],
      ["El volumen de un cubo es arista³.", "Encuentra la arista actual.", "Duplica la arista y eleva al cubo."],
      {
        intent: "transfer",
        unit: "m³",
        errors: [
          { value: 250, feedback: "Duplicaste el volumen, pero se duplica la arista: el volumen se multiplica por 2³ = 8." },
          { value: 500, feedback: "Multiplicaste por 4 (2²), que es lo que pasa con el área. El volumen se multiplica por 2³." },
        ],
      },
    ),
    outcome: "Puedes dimensionar placas y depósitos pasando de áreas y volúmenes a longitudes.",
    commonErrors: [
      "Confundir 3⁴ con 3 × 4.",
      "Multiplicar las bases al multiplicar potencias.",
      "Creer que −2² = 4.",
      "Tomar la raíz como la mitad del número.",
    ],
  }),
];
