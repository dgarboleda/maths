import type { UnitId } from "./types";

/** Una decisión que el estudiante ajusta antes de probar su plan. */
export interface AdventureInput {
  id: string;
  label: string;
  min: number;
  max: number;
  step: number;
  /** Valor con el que empieza el plan. */
  start: number;
  unit?: string;
  /** Pista que se descubre al revisar la pieza del escenario. */
  clue: string;
}

export interface AdventureResult {
  feedback: string;
  /** Una casilla por objetivo de `goals`; la misión se completa con todas. */
  goals: boolean[];
}

/** Aventura de unidad: un problema abierto donde las decisiones se prueban
 *  contra varias restricciones y cada error recibe una pista propia. */
export interface AdventureDef {
  id: string;
  unitId: UnitId;
  title: string;
  eyebrow: string;
  intro: string;
  initialFeedback: string;
  inspectFeedback: string;
  inspectFirst: string;
  inputs: AdventureInput[];
  goals: string[];
  evaluate(values: number[]): AdventureResult;
  success: string;
  /** Clases que enseñan la matemática de la aventura; tras la última se
   *  ofrece jugarla. */
  lessonIds: string[];
}

const all = (n: number, ok: boolean) => Array.from({ length: n }, () => ok);

const apagon: AdventureDef = {
  id: "apagon",
  unitId: "fracciones",
  title: "El apagón",
  eyebrow: "Capítulo 01 / Devuelve la energía a la ciudad",
  intro:
    "La red cayó durante la noche. Reparte una reserva de 120 unidades entre el hospital, la radio y el taller.",
  initialFeedback:
    "Inspecciona la central para conocer la reserva y las necesidades de la ciudad.",
  inspectFeedback:
    "Reserva disponible: 120. El hospital requiere 3/4 de la reserva, la radio 1/6 y el taller puede usar lo restante. Planifica y prueba la distribución.",
  inspectFirst: "Inspecciona primero las necesidades de la ciudad.",
  inputs: [
    { id: "hospital", label: "Hospital", min: 0, max: 120, step: 5, start: 0, clue: "Requiere 3/4 de la reserva original para mantener sus equipos." },
    { id: "radio", label: "Radio", min: 0, max: 120, step: 5, start: 0, clue: "Requiere 1/6 de la reserva original para coordinar la ayuda." },
    { id: "taller", label: "Taller", min: 0, max: 120, step: 5, start: 0, clue: "Necesita al menos 10 unidades. Puede utilizar lo que quede después de los otros edificios." },
  ],
  goals: ["Hospital con 3/4 de la reserva", "Radio con 1/6 de la reserva", "Taller con al menos 10"],
  evaluate([hospital, radio, workshop]) {
    const total = hospital + radio + workshop;
    if (total > 120)
      return {
        goals: all(3, false),
        feedback: `La red se protege y corta el suministro: pediste ${total}, pero hay 120. Redistribuye la reserva antes de conectar.`,
      };
    const goals = [hospital >= 90, radio >= 20, workshop >= 10];
    if (!goals[0])
      return {
        goals,
        feedback:
          "El hospital sigue con energía de emergencia. Necesita 3/4 de 120: encuentra el valor de un cuarto y toma tres partes.",
      };
    if (!goals[1])
      return {
        goals,
        feedback:
          "El hospital responde, pero la radio aún no transmite. Necesita 1/6 de la reserva original de 120, no de lo que queda después del hospital.",
      };
    if (!goals[2])
      return {
        goals,
        feedback:
          "El hospital y la radio funcionan. El taller necesita al menos 10 unidades para reparar la red: revisa cuánto queda después de ambos suministros.",
      };
    return {
      goals,
      feedback:
        "La ciudad recuperó la energía: el hospital funciona con 90, la radio transmite con 20 y el taller repara con 10. Tu distribución respeta las necesidades y conserva las 120 unidades.",
    };
  },
  success:
    "Usaste una referencia común: 3/4 de 120 = 90 y 1/6 de 120 = 20. Quedaron 10 para el taller.",
  lessonIds: ["fracciones-unidad", "fraccion-cantidad"],
};

