import { defineLesson } from "./defineLesson";
import { choice as c, example as ex, numeric as n } from "./questions";
import type { Lesson } from "./types";

export const PROPORTIONALITY_LESSONS: Lesson[] = [
  defineLesson({
    id: "razones",
    unitId: "proporcionalidad",
    title: "Comparar cantidades con razones",
    objective:
      "Interpretar una razón entre dos cantidades y distinguirla de una parte del total.",
    purpose:
      "El taller necesita combinar dos tipos de componentes sin cambiar su proporción, aunque aumente el pedido.",
    prerequisites: ["fracciones-equivalentes", "fraccion-cantidad"],
    legacyModuleIds: ["algebra-d5"],
    visual: "ratio",
    vocabulary: [
      {
        term: "Razón",
        meaning:
          "Comparación multiplicativa de dos cantidades, en un orden indicado.",
      },
      {
        term: "Razón parte-parte",
        meaning: "Compara dos partes entre sí; el total es la suma de ambas.",
      },
    ],
    sections: [
      {
        title: "Di qué comparas y en qué orden",
        paragraphs: [
          "Una razón de 2 baterías azules por cada 3 verdes se escribe azules:verdes = 2:3. Invertir el orden cambia el significado.",
          "La razón 2:3 compara las partes entre sí. La fracción de azules respecto del total es 2/(2 + 3) = 2/5.",
        ],
        formula: "Azules:verdes = 2:3; azules/total = 2/5",
      },
      {
        title: "Escalar conserva la composición",
        paragraphs: [
          "Para fabricar el doble de conjuntos, duplica ambas cantidades. Pasar de 2:3 a 4:6 conserva la razón.",
          "Sumar lo mismo a ambas cantidades no suele conservarla: 2:3 y 4:5 describen composiciones distintas.",
        ],
        formula: "2:3 = 4:6 = 6:9",
      },
      {
        title: "Reconstruye las partes desde el total",
        paragraphs: [
          "En una mezcla 2:3, cada conjunto tiene cinco piezas: dos azules y tres verdes. Si hay 20 piezas, caben cuatro conjuntos.",
          "Multiplica cada cantidad de la razón por el número de conjuntos. Comprueba al final tanto la suma como la razón.",
        ],
        formula: "20 ÷ (2 + 3) = 4; azules = 2 × 4 = 8",
      },
    ],
    examples: [
      ex(
        "En una caja hay 3 cables rojos por cada 2 negros. Si hay 12 rojos, ¿cuántos negros hay?",
        [
          [
            "12 ÷ 3 = 4 conjuntos",
            "La cantidad de rojos se multiplicó por cuatro.",
          ],
          ["2 × 4 = 8 negros", "Aplicamos el mismo factor a los negros."],
          [
            "12:8 = 3:2",
            "Dividir ambos términos entre cuatro comprueba la razón.",
          ],
        ],
        "Hay 8 cables negros y 20 en total.",
      ),
      ex(
        "Una caja de 35 piezas mantiene la razón rojas:negras = 3:2. ¿Cuántas son rojas?",
        [
          ["3 + 2 = 5 partes", "La razón compara dos partes del total."],
          [
            "35 ÷ 5 = 7 piezas por parte",
            "Repartimos el total según las cinco partes de la composición.",
          ],
          [
            "3 × 7 = 21 rojas",
            "Tomamos las tres partes que corresponden a las rojas.",
          ],
        ],
        "Las otras 14 son negras; 21 + 14 = 35 y 21:14 = 3:2.",
      ),
      ex(
        "La mezcla A tiene 2 azules por cada 3 verdes; la B, 3 azules por cada 5 verdes. ¿Cuál es más azul?",
        [
          ["A: 2/5; B: 3/8", "Comparamos la parte azul respecto del total de cada mezcla."],
          ["2/5 = 16/40; 3/8 = 15/40", "Un denominador común hace comparables las partes."],
          ["16/40 > 15/40", "La mezcla A tiene mayor proporción de azul."],
        ],
        "Para comparar razones no basta mirar qué mezcla tiene más azul en cantidad: se compara la proporción.",
      ),
    ],
    diagnostic: [
      n(
        "d-1",
        "Completa: 2/3 = __/12.",
        8,
        ["3 × 4 = 12; 2 × 4 = 8."],
        ["Busca el factor del denominador.", "El factor es 4.", "2 × 4 = 8."],
        { step: true },
      ),
      n(
        "d-2",
        "Si hay 8 piezas azules y 12 verdes, ¿cuántas hay en total?",
        20,
        ["8 + 12 = 20."],
        ["El total reúne los dos tipos.", "Suma 8 y 12.", "El total es 20."],
      ),
      c(
        "d-3",
        "¿Qué operación conserva una fracción?",
        [
          "Sumar 2 a ambos términos",
          "Multiplicar ambos términos por 2",
          "Multiplicar solo el numerador",
        ],
        1,
        "El mismo factor multiplicativo conserva la razón.",
      ),
    ],
    questions(v) {
      const [a, b, k] = [[2, 3, 4], [3, 5, 3], [2, 7, 3], [5, 2, 3], [3, 4, 5], [4, 7, 2]][v],
        // Dos mezclas azules:verdes cuya proporción de azules hay que comparar.
        [p, q, r, s] = [[3, 4, 2, 3], [2, 3, 3, 5], [3, 2, 5, 3], [5, 6, 4, 5], [3, 4, 4, 5], [2, 5, 3, 7]][v],
        shareA = p / (p + q),
        shareB = r / (r + s),
        best = Math.max(shareA, shareB);
      return [
        c(
          "q0",
          `La razón azules:verdes es ${a}:${b}. ¿Qué significa?`,
          [
            [`Hay ${a} azules en total`, `La razón no dice cuántas hay en total: compara ${a} azules con ${b} verdes en cada grupo.`],
            `Hay ${a} azules por cada ${b} verdes`,
            [`Hay ${b} azules por cada ${a} verdes`, "Invertiste el orden: el primer número corresponde al primer nombre, azules."],
          ],
          1,
          "El orden de los nombres fija el orden de los números; la razón compara ambas cantidades.",
        ),
        n(
          "q1",
          `Por cada ${a} cables rojos hay ${b} negros. Si hay ${a * k} rojos, ¿cuántos negros corresponden?`,
          b * k,
          [
            `El factor es ${a * k} ÷ ${a} = ${k}.`,
            `Negros: ${b} × ${k} = ${b * k}.`,
          ],
          [
            "Busca cuántas veces aumentó la primera cantidad.",
            `La cantidad de rojos se multiplicó por ${k}.`,
            `Multiplica ${b} por ${k}.`,
          ],
          {
            errors: [
              {
                value: b + (a * k - a),
                feedback: `Sumaste la misma cantidad a ambos términos. La razón se conserva multiplicando: los rojos se multiplicaron por ${k}.`,
              },
            ],
          },
        ),
        n(
          "q2",
          `Completa: ${a}:${b} = ${a * k}:__.`,
          b * k,
          [`Multiplica ambos términos por ${k}: ${b} × ${k} = ${b * k}.`],
          [
            "Una razón equivalente conserva el factor entre ambas cantidades.",
            `El primer término se multiplicó por ${k}.`,
            `El segundo será ${b * k}.`,
          ],
          {
            step: true,
            errors: [
              { value: b + (a * k - a), feedback: "Sumar la misma cantidad no conserva la razón: multiplica ambos términos por el mismo factor." },
            ],
          },
        ),
        n(
          "q3",
          `La razón azules:verdes es ${a}:${b}. ¿Qué fracción del total es azul?`,
          a / (a + b),
          [
            `El total de un conjunto es ${a} + ${b} = ${a + b}.`,
            `La parte azul es ${a}/${a + b}.`,
          ],
          [
            "La razón compara partes, pero se pregunta por el total.",
            `Suma ${a} y ${b} para formar el denominador.`,
            `La fracción azul es ${a}/${a + b}.`,
          ],
          {
            errors: [
              { value: a / b, feedback: `${a}/${b} compara azules con verdes. El total de cada conjunto tiene ${a + b} piezas.` },
            ],
          },
        ),
        v % 2 === 0
          ? c(
              "q4",
              `¿Por qué la fracción azul del total de una mezcla ${a}:${b} es ${a}/${a + b}?`,
              [
                "El total se forma sumando ambas partes",
                ["El total siempre es el segundo número", `El ${b} cuenta solo las verdes; el total incluye también las azules.`],
                ["Se invierte la razón", `Invertir daría ${b}:${a}, que compara verdes con azules.`],
              ],
              0,
              `El total de un conjunto contiene ${a} piezas azules y ${b} verdes: ${a + b} piezas.`,
            )
          : c(
              "q4",
              `Un compañero amplía la mezcla ${a}:${b} a ${a + 2}:${b + 2} y dice que conserva el color. ¿Qué responde?`,
              [
                ["Tiene razón: añadió lo mismo de cada color", `Añadir 2 de cada uno cambia la proporción: ${a}/${a + b} ≠ ${a + 2}/${a + b + 4}.`],
                `No: para conservar el color debe multiplicar ambos, por ejemplo ${2 * a}:${2 * b}`,
                ["Solo cambia si los números son impares", "La paridad no importa: sumar la misma cantidad cambia la razón en general."],
              ],
              1,
              "Una razón se conserva multiplicando ambos términos por el mismo factor, no sumando.",
            ),
        n(
          "q5",
          `El taller recibe ${(a + b) * k} componentes con razón sensores:antenas = ${a}:${b}. ¿Cuántos sensores recibe?`,
          a * k,
          [
            `Un conjunto tiene ${a + b} componentes.`,
            `Hay ${(a + b) * k} ÷ ${a + b} = ${k} conjuntos; sensores = ${a} × ${k} = ${a * k}.`,
          ],
          [
            "Suma los términos de la razón para identificar un conjunto.",
            `Divide el total entre ${a + b}.`,
            `Multiplica los ${k} conjuntos por ${a} sensores.`,
          ],
          {
            intent: "transfer",
            errors: [
              { value: ((a + b) * k) / a, feedback: `Dividiste entre ${a}, pero cada conjunto tiene ${a + b} componentes.` },
            ],
          },
        ),
        n(
          "q6",
          `La mezcla A tiene ${p} litros azules por cada ${q} verdes; la B, ${r} azules por cada ${s} verdes. ¿Cuál tiene mayor proporción de azul? Escribe la fracción azul del total de esa mezcla.`,
          best,
          [
            `A: ${p}/(${p} + ${q}) = ${p}/${p + q}. B: ${r}/(${r} + ${s}) = ${r}/${r + s}.`,
            `Con denominador común ${(p + q) * (r + s)}: ${p * (r + s)} frente a ${r * (p + q)}; la mayor es ${best === shareA ? `${p}/${p + q}` : `${r}/${r + s}`}.`,
          ],
          [
            "Compara la parte azul respecto del total de cada mezcla, no las cantidades sueltas.",
            `Escribe ${p}/${p + q} y ${r}/${r + s}.`,
            "Llévalas a un denominador común o a decimal y compara.",
          ],
          {
            intent: "transfer",
            errors: [
              { value: Math.min(shareA, shareB), feedback: "Esa mezcla tiene menor proporción de azul. Compara ambas fracciones con un denominador común." },
              { value: best === shareA ? p / q : r / s, feedback: "Esa es la razón azul:verde. Se pide la fracción azul del total." },
            ],
          },
        ),
      ];
    },
    application: n(
      "app",
      "Una pintura se mezcla con 3 litros de azul por cada 2 de blanco. Hay 18 litros de azul y 10 de blanco. Sin cambiar la razón, ¿cuántos litros de mezcla se pueden preparar como máximo?",
      25,
      [
        "Cada conjunto usa 3 L de azul y 2 L de blanco: 5 L de mezcla.",
        "El azul alcanza para 18 ÷ 3 = 6 conjuntos; el blanco, para 10 ÷ 2 = 5. Limita el blanco.",
        "5 conjuntos × 5 L = 25 litros (15 L de azul y 10 de blanco).",
      ],
      [
        "Piensa en conjuntos de 3 azules y 2 blancos.",
        "Calcula para cuántos conjuntos alcanza cada color.",
        "El color que se acaba antes decide cuántos conjuntos hay.",
      ],
      {
        intent: "transfer",
        unit: "litros",
        errors: [
          { value: 28, feedback: "Sumaste toda la pintura, pero así la razón no sería 3:2. Busca qué color se acaba antes." },
          { value: 30, feedback: "Para 6 conjuntos harían falta 12 L de blanco y solo hay 10." },
        ],
      },
    ),
    outcome:
      "El taller puede aumentar sus pedidos manteniendo la composición de cada conjunto.",
    commonErrors: [
      "Confundir una razón parte-parte con una fracción del total.",
      "Invertir el orden de las cantidades.",
      "Sumar el mismo número en lugar de multiplicar por el mismo factor.",
    ],
  }),
  defineLesson({
    id: "tasa-unitaria",
    unitId: "proporcionalidad",
    title: "Encontrar el valor por unidad",
    objective:
      "Calcular e interpretar una tasa unitaria para comparar alternativas con distintas cantidades.",
    purpose:
      "Los proveedores ofrecen paquetes de tamaños diferentes. El precio por unidad permite compararlos con el mismo criterio.",
    prerequisites: ["razones"],
    legacyModuleIds: ["algebra-d5", "medicion-d4"],
    visual: "rate",
    vocabulary: [
      {
        term: "Tasa",
        meaning:
          "Razón entre cantidades que pueden tener unidades diferentes, como kilómetros y horas.",
      },
      {
        term: "Tasa unitaria",
        meaning: "Cantidad que corresponde a una unidad de la otra magnitud.",
      },
    ],
    sections: [
      {
        title: "Lleva la comparación a una unidad",
        paragraphs: [
          "Si cuatro sensores cuestan 20 créditos y todos tienen el mismo precio, cada uno cuesta 20 ÷ 4 = 5 créditos.",
          "El número por sí solo no basta: escribir 5 créditos/sensor distingue el precio unitario de la cantidad de sensores.",
        ],
        formula: "Precio unitario = precio total ÷ cantidad",
      },
      {
        title: "Compara usando la misma unidad",
        paragraphs: [
          "Un paquete más barato en total puede costar más por pieza. Calcula el precio unitario de cada oferta antes de comparar.",
          "Para comparar velocidades, usa unidades compatibles: metros por minuto con metros por minuto, o convierte antes de comparar.",
        ],
        formula: "20 créditos / 4 sensores = 5 créditos/sensor",
      },
      {
        title: "Usa la tasa y revisa la hipótesis",
        paragraphs: [
          "Si el precio por sensor se mantiene, seis sensores cuestan 6 × 5 = 30 créditos.",
          "Una tarifa con cargo fijo o descuentos por cantidad puede cambiar la relación. En esos casos, revisa la oferta completa antes de aplicar la misma tasa a otro pedido.",
        ],
        formula: "Costo = cantidad × precio por unidad",
      },
    ],
    examples: [
      ex(
        "Oferta A: 6 sensores por 30 créditos. Oferta B: 4 por 24. ¿Cuál cuesta menos por sensor?",
        [
          [
            "A: 30 ÷ 6 = 5 créditos/sensor",
            "Repartimos el precio entre las seis unidades.",
          ],
          [
            "B: 24 ÷ 4 = 6 créditos/sensor",
            "Expresamos la segunda oferta con la misma unidad.",
          ],
          [
            "5 < 6",
            "Comparamos los precios por sensor, no los precios totales.",
          ],
        ],
        "A tiene menor precio unitario, aunque su paquete cueste más.",
      ),
      ex(
        "Un vehículo recorre 150 km en 3 horas a velocidad constante. ¿Cuánto recorre en 5 horas?",
        [
          [
            "150 ÷ 3 = 50 km/h",
            "Calculamos la distancia que corresponde a una hora.",
          ],
          ["50 × 5 = 250 km", "Tomamos cinco horas a la misma velocidad."],
          ["250 ÷ 5 = 50 km/h", "La comprobación conserva la tasa."],
        ],
        "Recorre 250 km si mantiene la velocidad y no hay paradas.",
      ),
    ],
    diagnostic: [
      n(
        "d-1",
        "¿Cuánto es 24 ÷ 6?",
        4,
        ["6 × 4 = 24."],
        [
          "Busca el valor de cada grupo.",
          "Seis grupos iguales suman 24.",
          "Cada grupo vale 4.",
        ],
      ),
      c(
        "d-2",
        "¿Qué compara 60 kilómetros por hora?",
        ["Distancia con tiempo", "Distancia con precio", "Tiempo con masa"],
        0,
        "km/h relaciona distancia recorrida con tiempo.",
      ),
      n(
        "d-3",
        "Cuatro grupos tienen 3 piezas cada uno. ¿Cuántas piezas hay?",
        12,
        ["4 × 3 = 12."],
        ["Son grupos iguales.", "Suma cuatro veces 3.", "El total es 12."],
      ),
    ],
    questions(v) {
      const [count, rate] = [[4, 5], [3, 8], [6, 4], [5, 7], [8, 3], [7, 6]][v],
        cost = count * rate,
        order = [7, 5, 9, 4, 11, 10][v],
        [hours, speed] = [[3, 40], [4, 15], [2, 55], [5, 12], [6, 25], [3, 70]][v],
        // Dos ofertas: unidades y precio de cada una.
        [n1, p1, n2, p2] = [[6, 30, 4, 24], [5, 40, 8, 56], [3, 27, 5, 40], [10, 45, 4, 20], [12, 30, 5, 15], [8, 36, 6, 30]][v],
        unitA = p1 / n1,
        unitB = p2 / n2,
        cheaper = Math.min(unitA, unitB),
        dec = (x: number) => x.toLocaleString("es");
      const concept = [
        c(
          "q4",
          "¿Qué comparación permite elegir el menor precio por sensor?",
          [
            ["Comparar solo el precio total de paquetes distintos", "Un paquete puede costar más en total y menos por unidad: hay que repartir el precio."],
            "Expresar las dos ofertas en créditos por sensor",
            ["Elegir siempre el paquete más pequeño", "El tamaño del paquete no decide: decide el precio de cada unidad."],
          ],
          1,
          "Las tasas deben tener la misma unidad para que la comparación tenga sentido.",
        ),
        c(
          "q4",
          `Un dron A recorre 300 metros por minuto y un dron B, 15 kilómetros por hora. ¿Qué hay que hacer antes de compararlos?`,
          [
            ["Nada: 300 es mayor que 15", "Los números están en unidades distintas y no se pueden comparar directamente."],
            "Expresar ambas velocidades en la misma unidad",
            ["Sumar las dos velocidades", "Sumar no compara; además las unidades son distintas."],
          ],
          1,
          "300 m/min = 18 km/h: solo con la misma unidad se ve que A es más rápido.",
        ),
        c(
          "q4",
          `Un plan cobra ${cost} créditos por ${count} horas de taller más 10 de alta. ¿Puedes usar ${rate} créditos/hora para cualquier pedido?`,
          [
            ["Sí, siempre se divide el total entre la cantidad", "Con un cargo fijo, el total no es proporcional a las horas."],
            ["Sí, porque la tarifa es constante", "La parte variable es constante, pero el alta se paga una sola vez."],
            "No del todo: el cargo de alta no depende de las horas",
          ],
          2,
          "Una tasa unitaria sirve para escalar cuando no hay cargos fijos ni descuentos por cantidad.",
        ),
      ];
      return [
        c(
          "q0",
          `Para conocer el precio por sensor de ${count} sensores a ${cost} créditos, calculas…`,
          [
            [`${count} ÷ ${cost}`, "Así obtienes sensores por crédito, no créditos por sensor."],
            [`${cost} × ${count}`, "Multiplicar agranda el total; hay que repartirlo entre los sensores."],
            `${cost} ÷ ${count}`,
          ],
          2,
          "Se reparte el precio total entre el número de sensores.",
        ),
        n(
          "q1",
          `${count} sensores cuestan ${cost} créditos al mismo precio por unidad. ¿Cuánto cuesta un sensor?`,
          rate,
          [`${cost} ÷ ${count} = ${rate} créditos/sensor.`],
          [
            "Busca el precio de una sola unidad.",
            "Divide precio total entre cantidad.",
            `${cost} ÷ ${count} = ${rate}.`,
          ],
          {
            unit: "créditos/sensor",
            errors: [
              { value: count / cost, feedback: "Invertiste la división: eso es sensores por crédito." },
            ],
          },
        ),
        n(
          "q2",
          `Completa: ${order} sensores a ${rate} créditos/sensor cuestan __ créditos.`,
          order * rate,
          [`${order} × ${rate} = ${order * rate}.`],
          [
            "Ya conoces el precio de una unidad.",
            "Toma una vez ese precio por cada sensor.",
            `Multiplica ${order} por ${rate}.`,
          ],
          { step: true },
        ),
        n(
          "q3",
          `Un dron recorre ${hours * speed} km en ${hours} horas a velocidad constante. ¿Cuál es su velocidad en km/h?`,
          speed,
          [`${hours * speed} km ÷ ${hours} h = ${speed} km/h.`],
          [
            "Se pregunta por la distancia que corresponde a una hora.",
            "Divide distancia entre tiempo.",
            `${hours * speed} ÷ ${hours} = ${speed}.`,
          ],
          {
            unit: "km/h",
            errors: [
              { value: hours / (hours * speed), feedback: "Eso son horas por kilómetro. La velocidad es distancia ÷ tiempo." },
            ],
          },
        ),
        concept[v % 3],
        n(
          "q5",
          `Un proveedor vende ${count} baterías por ${cost} créditos, sin cargo fijo. Manteniendo el precio unitario, ¿cuánto cuesta pedir ${order} baterías?`,
          order * rate,
          [
            `Precio unitario: ${cost} ÷ ${count} = ${rate}.`,
            `Pedido: ${order} × ${rate} = ${order * rate} créditos.`,
          ],
          [
            "Obtén primero el precio de una batería.",
            `Cada batería cuesta ${rate} créditos.`,
            `Multiplica ese precio por ${order}.`,
          ],
          { intent: "transfer", unit: "créditos" },
        ),
        n(
          "q6",
          `Oferta A: ${n1} sensores por ${p1} créditos. Oferta B: ${n2} sensores por ${p2} créditos. ¿Cuál es el menor precio por sensor?`,
          cheaper,
          [
            `A: ${p1} ÷ ${n1} = ${dec(unitA)} créditos/sensor. B: ${p2} ÷ ${n2} = ${dec(unitB)} créditos/sensor.`,
            `El menor es ${dec(cheaper)} créditos/sensor (oferta ${cheaper === unitA ? "A" : "B"}).`,
          ],
          [
            "Compara el precio de un sensor en cada oferta.",
            "Divide el precio de cada oferta entre su número de sensores.",
            `Compara ${dec(unitA)} con ${dec(unitB)}.`,
          ],
          {
            intent: "transfer",
            unit: "créditos/sensor",
            errors: [
              { value: Math.max(unitA, unitB), feedback: "Ese es el precio unitario de la oferta más cara por sensor." },
              { value: Math.min(p1, p2), feedback: "Ese es el precio total más bajo, no el precio por sensor." },
            ],
          },
        ),
      ];
    },
    application: n(
      "app",
      "Un taxi eléctrico de la ciudad gasta 18 kWh cada 120 km. Si mantiene ese consumo, ¿cuántos kWh necesita para un recorrido de 300 km?",
      45,
      [
        "Tasa: 18 kWh ÷ 120 km = 0,15 kWh por km.",
        "300 km × 0,15 kWh/km = 45 kWh.",
        "Comprobación: 300 km son 2,5 veces 120 km, y 2,5 × 18 = 45.",
      ],
      [
        "Busca el consumo de un solo kilómetro.",
        "Divide 18 entre 120.",
        "Multiplica esa tasa por 300.",
      ],
      {
        intent: "transfer",
        unit: "kWh",
        errors: [
          { value: 2000, feedback: "Calculaste kilómetros por kWh y luego multiplicaste. La tasa que necesitas es kWh por km." },
          { value: 198, feedback: "Sumar no escala la tasa: el consumo crece en proporción a la distancia." },
        ],
      },
    ),
    outcome:
      "Puedes comparar suministros con una medida común y anticipar el costo de un nuevo pedido.",
    commonErrors: [
      "Comparar precios totales de cantidades distintas.",
      "Invertir la división sin interpretar las unidades.",
      "Aplicar una tasa constante cuando hay cargos fijos o descuentos.",
    ],
  }),
  defineLesson({
    id: "proporcionalidad",
    unitId: "proporcionalidad",
    title: "Reconocer una relación proporcional",
    objective:
      "Reconocer proporcionalidad directa y usar su constante para completar una tabla o resolver un problema.",
    purpose:
      "Necesitas ampliar la red de sensores. Un modelo proporcional ayuda a prever el consumo cuando aumenta la cantidad instalada.",
    prerequisites: ["tasa-unitaria"],
    legacyModuleIds: ["algebra-d5", "algebra-d9"],
    visual: "proportion",
    vocabulary: [
      {
        term: "Proporcionalidad directa",
        meaning:
          "Relación y = kx con una razón y/x constante para x distinto de cero.",
      },
      {
        term: "Constante",
        meaning: "El factor k que convierte cada valor de x en su valor de y.",
      },
    ],
    sections: [
      {
        title: "Comprueba la razón, no solo el aumento",
        paragraphs: [
          "Si cada sensor consume 3 unidades, uno consume 3, dos consumen 6 y cuatro consumen 12. La razón consumo/cantidad siempre es 3.",
          "Duplicar la cantidad duplica el consumo porque el valor por sensor se conserva.",
        ],
        formula: "y = 3x; y/x = 3 si x ≠ 0",
      },
      {
        title: "Un aumento constante no basta",
        paragraphs: [
          "La relación y = 3x + 5 aumenta tres por cada sensor, pero incluye cinco unidades de consumo fijo. Por eso no es proporcional: al duplicar x no se duplica y.",
          "En un modelo proporcional, x = 0 da y = 0. Esta condición ayuda a detectar cargos fijos, aunque por sí sola no demuestra proporcionalidad en todos los casos.",
        ],
        formula: "3x es proporcional; 3x + 5 incluye un término fijo",
      },
      {
        title: "Construye y verifica el modelo",
        paragraphs: [
          "Divide y entre x para obtener k, comprueba que se mantenga en los datos disponibles y escribe y = kx.",
          "Después de calcular, revisa las unidades y si el contexto permite mantener constante la relación. La tabla apoya el modelo dentro de esas condiciones.",
        ],
        formula: "k = y/x; nuevo valor = k × nueva cantidad",
      },
    ],
    examples: [
      ex(
        "2 sensores consumen 8 unidades y 5 consumen 20. Si el consumo por sensor es constante, ¿cuánto consumen 7?",
        [
          [
            "8 ÷ 2 = 4; 20 ÷ 5 = 4",
            "Los datos tienen la misma razón consumo/sensores.",
          ],
          ["y = 4x", "Cada sensor añade cuatro unidades, sin consumo fijo."],
          ["4 × 7 = 28", "Aplicamos el factor al nuevo número de sensores."],
        ],
        "Siete sensores consumen 28 unidades bajo el mismo modelo.",
      ),
      ex(
        "Una reparación cuesta 10 créditos fijos y 4 por sensor. ¿Es proporcional el costo al número de sensores?",
        [
          ["1 sensor: 10 + 4 = 14", "Incluimos el cargo fijo."],
          [
            "2 sensores: 10 + 8 = 18",
            "Duplicar sensores no duplica los 14 créditos.",
          ],
          ["14/1 ≠ 18/2", "La razón costo/sensores cambia."],
        ],
        "Es una relación afín con cargo fijo, no una proporcionalidad directa.",
      ),
      ex(
        "En una red proporcional, 3 sensores consumen 12 unidades. ¿Cuántos sensores consumen 28?",
        [
          ["k = 12 ÷ 3 = 4", "Cada sensor consume cuatro unidades."],
          ["28 = 4x", "Planteamos la incógnita: ahora se desconoce la cantidad de sensores."],
          ["x = 28 ÷ 4 = 7", "Deshacemos la multiplicación dividiendo entre la constante."],
        ],
        "Siete sensores consumen 28 unidades; 4 × 7 = 28 lo comprueba.",
      ),
    ],
    diagnostic: [
      n(
        "d-1",
        "Si 5 sensores consumen 20 unidades al mismo ritmo, ¿cuánto consume uno?",
        4,
        ["20 ÷ 5 = 4."],
        ["Busca el consumo por unidad.", "Divide entre cinco.", "Consume 4."],
      ),
      n(
        "d-2",
        "¿Cuál es el doble de 7?",
        14,
        ["2 × 7 = 14."],
        ["Duplicar es tomar dos veces.", "Suma 7 + 7.", "El doble es 14."],
      ),
      c(
        "d-3",
        "Una tasa constante indica…",
        [
          "El mismo valor por unidad",
          "Que todos los totales son iguales",
          "Que hay un cargo fijo",
        ],
        0,
        "La tasa conserva el valor que corresponde a cada unidad.",
      ),
    ],
    questions(v) {
      const [k, x] = [[3, 4], [5, 2], [4, 7], [6, 3], [2, 9], [7, 5]][v],
        next = [10, 7, 3, 8, 4, 6][v],
        fixed = [0, 6, 0, 4, 10, 0][v],
        extra = [5, 2, 8, 3, 6, 4][v],
        // Inverso: x1 sensores consumen y1; ¿cuántos consumen y2?
        [x1, y1, y2] = [[2, 6, 15], [4, 20, 35], [3, 12, 32], [5, 30, 54], [6, 12, 22], [2, 14, 49]][v],
        rate = y1 / x1;
      return [
        v % 2 === 0
          ? c(
              "q0",
              "¿Cuál es una condición de proporcionalidad directa?",
              [
                ["Siempre hay un cargo fijo", "Un cargo fijo es justamente lo que impide que la relación sea proporcional."],
                "La razón y/x se mantiene constante para x distinto de cero",
                ["y siempre es mayor que x", "Con k < 1, y es menor que x y la relación sigue siendo proporcional."],
              ],
              1,
              "En y = kx, dividir y entre x distinto de cero devuelve siempre k.",
            )
          : c(
              "q0",
              `En una relación y = ${k}x, ¿qué ocurre con y si x se triplica?`,
              [
                ["Aumenta en 3 unidades", "Eso sería sumar; en y = kx el cambio es multiplicativo."],
                "También se triplica",
                ["No se puede saber sin una tabla", "La fórmula basta: k(3x) = 3(kx)."],
              ],
              1,
              `${k} × (3x) = 3 × (${k}x): si x se multiplica por 3, y también.`,
            ),
        n(
          "q1",
          `Cada sensor consume ${k} unidades y no hay consumo fijo. ¿Cuánto consumen ${x} sensores?`,
          k * x,
          [`y = ${k}x; para x = ${x}, y = ${k} × ${x} = ${k * x}.`],
          [
            "El consumo por sensor se mantiene.",
            `Multiplica la cantidad de sensores por ${k}.`,
            `${k} × ${x} = ${k * x}.`,
          ],
          {
            errors: [
              { value: k + x, feedback: "Sumaste. Cada sensor añade su consumo: hay que multiplicar." },
            ],
          },
        ),
        n(
          "q2",
          `Completa el factor: si ${x} sensores consumen ${k * x}, entonces y = __ × x.`,
          k,
          [`k = ${k * x} ÷ ${x} = ${k}.`],
          [
            "Busca cuánto corresponde a un sensor.",
            "Divide consumo entre sensores.",
            `El factor es ${k}.`,
          ],
          {
            step: true,
            errors: [
              { value: x / (k * x), feedback: "Invertiste la división: k = y ÷ x." },
            ],
          },
        ),
        n(
          "q3",
          `Una tarifa sigue y = ${k}x + ${fixed}. ¿Cuánto vale y cuando x = 0?`,
          fixed,
          [
            `${k} × 0 + ${fixed} = ${fixed}.`,
            fixed === 0
              ? "Sin término fijo, x = 0 da y = 0: compatible con proporcionalidad."
              : `Hay un término fijo de ${fixed}: la relación no es proporcional.`,
          ],
          [
            "Sustituye x por cero.",
            "Multiplicar por cero da cero; el término fijo queda.",
            `y = ${fixed}.`,
          ],
          {
            errors: fixed
              ? [{ value: 0, feedback: `El término ${fixed} no depende de x: sigue ahí cuando x = 0.` }]
              : [{ value: k, feedback: `${k} × 0 = 0: el coeficiente no queda al sustituir.` }],
          },
        ),
        v % 2 === 0
          ? c(
              "q4",
              `Un sistema consume y = ${k}x + ${extra}. ¿Es directamente proporcional a x?`,
              [
                `No: hay ${extra} unidades de consumo fijo`,
                ["Sí: y aumenta de forma regular", `Aumentar ${k} por sensor no basta: el término fijo hace que y/x cambie.`],
                ["Sí: todos los números son positivos", "El signo de los números no decide la proporcionalidad."],
              ],
              0,
              "El término fijo hace que y/x cambie; duplicar x no duplica el consumo total.",
            )
          : c(
              "q4",
              `Una tabla indica: 2 sensores → ${2 * k + extra} unidades; 4 sensores → ${4 * k + extra}. ¿Es proporcional?`,
              [
                ["Sí: al aumentar x, aumenta y", "Que ambas crezcan no basta; la razón y/x debe ser constante."],
                `No: ${2 * k + extra}/2 y ${4 * k + extra}/4 no son iguales`,
                ["Sí: la diferencia es constante", "Una diferencia constante no implica razón constante si hay un término fijo."],
              ],
              1,
              `y/x cambia de ${((2 * k + extra) / 2).toLocaleString("es")} a ${((4 * k + extra) / 4).toLocaleString("es")}: no hay una constante k.`,
            ),
        n(
          "q5",
          `La red tiene ${x} lámparas que consumen ${k * x} unidades. Todas consumen lo mismo y no hay pérdidas fijas. ¿Cuánto consumirán ${next} lámparas?`,
          next * k,
          [
            `Cada lámpara consume ${k * x} ÷ ${x} = ${k}.`,
            `${next} lámparas consumen ${next} × ${k} = ${next * k}.`,
          ],
          [
            "Comprueba que la tasa es constante y sin término fijo.",
            `La tasa es ${k} por lámpara.`,
            `Multiplica ${k} por ${next}.`,
          ],
          { intent: "transfer" },
        ),
        n(
          "q6",
          `En una red proporcional, ${x1} sensores consumen ${y1} unidades. ¿Cuántos sensores consumen ${y2} unidades?`,
          y2 / rate,
          [
            `Constante: k = ${y1} ÷ ${x1} = ${rate} unidades por sensor.`,
            `${y2} = ${rate} × x, así que x = ${y2} ÷ ${rate} = ${y2 / rate}.`,
          ],
          [
            "Ahora conoces el consumo y buscas la cantidad de sensores.",
            `Calcula primero cuánto consume un sensor: ${y1} ÷ ${x1}.`,
            `Divide ${y2} entre esa constante.`,
          ],
          {
            intent: "transfer",
            unit: "sensores",
            errors: [
              { value: y2 * rate, feedback: `Multiplicaste por la constante. Si ${y2} = ${rate} × x, x se obtiene dividiendo.` },
            ],
          },
        ),
      ];
    },
    application: n(
      "app",
      "Una tabla de consumo indica: 2 sensores → 7 unidades; 4 → 14; 6 → 21. Si la relación se mantiene, ¿cuánto consumirán 15 sensores?",
      52.5,
      [
        "7/2 = 14/4 = 21/6 = 3,5: la razón es constante, y = 3,5x.",
        "15 × 3,5 = 52,5 unidades.",
      ],
      [
        "Comprueba primero si la razón consumo/sensores es constante.",
        "Calcula 7 ÷ 2.",
        "Multiplica la constante por 15.",
      ],
      {
        intent: "transfer",
        unit: "unidades",
        errors: [
          { value: 45, feedback: "Calculaste 15 × 3. La constante es 7 ÷ 2 = 3,5." },
        ],
      },
    ),
    outcome:
      "El consumo previsto de la red queda calibrado y puedes distinguir cuándo hace falta incluir un consumo fijo.",
    commonErrors: [
      "Confundir aumento constante con razón constante.",
      "Ignorar el término fijo.",
      "Aplicar proporcionalidad a cualquier relación entre cantidades.",
    ],
  }),
  defineLesson({
    id: "porcentajes-aplicados",
    unitId: "proporcionalidad",
    title: "Entender aumentos y descuentos",
    objective:
      "Calcular cambios porcentuales identificando la cantidad de referencia y comprobar el resultado.",
    purpose:
      "La ciudad compra repuestos con descuentos y cambios de precio. Vas a decidir cuánto se paga realmente y sobre qué base se calcula cada cambio.",
    prerequisites: [
      "fraccion-decimal-porcentaje",
      "fraccion-cantidad",
      "proporcionalidad",
    ],
    legacyModuleIds: ["aritmetica-porcentaje-aplicado"],
    visual: "change",
    vocabulary: [
      {
        term: "Base",
        meaning:
          "La cantidad de referencia sobre la que se calcula un porcentaje.",
      },
      {
        term: "Cambio porcentual",
        meaning:
          "Diferencia dividida entre el valor inicial, expresada por cada cien.",
      },
    ],
    sections: [
      {
        title: "Identifica el cien por ciento",
        paragraphs: [
          "En un descuento del 20% sobre 80 créditos, la base es 80: ese es el 100%. El descuento vale 20/100 × 80 = 16.",
          "El precio final es 80 − 16 = 64. El número 20 representa un porcentaje, no veinte créditos.",
        ],
        formula: "Descuento = base × p/100; final = base − descuento",
      },
      {
        title: "Aumentos y cambios sucesivos",
        paragraphs: [
          "Para un aumento, sumas el cambio a la base. Un aumento del 20% de 80 da 80 + 16 = 96.",
          "Dos cambios sucesivos pueden tener bases diferentes. Subir 20% y bajar después 20% no devuelve necesariamente al valor inicial: el segundo cambio se calcula sobre la nueva cantidad.",
        ],
        formula: "100 → +20% → 120 → −20% → 96",
      },
      {
        title: "Expresa el cambio respecto del inicio",
        paragraphs: [
          "Si un precio pasa de 50 a 60, aumentó 10. La proporción del cambio respecto del valor inicial es 10/50 = 0,2, es decir, 20%.",
          "Dividir entre el valor final respondería otra comparación. Antes de calcular, di cuál es la referencia.",
        ],
        formula:
          "Cambio porcentual = (final − inicial)/inicial × 100, si inicial ≠ 0",
      },
    ],
    examples: [
      ex(
        "Un repuesto cuesta 80 créditos y tiene 25% de descuento. ¿Cuánto se paga?",
        [
          [
            "25/100 × 80 = 20",
            "Calculamos el descuento sobre el precio original.",
          ],
          ["80 − 20 = 60", "Restamos la rebaja para obtener el precio final."],
          [
            "60/80 = 0,75 = 75%",
            "Comprobamos que pagamos el porcentaje restante.",
          ],
        ],
        "Se pagan 60 créditos; los 20 créditos son el descuento.",
      ),
      ex(
        "El consumo pasa de 120 a 150 unidades. ¿Qué porcentaje aumentó?",
        [
          ["150 − 120 = 30", "Primero hallamos el cambio en unidades."],
          ["30 ÷ 120 = 0,25", "Comparamos el cambio con la cantidad inicial."],
          ["0,25 × 100 = 25%", "Expresamos esa proporción por cada cien."],
        ],
        "El aumento es del 25% respecto de las 120 unidades iniciales.",
      ),
      ex(
        "Tras un descuento del 20%, un repuesto cuesta 64 créditos. ¿Cuál era el precio original?",
        [
          ["100% − 20% = 80%", "Después del descuento se paga el 80% del precio original."],
          ["64 = 0,8 × precio", "El precio original es la base, y es la incógnita."],
          ["precio = 64 ÷ 0,8 = 80", "Comprobación: 20% de 80 = 16; 80 − 16 = 64."],
        ],
        "Sumar el 20% a 64 daría 76,8: el 20% se calculó sobre 80, no sobre 64.",
      ),
    ],
    diagnostic: [
      n(
        "d-1",
        "Escribe 20% como decimal.",
        0.2,
        ["20/100 = 0,2."],
        [
          "Por ciento significa por cada cien.",
          "Divide 20 entre 100.",
          "El decimal es 0,2.",
        ],
      ),
      n(
        "d-2",
        "¿Cuánto es 1/4 de 80?",
        20,
        ["80 ÷ 4 = 20."],
        [
          "Reparte 80 en cuatro partes iguales.",
          "Calcula 80 ÷ 4.",
          "Un cuarto vale 20.",
        ],
      ),
      c(
        "d-3",
        "Un descuento hace que el precio final sea…",
        [
          "Mayor que el original",
          "Menor que el original, si el descuento es positivo",
          "Siempre cero",
        ],
        1,
        "Un descuento positivo reduce el precio, sin necesariamente anularlo.",
      ),
    ],
    questions(v) {
      const [p, base] = [[10, 250], [20, 300], [15, 400], [35, 600], [25, 360], [40, 450]][v],
        delta = (base * p) / 100,
        final = base - delta;
      const concept = [
        c(
          "q4",
          "Un precio sube 20% y después baja 20%. ¿Por qué el segundo cambio no anula el primero?",
          [
            "Porque el segundo porcentaje se calcula sobre una base distinta",
            ["Porque 20% siempre significa veinte unidades", "Un porcentaje depende de su base: el 20% de 100 y el de 120 son distintos."],
            ["Porque los descuentos no se pueden calcular", "Se pueden calcular: el problema es la base de cada uno."],
          ],
          0,
          "Partiendo de 100: sube a 120 y baja 24, que es el 20% de 120; termina en 96.",
        ),
        c(
          "q4",
          `Un repuesto baja de ${base} a ${final} créditos. ¿Respecto de qué cantidad se calcula el porcentaje de descuento?`,
          [
            [`De ${final}, el precio final`, "El cambio porcentual se mide respecto del valor inicial."],
            `De ${base}, el precio inicial`,
            [`De ${delta}, la rebaja`, "La rebaja es lo que se compara, no la referencia."],
          ],
          1,
          `El descuento ${delta} se compara con el precio inicial ${base}: ${delta}/${base} = ${p}%.`,
        ),
        c(
          "q4",
          `Pagar el ${100 - p}% de un precio equivale a…`,
          [
            [`Un aumento del ${100 - p}%`, `Pagar el ${100 - p}% es pagar menos que el 100%.`],
            [`Un descuento del ${100 - p}%`, `Si te descuentan el ${100 - p}%, pagas el ${p}%.`],
            `Un descuento del ${p}%`,
          ],
          2,
          `100% − ${p}% = ${100 - p}%: se paga el ${100 - p}% cuando el descuento es del ${p}%.`,
        ),
      ];
      return [
        c(
          "q0",
          `Un repuesto de ${base} créditos tiene ${p}% de descuento. ¿Cuál es la base del porcentaje?`,
          [
            [`${p}`, `${p} es el porcentaje, no la cantidad de referencia.`],
            `${base}`,
            [`${100 - p}`, `${100 - p}% es lo que se paga; la base sigue siendo el precio original.`],
          ],
          1,
          `El precio original, ${base} créditos, representa el 100% sobre el que calculas la rebaja.`,
        ),
        n(
          "q1",
          `Calcula ${p}% de ${base} créditos.`,
          delta,
          [`${base} × ${p}/100 = ${delta}.`],
          [
            "Identifica el valor que representa el cien por ciento.",
            `Multiplica ${base} por ${p}/100.`,
            `El cambio vale ${delta}.`,
          ],
          {
            unit: "créditos",
            errors: [
              { value: base - p, feedback: `Restaste ${p} créditos. ${p}% es una proporción de ${base}, no ${p} unidades.` },
              { value: final, feedback: "Ese es el precio después del descuento. Se pide el valor del porcentaje." },
            ],
          },
        ),
        n(
          "q2",
          `Completa el precio final: ${base} − ${delta} = __ después de un descuento del ${p}%.`,
          final,
          [
            `El descuento es ${delta}; el precio final es ${base} − ${delta} = ${final}.`,
          ],
          [
            "El descuento y el precio final son cantidades diferentes.",
            "Resta la rebaja al precio original.",
            `El final es ${final}.`,
          ],
          {
            step: true,
            errors: [
              { value: delta, feedback: "Ese es el descuento. Se pregunta cuánto se paga." },
            ],
          },
        ),
        n(
          "q3",
          `Un sistema que consumía ${base} unidades aumenta su consumo ${p}%. ¿Cuál es el nuevo consumo?`,
          base + delta,
          [
            `Aumento: ${base} × ${p}/100 = ${delta}.`,
            `Nuevo consumo: ${base} + ${delta} = ${base + delta}.`,
          ],
          [
            "Se trata de un aumento.",
            `El cambio es ${delta}.`,
            "Suma el cambio al consumo original.",
          ],
          {
            errors: [
              { value: delta, feedback: "Ese es solo el aumento. Súmalo al consumo inicial." },
              { value: base + p, feedback: `Sumaste ${p} unidades. Un aumento del ${p}% vale ${p}/100 de ${base}.` },
            ],
          },
        ),
        concept[v % 3],
        n(
          "q5",
          `El presupuesto de una reparación pasa de ${base} a ${base + delta} créditos. ¿Qué porcentaje aumentó respecto del presupuesto inicial?`,
          p,
          [`Cambio: ${delta}.`, `${delta} ÷ ${base} × 100 = ${p}%.`],
          [
            "Primero resta el valor inicial al final.",
            "Divide el cambio entre el presupuesto inicial.",
            `Multiplica ${delta}/${base} por 100.`,
          ],
          {
            intent: "transfer",
            unit: "%",
            errors: [
              { value: (delta / (base + delta)) * 100, feedback: "Dividiste entre el valor final. El cambio porcentual se mide respecto del inicial." },
              { value: delta, feedback: "Ese es el aumento en créditos. Exprésalo como porcentaje del presupuesto inicial." },
            ],
          },
        ),
        n(
          "q6",
          `Tras un descuento del ${p}%, un repuesto cuesta ${final} créditos. ¿Cuál era su precio original?`,
          base,
          [
            `Después del descuento se paga el ${100 - p}% del original: ${final} = ${((100 - p) / 100).toLocaleString("es")} × precio.`,
            `Precio = ${final} ÷ ${((100 - p) / 100).toLocaleString("es")} = ${base}. Comprobación: ${p}% de ${base} = ${delta}; ${base} − ${delta} = ${final}.`,
          ],
          [
            "El descuento se calculó sobre el precio original, que no conoces.",
            `${final} es el ${100 - p}% del precio original.`,
            `Divide ${final} entre ${((100 - p) / 100).toLocaleString("es")}.`,
          ],
          {
            intent: "transfer",
            unit: "créditos",
            errors: [
              {
                value: final * (1 + p / 100),
                feedback: `Sumaste el ${p}% del precio final. El descuento se calculó sobre el original, que es mayor.`,
              },
              { value: final + p, feedback: `Sumaste ${p} créditos: el porcentaje no son unidades.` },
            ],
          },
        ),
      ];
    },
    application: n(
      "app",
      "Un repuesto de 400 créditos sube un 10% por escasez. Una semana después tiene un descuento del 10% sobre el precio de ese momento. ¿Cuánto se paga al final?",
      396,
      [
        "Subida: 10% de 400 = 40; nuevo precio 440.",
        "Descuento: 10% de 440 = 44; precio final 440 − 44 = 396.",
        "El precio final es menor que el inicial porque el descuento se calcula sobre una base mayor.",
      ],
      [
        "Cada cambio tiene su propia base.",
        "Calcula primero el precio después de la subida.",
        "Aplica el 10% de descuento a 440.",
      ],
      {
        intent: "transfer",
        unit: "créditos",
        errors: [
          { value: 400, feedback: "Subir y bajar el mismo porcentaje no se anula: el descuento se calcula sobre 440." },
          { value: 360, feedback: "Aplicaste el descuento sobre 400. Se aplica sobre el precio que había tras la subida." },
        ],
      },
    ),
    outcome:
      "Puedes revisar las ofertas y presupuestos del taller usando la base correcta para cada cambio.",
    commonErrors: [
      "Restar el número del porcentaje como si fueran unidades.",
      "Entregar el descuento cuando se pregunta por el precio final.",
      "Dividir el cambio entre el valor final.",
      "Sumar porcentajes sucesivos con bases diferentes.",
    ],
  }),
];
