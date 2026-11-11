import { MORE_ADVENTURES } from "./moreAdventures";
import type { LearningProgress, UnitId } from "./types";

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
  /** Todas las clases que deben completarse antes de jugar. */
  lessonIds: string[];
}

/** Una partida del reto experto: el giro de la historia con unos datos
 *  concretos, sus objetivos y cómo responde a cada plan. */
export interface ExpertRound {
  /** El giro de la historia, con todos los datos de esta partida. */
  brief: string;
  goals: string[];
  evaluate(values: number[]): AdventureResult;
  success: string;
}

/** Reto experto: una familia de partidas con los mismos objetivos y datos
 *  distintos, para poder volver a jugarlo. Exige optimizar, razonar al
 *  revés o combinar más condiciones, y no muestra pistas por entrada. */
export interface ExpertChallenge {
  /** Entradas propias (iguales en todas las partidas); si faltan, las de la misión. */
  inputs?: AdventureInput[];
  /** Número de partidas distintas. La 0 es la original. */
  variants: number;
  round(variant: number): ExpertRound;
  /** Un plan que supera la partida (para las pruebas y el resumen). */
  solution(variant: number): number[];
}

/** Entradas del reto experto: las suyas o, si no tiene, las de la misión. */
export function expertInputs(adventure: Pick<AdventureDef, "inputs">, challenge: Pick<ExpertChallenge, "inputs"> | undefined): AdventureInput[] {
  return challenge?.inputs ?? adventure.inputs;
}

/** La aplicación terminada por sí sola no sustituye la explicación y los ejemplos. */
export function missingAdventureLessons(
  adventure: Pick<AdventureDef, "lessonIds">,
  progress: Record<string, Pick<LearningProgress, "classCompleted" | "examplesCompleted" | "completedAt"> | undefined>,
): string[] {
  return adventure.lessonIds.filter((id) => {
    const lesson = progress[id];
    return !lesson?.classCompleted || !lesson.examplesCompleted || !lesson.completedAt;
  });
}

const all = (n: number, ok: boolean) => Array.from({ length: n }, () => ok);