const camara: AdventureDef = {
  id: "camara-fria",
  unitId: "numeros",
  title: "La cámara del mercado",
  eyebrow: "Capítulo 02 / Salva la comida del mercado",
  intro:
    "La cámara frigorífica del mercado se reinició y los termostatos marcan 0 °C. Ajusta helados, congelador y nevera antes de que llegue el camión.",
  initialFeedback:
    "Revisa el panel de control para conocer las temperaturas que necesita cada compartimento.",
  inspectFeedback:
    "Congelador: −18 °C o menos. Nevera: entre 1 y 5 °C. Helados: al menos 6 grados más fríos que el congelador. El compresor solo soporta 30 grados de diferencia entre la nevera y los helados.",
  inspectFirst: "Revisa primero el panel de control.",
  inputs: [
    { id: "helados", label: "Helados", min: -40, max: 10, step: 1, start: 0, unit: "°C", clue: "Deben estar al menos 6 grados por debajo del congelador." },
    { id: "congelador", label: "Congelador", min: -40, max: 10, step: 1, start: 0, unit: "°C", clue: "Necesita −18 °C o menos: más abajo en la recta numérica es más frío." },
    { id: "nevera", label: "Nevera", min: -40, max: 10, step: 1, start: 0, unit: "°C", clue: "Entre 1 y 5 °C: bajo cero congelaría la fruta." },
  ],
  goals: ["Congelador a −18 °C o menos", "Nevera entre 1 y 5 °C", "Helados 6 grados bajo el congelador", "Diferencia nevera − helados ≤ 30"],
  evaluate([helados, congelador, nevera]) {
    const gap = nevera - helados,
      goals = [congelador <= -18, nevera >= 1 && nevera <= 5, helados <= congelador - 6, gap <= 30];
    const neg = (x: number) => (x < 0 ? `−${-x}` : `${x}`);
    if (!goals[0])
      return {
        goals,
        feedback: `${neg(congelador)} °C está por encima de −18 en la recta numérica: es más cálido. El congelador necesita −18 °C o menos.`,
      };
    if (!goals[1])
      return {
        goals,
        feedback:
          nevera < 1
            ? `Con ${neg(nevera)} °C la fruta se congela. La nevera va entre 1 y 5 °C.`
            : `Con ${neg(nevera)} °C la leche se estropea. La nevera va entre 1 y 5 °C.`,
      };
    if (!goals[2])
      return {
        goals,
        feedback: `Los helados deben estar 6 grados por debajo del congelador: ${neg(congelador)} − 6 = ${neg(congelador - 6)} °C o menos. Bajar es restar.`,
      };
    if (!goals[3])
      return {
        goals,
        feedback: `El compresor se sobrecarga: ${neg(nevera)} − (${neg(helados)}) = ${gap} grados. Restar un negativo suma; acerca los helados o la nevera.`,
      };
    return {
      goals,
      feedback: `Todo en orden: congelador a ${neg(congelador)} °C, nevera a ${neg(nevera)} °C y helados a ${neg(helados)} °C, con ${gap} grados de diferencia. La comida llega a salvo.`,
    };
  },
  success:
    "Ordenaste temperaturas negativas en la recta y calculaste diferencias como nevera − helados: restar un número negativo suma su distancia.",
  lessonIds: ["enteros-recta", "enteros-suma-resta"],
};

