import { defineLesson } from "./defineLesson";
import { choice as c, example as ex, numeric as n } from "./questions";
import type { Lesson } from "./types";

export const INVERSE_LESSONS: Lesson[] = [
  defineLesson({
    id: "proporcionalidad-inversa",
    unitId: "proporcionalidad",
    title: "Proporcionalidad inversa",
    objective:
      "Reconocer relaciones de proporcionalidad inversa, usar su producto constante y distinguirlas de la proporcionalidad directa.",
    purpose:
      "Cuantas más bombas trabajan, menos tiempo tarda en llenarse el depósito. Para planificar equipos hay que saber cómo cambia el tiempo.",
    prerequisites: ["proporcionalidad"],
    legacyModuleIds: ["algebra-d5", "algebra-d9"],
    visual: "inverse",
    vocabulary: [
      { term: "Proporcionalidad inversa", meaning: "Relación en la que, si una cantidad se multiplica por k, la otra se divide entre k: x · y es constante." },
      { term: "Constante de proporcionalidad inversa", meaning: "El producto x · y, igual para todos los pares." },
    ],
    sections: [
      {
        title: "Una sube y la otra baja… en la misma proporción",
        paragraphs: [
          "Si 2 bombas llenan un depósito en 12 horas, 4 bombas iguales tardan 6 horas: el doble de bombas, la mitad de tiempo.",
          "No basta con que una cantidad baje cuando la otra sube: debe dividirse por el mismo factor por el que se multiplicó la otra.",
        ],
        formula: "2 × 12 = 4 × 6 = 24",
      },
      {
        title: "El producto se conserva",
        paragraphs: [
          "En una relación inversa, x · y vale siempre lo mismo. Ese producto representa el trabajo total: 24 «horas-bomba».",
          "Para hallar un valor desconocido: y = constante ÷ x. Con 3 bombas, 24 ÷ 3 = 8 horas.",
        ],
        formula: "x · y = k;  y = k ÷ x",
      },
      {
        title: "¿Directa o inversa?",
        paragraphs: [
          "En una directa se conserva el cociente y/x: más sensores, más consumo. En una inversa se conserva el producto: más trabajadores, menos días.",
          "Pregúntate qué ocurre al duplicar una cantidad: si la otra se duplica, es directa; si se reduce a la mitad, inversa; si no ocurre ninguna de las dos, no es proporcional.",
        ],
        formula: "directa: y/x constante;  inversa: x · y constante",
      },
    ],
    examples: [
      ex("6 técnicos reparan una línea en 10 días. ¿Cuánto tardan 4 técnicos al mismo ritmo?", [
        ["6 × 10 = 60", "El trabajo total son 60 días-técnico."],
        ["60 ÷ 4 = 15", "Con menos técnicos, el mismo trabajo lleva más días."],
        ["4 × 15 = 60", "El producto se conserva."],
      ], "Tardan 15 días."),
      ex("Tabla: x = 1, 2, 4; y = 20, 10, 5. ¿Qué relación es?", [
        ["1 × 20 = 2 × 10 = 4 × 5 = 20", "El producto es constante."],
        ["20/1 ≠ 10/2", "El cociente cambia: no es directa."],
        ["y = 20 ÷ x", "Es una proporcionalidad inversa de constante 20."],
      ], "Al duplicar x, y se reduce a la mitad."),
    ],
    diagnostic: [
      n("d-1", "¿Cuánto es 48 ÷ 6?", 8, ["6 × 8 = 48."], ["Busca un factor.", "6 × 8.", "8."]),
      c("d-2", "Si 3 sensores consumen 12, ¿cuánto consumen 6 al mismo ritmo?", ["6", "24", "12"], 1, "Es directa: el doble de sensores, el doble de consumo."),
      n("d-3", "¿Cuánto es 5 × 12?", 60, ["5 × 12 = 60."], ["Cinco grupos de 12.", "50 + 10.", "60."]),
    ],
    questions(v) {
      const [w1, t1, w2] = [[2, 12, 4], [3, 8, 6], [4, 15, 6], [5, 16, 4], [6, 10, 4], [8, 9, 12]][v],
        [s1, h1, s2] = [[60, 4, 80], [40, 6, 30], [90, 2, 60], [50, 6, 75], [80, 3, 120], [45, 4, 60]][v],
        [prize, p1, p2] = [[600, 4, 6], [900, 3, 5], [1200, 6, 8], [720, 4, 9], [840, 7, 5], [1000, 5, 8]][v],
        [g1, m1, m2] = [[3, 40, 24], [4, 30, 20], [2, 45, 18], [6, 20, 15], [5, 36, 30], [4, 50, 40]][v];
      const k = w1 * t1;
      return [
        v % 2 === 0
          ? c(
              "q0",
              "¿Qué caracteriza una proporcionalidad inversa?",
              [
                ["Que una cantidad baje cuando la otra sube", "No basta: debe dividirse por el mismo factor por el que se multiplica la otra."],
                "Que el producto de los pares x · y sea constante",
                ["Que el cociente y/x sea constante", "Eso caracteriza a la proporcionalidad directa."],
              ],
              1,
              "Si x se multiplica por k, y se divide entre k: su producto no cambia.",
            )
          : c(
              "q0",
              `Si ${w1} bombas llenan un depósito en ${t1} horas, ¿cuánto tardan ${w1 * 2} bombas iguales?`,
              [
                [`${t1 * 2} horas`, "Más bombas trabajando no alargan el tiempo."],
                [`${t1 - w1} horas`, "No se resta: el tiempo se divide entre el mismo factor."],
                `${t1 / 2} horas, la mitad`,
              ],
              2,
              "El doble de bombas hace el mismo trabajo en la mitad de tiempo.",
            ),
        n(
          "q1",
          `${w1} técnicos terminan una reparación en ${t1} días. Al mismo ritmo, ¿cuántos días tardan ${w2} técnicos?`,
          k / w2,
          [`Trabajo total: ${w1} × ${t1} = ${k} días-técnico.`, `${k} ÷ ${w2} = ${k / w2} días.`],
          ["Más técnicos, menos días: es inversa.", `Calcula el producto ${w1} × ${t1}.`, `Divide entre ${w2}.`],
          {
            unit: "días",
            errors: [{ value: (t1 * w2) / w1, feedback: "Aplicaste una proporción directa. Con más técnicos, el tiempo disminuye." }],
          },
        ),
        n(
          "q2",
          `Completa la constante: si ${w1} técnicos tardan ${t1} días, x · y = ${w1} × ${t1} = __.`,
          k,
          [`${w1} × ${t1} = ${k}.`],
          ["Multiplica ambas cantidades.", `${w1} × ${t1}.`, `${k}.`],
          { step: true, errors: [{ value: t1 / w1, feedback: "En una relación inversa se conserva el producto, no el cociente." }] },
        ),
        n(
          "q3",
          `Un tren a ${s1} km/h tarda ${h1} horas en un trayecto. ¿Cuántas horas tarda a ${s2} km/h?`,
          (s1 * h1) / s2,
          [`Distancia: ${s1} × ${h1} = ${s1 * h1} km.`, `Tiempo: ${s1 * h1} ÷ ${s2} = ${((s1 * h1) / s2).toLocaleString("es")} h.`],
          ["A más velocidad, menos tiempo.", "La distancia (velocidad × tiempo) se conserva.", `Divide ${s1 * h1} entre ${s2}.`],
          {
            unit: "h",
            errors: [{ value: (h1 * s2) / s1, feedback: "Aplicaste una proporción directa: a más velocidad el tiempo disminuye." }],
          },
        ),
        c(
          "q4",
          `Una tabla indica x = 1, 2, 4 e y = ${4 * k}, ${2 * k}, ${k}. ¿Qué relación muestra?`,
          [
            ["Directa, porque los números cambian a la vez", "En una directa, y crecería al crecer x."],
            `Inversa: 1 × ${4 * k} = 2 × ${2 * k} = 4 × ${k}`,
            ["Ninguna, porque y disminuye", "Que disminuya no la descarta: hay que comprobar el producto."],
          ],
          1,
          "El producto x · y es constante: es una proporcionalidad inversa.",
        ),
        n(
          "q5",
          `Un premio de ${prize} créditos se reparte en partes iguales entre ${p1} equipos. Si fueran ${p2} equipos, ¿cuánto recibiría cada uno?`,
          prize / p2,
          [`Con ${p1} equipos, cada uno recibe ${prize / p1}.`, `Con ${p2} → ${prize} ÷ ${p2} = ${prize / p2}.`],
          ["El total a repartir no cambia.", "Más equipos, menos para cada uno.", `Divide ${prize} entre ${p2}.`],
          {
            intent: "transfer",
            unit: "créditos",
            errors: [{ value: ((prize / p1) * p2) / p1, feedback: "Escalaste como si fuera directa. El total fijo se reparte entre más o menos equipos." }],
          },
        ),
        n(
          "q6",
          `${g1} grifos iguales llenan un tanque en ${m1} minutos. ¿Cuántos grifos hacen falta para llenarlo en ${m2} minutos?`,
          (g1 * m1) / m2,
          [`Trabajo: ${g1} × ${m1} = ${g1 * m1} grifo-minutos.`, `Grifos: ${g1 * m1} ÷ ${m2} = ${(g1 * m1) / m2}.`],
          ["Ahora se conoce el tiempo y se busca la cantidad de grifos.", "El producto grifos × minutos se conserva.", `Divide ${g1 * m1} entre ${m2}.`],
          {
            intent: "transfer",
            unit: "grifos",
            errors: [{ value: (g1 * m2) / m1, feedback: "Para tardar menos hacen falta más grifos, no menos." }],
          },
        ),
      ];
    },
    application: n(
      "app",
      "Un equipo de 8 personas tenía 15 días para reparar la red. Tras 5 días de trabajo, 2 personas se van. ¿Cuántos días más tardarán los demás en terminar?",
      40 / 3,
      [
        "Trabajo total: 8 × 15 = 120 días-persona; hecho: 8 × 5 = 40.",
        "Pendiente: 80 días-persona; quedan 6 personas.",
        "80 ÷ 6 = 40/3 ≈ 13,3 días.",
      ],
      ["Calcula el trabajo total y el ya realizado.", "Reparte el trabajo pendiente entre las personas que quedan.", "Divide 80 entre 6."],
      {
        intent: "transfer",
        unit: "días",
        errors: [
          { value: 10, feedback: "Ese es el plazo que quedaba con 8 personas; ahora son 6." },
          { value: 20, feedback: "Repartiste el trabajo total, pero ya se hicieron 5 días con 8 personas." },
        ],
      },
    ),
    outcome: "Puedes planificar equipos y tiempos distinguiendo cuándo conviene una relación directa o inversa.",
    commonErrors: [
      "Aplicar una regla de tres directa a una situación inversa.",
      "Creer que cualquier relación en la que una cantidad baja es inversa.",
      "Olvidar el trabajo ya realizado en problemas por etapas.",
    ],
  }),
];