const apagon: AdventureDef = {
  id: "apagon",
  unitId: "fracciones",
  title: "El apagón",
  eyebrow: "Capítulo 01 / Devuelve la energía a la ciudad",
  intro:
    "La red cayó durante la noche. Reparte una reserva de 180 unidades entre el hospital, la radio y el taller.",
  initialFeedback:
    "Inspecciona la central para conocer la reserva y las necesidades de la ciudad.",
  inspectFeedback:
    "Reserva disponible: 180. El hospital requiere 5/9 de la reserva, la radio 1/4 y el taller puede usar lo restante. Planifica y prueba la distribución.",
  inspectFirst: "Inspecciona primero las necesidades de la ciudad.",
  inputs: [
    { id: "hospital", label: "Hospital", min: 0, max: 180, step: 5, start: 0, clue: "Requiere 5/9 de la reserva original para mantener sus equipos." },
    { id: "radio", label: "Radio", min: 0, max: 180, step: 5, start: 0, clue: "Requiere 1/4 de la reserva original para coordinar la ayuda." },
    { id: "taller", label: "Taller", min: 0, max: 180, step: 5, start: 0, clue: "Necesita al menos 35 unidades. Puede utilizar lo que quede después de los otros edificios." },
  ],
  goals: ["Hospital con 5/9 de la reserva", "Radio con 1/4 de la reserva", "Taller con al menos 35"],
  evaluate([hospital, radio, workshop]) {
    const total = hospital + radio + workshop;
    if (total > 180)
      return {
        goals: all(3, false),
        feedback: `La red se protege y corta el suministro: pediste ${total}, pero hay 180. Redistribuye la reserva antes de conectar.`,
      };
    const goals = [hospital >= 100, radio >= 45, workshop >= 35];
    if (!goals[0])
      return {
        goals,
        feedback:
          "El hospital sigue con energía de emergencia. Necesita 5/9 de 180: encuentra el valor de un noveno y toma cinco partes.",
      };
    if (!goals[1])
      return {
        goals,
        feedback:
          "El hospital responde, pero la radio aún no transmite. Necesita 1/4 de la reserva original de 180, no de lo que queda después del hospital.",
      };
    if (!goals[2])
      return {
        goals,
        feedback:
          "El hospital y la radio funcionan. El taller necesita al menos 35 unidades para reparar la red: revisa cuánto queda después de ambos suministros.",
      };
    return {
      goals,
      feedback:
        "La ciudad recuperó la energía: el hospital funciona con 100, la radio transmite con 45 y el taller repara con 35. Tu distribución respeta las necesidades y conserva las 180 unidades.",
    };
  },
  success:
    "Usaste una referencia común: 5/9 de 180 = 100 y 1/4 de 180 = 45. Quedaron 35 para el taller.",
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
    "Congelador: −18 °C o menos. Nevera: entre 1 y 5 °C. Helados: al menos 6 grados más fríos que el congelador. El compresor solo soporta 27 grados de diferencia entre la nevera y los helados.",
  inspectFirst: "Revisa primero el panel de control.",
  inputs: [
    { id: "helados", label: "Helados", min: -40, max: 10, step: 1, start: 0, unit: "°C", clue: "Deben estar al menos 6 grados por debajo del congelador." },
    { id: "congelador", label: "Congelador", min: -40, max: 10, step: 1, start: 0, unit: "°C", clue: "Necesita −18 °C o menos: más abajo en la recta numérica es más frío." },
    { id: "nevera", label: "Nevera", min: -40, max: 10, step: 1, start: 0, unit: "°C", clue: "Entre 1 y 5 °C: bajo cero congelaría la fruta." },
  ],
  goals: ["Congelador a −18 °C o menos", "Nevera entre 1 y 5 °C", "Helados 6 grados bajo el congelador", "Diferencia nevera − helados ≤ 27"],
  evaluate([helados, congelador, nevera]) {
    const gap = nevera - helados,
      goals = [congelador <= -18, nevera >= 1 && nevera <= 5, helados <= congelador - 6, gap <= 27];
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
    "La receta de pan dulce de la abuela es para 4 personas, pero al festival vienen 14. Calcula los ingredientes y compra la harina justa.",
  initialFeedback: "Lee la receta original para conocer las cantidades.",
  inspectFeedback:
    "Receta para 4 personas: 200 g de harina, 300 ml de leche y 2 huevos. La tienda vende harina en bolsas de 250 g. Prepara para 14 personas.",
  inspectFirst: "Lee primero la receta original.",
  inputs: [
    { id: "harina", label: "Harina", min: 0, max: 2000, step: 10, start: 0, unit: "g", clue: "200 g alcanzan para 4 personas." },
    { id: "leche", label: "Leche", min: 0, max: 2000, step: 10, start: 0, unit: "ml", clue: "300 ml alcanzan para 4 personas." },
    { id: "huevos", label: "Huevos", min: 0, max: 20, step: 1, start: 0, clue: "2 huevos alcanzan para 4 personas." },
    { id: "bolsas", label: "Bolsas de harina", min: 0, max: 10, step: 1, start: 0, clue: "Cada bolsa trae 250 g; no se venden bolsas por la mitad." },
  ],
  goals: ["Harina para 14", "Leche para 14", "Huevos para 14", "Bolsas justas"],
  evaluate([harina, leche, huevos, bolsas]) {
    const goals = [harina === 700, leche === 1050, huevos === 7, bolsas === 3];
    const scale = (name: string, base: number, value: number, unit: string) =>
      value === base + 10
        ? `Sumaste 10 a ${name}, pero las cantidades no crecen sumando: pasar de 4 a 14 personas multiplica todo por 14/4 = 3,5.`
        : `${name[0].toUpperCase()}${name.slice(1)} → ${value} ${unit} no corresponde a 14 personas. Calcula cuánto toca a 1 persona (${base} ÷ 4) y multiplica por 14.`;
    if (!goals[0]) return { goals, feedback: scale("la harina", 200, harina, "g") };
    if (!goals[1]) return { goals, feedback: scale("la leche", 300, leche, "ml") };
    if (!goals[2]) return { goals, feedback: scale("los huevos", 2, huevos, "huevos") };
    if (!goals[3])
      return {
        goals,
        feedback:
          bolsas * 250 < 700
            ? `Con ${bolsas} bolsa${bolsas === 1 ? "" : "s"} tienes ${bolsas * 250} g: no alcanza para 700 g.`
            : `Con ${bolsas} bolsas tienes ${bolsas * 250} g: sobra al menos una bolsa entera. Compra la cantidad mínima.`,
      };
    return {
      goals,
      feedback:
        "¡El pan dulce alcanza para las 14 personas! 700 g de harina, 1050 ml de leche, 7 huevos y 3 bolsas; sobran 50 g.",
    };
  },
  success:
    "Mantuviste la razón de la receta: todo se multiplicó por 3,5. Sumar la misma cantidad a cada ingrediente habría cambiado el sabor.",
  lessonIds: ["razones", "proporcionalidad"],
};

const ascensor: AdventureDef = {
  id: "ascensor-carga",
  unitId: "algebra",
  title: "El ascensor de carga",
  eyebrow: "Capítulo 04 / Sube los suministros a la torre",
  intro:
    "Hay que subir 44 cajas de suministros a la torre de control antes del anochecer. El ascensor es viejo y el tiempo, poco.",
  initialFeedback: "Lee la placa del ascensor para conocer sus límites.",
  inspectFeedback:
    "Carga máxima: 600 kg. El operario pesa 80 kg y el carro 25 kg; viajan en cada subida. Cada caja pesa 45 kg. Solo hay tiempo para 4 viajes.",
  inspectFirst: "Lee primero la placa del ascensor.",
  inputs: [
    { id: "cajas", label: "Cajas por viaje", min: 0, max: 20, step: 1, start: 0, clue: "80 + 25 + 45 × cajas no puede superar 600 kg." },
    { id: "viajes", label: "Viajes", min: 0, max: 20, step: 1, start: 0, clue: "Cajas por viaje × viajes debe llegar a 44, en 4 viajes como máximo." },
  ],
  goals: ["Sin sobrecarga", "Llegan las 44 cajas", "4 viajes o menos"],
  evaluate([cajas, viajes]) {
    const peso = 105 + 45 * cajas,
      goals = [peso <= 600, cajas * viajes >= 44, viajes <= 4];
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
        feedback: `${cajas} × ${viajes} = ${cajas * viajes} cajas: faltan ${44 - cajas * viajes}. Con 4 viajes, ¿cuántas cajas por viaje necesitas como mínimo?`,
      };
    return {
      goals,
      feedback: `La torre tiene sus suministros: ${viajes} viajes con ${cajas} cajas (${peso} kg por viaje) suben ${cajas * viajes} cajas sin sobrecargar el ascensor.`,
    };
  },
  success:
    "Resolviste la inecuación 105 + 45c ≤ 600 (c ≤ 11) y comprobaste que 4 viajes de 11 cajas cubren las 44.",
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
    "El jardín cuadrado de lado n m necesita al menos 110 m² de césped. El borde de baldosas de 1 m × 1 m rodea el jardín por fuera, esquinas incluidas. El almacén tiene 48 baldosas como máximo y no quiere sobrantes.",
  inspectFirst: "Consulta primero las condiciones del pedido.",
  inputs: [
    { id: "lado", label: "Lado del jardín", min: 1, max: 20, step: 1, start: 1, unit: "m", clue: "El área del jardín es n²: debe llegar a 110 m²." },
    { id: "baldosas", label: "Baldosas", min: 0, max: 100, step: 1, start: 0, clue: "Cuenta un lado, los otros tres y no olvides las 4 esquinas: 4n + 4." },
  ],
  goals: ["Césped de al menos 110 m²", "Borde completo sin sobrantes", "48 baldosas o menos"],
  evaluate([lado, baldosas]) {
    const area = lado * lado,
      need = 4 * lado + 4,
      goals = [area >= 110, baldosas === need, baldosas <= 48];
    if (!goals[0])
      return {
        goals,
        feedback: `Con lado ${lado}, el césped mide ${lado}² = ${area} m², menos de 110. Busca el menor lado cuyo cuadrado llegue a 110.`,
      };
    if (need > 48)
      return {
        goals,
        feedback: `Un jardín de lado ${lado} necesita 4 × ${lado} + 4 = ${need} baldosas y el almacén solo tiene 48.`,
      };
    if (!goals[2])
      return {
        goals,
        feedback: `Elegiste ${baldosas} baldosas, pero el almacén solo tiene 48.`,
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
    "Usaste dos expresiones del mismo lado n: n² para el césped y 4n + 4 para el borde. Solo n = 11 cumple ambas condiciones.",
  lessonIds: ["expresiones-algebraicas", "propiedad-distributiva"],
};

const huerto: AdventureDef = {
  id: "huerto-escolar",
  unitId: "geometria",
  title: "El huerto escolar",
  eyebrow: "Capítulo 06 / Cerca el huerto de la escuela",
  intro:
    "La escuela recibió 44 m de cerca para un huerto rectangular. Hay que usarla toda y lograr espacio suficiente para los cultivos.",
  initialFeedback: "Mira el plano del patio para conocer las condiciones.",
  inspectFeedback:
    "Cerca disponible: 44 m, se usa completa. El huerto necesita al menos 112 m² de área. A lo largo debe caber un camino de riego de 12 m.",
  inspectFirst: "Mira primero el plano del patio.",
  inputs: [
    { id: "largo", label: "Largo", min: 1, max: 30, step: 1, start: 1, unit: "m", clue: "Debe medir al menos 12 m para el camino de riego." },
    { id: "ancho", label: "Ancho", min: 1, max: 30, step: 1, start: 1, unit: "m", clue: "El perímetro es 2 × (largo + ancho) = 44." },
  ],
  goals: ["Perímetro de 44 m", "Área de al menos 112 m²", "Largo de al menos 12 m"],
  evaluate([largo, ancho]) {
    const perimetro = 2 * (largo + ancho),
      area = largo * ancho,
      goals = [perimetro === 44, area >= 112, largo >= 12];
    if (!goals[0])
      return {
        goals,
        feedback:
          largo + ancho === 44
            ? "Largo + ancho = 44 recorre solo dos lados. La cerca da la vuelta completa: 2 × (largo + ancho) = 44."
            : `El perímetro es 2 × (${largo} + ${ancho}) = ${perimetro} m, ${perimetro > 44 ? "más" : "menos"} de los 44 m de cerca.`,
      };
    if (!goals[2])
      return {
        goals,
        feedback: `Con ${largo} m de largo el camino de riego de 12 m no cabe.`,
      };
    if (!goals[1])
      return {
        goals,
        feedback: `El área es ${largo} × ${ancho} = ${area} m², menos de 112. Con el mismo perímetro, un rectángulo más parecido a un cuadrado encierra más área.`,
      };
    return {
      goals,
      feedback: `¡Huerto listo! ${largo} m × ${ancho} m: perímetro de ${perimetro} m y ${area} m² de cultivo.`,
    };
  },
  success:
    "El perímetro fijo deja largo + ancho = 22; entre esos rectángulos, los de 12 × 10, 13 × 9 y 14 × 8 cumplen área y camino.",
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
    "Puntuaciones: 4, 4, 8 y 8. Cada lanzamiento vale de 0 a 10 puntos. Para ganar, la media de los 7 lanzamientos debe ser exactamente 7, la moda debe ser 8 y el rango debe ser 5.",
  inspectFirst: "Consulta primero la tabla de puntuaciones.",
  inputs: [
    { id: "l5", label: "Lanzamiento 5", min: 0, max: 10, step: 1, start: 0, clue: "Cada lanzamiento vale de 0 a 10." },
    { id: "l6", label: "Lanzamiento 6", min: 0, max: 10, step: 1, start: 0, clue: "Media 7 en 7 lanzamientos: la suma total debe ser 49." },
    { id: "l7", label: "Lanzamiento 7", min: 0, max: 10, step: 1, start: 0, clue: "La moda es el valor que más se repite; debe ser solo el 8." },
  ],
  goals: ["Media de 7", "Moda de 8", "Rango de 5"],
  evaluate(values) {
    const scores = [4, 4, 8, 8, ...values],
      sum = scores.reduce((a, b) => a + b, 0),
      counts = new Map<number, number>();
    for (const s of scores) counts.set(s, (counts.get(s) ?? 0) + 1);
    const top = Math.max(...counts.values()),
      modes = [...counts].filter(([, c]) => c === top).map(([s]) => s),
      goals = [sum === 49, modes.length === 1 && modes[0] === 8, Math.max(...scores) - Math.min(...scores) === 5];
    if (!goals[0])
      return {
        goals,
        feedback:
          values.reduce((a, b) => a + b, 0) === 21
            ? "Los tres lanzamientos suman 21, como si la media fuera de 3 lanzamientos. La media es de los 7: la suma total debe ser 7 × 7 = 49."
            : `Los 7 lanzamientos suman ${sum}; la media sería ${(sum / 7).toLocaleString("es", { maximumFractionDigits: 2 })}. Para media 7, la suma total debe ser 7 × 7 = 49.`,
      };
    if (!goals[1])
      return {
        goals,
        feedback: `La media es 7, pero ${modes.length > 1 ? `hay empate: ${modes.join(", ")} se repiten ${top} ${top === 1 ? "vez" : "veces"}` : `la moda es ${modes[0]}`}. El 8 debe repetirse más que cualquier otro valor.`,
      };
    if (!goals[2]) return { goals, feedback: `El rango es ${Math.max(...scores) - Math.min(...scores)}: resta la puntuación menor de la mayor y busca que la diferencia sea 5.` };
    return {
      goals,
      feedback: `¡Plan ganador! ${scores.join(", ")}: suman 49, media 7 y el 8 es el valor más repetido.`,
    };
  },
  success:
    "Usaste la media al revés: media × cantidad = suma total. Con 49 − 24 = 25 puntos para tres lanzamientos, el plan 8, 8 y 9 cumple la moda y el rango.",
  lessonIds: ["media-mediana-moda"],
};

// Los retos expertos viven en `expertChallenges.ts` y no se importan aquí:
// este catálogo llega a la página de cada clase, que no los necesita.
export const ADVENTURES: AdventureDef[] = [apagon, camara, receta, ascensor, baldosas, huerto, torneo, ...MORE_ADVENTURES];

export function getAdventure(id: string) {
  return ADVENTURES.find((adventure) => adventure.id === id);
}