const receta: AdventureDef = {
  id: "receta-festival",
  unitId: "proporcionalidad",
  title: "La receta del festival",
  eyebrow: "Capítulo 03 / Cocina para todo el barrio",
  intro:
    "La receta de pan dulce de la abuela es para 4 personas, pero al festival vienen 10. Calcula los ingredientes y compra la harina justa.",
  initialFeedback: "Lee la receta original para conocer las cantidades.",
  inspectFeedback:
    "Receta para 4 personas: 200 g de harina, 300 ml de leche y 2 huevos. La tienda vende harina en bolsas de 250 g. Prepara para 10 personas.",
  inspectFirst: "Lee primero la receta original.",
  inputs: [
    { id: "harina", label: "Harina", min: 0, max: 2000, step: 10, start: 0, unit: "g", clue: "200 g alcanzan para 4 personas." },
    { id: "leche", label: "Leche", min: 0, max: 2000, step: 10, start: 0, unit: "ml", clue: "300 ml alcanzan para 4 personas." },
    { id: "huevos", label: "Huevos", min: 0, max: 20, step: 1, start: 0, clue: "2 huevos alcanzan para 4 personas." },
    { id: "bolsas", label: "Bolsas de harina", min: 0, max: 10, step: 1, start: 0, clue: "Cada bolsa trae 250 g; no se venden bolsas por la mitad." },
  ],
  goals: ["Harina para 10", "Leche para 10", "Huevos para 10", "Bolsas justas"],
  evaluate([harina, leche, huevos, bolsas]) {
    const goals = [harina === 500, leche === 750, huevos === 5, bolsas === 2];
    const scale = (name: string, base: number, value: number, unit: string) =>
      value === base + 6
        ? `Sumaste 6 a ${name}, pero las cantidades no crecen sumando: pasar de 4 a 10 personas multiplica todo por 10/4 = 2,5.`
        : `${name[0].toUpperCase()}${name.slice(1)}: ${value} ${unit} no corresponde a 10 personas. Calcula cuánto toca a 1 persona (${base} ÷ 4) y multiplica por 10.`;
    if (!goals[0]) return { goals, feedback: scale("la harina", 200, harina, "g") };
    if (!goals[1]) return { goals, feedback: scale("la leche", 300, leche, "ml") };
    if (!goals[2]) return { goals, feedback: scale("los huevos", 2, huevos, "huevos") };
    if (!goals[3])
      return {
        goals,
        feedback:
          bolsas * 250 < 500
            ? `Con ${bolsas} bolsa${bolsas === 1 ? "" : "s"} tienes ${bolsas * 250} g: no alcanza para 500 g.`
            : `Con ${bolsas} bolsas tienes ${bolsas * 250} g: sobra al menos una bolsa entera. Compra la cantidad mínima.`,
      };
    return {
      goals,
      feedback:
        "¡El pan dulce alcanza para las 10 personas! 500 g de harina, 750 ml de leche, 5 huevos y 2 bolsas sin desperdicio.",
    };
  },
  success:
    "Mantuviste la razón de la receta: todo se multiplicó por 2,5. Sumar la misma cantidad a cada ingrediente habría cambiado el sabor.",
  lessonIds: ["razones", "proporcionalidad"],
};

const ascensor: AdventureDef = {
  id: "ascensor-carga",
  unitId: "algebra",
  title: "El ascensor de carga",
  eyebrow: "Capítulo 04 / Sube los suministros a la torre",
  intro:
    "Hay que subir 40 cajas de suministros a la torre de control antes del anochecer. El ascensor es viejo y el tiempo, poco.",
  initialFeedback: "Lee la placa del ascensor para conocer sus límites.",
  inspectFeedback:
    "Carga máxima: 600 kg. El operario pesa 80 kg y el carro 25 kg; viajan en cada subida. Cada caja pesa 45 kg. Solo hay tiempo para 4 viajes.",
  inspectFirst: "Lee primero la placa del ascensor.",
  inputs: [
    { id: "cajas", label: "Cajas por viaje", min: 0, max: 20, step: 1, start: 0, clue: "80 + 25 + 45 × cajas no puede superar 600 kg." },
    { id: "viajes", label: "Viajes", min: 0, max: 20, step: 1, start: 0, clue: "Cajas por viaje × viajes debe llegar a 40, en 4 viajes como máximo." },
  ],
  goals: ["Sin sobrecarga", "Llegan las 40 cajas", "4 viajes o menos"],
  evaluate([cajas, viajes]) {
    const peso = 105 + 45 * cajas,
      goals = [peso <= 600, cajas * viajes >= 40, viajes <= 4];
    if (!goals[0])
      return {
        goals,
        feedback: `Sobrecarga: 80 + 25 + 45 × ${cajas} = ${peso} kg > 600. Resuelve 105 + 45c ≤ 600 para saber cuántas cajas caben.`,
      };
    if (!goals[2])
      return {
        goals,
        feedback: `${viajes} viajes no caben antes del anochecer: solo hay tiempo para 4. Carga más cajas en cada viaje.`,
      };
    if (!goals[1])
      return {
        goals,
        feedback: `${cajas} × ${viajes} = ${cajas * viajes} cajas: faltan ${40 - cajas * viajes}. Con 4 viajes, ¿cuántas cajas por viaje necesitas como mínimo?`,
      };
    return {
      goals,
      feedback: `La torre tiene sus suministros: ${viajes} viajes con ${cajas} cajas (${peso} kg por viaje) suben ${cajas * viajes} cajas sin sobrecargar el ascensor.`,
    };
  },
  success:
    "Resolviste la inecuación 105 + 45c ≤ 600 (c ≤ 11) y comprobaste que 4 viajes de 10 u 11 cajas cubren las 40.",
  lessonIds: ["modelar-ecuaciones", "inecuaciones"],
};

