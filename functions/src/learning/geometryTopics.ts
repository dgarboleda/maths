import { defineLesson } from "./defineLesson";
import { choice as c, example as ex, numeric as n, type ChoiceLabel } from "./questions";
import { dec, list } from "./topicHelpers";
import type { Lesson } from "./types";

/** Unidades de medida, clasificación de figuras, paralelas, áreas, superficie y Tales. */

// ── Sistema métrico ───────────────────────────────────────────────────
const LADDER = ["k", "h", "da", "", "d", "c", "m"];
/** Escalones entre dos unidades del mismo tipo (positivo: se baja a una menor). */
function steps(from: string, to: string, base: string): number {
  const pre = (u: string) => LADDER.indexOf(u.slice(0, u.length - base.length));
  return pre(to) - pre(from);
}
const baseOf = (u: string) => (u.endsWith("L") ? "L" : u.endsWith("g") ? "g" : "m");
/** Valor de una cantidad en la unidad base (m, g o L). */
const toBase = (x: number, u: string) => x * 10 ** -steps(baseOf(u), u, baseOf(u));
const r6 = (x: number) => Math.round(x * 1e6) / 1e6;

export const METRIC_LESSONS: Lesson[] = [
  defineLesson({
    id: "sistema-metrico",
    unitId: "geometria",
    title: "Unidades de longitud, masa y capacidad",
    objective:
      "Convertir unidades de longitud, masa y capacidad del sistema métrico multiplicando o dividiendo por potencias de 10, y elegir la unidad adecuada para cada medida.",
    purpose:
      "Las recetas piden gramos, las etiquetas indican mililitros y los mapas, kilómetros. Convertir bien evita comprar de menos, equivocarse en una dosis o en un presupuesto.",
    prerequisites: ["operaciones-decimales"],
    legacyModuleIds: [],
    visual: "metric",
    vocabulary: [
      { term: "Unidad base", meaning: "Metro (m) para la longitud, gramo (g) para la masa y litro (L) para la capacidad." },
      { term: "Prefijos", meaning: "kilo (× 1000), hecto (× 100), deca (× 10), deci (÷ 10), centi (÷ 100) y mili (÷ 1000)." },
      { term: "Escalón", meaning: "Paso entre dos unidades vecinas, como de m a dm: cada escalón multiplica o divide por 10." },
    ],
    sections: [
      {
        title: "Los mismos prefijos para todo",
        paragraphs: [
          "El metro, el gramo y el litro se agrandan y se achican con los mismos prefijos: kilo (× 1000), hecto (× 100), deca (× 10), deci (÷ 10), centi (÷ 100) y mili (÷ 1000).",
          "Así, 1 km son 1000 m, 1 kg son 1000 g y 1 L son 1000 mL.",
        ],
        formula: "km  hm  dam  m  dm  cm  mm  (cada escalón, × 10 hacia la derecha)",
      },
      {
        title: "Bajar multiplica, subir divide",
        paragraphs: [
          "Para pasar a una unidad menor se multiplica por 10 por cada escalón que se baja; para pasar a una mayor se divide entre 10 por cada escalón que se sube.",
          "De km a m se bajan tres escalones (km, hm, dam, m), así que 2,5 km son 2,5 × 1000 = 2500 m. De mL a L se suben tres, así que 750 mL son 750 ÷ 1000 = 0,75 L.",
        ],
        formula: "a una unidad menor → × 10 por escalón;  a una mayor → ÷ 10 por escalón",
      },
      {
        title: "Elegir la unidad y comparar",
        paragraphs: [
          "Para comparar o sumar medidas, primero se pasan a la misma unidad: 1,2 kg y 350 g son 1200 g y 350 g, que suman 1550 g.",
          "Conviene elegir una unidad que dé números cómodos: la masa de una persona en kilogramos, la de una pastilla en miligramos, el agua de un vaso en mililitros.",
        ],
        formula: "1 g = 1000 mg;  1 m = 100 cm = 1000 mm",
      },
    ],
    examples: [
      ex(
        "Convierte 3,75 km a metros.",
        [
          ["km → hm → dam → m", "De kilómetros a metros se bajan tres escalones."],
          ["3,75 × 1000", "Bajar multiplica: cada escalón es × 10, y tres escalones son × 1000."],
          ["3750 m", "Multiplicar por 1000 corre la coma tres lugares a la derecha."],
        ],
        "3,75 km son 3750 m. Tiene sentido que el número crezca: hacen falta más metros que kilómetros para la misma distancia.",
      ),
      ex(
        "Una jarra tiene 1,5 L de jugo. ¿Cuántos vasos de 250 mL se pueden llenar?",
        [
          ["1,5 L → 1500 mL", "Pasamos los litros a mililitros para usar la misma unidad: × 1000."],
          ["1500 ÷ 250 = 6", "Dividimos la cantidad total entre lo que cabe en cada vaso."],
          ["6 vasos", "Comprobación → 6 × 250 = 1500."],
        ],
        "Se llenan 6 vasos. Sin pasar a la misma unidad, 1,5 ÷ 250 no tendría sentido.",
      ),
    ],
    diagnostic: [
      n("d-1", "¿Cuánto es 4,2 × 100?", 420, ["Multiplicar por 100 corre la coma dos lugares a la derecha.", "4,2 × 100 = 420."], ["Por 100 se corre la coma dos lugares.", "4,2 → 42 → 420.", "Es 420."]),
      n("d-2", "¿Cuánto es 350 ÷ 1000? Responde con un decimal.", 0.35, ["Dividir entre 1000 corre la coma tres lugares a la izquierda.", "350 ÷ 1000 = 0,35."], ["Entre 1000 se corre la coma tres lugares.", "350 → 35 → 3,5 → 0,35.", "Es 0,35."]),
      c("d-3", "¿Qué unidad usarías para medir la masa de una manzana?", ["Kilómetros", "Gramos", "Litros"], 1, "Los gramos miden masa; los kilómetros, longitud, y los litros, capacidad."),
    ],
    questions(v) {
      const [rx, rBig, rSmall] = v === 0 ? [2, "kg", "g"] : [4, "m", "cm"];
      const [tBig, tSmall] = v === 1 ? ["km", "m"] : ["L", "mL"];
      const [thing, best, worse1, worse2] =
        v === 2
          ? ["la capacidad de una cucharita de jarabe", "Mililitros", ["Litros", "Un litro es demasiado grande: la cucharita tiene unos 5 mL."], ["Gramos", "Los gramos miden masa, no capacidad."]]
          : ["la distancia entre Lima y Cusco", "Kilómetros", ["Metros", "Saldría un número enorme, de cientos de miles de metros."], ["Kilogramos", "Los kilogramos miden masa, no longitud."]];
      const concept = [
        c(
          "q0",
          `Al pasar ${rx} ${rBig} a ${rSmall}, ¿el número aumenta o disminuye?`,
          [
            ["Disminuye, porque se divide", "Para pasar a una unidad menor se multiplica."],
            `Aumenta: ${rSmall} es una unidad más pequeña, así que hacen falta más`,
            ["Queda igual, porque es la misma medida", "La medida es la misma, pero el número cambia con la unidad."],
          ],
          1,
          `${rx} ${rBig} son ${dec(rx * 10 ** steps(rBig, rSmall, baseOf(rBig)))} ${rSmall}: la misma cantidad necesita más unidades pequeñas.`,
        ),
        c(
          "q0",
          `¿Por qué hay que multiplicar por 1000 para pasar de ${tBig} a ${tSmall}?`,
          [
            `Porque entre ${tBig} y ${tSmall} hay tres escalones de × 10`,
            ["Porque siempre se multiplica por 1000", "Depende de los escalones: de m a cm se multiplica por 100."],
            [`Porque ${tSmall} mide otra magnitud`, `${tBig} y ${tSmall} miden lo mismo; solo cambia el tamaño de la unidad.`],
          ],
          0,
          "Cada escalón hacia una unidad menor multiplica por 10, y 10 × 10 × 10 = 1000.",
        ),
        c(
          "q0",
          `¿Cuál es la unidad más adecuada para medir ${thing}?`,
          [worse1 as ChoiceLabel, best, worse2 as ChoiceLabel],
          1,
          "Conviene una unidad de la magnitud correcta que dé un número cómodo de leer.",
        ),
      ][v % 3];

      const [x1, f1, t1] = [[3.2, "kg", "g"], [1.75, "L", "mL"], [4.5, "m", "cm"], [0.8, "km", "m"], [2.35, "m", "mm"], [6.4, "cg", "mg"]][v] as [number, string, string];
      const s1 = steps(f1, t1, baseOf(f1));
      const a1 = r6(x1 * 10 ** s1);
      const [f2, t2] = [["mm", "m"], ["cm", "m"], ["g", "kg"], ["mL", "cL"], ["m", "km"], ["dg", "g"]][v];
      const s2 = -steps(f2, t2, baseOf(f2));
      const chain2 = LADDER.slice(LADDER.indexOf(t2.slice(0, -baseOf(t2).length)), LADDER.indexOf(f2.slice(0, -baseOf(f2).length)) + 1)
        .reverse()
        .map((p) => p + baseOf(f2));
      const [x3, f3, t3] = [[2500, "g", "kg"], [750, "mL", "L"], [45, "cm", "m"], [3200, "m", "km"], [125, "mm", "cm"], [80, "mg", "g"]][v] as [number, string, string];
      const s3 = -steps(f3, t3, baseOf(f3));
      const a3 = r6(x3 / 10 ** s3);
      const [x4, f4, t4, w4, diag] = [
        [5, "km", "m", 0.005, "Dividió en lugar de multiplicar: a una unidad menor se multiplica"],
        [300, "cm", "m", 30000, "Multiplicó en lugar de dividir: a una unidad mayor se divide"],
        [2.4, "L", "mL", 240, "Multiplicó por 100, pero entre L y mL hay tres escalones"],
        [6, "kg", "g", 600, "Contó dos escalones en vez de tres"],
        [1500, "mL", "L", 150, "Dividió entre 10, pero entre mL y L hay tres escalones"],
        [0.7, "m", "cm", 7, "Multiplicó por 10, pero entre m y cm hay dos escalones"],
      ][v] as [number, string, string, number, string];
      const right4 = r6(x4 * 10 ** steps(f4, t4, baseOf(f4)));
      const [L5, v5] = [[2, 250], [1.5, 200], [3, 330], [2.5, 300], [1, 150], [5, 400]][v];
      const ml5 = r6(L5 * 1000);
      const glasses = Math.floor(ml5 / v5);
      const rest5 = ml5 - glasses * v5;
      const trio = [
        [[1.2, "kg"], [1250, "g"], [0.9, "kg"]],
        [[0.75, "L"], [800, "mL"], [70, "cL"]],
        [[3.5, "m"], [340, "cm"], [3600, "mm"]],
        [[2.1, "km"], [2050, "m"], [215, "dam"]],
        [[450, "mg"], [0.5, "g"], [0.04, "dag"]],
        [[1.8, "L"], [1750, "mL"], [19, "dL"]],
      ][v] as [number, string][];
      const small = ["g", "mL", "mm", "m", "mg", "mL"][v];
      const inSmall = trio.map(([x, u]) => r6(toBase(x, u) / toBase(1, small)));
      const top = Math.max(...inSmall);
      const topIndex = inSmall.indexOf(top);
      const label = ([x, u]: [number, string]) => `${dec(x)} ${u}`;
      return [
        concept,
        n(
          "q1",
          `Convierte ${dec(x1)} ${f1} a ${t1}.`,
          a1,
          [`De ${f1} a ${t1} se bajan ${s1} escalones, así que se multiplica por ${dec(10 ** s1)}.`, `${dec(x1)} × ${dec(10 ** s1)} = ${dec(a1)} ${t1}.`],
          [`Cuenta los escalones de ${f1} a ${t1}.`, `Son ${s1}: se multiplica por ${dec(10 ** s1)}.`, `Corre la coma ${s1} lugares a la derecha.`],
          {
            unit: t1,
            errors: [
              { value: r6(x1 * 10 ** (s1 - 1)), feedback: "Contaste un escalón de menos." },
              { value: r6(x1 / 10 ** s1), feedback: "Dividiste: para pasar a una unidad menor se multiplica." },
            ],
          },
        ),
        n(
          "q2",
          `Para pasar de ${f2} a ${t2}, ¿entre cuánto hay que dividir?`,
          10 ** s2,
          [`De ${f2} a ${t2} se suben ${s2} ${s2 === 1 ? "escalón" : "escalones"} (${chain2.join(", ")}).`, `Cada escalón hacia una unidad mayor divide entre 10, así que en total se divide entre ${dec(10 ** s2)}.`],
          [`Escribe las unidades de ${f2} a ${t2}.`, `Cuenta los escalones: son ${s2}.`, `Cada escalón es ÷ 10.`],
          { step: true, errors: s2 !== 10 ** s2 ? [{ value: s2, feedback: "Ese es el número de escalones; el divisor es 10 por cada uno." }] : [] },
        ),
        n(
          "q3",
          `Convierte ${dec(x3)} ${f3} a ${t3}.`,
          a3,
          [`De ${f3} a ${t3} se suben ${s3} ${s3 === 1 ? "escalón" : "escalones"}, así que se divide entre ${dec(10 ** s3)}.`, `${dec(x3)} ÷ ${dec(10 ** s3)} = ${dec(a3)} ${t3}.`],
          [`Cuenta los escalones de ${f3} a ${t3}.`, `Son ${s3}: se divide entre ${dec(10 ** s3)}.`, `Corre la coma ${s3} lugares a la izquierda.`],
          { unit: t3, errors: [{ value: r6(x3 * 10 ** s3), feedback: "Multiplicaste: para pasar a una unidad mayor se divide." }] },
        ),
        c(
          "q4",
          `Alguien convierte ${dec(x4)} ${f4} a ${t4} y obtiene ${dec(w4)} ${t4}. ¿Qué error cometió?`,
          [
            ["Ninguno: está bien", `${dec(x4)} ${f4} son ${dec(right4)} ${t4}.`],
            `${diag}: el resultado es ${dec(right4)} ${t4}`,
            [`Debió sumar los ceros al final`, "Se multiplica o se divide por potencias de 10: «agregar ceros» falla con decimales."],
          ],
          1,
          `${dec(x4)} ${f4} son ${dec(right4)} ${t4}.`,
        ),
        n(
          "q5",
          `Una botella tiene ${dec(L5)} L de agua y se sirven vasos de ${v5} mL. ¿Cuántos vasos se llenan por completo?`,
          glasses,
          [
            `${dec(L5)} L son ${dec(ml5)} mL, porque de L a mL se multiplica por 1000.`,
            `${dec(ml5)} ÷ ${v5} da ${glasses}${rest5 ? ` y sobran ${dec(rest5)} mL` : " exacto"}, así que se llenan ${glasses} vasos.`,
          ],
          ["Pasa todo a la misma unidad.", `${dec(L5)} L son ${dec(ml5)} mL.`, `¿Cuántas veces cabe ${v5} en ${dec(ml5)}?`],
          {
            intent: "transfer",
            unit: "vasos",
            errors: rest5 ? [{ value: r6(ml5 / v5), feedback: "No se puede llenar una parte de vaso: cuenta solo los vasos completos." }] : [],
          },
        ),
        c(
          "q6",
          `¿Cuál de estas cantidades es la mayor: ${list(trio.map(label))}?`,
          trio.map((t, i): ChoiceLabel =>
            i === topIndex ? label(t) : [label(t), `${label(t)} son ${dec(inSmall[i])} ${small}, menos que ${dec(top)} ${small}.`],
          ),
          topIndex,
          `En la misma unidad → ${trio.map((t, i) => `${label(t)} son ${dec(inSmall[i])} ${small}`).join("; ")}. La mayor es ${label(trio[topIndex])}.`,
          "transfer",
        ),
      ];
    },
    outcome: "Puedes convertir unidades de longitud, masa y capacidad y comparar medidas expresadas en unidades distintas.",
    commonErrors: [
      "Dividir cuando hay que multiplicar: al pasar a una unidad menor se multiplica.",
      "Contar mal los escalones: de m a cm hay dos, no tres.",
      "Comparar medidas en unidades distintas sin convertirlas.",
      "Correr la coma hacia el lado equivocado.",
    ],
    application: n(
      "aplicacion",
      "Un frasco de jarabe trae 0,15 L. Cada dosis es de 5 mL y se toman 3 dosis al día. ¿Para cuántos días alcanza el frasco?",
      10,
      ["0,15 L son 150 mL. Al día se toman 3 × 5 = 15 mL.", "150 ÷ 15 = 10 días."],
      ["Pasa el frasco a mililitros.", "Calcula cuánto se toma al día.", "Divide lo que hay entre lo que se toma al día."],
      { intent: "transfer", unit: "días" },
    ),
  }),
];

