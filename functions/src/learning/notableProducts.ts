import { defineLesson } from "./defineLesson";
import { choice as c, example as ex, numeric as n } from "./questions";
import type { Lesson } from "./types";

export const NOTABLE_PRODUCT_LESSONS: Lesson[] = [
  defineLesson({
    id: "productos-notables",
    unitId: "expresiones",
    title: "Productos notables",
    objective: "Desarrollar cuadrados de binomios y productos de binomios conjugados usando la propiedad distributiva.",
    purpose: "Reconocer estos patrones permite multiplicar expresiones y calcular áreas sin repetir todos los pasos cada vez.",
    prerequisites: ["propiedad-distributiva", "potencias-raices"],
    legacyModuleIds: [],
    visual: "linear",
    vocabulary: [
      { term: "Binomio", meaning: "Expresión formada por dos términos, como x + 3." },
      { term: "Producto notable", meaning: "Producto que sigue un patrón algebraico que se puede obtener con la propiedad distributiva." },
      { term: "Binomios conjugados", meaning: "Binomios que solo difieren en el signo entre sus términos, como x + 3 y x − 3." },
    ],
    sections: [
      { title: "Cuadrado de una suma", paragraphs: ["Elevar un binomio al cuadrado significa multiplicarlo por sí mismo. Cada término del primer paréntesis multiplica a cada término del segundo.", "Los dos productos cruzados son iguales y juntos forman 2ab. Por eso no basta con elevar al cuadrado cada término."], formula: "(a + b)² = a² + 2ab + b²" },
      { title: "Cuadrado de una diferencia", paragraphs: ["Al multiplicar (a − b) por sí mismo, los dos productos cruzados son negativos y el producto de los términos negativos es positivo.", "Por ejemplo, (x − 3)² = x² − 6x + 9."], formula: "(a − b)² = a² − 2ab + b²" },
      { title: "Producto de conjugados", paragraphs: ["Al multiplicar una suma por la diferencia de los mismos términos, los productos cruzados se cancelan.", "La diferencia de cuadrados también puede reconocerse en sentido inverso: a² − b² = (a + b)(a − b)."], formula: "(a + b)(a − b) = a² − b²" },
    ],
    examples: [
      ex("Desarrolla (x + 4)².", [["(x + 4)(x + 4)", "Escribimos el cuadrado como un producto."], ["x² + 4x + 4x + 16", "Multiplicamos cada término por cada término."], ["x² + 8x + 16", "Sumamos los términos semejantes."]], "El término central es el doble de x por 4."),
      ex("Desarrolla (2x + 3)(2x − 3).", [["(2x)² − 3²", "Aplicamos el producto de conjugados."], ["2²x² − 3²", "Elevamos al cuadrado todo el primer término."], ["4x² − 9", "Calculamos los dos cuadrados."]], "Los términos cruzados se cancelan."),
    ],
    diagnostic: [
      n("d-1", "¿Cuánto es 3²?", 9, ["3² = 3 × 3 = 9."], ["Un cuadrado es un producto.", "Multiplica 3 por sí mismo.", "3 × 3 = 9."]),
      c("d-2", "¿Cuál es el resultado de 2(x + 3)?", ["2x + 3", "2x + 6", "x + 6"], 1, "El 2 multiplica a ambos términos: 2x + 6."),
      n("d-3", "Reduce 3x + 4x. ¿Cuál es el coeficiente de x?", 7, ["3x + 4x = 7x."], ["Son términos semejantes.", "Suma los coeficientes.", "3 + 4 = 7."]),
    ],
    questions(v) {
      const k = [2, 3, 4, 5, 6, 7][v];
      return [
        c("q0", `¿Cuál es el desarrollo de (x + ${k})²?`, [[`x² + ${k * k}`, "Faltan los dos productos cruzados."], `x² + ${2 * k}x + ${k * k}`, [`x² + ${2 * k}x − ${k * k}`, "El cuadrado del segundo término es positivo."]], 1, "El cuadrado de una suma incluye los dos productos cruzados y el cuadrado de cada término."),
        c("q1", `Desarrolla (x − ${k})².`, [`x² − ${2 * k}x + ${k * k}`, [`x² − ${k * k}`, "Este patrón corresponde al producto de conjugados."], [`x² − ${2 * k}x − ${k * k}`, "El producto de dos términos negativos es positivo."]], 0, "Los productos cruzados son negativos y el cuadrado del segundo término es positivo.", "procedure"),
        n("q2", `Completa (x + ${k})² = x² + __x + ${k * k}.`, 2 * k, [`El coeficiente central es 2 × ${k} = ${2 * k}.`], ["Busca los dos productos cruzados.", `Cada uno es ${k}x.`, `Suma ${k} + ${k}.`], { step: true }),
        c("q3", `Desarrolla (2x + ${k})(2x − ${k}).`, [`4x² − ${k * k}`, [`2x² − ${k * k}`, "También debes elevar 2 al cuadrado."], [`4x² + ${k * k}`, "El producto de conjugados es una diferencia de cuadrados."]], 0, "Los términos cruzados se cancelan y (2x)² = 4x².", "procedure"),
        c("q4", `Una persona afirma que (x + ${k})² = x² + ${k * k}. ¿Qué falta?`, [`El término ${2 * k}x`, ["Nada, la igualdad es correcta", "Faltan los dos productos cruzados."], [`El término −${2 * k}x`, "Los dos productos cruzados son positivos."]], 0, "Los dos productos cruzados suman 2 × x × el segundo término."),
        n("q5", `Un cuadrado tiene lado ${k} + 10 metros. Usando (10 + ${k})², ¿cuál es su área en metros cuadrados?`, (10 + k) ** 2, [`10² + 2 × 10 × ${k} + ${k}² = ${(10 + k) ** 2}.`], ["El área es lado por lado.", "Usa el cuadrado de una suma.", `Suma 100 + ${20 * k} + ${k * k}.`], { intent: "transfer", unit: "m²" }),
        c("q6", `¿Qué producto corresponde a x² − ${k * k}?`, [`(x + ${k})(x − ${k})`, [`(x − ${k})²`, "Este cuadrado tiene un término central negativo."], [`(x + ${k})²`, "Este cuadrado tiene un término central positivo."]], 0, "La diferencia de cuadrados se expresa como producto de conjugados.", "transfer"),
      ];
    },
    outcome: "Puedes desarrollar cuadrados de binomios y reconocer una diferencia de cuadrados.",
    commonErrors: ["Omitir el término central en el cuadrado de un binomio.", "Escribir negativo el cuadrado del segundo término de una diferencia.", "Olvidar elevar al cuadrado el coeficiente en un producto de conjugados."],
    application: n("aplicacion", "Una plaza cuadrada de lado 20 m se amplía 3 m por lado. ¿Cuál es su nueva área en metros cuadrados?", 529, ["(20 + 3)² = 20² + 2 × 20 × 3 + 3² = 400 + 120 + 9 = 529."], ["El nuevo lado mide 23 m.", "Calcula el cuadrado de 20 + 3.", "Suma 400 + 120 + 9."], { intent: "transfer", unit: "m²" }),
  }),
];
