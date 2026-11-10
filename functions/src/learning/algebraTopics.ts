import { errorFollowup } from "./errorFollowup";
import { defineLesson } from "./defineLesson";
import { choice as c, example as ex, numeric as n, type ChoiceLabel } from "./questions";
import { dec, divisors, gcd, list, sub, sup } from "./topicHelpers";
import type { Lesson } from "./types";

/** Factorización, fracciones algebraicas y logaritmos (ver `numberTopics.ts`). */

export const FACTORING_LESSONS: Lesson[] = [
  defineLesson({
    id: "factorizacion",
    unitId: "expresiones",
    title: "Factorización de polinomios",
    objective:
      "Factorizar polinomios sacando factor común, reconociendo diferencias de cuadrados y trinomios cuadrados perfectos, y descomponiendo trinomios x² + bx + c por aspa simple.",
    purpose:
      "Factorizar es deshacer una multiplicación. Escribir una expresión como producto permite resolver ecuaciones, simplificar fracciones algebraicas y ver para qué valores se anula.",
    prerequisites: ["productos-notables"],
    legacyModuleIds: [],
    visual: "trinomial",
    vocabulary: [
      { term: "Factorizar", meaning: "Escribir una expresión como producto de factores: x² + 5x + 6 = (x + 2)(x + 3)." },
      { term: "Factor común", meaning: "Factor que aparece en todos los términos y se puede sacar fuera de un paréntesis." },
      { term: "Diferencia de cuadrados", meaning: "Expresión de la forma a² − b², que se factoriza como (a + b)(a − b)." },
      { term: "Aspa simple", meaning: "Método para x² + bx + c: buscar dos números cuyo producto sea c y cuya suma sea b." },
    ],
    sections: [
      {
        title: "Primero, el factor común",
        paragraphs: [
          "Si todos los términos comparten un factor, se saca fuera del paréntesis: 6x² + 9x = 3x(2x + 3).",
          "Se comprueba multiplicando: 3x por 2x da 6x² y 3x por 3 da 9x. Siempre conviene buscar el factor común antes que cualquier otro método.",
        ],
        formula: "ab + ac = a(b + c)",
      },
      {
        title: "Productos notables al revés",
        paragraphs: [
          "Una diferencia de cuadrados se factoriza como producto de binomios conjugados: x² − 25 = (x + 5)(x − 5).",
          "Un trinomio cuadrado perfecto tiene dos términos que son cuadrados y otro que es su doble producto: x² + 10x + 25 = (x + 5)².",
        ],
        formula: "a² − b² = (a + b)(a − b);  a² + 2ab + b² = (a + b)²",
      },
      {
        title: "Aspa simple para x² + bx + c",
        paragraphs: [
          "Se buscan dos números p y q cuyo producto sea c y cuya suma sea b. Entonces x² + bx + c = (x + p)(x + q).",
          "Para x² + 7x + 12, los números 3 y 4 cumplen 3 × 4 = 12 y 3 + 4 = 7, así que x² + 7x + 12 = (x + 3)(x + 4). Si c es negativo, los dos números tienen signos distintos.",
        ],
        formula: "x² + bx + c = (x + p)(x + q),  con p × q = c y p + q = b",
      },
    ],
    examples: [
      ex(
        "Factoriza 4x² − 36.",
        [
          ["4(x² − 9)", "Los dos términos son múltiplos de 4: sacamos primero el factor común."],
          ["x² − 9 = (x + 3)(x − 3)", "Lo que queda es una diferencia de cuadrados, porque 9 es 3²."],
          ["4(x + 3)(x − 3)", "Comprobación con x = 5 → 4 × 25 − 36 = 64 y 4 × 8 × 2 = 64."],
        ],
        "4x² − 36 = 4(x + 3)(x − 3). Sin sacar antes el 4, la diferencia de cuadrados no se ve tan clara.",
      ),
      ex(
        "Factoriza x² − 2x − 15.",
        [
          ["p × q = −15 y p + q = −2", "Buscamos dos números: su producto es c = −15 y su suma es b = −2."],
          ["(−5) × 3 = −15 y −5 + 3 = −2", "Como c es negativo, los números tienen signos distintos; el de mayor valor absoluto lleva el signo de b."],
          ["(x − 5)(x + 3)", "Comprobación → x² + 3x − 5x − 15 = x² − 2x − 15."],
        ],
        "x² − 2x − 15 = (x − 5)(x + 3).",
      ),
    ],
    diagnostic: [
      c("d-1", "¿Cuál es el desarrollo de 3(x + 4)?", ["3x + 4", "3x + 12", "x + 12"], 1, "El 3 multiplica a los dos términos: 3x + 12."),
      n("d-2", "¿Cuánto vale (x + 2)(x + 3) cuando x = 1?", 12, ["Con x = 1 → (1 + 2)(1 + 3) = 3 × 4.", "3 × 4 = 12."], ["Sustituye x por 1.", "Calcula cada paréntesis.", "Multiplica 3 por 4."]),
      n("d-3", "¿Qué dos números suman 7 y multiplicados dan 10? Escribe el mayor.", 5, ["Las parejas que dan 10 son 1 y 10 o 2 y 5.", "2 + 5 = 7, así que el mayor es 5."], ["Busca parejas que multiplicadas den 10.", "1 × 10 o 2 × 5.", "¿Cuál suma 7?"]),
    ],
    practiceCorrection: errorFollowup("Completa la factorización x² − 5x + 6 = (x − 2)(x − __). ¿Qué número falta?", 3, "Los términos constantes de los factores deben sumar −5 y multiplicar 6.", "Como uno es −2, el otro es −3; en el espacio que sigue al signo menos va 3."),
    questions(v) {
      const [p, q] = [[2, 5], [3, 4], [1, 6], [2, 7], [3, 5], [4, 6]][v];
      const k = [5, 4, 7, 9, 6, 8][v];
      const concept = [
        c(
          "q0",
          `¿Qué significa factorizar x² + ${p + q}x + ${p * q}?`,
          [
            [`Calcular su valor para x = ${p}`, "Evaluar no es factorizar: factorizar cambia la forma de la expresión, no da un número."],
            `Escribirlo como un producto, en este caso (x + ${p})(x + ${q})`,
            [`Sumar sus términos y obtener ${1 + p + q + p * q}x`, "Solo se suman términos semejantes; x², x y el número no lo son."],
          ],
          1,
          `(x + ${p})(x + ${q}) = x² + ${q}x + ${p}x + ${p * q} = x² + ${p + q}x + ${p * q}: factorizar deshace ese producto.`,
        ),
        c(
          "q0",
          `¿Por qué x² − ${k * k} se puede factorizar con números reales y x² + ${k * k} no?`,
          [
            [`Porque ${k * k} es ${k % 2 ? "impar" : "par"}`, "Que sea par o impar no importa: lo que importa es el signo entre los cuadrados."],
            [`Los dos se factorizan igual, como (x + ${k})²`, `(x + ${k})² = x² + ${2 * k}x + ${k * k}: tiene un término en x.`],
            `Porque x² − ${k * k} es una diferencia de cuadrados, (x + ${k})(x − ${k}); una suma de cuadrados no tiene ese patrón`,
          ],
          2,
          `(x + ${k})(x − ${k}) = x² − ${k * k}. Ningún producto de binomios con números reales da x² + ${k * k}.`,
        ),
        c(
          "q0",
          `Para factorizar x² + ${p + q}x + ${p * q}, ¿por qué se buscan dos números que multiplicados den ${p * q} y sumados den ${p + q}?`,
          [
            "Porque (x + p)(x + q) = x² + (p + q)x + pq: la suma da el término en x y el producto el término independiente",
            ["Porque así se factoriza cualquier polinomio", "Funciona con trinomios cuyo x² tiene coeficiente 1, no con cualquier polinomio."],
            [`Porque ${p + q} y ${p * q} son primos`, "No depende de que sean primos: viene de desarrollar (x + p)(x + q)."],
          ],
          0,
          `Con ${p} y ${q} → ${p} × ${q} = ${p * q} y ${p} + ${q} = ${p + q}, así que x² + ${p + q}x + ${p * q} = (x + ${p})(x + ${q}).`,
        ),
      ][v % 3];

      const wrongPair = divisors(p * q)
        .filter((d) => d * d <= p * q && d !== Math.min(p, q))
        .map((d) => Math.max(d, (p * q) / d))
        .find((x) => x !== Math.max(p, q));
      const [A, B] = [[6, 9], [4, 10], [12, 18], [8, 20], [15, 10], [14, 21]][v];
      const g = gcd(A, B);
      const common = divisors(g);
      const sq = [5, 9, 7, 10, 8, 11][v];
      const [wp, wq] = [[3, 4], [2, 5], [1, 7], [3, 6], [2, 8], [4, 5]][v];
      const [sp, sq2, xv] = [[2, 6, 4], [3, 5, 2], [4, 1, 5], [1, 8, 3], [5, 2, 6], [6, 3, 4]][v];
      const [ta, tk] = [[2, 3], [3, 2], [5, 1], [2, 5], [3, 4], [4, 3]][v];
      return [
        concept,
        n(
          "q1",
          `Factoriza x² + ${p + q}x + ${p * q} como (x + a)(x + b), con a < b. ¿Cuánto vale b?`,
          Math.max(p, q),
          [
            `Buscamos dos números con producto ${p * q} y suma ${p + q} → ${p} y ${q}, porque ${p} × ${q} = ${p * q} y ${p} + ${q} = ${p + q}.`,
            `x² + ${p + q}x + ${p * q} = (x + ${Math.min(p, q)})(x + ${Math.max(p, q)}), así que b vale ${Math.max(p, q)}.`,
          ],
          [`Escribe las parejas de números cuyo producto es ${p * q}.`, `De ellas, busca la que suma ${p + q}.`, `${p} × ${q} = ${p * q} y ${p} + ${q} = ${p + q}.`],
          { errors: wrongPair ? [{ value: wrongPair, feedback: `Esa pareja multiplica ${p * q}, pero no suma ${p + q}.` }] : [] },
        ),
        n(
          "q2",
          `Para sacar factor común en ${A}x² + ${B}x, ¿cuál es el mayor número que divide a ${A} y a ${B}?`,
          g,
          [`Los divisores comunes de ${A} y ${B} son ${list(common)}, y el mayor es ${g}.`, `Junto con la x que comparten → ${A}x² + ${B}x = ${g}x(${A / g}x + ${B / g}).`],
          [`Busca los divisores de ${A}.`, `¿Cuáles dividen también a ${B}?`, `El mayor de ellos es el factor común numérico.`],
          { step: true, errors: common.filter((d) => d !== g && d !== 1).slice(-1).map((d) => ({ value: d, feedback: "Ese número divide a los dos, pero no es el mayor: todavía se puede sacar más." })) },
        ),
        n(
          "q3",
          `Factoriza x² − ${sq * sq} como (x + a)(x − a). ¿Cuánto vale a?`,
          sq,
          [`${sq * sq} = ${sq}², así que x² − ${sq * sq} es una diferencia de cuadrados.`, `x² − ${sq * sq} = (x + ${sq})(x − ${sq}); los productos cruzados ${sq}x y −${sq}x se anulan al desarrollar.`],
          ["Es una diferencia de dos cuadrados.", `¿Qué número al cuadrado da ${sq * sq}?`, `${sq} × ${sq} = ${sq * sq}.`],
          { errors: [{ value: (sq * sq) / 2, feedback: `Dividiste entre 2: hay que buscar el número que al cuadrado da ${sq * sq}.` }] },
        ),
        c(
          "q4",
          `Alguien escribe x² − ${wp + wq}x + ${wp * wq} = (x + ${wp})(x + ${wq}). ¿Qué error cometió?`,
          [
            [`Ninguno: los números ${wp} y ${wq} son correctos`, `Con +${wp} y +${wq} la suma sería +${wp + wq}, no −${wp + wq}.`],
            `Los signos: −${wp + wq}x pide dos números negativos, así que es (x − ${wp})(x − ${wq})`,
            [`Debió escribir (x − ${wp})(x + ${wq})`, `Con signos distintos el producto sería −${wp * wq}, no +${wp * wq}.`],
          ],
          1,
          `(−${wp}) × (−${wq}) = ${wp * wq} y (−${wp}) + (−${wq}) = −${wp + wq}: los dos números son negativos.`,
        ),
        n(
          "q5",
          `Un rectángulo tiene un área de x² + ${sp + sq2}x + ${sp * sq2} cm² y uno de sus lados mide (x + ${sp}) cm. Si x = ${xv}, ¿cuánto mide el otro lado?`,
          xv + sq2,
          [
            `Factorizamos → x² + ${sp + sq2}x + ${sp * sq2} = (x + ${sp})(x + ${sq2}), porque ${sp} × ${sq2} = ${sp * sq2} y ${sp} + ${sq2} = ${sp + sq2}.`,
            `El otro lado es x + ${sq2}; con x = ${xv} mide ${xv} + ${sq2} = ${xv + sq2} cm.`,
          ],
          ["El área es el producto de los dos lados.", `Factoriza el trinomio sabiendo que un factor es (x + ${sp}).`, `El otro factor es (x + ${sq2}).`],
          { intent: "transfer", unit: "cm", errors: [{ value: xv + sp, feedback: "Ese es el lado que ya conocías." }] },
        ),
        c(
          "q6",
          `¿Cuál de estas expresiones es igual a ${ta}x² − ${ta * tk * tk}?`,
          [
            [`(${ta}x + ${tk})(x − ${tk})`, `Al desarrollarlo aparece un término en x → ${ta}x² − ${(ta - 1) * tk}x − ${tk * tk}.`],
            [`${ta}(x − ${tk})²`, `${ta}(x − ${tk})² = ${ta}x² − ${2 * ta * tk}x + ${ta * tk * tk}: tiene término en x y el último término es positivo.`],
            `${ta}(x + ${tk})(x − ${tk})`,
          ],
          2,
          `Se saca el factor común ${ta} → ${ta}(x² − ${tk * tk}), y lo que queda es una diferencia de cuadrados: ${ta}(x + ${tk})(x − ${tk}).`,
          "transfer",
        ),
      ];
    },
    outcome: "Puedes factorizar con factor común, diferencia de cuadrados, trinomio cuadrado perfecto y aspa simple, y comprobar el resultado desarrollando.",
    commonErrors: [
      "No sacar primero el factor común.",
      "Confundir x² − 25 con (x − 5)².",
      "Elegir dos números con el producto correcto pero la suma equivocada.",
      "Equivocar los signos: si c es positivo y b negativo, los dos números son negativos.",
    ],
    application: n(
      "aplicacion",
      "El área de un patio rectangular es x² + 9x + 20 m² y su largo es mayor que su ancho. Si x = 6 m, ¿cuántos metros mide el largo?",
      11,
      ["x² + 9x + 20 = (x + 4)(x + 5), porque 4 × 5 = 20 y 4 + 5 = 9.", "El largo es el factor mayor, x + 5; con x = 6 mide 6 + 5 = 11 m."],
      ["Factoriza el área.", "Busca dos números con producto 20 y suma 9.", "El largo es el factor mayor."],
      { intent: "transfer", unit: "m" },
    ),
  }),

  defineLesson({
    id: "fracciones-algebraicas",
    unitId: "expresiones",
    title: "Fracciones algebraicas",
    objective:
      "Simplificar fracciones algebraicas factorizando, indicar los valores que anulan el denominador y sumar y multiplicar fracciones algebraicas sencillas.",
    purpose:
      "Algunas fórmulas de velocidad, tiempo de trabajo o precio por persona incluyen una variable en el denominador. Simplificarlas ayuda a calcular y a identificar los valores que no están permitidos.",
    prerequisites: ["factorizacion", "fracciones-suma-resta"],
    legacyModuleIds: [],
    visual: "trinomial",
    vocabulary: [
      { term: "Fracción algebraica", meaning: "Cociente de dos polinomios, como (x + 2)/(x − 3)." },
      { term: "Valor no permitido", meaning: "Valor de la letra que hace 0 el denominador: ahí la fracción no está definida." },
      { term: "Simplificar", meaning: "Dividir numerador y denominador entre un factor común." },
    ],
    sections: [
      {
        title: "Como las fracciones de números",
        paragraphs: [
          "Una fracción algebraica es un cociente de polinomios, como (x + 2)/(x − 3). Se opera con las mismas reglas que las fracciones de números.",
          "El denominador nunca puede valer 0: en (x + 2)/(x − 3) no está permitido x = 3.",
        ],
        formula: "P(x)/Q(x),  con Q(x) ≠ 0",
      },
      {
        title: "Simplificar: solo factores",
        paragraphs: [
          "Para simplificar se factorizan el numerador y el denominador y se cancelan los factores comunes: (x² − 9)/(x + 3) = (x + 3)(x − 3)/(x + 3) = x − 3, para x ≠ −3.",
          "Solo se cancelan factores que multiplican a todo. En (x + 6)/6 no se puede tachar el 6, porque en el numerador está sumando.",
        ],
        formula: "(a × c)/(b × c) = a/b,  con c ≠ 0",
      },
      {
        title: "Sumar y multiplicar",
        paragraphs: [
          "Para sumar con el mismo denominador se suman los numeradores: 3/x + 5/x = 8/x. Con denominadores distintos se busca uno común, como con los números.",
          "Para multiplicar se multiplican numeradores y denominadores, y después se simplifica: (2/x) × (x²/4) = 2x²/(4x) = x/2.",
        ],
        formula: "a/x + b/x = (a + b)/x;  (a/b) × (c/d) = (a × c)/(b × d)",
      },
    ],
    examples: [
      ex(
        "Simplifica (x² + 5x + 6)/(x + 2).",
        [
          ["x² + 5x + 6 = (x + 2)(x + 3)", "Factorizamos el numerador, porque 2 × 3 = 6 y 2 + 3 = 5."],
          ["(x + 2)(x + 3)/(x + 2)", "El factor (x + 2) está arriba y abajo, multiplicando a todo."],
          ["x + 3, con x ≠ −2", "Cancelamos el factor común. Comprobación con x = 1 → (1 + 5 + 6)/3 = 12/3 = 4 y 1 + 3 = 4."],
        ],
        "(x² + 5x + 6)/(x + 2) = x + 3, salvo en x = −2, donde la fracción no existe.",
      ),
      ex(
        "Calcula 2/x + 3/(2x).",
        [
          ["2/x = 4/(2x)", "El denominador común es 2x: multiplicamos arriba y abajo por 2."],
          ["4/(2x) + 3/(2x) = 7/(2x)", "Con el mismo denominador se suman los numeradores."],
          ["7/(2x), con x ≠ 0", "Comprobación con x = 1 → 2 + 3/2 = 7/2."],
        ],
        "2/x + 3/(2x) = 7/(2x). El denominador común se busca igual que con números.",
      ),
    ],
    diagnostic: [
      n("d-1", "Simplifica 12/18. Responde con la fracción irreducible.", 2 / 3, ["El MCD de 12 y 18 es 6.", "12 ÷ 6 = 2 y 18 ÷ 6 = 3, así que queda 2/3."], ["Busca el mayor divisor común.", "Es 6.", "Divide arriba y abajo entre 6."]),
      c("d-2", "¿Cuál es la factorización de x² − 16?", ["(x − 4)²", "(x + 4)(x − 4)", "(x − 8)(x + 2)"], 1, "x² − 16 es una diferencia de cuadrados: (x + 4)(x − 4)."),
      n("d-3", "¿Cuánto es 1/4 + 1/6? Responde con una fracción.", 5 / 12, ["El denominador común es 12, el menor múltiplo de 4 y de 6.", "1/4 = 3/12 y 1/6 = 2/12, así que 3/12 + 2/12 = 5/12."], ["Busca un denominador común.", "12 es múltiplo de 4 y de 6.", "1/4 = 3/12 y 1/6 = 2/12."]),
    ],
    practiceCorrection: errorFollowup("Si x = 2, ¿cuánto vale (4x + 12) ÷ 4?", 5, "Dividimos ambos términos entre 4 → (4x + 12) ÷ 4 = x + 3.", "Sustituyendo x = 2 obtenemos 2 + 3 = 5; en la expresión original también resulta 20 ÷ 4."),
    questions(v) {
      const k = [3, 5, 2, 4, 6, 7][v];
      const concept = [
        c(
          "q0",
          `¿Por qué en (x + ${k})/${k} no se puede tachar el ${k}?`,
          [
            [`Sí se puede: queda x`, `Con x = 1 la fracción vale ${1 + k}/${k}, no 1.`],
            `Porque el ${k} del numerador está sumando, no multiplica a todo el numerador`,
            [`Porque ${k} es primo`, "Ser primo no importa: solo se cancelan factores comunes."],
          ],
          1,
          `(x + ${k})/${k} = x/${k} + 1: el ${k} de abajo divide a los dos términos.`,
        ),
        c(
          "q0",
          `¿Para qué valor de x no está definida la fracción 5/(x − ${k})?`,
          [
            [`x = −${k}`, `Con x = −${k} el denominador vale −${2 * k}, que no es 0.`],
            ["x = 0", `Con x = 0 el denominador vale −${k}, que no es 0.`],
            `x = ${k}`,
          ],
          2,
          `El denominador x − ${k} vale 0 cuando x = ${k}, y no se puede dividir entre 0.`,
        ),
        c(
          "q0",
          `¿Por qué (x² − ${k * k})/(x − ${k}) y x + ${k} no son exactamente iguales?`,
          [
            `Porque la fracción no existe en x = ${k} y x + ${k} sí; en todos los demás valores coinciden`,
            ["Sí son exactamente iguales en todos los valores", `En x = ${k} la fracción tiene denominador 0.`],
            ["Porque al simplificar cambia el valor", "Simplificar no cambia el valor en los puntos donde la fracción existe."],
          ],
          0,
          `(x² − ${k * k})/(x − ${k}) = (x + ${k})(x − ${k})/(x − ${k}) = x + ${k}, pero solo para x ≠ ${k}.`,
        ),
      ][v % 3];

      const [k1, x1] = [[3, 10], [5, 9], [4, 12], [6, 10], [2, 7], [7, 15]][v];
      const [p2, q2] = [[2, 3], [1, 5], [3, 4], [2, 6], [4, 5], [1, 7]][v];
      const [a3, b3, x3] = [[3, 5, 4], [7, 2, 3], [4, 6, 4], [5, 7, 3], [2, 10, 4], [9, 3, 8]][v];
      const [fk, fm] = [[2, 3], [3, 4], [5, 2], [4, 3], [6, 5], [2, 7]][v];
      const t5 = [6, 3, 9, 12, 15, 21][v];
      const k6 = [3, 5, 2, 4, 6, 7][v];
      return [
        concept,
        n(
          "q1",
          `Simplifica (x² − ${k1 * k1})/(x + ${k1}) y calcula su valor para x = ${x1}.`,
          x1 - k1,
          [`x² − ${k1 * k1} = (x + ${k1})(x − ${k1}); al cancelar el factor (x + ${k1}) queda x − ${k1}.`, `Para x = ${x1}, la expresión vale ${x1} − ${k1} = ${x1 - k1}.`],
          ["Factoriza el numerador: es una diferencia de cuadrados.", `x² − ${k1 * k1} = (x + ${k1})(x − ${k1}).`, `Cancela (x + ${k1}) y sustituye x = ${x1}.`],
          { errors: [{ value: x1 + k1, feedback: `Cancelaste mal: el factor que queda es x − ${k1}.` }] },
        ),
        n(
          "q2",
          `Para simplificar (x² + ${p2 + q2}x + ${p2 * q2})/(x + ${p2}), primero se factoriza el numerador como (x + ${p2})(x + b). ¿Cuánto vale b?`,
          q2,
          [`Buscamos b con ${p2} × b = ${p2 * q2} y ${p2} + b = ${p2 + q2}.`, `b vale ${q2}, porque ${p2} × ${q2} = ${p2 * q2} y ${p2} + ${q2} = ${p2 + q2}; la fracción se simplifica a x + ${q2}.`],
          [`El producto de los dos números es ${p2 * q2}.`, `Uno de ellos es ${p2}.`, `${p2 * q2} ÷ ${p2} = ${q2}.`],
          { step: true },
        ),
        n(
          "q3",
          `Calcula ${a3}/x + ${b3}/x y halla su valor para x = ${x3}.`,
          (a3 + b3) / x3,
          [`Con el mismo denominador se suman los numeradores → ${a3}/x + ${b3}/x = ${a3 + b3}/x.`, `Para x = ${x3} → ${a3 + b3}/${x3} = ${dec((a3 + b3) / x3)}.`],
          ["Los denominadores son iguales.", "Suma solo los numeradores.", `Queda ${a3 + b3}/x; sustituye x = ${x3}.`],
          { errors: [{ value: (a3 + b3) / (2 * x3), feedback: "Sumaste también los denominadores: x + x no es el denominador común." }] },
        ),
        c(
          "q4",
          `Alguien simplifica (${fk}x + ${fk * fm})/${fk} y escribe x + ${fk * fm}. ¿Qué error cometió?`,
          [
            ["Ninguno: está bien", `Con x = 0 la fracción vale ${fm}, y su resultado daría ${fk * fm}.`],
            [`Debió tachar la x`, "La x no aparece en el denominador: no se puede cancelar."],
            `Solo dividió el primer término: (${fk}x + ${fk * fm})/${fk} = x + ${fm}`,
          ],
          2,
          `El ${fk} divide a todo el numerador: ${fk}x + ${fk * fm} = ${fk}(x + ${fm}), y al cancelar queda x + ${fm}.`,
        ),
        n(
          "q5",
          `Un caño llena un tanque en x horas y otro, más lento, en 2x horas. Juntos llenan 1/x + 1/(2x) del tanque por hora. Si x = ${t5}, ¿cuántas horas tardan juntos en llenarlo?`,
          (2 * t5) / 3,
          [`1/x + 1/(2x) = 2/(2x) + 1/(2x) = 3/(2x) del tanque por hora.`, `El tiempo es el inverso → 2x/3, que con x = ${t5} da 2 × ${t5}/3 = ${dec((2 * t5) / 3)} horas.`],
          ["Suma las dos fracciones con denominador común 2x.", "Juntos llenan 3/(2x) por hora.", "Si en una hora llenan 3/(2x), tardan 2x/3 horas."],
          { intent: "transfer", unit: "horas", errors: [{ value: 3 * t5, feedback: "Sumaste los tiempos: juntos tardan menos que el más rápido." }] },
        ),
        c(
          "q6",
          `¿Cuál de estas fracciones es equivalente a (x + ${k6})/(x² − ${k6 * k6})?`,
          [
            `1/(x − ${k6})`,
            [`1/(x + ${k6})`, `x² − ${k6 * k6} = (x + ${k6})(x − ${k6}): al cancelar (x + ${k6}) queda (x − ${k6}) abajo.`],
            [`(x + ${k6})/(x − ${k6})²`, `x² − ${k6 * k6} no es (x − ${k6})², que vale x² − ${2 * k6}x + ${k6 * k6}.`],
          ],
          0,
          `(x + ${k6})/((x + ${k6})(x − ${k6})) = 1/(x − ${k6}), para x ≠ ${k6} y x ≠ −${k6}.`,
          "transfer",
        ),
      ];
    },
    outcome: "Puedes simplificar fracciones algebraicas factorizando, indicar sus valores no permitidos y sumarlas o multiplicarlas.",
    commonErrors: [
      "Tachar términos que suman en lugar de factores que multiplican.",
      "Olvidar indicar los valores que anulan el denominador.",
      "Sumar los denominadores al sumar fracciones algebraicas.",
      "Intentar simplificar sin factorizar antes.",
    ],
    application: n(
      "aplicacion",
      "Un bus cuesta 600 soles y se reparte por igual: si viajan x personas, cada una paga 600/x soles. Si x = 15 y se suman 5 personas más, cada una paga 600/(x + 5). ¿Cuántos soles ahorra cada persona?",
      10,
      ["Con x = 15, cada persona paga 600/15 = 40 soles.", "Con 20 personas paga 600/20 = 30 soles, así que cada una ahorra 40 − 30 = 10 soles."],
      ["Calcula 600/x con x = 15.", "Calcula 600/(x + 5) con x = 15.", "Resta los dos precios."],
      { intent: "transfer", unit: "soles" },
    ),
  }),
];

