import { errorFollowup } from "./errorFollowup";
import { defineLesson } from "./defineLesson";
import { choice as c, example as ex, numeric as n } from "./questions";
import { dec, frac } from "./topicHelpers";
import type { Lesson } from "./types";
import { fig, type Figure } from "./figures";

/** Tablas de frecuencias y gráficos estadísticos (ver `numberTopics.ts`). */

const siblings = (k: number) => (k === 1 ? "hermano" : "hermanos");
/** «0 (4), 1 (10), …»: valores con su frecuencia absoluta. */
const table = (counts: number[]) =>
  `En una encuesta sobre el número de hermanos, cada valor apareció estas veces → ${counts.map((f, k) => `${k} ${siblings(k)} (${f})`).join(", ")}.`;
/** La misma encuesta como tabla de frecuencias absolutas. */
const siblingsTable = (counts: number[]): Figure => ({
  kind: "table",
  caption: "Número de hermanos",
  head: ["Hermanos", "Estudiantes (fᵢ)"],
  rows: counts.map((f, k) => [k, f]),
});
/** Gráfico circular de un sector y el resto. */
const pie = (label: string, value: number, text: string, rest: number, restText?: string): Figure => ({
  kind: "chart",
  type: "pie",
  data: [
    { label, value, text },
    { label: "Resto", value: rest, ...(restText ? { text: restText } : {}) },
  ],
});

