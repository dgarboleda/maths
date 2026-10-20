import { defineLesson } from "./defineLesson";
import { choice as c, example as ex, numeric as n } from "./questions";
import type { Lesson } from "./types";

const sg = (x: number) => (x < 0 ? `−${-x}` : `${x}`);

export const ALGEBRA_LESSONS: Lesson[] = [
  defineLesson({
    id: "igualdad-incognita",
    unitId: "algebra",
    title: "La igualdad y el valor desconocido",
    objective:
      "Interpretar una igualdad como dos cantidades equivalentes y comprobar un valor desconocido.",
    purpose:
      "La central usa dos medidores que deben representar la misma energía. Una incógnita permite expresar lo que falta sin adivinarlo.",
    prerequisites: [],
    legacyModuleIds: ["algebra-d2", "algebra-d3"],
    visual: "balance",
    vocabulary: [
      {
        term: "Igualdad",
        meaning:
          "Afirmación de que dos expresiones representan el mismo valor.",
      },
      {
        term: "Incógnita",
        meaning: "Valor desconocido representado por una letra.",
      },
      {
        term: "Solución",
        meaning:
          "Valor que hace verdadera una ecuación al sustituir la incógnita.",
      },
    ],
    sections: [
      {
        title: "El signo igual relaciona dos lados",
        paragraphs: [
          "El signo = afirma que lo que hay a su izquierda vale lo mismo que lo que hay a su derecha. No significa simplemente que ahora viene una respuesta.",
          "Por eso 8 = 3 + 5 y 3 + 5 = 6 + 2 son igualdades válidas. Lee ambos lados como cantidades.",
        ],
        formula: "3 + 5 = 6 + 2 porque ambos lados valen 8",
      },
      {
        title: "La letra conserva un lugar para lo desconocido",
        paragraphs: [
          "En x + 3 = 11, x representa un número que todavía no conocemos. Resolver es encontrar qué número hace que ambos lados valgan lo mismo.",
          "La letra no siempre vale lo mismo en problemas diferentes. Su significado depende de cada situación; anota qué cantidad representa y con qué unidad.",
        ],
        formula: "Si x = 8, entonces x + 3 = 8 + 3 = 11",
      },
      {
        title: "Comprobar es sustituir",
        paragraphs: [
          "Para verificar una propuesta, reemplaza cada aparición de x por ese valor y calcula los dos lados.",
          "Un procedimiento útil es restar la misma cantidad a ambos lados: la igualdad se conserva. Eso permite aislar el valor desconocido sin cambiar las soluciones.",
        ],
        formula: "x + 3 − 3 = 11 − 3 → x = 8",
      },
    ],
    examples: [
      ex(
        "¿Qué valor hace verdadera x + 7 = 19?",
        [
          [
            "x + 7 − 7 = 19 − 7",
            "Restar siete a ambos lados conserva la igualdad.",
          ],
          [
            "x = 12",
            "El lado izquierdo queda con el valor desconocido aislado.",
          ],
          ["12 + 7 = 19", "Sustituimos para comprobar la igualdad original."],
        ],
        "x = 12 es una solución porque hace verdadera la ecuación.",
      ),
      ex(
        "¿Es x = 4 una solución de 2x + 1 = 10?",
        [
          ["2 × 4 + 1 = 9", "Sustituimos x por el valor propuesto."],
          ["9 ≠ 10", "Comparamos el resultado con el otro lado."],
          [
            "x = 4 no es solución",
            "Una propuesta necesita satisfacer la ecuación, aunque esté cerca.",
          ],
        ],
        "La comprobación permite descartar una respuesta sin confiar solo en el procedimiento.",
      ),
    ],
    diagnostic: [
      n(
        "d-1",
        "¿Cuánto es 8 + 5?",
        13,
        ["8 + 5 = 13."],
        [
          "Puedes completar diez primero.",
          "8 + 2 = 10; faltan 3.",
          "El total es 13.",
        ],
      ),
      n(
        "d-2",
        "¿Cuánto es 13 − 5?",
        8,
        ["13 − 5 = 8."],
        [
          "Busca el número que sumado a 5 da 13.",
          "5 + 8 = 13.",
          "El resultado es 8.",
        ],
      ),
      c(
        "d-3",
        "¿Es verdadera 7 = 4 + 3?",
        [
          "Sí, ambos lados valen siete",
          "No, la respuesta siempre va a la derecha",
          "Solo si se cambia el signo",
        ],
        0,
        "Una igualdad compara valores, independientemente del orden de escritura.",
      ),
    ],
    questions(v) {
      const [x, b] = [[5, 3], [9, 4], [6, 8], [12, 5], [7, 9], [15, 6]][v],
        total = x + b,
        extra = [2, 6, 3, 7, 4, 5][v];
      const concept = [
        c(
          "q0",
          "¿Qué afirma el signo = en una ecuación?",
          [
            ["Que la operación terminó", "El signo igual no anuncia un resultado: compara dos expresiones."],
            "Que las expresiones de ambos lados tienen el mismo valor",
            ["Que la incógnita siempre vale cero", "La incógnita vale lo que haga verdadera la igualdad."],
          ],
          1,
          "La igualdad relaciona dos expresiones que representan el mismo valor.",
        ),
        c(
          "q0",
          `¿Es verdadera ${b} + ${x} = ${x} + ${b}?`,
          [
            "Sí: ambos lados valen lo mismo",
            ["No: a la derecha debería ir el resultado", "El = no exige un resultado a la derecha; compara valores."],
            ["No: los números están en otro orden", "El orden de los sumandos no cambia la suma."],
          ],
          0,
          `Ambos lados valen ${total}: la igualdad es verdadera.`,
        ),
        c(
          "q0",
          `En x + ${b} = ${total}, ¿qué representa x?`,
          [
            ["Siempre el número 10", "La letra no tiene un valor fijo: depende de la ecuación."],
            ["La operación que hay que hacer", "x es un número, no una operación."],
            "Un número desconocido que hace verdadera la igualdad",
          ],
          2,
          "La incógnita guarda el lugar de un número que hay que descubrir.",
        ),
      ];
      return [
        concept[v % 3],
        n(
          "q1",
          `¿Qué valor de x hace verdadera x + ${b} = ${total}?`,
          x,
          [
            `Resta ${b} a ambos lados: x = ${total} − ${b} = ${x}.`,
            `Comprueba: ${x} + ${b} = ${total}.`,
          ],
          [
            "Busca la cantidad que falta para llegar al total.",
            `Resta ${b} a ambos lados.`,
            `${total} − ${b} = ${x}.`,
          ],
          {
            errors: [
              { value: total + b, feedback: `Sumaste ${b}. Para deshacer la suma hay que restar ${b} a ambos lados.` },
            ],
          },
        ),
        n(
          "q2",
          `Comprueba si x = ${x} cumple la igualdad. Completa: x + ${b} = ${x} + ${b} = __.`,
          total,
          [`Sustituir x por ${x} da ${x} + ${b} = ${total}.`],
          [
            "La comprobación reemplaza la letra por un número.",
            `Suma ${x} y ${b}.`,
            `El resultado es ${total}.`,
          ],
          { step: true },
        ),
        n(
          "q3",
          `En __ = ${b} + ${x}, ¿qué número completa la igualdad?`,
          total,
          [`Ambos lados deben valer ${b} + ${x} = ${total}.`],
          [
            "El signo igual funciona en ambos sentidos.",
            "Calcula el lado derecho.",
            `El lado izquierdo debe valer ${total}.`,
          ],
        ),
        c(
          "q4",
          `En x + ${b} = ${total}, ¿qué transformación conserva la igualdad?`,
          [
            [`Restar ${b} solo al lado izquierdo`, "Cambiar un solo lado rompe el equilibrio entre ambos."],
            [`Sumar ${b} solo al derecho`, "Cambiar un solo lado rompe el equilibrio entre ambos."],
            `Restar ${b} a ambos lados`,
          ],
          2,
          "Aplicar la misma resta a ambos lados conserva las soluciones.",
        ),
        n(
          "q5",
          `Un depósito tenía una cantidad desconocida x. Recibe ${b} unidades y termina con ${total}. ¿Cuántas unidades tenía al inicio?`,
          x,
          [
            `Modelo: x + ${b} = ${total}.`,
            `x = ${total} − ${b} = ${x}; al recibir ${b}, llega a ${total}.`,
          ],
          [
            "La incógnita representa la reserva inicial.",
            "Expresa lo inicial más lo recibido igual a lo final.",
            `Resta ${b} al total ${total}.`,
          ],
          {
            intent: "transfer",
            unit: "unidades",
            errors: [
              { value: total + b, feedback: "El depósito recibió unidades: al inicio tenía menos que al final." },
            ],
          },
        ),
        n(
          "q6",
          `Completa la igualdad: ${total} + ${extra} = ${b} + __.`,
          total + extra - b,
          [
            `El lado izquierdo vale ${total} + ${extra} = ${total + extra}.`,
            `El derecho debe valer lo mismo: ${b} + ${total + extra - b} = ${total + extra}.`,
          ],
          [
            "El signo = no pide el resultado de la izquierda: ambos lados deben valer lo mismo.",
            `Calcula cuánto vale el lado izquierdo.`,
            `Busca qué número sumado a ${b} da ${total + extra}.`,
          ],
          {
            intent: "transfer",
            errors: [
              {
                value: total + extra,
                feedback: `Escribiste el resultado de la izquierda, pero entonces la derecha valdría ${b} + ${total + extra}. Ambos lados deben valer lo mismo.`,
              },
            ],
          },
        ),
      ];
    },
    application: n(
      "app",
      "Dos medidores de la central deben marcar lo mismo. El izquierdo indica x + 14 y el derecho, 9 + 23. ¿Qué valor de x equilibra los medidores?",
      18,
      [
        "El lado derecho vale 9 + 23 = 32.",
        "x + 14 = 32, así que x = 32 − 14 = 18.",
        "Comprobación: 18 + 14 = 32 = 9 + 23.",
      ],
      [
        "Calcula primero el lado que no tiene incógnita.",
        "Plantea x + 14 = 32.",
        "Resta 14 a ambos lados.",
      ],
      {
        intent: "transfer",
        errors: [
          { value: 32, feedback: "32 es el valor de cada lado. Se pide el valor de x." },
          { value: 46, feedback: "Sumaste 14. Para deshacer la suma, resta 14 a ambos lados." },
        ],
      },
    ),
    outcome:
      "Los medidores quedan relacionados mediante una igualdad que puedes comprobar sustituyendo valores.",
    commonErrors: [
      "Interpretar = como una orden para escribir una respuesta.",
      "Cambiar solo un lado de la igualdad.",
      "Aceptar un valor sin sustituirlo en la ecuación original.",
    ],
  }),
  defineLesson({
    id: "ecuaciones-un-paso",
    unitId: "algebra",
    title: "Resolver ecuaciones de un paso",
    objective:
      "Aislar una incógnita mediante una operación inversa aplicada a ambos lados y verificar la solución.",
    purpose:
      "Un sensor mide grupos de energía. Necesitas recuperar el valor de un grupo a partir del total indicado.",
    prerequisites: ["igualdad-incognita"],
    legacyModuleIds: ["algebra-d3", "algebra-d4"],
    visual: "equation",
    vocabulary: [
      {
        term: "Operación inversa",
        meaning:
          "Operación que deshace otra: sumar y restar; multiplicar y dividir por un número distinto de cero.",
      },
      {
        term: "Aislar",
        meaning:
          "Dejar la incógnita sola en un lado sin cambiar las soluciones.",
      },
    ],
    sections: [
      {
        title: "Deshaz la operación que afecta a x",
        paragraphs: [
          "Si a x se le suma 6, resta 6 a ambos lados. Si se le resta 6, suma 6 a ambos lados.",
          "El sentido del procedimiento viene de conservar la igualdad. Decir que un término pasa al otro lado es una abreviatura que necesita esa justificación.",
        ],
        formula: "x − 6 = 9 → x − 6 + 6 = 9 + 6 → x = 15",
      },
      {
        title: "Reparte cuando x está multiplicada",
        paragraphs: [
          "En 4x = 28, cuatro grupos iguales suman 28. Divide ambos lados entre 4 para hallar el valor de uno.",
          "Dividir por cero no está permitido. Si el coeficiente es distinto de cero, la división deshace la multiplicación.",
        ],
        formula: "4x/4 = 28/4 → x = 7",
      },
      {
        title: "Verifica también los valores negativos",
        paragraphs: [
          "Una incógnita puede ser negativa o una fracción. En x + 5 = 2, restar 5 da x = −3.",
          "Comprueba siempre sustituyendo en la ecuación original. Eso también revela errores de signo.",
        ],
        formula: "−3 + 5 = 2",
      },
    ],
    examples: [
      ex(
        "Resuelve 6x = 42.",
        [
          [
            "6x ÷ 6 = 42 ÷ 6",
            "Dividimos ambos lados por el mismo número distinto de cero.",
          ],
          ["x = 7", "La división deshace los seis grupos."],
          ["6 × 7 = 42", "Comprobamos en la ecuación original."],
        ],
        "Cada grupo vale siete.",
      ),
      ex(
        "Resuelve x + 8 = 3.",
        [
          ["x + 8 − 8 = 3 − 8", "Restamos ocho a ambos lados."],
          [
            "x = −5",
            "El resultado es negativo porque tres menos ocho es menos cinco.",
          ],
          ["−5 + 8 = 3", "La comprobación confirma el signo."],
        ],
        "Una solución negativa es válida si satisface la igualdad.",
      ),
      ex(
        "Una carga se reparte por igual entre 4 baterías y cada una recibe 6 unidades. ¿Cuál era la carga?",
        [
          ["x/4 = 6", "La incógnita está dividida entre cuatro."],
          ["x/4 × 4 = 6 × 4 → x = 24", "Multiplicar ambos lados por 4 deshace la división."],
          ["24 ÷ 4 = 6", "Comprobamos en la ecuación original."],
        ],
        "La multiplicación y la división también son operaciones inversas.",
      ),
    ],
    diagnostic: [
      c(
        "d-1",
        "Para conservar una igualdad al restar 4, debes…",
        [
          "Restar solo a la izquierda",
          "Restar a ambos lados",
          "Cambiar la letra",
        ],
        1,
        "La misma operación en ambos lados conserva la igualdad.",
      ),
      n(
        "d-2",
        "¿Cuánto es 24 ÷ 4?",
        6,
        ["4 × 6 = 24."],
        [
          "Son cuatro grupos iguales.",
          "Busca el número que multiplicado por 4 da 24.",
          "El cociente es 6.",
        ],
      ),
      n(
        "d-3",
        "¿Cuánto es 3 − 5?",
        -2,
        ["Desde 3, retroceder 5 en la recta lleva a −2."],
        [
          "El resultado puede ser negativo.",
          "De 3 a 0 recorres tres pasos; faltan dos.",
          "El resultado es −2.",
        ],
      ),
    ],
    questions(v) {
      const [x, m] = [[4, 3], [7, 5], [6, 8], [9, 4], [3, 7], [8, 6]][v],
        b = [5, 9, 4, 12, 7, 3][v],
        rhs = [5, 8, 3, 11, 6, 9][v],
        // x + c = r con solución negativa distinta en cada forma.
        [c3, r3] = [[6, 2], [9, 4], [5, -1], [12, 7], [8, 3], [10, 1]][v],
        [dm, dq] = [[3, 4], [5, 2], [4, 6], [2, 9], [6, 3], [7, 2]][v];
      return [
        c(
          "q0",
          `Para resolver ${m}x = ${m * x}, ¿qué operación conserva la igualdad y aísla x?`,
          [
            `Dividir ambos lados entre ${m}`,
            [`Restar ${m} solo a la izquierda`, `${m}x significa ${m} veces x: restar ${m} no deshace la multiplicación.`],
            [`Multiplicar solo el lado derecho por ${m}`, "Cambiar un solo lado rompe la igualdad."],
          ],
          0,
          `Como el coeficiente ${m} no es cero, dividir ambos lados entre él deshace la multiplicación.`,
        ),
        n(
          "q1",
          `Resuelve ${m}x = ${m * x}. Escribe el valor de x.`,
          x,
          [
            `Divide entre ${m} → x = ${m * x} ÷ ${m} = ${x}.`,
            `Comprueba: ${m} × ${x} = ${m * x}.`,
          ],
          [
            "La incógnita está multiplicada.",
            `Divide ambos lados entre ${m}.`,
            `x = ${m * x} ÷ ${m}.`,
          ],
          {
            errors: [
              { value: m * x - m, feedback: `Restaste el coeficiente. ${m}x son ${m} grupos de x: se deshace dividiendo.` },
              { value: m * x * m, feedback: "Multiplicaste. Para deshacer una multiplicación se divide." },
            ],
          },
        ),
        n(
          "q2",
          `Completa la solución: x − ${b} = ${rhs}; x = ${rhs} + ${b} = __.`,
          rhs + b,
          [`Sumamos ${b} a ambos lados; x = ${rhs + b}.`],
          [
            "Se deshace una resta.",
            `Suma ${b} a ambos lados.`,
            `${rhs} + ${b} = ${rhs + b}.`,
          ],
          {
            step: true,
            errors: [
              { value: rhs - b, feedback: "Restaste otra vez. Una resta se deshace sumando." },
            ],
          },
        ),
        n(
          "q3",
          `Resuelve x + ${c3} = ${sg(r3)}.`,
          r3 - c3,
          [
            `Resta ${c3} a ambos lados: x = ${sg(r3)} − ${c3} = ${sg(r3 - c3)}.`,
            `Comprueba: ${sg(r3 - c3)} + ${c3} = ${sg(r3)}.`,
          ],
          [
            "No descartes una solución negativa.",
            `Resta ${c3} al valor ${sg(r3)}.`,
            `El resultado es ${sg(r3 - c3)}.`,
          ],
          {
            errors: [
              { value: c3 - r3, feedback: "El signo está invertido: comprueba sustituyendo en la ecuación original." },
              { value: r3 + c3, feedback: `Sumaste ${c3}. Para deshacer la suma, resta ${c3}.` },
            ],
          },
        ),
        c(
          "q4",
          `¿Por qué ${m}x = ${m * x} y x = ${x} tienen la misma solución?`,
          [
            ["Porque se borran cifras iguales sin una regla", "No se borran cifras: se aplica la misma operación a ambos lados."],
            `Porque se dividieron ambos lados entre ${m}, que no es cero`,
            ["Porque cualquier valor de x sirve", `Solo x = ${x} hace verdadera ${m}x = ${m * x}.`],
          ],
          1,
          "La división por el mismo número distinto de cero conserva las soluciones.",
        ),
        n(
          "q5",
          `Una carga de ${m * x} unidades se reparte por igual entre ${m} baterías. El modelo es ${m}x = ${m * x}. ¿Cuánta energía recibe cada batería?`,
          x,
          [
            `Dividimos total entre baterías: x = ${m * x}/${m} = ${x}.`,
            `Los ${m} grupos de ${x} reconstruyen el total.`,
          ],
          [
            "x representa la carga de una batería.",
            "Deshaz la multiplicación dividiendo ambos lados.",
            `Divide ${m * x} entre ${m}.`,
          ],
          { intent: "transfer", unit: "unidades" },
        ),
        n(
          "q6",
          `Una carga desconocida x se reparte por igual entre ${dm} baterías y cada una recibe ${dq} unidades. El modelo es x/${dm} = ${dq}. ¿Cuál era la carga total?`,
          dm * dq,
          [
            `x está dividida entre ${dm}: se deshace multiplicando ambos lados por ${dm}.`,
            `x = ${dq} × ${dm} = ${dm * dq}. Comprobación: ${dm * dq} ÷ ${dm} = ${dq}.`,
          ],
          [
            "Ahora la incógnita está dividida.",
            "La operación inversa de dividir es multiplicar.",
            `Multiplica ambos lados por ${dm}.`,
          ],
          {
            intent: "transfer",
            unit: "unidades",
            errors: [
              { value: dq / dm, feedback: `Dividiste otra vez. x/${dm} se deshace multiplicando por ${dm}.` },
            ],
          },
        ),
      ];
    },
    application: n(
      "app",
      "Durante la noche, la temperatura de un depósito bajó 9 grados y ahora marca −4 °C. ¿Qué temperatura tenía al anochecer?",
      5,
      [
        "Modelo: x − 9 = −4, donde x es la temperatura inicial.",
        "Sumamos 9 a ambos lados: x = −4 + 9 = 5.",
        "Comprobación: 5 − 9 = −4.",
      ],
      [
        "Define x como la temperatura al anochecer.",
        "Bajar 9 grados es restar 9 → x − 9 = −4.",
        "Deshaz la resta sumando 9.",
      ],
      {
        intent: "transfer",
        unit: "°C",
        errors: [
          { value: -13, feedback: "Restaste otra vez. Si bajó 9 grados, al principio estaba 9 grados más alta." },
          { value: 13, feedback: "Revisa el signo: −4 + 9 = 5." },
        ],
      },
    ),
    outcome:
      "El sensor queda calibrado: puedes recuperar un valor desconocido y verificarlo con la medición original.",
    commonErrors: [
      "Cambiar un signo sin justificar la operación en ambos lados.",
      "Restar el coeficiente en lugar de dividir.",
      "Descartar una solución por ser negativa.",
    ],
  }),
  defineLesson({
    id: "ecuaciones-dos-pasos",
    unitId: "algebra",
    title: "Resolver ecuaciones de dos pasos",
    objective:
      "Resolver ecuaciones mx + b = c deshaciendo las operaciones en orden y comprobando el resultado.",
    purpose:
      "El consumo de una máquina combina una parte fija y otra que depende de sus ciclos. Debes hallar cuántos ciclos puede realizar.",
    prerequisites: ["ecuaciones-un-paso"],
    legacyModuleIds: ["algebra-d7"],
    visual: "equation",
    vocabulary: [
      { term: "Coeficiente", meaning: "Número que multiplica a la incógnita." },
      {
        term: "Término fijo",
        meaning: "Cantidad que no depende de la incógnita.",
      },
    ],
    sections: [
      {
        title: "Lee cómo se construye el total",
        paragraphs: [
          "En 3x + 5 = 20, primero se multiplica x por 3 y luego se suman 5. El resultado es 20.",
          "Para reconstruir x desde el resultado, deshaz esas operaciones en orden inverso: primero quita la suma y después la multiplicación.",
        ],
        formula: "x → ×3 → +5 → 20; 20 → −5 → ÷3 → x",
      },
      {
        title: "Conserva la igualdad en cada paso",
        paragraphs: [
          "Resta cinco a ambos lados para obtener 3x = 15. Después divide ambos lados entre tres para obtener x = 5.",
          "También podrías dividir la ecuación entera entre tres, pero tendrías que dividir todos sus términos. Es más sencillo aislar primero el término con x.",
        ],
        formula: "3x + 5 = 20 → 3x = 15 → x = 5",
      },
      {
        title: "Comprueba el modelo original",
        paragraphs: [
          "Sustituye el valor encontrado en la expresión completa, incluyendo la parte fija. Con x = 5, se obtiene 3 × 5 + 5 = 20.",
          "Si aparece una resta, deshazla sumando. El procedimiento se basa en las operaciones, no en memorizar signos que cambian de lugar.",
        ],
        formula: "4x − 3 = 17 → 4x = 20 → x = 5",
      },
    ],
    examples: [
      ex(
        "Resuelve 4x + 6 = 30.",
        [
          [
            "4x + 6 − 6 = 30 − 6 → 4x = 24",
            "Deshacemos primero la suma que se aplicó al final.",
          ],
          [
            "4x ÷ 4 = 24 ÷ 4 → x = 6",
            "Deshacemos la multiplicación conservando la igualdad.",
          ],
          ["4 × 6 + 6 = 30", "Comprobamos en el problema original."],
        ],
        "La solución es x = 6.",
      ),
      ex(
        "Resuelve 5x − 4 = 11.",
        [
          [
            "5x − 4 + 4 = 11 + 4 → 5x = 15",
            "Para deshacer una resta, sumamos cuatro a ambos lados.",
          ],
          [
            "5x ÷ 5 = 15 ÷ 5 → x = 3",
            "Dividimos entre el coeficiente, que no es cero.",
          ],
          ["5 × 3 − 4 = 11", "La igualdad se cumple al sustituir."],
        ],
        "La solución es x = 3.",
      ),
      ex(
        "Resuelve x/3 + 2 = 7.",
        [
          ["x/3 + 2 − 2 = 7 − 2 → x/3 = 5", "Deshacemos primero la suma."],
          ["x/3 × 3 = 5 × 3 → x = 15", "Multiplicar por 3 deshace la división."],
          ["15 ÷ 3 + 2 = 7", "La igualdad se cumple al sustituir."],
        ],
        "El orden inverso funciona igual cuando la incógnita está dividida.",
      ),
    ],
    diagnostic: [
      n(
        "d-1",
        "Resuelve 3x = 18.",
        6,
        ["x = 18 ÷ 3 = 6."],
        ["Deshaz la multiplicación.", "Divide ambos lados entre 3.", "x = 6."],
      ),
      c(
        "d-2",
        "¿Qué deshace sumar 7?",
        ["Multiplicar por 7", "Restar 7", "Sumar 7 otra vez"],
        1,
        "Sumar y restar la misma cantidad son operaciones inversas.",
      ),
      n(
        "d-3",
        "Si x = 4, ¿cuánto vale 2x + 3?",
        11,
        ["2 × 4 + 3 = 8 + 3 = 11."],
        ["Sustituye la letra.", "Multiplica antes de sumar.", "8 + 3 = 11."],
      ),
    ],
    questions(v) {
      const [m, x, b] = [[3, 5, 4], [2, 9, 7], [5, 4, 6], [4, 7, 3], [6, 2, 9], [7, 3, 5]][v],
        total = m * x + b,
        [sm, sx, sb] = [[4, 6, 5], [3, 8, 2], [6, 3, 7], [2, 11, 4], [5, 5, 8], [8, 2, 3]][v],
        // x/dm + db = dt
        [dm, db, dt] = [[2, 3, 8], [3, 4, 9], [4, 3, 8], [5, 2, 5], [3, 7, 10], [2, 5, 12]][v];
      const concept = [
        c(
          "q4",
          "¿Cuál es una comprobación válida de la solución de mx + b = c?",
          [
            "Sustituir x y verificar que mx + b vale c",
            ["Comprobar solo que mx vale c", "Falta el término fijo: la comprobación usa la ecuación completa."],
            ["Cambiar el signo del resultado", "Cambiar signos no comprueba nada."],
          ],
          0,
          "La comprobación debe incluir todas las operaciones de la ecuación original, también el término fijo.",
        ),
        c(
          "q4",
          `Para resolver ${sm}x − ${sb} = ${sm * sx - sb}, ¿qué haces primero?`,
          [
            [`Restar ${sb} a ambos lados`, "Restar otra vez aleja el término con x. Una resta se deshace sumando."],
            `Sumar ${sb} a ambos lados`,
            [`Dividir solo ${sm * sx - sb} entre ${sm}`, "Dividir un solo término rompe la igualdad."],
          ],
          1,
          `Sumar ${sb} deshace la resta y deja ${sm}x = ${sm * sx}.`,
        ),
        c(
          "q4",
          `Ana resuelve ${m}x + ${b} = ${total} dividiendo solo ${total} entre ${m}. ¿Qué falla?`,
          [
            ["Nada, el resultado es el mismo", "Dividir solo un término cambia la ecuación y su solución."],
            `Debía dividir todos los términos, también el ${b}, o restar ${b} primero`,
            ["Debía multiplicar en vez de dividir", "Dividir es correcto, pero debe hacerse en ambos lados completos."],
          ],
          1,
          "La misma operación se aplica a cada lado completo; restar primero el término fijo es más sencillo.",
        ),
      ];
      return [
        c(
          "q0",
          `En ${m}x + ${b} = ${total}, ¿qué paso aísla primero el término con x?`,
          [
            [`Dividir solo el ${total} entre ${m}`, "Dividir un solo término rompe la igualdad."],
            `Restar ${b} a ambos lados`,
            [`Sumar ${b} solo a la izquierda`, "Sumar no deshace una suma, y cambiar un solo lado rompe la igualdad."],
          ],
          1,
          "Deshacer la suma deja el término que contiene a x; la misma resta debe aplicarse a ambos lados.",
        ),
        n(
          "q1",
          `Resuelve ${m}x + ${b} = ${total}.`,
          x,
          [
            `Resta ${b} → ${m}x = ${m * x}.`,
            `Divide entre ${m} → x = ${x}.`,
            `Comprueba: ${m} × ${x} + ${b} = ${total}.`,
          ],
          [
            "Deshaz primero la suma.",
            `${m}x = ${total} − ${b} = ${m * x}.`,
            `Divide ${m * x} entre ${m}.`,
          ],
          {
            errors: [
              {
                value: total / m - b,
                feedback:
                  "Si divides primero, debes dividir la ecuación completa. Prueba aislar primero el término con x restando a ambos lados.",
              },
              {
                value: (total + b) / m,
                feedback: `Sumaste ${b}. Para deshacer la suma, resta ${b} a ambos lados.`,
              },
            ],
          },
        ),
        n(
          "q2",
          `Completa el paso intermedio: ${m}x + ${b} = ${total} → ${m}x = __.`,
          m * x,
          [`Restamos ${b} a ambos lados: ${total} − ${b} = ${m * x}.`],
          [
            "Todavía no se busca x; se busca cuánto vale el término multiplicado.",
            `Resta ${b} al total.`,
            `El paso intermedio es ${m}x = ${m * x}.`,
          ],
          {
            step: true,
            errors: [
              { value: total + b, feedback: "Sumaste el término fijo. Se deshace restándolo a ambos lados." },
            ],
          },
        ),
        n(
          "q3",
          `Resuelve ${sm}x − ${sb} = ${sm * sx - sb}.`,
          sx,
          [
            `Suma ${sb} a ambos lados: ${sm}x = ${sm * sx}.`,
            `Divide entre ${sm} → x = ${sx}.`,
          ],
          [
            "Una resta se deshace sumando.",
            `Suma ${sb} a ambos lados.`,
            `Divide el resultado ${sm * sx} entre ${sm}.`,
          ],
          {
            errors: [
              { value: (sm * sx - 2 * sb) / sm, feedback: `Restaste ${sb} otra vez. Para deshacer la resta, suma ${sb}.` },
            ],
          },
        ),
        concept[v % 3],
        n(
          "q5",
          `Una máquina consume ${b} unidades al encenderse y ${m} por ciclo. Ha consumido ${total} unidades. ¿Cuántos ciclos realizó?`,
          x,
          [
            `Modelo: ${m}x + ${b} = ${total}.`,
            `Quitamos el encendido: ${total} − ${b} = ${m * x}.`,
            `Ciclos: ${m * x} ÷ ${m} = ${x}.`,
          ],
          [
            "Separa el consumo fijo del consumo por ciclo.",
            `Resta las ${b} unidades del encendido.`,
            `Divide ${m * x} entre ${m}.`,
          ],
          {
            intent: "transfer",
            unit: "ciclos",
            errors: [
              { value: total / m, feedback: "Olvidaste el consumo de encendido: réstalo antes de dividir." },
            ],
          },
        ),
        n(
          "q6",
          `Un depósito se divide en ${dm} partes iguales. A una de ellas se le añaden ${db} litros y queda con ${dt}. El modelo es x/${dm} + ${db} = ${dt}. ¿Cuántos litros tenía el depósito?`,
          dm * (dt - db),
          [
            `Resta ${db} → x/${dm} = ${dt - db}.`,
            `Multiplica por ${dm} → x = ${dm * (dt - db)}.`,
            `Comprueba: ${dm * (dt - db)} ÷ ${dm} + ${db} = ${dt}.`,
          ],
          [
            "Deshaz las operaciones en orden inverso: primero la suma.",
            `x/${dm} = ${dt} − ${db}.`,
            `Deshaz la división multiplicando por ${dm}.`,
          ],
          {
            intent: "transfer",
            unit: "litros",
            errors: [
              { value: dm * dt - db, feedback: `Multiplicaste antes de quitar los ${db} litros: deshaz primero la suma.` },
              { value: dt - db, feedback: `Ese es el contenido de una parte. El depósito tiene ${dm} partes.` },
            ],
          },
        ),
      ];
    },
    application: n(
      "app",
      "Un montacargas lleva 5 cajas iguales sobre una plataforma de 40 kg. El conjunto pesa 340 kg. ¿Cuánto pesa cada caja?",
      60,
      [
        "Modelo: 5x + 40 = 340, donde x es el peso de una caja.",
        "Resta 40 → 5x = 300. Divide entre 5 → x = 60.",
        "Comprobación: 5 × 60 + 40 = 340.",
      ],
      [
        "Separa el peso fijo de la plataforma del peso de las cajas.",
        "Plantea 5x + 40 = 340.",
        "Resta 40 a ambos lados y después divide entre 5.",
      ],
      {
        intent: "transfer",
        unit: "kg",
        errors: [
          { value: 68, feedback: "Dividiste 340 entre 5 sin quitar la plataforma. Resta primero los 40 kg." },
          { value: 28, feedback: "Dividiste solo 340 entre 5 y después restaste 40: la división debe aplicarse a todo el lado." },
        ],
      },
    ),
    outcome:
      "La máquina muestra cuántos ciclos puede completar y puedes justificar cada paso de su calibración.",
    commonErrors: [
      "Deshacer operaciones sin tener en cuenta su orden.",
      "Dividir solo algunos términos de una igualdad.",
      "Olvidar la parte fija al comprobar.",
    ],
  }),
  defineLesson({
    id: "modelar-ecuaciones",
    unitId: "algebra",
    title: "Convertir una situación en una ecuación",
    objective:
      "Definir una incógnita, construir una ecuación de dos pasos e interpretar y verificar su solución en el contexto.",
    purpose:
      "El equipo necesita planificar suministros con un presupuesto limitado. Tú decides qué representa la incógnita y compruebas si la solución es posible.",
    prerequisites: ["ecuaciones-dos-pasos", "tasa-unitaria"],
    legacyModuleIds: ["algebra-d7", "logica-d7", "logica-d9"],
    visual: "equation",
    vocabulary: [
      {
        term: "Modelo",
        meaning:
          "Representación de una situación mediante cantidades, relaciones e hipótesis.",
      },
      {
        term: "Restricción",
        meaning:
          "Condición que una solución debe cumplir en la situación real.",
      },
    ],
    sections: [
      {
        title: "Define la incógnita antes de operar",
        paragraphs: [
          "Si cada batería cuesta 4 créditos y el envío cuesta 6, puedes definir x como el número de baterías. Entonces 4x es el costo de las baterías y 6 el del envío.",
          "Para gastar exactamente 30 créditos, escribes 4x + 6 = 30. Si el presupuesto fuera un máximo, la relación adecuada sería 4x + 6 ≤ 30.",
        ],
        formula: "x = número de baterías; costo total = 4x + 6",
      },
      {
        title: "Resuelve e interpreta con unidades",
        paragraphs: [
          "La ecuación 4x + 6 = 30 da x = 6. Eso significa seis baterías, no seis créditos.",
          "Anotar unidades ayuda a detectar errores: créditos/batería por baterías produce créditos. Solo se pueden sumar cantidades compatibles.",
        ],
        formula: "(4 créditos/batería) × x baterías + 6 créditos = 30 créditos",
      },
      {
        title: "Comprueba el número y la situación",
        paragraphs: [
          "Sustituye para verificar el costo: 4 × 6 + 6 = 30. Además, seis es un número entero no negativo, válido para contar baterías.",
          "Si una ecuación da 6,5 baterías, puede ser una solución matemática pero no una compra realizable por unidades enteras. Revisa la restricción y si se pide gasto exacto o máximo; no redondees sin justificar.",
        ],
        formula:
          "Solución válida = satisface la ecuación y las restricciones del contexto",
      },
    ],
    examples: [
      ex(
        "El transporte cuesta 8 créditos y cada sensor, 5. El gasto exacto es 43. ¿Cuántos sensores se compran?",
        [
          [
            "x = cantidad de sensores; 5x + 8 = 43",
            "El costo depende del número de sensores y de un cargo fijo.",
          ],
          [
            "5x = 35 → x = 7",
            "Restamos el cargo fijo y dividimos entre el precio unitario.",
          ],
          [
            "5 × 7 + 8 = 43",
            "Comprobamos el gasto; siete sensores es una cantidad posible.",
          ],
        ],
        "Se compran siete sensores.",
      ),
      ex(
        "Con los mismos precios, ¿se puede gastar exactamente 45 créditos comprando sensores enteros?",
        [
          ["5x + 8 = 45", "Mantenemos el modelo para el nuevo gasto exacto."],
          ["x = (45 − 8)/5 = 7,4", "Resolvemos sin redondear el resultado."],
          [
            "7,4 no es una cantidad entera de sensores",
            "La solución numérica no cumple la restricción de compra por unidades.",
          ],
        ],
        "No se puede gastar exactamente 45. Con un máximo de 45, caben siete sensores y sobran dos créditos.",
      ),
      ex(
        "Un técnico cobró 18 créditos por 2 horas y 30 por 5 horas, con tarifa fija más precio por hora. ¿Cuál es la tarifa fija?",
        [
          ["30 − 18 = 12 por 3 horas", "La tarifa fija se paga en ambas facturas; la diferencia es solo de horas."],
          ["12 ÷ 3 = 4 créditos/hora", "Obtenemos el precio por hora."],
          ["2 × 4 + f = 18 → f = 10", "Con una factura conocida, despejamos el término fijo."],
        ],
        "Modelo: costo = 4h + 10. Comprobación: 4 × 5 + 10 = 30.",
      ),
    ],
    diagnostic: [
      n(
        "d-1",
        "Resuelve 2x + 5 = 17.",
        6,
        ["2x = 12; x = 6."],
        ["Resta 5 a ambos lados.", "Divide 12 entre 2.", "x = 6."],
      ),
      c(
        "d-2",
        "Si x cuenta sensores, ¿qué unidad tiene x?",
        ["Créditos", "Sensores", "Horas"],
        1,
        "La definición de la incógnita determina su significado y unidad.",
      ),
      c(
        "d-3",
        "Un cargo de transporte que se paga una sola vez es…",
        ["Un término fijo", "El número de sensores", "Siempre cero"],
        0,
        "Ese cargo no depende de cuántas unidades se compren.",
      ),
    ],
    questions(v) {
      const [count, price, fixed] = [[6, 4, 5], [4, 3, 6], [7, 5, 8], [3, 9, 4], [5, 6, 10], [8, 2, 7]][v],
        budget = count * price + fixed,
        maxBudget = budget + price - 1,
        // Dos facturas de un técnico: tarifa fija f y precio p por hora.
        [f, p, h1, h2] = [[10, 4, 2, 5], [6, 5, 1, 3], [12, 3, 2, 6], [8, 7, 3, 4], [15, 2, 4, 9], [5, 9, 1, 2]][v],
        c1 = f + p * h1,
        c2 = f + p * h2,
        half = count + 0.5;
      const concept = [
        c(
          "q4",
          `Una ecuación da x = ${half.toLocaleString("es")} sensores para un gasto exacto. ¿Qué debes concluir?`,
          [
            [`Hay que redondear a ${count + 1} sin comprobar`, "Redondear cambia el gasto: ya no se cumpliría la condición de gasto exacto."],
            ["La respuesta siempre es incorrecta en cualquier contexto", "La ecuación puede estar bien planteada; lo que falla es la restricción del contexto."],
            "La solución numérica no permite comprar esa cantidad de sensores enteros",
          ],
          2,
          "Hay que comprobar las restricciones del contexto. Redondear modifica el gasto y puede dejar de satisfacer la condición de gasto exacto.",
        ),
        c(
          "q4",
          `Con sensores de ${price} créditos y envío de ${fixed}, se dispone de un máximo de ${budget} créditos. ¿Qué relación describe la compra?`,
          [
            [`${price}x + ${fixed} = ${budget}`, "La igualdad exige gastar exactamente; un máximo admite gastar menos."],
            `${price}x + ${fixed} ≤ ${budget}`,
            [`${price}x + ${fixed} ≥ ${budget}`, "≥ permitiría gastar más del máximo."],
          ],
          1,
          "Un presupuesto máximo se expresa con ≤: el gasto puede ser menor o igual.",
        ),
        c(
          "q4",
          `Si x es el número de sensores y cada uno cuesta ${price} créditos, ¿qué unidad tiene ${price}x?`,
          [
            ["Sensores", "x cuenta sensores, pero al multiplicar por créditos/sensor se obtienen créditos."],
            "Créditos",
            ["Créditos por sensor", "Esa es la unidad del precio, no del costo total de los sensores."],
          ],
          1,
          "(créditos/sensor) × sensores = créditos.",
        ),
      ];
      return [
        c(
          "q0",
          `Cada sensor cuesta ${price} y el envío ${fixed}. Si x cuenta sensores, ¿qué expresión representa el costo?`,
          [
            [`${fixed}x + ${price}`, "Intercambiaste los papeles: el envío se paga una vez y el precio se multiplica por x."],
            `${price}x + ${fixed}`,
            [`${price} + ${fixed} + x`, "Sumar x añade sensores como si fueran créditos; el precio debe multiplicar a x."],
          ],
          1,
          "El precio unitario multiplica al número de sensores; el envío se suma una sola vez.",
        ),
        n(
          "q1",
          `Se gastan exactamente ${budget} créditos, con envío de ${fixed} y sensores de ${price} cada uno. ¿Cuántos sensores se compran?`,
          count,
          [
            `Modelo: ${price}x + ${fixed} = ${budget}.`,
            `x = (${budget} − ${fixed})/${price} = ${count}.`,
          ],
          [
            "Define x como número de sensores.",
            "Quita el envío antes de dividir por el precio unitario.",
            `(${budget} − ${fixed}) ÷ ${price} = ${count}.`,
          ],
          {
            unit: "sensores",
            errors: [
              { value: budget / price, feedback: "Olvidaste el envío: réstalo antes de dividir entre el precio." },
            ],
          },
        ),
        n(
          "q2",
          `Completa la verificación: ${price} × ${count} + ${fixed} = __ créditos.`,
          budget,
          [`${price * count} + ${fixed} = ${budget}.`],
          [
            "La comprobación usa el costo completo.",
            "Calcula primero el precio de los sensores.",
            `Suma ${fixed} a ${price * count}.`,
          ],
          { step: true },
        ),
        n(
          "q3",
          `Con un presupuesto máximo de ${maxBudget} créditos, envío de ${fixed} y precio de ${price} por sensor, ¿cuántos sensores enteros puedes comprar como máximo?`,
          count,
          [
            `Disponible sin envío: ${maxBudget - fixed}.`,
            `${maxBudget - fixed} ÷ ${price} = ${((maxBudget - fixed) / price).toLocaleString("es", { maximumFractionDigits: 2 })}: caben ${count} sensores; ${count + 1} costarían ${(count + 1) * price + fixed}, que supera ${maxBudget}.`,
          ],
          [
            "La cantidad de sensores debe ser entera.",
            "Descuenta el envío y busca cuántos precios completos caben.",
            `Puedes comprar ${count}; uno más excede el presupuesto.`,
          ],
          {
            unit: "sensores",
            errors: [
              ...(price > 1 ? [{ value: count + 1, feedback: `Redondeaste hacia arriba: ${count + 1} sensores costarían ${(count + 1) * price + fixed}, más que el máximo.` }] : []),
            ],
          },
        ),
        concept[v % 3],
        n(
          "q5",
          `La ciudad tiene ${budget} créditos para un envío urgente de ${fixed} y baterías de ${price} cada una. Debe gastarlos exactamente, comprando baterías enteras. ¿Cuántas puede recibir?`,
          count,
          [
            `Define x como cantidad de baterías: ${price}x + ${fixed} = ${budget}.`,
            `x = ${count}; verificación: ${price} × ${count} + ${fixed} = ${budget}.`,
            "La cantidad es entera y no negativa.",
          ],
          [
            "Separa el costo fijo del costo por batería.",
            `Resuelve ${price}x = ${budget - fixed}.`,
            `Divide ${budget - fixed} entre ${price}.`,
          ],
          { intent: "transfer", unit: "baterías" },
        ),
        n(
          "q6",
          `Un técnico cobra una tarifa fija por visita más un precio por hora. Por ${h1} ${h1 === 1 ? "hora" : "horas"} cobró ${c1} créditos y por ${h2} horas, ${c2}. ¿Cuál es la tarifa fija?`,
          f,
          [
            `${h2 - h1 === 1 ? "La hora" : `Las ${h2 - h1} horas`} de diferencia ${h2 - h1 === 1 ? "cuesta" : "cuestan"} ${c2} − ${c1} = ${c2 - c1}: el precio por hora es ${c2 - c1} ÷ ${h2 - h1} = ${p}.`,
            `Con ${h1} ${h1 === 1 ? "hora" : "horas"} → ${p} × ${h1} + f = ${c1}, así que f = ${c1 - p * h1}.`,
          ],
          [
            "La tarifa fija es igual en ambas facturas; la diferencia viene solo de las horas.",
            `Calcula cuánto cuesta${h2 - h1 === 1 ? " la hora" : `n las ${h2 - h1} horas`} de diferencia.`,
            `Halla el precio por hora y réstalo ${h1} ${h1 === 1 ? "vez" : "veces"} a ${c1}.`,
          ],
          {
            intent: "transfer",
            unit: "créditos",
            errors: [
              { value: p, feedback: "Ese es el precio por hora. Se pide la parte que no depende de las horas." },
              { value: c1 / h1, feedback: "Dividir la factura entre las horas reparte también la tarifa fija; sepárala primero." },
            ],
          },
        ),
      ];
    },
    application: n(
      "app",
      "El equipo tiene 100 créditos. El envío cuesta 12, cada sensor 8, y deben quedar al menos 20 créditos de reserva. ¿Cuántos sensores enteros pueden comprar como máximo?",
      8,
      [
        "Disponible para sensores: 100 − 20 − 12 = 68 créditos.",
        "8x ≤ 68 → x ≤ 8,5. Como se compran sensores enteros, el máximo es 8.",
        "Comprobación: 8 × 8 + 12 = 76 y quedan 24 ≥ 20; con 9 sensores quedarían 16.",
      ],
      [
        "Separa la reserva y el envío antes de calcular sensores.",
        "Plantea 8x + 12 ≤ 100 − 20.",
        "Resuelve y elige el mayor entero que cumpla la condición.",
      ],
      {
        intent: "transfer",
        unit: "sensores",
        errors: [
          { value: 9, feedback: "Con 9 sensores quedarían solo 16 créditos de reserva. Redondea hacia abajo." },
          { value: 11, feedback: "Olvidaste guardar los 20 créditos de reserva." },
          { value: 8.5, feedback: "8,5 no es una cantidad entera de sensores: elige el mayor entero que cabe." },
        ],
      },
    ),
    outcome:
      "El pedido de suministros queda justificado con una ecuación, sus unidades y una comprobación de las restricciones.",
    commonErrors: [
      "Operar antes de definir la incógnita.",
      "Intercambiar el precio unitario y el cargo fijo.",
      "Confundir gasto exacto con presupuesto máximo.",
      "Redondear una solución sin revisar las restricciones.",
    ],
  }),
];
