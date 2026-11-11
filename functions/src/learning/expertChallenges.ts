import type { AdventureInput, AdventureResult, ExpertChallenge } from "./adventures";

/**
 * Retos expertos: la segunda fase de cada aventura. La historia da un giro
 * (datos nuevos, una restricción más, algo que optimizar) y el estudiante
 * vuelve a planificar sin pistas por entrada. Las pistas de cada objetivo
 * solo aparecen tras probar un plan que falla, y señalan el error sin dar el
 * método completo.
 *
 * `expertChallenges.test.ts` recorre todo el espacio de entradas de cada
 * reto: comprueba que tiene solución, que la de la misión no sirve y, donde
 * el enunciado pide «el mejor», que el óptimo es el que se acepta.
 */

type Hint = string | ((v: number[]) => string);
interface Spec {
  brief: string;
  inputs?: AdventureInput[];
  goals: string[];
  checks: ((v: number[]) => boolean)[];
  hints: Hint[];
  success: string;
}

function challenge(spec: Spec): ExpertChallenge {
  if (spec.checks.length !== spec.goals.length || spec.hints.length !== spec.goals.length)
    throw new Error("Cada objetivo del reto experto necesita su comprobación y su pista.");
  return {
    brief: spec.brief,
    inputs: spec.inputs,
    goals: spec.goals,
    success: spec.success,
    evaluate(values): AdventureResult {
      const goals = spec.checks.map((check) => check(values));
      const failed = goals.indexOf(false);
      if (failed < 0) return { goals, feedback: `¡Reto superado! ${spec.success}` };
      const hint = spec.hints[failed];
      return { goals, feedback: typeof hint === "string" ? hint : hint(values) };
    },
  };
}

const input = (id: string, label: string, max: number, unit?: string, min = 0): AdventureInput => ({
  id,
  label,
  min,
  max,
  step: 1,
  start: min,
  unit,
  clue: "",
});
const neg = (x: number) => (x < 0 ? `−${-x}` : `${x}`);
const n = (x: number, digits = 2) => x.toLocaleString("es", { maximumFractionDigits: digits });