// ── Triángulos, cuadriláteros y paralelas ─────────────────────────────
export const FIGURE_LESSONS: Lesson[] = [
  defineLesson({
    id: "clasificacion-figuras",
    unitId: "geometria",
    title: "Clasificar triángulos y cuadriláteros",
    objective:
      "Clasificar triángulos por sus lados y por sus ángulos, y cuadriláteros por sus lados paralelos, y usar esas propiedades para calcular lados y ángulos desconocidos.",
    purpose:
      "Saber que un triángulo es isósceles o que una figura es un rombo da información sin medir: lados o ángulos iguales que permiten calcular los que faltan.",
    prerequisites: ["angulos"],
    legacyModuleIds: [],
    visual: "angles",
    vocabulary: [
      { term: "Equilátero", meaning: "Triángulo con los tres lados iguales; sus tres ángulos miden 60°." },
      { term: "Isósceles", meaning: "Triángulo con al menos dos lados iguales; los ángulos opuestos a ellos también son iguales." },
      { term: "Escaleno", meaning: "Triángulo con los tres lados distintos." },
      { term: "Paralelogramo", meaning: "Cuadrilátero con dos pares de lados paralelos: incluye rectángulos, rombos y cuadrados." },
      { term: "Trapecio", meaning: "Cuadrilátero con un solo par de lados paralelos, llamados bases." },
    ],
    sections: [
      {
        title: "Triángulos según sus lados",
        paragraphs: [
          "Equilátero: tres lados iguales y tres ángulos de 60°. Isósceles: al menos dos lados iguales, y los ángulos opuestos a esos lados también son iguales. Escaleno: tres lados distintos.",
          "Si un isósceles tiene un ángulo desigual de 40°, los otros dos se reparten 180° − 40° = 140°, así que miden 70° cada uno.",
        ],
        formula: "equilátero → 3 lados iguales;  isósceles → 2 iguales;  escaleno → ninguno igual",
      },
      {
        title: "Triángulos según sus ángulos",
        paragraphs: [
          "Acutángulo: los tres ángulos son agudos (menores de 90°). Rectángulo: tiene un ángulo recto. Obtusángulo: tiene un ángulo obtuso (mayor de 90°).",
          "Un triángulo no puede tener dos ángulos rectos ni dos obtusos: los tres ángulos suman 180°, y dos de 90° ya llegarían a 180° sin dejar nada para el tercero.",
        ],
        formula: "α + β + γ = 180°",
      },
      {
        title: "Cuadriláteros",
        paragraphs: [
          "Paralelogramo: dos pares de lados paralelos; sus lados opuestos y sus ángulos opuestos son iguales. El rectángulo tiene cuatro ángulos rectos, el rombo cuatro lados iguales y el cuadrado, las dos cosas.",
          "Trapecio: un solo par de lados paralelos. Trapezoide: ningún par. En todo cuadrilátero los ángulos suman 360°.",
        ],
        formula: "cuadrado ⊂ rectángulo ⊂ paralelogramo;  cuadrado ⊂ rombo ⊂ paralelogramo",
      },
    ],
    examples: [
      ex(
        "Un triángulo isósceles tiene un ángulo de 50° entre sus dos lados iguales. ¿Cuánto miden los otros dos?",
        [
          ["180° − 50° = 130°", "Los tres ángulos suman 180°; restamos el que conocemos."],
          ["130° ÷ 2 = 65°", "En un isósceles, los ángulos opuestos a los lados iguales son iguales: se reparte entre dos."],
          ["50°, 65° y 65°", "Comprobación → 50° + 65° + 65° = 180°. Todos son agudos: es un isósceles acutángulo."],
        ],
        "Los otros dos ángulos miden 65° cada uno.",
      ),
      ex(
        "Un paralelogramo tiene un ángulo de 70°. ¿Cuánto miden los demás?",
        [
          ["opuesto → 70°", "En un paralelogramo, los ángulos opuestos son iguales."],
          ["consecutivo → 180° − 70° = 110°", "Dos ángulos consecutivos suman 180°, porque están entre lados paralelos."],
          ["70°, 110°, 70° y 110°", "Comprobación → 70° + 110° + 70° + 110° = 360°."],
        ],
        "Con un solo ángulo de un paralelogramo se conocen los cuatro.",
      ),
    ],
    diagnostic: [
      n("d-1", "Dos ángulos de un triángulo miden 60° y 80°. ¿Cuántos grados mide el tercero?", 40, ["Los tres ángulos de un triángulo suman 180°.", "Restamos los dos conocidos → 180 − 60 − 80 = 40°."], ["Los ángulos de un triángulo suman 180°.", "Resta los que conoces.", "180 − 140."], { unit: "°" }),
      c("d-2", "¿Cómo se llama un ángulo de 90°?", ["Agudo", "Recto", "Obtuso"], 1, "Un ángulo de 90° es recto; los agudos miden menos y los obtusos más."),
      n("d-3", "¿Cuántos grados suman los ángulos de un cuadrilátero?", 360, ["Un cuadrilátero se divide en dos triángulos.", "2 × 180 = 360°."], ["Divide el cuadrilátero con una diagonal.", "Quedan dos triángulos.", "2 × 180."], { unit: "°" }),
    ],
    questions(v) {
      const [la, lb] = v === 0 ? [5, 8] : [7, 4];
      const [o1, o2] = v === 1 ? [100, 95] : [120, 70];
      const side = v === 2 ? 6 : 9;
      const concept = [
        c(
          "q0",
          `Un triángulo tiene lados de ${la} cm, ${la} cm y ${lb} cm. ¿Cómo se clasifica por sus lados?`,
          [["Equilátero", `Tendría los tres lados iguales, y ${lb} es distinto de ${la}.`], "Isósceles", ["Escaleno", "Escaleno es con los tres lados distintos; aquí hay dos iguales."]],
          1,
          `Tiene dos lados iguales (${la} cm): es isósceles.`,
        ),
        c(
          "q0",
          `¿Puede un triángulo tener un ángulo de ${o1}° y otro de ${o2}°?`,
          [
            ["Sí, si el tercero es muy pequeño", `${o1}° + ${o2}° = ${o1 + o2}°, que supera 180°: no queda nada para el tercero.`],
            `No: ${o1}° y ${o2}° ya suman más de 180°`,
            ["Sí, si es isósceles", "Ningún tipo de triángulo puede: sus tres ángulos suman siempre 180°."],
          ],
          1,
          "Los tres ángulos de un triángulo suman 180°, así que dos de ellos tienen que sumar menos de 180°.",
        ),
        c(
          "q0",
          `Un cuadrilátero tiene sus cuatro lados de ${side} cm y sus cuatro ángulos rectos. ¿Qué afirmación es correcta?`,
          [
            ["Es un cuadrado, así que no puede ser rombo", "Un rombo solo exige cuatro lados iguales, y el cuadrado los tiene."],
            ["Es un trapecio", "Un trapecio tiene un solo par de lados paralelos; este tiene dos."],
            "Es un cuadrado, y por eso también es rombo, rectángulo y paralelogramo",
          ],
          2,
          "El cuadrado cumple todas las condiciones: cuatro lados iguales (rombo), cuatro ángulos rectos (rectángulo) y dos pares de lados paralelos.",
        ),
      ][v % 3];

      const x1 = [40, 50, 30, 80, 100, 20][v];
      const x2 = [70, 55, 120, 65, 110, 80][v];
      const P3 = [36, 52, 28, 60, 44, 72][v];
      const [a4, b4, c4] = [[30, 40, 110], [25, 50, 105], [20, 35, 125], [15, 60, 105], [35, 45, 100], [10, 50, 120]][v];
      const x5 = [100, 120, 90, 110, 80, 130][v];
      const y6 = [35, 70, 45, 55, 65, 25][v];
      return [
        concept,
        n(
          "q1",
          `Un triángulo isósceles tiene un ángulo desigual de ${x1}°. ¿Cuántos grados mide cada uno de los otros dos?`,
          (180 - x1) / 2,
          [`Los tres ángulos suman 180°, así que los otros dos suman 180 − ${x1} = ${180 - x1}.`, `Esos dos son iguales → ${180 - x1} ÷ 2 = ${(180 - x1) / 2}°.`],
          ["Los ángulos de un triángulo suman 180°.", `Resta ${x1}° a 180°.`, "Reparte lo que queda entre los dos ángulos iguales."],
          {
            unit: "°",
            errors: [
              { value: 180 - x1, feedback: "No repartiste entre los dos ángulos iguales." },
              ...(180 - 2 * x1 > 0 ? [{ value: 180 - 2 * x1, feedback: `Tomaste ${x1}° como uno de los ángulos iguales; es el desigual.` }] : []),
            ],
          },
        ),
        n(
          "q2",
          `En un paralelogramo, un ángulo mide ${x2}°. Primer paso → ¿cuánto mide un ángulo consecutivo (vecino) a él?`,
          180 - x2,
          ["En un paralelogramo, dos ángulos consecutivos suman 180°, porque están entre lados paralelos.", `180 − ${x2} = ${180 - x2}°.`],
          ["Los ángulos vecinos de un paralelogramo son suplementarios.", "Suman 180°.", `Resta ${x2} a 180.`],
          {
            step: true,
            unit: "°",
            errors: [
              { value: x2, feedback: "Ese es el ángulo opuesto, que es igual; el consecutivo es su suplemento." },
              { value: 360 - x2, feedback: "Los cuatro ángulos suman 360°, pero dos consecutivos suman 180°." },
            ],
          },
        ),
        n(
          "q3",
          `Un rombo tiene un perímetro de ${P3} cm. ¿Cuánto mide cada lado?`,
          P3 / 4,
          ["El rombo tiene sus cuatro lados iguales, así que el perímetro es cuatro veces el lado.", `Lado = ${P3} ÷ 4 = ${P3 / 4} cm.`],
          ["¿Cuántos lados iguales tiene un rombo?", "Cuatro.", `Divide ${P3} entre 4.`],
          { unit: "cm", errors: [{ value: P3 / 2, feedback: "Dividiste entre 2: el rombo tiene cuatro lados iguales." }] },
        ),
        c(
          "q4",
          `Alguien dice que un triángulo con ángulos de ${a4}°, ${b4}° y ${c4}° es acutángulo, porque dos de sus ángulos son agudos. ¿Qué opinas?`,
          [
            ["Tiene razón: basta con que dos sean agudos", "Todo triángulo tiene al menos dos ángulos agudos; para ser acutángulo, los tres deben serlo."],
            `No: tiene un ángulo de ${c4}°, que es obtuso, así que es obtusángulo`,
            ["Es rectángulo", "Ninguno de sus ángulos mide 90°."],
          ],
          1,
          `Se clasifica por su ángulo mayor: ${c4}° es mayor que 90°, así que es obtusángulo.`,
        ),
        n(
          "q5",
          `Un techo tiene forma de triángulo isósceles. El ángulo de arriba, entre los dos lados iguales, mide ${x5}°. ¿Cuántos grados mide el ángulo que forma cada lado inclinado con la base?`,
          (180 - x5) / 2,
          [`Los ángulos de la base son iguales y suman 180 − ${x5} = ${180 - x5}.`, `Cada uno mide ${180 - x5} ÷ 2 = ${(180 - x5) / 2}°.`],
          ["Es un triángulo isósceles: los ángulos de la base son iguales.", `Resta ${x5}° a 180°.`, "Reparte entre los dos ángulos de la base."],
          { intent: "transfer", unit: "°", errors: [{ value: 180 - x5, feedback: "No repartiste entre los dos ángulos de la base." }] },
        ),
        n(
          "q6",
          `Un triángulo isósceles tiene dos ángulos iguales de ${y6}° cada uno. ¿Cuánto mide el tercer ángulo?`,
          180 - 2 * y6,
          [`Los dos ángulos iguales suman 2 × ${y6} = ${2 * y6}°.`, `El tercero mide 180 − ${2 * y6} = ${180 - 2 * y6}°.`],
          ["Los tres ángulos suman 180°.", `Los dos iguales suman 2 × ${y6}.`, `Resta esa suma a 180.`],
          { intent: "transfer", unit: "°", errors: [{ value: 180 - y6, feedback: "Restaste solo uno de los dos ángulos iguales." }] },
        ),
      ];
    },
    outcome: "Puedes clasificar triángulos y cuadriláteros y usar sus propiedades para calcular lados y ángulos.",
    commonErrors: [
      "Creer que un cuadrado no es un rombo ni un rectángulo.",
      "Clasificar como acutángulo un triángulo con un ángulo obtuso porque los otros dos son agudos.",
      "Tomar el ángulo desigual de un isósceles como si fuera uno de los iguales.",
      "Confundir trapecio (un par de lados paralelos) con paralelogramo (dos pares).",
    ],
    application: n(
      "aplicacion",
      "Una cometa tiene forma de cuadrilátero con dos ángulos opuestos iguales de 110° cada uno y otro ángulo de 60°. ¿Cuántos grados mide el cuarto ángulo?",
      80,
      ["Los ángulos de un cuadrilátero suman 360°.", "360 − 110 − 110 − 60 = 80°."],
      ["¿Cuánto suman los ángulos de un cuadrilátero?", "Suman 360°.", "Resta los tres que conoces."],
      { intent: "transfer", unit: "°" },
    ),
  }),

  defineLesson({
    id: "rectas-paralelas",
    unitId: "geometria",
    title: "Rectas paralelas cortadas por una secante",
    objective:
      "Reconocer rectas paralelas y perpendiculares, identificar ángulos correspondientes, alternos internos y conjugados internos, y calcular ángulos desconocidos con sus relaciones.",
    purpose:
      "En planos de calles, rejas, escaleras o estructuras aparecen líneas paralelas cruzadas por otra. Las relaciones entre sus ángulos permiten calcular inclinaciones sin medir cada una.",
    prerequisites: ["angulos"],
    legacyModuleIds: [],
    visual: "angles",
    vocabulary: [
      { term: "Rectas paralelas", meaning: "Rectas de un mismo plano que nunca se cortan." },
      { term: "Rectas perpendiculares", meaning: "Rectas que se cortan formando cuatro ángulos rectos." },
      { term: "Secante", meaning: "Recta que corta a otras dos; también se llama transversal." },
      { term: "Ángulos correspondientes", meaning: "Ocupan la misma posición en cada cruce: si las rectas son paralelas, son iguales." },
      { term: "Ángulos alternos internos", meaning: "Están entre las paralelas y a distinto lado de la secante: son iguales." },
      { term: "Ángulos conjugados internos", meaning: "Están entre las paralelas y del mismo lado de la secante: suman 180°." },
    ],
    sections: [
      {
        title: "Paralelas y perpendiculares",
        paragraphs: [
          "Dos rectas son paralelas si nunca se cortan, como los rieles de un tren. Son perpendiculares si al cortarse forman cuatro ángulos de 90°.",
          "Una recta que corta a dos paralelas se llama secante. En cada cruce forma cuatro ángulos: los opuestos por el vértice son iguales y los vecinos suman 180°.",
        ],
        formula: "r ∥ s;  r ⊥ t",
      },
      {
        title: "Correspondientes y alternos: iguales",
        paragraphs: [
          "Los ángulos correspondientes ocupan la misma posición en cada cruce (por ejemplo, arriba a la derecha). Son iguales porque una paralela es como una copia trasladada de la otra.",
          "Los alternos internos están entre las paralelas y a distinto lado de la secante. También son iguales.",
        ],
        formula: "correspondientes → iguales;  alternos internos → iguales",
      },
      {
        title: "Conjugados: suman 180°",
        paragraphs: [
          "Los conjugados internos están entre las paralelas y del mismo lado de la secante: suman 180°.",
          "Con un solo ángulo conocido se obtienen los ocho: cuatro miden lo mismo que él y los otros cuatro, su suplemento.",
        ],
        formula: "conjugados internos → α + β = 180°",
      },
    ],
    examples: [
      ex(
        "Dos paralelas son cortadas por una secante y uno de los ángulos internos mide 65°. ¿Cuánto miden su alterno interno y su conjugado interno?",
        [
          ["alterno interno → 65°", "Los alternos internos son iguales."],
          ["conjugado interno → 180° − 65° = 115°", "Los conjugados internos suman 180°."],
          ["65° y 115°", "De los ocho ángulos, cuatro miden 65° y cuatro 115°."],
        ],
        "Con un ángulo se conocen todos: los iguales a él y sus suplementos.",
      ),
      ex(
        "Una escalera forma 72° con el suelo y sus peldaños son paralelos al suelo. ¿Qué ángulo forma la escalera con cada peldaño, del mismo lado?",
        [
          ["suelo ∥ peldaños", "El suelo y los peldaños son rectas paralelas, y la escalera es la secante."],
          ["correspondiente → 72°", "El ángulo con cada peldaño ocupa la misma posición que el ángulo con el suelo."],
          ["72° (y 108° del otro lado)", "Del otro lado del peldaño se forma el suplemento → 180° − 72° = 108°."],
        ],
        "Cada peldaño forma 72° con la escalera, igual que el suelo.",
      ),
    ],
    diagnostic: [
      n("d-1", "¿Cuánto mide el suplemento de un ángulo de 130°?", 50, ["Dos ángulos suplementarios suman entre los dos 180°.", "El suplemento de 130° es 180 − 130 = 50°."], ["El suplemento completa 180°.", "Resta 130 a 180.", "Es 50°."], { unit: "°" }),
      c("d-2", "¿Cómo son dos ángulos opuestos por el vértice?", ["Iguales", "Suplementarios", "Complementarios"], 0, "Los ángulos opuestos por el vértice son iguales."),
      n("d-3", "¿Cuántos grados mide cada ángulo que forman dos rectas perpendiculares?", 90, ["Dos perpendiculares forman cuatro ángulos iguales que suman 360°.", "360 ÷ 4 = 90°."], ["Son cuatro ángulos iguales.", "Juntos suman 360°.", "360 ÷ 4."], { unit: "°" }),
    ],
    questions(v) {
      const x = [65, 48, 72, 110, 55, 130][v];
      const concept = [
        c(
          "q0",
          `Dos paralelas son cortadas por una secante. ¿Por qué un ángulo de ${x}° y su correspondiente miden lo mismo?`,
          [
            ["Porque son opuestos por el vértice", "Los opuestos por el vértice están en el mismo cruce; los correspondientes, en cruces distintos."],
            ["Porque suman 180°", "Los que suman 180° son los conjugados; los correspondientes son iguales."],
            "Porque una paralela es como una copia trasladada de la otra: la secante las corta con la misma inclinación",
          ],
          2,
          `Al trasladar una paralela sobre la otra, el ángulo de ${x}° cae exactamente sobre su correspondiente.`,
        ),
        c(
          "q0",
          `Si dos rectas cortadas por una secante forman ángulos alternos internos de ${x}° y ${x + 5}°, ¿son paralelas?`,
          [
            `No: si fueran paralelas, los alternos internos serían iguales`,
            ["Sí, porque casi miden lo mismo", "Basta una diferencia pequeña para que las rectas terminen cortándose."],
            ["Sí, porque suman menos de 180°", "Lo que importa es que los alternos sean iguales."],
          ],
          0,
          "Dos rectas son paralelas exactamente cuando una secante forma con ellas alternos internos iguales.",
        ),
        c(
          "q0",
          `Entre dos paralelas, un ángulo conjugado interno mide ${x}°. ¿Cuánto suman él y su conjugado?`,
          [["360°", "360° es lo que suman los cuatro ángulos de un cruce."], [`${2 * x}°, porque son iguales`, "Los iguales son los alternos y los correspondientes; los conjugados son suplementarios."], "180°, porque están del mismo lado de la secante, entre las paralelas"],
          2,
          `Su conjugado mide 180° − ${x}° = ${180 - x}°.`,
        ),
      ][v % 3];

      const [a3, b3, c3] = [[2, 10, 70], [3, 5, 50], [4, 8, 72], [5, 10, 110], [2, 15, 55], [3, 12, 90]][v];
      const x3 = (c3 - b3) / a3;
      const x5 = [40, 35, 50, 30, 45, 25][v];
      const [p6, q6] = [[20, 10], [25, 20], [35, 25], [10, 5], [20, 16], [14, 10]][v];
      const x6 = (180 - p6 - q6) / 3;
      return [
        concept,
        n(
          "q1",
          `Dos paralelas son cortadas por una secante. Un ángulo interno mide ${x}°. ¿Cuánto mide su conjugado interno?`,
          180 - x,
          ["Los conjugados internos están del mismo lado de la secante, entre las paralelas, y suman 180°.", `180 − ${x} = ${180 - x}°.`],
          ["Los conjugados internos son suplementarios.", "Suman 180°.", `Resta ${x} a 180.`],
          { unit: "°", errors: [{ value: x, feedback: "Ese valor tiene el alterno interno; el conjugado es el suplemento." }] },
        ),
        n(
          "q2",
          `Una secante corta dos paralelas y uno de los ángulos internos mide ${x}°. Primer paso → ¿cuánto mide su alterno interno?`,
          x,
          ["Los alternos internos están entre las paralelas, a distinto lado de la secante.", `Son iguales, así que el alterno interno de ${x}° también mide ${x}°.`],
          ["Ubica el ángulo entre las paralelas, del otro lado de la secante.", "Los alternos internos son iguales.", `Mide lo mismo que ${x}°.`],
          { step: true, unit: "°", errors: [{ value: 180 - x, feedback: "Ese es el suplemento; los alternos internos son iguales." }] },
        ),
        n(
          "q3",
          `Dos ángulos correspondientes entre paralelas miden (${a3}x + ${b3})° y ${c3}°. ¿Cuánto vale x?`,
          x3,
          [`Los correspondientes son iguales → ${a3}x + ${b3} = ${c3}.`, `${a3}x = ${c3 - b3}, así que x = ${c3 - b3} ÷ ${a3} = ${dec(x3)}.`],
          ["Los ángulos correspondientes son iguales.", `Plantea ${a3}x + ${b3} = ${c3}.`, `Resta ${b3} y divide entre ${a3}.`],
          { errors: [{ value: (180 - c3 - b3) / a3, feedback: "Los planteaste como suplementarios; los correspondientes son iguales." }].filter((e) => e.value !== x3 && e.value > 0) },
        ),
        c(
          "q4",
          `Alguien dice que, entre dos paralelas, un ángulo de ${x}° y su conjugado interno miden lo mismo. ¿Qué error comete?`,
          [
            ["Ninguno: miden lo mismo", `Solo pasaría si midieran 90°; aquí ${x}° más ${x}° no da 180°.`],
            ["Los conjugados suman 360°", "Suman 180°; 360° es la vuelta completa en un cruce."],
            `Confunde conjugados con alternos: los conjugados suman 180°, así que el conjugado mide ${180 - x}°`,
          ],
          2,
          `180° − ${x}° = ${180 - x}°.`,
        ),
        n(
          "q5",
          `Una reja tiene barrotes verticales paralelos y una barra diagonal que los cruza. En un barrote, la diagonal forma ${x5}° por arriba a la derecha. En el barrote siguiente, ¿cuánto mide el ángulo de abajo a la derecha?`,
          180 - x5,
          [`En el barrote siguiente, el ángulo de arriba a la derecha también mide ${x5}°, porque es su correspondiente.`, `El de abajo a la derecha es su vecino en ese cruce → 180 − ${x5} = ${180 - x5}°.`],
          ["En cada barrote se repiten los mismos ángulos.", `Arriba a la derecha mide ${x5}° en todos.`, "Abajo a la derecha es el suplemento."],
          { intent: "transfer", unit: "°", errors: [{ value: x5, feedback: "Ese es el ángulo de arriba; el de abajo es su vecino, que lo completa hasta 180°." }] },
        ),
        n(
          "q6",
          `Entre dos paralelas, dos ángulos conjugados internos miden (x + ${p6})° y (2x + ${q6})°. ¿Cuánto vale x?`,
          x6,
          [`Los conjugados internos suman 180° → (x + ${p6}) + (2x + ${q6}) = 180.`, `3x + ${p6 + q6} = 180, así que 3x = ${180 - p6 - q6} y x vale ${dec(x6)}.`],
          ["Los conjugados internos suman 180°.", "Suma las dos expresiones y iguala a 180.", `3x + ${p6 + q6} = 180.`],
          { intent: "transfer", errors: [{ value: q6 - p6, feedback: "Los igualaste, pero los conjugados no son iguales: suman 180°." }].filter((e) => e.value > 0 && e.value !== x6) },
        ),
      ];
    },
    outcome: "Puedes reconocer los ángulos que forma una secante con dos paralelas y calcular cualquiera de ellos a partir de uno.",
    commonErrors: [
      "Pensar que los conjugados internos son iguales, cuando suman 180°.",
      "Aplicar estas relaciones cuando las rectas no son paralelas.",
      "Confundir alternos internos con correspondientes.",
      "Olvidar que en cada cruce los ángulos vecinos son suplementarios.",
    ],
    application: n(
      "aplicacion",
      "Dos rieles de tren paralelos son cruzados por un camino. Entre los rieles, el camino forma 38° con el primer riel. ¿Cuánto mide el ángulo que forma con el segundo riel, también entre los rieles y del mismo lado del camino?",
      142,
      ["Los dos ángulos están entre las paralelas y del mismo lado de la secante: son conjugados internos.", "Suman 180°, así que el otro mide 180 − 38 = 142°."],
      ["¿Qué relación tienen los dos ángulos?", "Son conjugados internos.", "Suman 180°."],
      { intent: "transfer", unit: "°" },
    ),
  }),
];