const baldosas: AdventureDef = {
  id: "jardin-baldosas",
  unitId: "expresiones",
  title: "El jardín de baldosas",
  eyebrow: "Capítulo 05 / Diseña la plaza nueva",
  intro:
    "La plaza tendrá un jardín cuadrado rodeado por un borde de baldosas de 1 m. El vivero y el almacén imponen condiciones.",
  initialFeedback: "Consulta el pedido del almacén y del vivero.",
  inspectFeedback:
    "El jardín cuadrado de lado n m necesita al menos 50 m² de césped. El borde de baldosas de 1 m × 1 m rodea el jardín por fuera, esquinas incluidas. El almacén tiene 40 baldosas como máximo y no quiere sobrantes.",
  inspectFirst: "Consulta primero las condiciones del pedido.",
  inputs: [
    { id: "lado", label: "Lado del jardín", min: 1, max: 20, step: 1, start: 1, unit: "m", clue: "El área del jardín es n²: debe llegar a 50 m²." },
    { id: "baldosas", label: "Baldosas", min: 0, max: 100, step: 1, start: 0, clue: "Cuenta un lado, los otros tres y no olvides las 4 esquinas: 4n + 4." },
  ],
  goals: ["Césped de al menos 50 m²", "Borde completo sin sobrantes", "40 baldosas o menos"],
  evaluate([lado, baldosas]) {
    const area = lado * lado,
      need = 4 * lado + 4,
      goals = [area >= 50, baldosas === need, need <= 40];
    if (!goals[0])
      return {
        goals,
        feedback: `Con lado ${lado}, el césped mide ${lado}² = ${area} m², menos de 50. Busca el menor lado cuyo cuadrado llegue a 50.`,
      };
    if (!goals[2])
      return {
        goals,
        feedback: `Un jardín de lado ${lado} necesita 4 × ${lado} + 4 = ${need} baldosas y el almacén solo tiene 40.`,
      };
    if (!goals[1])
      return {
        goals,
        feedback:
          baldosas === 4 * lado
            ? `Contaste 4 × ${lado} = ${baldosas}, pero faltan las 4 baldosas de las esquinas: 4n + 4.`
            : baldosas < need
              ? `Con ${baldosas} baldosas el borde queda abierto. Para lado ${lado} se necesitan 4n + 4.`
              : `Sobran baldosas: ${baldosas} es más que el borde. Para lado ${lado} se necesitan 4n + 4.`,
      };
    return {
      goals,
      feedback: `Diseño aprobado: ${area} m² de césped y un borde de 4 × ${lado} + 4 = ${need} baldosas, sin sobrantes.`,
    };
  },
  success:
    "Usaste dos expresiones del mismo lado n: n² para el césped y 4n + 4 para el borde. Solo n = 8 y n = 9 cumplen ambas condiciones.",
  lessonIds: ["expresiones-algebraicas", "propiedad-distributiva"],
};

const huerto: AdventureDef = {
  id: "huerto-escolar",
  unitId: "geometria",
  title: "El huerto escolar",
  eyebrow: "Capítulo 06 / Cerca el huerto de la escuela",
  intro:
    "La escuela recibió 36 m de cerca para un huerto rectangular. Hay que usarla toda y lograr espacio suficiente para los cultivos.",
  initialFeedback: "Mira el plano del patio para conocer las condiciones.",
  inspectFeedback:
    "Cerca disponible: 36 m, se usa completa. El huerto necesita al menos 72 m² de área. A lo largo debe caber un camino de riego de 10 m.",
  inspectFirst: "Mira primero el plano del patio.",
  inputs: [
    { id: "largo", label: "Largo", min: 1, max: 30, step: 1, start: 1, unit: "m", clue: "Debe medir al menos 10 m para el camino de riego." },
    { id: "ancho", label: "Ancho", min: 1, max: 30, step: 1, start: 1, unit: "m", clue: "El perímetro es 2 × (largo + ancho) = 36." },
  ],
  goals: ["Perímetro de 36 m", "Área de al menos 72 m²", "Largo de al menos 10 m"],
  evaluate([largo, ancho]) {
    const perimetro = 2 * (largo + ancho),
      area = largo * ancho,
      goals = [perimetro === 36, area >= 72, largo >= 10];
    if (!goals[0])
      return {
        goals,
        feedback:
          largo + ancho === 36
            ? "Largo + ancho = 36 recorre solo dos lados. La cerca da la vuelta completa: 2 × (largo + ancho) = 36."
            : `El perímetro es 2 × (${largo} + ${ancho}) = ${perimetro} m, ${perimetro > 36 ? "más" : "menos"} de los 36 m de cerca.`,
      };
    if (!goals[2])
      return {
        goals,
        feedback: `Con ${largo} m de largo el camino de riego de 10 m no cabe.`,
      };
    if (!goals[1])
      return {
        goals,
        feedback: `El área es ${largo} × ${ancho} = ${area} m², menos de 72. Con el mismo perímetro, un rectángulo más parecido a un cuadrado encierra más área.`,
      };
    return {
      goals,
      feedback: `¡Huerto listo! ${largo} m × ${ancho} m: perímetro de ${perimetro} m y ${area} m² de cultivo.`,
    };
  },
  success:
    "El perímetro fijo deja largo + ancho = 18; entre esos rectángulos, los de 10 × 8, 11 × 7 y 12 × 6 cumplen área y camino.",
  lessonIds: ["perimetro-area"],
};