export const EXPERT_CHALLENGES: Record<string, ExpertChallenge> = {
  apagon: challenge({
    brief:
      "Una tormenta daña un generador y la reserva baja a 3/4 de las 180 unidades. El hospital necesita 2/3 de la nueva reserva; la radio, 1/3 de lo que deje el hospital. 1/9 de la nueva reserva debe quedar en baterías de emergencia, sin asignar, y el taller se lleva todo lo demás.",
    goals: ["Hospital con 2/3 de la nueva reserva", "Radio con 1/3 de lo que deja el hospital", "1/9 en baterías y el resto al taller"],
    checks: [([h]) => h === 90, ([, r]) => r === 15, ([h, r, t]) => h + r + t === 120],
    hints: [
      ([h]) =>
        h === 100
          ? "100 era 5/9 de la reserva original. Tras la tormenta la reserva es otra: calcúlala primero."
          : h === 120
            ? "120 son 2/3 de 180, la reserva de antes. El hospital toma 2/3 de lo que queda tras la tormenta."
            : `Con ${h} unidades el hospital no recibe 2/3 de la nueva reserva. ¿Cuántas unidades quedan después de la tormenta?`,
      ([, r]) =>
        r === 45
          ? "45 es 1/3 de toda la nueva reserva. La radio toma 1/3 de lo que deja el hospital."
          : `Con ${r} unidades la radio no recibe 1/3 de lo que deja el hospital.`,
      ([h, r, t]) =>
        h + r + t > 135
          ? `Pediste ${h + r + t} unidades y tras la tormenta solo hay 135.`
          : `Asignaste ${h + r + t} y quedan ${135 - h - r - t} en baterías. Deben quedar exactamente 1/9 de la nueva reserva; el taller se lleva el resto.`,
    ],
    success:
      "3/4 de 180 = 135. Hospital: 2/3 de 135 = 90. Radio: 1/3 de los 45 restantes = 15. Baterías: 1/9 de 135 = 15. Taller: 135 − 90 − 15 − 15 = 15.",
  }),

  "camara-fria": challenge({
    brief:
      "Llega un lote de vacunas y se avería un compresor. Las vacunas van en la nevera, entre 2 y 8 °C. El congelador aguanta hasta −15 °C, los helados siguen necesitando 6 grados menos que el congelador y el compresor que queda solo soporta 24 grados de diferencia entre la nevera y los helados.",
    goals: ["Congelador a −15 °C o menos", "Vacunas entre 2 y 8 °C", "Helados 6 grados bajo el congelador", "Diferencia nevera − helados ≤ 24"],
    checks: [
      ([, c]) => c <= -15,
      ([, , v]) => v >= 2 && v <= 8,
      ([h, c]) => h <= c - 6,
      ([h, , v]) => v - h <= 24,
    ],
    hints: [
      ([, c]) => `${neg(c)} °C es demasiado cálido para el congelador: necesita −15 °C o menos.`,
      ([, , v]) =>
        v < 2
          ? `Con ${neg(v)} °C las vacunas se dañan por el frío: van entre 2 y 8 °C.`
          : `Con ${neg(v)} °C las vacunas se calientan: van entre 2 y 8 °C.`,
      ([, c]) => `Los helados deben estar 6 grados por debajo del congelador: ${neg(c)} − 6 = ${neg(c - 6)} °C o menos.`,
      ([h, , v]) =>
        `El compresor no aguanta: ${neg(v)} − (${neg(h)}) = ${v - h} grados. ¿De verdad necesita el congelador estar tan frío?`,
    ],
    success:
      "Por ejemplo, congelador a −15 °C, helados a −21 °C y vacunas a 3 °C: 24 grados de diferencia. Enfriar más el congelador obliga a enfriar los helados y rompe el límite del compresor.",
  }),

  "receta-festival": challenge({
    brief:
      "El día del festival solo quedan 9 huevos y no se pueden comprar más. Prepara el pan dulce para el mayor número posible de personas con la misma receta (para 4 personas: 200 g de harina, 300 ml de leche y 2 huevos), sin partir huevos, y compra solo las bolsas de harina de 250 g necesarias.",
    goals: ["Ingredientes en la razón de la receta", "Para el mayor número de personas", "Bolsas justas"],
    checks: [
      ([h, l, e]) => e > 0 && h === 100 * e && l === 150 * e,
      ([, , e]) => e === 9,
      ([h, , , b]) => h > 0 && b * 250 >= h && (b - 1) * 250 < h,
    ],
    hints: [
      ([h, l, e]) =>
        e === 0
          ? "Sin huevos no hay pan dulce."
          : `${h} g, ${l} ml y ${e} huevos no guardan la razón 200 : 300 : 2 de la receta. ¿Cuánta harina y leche van con cada huevo?`,
      ([, , e]) =>
        e > 9 ? "Solo quedan 9 huevos." : `Con ${e} huevos alimentas a ${e * 2} personas, pero todavía quedan huevos sin usar.`,
      ([h, , , b]) =>
        b * 250 < h ? `${b} bolsas son ${b * 250} g: no alcanzan para ${h} g.` : `${b} bolsas son ${b * 250} g: sobra al menos una bolsa entera.`,
    ],
    success:
      "Cada huevo rinde para 2 personas: 9 huevos alcanzan para 18. Eso es 18/4 = 4,5 veces la receta: 900 g de harina, 1350 ml de leche y 4 bolsas (1000 g).",
  }),

  "ascensor-carga": challenge({
    brief:
      "Llega un pedido urgente de 65 cajas de 45 kg. Hoy maneja otra operaria, que pesa 70 kg, con el carro de repuesto de 50 kg; ambos viajan en cada subida. Por seguridad, el ascensor no debe pasar del 90 % de sus 600 kg. Cada viaje gasta combustible: usa el menor número de viajes.",
    goals: ["Carga al 90 % o menos", "Suben las 65 cajas", "El menor número de viajes"],
    checks: [([c]) => 120 + 45 * c <= 540, ([c, v]) => c * v >= 65, ([, v]) => v === 8],
    hints: [
      ([c]) =>
        120 + 45 * c <= 600
          ? `Peso por viaje: 70 + 50 + 45 × ${c} = ${120 + 45 * c} kg. Cabe en el ascensor, pero supera el margen de seguridad del 90 %.`
          : `Peso por viaje: 70 + 50 + 45 × ${c} = ${120 + 45 * c} kg. Ni siquiera cabe en los 600 kg.`,
      ([c, v]) => `${c} × ${v} = ${c * v} cajas: faltan ${65 - c * v}.`,
      ([, v]) => `Funciona con ${v} viajes, pero ¿se puede con menos? Carga en cada viaje lo máximo que permite la seguridad.`,
    ],
    success:
      "120 + 45c ≤ 540 da c ≤ 9,3: caben 9 cajas por viaje. 65 ÷ 9 ≈ 7,2, así que hacen falta 8 viajes.",
  }),

  "jardin-baldosas": challenge({
    brief:
      "El ayuntamiento quiere un borde doble: dos anillos de baldosas de 1 m × 1 m rodean el jardín cuadrado, uno pegado al otro. El césped debe medir al menos 150 m². Cada baldosa cuesta: usa las menos posibles, sin sobrantes.",
    inputs: [input("lado", "Lado del jardín", 20, "m", 1), input("baldosas", "Baldosas", 200)],
    goals: ["Césped de al menos 150 m²", "Borde doble completo, sin sobrantes", "Las menos baldosas posibles"],
    checks: [([l]) => l * l >= 150, ([l, b]) => b === 8 * l + 16, ([l]) => l === 13],
    hints: [
      ([l]) => `Con lado ${l}, el césped mide ${l * l} m²: no llega a 150.`,
      ([l, b]) =>
        b === 4 * l + 4
          ? `${b} baldosas forman un solo anillo. El segundo anillo rodea un cuadrado más grande.`
          : b === 8 * l + 8
            ? "Los dos anillos no son iguales: el exterior rodea un cuadrado más grande que el interior."
            : `Con ${b} baldosas el borde doble ${b < 8 * l + 16 ? "queda incompleto" : "tiene sobrantes"}. Cuenta cada anillo por separado.`,
      () => "El diseño funciona, pero un jardín más pequeño que cumpla el césped gastaría menos baldosas.",
    ],
    success:
      "13 es el menor lado con 13² = 169 ≥ 150. Anillo interior: 4 × 13 + 4 = 56; exterior: 4 × 15 + 4 = 64. En total, 120 = (13 + 4)² − 13².",
  }),

  "huerto-escolar": challenge({
    brief:
      "El huerto se apoya en la pared del patio: el largo pegado a la pared no necesita cerca. Con los mismos 44 m de cerca para los otros tres lados, consigue el huerto de mayor área posible.",
    goals: ["44 m de cerca en tres lados", "La mayor área posible"],
    checks: [([l, a]) => l + 2 * a === 44, ([l, a]) => l * a === 242],
    hints: [
      ([l, a]) =>
        l + a === 22
          ? "Ese reparto cercaba los cuatro lados. Ahora la pared cubre uno de los largos."
          : 2 * l + a === 44
            ? "Pusiste cerca en los dos largos y un ancho, pero el largo pegado a la pared no lleva cerca."
            : `Cerca usada: ${l} + 2 × ${a} = ${l + 2 * a} m. Deben ser 44 m.`,
      ([l, a]) => `Área: ${l} × ${a} = ${l * a} m². ¿Es la mayor? Prueba los anchos vecinos.`,
    ],
    success:
      "Con largo = 44 − 2 × ancho, el área (44 − 2a) × a es máxima en a = 11: 22 m × 11 m = 242 m². Contra una pared, el mejor huerto ya no es un cuadrado.",
  }),

  "torneo-lanzamientos": challenge({
    brief:
      "La federación cambió las reglas de la final. Para clasificar, los 7 lanzamientos deben tener media 7, mediana 8, rango 6 y una única moda, el 8. Puntuaciones actuales: 4, 4, 8 y 8; cada lanzamiento vale de 0 a 10.",
    goals: ["Media de 7", "Mediana de 8", "Rango de 6", "Moda única: 8"],
    checks: [
      (v) => sum(throws(v)) === 49,
      (v) => sorted(v)[3] === 8,
      (v) => Math.max(...throws(v)) - Math.min(...throws(v)) === 6,
      (v) => modes(v).length === 1 && modes(v)[0] === 8,
    ],
    hints: [
      (v) => `Los 7 lanzamientos suman ${sum(throws(v))}; para media 7 deben sumar 7 × 7 = 49.`,
      (v) => `Ordenados: ${sorted(v).join(", ")}. La mediana es el cuarto valor: ${sorted(v)[3]}.`,
      (v) => `El rango es ${Math.max(...throws(v))} − ${Math.min(...throws(v))} = ${Math.max(...throws(v)) - Math.min(...throws(v))}. Debe ser 6.`,
      (v) =>
        modes(v).length > 1
          ? `Hay empate en la moda: ${modes(v).join(", ")} se repiten lo mismo. El 8 debe repetirse más que cualquier otro valor.`
          : `La moda es ${modes(v)[0]}. El 8 debe repetirse más que cualquier otro valor.`,
    ],
    success:
      "Con 7, 8 y 10: suman 25 (49 en total), ordenados 4, 4, 7, 8, 8, 8, 10 dan mediana 8, rango 6, y el 8 se repite tres veces.",
  }),

  "convoy-suministros": challenge({
    brief:
      "Hoy el segundo vehículo sale 6 minutos después que el primero. El primero pasa por el depósito cada 12 minutos y el segundo cada 18, contando desde su salida. La entrega se hace en su segundo encuentro en el depósito.",
    goals: ["Primer encuentro en el depósito", "Entrega en el segundo encuentro"],
    checks: [([e]) => e === 24, ([, d]) => d === 60],
    hints: [
      ([e]) =>
        e === 36
          ? "36 sería el primer encuentro si salieran a la vez. Con 6 minutos de diferencia, escribe los minutos de paso de cada vehículo."
          : e === 6
            ? "En el minuto 6 el segundo vehículo apenas sale y el primero no está en el depósito."
            : `En el minuto ${e} los dos vehículos no coinciden en el depósito.`,
      ([e, d]) =>
        d === e + 6
          ? "La entrega ya no es 6 minutos después: es en el segundo encuentro."
          : `En el minuto ${d} no se produce el segundo encuentro.`,
    ],
    success:
      "Primero: 0, 12, 24, 36, 48, 60. Segundo: 6, 24, 42, 60. Coinciden en 24 y vuelven a coincidir 36 minutos después (el MCM), en 60.",
  }),

  "mezcla-emergencia": challenge({
    brief:
      "Durante el traslado se derrama 5/6 de litro de la mezcla (3/4 + 2/3 de litro). Además, los equipos nuevos necesitan 1/4 de litro cada uno. Indica cuánto queda, en doceavos de litro, y cuántos equipos completos se pueden abastecer.",
    inputs: [input("queda", "Cantidad que queda (doceavos de litro)", 40), input("equipos", "Equipos completos", 30)],
    goals: ["Cantidad que queda", "Equipos completos de 1/4 de litro"],
    checks: [([q]) => q === 7, ([, e]) => e === 2],
    hints: [
      ([q]) =>
        q === 27
          ? "Sumaste lo derramado: los 5/6 de litro se pierden, así que se restan."
          : q === 17
            ? "17/12 es lo que había antes del derrame."
            : q === 10
              ? "10/12 es lo que se derramó, no lo que queda."
              : `${q}/12 no es lo que queda. Expresa las tres cantidades en doceavos antes de operar.`,
      ([, e]) =>
        e === 7
          ? "Cada equipo ya no usa 1/12, sino 1/4 de litro."
          : e > 2
            ? `No alcanza para ${e} equipos completos de 1/4 de litro.`
            : "Aún alcanza para otro equipo completo.",
    ],
    success: "9/12 + 8/12 − 10/12 = 7/12 L. Cada equipo usa 1/4 = 3/12 L: alcanza para 2 equipos y sobra 1/12 L.",
  }),

  "mercado-barrio": challenge({
    brief:
      "Otra tienda vende el mismo kit a 200 soles con un 25 % de descuento, pero después cobra un 12 % de impuesto sobre el precio rebajado. La escuela ahora tiene 700 soles. Calcula el precio final de un kit y el máximo de kits completos.",
    goals: ["Precio con descuento e impuesto", "Máximo de kits dentro del presupuesto"],
    checks: [([p]) => p === 168, ([, k]) => k === 4],
    hints: [
      ([p]) =>
        p === 174
          ? "Sumaste los porcentajes (−25 % + 12 %). El impuesto se calcula sobre el precio ya rebajado."
          : p === 150
            ? "150 soles es el precio con descuento; falta el impuesto."
            : p === 224
              ? "224 soles aplica el impuesto, pero no el descuento."
              : `${p} soles no es el precio final. Aplica el descuento y después el impuesto sobre el resultado.`,
      ([, k]) => (k > 4 ? `${k} × 168 = ${k * 168} soles: supera los 700.` : `${k} × 168 = ${k * 168} soles: aún cabe otro kit.`),
    ],
    success: "200 × 0,75 = 150 y 150 × 1,12 = 168 soles. 4 kits cuestan 672 soles; 5 costarían 840.",
  }),

  "rescate-montana": challenge({
    brief:
      "Un derrumbe alarga la ruta: ahora hay 1,5 veces más trabajo que antes (8 rescatistas tardaban 15 horas). Una tormenta llega en 18 horas. Cada rescatista que sube corre riesgos: envía el menor equipo que termine a tiempo.",
    goals: ["Tiempo coherente con el trabajo", "Ruta lista antes de la tormenta", "El menor equipo posible"],
    checks: [([p, h]) => p * h === 180, ([, h]) => h <= 18, ([p]) => p === 10],
    hints: [
      ([p, h]) =>
        p * h === 120
          ? "Ese era el trabajo de la ruta original; ahora hay 1,5 veces más."
          : `${p} × ${h} = ${p * h} horas-persona no coincide con el trabajo de la nueva ruta.`,
      ([, h]) => `${h} horas es demasiado: la tormenta llega en 18.`,
      ([p]) => `${p} rescatistas terminan a tiempo, pero ¿bastaría con menos?`,
    ],
    success: "Trabajo: 8 × 15 × 1,5 = 180 horas-persona. Con 18 horas como máximo, hacen falta 180 ÷ 18 = 10 rescatistas.",
  }),

  "feria-energia": challenge({
    brief:
      "Para la feria grande se necesitan al menos 47 kW y caben como máximo 14 generadores. Un generador pequeño (2 kW) cuesta 300 soles y uno grande (5 kW), 800 soles. Encuentra la combinación más barata.",
    goals: ["Al menos 47 kW", "14 generadores como máximo", "El menor coste posible"],
    checks: [([p, g]) => 2 * p + 5 * g >= 47, ([p, g]) => p + g <= 14, ([p, g]) => 300 * p + 800 * g === 7400],
    hints: [
      ([p, g]) => `Producción: 2 × ${p} + 5 × ${g} = ${2 * p + 5 * g} kW. Faltan ${47 - 2 * p - 5 * g} kW.`,
      ([p, g]) => `${p + g} generadores no caben: el espacio admite 14.`,
      ([p, g]) =>
        `Cumple, con un coste de ${300 * p + 800 * g} soles. ¿Hay una combinación válida más barata? Compara cuánto cuesta cada kW en cada tipo.`,
    ],
    success:
      "El kW pequeño cuesta 150 soles y el grande 160, pero el espacio limita los pequeños. 6 pequeños y 7 grandes dan 47 kW con 13 generadores por 7400 soles, el mínimo.",
  }),

  "ruta-dron": challenge({
    brief:
      "Con carga, la batería del dron no llega a la mitad del recorrido. La estación debe estar sobre la ruta recta de A(0, 0) a B(12, 8) y tres veces más cerca de B que de A.",
    goals: ["Sobre la ruta de A a B", "Tres veces más cerca de B que de A"],
    checks: [([x, y]) => 2 * x === 3 * y, ([x, y]) => x === 9 && y === 6],
    hints: [
      ([x, y]) => `El punto (${x}, ${y}) no está sobre la ruta. En el segmento AB, ¿cuánto sube y por cada unidad que avanza x?`,
      ([x, y]) =>
        x === 6 && y === 4
          ? "El punto medio está a la misma distancia de A que de B."
          : `En (${x}, ${y}) la estación no está tres veces más cerca de B que de A. Divide la ruta en partes iguales.`,
    ],
    success: "Tres veces más cerca de B significa recorrer 3/4 del camino desde A: (3/4 × 12, 3/4 × 8) = (9, 6).",
  }),

  "deposito-agua": challenge({
    brief:
      "El nuevo depósito mide 2,5 m de largo, 2 m de ancho y 1,6 m de alto, y ya tiene 2300 L. Para que no rebose con la lluvia, solo se llena hasta el 90 % de su capacidad. Calcula la capacidad en m³ y los litros que faltan hasta ese 90 %.",
    inputs: [input("volumen", "Capacidad", 30, "m³"), input("faltan", "Litros que faltan hasta el 90 %", 15000, "L")],
    goals: ["Capacidad del depósito", "Litros que faltan hasta el 90 %"],
    checks: [([v]) => v === 8, ([, f]) => f === 4900],
    hints: [
      ([v]) => (v === 12 ? "12 m³ era el depósito anterior." : `${v} m³ no es el producto de las tres medidas.`),
      ([, f]) =>
        f === 5700
          ? "Esos litros lo llenarían hasta el borde; solo se llena hasta el 90 %."
          : f === 7200
            ? "7200 L es el 90 % de la capacidad, pero ya hay agua dentro."
            : `${f} L no es lo que falta. Convierte la capacidad a litros, toma el 90 % y descuenta lo que ya hay.`,
    ],
    success: "2,5 × 2 × 1,6 = 8 m³ = 8000 L. El 90 % son 7200 L; faltan 7200 − 2300 = 4900 L.",
  }),

  "puente-valle": challenge({
    brief:
      "En el valle grande, la orilla de llegada está 21 m más abajo y a 20 m en horizontal. La pasarela baja en línea recta y solo hay piezas de 3 m (la última se puede recortar). Calcula la longitud de la pasarela y las piezas necesarias.",
    inputs: [input("diagonal", "Longitud de la pasarela", 50, "m"), input("piezas", "Piezas de 3 m", 20)],
    goals: ["Longitud de la pasarela", "Piezas de 3 m necesarias"],
    checks: [([d]) => d === 29, ([, p]) => p === 10],
    hints: [
      ([d]) =>
        d === 41
          ? "Sumaste los dos tramos: la línea recta es más corta que el camino en ángulo recto."
          : `Con ${d} m, ${d}² = ${d * d}, que no coincide con 20² + 21².`,
      ([, p]) => (p * 3 < 29 ? `${p} piezas cubren ${p * 3} m: no llegan.` : `Con ${p} piezas sobra al menos una entera.`),
    ],
    success: "20² + 21² = 400 + 441 = 841 = 29²: la pasarela mide 29 m. 29 ÷ 3 ≈ 9,7, así que hacen falta 10 piezas y se recorta la última.",
  }),

  "tombola-solidaria": challenge({
    brief:
      "Para recaudar fondos, cada boleto se vende a 2 soles y cada premio cuesta 4. La bolsa debe tener entre 20 y 30 boletos, y la ganancia (lo vendido menos los premios) debe ser al menos 15 soles. Para que la tómbola sea atractiva, busca la mayor probabilidad de ganar posible.",
    goals: ["Entre 20 y 30 boletos", "Ganancia de al menos 15 soles", "La mayor probabilidad de premio"],
    checks: [
      ([p, s]) => p + s >= 20 && p + s <= 30,
      ([p, s]) => 2 * (p + s) - 4 * p >= 15,
      ([p, s]) => p === 11 && s === 19,
    ],
    hints: [
      ([p, s]) => `La bolsa tiene ${p + s} boletos.`,
      ([p, s]) => `Ganancia: 2 × ${p + s} − 4 × ${p} = ${2 * (p + s) - 4 * p} soles.`,
      ([p, s]) => `Probabilidad de premio: ${p}/${p + s} ≈ ${n((100 * p) / (p + s), 1)} %. ¿Hay una bolsa válida con más probabilidad?`,
    ],
    success:
      "Con 30 boletos caben hasta 11 premios (60 − 44 = 16 soles de ganancia): 11/30 ≈ 37 %. Ninguna otra bolsa válida da más probabilidad.",
  }),

  "alerta-meteorologica": challenge({
    brief:
      "Informe del año siguiente: en 60 días hubo 25 días de lluvia y se emitieron 30 alertas. 18 alertas acertaron (llovió ese día). Calcula cuántas alertas fueron falsas y qué porcentaje de las alertas terminó en lluvia.",
    inputs: [input("falsas", "Alertas sin lluvia", 40), input("porcentaje", "Lluvia cuando hubo alerta", 100, "%")],
    goals: ["Alertas falsas", "Lluvia cuando hubo alerta"],
    checks: [([f]) => f === 12, ([, p]) => p === 60],
    hints: [
      ([f]) =>
        f === 7
          ? "7 son los días de lluvia sin alerta. Se piden las alertas sin lluvia."
          : `${f} no es el número de alertas sin lluvia. Separa las 30 alertas en acertadas y falsas.`,
      ([, p]) =>
        p === 72
          ? "72 % es la proporción de días lluviosos con alerta. Ahora el grupo de referencia son los días con alerta."
          : p === 30
            ? "30 % compara con los 60 días. El grupo de referencia son los días con alerta."
            : `${p} % no es la proporción de alertas que acabaron en lluvia.`,
    ],
    success: "Alertas falsas: 30 − 18 = 12. P(lluvia | alerta) = 18/30 = 60 %, distinto de P(alerta | lluvia) = 18/25 = 72 %.",
  }),

  "ahorro-observatorio": challenge({
    brief:
      "Otro banco ofrece un 12 % de interés simple anual sobre los mismos 1000 soles. La cuenta al 10 % compuesto empieza ganando menos. ¿En qué año el saldo compuesto supera por primera vez al simple? ¿Cuánto tiene la cuenta simple ese año?",
    inputs: [input("ano", "Año en que la compuesta supera a la simple", 20), input("simple", "Saldo de la cuenta simple ese año", 3000, "soles")],
    goals: ["Primer año en que gana la compuesta", "Saldo de la cuenta simple"],
    checks: [([a]) => a === 5, ([, s]) => s === 1600],
    hints: [
      ([a]) =>
        a === 0
          ? "Al empezar, ambas cuentas tienen 1000 soles."
          : a < 5
            ? `En el año ${a}, la simple tiene ${1000 + 120 * a} soles y la compuesta ${n(1000 * 1.1 ** a)}: todavía gana la simple.`
            : `En el año ${a} ya gana la compuesta, pero no es la primera vez.`,
      ([, s]) =>
        s === 1610 || s === 1611
          ? "Ese es el saldo de la cuenta compuesta. Se pide el de la simple."
          : `La cuenta simple suma lo mismo cada año: ${s} soles no corresponde a ese año.`,
    ],
    success:
      "Simple: 1000 + 120 × n. Compuesta: 1000 × 1,1ⁿ. En el año 4, 1480 frente a 1464,10; en el año 5, 1600 frente a 1610,51. El interés compuesto acaba ganando.",
  }),

  "trayectoria-cohete": challenge({
    brief:
      "Un cohete más potente sigue h(t) = −t² + 10t, con h en metros y t en segundos. El paracaídas solo se abre con seguridad a 16 m o más. Calcula su altura máxima y entre qué segundos está a 16 m o más.",
    inputs: [
      input("maxima", "Altura máxima", 40, "m"),
      input("sube", "Segundo en que sube a 16 m", 10, "s"),
      input("baja", "Segundo en que baja a 16 m", 10, "s"),
    ],
    goals: ["Altura máxima", "Momento en que sube a 16 m", "Momento en que baja a 16 m"],
    checks: [([m]) => m === 25, ([, s]) => s === 2, ([, , b]) => b === 8],
    hints: [
      ([m]) =>
        m === 16 ? "16 m era la altura máxima del primer cohete." : `${m} m no es la altura del vértice. ¿En qué segundo vuelve a tocar el suelo?`,
      ([, s]) => `En t = ${s}, h = ${10 * s - s * s} m.`,
      ([, s, b]) => (b === s ? "Ese es el momento en que sube. ¿Cuándo vuelve a pasar por 16 m al bajar?" : `En t = ${b}, h = ${10 * b - b * b} m.`),
    ],
    success:
      "Despega en t = 0 y aterriza en t = 10, así que el vértice está en t = 5: h(5) = 25 m. −t² + 10t = 16 da t = 2 y t = 8, simétricos respecto a t = 5.",
  }),
};

function throws(v: number[]) {
  return [4, 4, 8, 8, ...v];
}
function sum(values: number[]) {
  return values.reduce((a, b) => a + b, 0);
}
function sorted(v: number[]) {
  return throws(v).sort((a, b) => a - b);
}
function modes(v: number[]) {
  const counts = new Map<number, number>();
  for (const s of throws(v)) counts.set(s, (counts.get(s) ?? 0) + 1);
  const top = Math.max(...counts.values());
  return [...counts].filter(([, c]) => c === top).map(([s]) => s).sort((a, b) => a - b);
}
