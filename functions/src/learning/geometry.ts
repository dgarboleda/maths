import { defineLesson } from "./defineLesson";
import { choice as c, example as ex, numeric as n } from "./questions";
import type { Lesson } from "./types";

const PI = 3.14;
/** Redondea a milésimas para evitar restos de coma flotante (3,14 × 10). */
const r3 = (x: number) => Math.round(x * 1000) / 1000;
const fmt = (x: number) => r3(x).toLocaleString("es");

export const GEOMETRY_LESSONS: Lesson[] = [
  defineLesson({
    id: "perimetro-area",
    unitId: "geometria",
    title: "Perímetro y área",
    objective:
      "Distinguir perímetro y área, calcularlos en rectángulos, triángulos y figuras compuestas, y elegir la magnitud adecuada en un contexto.",
    purpose:
      "Para cercar un terreno se necesita el perímetro; para cubrirlo con placas solares, el área. Confundirlas lleva a comprar mal.",
    prerequisites: ["jerarquia-operaciones"],
    legacyModuleIds: ["geometria-d3", "geometria-d4", "geometria-d5"],
    visual: "area",
    vocabulary: [
      { term: "Perímetro", meaning: "Longitud del borde de una figura; se mide en cm, m…" },
      { term: "Área", meaning: "Superficie que ocupa una figura; se mide en unidades cuadradas: cm², m²…" },
      { term: "Altura de un triángulo", meaning: "Distancia perpendicular desde un vértice hasta el lado opuesto (la base)." },
    ],
    sections: [
      {
        title: "Borde o superficie",
        paragraphs: [
          "El perímetro suma las longitudes de los lados: un rectángulo de 6 m por 4 m tiene 6 + 4 + 6 + 4 = 20 m de borde.",
          "El área cuenta cuántos cuadrados de 1 m² lo cubren: 6 filas de 4 cuadrados son 24 m². Se expresa en unidades cuadradas.",
        ],
        formula: "Rectángulo: P = 2(b + h);  A = b × h",
      },
      {
        title: "El triángulo es medio rectángulo",
        paragraphs: [
          "Un triángulo con base b y altura h ocupa la mitad del rectángulo b × h: A = b × h ÷ 2.",
          "La altura es perpendicular a la base; no siempre es uno de los lados.",
        ],
        formula: "Triángulo: A = b × h ÷ 2",
      },
      {
        title: "Figuras compuestas",
        paragraphs: [
          "Una figura en forma de L se puede descomponer en dos rectángulos y sumar sus áreas, o completar un rectángulo grande y restar el hueco.",
          "Para el perímetro, recorre el borde exterior y suma solo los tramos que están en el contorno.",
        ],
        formula: "A(compuesta) = suma de las partes",
      },
    ],
    examples: [
      ex("Un terreno rectangular mide 12 m por 7 m. ¿Cuánta cerca y cuántas placas de 1 m² hacen falta?", [
        ["P = 2(12 + 7) = 38 m", "La cerca recorre el borde."],
        ["A = 12 × 7 = 84 m²", "Las placas cubren la superficie."],
        ["38 m de cerca; 84 placas", "Cada magnitud responde una pregunta distinta y tiene su unidad."],
      ], "Perímetro y área de la misma figura son números distintos con unidades distintas."),
      ex("Un panel triangular tiene base 10 dm y altura 6 dm. ¿Qué área tiene?", [
        ["10 × 6 = 60", "El rectángulo que lo contiene."],
        ["60 ÷ 2 = 30", "El triángulo ocupa la mitad."],
        ["30 dm²", "Unidad cuadrada."],
      ], "El panel ocupa 30 dm²."),
    ],
    diagnostic: [
      n("d-1", "¿Cuánto es 8 × 5?", 40, ["8 × 5 = 40."], ["Ocho grupos de cinco.", "5 + 5 + … ocho veces.", "40."]),
      n("d-2", "¿Cuánto es 2 × (9 + 3)?", 24, ["9 + 3 = 12; 2 × 12 = 24."], ["Paréntesis primero.", "2 × 12.", "24."]),
      c("d-3", "¿En qué unidad se mide una superficie?", ["m", "m²", "m³"], 1, "Las superficies se miden en unidades cuadradas."),
    ],
    questions(v) {
      const [b, h] = [[6, 4], [9, 5], [12, 7], [8, 3], [10, 6], [15, 4]][v],
        [tb, th] = [[10, 6], [8, 5], [14, 9], [12, 7], [9, 4], [16, 5]][v],
        // Figura en L: rectángulo grande W × H menos un hueco w × hh en una esquina.
        [W, H, w, hh] = [[10, 8, 4, 3], [12, 9, 5, 4], [14, 10, 6, 5], [9, 7, 3, 2], [11, 8, 4, 5], [13, 10, 5, 6]][v],
        [side, fence] = [[15, 9], [20, 12], [18, 11], [25, 14], [16, 13], [22, 17]][v];
      return [
        v % 2 === 0
          ? c(
              "q0",
              "Para saber cuántas placas de 1 m² cubren un techo, ¿qué se calcula?",
              [
                ["El perímetro", "El perímetro mide el borde, no la superficie que hay que cubrir."],
                "El área",
                ["La suma de dos lados", "Eso es la mitad del perímetro de un rectángulo."],
              ],
              1,
              "Cubrir una superficie es una pregunta de área.",
            )
          : c(
              "q0",
              `Un rectángulo de ${b} m por ${h} m tiene ${b * h} m² de área. ¿Por qué no tiene ${b * h} m de perímetro?`,
              [
                "Porque el perímetro mide el borde y suma los lados: " + 2 * (b + h) + " m",
                ["Sí lo tiene: área y perímetro coinciden", "Solo coinciden por casualidad en algunos rectángulos."],
                ["Porque el perímetro es la mitad del área", "No hay una relación fija entre ambos."],
              ],
              0,
              "Área y perímetro miden magnitudes distintas.",
            ),
        n(
          "q1",
          `Calcula el área de un rectángulo de ${b} cm por ${h} cm.`,
          b * h,
          [`${b} × ${h} = ${b * h} cm².`],
          ["El área cuenta los cuadrados que cubren la figura.", `${b} columnas de ${h} cuadrados.`, `${b} × ${h}.`],
          { unit: "cm²", errors: [{ value: 2 * (b + h), feedback: "Calculaste el perímetro. El área es base × altura." }] },
        ),
        n(
          "q2",
          `Completa el perímetro de ese rectángulo: 2 × (${b} + ${h}) = __ cm.`,
          2 * (b + h),
          [`${b} + ${h} = ${b + h}; 2 × ${b + h} = ${2 * (b + h)} cm.`],
          ["Suma dentro del paréntesis.", "Hay dos lados de cada medida.", `2 × ${b + h}.`],
          { step: true, unit: "cm", errors: [{ value: b + h, feedback: "Sumaste solo dos lados. El rectángulo tiene cuatro." }] },
        ),
        n(
          "q3",
          `Un triángulo tiene base ${tb} cm y altura ${th} cm. ¿Cuál es su área?`,
          (tb * th) / 2,
          [`${tb} × ${th} = ${tb * th}; ${tb * th} ÷ 2 = ${fmt((tb * th) / 2)} cm².`],
          ["El triángulo es la mitad de un rectángulo.", `${tb} × ${th}.`, "Divide entre 2."],
          { unit: "cm²", errors: [{ value: tb * th, feedback: "Esa es el área del rectángulo completo. El triángulo ocupa la mitad." }] },
        ),
        v % 2 === 0
          ? c(
              "q4",
              `Un compañero dice que si un rectángulo duplica su base y su altura, su área se duplica. ¿Qué responde?`,
              [
                ["Tiene razón", `Con ${b} × ${h} = ${b * h}, duplicando: ${2 * b} × ${2 * h} = ${4 * b * h}.`],
                "El área se multiplica por 4, porque ambas dimensiones se duplican",
                ["El área no cambia", "Las dimensiones cambian, así que el área también."],
              ],
              1,
              "El área depende de dos longitudes: duplicar ambas multiplica el área por 2 × 2 = 4. El perímetro sí se duplica.",
            )
          : c(
              "q4",
              `Un rectángulo de ${b + h - 1} × 1 y otro de ${b} × ${h - 1} tienen el mismo perímetro, ${2 * (b + h)}. ¿Tienen la misma área?`,
              [
                ["Sí: mismo perímetro, misma área", `Calcula: ${b + h - 1} × 1 = ${b + h - 1}, pero ${b} × ${h - 1} = ${b * (h - 1)}.`],
                ["No se puede comparar sin más datos", "Con las medidas basta para calcular ambas áreas."],
                `No: el primero tiene ${b + h - 1} y el segundo ${b * (h - 1)} unidades cuadradas`,
              ],
              2,
              "Figuras con el mismo perímetro pueden encerrar áreas muy distintas.",
            ),
        n(
          "q5",
          `Un terreno cuadrado de ${side} m de lado se cerca dejando una puerta de ${side - fence} m. ¿Cuántos metros de cerca hacen falta?`,
          4 * side - (side - fence),
          [`Perímetro: 4 × ${side} = ${4 * side} m.`, `Sin la puerta: ${4 * side} − ${side - fence} = ${4 * side - (side - fence)} m.`],
          ["La cerca recorre el borde.", "Un cuadrado tiene cuatro lados iguales.", "Resta el hueco de la puerta."],
          {
            intent: "transfer",
            unit: "m",
            errors: [
              { value: side * side, feedback: "Calculaste el área. La cerca se mide en el borde." },
              { value: 4 * side, feedback: "Ese es el perímetro completo: falta descontar la puerta." },
            ],
          },
        ),
        n(
          "q6",
          `Una plaza tiene forma de L: es un rectángulo de ${W} m por ${H} m al que le falta una esquina de ${w} m por ${hh} m. ¿Qué área tiene?`,
          W * H - w * hh,
          [`Rectángulo completo: ${W} × ${H} = ${W * H} m².`, `Hueco: ${w} × ${hh} = ${w * hh} m².`, `Área: ${W * H} − ${w * hh} = ${W * H - w * hh} m².`],
          ["Completa la figura hasta un rectángulo.", "Calcula el área grande y la del hueco.", "Resta."],
          {
            intent: "transfer",
            unit: "m²",
            errors: [
              { value: W * H, feedback: "Falta restar la esquina que no forma parte de la plaza." },
              { value: 2 * (W + H), feedback: "Calculaste un perímetro. Se pide la superficie." },
            ],
          },
        ),
      ];
    },
    application: n(
      "app",
      "Un techo rectangular de 9 m por 6 m se cubre con placas solares, salvo una claraboya de 2 m por 1,5 m. Cada placa ocupa 1,5 m². ¿Cuántas placas caben como máximo?",
      34,
      ["Techo: 9 × 6 = 54 m²; claraboya: 2 × 1,5 = 3 m².", "Superficie útil: 51 m².", "51 ÷ 1,5 = 34 placas."],
      ["Calcula el área útil del techo.", "Resta la claraboya.", "Divide entre el área de una placa."],
      {
        intent: "transfer",
        unit: "placas",
        errors: [
          { value: 36, feedback: "Usaste el techo completo: la claraboya no se puede cubrir." },
          { value: 51, feedback: "Esos son metros cuadrados útiles; cada placa ocupa 1,5 m²." },
        ],
      },
    ),
    outcome: "Puedes calcular cercas y superficies a cubrir sin confundir longitudes y áreas.",
    commonErrors: [
      "Confundir área y perímetro.",
      "Olvidar dividir entre 2 en el área del triángulo.",
      "Usar una unidad lineal para un área.",
    ],
  }),
  defineLesson({
    id: "circulo",
    unitId: "geometria",
    title: "Longitud y área del círculo",
    objective:
      "Calcular la longitud de la circunferencia y el área del círculo, e interpretar π como la razón entre la longitud y el diámetro.",
    purpose:
      "Los depósitos y las turbinas son circulares. Para cercarlos o cubrirlos hay que medir su borde y su superficie.",
    prerequisites: ["perimetro-area"],
    legacyModuleIds: ["geometria-d4", "geometria-d6"],
    visual: "circle",
    vocabulary: [
      { term: "Radio (r)", meaning: "Distancia del centro a la circunferencia." },
      { term: "Diámetro (d)", meaning: "Segmento que pasa por el centro: d = 2r." },
      { term: "π", meaning: "Razón entre la longitud de cualquier circunferencia y su diámetro; vale aproximadamente 3,14." },
    ],
    sections: [
      {
        title: "π compara el borde con el diámetro",
        paragraphs: [
          "En cualquier circunferencia, la longitud del borde es un poco más de tres veces su diámetro. Esa razón es π ≈ 3,14.",
          "Por eso L = π × d = 2 × π × r. Con r = 5 m, L ≈ 2 × 3,14 × 5 = 31,4 m.",
        ],
        formula: "L = 2πr = πd",
      },
      {
        title: "El área crece con el cuadrado del radio",
        paragraphs: [
          "El área del círculo es A = π × r². Con r = 5 m, A ≈ 3,14 × 25 = 78,5 m².",
          "Si el radio se duplica, la longitud se duplica pero el área se multiplica por 4.",
        ],
        formula: "A = πr²",
      },
      {
        title: "Radio o diámetro",
        paragraphs: [
          "Muchos errores vienen de usar el diámetro en lugar del radio. Antes de calcular, identifica qué medida te dan y conviértela si hace falta.",
          "Las respuestas con π ≈ 3,14 son aproximadas; en esta clase usaremos 3,14.",
        ],
        formula: "d = 2r;  r = d ÷ 2",
      },
    ],
    examples: [
      ex("Un depósito circular tiene 6 m de diámetro. ¿Cuánto mide su borde?", [
        ["L = π × d", "Nos dan el diámetro."],
        ["3,14 × 6 = 18,84", "Multiplicamos."],
        ["≈ 18,84 m", "Es algo más de tres diámetros."],
      ], "El borde mide unos 18,84 m."),
      ex("¿Qué superficie ocupa ese depósito?", [
        ["r = 6 ÷ 2 = 3 m", "El área usa el radio."],
        ["r² = 9", "Elevamos el radio al cuadrado."],
        ["3,14 × 9 = 28,26 m²", "Multiplicamos por π."],
      ], "Ocupa unos 28,26 m²."),
    ],
    diagnostic: [
      n("d-1", "¿Cuánto es 3,14 × 10?", 31.4, ["Multiplicar por 10 desplaza la coma: 31,4."], ["Multiplicar por 10.", "Desplaza la coma una posición.", "31,4."]),
      n("d-2", "¿Cuánto es 7²?", 49, ["7 × 7 = 49."], ["Un número al cuadrado es por sí mismo.", "7 × 7.", "49."]),
      c("d-3", "Si el diámetro mide 8 cm, ¿cuánto mide el radio?", ["16 cm", "4 cm", "8 cm"], 1, "El radio es la mitad del diámetro."),
    ],
    questions(v) {
      const r = [5, 3, 10, 4, 6, 7][v],
        d = [8, 12, 20, 6, 14, 18][v],
        rr = [7, 9, 4, 8, 5, 11][v],
        [wheel, laps] = [[0.5, 100], [0.3, 200], [0.4, 50], [0.25, 400], [0.6, 30], [0.35, 80]][v],
        [outer, inner] = [[5, 3], [6, 4], [10, 7], [8, 5], [9, 6], [7, 2]][v];
      return [
        v % 2 === 0
          ? c(
              "q0",
              "¿Qué representa π?",
              [
                "La razón entre la longitud de una circunferencia y su diámetro",
                ["El área de un círculo de radio 1 cm²", "Vale lo mismo, pero no es su definición: π compara longitud y diámetro en cualquier círculo."],
                ["Un número que cambia según el círculo", "Es igual para todos los círculos."],
              ],
              0,
              "En cualquier círculo, L ÷ d = π ≈ 3,14.",
            )
          : c(
              "q0",
              "Si el radio de un círculo se duplica, ¿qué ocurre con su área?",
              [
                ["Se duplica", "La longitud se duplica; el área depende del radio al cuadrado."],
                "Se multiplica por 4",
                ["No cambia", "Un círculo más grande cubre más superficie."],
              ],
              1,
              "A = πr²: con 2r, π(2r)² = 4πr².",
            ),
        n(
          "q1",
          `Calcula la longitud de una circunferencia de radio ${r} cm (usa π ≈ 3,14).`,
          r3(2 * PI * r),
          [`L = 2 × 3,14 × ${r} = ${fmt(2 * PI * r)} cm.`],
          ["L = 2πr.", `Multiplica 2 × ${r} = ${2 * r}.`, `3,14 × ${2 * r}.`],
          {
            unit: "cm",
            errors: [
              { value: r3(PI * r), feedback: "Usaste el radio como si fuera el diámetro: L = 2πr." },
              { value: r3(PI * r * r), feedback: "Calculaste el área. La longitud es 2πr." },
            ],
          },
        ),
        n(
          "q2",
          `Completa el área de un círculo de radio ${rr} cm: A = 3,14 × ${rr}² = 3,14 × __.`,
          rr * rr,
          [`${rr}² = ${rr} × ${rr} = ${rr * rr}.`],
          ["Eleva el radio al cuadrado.", `${rr} × ${rr}.`, `${rr * rr}.`],
          { step: true, errors: [{ value: 2 * rr, feedback: "Elevar al cuadrado es multiplicar por sí mismo, no por 2." }] },
        ),
        n(
          "q3",
          `Un círculo tiene ${d} cm de diámetro. ¿Cuál es su área? (π ≈ 3,14)`,
          r3(PI * (d / 2) ** 2),
          [`r = ${d} ÷ 2 = ${d / 2} cm.`, `A = 3,14 × ${d / 2}² = 3,14 × ${(d / 2) ** 2} = ${fmt(PI * (d / 2) ** 2)} cm².`],
          ["El área usa el radio.", `r = ${d / 2}.`, `3,14 × ${(d / 2) ** 2}.`],
          { unit: "cm²", errors: [{ value: r3(PI * d * d), feedback: "Usaste el diámetro en lugar del radio." }] },
        ),
        c(
          "q4",
          `Alguien calcula el área de un círculo de radio ${r} como 3,14 × ${2 * r}. ¿Qué falla?`,
          [
            ["Nada", `3,14 × ${2 * r} es la longitud (πd), no el área.`],
            ["Debía sumar el radio", "No se suma: el área depende del radio al cuadrado."],
            `Multiplicó por el diámetro; el área es 3,14 × ${r}² = ${fmt(PI * r * r)}`,
          ],
          2,
          "Longitud: πd. Área: πr².",
        ),
        n(
          "q5",
          `Una rueda de ${String(wheel).replace(".", ",")} m de radio da ${laps} vueltas. ¿Cuántos metros recorre? (π ≈ 3,14)`,
          r3(2 * PI * wheel * laps),
          [`Una vuelta: 2 × 3,14 × ${String(wheel).replace(".", ",")} = ${fmt(2 * PI * wheel)} m.`, `${laps} vueltas: ${fmt(2 * PI * wheel * laps)} m.`],
          ["Cada vuelta recorre la longitud de la circunferencia.", "Calcula L = 2πr.", `Multiplica por ${laps}.`],
          {
            intent: "transfer",
            unit: "m",
            errors: [{ value: r3(PI * wheel * laps), feedback: "Usaste πr; una vuelta mide 2πr." }],
          },
        ),
        n(
          "q6",
          `Un estanque circular de ${outer} m de radio tiene en el centro una isla circular de ${inner} m de radio. ¿Qué superficie de agua hay? (π ≈ 3,14)`,
          r3(PI * (outer * outer - inner * inner)),
          [`Estanque: 3,14 × ${outer * outer} = ${fmt(PI * outer * outer)} m².`, `Isla: 3,14 × ${inner * inner} = ${fmt(PI * inner * inner)} m².`, `Agua: ${fmt(PI * (outer * outer - inner * inner))} m².`],
          ["Calcula el área del círculo grande.", "Resta el área de la isla.", `3,14 × (${outer}² − ${inner}²).`],
          {
            intent: "transfer",
            unit: "m²",
            errors: [{ value: r3(PI * (outer - inner) ** 2), feedback: `Restaste los radios antes de elevar: ${outer}² − ${inner}² no es (${outer} − ${inner})².` }],
          },
        ),
      ];
    },
    application: n(
      "app",
      "Una turbina circular de 2 m de radio se protege con una malla en el borde y una tapa que cubre su superficie. La malla cuesta 5 créditos por metro y la tapa 3 por m². ¿Cuánto cuesta todo? (π ≈ 3,14)",
      100.48,
      ["Borde: 2 × 3,14 × 2 = 12,56 m → 12,56 × 5 = 62,8.", "Superficie: 3,14 × 4 = 12,56 m² → 12,56 × 3 = 37,68.", "Total: 62,8 + 37,68 = 100,48 créditos."],
      ["Calcula longitud y área por separado.", "Multiplica cada una por su precio.", "Suma ambos costos."],
      {
        intent: "transfer",
        unit: "créditos",
        errors: [
          { value: 62.8, feedback: "Ese es solo el costo de la malla. Falta la tapa." },
          { value: 37.68, feedback: "Ese es solo el costo de la tapa. Falta la malla del borde." },
        ],
      },
    ),
    outcome: "Puedes medir bordes y superficies circulares de turbinas y depósitos.",
    commonErrors: [
      "Usar el diámetro en la fórmula del área.",
      "Confundir 2πr con πr².",
      "Creer que duplicar el radio duplica el área.",
    ],
  }),
  defineLesson({
    id: "volumen",
    unitId: "geometria",
    title: "Volumen de prismas y cilindros",
    objective:
      "Calcular volúmenes como área de la base por altura, convertir entre m³ y litros y resolver problemas de capacidad.",
    purpose:
      "Para saber cuánta agua cabe en los depósitos de la ciudad hay que calcular su volumen y expresarlo en litros.",
    prerequisites: ["circulo"],
    legacyModuleIds: ["geometria-d7", "geometria-d2", "medicion-d4"],
    visual: "volume",
    vocabulary: [
      { term: "Volumen", meaning: "Espacio que ocupa un cuerpo; se mide en unidades cúbicas: cm³, m³." },
      { term: "Capacidad", meaning: "Lo que cabe dentro; 1 dm³ = 1 L y 1 m³ = 1000 L." },
    ],
    sections: [
      {
        title: "Capas iguales",
        paragraphs: [
          "Un prisma rectangular de 4 × 3 × 2 cm tiene 4 × 3 = 12 cubitos en la base y 2 capas: 24 cm³.",
          "En general, V = área de la base × altura, para cualquier prisma o cilindro.",
        ],
        formula: "V = A(base) × h",
      },
      {
        title: "El cilindro",
        paragraphs: [
          "La base de un cilindro es un círculo: V = πr² × h. Con r = 1 m y h = 3 m, V ≈ 3,14 × 1 × 3 = 9,42 m³.",
          "Duplicar la altura duplica el volumen; duplicar el radio lo multiplica por 4.",
        ],
        formula: "V = πr²h",
      },
      {
        title: "Litros y metros cúbicos",
        paragraphs: [
          "1 L ocupa 1 dm³. Como 1 m = 10 dm, 1 m³ = 10 × 10 × 10 = 1000 dm³ = 1000 L.",
          "Convierte al final o al principio, pero mantén las mismas unidades en todas las medidas.",
        ],
        formula: "1 m³ = 1000 L;  1 dm³ = 1 L",
      },
    ],
    examples: [
      ex("Un depósito mide 2 m × 1,5 m × 1 m. ¿Cuántos litros caben?", [
        ["A(base) = 2 × 1,5 = 3 m²", "Área de la base."],
        ["V = 3 × 1 = 3 m³", "Por la altura."],
        ["3 × 1000 = 3000 L", "1 m³ = 1000 L."],
      ], "Caben 3000 L."),
      ex("Un tanque cilíndrico tiene radio 2 m y altura 5 m. ¿Qué volumen tiene? (π ≈ 3,14)", [
        ["A(base) = 3,14 × 4 = 12,56 m²", "La base es un círculo."],
        ["V = 12,56 × 5 = 62,8 m³", "Por la altura."],
        ["62,8 m³ = 62 800 L", "Convertimos a litros."],
      ], "El tanque tiene 62,8 m³."),
    ],
    diagnostic: [
      n("d-1", "¿Cuánto es 5 × 4 × 3?", 60, ["5 × 4 = 20; 20 × 3 = 60."], ["Multiplica de dos en dos.", "5 × 4 = 20.", "60."]),
      n("d-2", "Área de un círculo de radio 3 (π ≈ 3,14).", 28.26, ["3,14 × 9 = 28,26."], ["A = πr².", "3² = 9.", "3,14 × 9."]),
      c("d-3", "¿Qué unidad mide un volumen?", ["cm", "cm²", "cm³"], 2, "Los volúmenes se miden en unidades cúbicas."),
    ],
    questions(v) {
      const [l, w, h] = [[4, 3, 2], [6, 5, 3], [8, 4, 5], [7, 2, 6], [5, 5, 4], [9, 3, 2]][v],
        [cr, ch] = [[1, 3], [4, 5], [3, 2], [1, 7], [5, 4], [3, 3]][v],
        [m3] = [[2], [3.5], [0.8], [4.2], [1.5], [6]][v],
        [tl, tw, target] = [[2, 1.5, 6], [4, 2, 12], [3, 2.5, 15], [5, 2, 25], [2.5, 2, 8], [4, 3, 18]][v];
      return [
        v % 2 === 0
          ? c(
              "q0",
              "¿Por qué el volumen de un prisma es área de la base × altura?",
              [
                "Porque el prisma está formado por capas iguales a la base, tantas como indica la altura",
                ["Porque se suman todas sus aristas", "Sumar aristas da una longitud, no un volumen."],
                ["Porque es la mitad de un cubo", "No: cualquier prisma se forma apilando su base."],
              ],
              0,
              "Cada capa tiene el área de la base; la altura cuenta cuántas capas hay.",
            )
          : c(
              "q0",
              "Si se duplica la altura de un cilindro y el radio no cambia, ¿qué pasa con su volumen?",
              [
                ["Se multiplica por 4", "Eso ocurre al duplicar el radio."],
                "Se duplica",
                ["Se multiplica por 8", "Eso ocurriría al duplicar todas las dimensiones de un cubo."],
              ],
              1,
              "V = πr²h es proporcional a la altura.",
            ),
        n(
          "q1",
          `Calcula el volumen de un prisma de ${l} cm × ${w} cm × ${h} cm.`,
          l * w * h,
          [`Base: ${l} × ${w} = ${l * w} cm².`, `V = ${l * w} × ${h} = ${l * w * h} cm³.`],
          ["Calcula el área de la base.", "Multiplica por la altura.", `${l} × ${w} × ${h}.`],
          { unit: "cm³", errors: [{ value: 2 * (l * w + l * h + w * h), feedback: "Calculaste la superficie exterior, no el volumen." }] },
        ),
        n(
          "q2",
          `Completa: ${String(m3).replace(".", ",")} m³ = __ litros.`,
          m3 * 1000,
          [`1 m³ = 1000 L; ${String(m3).replace(".", ",")} × 1000 = ${fmt(m3 * 1000)} L.`],
          ["1 m³ = 1000 L.", "Multiplica por 1000.", `${fmt(m3 * 1000)}.`],
          { step: true, unit: "L", errors: [{ value: m3 * 100, feedback: "1 m³ son 10 × 10 × 10 = 1000 dm³, no 100." }] },
        ),
        n(
          "q3",
          `Un cilindro tiene radio ${cr} m y altura ${ch} m. ¿Cuál es su volumen? (π ≈ 3,14)`,
          r3(PI * cr * cr * ch),
          [`Base: 3,14 × ${cr * cr} = ${fmt(PI * cr * cr)} m².`, `V = ${fmt(PI * cr * cr)} × ${ch} = ${fmt(PI * cr * cr * ch)} m³.`],
          ["La base es un círculo.", "Calcula πr².", `Multiplica por ${ch}.`],
          { unit: "m³", errors: [{ value: r3(2 * PI * cr * ch), feedback: "Usaste la longitud de la circunferencia (2πr) en lugar del área de la base." }] },
        ),
        c(
          "q4",
          `Un depósito mide ${l} dm × ${w} dm × ${h} cm. Alguien multiplica ${l} × ${w} × ${h}. ¿Qué falla?`,
          [
            ["Nada", "Las medidas están en unidades distintas."],
            `Mezcla dm y cm: hay que pasar ${h} cm a ${fmt(h / 10)} dm antes de multiplicar`,
            ["Debía sumar las medidas", "El volumen es un producto, no una suma."],
          ],
          1,
          "Todas las medidas deben estar en la misma unidad.",
        ),
        n(
          "q5",
          `Un depósito rectangular mide ${l} dm × ${w} dm × ${h} dm. ¿Cuántos litros caben?`,
          l * w * h,
          [`V = ${l} × ${w} × ${h} = ${l * w * h} dm³.`, `1 dm³ = 1 L: caben ${l * w * h} L.`],
          ["Calcula el volumen en dm³.", "1 dm³ = 1 L.", `${l} × ${w} × ${h}.`],
          { intent: "transfer", unit: "L", errors: [{ value: l * w * h * 1000, feedback: "1 dm³ ya es 1 L: no hace falta multiplicar por 1000." }] },
        ),
        n(
          "q6",
          `Un depósito rectangular tiene base de ${String(tl).replace(".", ",")} m × ${String(tw).replace(".", ",")} m. ¿Qué altura de agua hay cuando contiene ${target} m³?`,
          r3(target / (tl * tw)),
          [`Área de la base: ${fmt(tl * tw)} m².`, `h = ${target} ÷ ${fmt(tl * tw)} = ${fmt(target / (tl * tw))} m.`],
          ["V = área de la base × altura.", "Ahora se conoce V y se busca h.", "Divide el volumen entre el área de la base."],
          {
            intent: "transfer",
            unit: "m",
            errors: [{ value: r3(target * tl * tw), feedback: "Multiplicaste; para hallar la altura se divide el volumen entre el área de la base." }],
          },
        ),
      ];
    },
    application: n(
      "app",
      "Un tanque cilíndrico de 1 m de radio y 2 m de altura está lleno. Su agua se pasa a bidones de 20 L. ¿Cuántos bidones se llenan completos? (π ≈ 3,14)",
      314,
      ["V = 3,14 × 1² × 2 = 6,28 m³.", "6,28 m³ = 6280 L.", "6280 ÷ 20 = 314 bidones."],
      ["Calcula el volumen del cilindro.", "Conviértelo a litros.", "Divide entre 20."],
      {
        intent: "transfer",
        unit: "bidones",
        errors: [
          { value: 0.314, feedback: "Olvidaste convertir m³ a litros: 1 m³ = 1000 L." },
          { value: 628, feedback: "Usaste bidones de 10 L o duplicaste: cada bidón tiene 20 L." },
        ],
      },
    ),
    outcome: "Puedes calcular cuánta agua cabe en los depósitos y expresarla en litros.",
    commonErrors: [
      "Confundir volumen con superficie exterior.",
      "Mezclar unidades distintas en un mismo cálculo.",
      "Creer que 1 m³ son 100 litros.",
    ],
  }),
  defineLesson({
    id: "pitagoras",
    unitId: "geometria",
    title: "Teorema de Pitágoras",
    objective:
      "Usar el teorema de Pitágoras para calcular lados de triángulos rectángulos y distancias, y comprobar si un triángulo es rectángulo.",
    purpose:
      "Para tender un cable en diagonal o calcular la longitud de una rampa hay que relacionar los lados de un triángulo rectángulo.",
    prerequisites: ["potencias-raices", "perimetro-area"],
    legacyModuleIds: ["geometria-d9", "geometria-d8"],
    visual: "pythagoras",
    vocabulary: [
      { term: "Catetos", meaning: "Los dos lados que forman el ángulo recto." },
      { term: "Hipotenusa", meaning: "El lado opuesto al ángulo recto; es el más largo." },
    ],
    sections: [
      {
        title: "Áreas sobre los lados",
        paragraphs: [
          "En un triángulo rectángulo, el cuadrado construido sobre la hipotenusa tiene la misma área que los dos cuadrados de los catetos juntos: c² = a² + b².",
          "Con catetos 3 y 4 → 9 + 16 = 25, y la hipotenusa mide √25 = 5.",
        ],
        formula: "c² = a² + b²",
      },
      {
        title: "Hallar un cateto",
        paragraphs: [
          "Si conoces la hipotenusa y un cateto, resta: a² = c² − b². Con c = 13 y b = 5 → 169 − 25 = 144, a = 12.",
          "La hipotenusa siempre es el lado mayor: si te da un cateto más largo que la hipotenusa, revisa las cuentas.",
        ],
        formula: "a² = c² − b²",
      },
      {
        title: "Solo para triángulos rectángulos",
        paragraphs: [
          "El teorema solo vale con un ángulo recto. Al revés también funciona: si a² + b² = c², el triángulo es rectángulo.",
          "Sirve para distancias en una cuadrícula: de (0, 0) a (6, 8) hay √(36 + 64) = 10 unidades.",
        ],
        formula: "6² + 8² = 10²",
      },
    ],
    examples: [
      ex("Una rampa sube 1,2 m y avanza 1,6 m en horizontal. ¿Cuánto mide la rampa?", [
        ["1,2² + 1,6² = 1,44 + 2,56", "Los catetos son la altura y el avance."],
        ["= 4", "Suma de los cuadrados."],
        ["√4 = 2 m", "La rampa es la hipotenusa."],
      ], "La rampa mide 2 m."),
      ex("Una escalera de 10 m apoyada en una pared tiene el pie a 6 m. ¿A qué altura llega?", [
        ["h² = 10² − 6²", "La escalera es la hipotenusa."],
        ["h² = 100 − 36 = 64", "Restamos los cuadrados."],
        ["h = 8 m", "Comprobación: 36 + 64 = 100."],
      ], "Llega a 8 m de altura."),
    ],
    diagnostic: [
      n("d-1", "¿Cuánto es 9²?", 81, ["9 × 9 = 81."], ["Multiplica 9 por sí mismo.", "9 × 9.", "81."]),
      n("d-2", "¿Cuánto es √100?", 10, ["10 × 10 = 100."], ["¿Qué número al cuadrado da 100?", "Prueba con 10.", "10."]),
      c("d-3", "¿Qué tipo de ángulo mide 90°?", ["Agudo", "Recto", "Obtuso"], 1, "Un ángulo de 90° es recto."),
    ],
    questions(v) {
      const [a, b, cc] = [[3, 4, 5], [6, 8, 10], [5, 12, 13], [8, 15, 17], [9, 12, 15], [7, 24, 25]][v],
        [ka, kc] = [[12, 13], [8, 10], [15, 17], [9, 15], [20, 25], [16, 20]][v],
        [px, py] = [[6, 8], [9, 12], [5, 12], [8, 15], [12, 16], [7, 24]][v],
        [s1, s2, s3, isRight] = ([[5, 12, 13, true], [6, 7, 9, false], [9, 40, 41, true], [4, 6, 8, false], [10, 24, 26, true], [5, 9, 11, false]] as [number, number, number, boolean][])[v];
      return [
        v % 2 === 0
          ? c(
              "q0",
              "¿Qué afirma el teorema de Pitágoras?",
              [
                "En un triángulo rectángulo, el cuadrado de la hipotenusa es la suma de los cuadrados de los catetos",
                ["En cualquier triángulo, la suma de dos lados es el tercero", "Eso no es cierto en ningún triángulo."],
                ["La hipotenusa es la suma de los catetos", "Se suman sus cuadrados, no sus longitudes."],
              ],
              0,
              "c² = a² + b², solo en triángulos rectángulos.",
            )
          : c(
              "q0",
              "¿Cuál es la hipotenusa de un triángulo rectángulo?",
              [
                ["Cualquier lado", "Es un lado concreto: el opuesto al ángulo recto."],
                ["El lado más corto", "Es el más largo."],
                "El lado opuesto al ángulo recto, que es el más largo",
              ],
              2,
              "La hipotenusa no forma parte del ángulo recto.",
            ),
        n(
          "q1",
          `Los catetos de un triángulo rectángulo miden ${a} cm y ${b} cm. ¿Cuánto mide la hipotenusa?`,
          cc,
          [`${a}² + ${b}² = ${a * a} + ${b * b} = ${cc * cc}.`, `√${cc * cc} = ${cc} cm.`],
          ["Eleva cada cateto al cuadrado.", "Suma los cuadrados.", "Calcula la raíz."],
          { unit: "cm", errors: [{ value: a + b, feedback: "Sumaste los catetos. Se suman sus cuadrados y después se calcula la raíz." }, { value: cc * cc, feedback: "Falta calcular la raíz cuadrada." }] },
        ),
        n(
          "q2",
          `Completa: ${a}² + ${b}² = __.`,
          cc * cc,
          [`${a * a} + ${b * b} = ${cc * cc}.`],
          ["Calcula cada cuadrado.", `${a}² = ${a * a}.`, `${a * a} + ${b * b}.`],
          { step: true, errors: [{ value: (a + b) ** 2, feedback: "Elevaste la suma; hay que sumar los cuadrados." }] },
        ),
        n(
          "q3",
          `La hipotenusa mide ${kc} m y un cateto ${ka} m. ¿Cuánto mide el otro cateto?`,
          Math.sqrt(kc * kc - ka * ka),
          [`${kc}² − ${ka}² = ${kc * kc} − ${ka * ka} = ${kc * kc - ka * ka}.`, `√${kc * kc - ka * ka} = ${Math.sqrt(kc * kc - ka * ka)} m.`],
          ["La hipotenusa es el lado mayor.", "Resta los cuadrados.", "Calcula la raíz."],
          { unit: "m", errors: [{ value: Math.sqrt(kc * kc + ka * ka), feedback: "Sumaste los cuadrados: si conoces la hipotenusa, hay que restar." }] },
        ),
        c(
          "q4",
          `¿Es rectángulo un triángulo de lados ${s1}, ${s2} y ${s3}?`,
          isRight
            ? [`Sí: ${s1}² + ${s2}² = ${s1 * s1 + s2 * s2} = ${s3}²`, [`No: ${s1} + ${s2} ≠ ${s3}`, "Se comparan los cuadrados, no los lados."], ["No se puede saber sin medir los ángulos", "El recíproco del teorema permite saberlo con los lados."]]
            : [[`Sí: ${s1} + ${s2} > ${s3}`, "Eso solo indica que el triángulo existe."], `No: ${s1}² + ${s2}² = ${s1 * s1 + s2 * s2} ≠ ${s3 * s3} = ${s3}²`, ["No se puede saber sin medir los ángulos", "El recíproco del teorema permite saberlo con los lados."]],
          isRight ? 0 : 1,
          "Un triángulo es rectángulo si el cuadrado del lado mayor es la suma de los otros dos cuadrados.",
        ),
        n(
          "q5",
          `Un cable va desde lo alto de un poste de ${a} m hasta un punto del suelo a ${b} m de la base. ¿Cuánto mide el cable?`,
          cc,
          [`Catetos ${a} y ${b} → ${a * a} + ${b * b} = ${cc * cc}.`, `Cable: √${cc * cc} = ${cc} m.`],
          ["El poste y el suelo forman un ángulo recto.", "El cable es la hipotenusa.", "Usa c² = a² + b²."],
          { intent: "transfer", unit: "m", errors: [{ value: a + b, feedback: "El cable no es la suma de las distancias: es la hipotenusa." }] },
        ),
        n(
          "q6",
          `En un mapa con cuadrícula, la radio está en (0, 0) y el hospital en (${px}, ${py}). ¿Qué distancia en línea recta los separa?`,
          Math.sqrt(px * px + py * py),
          [`Desplazamientos: ${px} en horizontal y ${py} en vertical.`, `√(${px * px} + ${py * py}) = √${px * px + py * py} = ${Math.sqrt(px * px + py * py)}.`],
          ["Los desplazamientos horizontal y vertical forman un ángulo recto.", "La distancia es la hipotenusa.", `√(${px}² + ${py}²).`],
          {
            intent: "transfer",
            errors: [{ value: px + py, feedback: "Esa es la distancia siguiendo la cuadrícula. En línea recta es la hipotenusa." }],
          },
        ),
      ];
    },
    application: n(
      "app",
      "Una pantalla rectangular mide 48 cm de ancho y 36 cm de alto. Se anuncia por su diagonal en pulgadas (1 pulgada ≈ 2,5 cm). ¿Cuántas pulgadas mide?",
      24,
      ["Diagonal: √(48² + 36²) = √(2304 + 1296) = √3600 = 60 cm.", "60 ÷ 2,5 = 24 pulgadas."],
      ["La diagonal es la hipotenusa de un triángulo rectángulo.", "Calcula √(48² + 36²).", "Convierte cm a pulgadas."],
      {
        intent: "transfer",
        unit: "pulgadas",
        errors: [
          { value: 60, feedback: "60 son centímetros: conviértelos a pulgadas." },
          { value: 33.6, feedback: "Sumaste ancho y alto: la diagonal es la hipotenusa." },
        ],
      },
    ),
    outcome: "Puedes calcular cables, rampas y distancias en línea recta.",
    commonErrors: [
      "Sumar los lados en lugar de sus cuadrados.",
      "Sumar los cuadrados cuando se busca un cateto.",
      "Aplicar el teorema a triángulos que no son rectángulos.",
    ],
  }),
];