const torneo: AdventureDef = {
  id: "torneo-lanzamientos",
  unitId: "datos",
  title: "El torneo de lanzamientos",
  eyebrow: "Capítulo 07 / Planifica la final",
  intro:
    "Tu equipo lleva cuatro lanzamientos en el torneo y quedan tres. La entrenadora quiere un objetivo realista para cada uno.",
  initialFeedback: "Consulta la tabla de puntuaciones.",
  inspectFeedback:
    "Puntuaciones: 6, 9, 7 y 8. Cada lanzamiento vale de 0 a 10 puntos. Para ganar, la media de los 7 lanzamientos debe ser exactamente 8 y la moda también debe ser 8.",
  inspectFirst: "Consulta primero la tabla de puntuaciones.",
  inputs: [
    { id: "l5", label: "Lanzamiento 5", min: 0, max: 10, step: 1, start: 0, clue: "Cada lanzamiento vale de 0 a 10." },
    { id: "l6", label: "Lanzamiento 6", min: 0, max: 10, step: 1, start: 0, clue: "Media 8 en 7 lanzamientos: la suma total debe ser 56." },
    { id: "l7", label: "Lanzamiento 7", min: 0, max: 10, step: 1, start: 0, clue: "La moda es el valor que más se repite; debe ser solo el 8." },
  ],
  goals: ["Media de 8", "Moda de 8"],
  evaluate(values) {
    const scores = [6, 9, 7, 8, ...values],
      sum = scores.reduce((a, b) => a + b, 0),
      counts = new Map<number, number>();
    for (const s of scores) counts.set(s, (counts.get(s) ?? 0) + 1);
    const top = Math.max(...counts.values()),
      modes = [...counts].filter(([, c]) => c === top).map(([s]) => s),
      goals = [sum === 56, modes.length === 1 && modes[0] === 8];
    if (!goals[0])
      return {
        goals,
        feedback:
          values.reduce((a, b) => a + b, 0) === 24
            ? "Los tres lanzamientos suman 24, como si la media fuera de 3 lanzamientos. La media es de los 7: la suma total debe ser 7 × 8 = 56."
            : `Los 7 lanzamientos suman ${sum}; la media sería ${(sum / 7).toLocaleString("es", { maximumFractionDigits: 2 })}. Para media 8, la suma total debe ser 7 × 8 = 56.`,
      };
    if (!goals[1])
      return {
        goals,
        feedback: `La media es 8, pero ${modes.length > 1 ? `hay empate: ${modes.join(", ")} se repiten ${top} ${top === 1 ? "vez" : "veces"}` : `la moda es ${modes[0]}`}. El 8 debe repetirse más que cualquier otro valor.`,
      };
    return {
      goals,
      feedback: `¡Plan ganador! ${scores.join(", ")}: suman 56, media 8 y el 8 es el valor más repetido.`,
    };
  },
  success:
    "Usaste la media al revés: media × cantidad = suma total. Con 56 − 30 = 26 puntos para tres lanzamientos y el 8 como moda, el plan es 8, 8 y 10.",
  lessonIds: ["media-mediana-moda"],
};

export const ADVENTURES: AdventureDef[] = [apagon, camara, receta, ascensor, baldosas, huerto, torneo];

export function getAdventure(id: string) {
  return ADVENTURES.find((adventure) => adventure.id === id);
}
