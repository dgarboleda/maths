import { defineLesson } from "./defineLesson";
import { choice as c, example as ex, numeric as n } from "./questions";
import type { Lesson } from "./types";

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
      const x = v + 4,
        b = v + 3,
        total = x + b;
      return [
        c(
          "q0",
          "¿Qué afirma el signo = en una ecuación?",
          [
            "Que la operación terminó",
            "Que las expresiones de ambos lados tienen el mismo valor",
            "Que la incógnita siempre vale cero",
          ],
          1,
          "La igualdad relaciona dos expresiones que representan el mismo valor.",
        ),
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
        ),
        n(
          "q2",
          `Completa la comprobación para x = ${x}: x + ${b} = ${x} + ${b} = __.`,
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
            `Restar ${b} solo al lado izquierdo`,
            `Sumar ${b} solo al derecho`,
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
          { intent: "transfer", unit: "unidades" },
        ),
      ];
    },
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
      const x = v + 3,
        m = v + 2,
        b = v + 4;
      return [
        c(
          "q0",
          `Para resolver ${m}x = ${m * x}, ¿qué operación conserva la igualdad y aísla x?`,
          [
            `Dividir ambos lados entre ${m}`,
            `Restar ${m} solo a la izquierda`,
            `Multiplicar solo el lado derecho por ${m}`,
          ],
          0,
          `Como el coeficiente ${m} no es cero, dividir ambos lados entre él deshace la multiplicación.`,
        ),
        n(
          "q1",
          `Resuelve ${m}x = ${m * x}. Escribe el valor de x.`,
          x,
          [
            `Divide entre ${m}: x = ${m * x} ÷ ${m} = ${x}.`,
            `Comprueba: ${m} × ${x} = ${m * x}.`,
          ],
          [
            "La incógnita está multiplicada.",
            `Divide ambos lados entre ${m}.`,
            `x = ${m * x} ÷ ${m}.`,
          ],
        ),
        n(
          "q2",
          `Completa la solución: x − ${b} = ${x}; x = ${x} + ${b} = __.`,
          x + b,
          [`Sumamos ${b} a ambos lados; x = ${x + b}.`],
          [
            "Se deshace una resta.",
            `Suma ${b} a ambos lados.`,
            `${x} + ${b} = ${x + b}.`,
          ],
          { step: true },
        ),
        n(
          "q3",
          `Resuelve x + ${b} = ${v + 1}.`,
          v + 1 - b,
          [
            `Resta ${b} a ambos lados: x = ${v + 1} − ${b} = ${v + 1 - b}.`,
            `Comprueba: ${v + 1 - b} + ${b} = ${v + 1}.`,
          ],
          [
            "No descartes una solución negativa.",
            `Resta ${b} al valor ${v + 1}.`,
            `El resultado es ${v + 1 - b}.`,
          ],
        ),
        c(
          "q4",
          `¿Por qué ${m}x = ${m * x} y x = ${x} tienen la misma solución?`,
          [
            "Porque se borran cifras iguales sin una regla",
            `Porque se dividieron ambos lados entre ${m}, que no es cero`,
            "Porque cualquier valor de x sirve",
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
      ];
    },
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
        "Comprueba x = 4: ¿cuánto vale 2x + 3?",
        11,
        ["2 × 4 + 3 = 8 + 3 = 11."],
        ["Sustituye la letra.", "Multiplica antes de sumar.", "8 + 3 = 11."],
      ),
    ],
    questions(v) {
      const x = v + 2,
        m = v + 2,
        b = v + 3,
        total = m * x + b;
      return [
        c(
          "q0",
          `En ${m}x + ${b} = ${total}, ¿qué paso aísla primero el término con x?`,
          [
            `Dividir solo el ${total} entre ${m}`,
            `Restar ${b} a ambos lados`,
            `Sumar ${b} solo a la izquierda`,
          ],
          1,
          "Deshacer la suma deja el término que contiene a x; la misma resta debe aplicarse a ambos lados.",
        ),
        n(
          "q1",
          `Resuelve ${m}x + ${b} = ${total}.`,
          x,
          [
            `Resta ${b}: ${m}x = ${m * x}.`,
            `Divide entre ${m}: x = ${x}.`,
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
          { step: true },
        ),
        n(
          "q3",
          `Resuelve ${m}x − ${b} = ${m * x - b}.`,
          x,
          [
            `Suma ${b} a ambos lados: ${m}x = ${m * x}.`,
            `Divide entre ${m}: x = ${x}.`,
          ],
          [
            "Una resta se deshace sumando.",
            `Suma ${b} a ambos lados.`,
            `Divide el resultado ${m * x} entre ${m}.`,
          ],
        ),
        c(
          "q4",
          "¿Cuál es una comprobación válida de la solución de mx + b = c?",
          [
            "Sustituir x y verificar que mx + b vale c",
            "Comprobar solo que mx vale c",
            "Cambiar el signo del resultado",
          ],
          0,
          "La comprobación debe incluir todas las operaciones de la ecuación original, también el término fijo.",
        ),
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
          { intent: "transfer", unit: "ciclos" },
        ),
      ];
    },
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
      const count = v + 3,
        price = v + 2,
        fixed = v + 5,
        budget = count * price + fixed;
      return [
        c(
          "q0",
          `Cada sensor cuesta ${price} y el envío ${fixed}. Si x cuenta sensores, ¿qué expresión representa el costo?`,
          [
            `${fixed}x + ${price}`,
            `${price}x + ${fixed}`,
            `${price} + ${fixed} + x`,
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
          { unit: "sensores" },
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
          `Con un presupuesto máximo de ${budget + 1} créditos, envío de ${fixed} y precio de ${price} por sensor, ¿cuántos sensores enteros puedes comprar como máximo?`,
          count,
          [
            `Disponible sin envío: ${budget + 1 - fixed}.`,
            `Caben ${count} sensores; ${count + 1} costarían ${(count + 1) * price + fixed}, que supera ${budget + 1}.`,
          ],
          [
            "La cantidad de sensores debe ser entera.",
            "Descuenta el envío y busca cuántos precios completos caben.",
            `Puedes comprar ${count}; uno más excede el presupuesto.`,
          ],
          { unit: "sensores" },
        ),
        c(
          "q4",
          "Una ecuación da x = 4,5 sensores para un gasto exacto. ¿Qué debes concluir?",
          [
            "Hay que redondear a 5 sin comprobar",
            "La respuesta siempre es incorrecta en cualquier contexto",
            "La solución numérica no permite comprar esa cantidad de sensores enteros",
          ],
          2,
          "Hay que comprobar las restricciones del contexto. Redondear modifica el gasto y puede dejar de satisfacer la condición de gasto exacto.",
        ),
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
      ];
    },
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