// ── Áreas de polígonos y superficie de cuerpos ─────────────────────────
const PI = 3.14;
const r2 = (x: number) => Math.round(x * 100) / 100;

export const AREA_LESSONS: Lesson[] = [
  defineLesson({
    id: "areas-poligonos",
    unitId: "geometria",
    title: "Área de paralelogramos, trapecios y polígonos regulares",
    objective: "Calcular el área de paralelogramos, rombos, trapecios y polígonos regulares relacionándola con el área del rectángulo y del triángulo.",
    purpose:
      "Los terrenos, techos y baldosas rara vez son rectángulos. Descomponer una figura en partes conocidas permite calcular su área y presupuestar materiales.",
    prerequisites: ["perimetro-area"],
    legacyModuleIds: [],
    visual: "area",
    vocabulary: [
      { term: "Altura", meaning: "Distancia perpendicular entre una base y el lado o el vértice opuesto; no es el lado inclinado." },
      { term: "Bases del trapecio", meaning: "Sus dos lados paralelos: la mayor (B) y la menor (b)." },
      { term: "Diagonal", meaning: "Segmento que une dos vértices no consecutivos." },
      { term: "Apotema", meaning: "Segmento que va del centro de un polígono regular al punto medio de un lado." },
    ],
    sections: [
      {
        title: "Paralelogramo: base por altura",
        paragraphs: [
          "Si se corta un triángulo de un lado del paralelogramo y se pega del otro lado, se forma un rectángulo con la misma base y la misma altura.",
          "La altura es perpendicular a la base; no es el lado inclinado. El rombo, que es un paralelogramo, también se calcula con sus diagonales: mide la mitad del rectángulo que las contiene.",
        ],
        formula: "paralelogramo → A = b × h;  rombo → A = D × d ÷ 2",
      },
      {
        title: "Trapecio: el promedio de las bases",
        paragraphs: [
          "Dos trapecios iguales, uno de ellos girado, forman un paralelogramo de base B + b y la misma altura. El trapecio es la mitad de ese paralelogramo.",
          "Por eso se multiplica la altura por el promedio de las dos bases.",
        ],
        formula: "A = (B + b) × h ÷ 2",
      },
      {
        title: "Polígonos regulares: triángulos desde el centro",
        paragraphs: [
          "Un polígono regular de n lados se divide desde el centro en n triángulos iguales. Cada uno tiene por base un lado y por altura la apotema.",
          "Su área es el perímetro por la apotema, dividido entre 2. Un hexágono de 6 cm de lado y 5,2 cm de apotema tiene un perímetro de 36 cm y un área de 36 × 5,2 ÷ 2 = 93,6 cm².",
        ],
        formula: "A = P × ap ÷ 2",
      },
    ],
    examples: [
      ex(
        "Un trapecio tiene bases de 10 cm y 6 cm y una altura de 4 cm. ¿Cuál es su área?",
        [
          ["10 + 6 = 16", "Sumamos las dos bases."],
          ["16 × 4 = 64", "Multiplicamos por la altura: es el área del paralelogramo que forman dos trapecios iguales."],
          ["64 ÷ 2 = 32 cm²", "El trapecio es la mitad."],
        ],
        "El trapecio mide 32 cm², lo mismo que un rectángulo de 8 cm (el promedio de las bases) por 4 cm.",
      ),
      ex(
        "Un rombo tiene diagonales de 12 m y 8 m. ¿Cuál es su área?",
        [
          ["12 × 8 = 96", "Las diagonales del rombo son los lados de un rectángulo de 12 por 8 que lo contiene."],
          ["96 ÷ 2 = 48", "El rombo ocupa exactamente la mitad de ese rectángulo."],
          ["48 m²", "Comprobación → son 4 triángulos rectángulos de catetos 6 y 4, y 4 × (6 × 4 ÷ 2) = 48."],
        ],
        "El rombo mide 48 m².",
      ),
    ],
    diagnostic: [
      n("d-1", "¿Cuál es el área de un rectángulo de 7 cm por 5 cm?", 35, ["El área de un rectángulo es base por altura.", "7 × 5 = 35 cm²."], ["Multiplica la base por la altura.", "7 × 5.", "Es 35."], { unit: "cm²" }),
      n("d-2", "¿Cuál es el área de un triángulo de base 8 cm y altura 6 cm?", 24, ["El triángulo es la mitad de un rectángulo de la misma base y altura.", "8 × 6 ÷ 2 = 24 cm²."], ["Multiplica la base por la altura.", "8 × 6 = 48.", "Divide entre 2."], { unit: "cm²" }),
      c("d-3", "¿Qué es la altura de un triángulo?", ["Su lado más largo", "La distancia perpendicular de un vértice al lado opuesto", "La mitad de la base"], 1, "La altura es perpendicular a la base y llega al vértice opuesto."),
    ],
    questions(v) {
      const [pb, pl, ph] = v === 0 ? [8, 5, 4] : [10, 6, 5];
      const [tB, tb] = v === 1 ? [9, 5] : [12, 8];
      const hs = v === 2 ? 4 : 10;
      const concept = [
        c(
          "q0",
          `Un paralelogramo tiene base ${pb} cm, lado inclinado ${pl} cm y altura ${ph} cm. ¿Qué medidas se multiplican para obtener su área?`,
          [
            `La base (${pb} cm) y la altura (${ph} cm)`,
            [`La base y el lado inclinado (${pb} × ${pl})`, "El lado inclinado es más largo que la altura: el área saldría mayor que la real."],
            ["Los tres datos", "El área de un paralelogramo solo necesita la base y la altura."],
          ],
          0,
          `A = ${pb} × ${ph} = ${pb * ph} cm²: al reacomodarlo es un rectángulo de base ${pb} y altura ${ph}.`,
        ),
        c(
          "q0",
          `¿Por qué el área de un trapecio de bases ${tB} cm y ${tb} cm se divide entre 2?`,
          [
            ["Porque tiene dos bases", "Se divide entre 2 porque es la mitad de un paralelogramo, no por contar bases."],
            ["Porque es un triángulo", "Un trapecio tiene cuatro lados; se relaciona con un paralelogramo."],
            `Porque dos trapecios iguales forman un paralelogramo de base ${tB} + ${tb}, y el trapecio es la mitad`,
          ],
          2,
          `El paralelogramo de dos trapecios tiene base ${tB + tb}; cada trapecio es la mitad.`,
        ),
        c(
          "q0",
          `Un hexágono regular de ${hs} cm de lado se divide desde su centro. ¿En cuántos triángulos iguales queda y cuál es su altura?`,
          [
            ["En 6 triángulos, cuya altura es el lado", "La altura de cada triángulo va del centro al punto medio del lado: es la apotema."],
            "En 6 triángulos, cuya altura es la apotema",
            ["En 4 triángulos, como un cuadrado", "Un polígono regular de n lados da n triángulos: el hexágono, 6."],
          ],
          1,
          "Cada lado es la base de un triángulo cuyo vértice es el centro; la altura es la apotema. Por eso A = P × ap ÷ 2.",
        ),
      ][v % 3];

      const [B1, b1, h1] = [[10, 6, 5], [12, 8, 6], [9, 5, 4], [14, 10, 7], [11, 7, 3], [15, 9, 8]][v];
      const A1 = ((B1 + b1) * h1) / 2;
      const [D2, d2] = [[10, 6], [12, 8], [14, 6], [9, 4], [16, 10], [11, 8]][v];
      const [n3, name3, s3, ap3] = [[6, "hexágono", 4, 3.5], [5, "pentágono", 10, 6.9], [8, "octágono", 5, 6], [6, "hexágono", 10, 8.7], [5, "pentágono", 4, 2.8], [8, "octágono", 10, 12.1]][v] as [number, string, number, number];
      const P3 = n3 * s3;
      const A3 = r2((P3 * ap3) / 2);
      const [b4, l4, h4] = [[8, 5, 4], [10, 6, 5], [12, 7, 6], [9, 5, 4], [7, 5, 3], [11, 6, 5]][v];
      const [b5, B5, h5, p5] = [[8, 12, 10, 20], [6, 10, 15, 30], [10, 14, 12, 25], [9, 15, 10, 40], [5, 11, 8, 50], [7, 13, 9, 30]][v];
      const A5 = ((B5 + b5) * h5) / 2;
      const [A6, h6, b6] = [[40, 5, 6], [60, 6, 8], [28, 4, 5], [84, 7, 10], [27, 3, 7], [96, 8, 9]][v];
      const sum6 = (2 * A6) / h6;
      return [
        concept,
        n(
          "q1",
          `Un trapecio tiene bases de ${B1} cm y ${b1} cm y una altura de ${h1} cm. ¿Cuál es su área?`,
          A1,
          [`Sumamos las bases y multiplicamos por la altura → ${B1 + b1} × ${h1} = ${(B1 + b1) * h1}.`, `Dividimos entre 2 → ${(B1 + b1) * h1} ÷ 2 = ${dec(A1)} cm².`],
          ["Usa A = (B + b) × h ÷ 2.", `${B1} + ${b1} = ${B1 + b1}.`, `Multiplica por ${h1} y divide entre 2.`],
          { unit: "cm²", errors: [{ value: (B1 + b1) * h1, feedback: "Falta dividir entre 2: ese es el área del paralelogramo que forman dos trapecios." }] },
        ),
        n(
          "q2",
          `Para el área de un rombo de diagonales ${D2} cm y ${d2} cm, primero se multiplican las diagonales. ¿Cuánto da ese producto?`,
          D2 * d2,
          [`${D2} × ${d2} = ${D2 * d2}, que es el área del rectángulo que contiene al rombo.`, `El área del rombo es la mitad → ${D2 * d2} ÷ 2 = ${(D2 * d2) / 2} cm².`],
          ["Las diagonales forman los lados de un rectángulo que contiene al rombo.", `Multiplica ${D2} × ${d2}.`, "Después se dividiría entre 2."],
          { step: true, errors: [{ value: (D2 * d2) / 2, feedback: "Eso ya es el área del rombo; este paso pedía solo el producto de las diagonales." }] },
        ),
        n(
          "q3",
          `Un ${name3} regular tiene ${s3} cm de lado y ${dec(ap3)} cm de apotema. ¿Cuál es su área?`,
          A3,
          [`El perímetro es ${n3} × ${s3} = ${P3} cm.`, `A = perímetro × apotema ÷ 2 → ${P3} × ${dec(ap3)} ÷ 2 = ${dec(A3)} cm².`],
          [`Un ${name3} tiene ${n3} lados.`, `Perímetro → ${n3} × ${s3}.`, "Multiplica por la apotema y divide entre 2."],
          { unit: "cm²", errors: [{ value: r2(P3 * ap3), feedback: "Falta dividir entre 2: cada triángulo es la mitad de un rectángulo." }] },
        ),
        c(
          "q4",
          `Para un paralelogramo de base ${b4} cm, lado inclinado ${l4} cm y altura ${h4} cm, alguien calcula el área como ${b4} × ${l4} = ${b4 * l4} cm². ¿Qué error cometió?`,
          [
            ["Ninguno: es base por lado", "Base por lado solo sirve en el rectángulo, donde el lado es la altura."],
            `Usó el lado inclinado en vez de la altura: el área es ${b4} × ${h4} = ${b4 * h4} cm²`,
            ["Faltó dividir entre 2", "El paralelogramo no se divide entre 2: es un rectángulo reacomodado."],
          ],
          1,
          `La altura es la distancia perpendicular entre las bases, ${h4} cm, no el lado inclinado.`,
        ),
        n(
          "q5",
          `Un terreno tiene forma de trapecio: el frente mide ${b5} m, el fondo ${B5} m (paralelo al frente) y la distancia entre ambos es ${h5} m. Si el metro cuadrado cuesta ${p5} soles, ¿cuánto cuesta el terreno?`,
          A5 * p5,
          [`Área = (${B5} + ${b5}) × ${h5} ÷ 2 = ${A5} m².`, `Costo = ${A5} × ${p5} = ${dec(A5 * p5)} soles.`],
          ["Primero calcula el área del trapecio.", `(${B5} + ${b5}) × ${h5} ÷ 2.`, `Multiplica el área por ${p5}.`],
          { intent: "transfer", unit: "soles", errors: [{ value: (B5 + b5) * h5 * p5, feedback: "Olvidaste dividir entre 2 al calcular el área del trapecio." }] },
        ),
        n(
          "q6",
          `Un trapecio tiene un área de ${A6} cm², una altura de ${h6} cm y una base de ${b6} cm. ¿Cuánto mide la otra base?`,
          sum6 - b6,
          [`(B + ${b6}) × ${h6} ÷ 2 = ${A6}, así que B + ${b6} = ${A6} × 2 ÷ ${h6} = ${dec(sum6)}.`, `La otra base mide ${dec(sum6)} − ${b6} = ${dec(sum6 - b6)} cm.`],
          ["Plantea la fórmula con la base desconocida.", `Multiplica ${A6} por 2 y divide entre ${h6}.`, `Resta la base conocida, ${b6}.`],
          { intent: "transfer", unit: "cm", errors: [{ value: sum6, feedback: "Esa es la suma de las dos bases; falta restar la base conocida." }] },
        ),
      ];
    },
    outcome: "Puedes calcular el área de paralelogramos, rombos, trapecios y polígonos regulares, y despejar una medida desconocida.",
    commonErrors: [
      "Usar el lado inclinado como si fuera la altura.",
      "Olvidar dividir entre 2 en el trapecio o en el rombo.",
      "Sumar las bases del trapecio y no multiplicar por la altura.",
      "Usar el lado en lugar de la apotema en un polígono regular.",
    ],
    application: n(
      "aplicacion",
      "Una ventana tiene forma de hexágono regular de 30 cm de lado y 26 cm de apotema. ¿Cuántos centímetros cuadrados de vidrio se necesitan?",
      2340,
      ["El perímetro es 6 × 30 = 180 cm.", "A = 180 × 26 ÷ 2 = 2340 cm²."],
      ["Calcula el perímetro del hexágono.", "Usa A = P × ap ÷ 2.", "180 × 26 ÷ 2."],
      { intent: "transfer", unit: "cm²" },
    ),
  }),

  defineLesson({
    id: "area-superficie",
    unitId: "geometria",
    title: "Área lateral y total de prismas y cilindros",
    objective:
      "Calcular el área lateral y el área total de prismas rectos y cilindros a partir de su desarrollo plano, y distinguir el área de la superficie del volumen.",
    purpose:
      "Para pintar una pared, forrar una caja o fabricar una lata se necesita la superficie, no el volumen. El desarrollo plano muestra cada cara que hay que cubrir.",
    prerequisites: ["volumen"],
    legacyModuleIds: [],
    visual: "net",
    vocabulary: [
      { term: "Desarrollo plano", meaning: "Figura que se obtiene al abrir un cuerpo por sus aristas y extenderlo sobre una mesa." },
      { term: "Área lateral", meaning: "Suma de las caras que no son bases; en el cilindro, un rectángulo que se enrolla." },
      { term: "Área total", meaning: "Área lateral más las áreas de las dos bases." },
    ],
    sections: [
      {
        title: "Desplegar el cuerpo",
        paragraphs: [
          "Si se corta una caja por sus aristas y se abre, queda una figura plana: su desarrollo. El área de la superficie es el área de esa figura.",
          "Un prisma recto tiene dos bases iguales y caras laterales rectangulares; un cilindro tiene dos círculos y un rectángulo que se enrolla.",
        ],
        formula: "área total = área lateral + 2 × área de la base",
      },
      {
        title: "Área lateral: perímetro por altura",
        paragraphs: [
          "Las caras laterales de un prisma recto, puestas en fila, forman un rectángulo cuyo largo es el perímetro de la base y cuyo alto es la altura del prisma.",
          "En el cilindro, ese rectángulo mide 2πr de largo, la longitud de la circunferencia, y h de alto.",
        ],
        formula: "área lateral = perímetro de la base × h;  cilindro → 2πr × h",
      },
      {
        title: "Superficie o volumen",
        paragraphs: [
          "El área se mide en unidades cuadradas (cm², m²) y dice cuánto material cubre el cuerpo. El volumen se mide en unidades cúbicas y dice cuánto cabe dentro.",
          "Una caja de 2 cm por 3 cm por 4 cm tiene un volumen de 24 cm³ y una superficie de 2 × (6 + 8 + 12) = 52 cm².",
        ],
        formula: "caja → A = 2(ab + ac + bc);  V = a × b × c",
      },
    ],
    examples: [
      ex(
        "Calcula el área total de una caja de 5 cm × 4 cm × 3 cm.",
        [
          ["2 × (5 × 4) = 40", "La tapa y el fondo son dos rectángulos de 5 por 4."],
          ["2 × (5 × 3) + 2 × (4 × 3) = 30 + 24 = 54", "Las cuatro caras laterales: dos de 5 por 3 y dos de 4 por 3."],
          ["40 + 54 = 94 cm²", "Sumamos todas las caras. Comprobación → el perímetro de la base es 18 y 18 × 3 = 54 de área lateral."],
        ],
        "La caja tiene 94 cm² de superficie.",
      ),
      ex(
        "Una lata cilíndrica tiene 4 cm de radio y 10 cm de altura. ¿Cuánto material lleva? Usa π ≈ 3,14.",
        [
          ["2 × 3,14 × 4 × 10 = 251,2", "El rectángulo lateral mide la longitud de la circunferencia (2πr) por la altura."],
          ["2 × 3,14 × 16 = 100,48", "Las dos tapas son círculos de radio 4, de área πr² cada una."],
          ["251,2 + 100,48 = 351,68 cm²", "Sumamos el área lateral y la de las bases."],
        ],
        "La lata lleva unos 351,68 cm² de lámina.",
      ),
    ],
    diagnostic: [
      n("d-1", "¿Cuál es el perímetro de un rectángulo de 6 cm por 4 cm?", 20, ["El perímetro suma los cuatro lados.", "2 × (6 + 4) = 20 cm."], ["Suma los cuatro lados.", "6 + 4 + 6 + 4.", "Es 20."], { unit: "cm" }),
      n("d-2", "Con π ≈ 3,14, ¿cuál es la longitud de una circunferencia de 5 cm de radio?", 31.4, ["La longitud es 2πr.", "2 × 3,14 × 5 = 31,4 cm."], ["Usa L = 2πr.", "2 × 5 = 10.", "10 × 3,14."], { unit: "cm" }),
      c("d-3", "¿En qué unidad se mide un área?", ["cm", "cm²", "cm³"], 1, "El área se mide en unidades cuadradas; cm³ es para volumen y cm para longitud."),
    ],
    questions(v) {
      const [ba, bb, bc] = v === 0 ? [10, 6, 4] : [8, 5, 3];
      const rr = v === 1 ? 3 : 5;
      const cube = v === 2 ? 3 : 4;
      const concept = [
        c(
          "q0",
          `Para forrar con papel una caja de ${ba} × ${bb} × ${bc} cm, ¿qué hay que calcular?`,
          [
            "El área total: la suma de las seis caras",
            [`El volumen, ${ba * bb * bc} cm³`, "El volumen dice cuánto cabe dentro; el papel cubre la superficie."],
            ["El perímetro de la base", "El perímetro es una longitud; el papel cubre caras."],
          ],
          0,
          `El papel cubre las seis caras → 2 × (${ba * bb} + ${ba * bc} + ${bb * bc}) = ${2 * (ba * bb + ba * bc + bb * bc)} cm².`,
        ),
        c(
          "q0",
          `¿Por qué la cara lateral de un cilindro de ${rr} cm de radio es un rectángulo cuyo largo es 2π × ${rr}?`,
          [
            [`Porque el largo es el diámetro, ${2 * rr} cm`, "El diámetro va solo de lado a lado; la cara lateral da la vuelta completa."],
            ["Porque el área del círculo es πr²", "πr² es el área de cada base, no el largo de la cara lateral."],
            "Porque al desenrollarla, su largo es la longitud de la circunferencia de la base",
          ],
          2,
          "La cara lateral envuelve la base: su largo es la longitud de la circunferencia, 2πr.",
        ),
        c(
          "q0",
          `Un cubo tiene ${cube} cm de arista. ¿Qué afirmación es correcta?`,
          [
            [`Su área total es ${cube}³ cm²`, `${cube}³ es el volumen; el área suma 6 cuadrados de ${cube}².`],
            `Su área total es 6 × ${cube}² = ${6 * cube * cube} cm² y su volumen es ${cube}³ = ${cube ** 3} cm³`,
            ["Su área y su volumen son el mismo número", `Aquí son distintos: ${6 * cube * cube} cm² y ${cube ** 3} cm³, y además se miden en unidades distintas.`],
          ],
          1,
          `El cubo tiene 6 caras cuadradas de ${cube * cube} cm² y le caben ${cube ** 3} cubitos de 1 cm³.`,
        ),
      ][v % 3];

      const [a1, b1, c1] = [[5, 4, 3], [6, 4, 2], [10, 5, 3], [8, 6, 4], [7, 3, 2], [9, 5, 4]][v];
      const A1 = 2 * (a1 * b1 + a1 * c1 + b1 * c1);
      const [s2, h2] = [[[3, 4, 5], 10], [[5, 5, 6], 8], [[6, 8, 10], 5], [[5, 12, 13], 6], [[7, 7, 7], 3], [[4, 6, 8], 5]][v] as [number[], number];
      const P2 = s2.reduce((x, y) => x + y, 0);
      const [r3, h3] = [[2, 5], [3, 7], [5, 5], [1, 9], [4, 6], [2, 8]][v];
      const lat3 = r2(2 * PI * r3 * h3),
        bases3 = r2(2 * PI * r3 * r3);
      const [r4, h4] = [[2, 3], [3, 4], [1, 5], [4, 2], [2, 6], [5, 3]][v];
      const [l5, w5, d5] = [[10, 5, 2], [8, 4, 1.5], [12, 6, 2], [6, 3, 1], [15, 8, 2], [9, 4, 1.5]][v];
      const walls5 = r2(2 * l5 * d5 + 2 * w5 * d5);
      const A5 = r2(l5 * w5 + walls5);
      const [a6, T6] = [[10, 400], [6, 204], [8, 288], [5, 145], [12, 528], [4, 112]][v];
      const h6 = (T6 - a6 * a6) / (4 * a6);
      return [
        concept,
        n(
          "q1",
          `Calcula el área total de una caja de ${a1} cm × ${b1} cm × ${c1} cm.`,
          A1,
          [`Hay tres pares de caras iguales → ${a1} × ${b1} = ${a1 * b1}, ${a1} × ${c1} = ${a1 * c1} y ${b1} × ${c1} = ${b1 * c1}.`, `Área total = 2 × (${a1 * b1} + ${a1 * c1} + ${b1 * c1}) = ${A1} cm².`],
          ["Una caja tiene seis caras, iguales de dos en dos.", "Calcula el área de una cara de cada tipo.", "Suma y multiplica por 2."],
          {
            unit: "cm²",
            errors: [
              { value: A1 / 2, feedback: "Contaste cada par una sola vez: hay dos caras de cada tipo." },
              { value: a1 * b1 * c1, feedback: "Ese es el volumen, no la superficie." },
            ],
          },
        ),
        n(
          "q2",
          `Un prisma recto tiene una base triangular de lados ${list(s2)} cm, y una altura de ${h2} cm. Primer paso → ¿cuál es su área lateral?`,
          P2 * h2,
          [`El perímetro de la base es ${s2.join(" + ")} = ${P2} cm.`, `Área lateral = perímetro × altura = ${P2} × ${h2} = ${P2 * h2} cm², el rectángulo que forman las caras laterales.`],
          ["Las caras laterales forman un rectángulo.", "Su largo es el perímetro de la base.", `Multiplica ${P2} por ${h2}.`],
          { step: true, unit: "cm²" },
        ),
        n(
          "q3",
          `Un cilindro tiene ${r3} cm de radio y ${h3} cm de altura. Con π ≈ 3,14, ¿cuál es su área total?`,
          r2(lat3 + bases3),
          [`Área lateral ≈ 2 × 3,14 × ${r3} × ${h3} = ${dec(lat3)}; las dos bases ≈ 2 × 3,14 × ${r3 * r3} = ${dec(bases3)}.`, `Área total ≈ ${dec(lat3)} + ${dec(bases3)} = ${dec(r2(lat3 + bases3))} cm².`],
          ["Suma el área lateral y la de las dos bases.", "Área lateral → 2πrh.", "Cada base → πr²."],
          { unit: "cm²", errors: [{ value: lat3, feedback: "Falta sumar las dos bases." }] },
        ),
        c(
          "q4",
          `Para pintar una pared cilíndrica, sin tapas, de ${r4} m de radio y ${h4} m de altura, alguien calcula π × ${r4}² × ${h4}. ¿Qué error cometió?`,
          [
            ["Ninguno: así se calcula lo que hay que pintar", "π × r² × h da metros cúbicos: lo que cabe dentro, no la superficie."],
            `Calculó el volumen; para pintar se necesita el área lateral, 2π × ${r4} × ${h4}`,
            ["Olvidó sumar las tapas", "El enunciado dice que no tiene tapas; el error es otro."],
          ],
          1,
          `La pintura cubre la superficie lateral: 2πrh ≈ 2 × 3,14 × ${r4} × ${h4} = ${dec(r2(2 * PI * r4 * h4))} m².`,
        ),
        n(
          "q5",
          `Se quiere pintar el interior de una piscina de ${l5} m de largo, ${w5} m de ancho y ${dec(d5)} m de profundidad: el fondo y las cuatro paredes. ¿Cuántos metros cuadrados hay que pintar?`,
          A5,
          [`Fondo → ${l5} × ${w5} = ${l5 * w5} m². Paredes → 2 × ${l5} × ${dec(d5)} + 2 × ${w5} × ${dec(d5)} = ${dec(walls5)} m².`, `Total → ${l5 * w5} + ${dec(walls5)} = ${dec(A5)} m².`],
          ["La piscina no tiene tapa: son el fondo y cuatro paredes.", "Hay dos paredes largas y dos cortas.", "Suma el fondo y las cuatro paredes."],
          { intent: "transfer", unit: "m²", errors: [{ value: r2(A5 + l5 * w5), feedback: "La piscina no tiene techo: no se pinta una tapa." }] },
        ),
        n(
          "q6",
          `Una caja sin tapa tiene base cuadrada de ${a6} cm de lado, y el área de su exterior (fondo y cuatro caras) es ${T6} cm². ¿Cuál es su altura?`,
          h6,
          [`El fondo mide ${a6}² = ${a6 * a6} cm²; las cuatro caras suman ${T6} − ${a6 * a6} = ${T6 - a6 * a6} cm².`, `Cada cara mide ${a6} × h, así que 4 × ${a6} × h = ${T6 - a6 * a6} y h = ${T6 - a6 * a6} ÷ ${4 * a6} = ${dec(h6)} cm.`],
          ["Resta el área del fondo.", "Lo que queda son cuatro caras iguales.", `Cada cara es ${a6} por la altura.`],
          { intent: "transfer", unit: "cm" },
        ),
      ];
    },
    outcome: "Puedes calcular el área lateral y total de prismas y cilindros y distinguir cuándo se necesita la superficie y cuándo el volumen.",
    commonErrors: [
      "Confundir el área de la superficie con el volumen.",
      "Olvidar las bases al calcular el área total.",
      "Usar el diámetro en lugar de la longitud de la circunferencia como largo de la cara lateral del cilindro.",
      "Contar una sola vez cada par de caras iguales de una caja.",
    ],
    application: n(
      "aplicacion",
      "Una empresa fabrica latas de 3 cm de radio y 10 cm de altura. Con π ≈ 3,14, ¿cuántos centímetros cuadrados de lámina necesita para una lata con sus dos tapas?",
      244.92,
      ["Área lateral ≈ 2 × 3,14 × 3 × 10 = 188,4 cm².", "Tapas ≈ 2 × 3,14 × 9 = 56,52 cm². Total ≈ 188,4 + 56,52 = 244,92 cm²."],
      ["Calcula el área lateral con 2πrh.", "Calcula las dos tapas con 2πr².", "Suma las dos áreas."],
      { intent: "transfer", unit: "cm²" },
    ),
  }),
];

