import { defineLesson } from "./defineLesson";
import { choice as c, example as ex, numeric as n } from "./questions";
import type { Lesson } from "./types";

const fmt = (x: number) => x.toLocaleString("es", { maximumFractionDigits: 3 });
const list = (xs: number[]) => xs.join(", ");
const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
const sorted = (xs: number[]) => [...xs].sort((a, b) => a - b);
function median(xs: number[]) {
  const s = sorted(xs);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

export const DATA_LESSONS: Lesson[] = [
  defineLesson({
    id: "media-mediana-moda",
    unitId: "datos",
    title: "Media, mediana y moda",
    objective:
      "Calcular e interpretar la media, la mediana, la moda y el rango, y elegir la medida adecuada cuando hay valores extremos.",
    purpose:
      "Para informar del consumo típico de la ciudad hay que resumir muchos datos en un número que los represente bien.",
    prerequisites: ["jerarquia-operaciones"],
    legacyModuleIds: ["medicion-d5", "medicion-d6", "medicion-d7", "medicion-d8"],
    visual: "data",
    vocabulary: [
      { term: "Media", meaning: "Suma de los datos dividida entre la cantidad de datos." },
      { term: "Mediana", meaning: "Valor central de los datos ordenados." },
      { term: "Moda", meaning: "Valor que más se repite." },
      { term: "Rango", meaning: "Diferencia entre el mayor y el menor valor: mide la dispersión." },
    ],
    sections: [
      {
        title: "La media reparte por igual",
        paragraphs: [
          "Si cinco casas consumen 4, 6, 5, 3 y 7 unidades, la media es (4 + 6 + 5 + 3 + 7) ÷ 5 = 5: es lo que consumiría cada una si repartieran el total por igual.",
          "La media se ve muy afectada por un valor extremo: con 4, 6, 5, 3 y 32, la media sube a 10, aunque casi todas consumen poco.",
        ],
        formula: "media = suma ÷ cantidad",
      },
      {
        title: "La mediana está en el centro",
        paragraphs: [
          "Para la mediana, ordena los datos y toma el central: 3, 4, 5, 6, 32 → 5. Un valor extremo apenas la mueve.",
          "Si la cantidad de datos es par, la mediana es la media de los dos centrales: 3, 4, 6, 9 → (4 + 6) ÷ 2 = 5.",
        ],
        formula: "3, 4, [5], 6, 32 → mediana 5",
      },
      {
        title: "Moda y rango",
        paragraphs: [
          "La moda es el valor más frecuente; sirve también para datos no numéricos, como el color más elegido.",
          "El rango (mayor − menor) indica cuánto varían los datos: dos grupos con la misma media pueden tener rangos muy distintos.",
        ],
        formula: "rango = mayor − menor",
      },
    ],
    examples: [
      ex("Consumos: 8, 5, 9, 5, 13. Calcula media, mediana y moda.", [
        ["Suma 40; 40 ÷ 5 = 8", "La media reparte el total por igual."],
        ["Ordenados: 5, 5, 8, 9, 13 → 8", "Mediana: el valor central."],
        ["Moda: 5", "Es el valor que más se repite."],
      ], "Media 8, mediana 8, moda 5, rango 8."),
      ex("Las notas de un grupo son 6, 7, 7, 8 y la de un quinto estudiante falta. La media es 7. ¿Cuál es la nota que falta?", [
        ["5 × 7 = 35", "La media por la cantidad da la suma total."],
        ["6 + 7 + 7 + 8 = 28", "Suma de las notas conocidas."],
        ["35 − 28 = 7", "La que falta completa el total."],
      ], "La nota que falta es 7."),
    ],
    diagnostic: [
      n("d-1", "¿Cuánto es (6 + 8 + 10) ÷ 3?", 8, ["24 ÷ 3 = 8."], ["Suma primero.", "24 ÷ 3.", "8."]),
      c("d-2", "Ordena de menor a mayor: 9, 2, 5. ¿Cuál queda en el centro?", ["2", "5", "9"], 1, "2, 5, 9: el central es 5."),
      n("d-3", "¿Cuánto es 15 − 4?", 11, ["15 − 4 = 11."], ["Cuenta hacia atrás.", "15 − 4.", "11."]),
    ],
    questions(v) {
      const data = [[4, 7, 5, 9, 5], [12, 8, 10, 15, 10], [3, 6, 6, 2, 8], [20, 14, 17, 14, 25], [9, 11, 7, 13, 10], [5, 9, 9, 4, 13]][v],
        even = [[10, 3, 8, 5], [12, 7, 9, 16], [9, 2, 4, 7], [15, 11, 21, 13], [6, 10, 3, 9], [14, 8, 5, 11]][v],
        outlier = [[3, 4, 5, 4, 34], [10, 12, 11, 9, 58], [6, 7, 5, 6, 46], [2, 3, 2, 4, 39], [8, 9, 7, 8, 48], [5, 6, 6, 7, 51]][v],
        [count, mean, known] = [[5, 8, [6, 9, 7, 12]], [4, 12, [10, 15, 14]], [6, 5, [4, 6, 3, 7, 8]], [5, 15, [12, 18, 14, 20]], [4, 9, [8, 12, 10]], [5, 6, [5, 8, 4, 9]]][v] as [number, number, number[]];
      const missing = count * mean - sum(known);
      return [
        v % 2 === 0
          ? c(
              "q0",
              `Los consumos ${list(outlier)} tienen un valor muy alto. ¿Qué medida describe mejor el consumo típico?`,
              [
                ["La media", `El ${outlier[4]} eleva la media a ${fmt(sum(outlier) / 5)}, por encima de casi todos los datos.`],
                "La mediana",
                ["El rango", "El rango mide la dispersión, no el valor típico."],
              ],
              1,
              "La mediana resiste los valores extremos.",
            )
          : c(
              "q0",
              "¿Qué significa que la media de consumo sea 8?",
              [
                ["Que todas las casas consumen 8", "Puede que ninguna consuma exactamente 8."],
                ["Que 8 es el valor más repetido", "Esa es la moda."],
                "Que si se repartiera el total por igual, cada casa consumiría 8",
              ],
              2,
              "La media es el reparto equitativo del total.",
            ),
        n(
          "q1",
          `Calcula la media de ${list(data)}.`,
          sum(data) / data.length,
          [`Suma: ${sum(data)}.`, `${sum(data)} ÷ ${data.length} = ${fmt(sum(data) / data.length)}.`],
          ["Suma todos los datos.", `Divide entre la cantidad, ${data.length}.`, `${sum(data)} ÷ ${data.length}.`],
          { errors: [{ value: median(data), feedback: "Esa es la mediana. La media divide la suma entre la cantidad." }].filter((e) => e.value !== sum(data) / data.length) },
        ),
        n(
          "q2",
          `Completa: ordenados, los datos ${list(even)} son ${list(sorted(even))}; la mediana es (${sorted(even)[1]} + ${sorted(even)[2]}) ÷ 2 = __.`,
          median(even),
          [`${sorted(even)[1]} + ${sorted(even)[2]} = ${sorted(even)[1] + sorted(even)[2]}; ÷ 2 = ${fmt(median(even))}.`],
          ["Con cantidad par, se toman los dos centrales.", "Súmalos.", "Divide entre 2."],
          { step: true, errors: [{ value: (even[1] + even[2]) / 2, feedback: "Usaste los centrales sin ordenar los datos." }].filter((e) => e.value !== median(even)) },
        ),
        n(
          "q3",
          `¿Cuál es el rango de ${list(data)}?`,
          Math.max(...data) - Math.min(...data),
          [`Mayor ${Math.max(...data)}, menor ${Math.min(...data)}.`, `Rango: ${Math.max(...data) - Math.min(...data)}.`],
          ["Busca el mayor y el menor.", "Réstalos.", `${Math.max(...data)} − ${Math.min(...data)}.`],
          { errors: [{ value: data[data.length - 1] - data[0], feedback: "Restaste el último y el primero sin buscar el mayor y el menor." }].filter((e) => e.value !== Math.max(...data) - Math.min(...data)) },
        ),
        c(
          "q4",
          `Alguien dice que la mediana de ${list(even)} es (${even[1]} + ${even[2]}) ÷ 2. ¿Qué falla?`,
          [
            ["Nada", "Los datos deben ordenarse antes de buscar el centro."],
            `Hay que ordenar primero: ${list(sorted(even))}, y la mediana es ${fmt(median(even))}`,
            ["Con cantidad par no hay mediana", "Sí la hay: es la media de los dos centrales."],
          ],
          1,
          "La mediana es el centro de los datos ordenados.",
        ),
        n(
          "q5",
          `Los consumos de ${outlier.length} casas son ${list(outlier)}. ¿Cuál es la mediana?`,
          median(outlier),
          [`Ordenados: ${list(sorted(outlier))}.`, `Central: ${median(outlier)}.`],
          ["Ordena los datos.", "Busca el valor central.", "El valor extremo no lo mueve."],
          {
            intent: "transfer",
            errors: [{ value: sum(outlier) / outlier.length, feedback: "Esa es la media, que el valor extremo eleva mucho." }],
          },
        ),
        n(
          "q6",
          `${count} sensores tienen una media de ${mean} unidades. Se conocen ${count - 1} lecturas: ${list(known)}. ¿Cuánto marca el sensor que falta?`,
          missing,
          [`Total: ${count} × ${mean} = ${count * mean}.`, `Conocidas: ${sum(known)}.`, `Falta: ${count * mean} − ${sum(known)} = ${missing}.`],
          ["La media por la cantidad da la suma total.", `${count} × ${mean}.`, "Resta la suma de las lecturas conocidas."],
          {
            intent: "transfer",
            errors: [{ value: mean, feedback: "El dato que falta no tiene por qué ser igual a la media: completa la suma total." }].filter((e) => e.value !== missing),
          },
        ),
      ];
    },
    application: n(
      "app",
      "Dos barrios tienen consumos semanales: A = 10, 11, 9, 10, 10 y B = 2, 18, 10, 4, 16. Ambos tienen media 10. ¿Cuál es la diferencia entre sus rangos?",
      14,
      ["Rango A: 11 − 9 = 2.", "Rango B: 18 − 2 = 16.", "Diferencia: 16 − 2 = 14. B es mucho más irregular."],
      ["Calcula el rango de cada barrio.", "Mayor menos menor en cada uno.", "Resta los dos rangos."],
      {
        intent: "transfer",
        errors: [
          { value: 0, feedback: "Las medias coinciden, pero los rangos no." },
          { value: 16, feedback: "Ese es el rango de B. Se pide la diferencia entre ambos rangos." },
        ],
      },
    ),
    outcome: "Puedes resumir los consumos de la ciudad eligiendo la medida que mejor los representa.",
    commonErrors: [
      "Buscar la mediana sin ordenar los datos.",
      "Usar la media cuando un valor extremo la distorsiona.",
      "Confundir la moda con la media.",
    ],
  }),
  defineLesson({
    id: "probabilidad-simple",
    unitId: "datos",
    title: "Probabilidad de un suceso",
    objective:
      "Calcular la probabilidad de un suceso con resultados equiprobables, expresarla como fracción, decimal y porcentaje, y usar el complemento.",
    purpose:
      "Para planificar el mantenimiento hay que estimar qué tan probable es que falle un componente elegido al azar.",
    prerequisites: ["fraccion-decimal-porcentaje"],
    legacyModuleIds: ["medicion-d9", "medicion-d10"],
    visual: "probability",
    vocabulary: [
      { term: "Suceso", meaning: "Un resultado o conjunto de resultados de un experimento aleatorio." },
      { term: "Equiprobable", meaning: "Que todos los resultados tienen la misma posibilidad." },
      { term: "Complemento", meaning: "Que el suceso no ocurra: P(no A) = 1 − P(A)." },
    ],
    sections: [
      {
        title: "Casos favorables entre casos posibles",
        paragraphs: [
          "Si una caja tiene 3 fusibles rojos y 5 azules y se saca uno al azar, hay 8 casos posibles igual de probables. Sacar rojo tiene 3 casos favorables: P(rojo) = 3/8.",
          "Esta regla vale solo si todos los resultados son igual de probables.",
        ],
        formula: "P(A) = casos favorables ÷ casos posibles",
      },
      {
        title: "Entre 0 y 1",
        paragraphs: [
          "Una probabilidad va de 0 (imposible) a 1 (seguro). 3/8 = 0,375 = 37,5%.",
          "Las probabilidades de todos los resultados posibles suman 1.",
        ],
        formula: "0 ≤ P(A) ≤ 1",
      },
      {
        title: "El complemento",
        paragraphs: [
          "P(no rojo) = 1 − 3/8 = 5/8. A veces es más fácil calcular lo contrario y restar de 1.",
          "Probable no es seguro: con P = 0,9, el suceso puede no ocurrir. Y un resultado que no salió en varios intentos no se vuelve «más debido».",
        ],
        formula: "P(no A) = 1 − P(A)",
      },
    ],
    examples: [
      ex("Se lanza un dado. ¿Cuál es la probabilidad de obtener un número mayor que 4?", [
        ["Casos posibles: 6", "Los resultados 1 a 6 son equiprobables."],
        ["Favorables: 5 y 6 → 2", "Contamos los que cumplen."],
        ["P = 2/6 = 1/3", "Simplificamos."],
      ], "P(mayor que 4) = 1/3 ≈ 33%."),
      ex("De 40 sensores, 6 están averiados. Se elige uno al azar. ¿Probabilidad de que funcione?", [
        ["P(averiado) = 6/40", "Favorables sobre posibles."],
        ["P(funciona) = 1 − 6/40", "Complemento."],
        ["= 34/40 = 0,85 = 85%", "Expresamos en decimal y porcentaje."],
      ], "Funciona con probabilidad 0,85."),
    ],
    diagnostic: [
      n("d-1", "Simplifica 4/12 y escribe la fracción irreducible.", 1 / 3, ["4/12 = 1/3, dividiendo ambos términos entre 4."], ["Busca un divisor común.", "4 divide a 4 y a 12.", "1/3."]),
      n("d-2", "Escribe 3/4 como porcentaje (el número antes de %).", 75, ["3/4 = 0,75 = 75%."], ["3 ÷ 4.", "0,75 × 100.", "75."]),
      c("d-3", "Al lanzar una moneda, ¿cuántos resultados posibles hay?", ["1", "2", "4"], 1, "Cara o cruz."),
    ],
    questions(v) {
      const [red, blue] = [[3, 5], [4, 6], [2, 7], [5, 3], [6, 9], [7, 5]][v],
        [total, broken] = [[40, 6], [25, 4], [50, 9], [20, 3], [80, 12], [60, 15]][v],
        [die, label] = [[4, "mayor que 4"], [3, "menor que 3"], [5, "par o igual a 5"], [2, "múltiplo de 3"], [6, "menor que 7"], [1, "igual a 6"]][v] as [number, string],
        [r2, b2, g2] = [[2, 3, 1], [4, 1, 3], [3, 4, 2], [5, 2, 3], [1, 4, 2], [6, 2, 4]][v];
      const favDie = { 4: 2, 3: 2, 5: 4, 2: 2, 6: 6, 1: 1 }[die]!;
      return [
        v % 2 === 0
          ? c(
              "q0",
              "¿Cuándo se puede calcular una probabilidad como casos favorables ÷ casos posibles?",
              [
                "Cuando todos los resultados son igual de probables",
                ["Siempre, en cualquier experimento", "Si los resultados no son equiprobables, la regla no vale (una moneda trucada, por ejemplo)."],
                ["Solo con dados", "Vale para cualquier experimento con resultados equiprobables."],
              ],
              0,
              "La regla de Laplace exige resultados equiprobables.",
            )
          : c(
              "q0",
              "Una moneda salió cara cinco veces seguidas. ¿Qué es más probable en el siguiente lanzamiento?",
              [
                ["Cruz, porque «le toca»", "Los lanzamientos son independientes: la moneda no recuerda."],
                ["Cara, porque está en racha", "Tampoco: cada lanzamiento sigue siendo 1/2."],
                "Ambas tienen probabilidad 1/2",
              ],
              2,
              "Los resultados anteriores no cambian la probabilidad de un lanzamiento independiente.",
            ),
        n(
          "q1",
          `Una caja tiene ${red} fusibles rojos y ${blue} azules. Se saca uno al azar. ¿Cuál es la probabilidad de que sea rojo?`,
          red / (red + blue),
          [`Posibles: ${red + blue}; favorables: ${red}.`, `P(rojo) = ${red}/${red + blue}.`],
          ["Cuenta todos los fusibles.", "Cuenta los rojos.", `${red}/${red + blue}.`],
          { errors: [{ value: red / blue, feedback: "Dividiste rojos entre azules. Los casos posibles son todos los fusibles." }] },
        ),
        n(
          "q2",
          `Completa: si P(rojo) = ${red}/${red + blue}, entonces P(no rojo) = 1 − ${red}/${red + blue} = __.`,
          blue / (red + blue),
          [`1 − ${red}/${red + blue} = ${blue}/${red + blue}.`],
          ["Las probabilidades de rojo y no rojo suman 1.", `Escribe 1 como ${red + blue}/${red + blue}.`, "Resta."],
          { step: true, errors: [{ value: red / (red + blue), feedback: "Esa es la probabilidad de rojo. Se pide la contraria." }] },
        ),
        n(
          "q3",
          `Se lanza un dado de seis caras. ¿Cuál es la probabilidad de obtener un número ${label}?`,
          favDie / 6,
          [`Casos favorables: ${favDie}; posibles: 6.`, `P = ${favDie}/6.`],
          ["Escribe los resultados posibles: 1 a 6.", "Marca los que cumplen la condición.", "Divide favorables entre 6."],
          { errors: [{ value: (6 - favDie) / 6, feedback: "Contaste los casos que no cumplen la condición." }].filter((e) => e.value !== favDie / 6) },
        ),
        c(
          "q4",
          `Alguien dice que P(rojo) = ${red}/${blue} porque hay ${red} rojos y ${blue} azules. ¿Qué falla?`,
          [
            ["Nada, está bien", `${red}/${blue} compara rojos con azules; no es una probabilidad.`],
            `Los casos posibles son todos los fusibles: P = ${red}/${red + blue}`,
            [`Debía restar: ${blue - red}`, "La probabilidad es un cociente entre favorables y posibles."],
          ],
          1,
          "Una razón parte-parte no es una probabilidad: hay que dividir entre el total.",
        ),
        n(
          "q5",
          `De ${total} sensores, ${broken} están averiados. Se elige uno al azar. ¿Cuál es la probabilidad de que funcione? Escríbela en porcentaje (el número antes de %).`,
          ((total - broken) / total) * 100,
          [`P(funciona) = ${total - broken}/${total} = ${fmt((total - broken) / total)}.`, `${fmt(((total - broken) / total) * 100)}%.`],
          ["Cuenta los que funcionan.", "Divide entre el total.", "Multiplica por 100."],
          {
            intent: "transfer",
            unit: "%",
            errors: [{ value: (broken / total) * 100, feedback: "Esa es la probabilidad de que esté averiado." }],
          },
        ),
        n(
          "q6",
          `Una bolsa tiene ${r2} fichas rojas, ${b2} azules y ${g2} verdes. ¿Cuántas fichas verdes hay que añadir para que la probabilidad de sacar verde sea 1/2?`,
          r2 + b2 - g2,
          [`Para P(verde) = 1/2, las verdes deben ser tantas como las demás: ${r2 + b2}.`, `Hay que añadir ${r2 + b2} − ${g2} = ${r2 + b2 - g2}.`],
          ["P = 1/2 significa que la mitad de las fichas son verdes.", `Las no verdes son ${r2 + b2}.`, "Iguala las verdes a las no verdes."],
          {
            intent: "transfer",
            unit: "fichas",
            errors: [{ value: (r2 + b2 + g2) / 2 - g2, feedback: "Al añadir fichas, el total también cambia: compara verdes con no verdes." }].filter((e) => e.value !== r2 + b2 - g2),
          },
        ),
      ];
    },
    application: n(
      "app",
      "Un lote tiene 50 baterías: 35 buenas, 10 con carga baja y 5 defectuosas. Se elige una al azar. ¿Qué probabilidad hay de que se pueda usar (buena o con carga baja)? Escríbela en decimal.",
      0.9,
      ["Favorables: 35 + 10 = 45.", "P = 45/50 = 0,9.", "También: 1 − 5/50 = 0,9."],
      ["Cuenta las baterías que se pueden usar.", "Divide entre 50.", "O resta de 1 la probabilidad de defectuosa."],
      {
        intent: "transfer",
        errors: [
          { value: 0.7, feedback: "Solo contaste las buenas: las de carga baja también se pueden usar." },
          { value: 0.1, feedback: "Esa es la probabilidad de defectuosa." },
        ],
      },
    ),
    outcome: "Puedes estimar con números qué tan probable es encontrar un componente averiado.",
    commonErrors: [
      "Dividir favorables entre desfavorables.",
      "Creer que un resultado «toca» después de una racha.",
      "Aplicar la regla de Laplace con resultados no equiprobables.",
    ],
  }),
  defineLesson({
    id: "probabilidad-compuesta",
    unitId: "datos",
    title: "Experimentos compuestos",
    objective:
      "Contar los resultados de experimentos de dos etapas con tablas o diagramas y calcular probabilidades de sucesos compuestos.",
    purpose:
      "Una ruta pasa por dos semáforos y dos centrales pueden fallar a la vez. Para estimar esas situaciones hay que combinar probabilidades.",
    prerequisites: ["probabilidad-simple", "fracciones-producto-cociente"],
    legacyModuleIds: ["medicion-d10", "medicion-d9"],
    visual: "tree",
    vocabulary: [
      { term: "Espacio muestral", meaning: "Conjunto de todos los resultados posibles." },
      { term: "Sucesos independientes", meaning: "El resultado de uno no cambia la probabilidad del otro." },
    ],
    sections: [
      {
        title: "Contar con una tabla",
        paragraphs: [
          "Al lanzar dos dados hay 6 × 6 = 36 resultados igual de probables. Una tabla de doble entrada los muestra todos.",
          "Sumar 7 ocurre en 6 casillas: (1, 6), (2, 5), (3, 4), (4, 3), (5, 2), (6, 1). P(suma 7) = 6/36 = 1/6.",
        ],
        formula: "resultados = 6 × 6 = 36",
      },
      {
        title: "Multiplicar para «y»",
        paragraphs: [
          "Si dos sucesos son independientes, la probabilidad de que ocurran ambos es el producto: P(cara y cara) = 1/2 × 1/2 = 1/4.",
          "Tiene sentido: de los 4 resultados posibles (CC, CX, XC, XX), solo uno es cara-cara.",
        ],
        formula: "P(A y B) = P(A) × P(B), si son independientes",
      },
      {
        title: "«Al menos uno» con el complemento",
        paragraphs: [
          "P(al menos una cara en dos lanzamientos) = 1 − P(ninguna) = 1 − 1/4 = 3/4.",
          "Con extracciones sin reemplazo, la segunda probabilidad cambia: de 3 rojas y 2 azules, sacar dos rojas seguidas es 3/5 × 2/4 = 3/10.",
        ],
        formula: "P(al menos uno) = 1 − P(ninguno)",
      },
    ],
    examples: [
      ex("Dos semáforos independientes están en verde con probabilidad 0,6 y 0,5. ¿Probabilidad de pasar ambos en verde?", [
        ["P = 0,6 × 0,5", "Ambos deben ocurrir y son independientes."],
        ["= 0,3", "Multiplicamos las dos probabilidades."],
        ["30%", "Ocurre en 3 de cada 10 trayectos."],
      ], "P(ambos verdes) = 0,3."),
      ex("De una bolsa con 3 rojas y 2 azules se sacan dos fichas sin devolver. ¿Probabilidad de dos rojas?", [
        ["P(1.ª roja) = 3/5", "Hay 3 rojas de 5."],
        ["P(2.ª roja | 1.ª roja) = 2/4", "Queda una roja menos y una ficha menos."],
        ["3/5 × 2/4 = 6/20 = 3/10", "Multiplicamos las etapas."],
      ], "Sin reemplazo, la segunda etapa depende de la primera."),
    ],
    diagnostic: [
      n("d-1", "¿Cuánto es 1/2 × 1/3?", 1 / 6, ["(1 × 1)/(2 × 3) = 1/6."], ["Multiplica numeradores.", "Multiplica denominadores.", "1/6."]),
      c("d-2", "Al lanzar un dado, P(sacar 6) es…", ["1/6", "1/2", "6"], 0, "Un caso favorable entre seis posibles."),
      n("d-3", "¿Cuánto es 1 − 3/8?", 5 / 8, ["8/8 − 3/8 = 5/8."], ["Escribe 1 como 8/8.", "Resta numeradores.", "5/8."]),
    ],
    questions(v) {
      const target = [7, 6, 8, 5, 9, 10][v],
        ways = { 7: 6, 6: 5, 8: 5, 5: 4, 9: 4, 10: 3 }[target]!,
        [pa, pb] = [[0.6, 0.5], [0.8, 0.5], [0.7, 0.4], [0.9, 0.6], [0.5, 0.3], [0.75, 0.8]][v],
        [rr, bb] = [[3, 2], [4, 2], [5, 3], [2, 3], [4, 4], [6, 2]][v],
        tries = [2, 3, 2, 3, 2, 3][v],
        fail = [0.1, 0.2, 0.05, 0.15, 0.3, 0.25][v];
      const both = Math.round(pa * pb * 1000) / 1000;
      return [
        v % 2 === 0
          ? c(
              "q0",
              "¿Por qué al lanzar dos dados hay 36 resultados posibles?",
              [
                "Porque cada uno de los 6 resultados del primer dado se combina con los 6 del segundo",
                ["Porque 6 + 6 = 12 y se multiplica por 3", "No: se combinan todas las parejas, 6 × 6."],
                ["Porque las sumas van de 1 a 36", "Las sumas van de 2 a 12."],
              ],
              0,
              "En un experimento de dos etapas se combinan todos los resultados: 6 × 6.",
            )
          : c(
              "q0",
              "¿Por qué P(cara y cara) = 1/2 × 1/2?",
              [
                ["Porque se suman las probabilidades", "Sumar daría 1: no puede ser seguro sacar dos caras."],
                "Porque de los 4 resultados equiprobables (CC, CX, XC, XX), solo uno es CC",
                ["Porque las monedas dependen una de otra", "Son independientes; por eso se multiplica."],
              ],
              1,
              "Para sucesos independientes, P(A y B) = P(A) × P(B).",
            ),
        n(
          "q1",
          `Se lanzan dos dados. ¿Cuál es la probabilidad de que la suma sea ${target}?`,
          ways / 36,
          [`Casos con suma ${target} → ${ways}.`, `P = ${ways}/36 = ${fmt(ways / 36)}.`],
          ["Haz una tabla de 6 × 6.", `Marca las casillas que suman ${target}.`, `Divide entre 36.`],
          { errors: [{ value: 1 / 11, feedback: "Las 11 sumas posibles no son igual de probables: cuenta casillas en la tabla de 36." }] },
        ),
        n(
          "q2",
          `Completa: dos sucesos independientes tienen probabilidades ${fmt(pa)} y ${fmt(pb)}; P(ambos) = ${fmt(pa)} × ${fmt(pb)} = __.`,
          both,
          [`${fmt(pa)} × ${fmt(pb)} = ${fmt(both)}.`],
          ["«Ambos» con sucesos independientes: se multiplica.", `${fmt(pa)} × ${fmt(pb)}.`, `${fmt(both)}.`],
          { step: true, errors: [{ value: pa + pb, feedback: "Sumaste; para que ocurran ambos se multiplica." }] },
        ),
        n(
          "q3",
          `Una bolsa tiene ${rr} fichas rojas y ${bb} azules. Se sacan dos sin devolver. ¿Cuál es la probabilidad de que ambas sean rojas?`,
          (rr / (rr + bb)) * ((rr - 1) / (rr + bb - 1)),
          [`1.ª: ${rr}/${rr + bb}. 2.ª: ${rr - 1}/${rr + bb - 1}.`, `P = ${rr}/${rr + bb} × ${rr - 1}/${rr + bb - 1} = ${fmt((rr / (rr + bb)) * ((rr - 1) / (rr + bb - 1)))}.`],
          ["Sin devolver, cambian las fichas en la segunda extracción.", "Queda una roja menos y una ficha menos.", "Multiplica las dos probabilidades."],
          { errors: [{ value: (rr / (rr + bb)) ** 2, feedback: "Eso sería con reemplazo. Sin devolver, la segunda probabilidad cambia." }] },
        ),
        c(
          "q4",
          "Alguien dice que la probabilidad de sacar al menos una cara en dos lanzamientos es 1/2 + 1/2 = 1. ¿Qué falla?",
          [
            ["Nada: es seguro", "Puede salir cruz-cruz, así que no es seguro."],
            ["Debía multiplicar: 1/4", "1/4 es la probabilidad de dos caras."],
            "Sumar cuenta dos veces el caso cara-cara; se calcula 1 − P(ninguna) = 3/4",
          ],
          2,
          "Para «al menos uno», conviene restar de 1 la probabilidad de ninguno.",
        ),
        n(
          "q5",
          `Dos semáforos independientes están en verde con probabilidades ${fmt(pa)} y ${fmt(pb)}. ¿Cuál es la probabilidad de encontrar los dos en verde?`,
          both,
          [`P = ${fmt(pa)} × ${fmt(pb)} = ${fmt(both)}.`],
          ["Deben ocurrir ambos.", "Son independientes.", "Multiplica."],
          { intent: "transfer", errors: [{ value: pa + pb, feedback: "Sumar no sirve para «ambos»: se multiplica." }] },
        ),
        n(
          "q6",
          `Una central falla un día con probabilidad ${fmt(fail)}, de forma independiente cada día. ¿Cuál es la probabilidad de que falle al menos una vez en ${tries} días?`,
          Math.round((1 - (1 - fail) ** tries) * 100000) / 100000,
          [`P(no falla ningún día) = ${fmt(1 - fail)} elevado a ${tries} = ${fmt((1 - fail) ** tries)}.`, `P(al menos un fallo) = 1 − ${fmt((1 - fail) ** tries)} = ${fmt(1 - (1 - fail) ** tries)}.`],
          ["«Al menos una vez» es el complemento de «ninguna vez».", `Calcula ${fmt(1 - fail)} elevado a ${tries}.`, "Resta de 1."],
          {
            intent: "transfer",
            errors: [{ value: Math.round(fail * tries * 100000) / 100000, feedback: "Sumar las probabilidades cuenta dos veces los días con más de un fallo: usa el complemento." }],
          },
        ),
      ];
    },
    application: n(
      "app",
      "Un mensaje de emergencia se envía por dos redes independientes. La red A falla con probabilidad 0,2 y la B con 0,3. ¿Cuál es la probabilidad de que el mensaje llegue por al menos una red?",
      0.94,
      ["No llega si fallan ambas: 0,2 × 0,3 = 0,06.", "Llega por al menos una: 1 − 0,06 = 0,94."],
      ["¿Cuándo no llega el mensaje?", "Multiplica las probabilidades de fallo.", "Resta de 1."],
      {
        intent: "transfer",
        errors: [
          { value: 0.56, feedback: "0,8 × 0,7 es la probabilidad de que lleguen por ambas. Basta con una." },
          { value: 0.06, feedback: "Esa es la probabilidad de que fallen las dos." },
        ],
      },
    ),
    outcome: "Puedes estimar la fiabilidad de sistemas con varias partes que pueden fallar.",
    commonErrors: [
      "Sumar probabilidades cuando deben ocurrir ambos sucesos.",
      "Tratar como equiprobables las sumas de dos dados.",
      "Olvidar que sin reemplazo cambia la segunda probabilidad.",
    ],
  }),
];