// ── Logaritmos ──────────────────────────────────────────────────────────
/** «log₂ 8» o, en base 10, «log 1000». */
const logOf = (base: number, x: string | number) => (base === 10 ? `log ${x}` : `log${sub(base)} ${x}`);
const big = (x: number) => dec(x);

export const LOGARITHM_LESSONS: Lesson[] = [
  defineLesson({
    id: "logaritmos",
    unitId: "expresiones",
    title: "Logaritmos",
    objective:
      "Interpretar el logaritmo como el exponente que convierte la base en un número, calcular logaritmos exactos y usar las propiedades del producto, del cociente y de la potencia.",
    purpose:
      "Cuando algo crece multiplicándose, como una población o un capital, la pregunta «¿cuántos años tarda en duplicarse?» se responde con un logaritmo: es la operación que despeja el exponente.",
    prerequisites: ["funciones-exponenciales"],
    legacyModuleIds: [],
    visual: "exponential",
    vocabulary: [
      { term: "Logaritmo", meaning: "El logaritmo en base b de un número a es el exponente n tal que bⁿ = a: log₂ 8 vale 3 porque 2³ = 8." },
      { term: "Base del logaritmo", meaning: "Número que se eleva; tiene que ser positivo y distinto de 1." },
      { term: "Logaritmo decimal", meaning: "Logaritmo en base 10; se escribe sin base: log 1000 vale 3." },
    ],
    sections: [
      {
        title: "El exponente que falta",
        paragraphs: [
          "log₂ 8 pregunta a qué exponente hay que elevar 2 para obtener 8. Como 2³ = 8, log₂ 8 = 3.",
          "En general, el logaritmo en base b de un número a es el exponente n tal que bⁿ = a. La base es positiva y distinta de 1, y a tiene que ser positivo.",
        ],
        formula: "log₂ 8 = 3  ⇔  2³ = 8",
      },
      {
        title: "Logaritmos exactos",
        paragraphs: [
          "Para calcular un logaritmo exacto se escribe el número como potencia de la base: log₃ 81 = 4 porque 81 = 3⁴, y log 1000 = 3 porque 1000 = 10³. Sin base escrita, se entiende base 10.",
          "El logaritmo de 1 es 0 en cualquier base, porque b⁰ = 1, y el de la propia base es 1. Si el número es menor que 1, el logaritmo es negativo: log₂ (1/8) = −3.",
        ],
        formula: "log₃ 81 = 4;  log 1000 = 3;  log₂ (1/8) = −3",
      },
      {
        title: "Propiedades",
        paragraphs: [
          "El logaritmo de un producto es la suma de los logaritmos: log (a × b) = log a + log b. Viene de que, al multiplicar potencias de la misma base, los exponentes se suman.",
          "Del mismo modo, log (a ÷ b) = log a − log b y log (aⁿ) = n × log a. Así, log₂ 32 = log₂ (2⁵) = 5 × log₂ 2 = 5.",
        ],
        formula: "log (a × b) = log a + log b;  log (aⁿ) = n × log a",
      },
    ],
    examples: [
      ex(
        "Calcula log₅ 125.",
        [
          ["125 = 5 × 5 × 5", "Escribimos 125 como producto de cincos."],
          ["125 = 5³", "Hay tres factores 5: el exponente es 3."],
          ["log₅ 125 = 3", "El logaritmo es ese exponente. Comprobación → 5³ = 125."],
        ],
        "log₅ 125 = 3: el logaritmo cuenta cuántas veces se multiplica la base.",
      ),
      ex(
        "Una población de bacterias se duplica cada hora. ¿Cuántas horas tarda en pasar de 100 a 6400?",
        [
          ["100 × 2ⁿ = 6400", "Cada hora se multiplica por 2: después de n horas hay 100 × 2ⁿ."],
          ["2ⁿ = 64", "Dividimos los dos lados entre 100."],
          ["n = log₂ 64 = 6", "64 = 2⁶, así que tarda 6 horas."],
        ],
        "El logaritmo despeja el exponente: tarda log₂ 64 = 6 horas.",
      ),
    ],
    diagnostic: [
      n("d-1", "¿Cuánto es 2⁵?", 32, ["2⁵ = 2 × 2 × 2 × 2 × 2.", "Eso da 32."], ["Multiplica 2 por sí mismo cinco veces.", "2 × 2 × 2 = 8.", "8 × 2 × 2 = 32."]),
      n("d-2", "¿A qué exponente hay que elevar 10 para obtener 1000?", 3, ["1000 = 10 × 10 × 10.", "Son tres factores 10, así que el exponente es 3."], ["Escribe 1000 como producto de dieces.", "10 × 10 × 10.", "Cuenta los factores."]),
      c("d-3", "Una cantidad se multiplica por 3 cada año. ¿Qué tipo de crecimiento es?", ["Lineal", "Exponencial", "Constante"], 1, "Multiplicar por un factor fijo en cada paso es crecimiento exponencial."),
    ],
    practiceCorrection: errorFollowup("Si logaritmo en base 10 de 2 es a y de 5 es b, ¿cuánto vale a + b?", 1, "La suma de los logaritmos de números positivos es el logaritmo de su producto.", "Como 2 × 5 = 10 y el logaritmo en base 10 de 10 es 1, la suma vale 1."),
    questions(v) {
      const e2 = v === 0 ? 5 : 6;
      const e10 = v === 1 ? 3 : 2;
      const e3 = v === 2 ? 4 : 5;
      const concept = [
        c(
          "q0",
          `¿Qué pregunta responde ${logOf(2, 2 ** e2)}?`,
          [
            [`Cuánto es ${2 ** e2} ÷ 2`, `${2 ** e2} ÷ 2 da ${2 ** (e2 - 1)}, pero ${logOf(2, 2 ** e2)} vale ${e2}.`],
            `A qué exponente hay que elevar 2 para obtener ${2 ** e2}`,
            [`Cuánto es ${2 ** e2} × 2`, "Multiplicar no tiene que ver: el logaritmo es un exponente."],
          ],
          1,
          `2${sup(e2)} = ${2 ** e2}, así que ${logOf(2, 2 ** e2)} vale ${e2}.`,
        ),
        c(
          "q0",
          `¿Por qué ${logOf(10, big(10 ** e10))} vale ${e10}?`,
          [
            `Porque 10 elevado a ${e10} da ${big(10 ** e10)}`,
            [`Porque se divide ${big(10 ** e10)} entre 10`, `${big(10 ** e10)} ÷ 10 da ${big(10 ** (e10 - 1))}, no ${e10}.`],
            [`Porque ${big(10 ** e10)} es par`, "Ser par no tiene que ver: el logaritmo es un exponente."],
          ],
          0,
          `10${sup(e10)} = ${big(10 ** e10)}: el logaritmo decimal es el exponente de 10.`,
        ),
        c(
          "q0",
          `Si 3ⁿ = ${3 ** e3}, ¿cómo se escribe n con un logaritmo?`,
          [
            [`n = ${3 ** e3} ÷ 3`, `Dividir no despeja un exponente: ${3 ** e3} ÷ 3 da ${3 ** (e3 - 1)}.`],
            [`n = ${logOf(3 ** e3, 3)}`, `La base es 3 y el número del que se busca el exponente es ${3 ** e3}.`],
            `n = ${logOf(3, 3 ** e3)}`,
          ],
          2,
          `3ⁿ = ${3 ** e3} significa n = ${logOf(3, 3 ** e3)}, y como 3${sup(e3)} = ${3 ** e3}, n vale ${e3}.`,
        ),
      ][v % 3];

      const [b1, n1] = [[2, 6], [3, 4], [5, 3], [2, 7], [10, 4], [4, 3]][v];
      const x1 = b1 ** n1;
      const m2 = [2, 4, 5, 1, 6, 7][v];
      const M2 = 2 ** m2;
      const [b3, n3] = [[2, 3], [3, 2], [10, 2], [5, 2], [2, 5], [4, 2]][v];
      const x3 = b3 ** n3;
      const [la, lb] = [[1, 2], [1, 3], [2, 2], [1, 1], [2, 3], [3, 1]][v];
      const [pp, pn] = [[5, 3], [4, 4], [6, 3], [3, 5], [7, 2], [8, 3]][v];
      const trios = [
        [[2, 32], [3, 81], [10, 1000]],
        [[2, 16], [3, 243], [10, 100]],
        [[2, 8], [3, 9], [10, 10000]],
        [[2, 64], [5, 625], [10, 100000]],
        [[4, 256], [2, 32], [10, 1000]],
        [[3, 27], [2, 128], [5, 3125]],
      ][v];
      const vals = trios.map(([b, x]) => Math.round(Math.log(x) / Math.log(b)));
      const top = Math.max(...vals);
      const topIndex = vals.indexOf(top);
      return [
        concept,
        n(
          "q1",
          `Calcula ${logOf(b1, big(x1))}.`,
          n1,
          [`${big(x1)} = ${Array(n1).fill(b1).join(" × ")} = ${b1}${sup(n1)}.`, `El logaritmo en base ${b1} de ${big(x1)} es el exponente, ${n1}, porque ${b1} se multiplica ${n1} veces.`],
          [`Escribe ${big(x1)} como potencia de ${b1}.`, `¿Cuántas veces se multiplica ${b1} para llegar a ${big(x1)}?`, `${big(x1)} = ${b1}${sup(n1)}.`],
          { errors: [{ value: x1 / b1, feedback: "Dividiste el número entre la base; el logaritmo cuenta cuántas veces se multiplica la base." }] },
        ),
        n(
          "q2",
          `Sabiendo que log₂ 8 = 3 y log₂ ${M2} = ${m2}, calcula log₂ (8 × ${M2}) con la propiedad del producto.`,
          3 + m2,
          [`El logaritmo de un producto es la suma de los logaritmos → log₂ (8 × ${M2}) = log₂ 8 + log₂ ${M2}.`, `3 + ${m2} = ${3 + m2}. Comprobación → 8 × ${M2} = ${8 * M2} = 2${sup(3 + m2)}.`],
          ["Usa la propiedad del producto.", `log₂ (8 × ${M2}) = log₂ 8 + log₂ ${M2}.`, `Suma 3 + ${m2}.`],
          { step: true, errors: 3 * m2 !== 3 + m2 ? [{ value: 3 * m2, feedback: "Multiplicaste los logaritmos: el del producto es la suma." }] : [] },
        ),
        n(
          "q3",
          `Calcula ${logOf(b3, `(1/${x3})`)}.`,
          -n3,
          [`1/${x3} = ${b3}${sup(-n3)}, porque un exponente negativo indica el inverso de la potencia.`, `El logaritmo es ese exponente, así que ${logOf(b3, `(1/${x3})`)} vale −${n3}.`],
          ["Un número menor que 1 tiene logaritmo negativo.", `${x3} = ${b3}${sup(n3)}.`, `1/${x3} = ${b3}${sup(-n3)}.`],
          { errors: [{ value: n3, feedback: "El número es menor que 1: su logaritmo es negativo." }] },
        ),
        c(
          "q4",
          `Alguien escribe log (${big(10 ** la)} + ${big(10 ** lb)}) = log ${big(10 ** la)} + log ${big(10 ** lb)}. ¿Es correcto?`,
          [
            ["Sí: es la propiedad de la suma", "La propiedad es la del producto: log (a × b) = log a + log b."],
            `No: log ${big(10 ** la)} + log ${big(10 ** lb)} es el logaritmo del producto, log ${big(10 ** (la + lb))}`,
            [`Sí, porque ${big(10 ** la)} y ${big(10 ** lb)} son potencias de 10`, `Aun así, 10${sup(la + lb)} = ${big(10 ** (la + lb))}, que no es ${big(10 ** la + 10 ** lb)}.`],
          ],
          1,
          `log ${big(10 ** la)} + log ${big(10 ** lb)} = ${la} + ${lb} = ${la + lb}, que es log ${big(10 ** (la + lb))}; en cambio, ${big(10 ** la + 10 ** lb)} no es una potencia de 10.`,
        ),
        n(
          "q5",
          `Un capital se duplica cada ${pp} años. ¿Cuántos años tarda en multiplicarse por ${2 ** pn}?`,
          pp * pn,
          [`Multiplicarse por ${2 ** pn} es duplicarse n veces, con 2ⁿ = ${2 ** pn}, así que n = log₂ ${2 ** pn} = ${pn}.`, `Cada duplicación tarda ${pp} años → ${pn} × ${pp} = ${pp * pn} años.`],
          [`¿Cuántas veces hay que duplicar para multiplicar por ${2 ** pn}?`, `2ⁿ = ${2 ** pn}.`, `Multiplica ese número de duplicaciones por ${pp} años.`],
          { intent: "transfer", unit: "años", errors: [{ value: pp * 2 ** pn, feedback: "Multiplicaste por el factor; lo que cuenta es cuántas duplicaciones hay." }] },
        ),
        c(
          "q6",
          `¿Cuál de estos logaritmos es el mayor: ${list(trios.map(([b, x]) => logOf(b, big(x))))}?`,
          trios.map(([b, x], i): ChoiceLabel =>
            i === topIndex ? logOf(b, big(x)) : [logOf(b, big(x)), `${logOf(b, big(x))} vale ${vals[i]}, porque ${b}${sup(vals[i])} = ${big(x)}; es menor que ${top}.`],
          ),
          topIndex,
          `Cada logaritmo es un exponente → ${trios.map(([b, x], i) => `${logOf(b, big(x))} vale ${vals[i]}`).join("; ")}. Un número mayor no siempre da un logaritmo mayor: depende de la base.`,
          "transfer",
        ),
      ];
    },
    outcome: "Puedes calcular logaritmos exactos, interpretarlos como exponentes y usar sus propiedades para despejar el tiempo en un crecimiento exponencial.",
    commonErrors: [
      "Confundir el logaritmo con una división entre la base.",
      "Creer que log (a + b) = log a + log b.",
      "Invertir la base y el número: log₃ 81 no es log₈₁ 3.",
      "Pensar que un logaritmo no puede ser negativo, cuando log₂ (1/8) = −3.",
    ],
    application: n(
      "aplicacion",
      "La intensidad de un sonido, en decibeles, es 10 × log I, donde I es cuántas veces supera la intensidad mínima audible. ¿Cuántos decibeles tiene un sonido con I = 10⁸?",
      80,
      ["log (10⁸) = 8, porque 10 elevado a 8 da 10⁸.", "10 × 8 = 80 decibeles."],
      ["Calcula primero log (10⁸).", "El logaritmo decimal de una potencia de 10 es su exponente.", "Multiplica por 10."],
      { intent: "transfer", unit: "dB" },
    ),
  }),
];
