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
      const a = v + 2,
        b = v + 3,
        k = v + 2;
      return [
        c(
          "q0",
          `La razón azules:verdes es ${a}:${b}. ¿Qué significa?`,
          [
            `Hay ${a} azules en total`,
            `Hay ${a} azules por cada ${b} verdes`,
            `Hay ${b} azules por cada ${a} verdes`,
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
            "Busca cuánto aumentó la primera cantidad.",
            `La cantidad de rojos se multiplicó por ${k}.`,
            `Multiplica ${b} por ${k}.`,
          ],
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
          { step: true },
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
        ),
        c(
          "q4",
          `¿Por qué la fracción azul del total de una mezcla ${a}:${b} es ${a}/${a + b}?`,
          [
            "El total se forma sumando ambas partes",
            "El total siempre es el segundo número",
            "Se invierte la razón",
          ],
          0,
          `El total de un conjunto contiene ${a} piezas azules y ${b} verdes: ${a + b} piezas.`,
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
          { intent: "transfer" },
        ),
      ];
    },
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
      const count = v + 3,
        rate = v + 4,
        cost = count * rate;
      return [
        c(
          "q0",
          `Para conocer el precio por sensor de ${count} sensores a ${cost} créditos, calculas…`,
          [`${count} ÷ ${cost}`, `${cost} × ${count}`, `${cost} ÷ ${count}`],
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
          { unit: "créditos/sensor" },
        ),
        n(
          "q2",
          `Completa: ${count + 2} sensores a ${rate} créditos/sensor cuestan __ créditos.`,
          (count + 2) * rate,
          [`${count + 2} × ${rate} = ${(count + 2) * rate}.`],
          [
            "Ya conoces el precio de una unidad.",
            "Toma una vez ese precio por cada sensor.",
            `Multiplica ${count + 2} por ${rate}.`,
          ],
          { step: true },
        ),
        n(
          "q3",
          `Un dron recorre ${count * rate} km en ${count} horas a velocidad constante. ¿Cuántos km recorre en una hora?`,
          rate,
          [`${count * rate} km ÷ ${count} h = ${rate} km/h.`],
          [
            "Se pregunta por la distancia por hora.",
            "Divide distancia entre tiempo.",
            `La tasa es ${rate} km/h.`,
          ],
          { unit: "km" },
        ),
        c(
          "q4",
          "¿Qué comparación permite elegir el menor precio por sensor?",
          [
            "Comparar solo el precio total de paquetes distintos",
            "Expresar las dos ofertas en créditos por sensor",
            "Elegir siempre el paquete más pequeño",
          ],
          1,
          "Las tasas deben tener la misma unidad para que la comparación tenga sentido.",
        ),
        n(
          "q5",
          `Un proveedor vende ${count} baterías por ${cost} créditos, sin cargo fijo. Manteniendo el precio unitario, ¿cuánto cuesta pedir ${count + 1} baterías?`,
          (count + 1) * rate,
          [
            `Precio unitario: ${cost} ÷ ${count} = ${rate}.`,
            `Pedido: ${count + 1} × ${rate} = ${(count + 1) * rate} créditos.`,
          ],
          [
            "Obtén primero el precio de una batería.",
            `Cada batería cuesta ${rate} créditos.`,
            `Multiplica ese precio por ${count + 1}.`,
          ],
          { intent: "transfer", unit: "créditos" },
        ),
      ];
    },
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
      const k = v + 3,
        x = v + 2;
      return [
        c(
          "q0",
          "¿Cuál es una condición de proporcionalidad directa?",
          [
            "Siempre hay un cargo fijo",
            "La razón y/x se mantiene constante para x distinto de cero",
            "y siempre es mayor que x",
          ],
          1,
          "En y = kx, dividir y entre x distinto de cero devuelve siempre k.",
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
          { step: true },
        ),
        n(
          "q3",
          `En y = ${k}x, ¿cuánto vale y cuando x = 0?`,
          0,
          [`${k} × 0 = 0; no hay término fijo.`],
          ["Sustituye x por cero.", "Multiplicar por cero da cero.", "y = 0."],
        ),
        c(
          "q4",
          `Un sistema consume y = ${k}x + 5. ¿Es directamente proporcional a x?`,
          [
            "No: hay cinco unidades de consumo fijo",
            "Sí: y aumenta de forma regular",
            "Sí: todos los números son positivos",
          ],
          0,
          "El término fijo hace que y/x cambie; duplicar x no duplica el consumo total.",
        ),
        n(
          "q5",
          `La red tiene ${x} lámparas que consumen ${k * x} unidades. Todas consumen lo mismo y no hay pérdidas fijas. ¿Cuánto consumirán ${x + 4} lámparas?`,
          (x + 4) * k,
          [
            `Cada lámpara consume ${k * x} ÷ ${x} = ${k}.`,
            `${x + 4} lámparas consumen ${x + 4} × ${k} = ${(x + 4) * k}.`,
          ],
          [
            "Comprueba que la tasa es constante y sin término fijo.",
            `La tasa es ${k} por lámpara.`,
            `Multiplica ${k} por ${x + 4}.`,
          ],
          { intent: "transfer" },
        ),
      ];
    },
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
      const p = [10, 20, 25, 40, 30, 50][v],
        base = 200 + 100 * v,
        delta = (base * p) / 100;
      return [
        c(
          "q0",
          `Un repuesto de ${base} créditos tiene ${p}% de descuento. ¿Cuál es la base del porcentaje?`,
          [`${p}`, `${base}`, `${100 - p}`],
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
          { unit: "créditos" },
        ),
        n(
          "q2",
          `Completa el precio final: ${base} − ${delta} = __ después de un descuento del ${p}%.`,
          base - delta,
          [
            `El descuento es ${delta}; el precio final es ${base} − ${delta} = ${base - delta}.`,
          ],
          [
            "El descuento y el precio final son cantidades diferentes.",
            "Resta la rebaja al precio original.",
            `El final es ${base - delta}.`,
          ],
          { step: true },
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
        ),
        c(
          "q4",
          "Un precio sube 20% y después baja 20%. ¿Por qué el segundo cambio no anula el primero?",
          [
            "Porque el segundo porcentaje se calcula sobre una base distinta",
            "Porque 20% siempre significa veinte unidades",
            "Porque los descuentos no se pueden calcular",
          ],
          0,
          "Partiendo de 100: sube a 120 y baja 24, que es el 20% de 120; termina en 96.",
        ),
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
          { intent: "transfer", unit: "%" },
        ),
      ];
    },
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