// ── Congruencia y Tales ────────────────────────────────────────────────
export const THALES_LESSONS: Lesson[] = [
  defineLesson({
    id: "tales-congruencia",
    unitId: "geometria",
    title: "Congruencia de triángulos y teorema de Tales",
    objective:
      "Reconocer triángulos congruentes con los criterios LLL, LAL y ALA, y usar el teorema de Tales para calcular segmentos determinados por rectas paralelas.",
    purpose:
      "Con el teorema de Tales se mide la altura de un edificio por su sombra o el ancho de un río sin cruzarlo; la congruencia garantiza que dos piezas fabricadas por separado encajen.",
    prerequisites: ["semejanza"],
    legacyModuleIds: [],
    visual: "similarity",
    vocabulary: [
      { term: "Figuras congruentes", meaning: "Figuras con la misma forma y el mismo tamaño: una se superpone exactamente a la otra." },
      { term: "Criterios de congruencia", meaning: "LLL (tres lados), LAL (dos lados y el ángulo entre ellos) y ALA (dos ángulos y el lado entre ellos)." },
      { term: "Teorema de Tales", meaning: "Si varias rectas paralelas cortan a dos rectas, los segmentos que determinan en una son proporcionales a los de la otra." },
    ],
    sections: [
      {
        title: "Congruentes: misma forma y mismo tamaño",
        paragraphs: [
          "Dos triángulos son congruentes si sus lados y sus ángulos correspondientes son iguales: son semejantes con razón 1.",
          "No hace falta comprobar los seis datos. Basta con tres lados (LLL), dos lados y el ángulo entre ellos (LAL), o dos ángulos y el lado entre ellos (ALA). Tres ángulos iguales no bastan: solo aseguran la semejanza.",
        ],
        formula: "LLL;  LAL;  ALA",
      },
      {
        title: "Teorema de Tales",
        paragraphs: [
          "Si tres o más rectas paralelas cortan a dos rectas, los segmentos que se forman en una son proporcionales a los que se forman en la otra.",
          "Si en una recta se forman segmentos de 3 cm y 6 cm, y en la otra el primero mide 4 cm, el segundo mide 8 cm, porque 3 es a 6 como 4 es a 8.",
        ],
        formula: "a/b = a′/b′",
      },
      {
        title: "Triángulos en posición de Tales",
        paragraphs: [
          "Una paralela a un lado de un triángulo forma un triángulo pequeño semejante al grande: comparten un ángulo y sus lados quedan proporcionales.",
          "Así se mide una altura con sombras: si un poste de 2 m da una sombra de 3 m y, a la misma hora, un edificio da 45 m de sombra, el edificio mide 2 × 45 ÷ 3 = 30 m.",
        ],
        formula: "altura/sombra = altura′/sombra′",
      },
    ],
    examples: [
      ex(
        "Tres paralelas cortan a dos rectas. En la primera se forman segmentos de 5 cm y 8 cm; en la segunda, el primero mide 7,5 cm. ¿Cuánto mide el segundo?",
        [
          ["5/8 = 7,5/x", "Por el teorema de Tales, los segmentos son proporcionales en el mismo orden."],
          ["x = 8 × 7,5 ÷ 5", "Despejamos x multiplicando en cruz."],
          ["x = 12 cm", "Comprobación → 7,5/12 = 0,625 = 5/8."],
        ],
        "El segundo segmento mide 12 cm.",
      ),
      ex(
        "¿Son congruentes un triángulo de lados 5, 7 y 9 cm y otro de lados 9, 5 y 7 cm?",
        [
          ["5, 7, 9  y  5, 7, 9", "Ordenamos los lados de menor a mayor en cada triángulo."],
          ["los tres lados coinciden", "Cada lado de uno tiene un lado igual en el otro."],
          ["congruentes por LLL", "Con los tres lados iguales, los ángulos también coinciden."],
        ],
        "Son congruentes: el orden en que se nombran los lados no importa.",
      ),
    ],
    diagnostic: [
      n("d-1", "Si 2/3 = x/12, ¿cuánto vale x?", 8, ["12 es 3 × 4, así que x es 2 × 4.", "x vale 8."], ["¿Por cuánto se multiplicó el 3 para llegar a 12?", "Por 4.", "Multiplica 2 por 4."]),
      c("d-2", "¿Qué tienen en común dos figuras semejantes?", ["La misma forma", "Siempre el mismo tamaño", "El mismo perímetro"], 0, "Las figuras semejantes tienen la misma forma; su tamaño puede ser distinto."),
      n("d-3", "Un rectángulo de 4 cm por 6 cm se amplía con razón 2. ¿Cuánto mide su lado mayor?", 12, ["Cada lado se multiplica por 2.", "6 × 2 = 12 cm."], ["Ampliar con razón 2 es multiplicar por 2.", "El lado mayor mide 6 cm.", "6 × 2."], { unit: "cm" }),
    ],
    questions(v) {
      const [ga, gb, gc] = v === 0 ? [50, 60, 70] : [40, 65, 75];
      const [pa, pb] = v === 1 ? [3, 6] : [4, 10];
      const [sa, sb, sang] = v === 2 ? [5, 8, 40] : [6, 9, 55];
      const concept = [
        c(
          "q0",
          `Dos triángulos tienen sus tres ángulos iguales (${ga}°, ${gb}° y ${gc}°). ¿Son necesariamente congruentes?`,
          [
            ["Sí: tres ángulos iguales son un criterio de congruencia", "Con los mismos ángulos se puede ampliar o reducir el triángulo: falta al menos un lado."],
            "No: pueden ser de distinto tamaño; solo son semejantes",
            ["Sí, porque sus ángulos suman 180°", "Todos los triángulos suman 180°: eso no decide el tamaño."],
          ],
          1,
          "Para la congruencia hace falta al menos un lado: LLL, LAL o ALA.",
        ),
        c(
          "q0",
          `Tres rectas cortan a dos secantes y en una de ellas forman segmentos de ${pa} cm y ${pb} cm. ¿Qué hace falta para asegurar que en la otra secante los segmentos están en la misma razón?`,
          [
            "Que las tres rectas sean paralelas",
            ["Que las secantes sean paralelas", "Lo que deben ser paralelas son las rectas que cortan a las secantes."],
            ["Nada: siempre se cumple", "Con rectas no paralelas los segmentos pueden tener cualquier razón."],
          ],
          0,
          "El teorema de Tales exige rectas paralelas: solo así los segmentos son proporcionales.",
        ),
        c(
          "q0",
          `Dos triángulos tienen dos lados de ${sa} cm y ${sb} cm y el ángulo entre ellos de ${sang}°. ¿Qué criterio asegura que son congruentes?`,
          [
            ["LLL", "LLL necesita los tres lados; aquí se conocen dos lados y un ángulo."],
            ["ALA", "ALA usa dos ángulos y el lado entre ellos."],
            "LAL: dos lados y el ángulo comprendido entre ellos",
          ],
          2,
          "Con dos lados y el ángulo que forman, el tercer lado queda determinado: es el criterio LAL.",
        ),
      ][v % 3];

      const [a1, b1, c1] = [[4, 6, 6], [3, 5, 6], [5, 8, 7.5], [2, 7, 3], [6, 9, 8], [4, 10, 5]][v];
      const x1 = (b1 * c1) / a1;
      const [h2, s2] = [[2, 4], [1.5, 2], [3, 2], [2, 5], [1.2, 1.5], [1.8, 1.2]][v];
      const [h3, s3, S3] = [[2, 3, 45], [1.5, 2, 24], [2, 5, 40], [1, 4, 48], [3, 2, 14], [1.8, 1.2, 10]][v];
      const H3 = (h3 * S3) / s3;
      const [rh, rl, RL] = [[1, 8, 24], [0.5, 6, 18], [2, 10, 35], [1, 12, 30], [0.6, 4, 10], [1.5, 9, 24]][v];
      const RH = (rh * RL) / rl;
      const [ta, tA, tB] = [[3, 9, 12], [4, 10, 15], [2, 8, 10], [5, 12, 18], [6, 9, 15], [3, 12, 20]][v];
      const tx = (tB * ta) / tA;
      return [
        concept,
        n(
          "q1",
          `Tres paralelas cortan a dos rectas. En la primera se forman segmentos de ${a1} cm y ${b1} cm; en la segunda, el que corresponde al de ${a1} cm mide ${dec(c1)} cm. ¿Cuánto mide el otro?`,
          x1,
          [`Por el teorema de Tales, ${a1}/${b1} = ${dec(c1)}/x.`, `x = ${b1} × ${dec(c1)} ÷ ${a1} = ${dec(x1)} cm.`],
          ["Los segmentos son proporcionales en el mismo orden.", `Plantea ${a1}/${b1} = ${dec(c1)}/x.`, "Multiplica en cruz y despeja x."],
          { unit: "cm", errors: [{ value: (a1 * c1) / b1, feedback: `Invertiste la proporción: el segmento que buscas corresponde al de ${b1} cm.` }].filter((e) => Math.abs(e.value * 100 - Math.round(e.value * 100)) < 1e-9) },
        ),
        n(
          "q2",
          `A la misma hora, un palo de ${dec(h2)} m da una sombra de ${dec(s2)} m. Primer paso → ¿cuántos metros de altura corresponden a cada metro de sombra?`,
          h2 / s2,
          ["La razón entre altura y sombra es la misma para todos los objetos a la misma hora.", `${dec(h2)} ÷ ${dec(s2)} = ${dec(h2 / s2)}, así que por cada metro de sombra hay ${dec(h2 / s2)} m de altura.`],
          ["Compara la altura con la sombra.", "Divide la altura entre la sombra.", `${dec(h2)} ÷ ${dec(s2)}.`],
          { step: true, errors: [{ value: s2 / h2, feedback: "Dividiste al revés: se pide altura por cada metro de sombra." }].filter((e) => Math.abs(e.value * 100 - Math.round(e.value * 100)) < 1e-9) },
        ),
        n(
          "q3",
          `Un palo de ${dec(h3)} m da una sombra de ${dec(s3)} m y, a la misma hora, un edificio da una sombra de ${S3} m. ¿Cuánto mide el edificio?`,
          H3,
          [`La razón altura/sombra es la misma → ${dec(h3)}/${dec(s3)} = H/${S3}.`, `H = ${dec(h3)} × ${S3} ÷ ${dec(s3)} = ${dec(H3)} m.`],
          ["Las sombras a la misma hora son proporcionales a las alturas.", `Plantea ${dec(h3)}/${dec(s3)} = H/${S3}.`, "Despeja H."],
          { unit: "m", errors: [{ value: (s3 * S3) / h3, feedback: "Invertiste la proporción: la altura del palo va con la del edificio." }].filter((e) => Math.abs(e.value * 100 - Math.round(e.value * 100)) < 1e-9) },
        ),
        c(
          "q4",
          `Con segmentos de ${a1} y ${b1} en una recta, y de ${dec(c1)} y x en la otra, alguien plantea ${a1}/${b1} = x/${dec(c1)}. ¿Qué error cometió?`,
          [
            ["Ninguno: es lo mismo", `Con su planteo, x saldría de ${a1} × ${dec(c1)} ÷ ${b1}, y no de ${b1} × ${dec(c1)} ÷ ${a1}.`],
            `Cambió el orden: ${dec(c1)} corresponde a ${a1}, así que debe plantear ${a1}/${b1} = ${dec(c1)}/x`,
            ["Debió sumar los segmentos", "Tales relaciona razones de segmentos, no sumas."],
          ],
          1,
          `Los segmentos correspondientes van en la misma posición: x = ${b1} × ${dec(c1)} ÷ ${a1} = ${dec(x1)}.`,
        ),
        n(
          "q5",
          `Una rampa sube ${dec(rh)} m por cada ${rl} m de avance. Un tramo de la misma rampa avanza ${RL} m. ¿Cuánto sube?`,
          RH,
          [`Los triángulos que forma la rampa son semejantes → ${dec(rh)}/${rl} = h/${RL}.`, `h = ${dec(rh)} × ${RL} ÷ ${rl} = ${dec(RH)} m.`],
          ["La inclinación es la misma en toda la rampa.", `Plantea ${dec(rh)}/${rl} = h/${RL}.`, "Despeja h."],
          { intent: "transfer", unit: "m" },
        ),
        n(
          "q6",
          `En un triángulo, una paralela a la base corta un lado a ${ta} cm del vértice. Ese lado mide ${tA} cm en total y la base mide ${tB} cm. ¿Cuánto mide el segmento paralelo?`,
          tx,
          [`El triángulo pequeño es semejante al grande, con razón ${ta}/${tA}.`, `El segmento paralelo mide ${tB} × ${ta} ÷ ${tA} = ${dec(tx)} cm.`],
          ["La paralela forma un triángulo pequeño semejante.", `La razón de semejanza es ${ta}/${tA}.`, `Multiplica la base, ${tB}, por esa razón.`],
          { intent: "transfer", unit: "cm", errors: [{ value: tB - (tA - ta), feedback: "Restaste longitudes: en la semejanza los lados se multiplican por la razón." }].filter((e) => e.value > 0 && e.value !== tx) },
        ),
      ];
    },
    outcome: "Puedes reconocer triángulos congruentes y calcular segmentos y alturas con el teorema de Tales.",
    commonErrors: [
      "Creer que tres ángulos iguales bastan para la congruencia, cuando solo dan semejanza.",
      "Plantear la proporción de Tales con los segmentos en distinto orden.",
      "Aplicar Tales con rectas que no son paralelas.",
      "Usar LAL cuando el ángulo conocido no está entre los dos lados.",
    ],
    application: n(
      "aplicacion",
      "Una escalera de 5 m apoyada en una pared alcanza 4 m de altura. Un peldaño está a 2 m del pie de la escalera, medidos sobre ella. ¿A qué altura del suelo está ese peldaño?",
      1.6,
      ["La altura del peldaño y la de la pared son paralelas: forman triángulos en posición de Tales → 2/5 = h/4.", "h = 4 × 2 ÷ 5 = 1,6 m."],
      ["Las alturas son paralelas entre sí.", "Plantea 2/5 = h/4.", "Despeja h."],
      { intent: "transfer", unit: "m" },
    ),
  }),
];