export const STATISTICS_LESSONS: Lesson[] = [
  defineLesson({
    id: "tablas-frecuencia",
    unitId: "datos",
    title: "Tablas de frecuencias",
    objective: "Organizar datos en tablas de frecuencias absolutas, relativas, porcentuales y acumuladas, e interpretar cada columna.",
    purpose:
      "Una encuesta de 200 respuestas no se entiende leyéndolas una por una. La tabla de frecuencias resume cuántas veces aparece cada valor y qué parte del total representa.",
    prerequisites: ["fraccion-decimal-porcentaje"],
    legacyModuleIds: [],
    visual: "frequency",
    vocabulary: [
      { term: "Frecuencia absoluta", meaning: "Cuántas veces aparece un valor en los datos (fᵢ)." },
      { term: "Frecuencia relativa", meaning: "Frecuencia absoluta dividida entre el total de datos (hᵢ): qué parte del total es." },
      { term: "Frecuencia porcentual", meaning: "Frecuencia relativa multiplicada por 100." },
      { term: "Frecuencia acumulada", meaning: "Suma de las frecuencias absolutas hasta un valor (Fᵢ): cuántos datos son menores o iguales." },
    ],
    sections: [
      {
        title: "Contar cada valor",
        paragraphs: [
          "La frecuencia absoluta de un valor es cuántas veces aparece. Al sumar todas las frecuencias absolutas se obtiene el total de datos, n.",
          "Para no perder ninguno conviene recorrer los datos una sola vez y marcar cada uno en su fila.",
        ],
        formula: "f₁ + f₂ + … + fₖ = n",
      },
      {
        title: "Relativa y porcentual",
        paragraphs: [
          "La frecuencia relativa es la parte del total: hᵢ = fᵢ ÷ n. Las frecuencias relativas de una tabla suman 1.",
          "Multiplicada por 100 es la frecuencia porcentual. Si 6 de 24 estudiantes eligen fútbol, la frecuencia relativa es 6 ÷ 24 = 0,25 y el porcentaje es 25 %.",
        ],
        formula: "hᵢ = fᵢ ÷ n;  porcentaje = hᵢ × 100",
      },
      {
        title: "Frecuencia acumulada",
        paragraphs: [
          "Cuando los valores tienen un orden (notas, edades, número de hermanos), la frecuencia acumulada suma las frecuencias hasta ese valor: cuántos datos son menores o iguales que él.",
          "La última frecuencia acumulada siempre es n. Con ella se responde rápido «¿cuántos tienen 2 hermanos o menos?».",
        ],
        formula: "Fᵢ = f₁ + f₂ + … + fᵢ",
      },
    ],
    examples: [
      ex(
        "Se preguntó a 20 estudiantes cuántas mascotas tienen: 0, 1, 2, 1, 0, 3, 1, 2, 1, 0, 1, 2, 0, 1, 4, 1, 2, 0, 1, 2. Haz la tabla de frecuencias.",
        [
          ["0 → 5;  1 → 8;  2 → 5;  3 → 1;  4 → 1", "Contamos cuántas veces aparece cada valor."],
          ["5 + 8 + 5 + 1 + 1 = 20", "Comprobamos que las frecuencias suman el total de estudiantes."],
          ["8 ÷ 20 = 0,4 → 40 %", "El valor más frecuente, 1 mascota, es el 40 % de las respuestas."],
        ],
        "La tabla muestra de un vistazo que la mayoría tiene una mascota o ninguna → 5 + 8 = 13 de 20, el 65 %.",
      ),
      ex(
        "Con la tabla anterior, ¿cuántos estudiantes tienen 2 mascotas o menos?",
        [
          ["5 + 8 + 5", "La frecuencia acumulada hasta 2 suma las de 0, 1 y 2."],
          ["18 estudiantes", "Hay 18 estudiantes con 2 mascotas o menos."],
          ["18 ÷ 20 = 0,9 → 90 %", "Solo 2 estudiantes, el 10 %, tienen más de 2."],
        ],
        "La frecuencia acumulada responde preguntas de tipo «o menos» sin volver a contar.",
      ),
    ],
    diagnostic: [
      n("d-1", "¿Qué porcentaje es 0,35?", 35, ["Un porcentaje expresa una cantidad por cada 100.", "Se multiplica por 100 → 0,35 × 100 = 35 %."], ["Multiplica por 100.", "0,35 × 100.", "Es 35."], { unit: "%" }),
      n("d-2", "¿Cuánto es 9 ÷ 30? Responde con un decimal.", 0.3, ["9 ÷ 30 es la fracción 9/30, que se simplifica dividiendo entre 3.", "Queda 3/10, que en decimal es 0,3."], ["Simplifica la fracción 9/30.", "Divide arriba y abajo entre 3.", "3/10 es 0,3."]),
      c("d-3", "En la lista 2, 3, 2, 5, 2, ¿cuántas veces aparece el 2?", ["2", "3", "5"], 1, "El 2 aparece en la primera, la tercera y la quinta posición: 3 veces."),
    ],
    practiceCorrection: errorFollowup("Una tabla registra 2 personas con 0 hermanos, 4 con 1 y 3 con 2. ¿Cuál es la frecuencia acumulada hasta 2 hermanos?", 9, "La frecuencia acumulada hasta 2 incluye las frecuencias de 0, 1 y 2 hermanos.", "Sumamos 2 + 4 + 3 = 9 personas; no usamos solo la última frecuencia."),
    questions(v) {
      const counts = [[4, 10, 8, 2, 1], [6, 9, 3, 1, 1], [5, 12, 6, 4, 3], [8, 16, 10, 4, 2], [2, 7, 6, 3, 2], [10, 20, 12, 6, 2]][v];
      const total = counts.reduce((a, b) => a + b, 0);
      const [k1, k3, kAcc] = [[1, 2, 1], [0, 1, 2], [2, 1, 1], [1, 2, 2], [3, 1, 1], [2, 0, 2]][v];
      const acc = (k: number) => counts.slice(0, k + 1).reduce((a, b) => a + b, 0);
      const kErr = [2, 2, 2, 1, 2, 1][v];
      const [N6, p6] = [[40, 35], [60, 25], [80, 15], [50, 22], [120, 30], [200, 12]][v];
      const concept = [
        fig(c(
          "q0",
          `En una tabla de frecuencias con ${total} datos, ¿cuánto suman las frecuencias relativas?`,
          [[`${total}`, `${total} es la suma de las frecuencias absolutas.`], "1, porque juntas forman el total", ["100", "100 es la suma de los porcentajes; las frecuencias relativas suman 1."]],
          1,
          `Cada frecuencia relativa es fᵢ ÷ ${total}; al sumarlas se obtiene ${total} ÷ ${total} = 1.`,
        ), siblingsTable(counts)),
        fig(c(
          "q0",
          `Si ${counts[1]} de ${total} estudiantes tienen 1 hermano, ¿qué indica la frecuencia relativa ${counts[1]}/${total}?`,
          [
            ["Cuántos estudiantes tienen 1 hermano", `Eso es la frecuencia absoluta, ${counts[1]}.`],
            ["Cuántos estudiantes hay en total", `El total es ${total}.`],
            "Qué parte del total tiene 1 hermano",
          ],
          2,
          `${counts[1]}/${total} = ${dec(counts[1] / total)}: el ${dec((counts[1] / total) * 100)} % de los estudiantes.`,
        ), siblingsTable(counts)),
        fig(c(
          "q0",
          `¿Por qué la última frecuencia acumulada de una tabla con ${total} datos siempre vale ${total}?`,
          [
            "Porque acumula las frecuencias de todos los valores, es decir, todos los datos",
            ["Porque es la frecuencia del valor más alto", "La frecuencia de ese valor puede ser pequeña; la acumulada suma todas las anteriores."],
            ["Porque es la moda", "La moda es el valor más frecuente, no una suma acumulada."],
          ],
          0,
          `Al llegar al último valor ya se sumaron todas las filas: ${counts.join(" + ")} = ${total}.`,
        ), siblingsTable(counts)),
      ][v % 3];
      const h1 = counts[k1] / total;
      const h3 = counts[k3] / total;
      return [
        concept,
        fig(n(
          "q1",
          `${table(counts)} ¿Cuál es la frecuencia relativa de ${k1} ${siblings(k1)}? Responde con un decimal.`,
          h1,
          [`El total es ${counts.join(" + ")} = ${total}.`, `La frecuencia relativa es ${counts[k1]} ÷ ${total} = ${dec(h1)}, es decir, el ${dec(h1 * 100)} % de los estudiantes.`],
          ["Primero calcula el total de datos.", `El total es ${total}.`, `Divide ${counts[k1]} entre ${total}.`],
          { errors: [{ value: counts[k1], feedback: "Esa es la frecuencia absoluta; la relativa la divide entre el total." }] },
        ), siblingsTable(counts)),
        fig(n(
          "q2",
          `${table(counts)} Primer paso para cualquier frecuencia relativa → ¿cuántos estudiantes respondieron en total?`,
          total,
          ["El total es la suma de todas las frecuencias absolutas.", `${counts.join(" + ")} = ${total} estudiantes.`],
          ["Suma las frecuencias de todos los valores.", `${counts[0]} + ${counts[1]} = ${counts[0] + counts[1]}…`, `Sigue sumando hasta ${counts.length} valores.`],
          { step: true, errors: [{ value: counts.length, feedback: "Contaste los valores distintos; hay que sumar cuántos estudiantes respondió cada uno." }] },
        ), siblingsTable(counts)),
        fig(n(
          "q3",
          `${table(counts)} ¿Qué porcentaje de los estudiantes tiene ${k3} ${siblings(k3)}?`,
          r100(h3 * 100),
          [`La frecuencia relativa es ${counts[k3]} ÷ ${total} = ${dec(h3)}.`, `${dec(h3)} × 100 = ${dec(h3 * 100)} %.`],
          ["Calcula primero la frecuencia relativa.", `${counts[k3]} ÷ ${total}.`, "Multiplica por 100."],
          { unit: "%", errors: [{ value: counts[k3], feedback: "Esa es la frecuencia absoluta: falta compararla con el total." }].filter((e) => e.value !== r100(h3 * 100)) },
        ), siblingsTable(counts)),
        fig(c(
          "q4",
          `${table(counts)} Alguien dice que la frecuencia acumulada de ${kErr} ${siblings(kErr)} es ${counts[kErr]}. ¿Qué error cometió?`,
          [
            ["Ninguno: es correcta", `${counts[kErr]} son solo los que tienen exactamente ${kErr} ${siblings(kErr)}.`],
            [`Debió dividir entre ${total}`, "Dividir entre el total da la frecuencia relativa, no la acumulada."],
            `Dio la frecuencia absoluta; la acumulada suma desde 0 hasta ${kErr} y vale ${acc(kErr)}`,
          ],
          2,
          `F(${kErr}) = ${counts.slice(0, kErr + 1).join(" + ")} = ${acc(kErr)}.`,
        ), siblingsTable(counts)),
        fig(n(
          "q5",
          `${table(counts)} ¿Cuántos estudiantes tienen ${kAcc} ${siblings(kAcc)} o menos?`,
          acc(kAcc),
          [`Se suman las frecuencias desde 0 hasta ${kAcc} → ${counts.slice(0, kAcc + 1).join(" + ")}.`, `${counts.slice(0, kAcc + 1).join(" + ")} = ${acc(kAcc)} estudiantes: es la frecuencia acumulada.`],
          ["«O menos» incluye todos los valores hasta ese.", `Suma las frecuencias de 0 a ${kAcc}.`, `${counts.slice(0, kAcc + 1).join(" + ")}.`],
          { intent: "transfer", errors: [{ value: counts[kAcc], feedback: `Contaste solo los que tienen exactamente ${kAcc}; faltan los que tienen menos.` }] },
        ), siblingsTable(counts)),
        n(
          "q6",
          `En otra encuesta a ${N6} personas, el ${p6} % eligió la opción A. ¿Cuántas personas eligieron A?`,
          (N6 * p6) / 100,
          [`La frecuencia relativa es ${p6} ÷ 100 = ${dec(p6 / 100)}.`, `La frecuencia absoluta es ${dec(p6 / 100)} × ${N6} = ${dec((N6 * p6) / 100)} personas.`],
          ["Pasa el porcentaje a frecuencia relativa.", `${p6} % es ${dec(p6 / 100)}.`, `Multiplica por ${N6}.`],
          { intent: "transfer", unit: "personas", errors: [{ value: p6, feedback: "Ese es el porcentaje; hay que aplicarlo al total de personas." }] },
        ),
      ];
    },
    outcome: "Puedes construir e interpretar una tabla de frecuencias absolutas, relativas, porcentuales y acumuladas.",
    commonErrors: [
      "Confundir la frecuencia absoluta (cuántos) con la relativa (qué parte).",
      "Dividir entre el número de valores distintos en vez del total de datos.",
      "Usar la frecuencia acumulada con datos que no tienen orden.",
      "No comprobar que las frecuencias suman el total.",
    ],
    application: fig(n(
      "aplicacion",
      "En un aula, la frecuencia relativa de quienes llegan en bus es 0,45 y la de quienes caminan es 0,35; el resto llega en bicicleta. Si 6 estudiantes llegan en bicicleta, ¿cuántos estudiantes hay en el aula?",
      30,
      ["Las frecuencias relativas suman 1, así que la de bicicleta es 1 − 0,45 − 0,35 = 0,2.", "6 estudiantes son 0,2 del total, así que el total es 6 ÷ 0,2 = 30 estudiantes."],
      ["Las frecuencias relativas suman 1.", "Calcula la de bicicleta.", "6 es esa parte del total."],
      { intent: "transfer", unit: "estudiantes" },
    ), { kind: "table", head: ["Medio", "Frecuencia relativa"], rows: [["Bus", "0,45"], ["Caminando", "0,35"], ["Bicicleta", "?"]], rowHeads: true }),
  }),

  defineLesson({
    id: "graficos-estadisticos",
    unitId: "datos",
    title: "Gráficos de barras, pictogramas y gráficos circulares",
    objective:
      "Leer e interpretar gráficos de barras, pictogramas y gráficos circulares, calcular el ángulo de cada sector y elegir el gráfico adecuado para un conjunto de datos.",
    purpose:
      "Las noticias, los recibos y los informes del colegio muestran datos en gráficos. Leerlos bien, y darse cuenta cuando un gráfico exagera, es parte de decidir con información.",
    prerequisites: ["tablas-frecuencia"],
    legacyModuleIds: [],
    visual: "frequency",
    vocabulary: [
      { term: "Gráfico de barras", meaning: "Gráfico en el que la altura de cada barra es la frecuencia de una categoría." },
      { term: "Pictograma", meaning: "Gráfico con íconos en el que cada ícono representa una cantidad fija, indicada en la clave." },
      { term: "Gráfico circular", meaning: "Círculo dividido en sectores proporcionales a las frecuencias: muestra partes de un todo." },
      { term: "Escala del eje", meaning: "Valores marcados en el eje de un gráfico; si no empieza en 0, las diferencias se ven exageradas." },
    ],
    sections: [
      {
        title: "Barras: comparar cantidades",
        paragraphs: [
          "En un gráfico de barras, la altura de cada barra es la frecuencia de su categoría. Sirve para comparar categorías entre sí.",
          "Mira siempre la escala del eje: si no empieza en 0, las diferencias entre barras parecen más grandes de lo que son.",
        ],
        formula: "altura de la barra → frecuencia",
      },
      {
        title: "Pictogramas: leer la clave",
        paragraphs: [
          "En un pictograma cada ícono vale la cantidad que indica la clave. Si cada ícono vale 4 frutas, tres íconos y medio son 3,5 × 4 = 14 frutas.",
          "Antes de contar íconos, busca cuánto vale cada uno.",
        ],
        formula: "cantidad = número de íconos × valor de cada ícono",
      },
      {
        title: "Gráfico circular: partes de un todo",
        paragraphs: [
          "Un gráfico circular muestra qué parte del total es cada categoría. El ángulo de un sector es su frecuencia relativa por 360°.",
          "Si el 25 % elige fútbol, su sector mide 0,25 × 360° = 90°. Los ángulos de todos los sectores suman 360°.",
        ],
        formula: "ángulo del sector = hᵢ × 360°",
      },
    ],
    examples: [
      ex(
        "En una encuesta a 40 estudiantes, 10 prefieren matemática. ¿Qué ángulo tiene su sector en un gráfico circular?",
        [
          ["10 ÷ 40 = 0,25", "Primero la frecuencia relativa: qué parte del total es."],
          ["0,25 × 360° = 90°", "El sector ocupa esa misma parte de la vuelta completa."],
          ["90°, un cuarto del círculo", "Comprobación → 10 de 40 es un cuarto, y un cuarto de 360° es 90°."],
        ],
        "El sector de matemática mide 90°.",
      ),
      ex(
        "En un pictograma, cada ícono representa 4 bicicletas vendidas. El lunes hay 4 íconos y medio. ¿Cuántas bicicletas se vendieron?",
        [
          ["4 íconos y medio → 4,5", "Contamos los íconos completos y la mitad."],
          ["4,5 × 4 = 18", "Cada ícono vale 4: multiplicamos."],
          ["18 bicicletas", "El medio ícono vale 2 bicicletas, la mitad de 4."],
        ],
        "Se vendieron 18 bicicletas. Sin la clave, contar íconos daría solo 4,5.",
      ),
    ],
    diagnostic: [
      fig(n("d-1", "¿Qué parte de 360° son 90°? Responde con una fracción.", 1 / 4, ["90° caben 4 veces en la vuelta completa, porque 90 × 4 = 360.", "Por eso 90° son 1/4 de 360°."], ["¿Cuántas veces cabe 90 en 360?", "Cabe 4 veces.", "Es un cuarto."]), pie("Sector", 90, "90°", 270)),
      n("d-2", "¿Cuánto es 0,3 × 360?", 108, ["0,3 × 360 es el 30 % de 360.", "360 × 3 ÷ 10 = 108."], ["Multiplica 360 por 3.", "1080.", "Divide entre 10."]),
      c("d-3", "En una tabla, 8 de 32 estudiantes eligen rojo. ¿Qué porcentaje es?", ["8 %", "25 %", "32 %"], 1, "8/32 = 1/4, que es el 25 %."),
    ],
    practiceCorrection: errorFollowup("Un gráfico circular tiene dos sectores de 90° y 150°. ¿Cuántos grados debe medir el tercer sector?", 120, "Los sectores de un gráfico circular completo suman 360 grados.", "Restamos los ángulos conocidos: 360 − 90 − 150 = 120 grados."),
    questions(v) {
      const n0 = [40, 60, 30, 72, 50, 36][v];
      const start = v === 1 ? 50 : 80;
      const icon = v === 2 ? 5 : 20;
      const concept = [
        c(
          "q0",
          `Para mostrar qué parte de los ${n0} encuestados eligió cada opción, ¿qué gráfico es el más adecuado?`,
          [
            ["Un gráfico de líneas", "Las líneas muestran cambios en el tiempo, no partes de un total."],
            "Un gráfico circular, porque muestra partes de un todo",
            ["Una tabla sin gráfico", "La tabla informa, pero no muestra a simple vista la proporción de cada parte."],
          ],
          1,
          "Cuando interesa la parte de un total, el gráfico circular la muestra como el tamaño de cada sector.",
        ),
        c(
          "q0",
          `En un gráfico de barras, el eje vertical empieza en ${start} en lugar de 0. ¿Qué efecto tiene?`,
          [
            "Las diferencias entre las barras parecen más grandes de lo que son",
            ["Ninguno: las barras se leen igual", "Los valores se leen igual, pero la comparación visual engaña."],
            ["Las barras parecen más parecidas", "Al recortar la base, las diferencias se exageran, no se reducen."],
          ],
          0,
          `Al quitar todo lo que está por debajo de ${start}, una diferencia pequeña ocupa casi toda la altura de la barra.`,
        ),
        c(
          "q0",
          `En un pictograma, cada ícono vale ${icon}. ¿Por qué hay que leer la clave antes de contar?`,
          [
            ["Porque los íconos siempre valen 10", "El valor depende de cada gráfico: lo indica la clave."],
            ["No hace falta: se cuentan los íconos", `Contar íconos sin multiplicar por ${icon} da una cantidad ${icon} veces menor.`],
            `Porque cada ícono vale ${icon} unidades, no 1`,
          ],
          2,
          `La cantidad es el número de íconos por ${icon}.`,
        ),
      ][v % 3];

      const [N1, f1] = [[40, 10], [80, 28], [30, 6], [72, 18], [50, 15], [25, 5]][v];
      const ang1 = (f1 / N1) * 360;
      const [N2, f2] = [[20, 5], [50, 10], [40, 14], [25, 4], [80, 20], [60, 9]][v];
      const [k3, c3] = [[4, 3], [10, 5], [6, 2], [8, 4], [2, 7], [20, 3]][v];
      const [s1, s2, s3] = [[120, 150, 100], [90, 180, 80], [200, 100, 50], [150, 150, 90], [100, 100, 100], [60, 240, 70]][v];
      const [N5, ang5] = [[40, 90], [60, 120], [30, 72], [80, 45], [90, 80], [120, 30]][v];
      const cat5 = ["vóley", "arte", "música", "ajedrez", "danza", "teatro"][v];
      const ang6 = [90, 72, 54, 126, 180, 36][v];
      return [
        concept,
        fig(n(
          "q1",
          `En una encuesta a ${N1} personas, ${f1} eligieron la opción A. ¿Cuántos grados mide su sector en un gráfico circular?`,
          ang1,
          [`La frecuencia relativa es ${f1} ÷ ${N1} = ${dec(f1 / N1)}.`, `El ángulo es ${dec(f1 / N1)} × 360 = ${dec(ang1)}°.`],
          ["Calcula qué parte del total eligió A.", `${f1} ÷ ${N1}.`, "Multiplica por 360°."],
          { unit: "°", errors: [{ value: (f1 / N1) * 100, feedback: "Ese es el porcentaje; el ángulo es esa parte de 360°." }] },
        ), pie("A", f1, `${f1} personas`, N1 - f1, `${N1 - f1} personas`)),
        fig(n(
          "q2",
          `En una encuesta a ${N2} personas, ${f2} eligieron la opción B. Primer paso para dibujar su sector → ¿cuál es su frecuencia relativa? Responde con un decimal.`,
          f2 / N2,
          [`La frecuencia relativa compara la parte con el total → ${f2} ÷ ${N2}.`, `${f2} ÷ ${N2} = ${dec(f2 / N2)}; el sector medirá ${dec(f2 / N2)} × 360 = ${dec((f2 / N2) * 360)}°.`],
          ["Divide la frecuencia entre el total.", `${f2} ÷ ${N2}.`, "Escribe el resultado como decimal."],
          { step: true, errors: [{ value: (f2 / N2) * 100, feedback: "Ese es el porcentaje; la frecuencia relativa es un número entre 0 y 1." }] },
        ), pie("B", f2, `${f2} personas`, N2 - f2, `${N2 - f2} personas`)),
        fig(n(
          "q3",
          `En un pictograma, cada ícono representa ${k3} libros. La fila de marzo tiene ${c3} íconos y medio. ¿Cuántos libros se leyeron en marzo?`,
          (c3 + 0.5) * k3,
          [`${c3} íconos y medio son ${dec(c3 + 0.5)} íconos.`, `${dec(c3 + 0.5)} × ${k3} = ${dec((c3 + 0.5) * k3)} libros, porque cada ícono vale ${k3}.`],
          ["Mira cuánto vale cada ícono.", `Medio ícono vale ${dec(k3 / 2)}.`, `Multiplica ${dec(c3 + 0.5)} × ${k3}.`],
          {
            unit: "libros",
            errors: [
              { value: c3 * k3, feedback: `Falta el medio ícono, que vale ${dec(k3 / 2)}.` },
              { value: c3 + 0.5, feedback: "Contaste íconos: hay que multiplicar por lo que vale cada uno." },
            ],
          },
        ), { kind: "chart", type: "picto", title: "Libros leídos", data: [{ label: "Marzo", value: c3 + 0.5 }], unit: `${k3} libros` }),
        c(
          "q4",
          `Un gráfico circular tiene sectores de ${s1}°, ${s2}° y ${s3}°. ¿Qué error tiene?`,
          [
            ["Ninguno", `${s1}° + ${s2}° + ${s3}° = ${s1 + s2 + s3}°: no completa exactamente la vuelta.`],
            `Sus ángulos suman ${s1 + s2 + s3}°, y deben sumar 360°`,
            ["Un sector no puede pasar de 90°", "Un sector puede medir hasta 360°: uno de 180° es medio círculo."],
          ],
          1,
          "Los sectores representan el total de los datos, así que sus ángulos suman exactamente una vuelta, 360°.",
        ),
        fig(n(
          "q5",
          `En un gráfico circular sobre ${N5} estudiantes, el sector de ${cat5} mide ${ang5}°. ¿Cuántos estudiantes eligieron ${cat5}?`,
          (ang5 / 360) * N5,
          [`El sector es ${ang5}/360 = ${frac(ang5, 360)} del círculo.`, `${frac(ang5, 360)} × ${N5} = ${dec((ang5 / 360) * N5)} estudiantes.`],
          ["Calcula qué parte del círculo es el sector.", `${ang5}/360.`, `Toma esa parte de ${N5}.`],
          { intent: "transfer", unit: "estudiantes", errors: [{ value: ang5, feedback: "Ese es el ángulo; hay que pasarlo a cantidad de estudiantes." }] },
        ), pie(cat5, ang5, `${ang5}°`, 360 - ang5, `${360 - ang5}°`)),
        fig(n(
          "q6",
          `Un sector de un gráfico circular mide ${ang6}°. ¿Qué porcentaje del total representa?`,
          (ang6 / 360) * 100,
          [`El sector es ${ang6}/360 = ${frac(ang6, 360)} del círculo.`, `${frac(ang6, 360)} × 100 = ${dec((ang6 / 360) * 100)} %.`],
          ["Compara el ángulo con la vuelta completa.", `${ang6}/360.`, "Multiplica por 100."],
          { intent: "transfer", unit: "%", errors: [{ value: ang6, feedback: "Ese es el ángulo, no el porcentaje: la vuelta completa son 360°, no 100." }] },
        ), pie("Sector", ang6, `${ang6}°`, 360 - ang6)),
      ];
    },
    outcome: "Puedes leer gráficos de barras, pictogramas y circulares, calcular el ángulo de un sector y elegir el gráfico adecuado.",
    commonErrors: [
      "Contar los íconos de un pictograma sin multiplicar por el valor de la clave.",
      "Leer un gráfico de barras sin fijarse en que el eje no empieza en 0.",
      "Confundir el porcentaje con el ángulo del sector.",
      "Dibujar sectores cuyos ángulos no suman 360°.",
    ],
    application: fig(n(
      "aplicacion",
      "En una votación del aula, un gráfico circular muestra «sí» con 162°, «no» con 126° y el resto en blanco. Si votaron 40 estudiantes, ¿cuántos votaron en blanco?",
      8,
      ["En blanco → 360° − 162° − 126° = 72°.", "72/360 = 1/5, y 1/5 × 40 = 8 estudiantes."],
      ["Calcula el ángulo del sector en blanco.", "Los ángulos suman 360°.", "Pasa ese ángulo a una parte de 40."],
      { intent: "transfer", unit: "estudiantes" },
    ), { kind: "chart", type: "pie", data: [{ label: "Sí", value: 162, text: "162°" }, { label: "No", value: 126, text: "126°" }, { label: "En blanco", value: 72, text: "?" }] }),
  }),
];

function r100(x: number): number {
  return Math.round(x * 100) / 100;
}
