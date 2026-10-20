import { defineLesson } from "./defineLesson";
import { choice as c, example as ex, numeric as n } from "./questions";
import type { Lesson } from "./types";

/* Clases para 3.° a 5.° de secundaria (ciclo VII del CNEB): sistemas,
 * crecimiento exponencial, trigonometría, dispersión, conteo y
 * transformaciones. Mismo contrato que el resto del programa. */

const fmt = (x: number) => x.toLocaleString("es", { maximumFractionDigits: 6 });
/** Redondea a 6 decimales para evitar restos de coma flotante (0,1 × 3). */
const r6 = (x: number) => Math.round(x * 1e6) / 1e6;
const sg = (x: number) => (x < 0 ? `−${fmt(-x)}` : fmt(x));
const pt = (x: number, y: number) => `(${sg(x)}, ${sg(y)})`;
const list = (xs: number[]) => xs.map(fmt).join("; ");
const sup = (k: number) => String(k).replace(/\d/g, (d) => "⁰¹²³⁴⁵⁶⁷⁸⁹"[Number(d)]);
/** Quita errores previstos repetidos (dos confusiones pueden dar el mismo valor). */
const unique = <T extends { value: number | string }>(errors: T[]) =>
  errors.filter((e, i) => errors.findIndex((o) => o.value === e.value) === i);
const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b),
    m = s.length / 2;
  return s.length % 2 ? s[Math.floor(m)] : (s[m - 1] + s[m]) / 2;
};

export const SYSTEM_LESSONS: Lesson[] = [
  defineLesson({
    id: "sistemas-ecuaciones",
    unitId: "expresiones",
    title: "Sistemas de dos ecuaciones",
    objective:
      "Resolver sistemas de dos ecuaciones lineales por reducción y por sustitución, interpretar la solución como el punto donde se cortan dos rectas y plantear sistemas a partir de una situación.",
    purpose:
      "Comparar dos tarifas, repartir entradas o mezclar productos exige que dos condiciones se cumplan a la vez.",
    prerequisites: ["ecuaciones-ambos-lados", "funciones-lineales"],
    legacyModuleIds: ["algebra-d7", "logica-d9"],
    visual: "system",
    vocabulary: [
      { term: "Sistema", meaning: "Dos o más ecuaciones que deben cumplirse al mismo tiempo." },
      { term: "Solución del sistema", meaning: "El par (x, y) que cumple todas las ecuaciones a la vez." },
      { term: "Reducción", meaning: "Sumar o restar las ecuaciones para que desaparezca una incógnita." },
    ],
    sections: [
      {
        title: "Dos condiciones a la vez",
        paragraphs: [
          "La ecuación x + y = 10 tiene infinitas soluciones: (1, 9), (4, 6), (6, 4)… Si además x − y = 2, solo (6, 4) cumple las dos.",
          "Resolver un sistema es encontrar el par que satisface todas las condiciones, no solo una.",
        ],
        formula: "x + y = 10 y x − y = 2 → (x, y) = (6, 4)",
      },
      {
        title: "Reducción y sustitución",
        paragraphs: [
          "Reducción: al sumar las ecuaciones, +y y −y se anulan: 2x = 12, x = 6. Luego se sustituye x en cualquiera de ellas.",
          "Sustitución: si y = 2x, se reemplaza y en la otra ecuación y queda una ecuación con una sola incógnita.",
        ],
        formula: "(x + y) + (x − y) = 10 + 2 → 2x = 12",
      },
      {
        title: "El punto de corte",
        paragraphs: [
          "Cada ecuación lineal es una recta. La solución del sistema es el punto donde se cortan.",
          "Si las rectas son paralelas y distintas no hay solución; si coinciden, hay infinitas.",
        ],
        formula: "y = 10 − x y y = x − 2 se cortan en (6, 4)",
      },
    ],
    examples: [
      ex("Resuelve x + y = 12 y x − y = 4.", [
        ["(x + y) + (x − y) = 12 + 4", "Sumar las ecuaciones elimina y, porque +y y −y se anulan."],
        ["2x = 16 → x = 8", "Despejamos x."],
        ["8 + y = 12 → y = 4", "Sustituimos en la primera. Comprobación: 8 − 4 = 4."],
      ], "La solución es x = 8, y = 4."),
      ex("En un cine, 3 entradas de adulto y 2 de niño cuestan 31 soles; 1 de adulto y 2 de niño, 17 soles. ¿Cuánto cuesta cada entrada?", [
        ["3a + 2n = 31 y a + 2n = 17", "Una ecuación por cada compra."],
        ["(3a + 2n) − (a + 2n) = 31 − 17 → 2a = 14", "Restar elimina las entradas de niño, que aparecen igual en ambas."],
        ["a = 7 → 7 + 2n = 17 → n = 5", "Sustituimos para hallar el precio de niño."],
      ], "La entrada de adulto cuesta 7 soles y la de niño 5 soles."),
    ],
    diagnostic: [
      n("d-1", "Si x = 3, ¿cuánto vale 2x + 5?", 11, ["2 × 3 + 5 = 11."], ["Sustituye x por 3.", "2 × 3 = 6.", "6 + 5 = 11."]),
      n("d-2", "Resuelve 3x − 4 = 11.", 5, ["3x = 15 → x = 5."], ["Suma 4 a ambos lados.", "3x = 15.", "Divide entre 3."]),
      c("d-3", "¿Qué par cumple x + y = 7?", ["(3, 4)", "(3, 5)", "(2, 6)"], 0, "3 + 4 = 7."),
    ],
    questions(v) {
      const [x, y] = [[6, 4], [9, 3], [7, 5], [11, 2], [8, 1], [10, 7]][v],
        s = x + y,
        d = x - y,
        [x2, m] = [[3, 2], [2, 4], [4, 3], [5, 2], [2, 5], [6, 2]][v],
        y2 = m * x2,
        t = x2 + y2,
        [p, q, a1, b1] = [[4, 2, 3, 2], [5, 1, 4, 3], [6, 2, 2, 5], [3, 1, 5, 4], [7, 2, 3, 4], [8, 3, 2, 2]][v],
        c1 = a1 * p + b1 * q,
        c2 = p + b1 * q,
        [f1, r1, f2, r2] = [[10, 5, 25, 2], [20, 4, 32, 1], [12, 7, 30, 1], [5, 9, 35, 3], [15, 6, 39, 2], [6, 8, 30, 2]][v],
        g = (f2 - f1) / (r1 - r2);
      return [
        v % 2 === 0
          ? c(
              "q0",
              `¿Qué significa que (${x}, ${y}) sea la solución del sistema x + y = ${s}, x − y = ${d}?`,
              [
                ["Que cumple al menos una de las dos ecuaciones", "Debe cumplir las dos a la vez; una sola ecuación tiene infinitas soluciones."],
                "Que cumple las dos ecuaciones a la vez",
                ["Que x e y valen lo mismo en ambas ecuaciones", "Cada ecuación impone su propia condición; x e y no tienen por qué ser iguales."],
              ],
              1,
              "Una solución del sistema satisface todas sus ecuaciones al mismo tiempo.",
            )
          : c(
              "q0",
              `Las rectas y = ${m}x + 1 y y = ${m}x + ${s} son paralelas y distintas. ¿Cuántas soluciones tiene el sistema que forman?`,
              [
                ["Una", "Las rectas paralelas no se cortan: no hay un punto común."],
                ["Infinitas", "Eso ocurre solo si las dos rectas coinciden."],
                "Ninguna",
              ],
              2,
              "La solución es el punto de corte; dos rectas paralelas distintas no se cortan.",
            ),
        n(
          "q1",
          `Resuelve el sistema x + y = ${s}, x − y = ${d}. ¿Cuánto vale x?`,
          x,
          [`Sumamos las ecuaciones: 2x = ${s + d}.`, `x = ${x}.`],
          ["Suma las dos ecuaciones: ¿qué pasa con y?", `Queda 2x = ${s + d}.`, "Divide entre 2."],
          {
            errors: [
              { value: s + d, feedback: "Ese es el valor de 2x; falta dividir entre 2." },
              { value: y, feedback: "Ese es el valor de y; se pide x." },
            ].filter((e) => e.value !== x),
          },
        ),
        n(
          "q2",
          `Completa: si x = ${x} y x + y = ${s}, entonces y = __.`,
          y,
          [`${x} + y = ${s} → y = ${s} − ${x} = ${y}.`],
          ["Sustituye x en la ecuación.", `${x} + y = ${s}.`, `Resta ${x}.`],
          { step: true, errors: [{ value: s + x, feedback: `Se resta ${x} a ambos lados, no se suma.` }] },
        ),
        n(
          "q3",
          `Resuelve por sustitución: y = ${m}x, x + y = ${t}. ¿Cuánto vale y?`,
          y2,
          [`Sustituimos: x + ${m}x = ${t} → ${m + 1}x = ${t}.`, `x = ${x2}; y = ${m} · ${x2} = ${y2}.`],
          ["Reemplaza y por " + m + "x en la segunda ecuación.", `${m + 1}x = ${t}.`, `Halla x y luego y = ${m}x.`],
          {
            errors: [
              { value: x2, feedback: "Ese es el valor de x; se pide y." },
              { value: r6(t / m), feedback: `x + ${m}x son ${m + 1}x: se divide entre ${m + 1}, no entre ${m}.` },
            ].filter((e) => e.value !== y2),
          },
        ),
        c(
          "q4",
          `Para resolver x + y = ${s}, x − y = ${d}, alguien resta las ecuaciones y escribe 0 = ${s - d}. ¿Qué falla?`,
          [
            `Al restar, x − x = 0 pero y − (−y) = 2y: queda 2y = ${s - d}`,
            ["Nada: el sistema no tiene solución", `Sí la tiene: (${x}, ${y}) cumple ambas ecuaciones.`],
            ["Debía multiplicar las ecuaciones entre sí", "Multiplicarlas no elimina ninguna incógnita."],
          ],
          0,
          "Restar −y es sumar y: las y no se anulan al restar, se duplican.",
        ),
        n(
          "q5",
          `En una librería, ${a1} cuadernos y ${b1} lapiceros cuestan ${c1} soles; 1 cuaderno y ${b1} lapiceros cuestan ${c2} soles. ¿Cuánto cuesta un cuaderno?`,
          p,
          [`Restamos las compras: ${a1 - 1} cuadernos cuestan ${c1} − ${c2} = ${c1 - c2} soles.`, `Un cuaderno: ${c1 - c2} ÷ ${a1 - 1} = ${p} soles.`],
          ["Escribe una ecuación por compra.", "Resta: los lapiceros son los mismos en ambas.", `Divide entre ${a1 - 1}.`],
          {
            intent: "transfer",
            unit: "soles",
            errors: [
              { value: q, feedback: "Ese es el precio de un lapicero." },
              { value: c1 - c2, feedback: `Esa diferencia corresponde a ${a1 - 1} cuadernos, no a uno.` },
            ].filter((e) => e.value !== p),
          },
        ),
        n(
          "q6",
          `El plan A cobra ${f1} soles fijos más ${r1} soles por GB; el plan B, ${f2} soles fijos más ${r2} por GB. ¿Con cuántos GB los dos planes cuestan lo mismo?`,
          g,
          [`${f1} + ${r1}g = ${f2} + ${r2}g.`, `${r1 - r2}g = ${f2 - f1} → g = ${g}.`],
          ["Escribe el costo de cada plan con g GB.", "Iguala los dos costos.", "Agrupa las g en un lado y los números en el otro."],
          {
            intent: "transfer",
            unit: "GB",
            errors: [
              { value: f2 - f1, feedback: "Esa es la diferencia de cargos fijos; hay que dividirla entre la diferencia de tarifas." },
              { value: r6((f2 + f1) / (r1 + r2)), feedback: "Al igualar, los cargos fijos y las tarifas se restan, no se suman." },
            ].filter((e) => e.value !== g),
          },
        ),
      ];
    },
    application: n(
      "app",
      "Un grupo de 26 estudiantes va al museo en taxis de 4 plazas y combis de 6 plazas. Usan 5 vehículos y todos van llenos. ¿Cuántas combis usan?",
      3,
      ["t + c = 5 y 4t + 6c = 26.", "Sustituimos t = 5 − c: 4(5 − c) + 6c = 26 → 20 + 2c = 26.", "c = 3 combis (y 2 taxis)."],
      ["Una ecuación cuenta vehículos y otra cuenta plazas.", "Despeja t = 5 − c y sustitúyelo.", "Comprueba: 2 · 4 + 3 · 6 = 26."],
      {
        intent: "transfer",
        errors: [
          { value: 2, feedback: "Esos son los taxis; se piden las combis." },
          { value: 4, feedback: "Con 4 combis y 1 taxi irían 28 personas, no 26." },
        ],
      },
    ),
    outcome: "Puedes comparar tarifas y repartir cantidades que deben cumplir dos condiciones.",
    commonErrors: [
      "Comprobar la solución en una sola de las ecuaciones.",
      "Restar ecuaciones sin cambiar el signo de todos los términos.",
      "Dar solo el valor de una incógnita cuando se pide la otra.",
    ],
  }),
];

export const EXPONENTIAL_LESSONS: Lesson[] = [
  defineLesson({
    id: "funciones-exponenciales",
    unitId: "expresiones",
    title: "Crecimiento exponencial",
    objective:
      "Distinguir el crecimiento lineal (sumar una cantidad fija) del exponencial (multiplicar por un factor fijo), calcular valores de y = a · bⁿ y modelar aumentos y descuentos porcentuales repetidos.",
    purpose:
      "Poblaciones, ahorros con interés compuesto, la depreciación de un auto o un rumor que se propaga crecen o decrecen multiplicando, no sumando.",
    prerequisites: ["potencias-raices", "porcentajes-aplicados", "funciones-lineales"],
    legacyModuleIds: ["algebra-d9", "aritmetica-potencias"],
    visual: "exponential",
    vocabulary: [
      { term: "Factor de cambio", meaning: "Número por el que se multiplica la cantidad en cada paso (b)." },
      { term: "Interés compuesto", meaning: "Interés que se calcula sobre el capital y los intereses ya ganados." },
      { term: "Decrecimiento exponencial", meaning: "Cambio con factor entre 0 y 1: la cantidad se reduce en la misma proporción cada paso." },
    ],
    sections: [
      {
        title: "Sumar o multiplicar",
        paragraphs: [
          "Lineal: 100, 120, 140, 160… suma 20 cada paso. Exponencial: 100, 120, 144, 172,8… multiplica por 1,2 cada paso.",
          "En una tabla, el crecimiento lineal tiene diferencias constantes; el exponencial, cocientes constantes.",
        ],
        formula: "lineal: y = a + d · n · exponencial: y = a · bⁿ",
      },
      {
        title: "El factor de cambio",
        paragraphs: [
          "Aumentar un 20% es multiplicar por 1,2 (el 100% más el 20%). Disminuir un 10% es multiplicar por 0,9.",
          "Duplicar es multiplicar por 2; reducir a la mitad, por 0,5. Varios pasos seguidos multiplican el factor: bⁿ.",
        ],
        formula: "aumento del p% → b = 1 + p/100 · disminución del p% → b = 1 − p/100",
      },
      {
        title: "Al principio parecido, después enorme",
        paragraphs: [
          "Con valores pequeños de n, sumar y multiplicar dan resultados cercanos; con el tiempo, el factor acumulado hace que el exponencial supere a cualquier lineal.",
          "Por eso 2¹⁰ = 1024: diez duplicaciones convierten 1 en más de mil.",
        ],
        formula: "2¹⁰ = 1024",
      },
    ],
    examples: [
      ex("Una colonia de 50 bacterias se duplica cada hora. ¿Cuántas hay a las 4 horas?", [
        ["y = 50 · 2ⁿ", "Valor inicial 50 y factor 2 por hora."],
        ["2⁴ = 16", "Son cuatro duplicaciones seguidas."],
        ["50 · 16 = 800", "Multiplicamos el valor inicial por el factor acumulado."],
      ], "A las 4 horas hay 800 bacterias."),
      ex("Un celular de 1000 soles pierde el 20% de su valor cada año. ¿Cuánto vale después de 2 años?", [
        ["b = 1 − 0,20 = 0,8", "Perder el 20% deja el 80% del valor."],
        ["1000 · 0,8 = 800", "Valor después del primer año."],
        ["800 · 0,8 = 640", "El segundo 20% se calcula sobre 800, no sobre 1000."],
      ], "Vale 640 soles, no 600."),
    ],
    diagnostic: [
      n("d-1", "¿Cuánto es 2⁵?", 32, ["2 × 2 × 2 × 2 × 2 = 32."], ["Multiplica 2 por sí mismo cinco veces.", "2, 4, 8, 16…", "32."]),
      n("d-2", "¿Cuánto es el 10% de 300?", 30, ["300 ÷ 10 = 30."], ["10% es una décima parte.", "Divide entre 10.", "30."]),
      c("d-3", "¿Qué secuencia aumenta siempre en la misma cantidad?", ["3, 6, 12, 24", "5, 8, 11, 14", "2, 4, 8, 16"], 1, "5, 8, 11, 14 suma 3 cada vez."),
    ],
    questions(v) {
      const [a, b, k] = [[50, 2, 4], [30, 3, 3], [20, 2, 5], [10, 3, 4], [40, 2, 3], [5, 4, 3]][v],
        pct = [20, 5, 15, 40, 8, 30][v],
        [V, dep] = [[20000, 10], [1000, 20], [5000, 10], [8000, 25], [40000, 5], [2000, 50]][v],
        base = [100, 200, 80, 400, 60, 1000][v],
        [C, i] = [[1000, 10], [500, 20], [2000, 5], [800, 10], [1500, 20], [400, 50]][v],
        [N, d] = [[100, 3], [50, 4], [30, 2], [200, 5], [10, 6], [25, 3]][v],
        grown = a * b ** k,
        afterDep = r6(V * (1 - dep / 100) ** 2),
        compound = r6(C * (1 + i / 100) ** 2);
      return [
        v % 2 === 0
          ? c(
              "q0",
              "¿Qué distingue al crecimiento exponencial del lineal?",
              [
                "Multiplica por el mismo factor en cada paso",
                ["Suma la misma cantidad en cada paso", "Eso describe el crecimiento lineal."],
                ["Siempre crece más rápido desde el principio", "Al inicio puede crecer más despacio; el factor acumulado lo hace superar después."],
              ],
              0,
              "Exponencial: cociente constante entre pasos; lineal: diferencia constante.",
            )
          : c(
              "q0",
              `Una tabla muestra ${a}, ${a * b}, ${a * b * b}, ${a * b ** 3}. ¿Qué tipo de crecimiento tiene?`,
              [
                ["Lineal, porque siempre aumenta", `Las diferencias cambian: ${a * b - a}, ${a * b * b - a * b}…; no suma lo mismo.`],
                `Exponencial: se multiplica por ${b} en cada paso`,
                ["No sigue ningún patrón", `Cada valor es el anterior multiplicado por ${b}.`],
              ],
              1,
              "Si el cociente entre valores consecutivos es constante, el crecimiento es exponencial.",
            ),
        n(
          "q1",
          `Una población empieza con ${a} individuos y se multiplica por ${b} cada año. ¿Cuántos hay a los ${k} años?`,
          grown,
          [`${a} · ${b}${sup(k)} = ${a} · ${b ** k}.`, `= ${grown}.`],
          ["El factor se aplica una vez por año.", `Calcula ${b}${sup(k)}.`, `Multiplica por ${a}.`],
          {
            errors: [
              { value: a * b * k, feedback: `Multiplicaste por ${b} y por ${k}; el factor se aplica ${k} veces seguidas: es una potencia.` },
              { value: a + a * (b - 1) * k, feedback: "Eso sería sumar la misma cantidad cada año (crecimiento lineal)." },
            ].filter((e) => e.value !== grown),
          },
        ),
        n(
          "q2",
          `Completa: aumentar un ${pct}% equivale a multiplicar por __.`,
          r6(1 + pct / 100),
          [`100% + ${pct}% = ${100 + pct}% = ${fmt(r6(1 + pct / 100))}.`],
          ["Al valor original (100%) se le suma el aumento.", `${100 + pct}%.`, "Escríbelo como decimal."],
          {
            step: true,
            errors: [
              { value: r6(pct / 100), feedback: "Así obtienes solo el aumento; hay que sumarle el 100% original." },
              { value: pct, feedback: "El factor es un número cercano a 1, no el porcentaje." },
            ],
          },
        ),
        n(
          "q3",
          `Un auto de ${fmt(V)} soles pierde el ${dep}% de su valor cada año. ¿Cuánto vale después de 2 años?`,
          afterDep,
          [`Factor: 1 − ${fmt(dep / 100)} = ${fmt(1 - dep / 100)}.`, `${fmt(V)} · ${fmt(1 - dep / 100)}² = ${fmt(afterDep)} soles.`],
          ["Perder un porcentaje deja el resto.", "Aplica el factor dos veces.", "El segundo descuento es sobre el valor ya reducido."],
          {
            unit: "soles",
            errors: [
              { value: r6(V * (1 - (2 * dep) / 100)), feedback: `Restaste dos veces el ${dep}% del valor inicial; el segundo año se calcula sobre el valor ya reducido.` },
            ].filter((e) => e.value !== afterDep),
          },
        ),
        c(
          "q4",
          `Alguien dice: «Si una cantidad sube un 50% y luego baja un 50%, vuelve a ser la misma». Con ${base}, ¿qué ocurre en realidad?`,
          [
            ["Vuelve a ser " + base, "La bajada del 50% se calcula sobre el valor ya aumentado."],
            `Sube a ${fmt(base * 1.5)} y baja a ${fmt(base * 0.75)}: queda menor`,
            ["Queda mayor que " + base, "Al bajar se resta la mitad de un valor más grande que el que se sumó."],
          ],
          1,
          "1,5 · 0,5 = 0,75: los factores se multiplican, no se compensan.",
        ),
        n(
          "q5",
          `Depositas ${fmt(C)} soles a un interés compuesto del ${i}% anual. ¿Cuánto tienes al cabo de 2 años?`,
          compound,
          [`Factor: 1 + ${fmt(i / 100)} = ${fmt(1 + i / 100)}.`, `${fmt(C)} · ${fmt(1 + i / 100)}² = ${fmt(compound)} soles.`],
          ["Cada año el saldo se multiplica por el factor.", "Aplica el factor dos veces.", "El interés del segundo año incluye el del primero."],
          {
            intent: "transfer",
            unit: "soles",
            errors: [
              { value: r6(C * (1 + (2 * i) / 100)), feedback: "Eso es interés simple; el compuesto también gana interés sobre el interés del primer año." },
            ].filter((e) => e.value !== compound),
          },
        ),
        n(
          "q6",
          `Una bacteria se duplica cada 20 minutos. Si ahora hay ${N}, ¿cuántos minutos faltan para que haya ${N * 2 ** d}?`,
          20 * d,
          [`${N * 2 ** d} ÷ ${N} = ${2 ** d} = 2${sup(d)}: son ${d} duplicaciones.`, `${d} · 20 = ${20 * d} minutos.`],
          ["¿Por cuánto se multiplica la cantidad?", "Escribe ese número como potencia de 2.", "Cada duplicación tarda 20 minutos."],
          {
            intent: "transfer",
            unit: "min",
            errors: [
              { value: d, feedback: "Ese es el número de duplicaciones; cada una tarda 20 minutos." },
              { value: 20 * 2 ** d, feedback: `Multiplicaste 20 por ${2 ** d}; hay que contar cuántas veces se duplica (${d}).` },
            ].filter((e) => e.value !== 20 * d),
          },
        ),
      ];
    },
    application: n(
      "app",
      "En un colegio, 3 personas conocen una noticia. Cada día, cada persona que la conoce se la cuenta a 2 personas nuevas, así que el número de personas que la conocen se triplica. ¿Cuántos días deben pasar para que la conozcan más de 2000 personas?",
      6,
      ["Personas al cabo de n días: 3 · 3ⁿ.", "Día 5 → 3 · 243 = 729. Día 6 → 3 · 729 = 2187.", "Al sexto día se superan las 2000 personas."],
      ["El factor diario es 3.", "Prueba día por día: 9, 27, 81…", "Busca el primer día con más de 2000."],
      {
        intent: "transfer",
        unit: "días",
        errors: [
          { value: 7, feedback: "3⁷ = 2187 incluye a las 3 personas iniciales como un día más: el día 6 ya son 3 · 3⁶ = 2187." },
          { value: 5, feedback: "El día 5 la conocen 729 personas; todavía no superan 2000." },
        ],
      },
    ),
    outcome: "Puedes modelar crecimientos y descuentos repetidos y saber cuándo sumar no basta.",
    commonErrors: [
      "Multiplicar el factor por el número de pasos en vez de elevarlo a esa potencia.",
      "Calcular descuentos o intereses repetidos siempre sobre el valor inicial.",
      "Usar el porcentaje como factor (20 en vez de 1,2).",
    ],
  }),
];

export const TRIGONOMETRY_LESSONS: Lesson[] = [
  defineLesson({
    id: "trigonometria",
    unitId: "geometria",
    title: "Razones trigonométricas",
    objective:
      "Definir seno, coseno y tangente de un ángulo agudo como razones entre los lados de un triángulo rectángulo y usarlas para calcular alturas, distancias e inclinaciones.",
    purpose:
      "Con un ángulo y una distancia se puede medir la altura de un edificio, un cerro o un poste sin subir a ellos.",
    prerequisites: ["pitagoras", "semejanza"],
    legacyModuleIds: ["geometria-d9", "geometria-d10"],
    visual: "trig",
    vocabulary: [
      { term: "Cateto opuesto", meaning: "El cateto que está frente al ángulo α." },
      { term: "Cateto adyacente", meaning: "El cateto que forma el ángulo α junto con la hipotenusa." },
      { term: "Seno, coseno, tangente", meaning: "sen α = opuesto ÷ hipotenusa; cos α = adyacente ÷ hipotenusa; tan α = opuesto ÷ adyacente." },
    ],
    sections: [
      {
        title: "Razones que no dependen del tamaño",
        paragraphs: [
          "Todos los triángulos rectángulos con el mismo ángulo agudo α son semejantes: sus lados son proporcionales.",
          "Por eso el cociente opuesto ÷ hipotenusa es el mismo en todos ellos. Ese número es el seno de α.",
        ],
        formula: "sen α = opuesto/hipotenusa · cos α = adyacente/hipotenusa · tan α = opuesto/adyacente",
      },
      {
        title: "Opuesto y adyacente dependen del ángulo",
        paragraphs: [
          "En el triángulo 3-4-5, para el ángulo opuesto al lado 3: sen = 3/5 = 0,6, cos = 4/5 = 0,8 y tan = 3/4 = 0,75.",
          "Para el otro ángulo agudo, los catetos cambian de papel: su seno es 4/5. La hipotenusa siempre es el lado mayor, así que seno y coseno nunca superan 1.",
        ],
        formula: "triángulo 3-4-5: sen α = 0,6 · cos α = 0,8 · tan α = 0,75",
      },
      {
        title: "Calcular lados",
        paragraphs: [
          "Si conoces la distancia horizontal d y el ángulo de elevación α, la altura es h = d · tan α.",
          "Si conoces la altura y el seno, la hipotenusa es altura ÷ sen α. Los valores de seno, coseno y tangente se obtienen de una calculadora o de una tabla.",
        ],
        formula: "h = d · tan α",
      },
    ],
    examples: [
      ex("Un triángulo rectángulo tiene catetos de 6 y 8. Calcula el seno del ángulo opuesto al cateto 6.", [
        ["Hipotenusa = √(6² + 8²) = √100 = 10", "Teorema de Pitágoras."],
        ["sen α = 6/10", "Cateto opuesto entre hipotenusa."],
        ["sen α = 0,6", "Simplificamos: es el mismo seno que en el triángulo 3-4-5, que es semejante."],
      ], "sen α = 0,6."),
      ex("Desde 20 m de un edificio, su parte más alta se ve con un ángulo α tal que tan α = 0,84. ¿Qué altura tiene?", [
        ["tan α = h ÷ 20", "La altura es el cateto opuesto y la distancia, el adyacente."],
        ["h = 20 · 0,84", "Despejamos h multiplicando por 20."],
        ["h = 16,8 m", "Medida desde la altura de los ojos de quien mira."],
      ], "El edificio mide unos 16,8 m sobre la altura de los ojos."),
    ],
    diagnostic: [
      n("d-1", "Un triángulo rectángulo tiene catetos de 3 y 4. ¿Cuánto mide la hipotenusa?", 5, ["√(9 + 16) = √25 = 5."], ["Usa a² + b² = c².", "9 + 16 = 25.", "√25 = 5."]),
      n("d-2", "Escribe 12/16 como decimal.", 0.75, ["12 ÷ 16 = 0,75."], ["Simplifica: 12/16 = 3/4.", "3 ÷ 4.", "0,75."]),
      c("d-3", "En un triángulo rectángulo, ¿cuál es el lado más largo?", ["Uno de los catetos", "La hipotenusa", "Depende del ángulo"], 1, "La hipotenusa, opuesta al ángulo recto, es siempre el lado mayor."),
    ],
    questions(v) {
      const [opp, adj, hyp] = [[3, 4, 5], [12, 16, 20], [24, 7, 25], [7, 24, 25], [15, 20, 25], [16, 12, 20]][v],
        [d, t] = [[10, 0.15], [8, 0.25], [20, 0.1], [12, 0.5], [6, 0.75], [40, 0.05]][v],
        [dd, tt] = [[30, 0.6], [25, 0.8], [15, 1.2], [40, 0.75], [50, 0.4], [18, 0.5]][v],
        [s, h] = [[0.8, 4], [0.6, 3], [0.96, 4.8], [0.75, 6], [0.5, 2.5], [0.9, 4.5]][v],
        ladder = r6(h / s);
      return [
        v % 2 === 0
          ? c(
              "q0",
              "Dos triángulos rectángulos tienen el mismo ángulo agudo α, pero uno es el doble de grande. ¿Qué pasa con sen α?",
              [
                "Es igual: al ampliar, las razones entre lados no cambian",
                ["Se duplica", "Se duplican el opuesto y la hipotenusa: el cociente no cambia."],
                ["Se reduce a la mitad", "Ampliar un triángulo no cambia sus razones."],
              ],
              0,
              "Los triángulos son semejantes: sus lados son proporcionales.",
            )
          : c(
              "q0",
              `Un triángulo rectángulo tiene catetos ${opp} y ${adj}. Para el ángulo opuesto al cateto ${opp}, ¿qué representa ${opp}/${adj}?`,
              [
                ["Su seno", "El seno tiene la hipotenusa en el denominador."],
                ["Su coseno", "El coseno es adyacente entre hipotenusa."],
                "Su tangente",
              ],
              2,
              "tan α = opuesto ÷ adyacente.",
            ),
        n(
          "q1",
          `En un triángulo rectángulo, el cateto opuesto al ángulo α mide ${opp} y la hipotenusa ${hyp}. ¿Cuánto vale sen α? Puedes escribirlo como fracción o decimal.`,
          opp / hyp,
          [`sen α = opuesto ÷ hipotenusa = ${opp}/${hyp}.`, `= ${fmt(opp / hyp)}.`],
          ["¿Qué lados usa el seno?", "Opuesto ÷ hipotenusa.", `${opp} ÷ ${hyp}.`],
          {
            errors: [
              { value: adj / hyp, feedback: "Ese es el coseno: adyacente ÷ hipotenusa." },
              { value: hyp / opp, feedback: "La razón está invertida: el seno es opuesto ÷ hipotenusa." },
            ],
          },
        ),
        n(
          "q2",
          `Completa: si el cateto adyacente a α mide ${adj} y la hipotenusa ${hyp}, cos α = ${adj} ÷ ${hyp} = __.`,
          adj / hyp,
          [`${adj} ÷ ${hyp} = ${fmt(adj / hyp)}.`],
          ["Divide el adyacente entre la hipotenusa.", `${adj} ÷ ${hyp}.`, "Escribe el decimal o la fracción."],
          {
            step: true,
            errors: [
              { value: hyp / adj, feedback: "Va el adyacente arriba y la hipotenusa abajo." },
              { value: opp / hyp, feedback: "Ese es el seno: opuesto ÷ hipotenusa." },
            ],
          },
        ),
        n(
          "q3",
          `Una rampa avanza ${d} m en horizontal y su inclinación cumple tan α = ${fmt(t)}. ¿Cuántos metros sube?`,
          r6(d * t),
          [`tan α = altura ÷ ${d}.`, `altura = ${d} · ${fmt(t)} = ${fmt(r6(d * t))} m.`],
          ["La subida es el cateto opuesto; el avance, el adyacente.", "tan α = opuesto ÷ adyacente.", "Despeja el opuesto multiplicando."],
          { unit: "m", errors: [{ value: r6(d / t), feedback: "Dividiste; con la tangente, opuesto = adyacente × tan α." }] },
        ),
        c(
          "q4",
          `Alguien escribe sen α = ${hyp}/${opp} para el ángulo opuesto al cateto ${opp}. ¿Qué falla?`,
          [
            ["Nada", `${hyp}/${opp} es mayor que 1, y un seno nunca lo es.`],
            "La razón está invertida: el seno es opuesto ÷ hipotenusa y nunca supera 1",
            ["Debía usar el cateto adyacente", "El seno usa el opuesto; el adyacente va en el coseno."],
          ],
          1,
          "La hipotenusa es el lado mayor, así que va en el denominador del seno.",
        ),
        n(
          "q5",
          `Desde ${dd} m de la base de un poste, su punta se ve con un ángulo α tal que tan α = ${fmt(tt)}. ¿Qué altura tiene el poste?`,
          r6(dd * tt),
          [`tan α = altura ÷ ${dd}.`, `altura = ${dd} · ${fmt(tt)} = ${fmt(r6(dd * tt))} m.`],
          ["Dibuja el triángulo: poste, suelo y visual.", "La altura es el cateto opuesto.", "Multiplica la distancia por la tangente."],
          {
            intent: "transfer",
            unit: "m",
            errors: [
              { value: r6(dd / tt), feedback: "Dividiste; la altura es la distancia multiplicada por la tangente." },
              { value: dd, feedback: "Esa es la distancia; la altura es el cateto opuesto." },
            ].filter((e) => e.value !== r6(dd * tt)),
          },
        ),
        n(
          "q6",
          `Una escalera apoyada en una pared forma con el suelo un ángulo α tal que sen α = ${fmt(s)}. Si llega a ${fmt(h)} m de altura, ¿cuánto mide la escalera?`,
          ladder,
          [`sen α = altura ÷ escalera → ${fmt(s)} = ${fmt(h)} ÷ L.`, `L = ${fmt(h)} ÷ ${fmt(s)} = ${fmt(ladder)} m.`],
          ["La escalera es la hipotenusa.", "sen α = opuesto ÷ hipotenusa.", "Despeja la hipotenusa dividiendo."],
          {
            intent: "transfer",
            unit: "m",
            errors: [{ value: r6(h * s), feedback: "Multiplicaste; si sen α = altura ÷ escalera, la escalera = altura ÷ sen α." }],
          },
        ),
      ];
    },
    application: n(
      "app",
      "Una topógrafa está a 50 m de la base de un cerro y ve la cima con un ángulo α tal que tan α = 0,9. Sus ojos están a 1,6 m del suelo. ¿Qué altura tiene el cerro sobre el suelo?",
      46.6,
      ["Altura sobre los ojos: 50 · 0,9 = 45 m.", "Se suma la altura de los ojos: 45 + 1,6 = 46,6 m."],
      ["El triángulo empieza a la altura de los ojos.", "Calcula el cateto opuesto con la tangente.", "Súmale 1,6 m."],
      {
        intent: "transfer",
        unit: "m",
        errors: [
          { value: 45, feedback: "Esa es la altura sobre los ojos; falta sumar 1,6 m." },
          { value: r6(50 / 0.9), feedback: "Dividiste; la altura es la distancia multiplicada por la tangente." },
        ],
      },
    ),
    outcome: "Puedes calcular alturas, distancias e inclinaciones con un ángulo y una medida.",
    commonErrors: [
      "Confundir el cateto opuesto con el adyacente.",
      "Invertir la razón (hipotenusa ÷ opuesto).",
      "Olvidar sumar la altura de los ojos o del instrumento.",
    ],
  }),
];

export const SPREAD_LESSONS: Lesson[] = [
  defineLesson({
    id: "estadistica-dispersion",
    unitId: "datos",
    title: "Dispersión y diagramas de caja",
    objective:
      "Calcular el rango, los cuartiles y el rango intercuartílico (RIC), interpretar un diagrama de caja y comparar dos grupos de datos por su centro y su dispersión.",
    purpose:
      "Dos secciones pueden tener la misma mediana y ser muy distintas: en una todos rinden parecido y en la otra hay grandes diferencias.",
    prerequisites: ["media-mediana-moda"],
    legacyModuleIds: ["medicion-d8", "medicion-d6"],
    visual: "boxplot",
    vocabulary: [
      { term: "Cuartiles", meaning: "Q1, la mediana y Q3 dividen los datos ordenados en cuatro partes con la misma cantidad de datos." },
      { term: "Rango intercuartílico (RIC)", meaning: "Q3 − Q1: la amplitud del 50% central de los datos." },
      { term: "Valor atípico", meaning: "Dato muy alejado del resto; suele considerarse atípico si supera Q3 + 1,5 · RIC o queda por debajo de Q1 − 1,5 · RIC." },
    ],
    sections: [
      {
        title: "El centro no lo dice todo",
        paragraphs: [
          "Las notas 13, 14, 14, 15 y 6, 10, 18, 22 tienen la misma mediana (14), pero el segundo grupo está mucho más disperso.",
          "El rango (máximo − mínimo) mide la dispersión total, pero un solo valor extremo lo cambia mucho.",
        ],
        formula: "rango = máximo − mínimo",
      },
      {
        title: "Cuartiles",
        paragraphs: [
          "Ordena los datos. La mediana los divide en dos mitades; Q1 es la mediana de la mitad inferior y Q3 la de la mitad superior.",
          "En esta clase se usan conjuntos con un número par de datos: cada mitad tiene exactamente la mitad de los datos.",
        ],
        formula: "RIC = Q3 − Q1 (el 50% central)",
      },
      {
        title: "Diagrama de caja",
        paragraphs: [
          "Muestra mínimo, Q1, mediana, Q3 y máximo. La caja contiene el 50% central; una caja larga indica datos centrales dispersos.",
          "Para comparar grupos, observa primero las medianas (el centro) y luego el tamaño de las cajas (la dispersión).",
        ],
        formula: "mín — [ Q1 | mediana | Q3 ] — máx",
      },
    ],
    examples: [
      ex("Datos: 4; 7; 8; 10; 12; 13; 15; 19. Calcula Q1, Q3 y el RIC.", [
        ["Mitad inferior 4; 7; 8; 10 → Q1 = (7 + 8) ÷ 2 = 7,5", "Mediana de los cuatro primeros datos."],
        ["Mitad superior 12; 13; 15; 19 → Q3 = (13 + 15) ÷ 2 = 14", "Mediana de los cuatro últimos datos."],
        ["RIC = 14 − 7,5 = 6,5", "El 50% central ocupa 6,5 unidades."],
      ], "Q1 = 7,5; Q3 = 14; RIC = 6,5."),
      ex("Las notas de la sección A tienen RIC 2 y las de la sección B, RIC 7; ambas tienen mediana 14. ¿Qué sección es más homogénea?", [
        ["Misma mediana", "El centro de ambos grupos es igual."],
        ["RIC de A menor que RIC de B", "El 50% central de A está más agrupado."],
        ["A es más homogénea", "En B hay más diferencias entre estudiantes."],
      ], "La sección A es más homogénea."),
    ],
    diagnostic: [
      n("d-1", "¿Cuál es la mediana de 3; 5; 8; 10?", 6.5, ["(5 + 8) ÷ 2 = 6,5."], ["Con cuatro datos hay dos centrales.", "5 y 8.", "Promédialos."]),
      n("d-2", "¿Cuánto es 19 − 4?", 15, ["19 − 4 = 15."], ["Resta.", "19 − 4.", "15."]),
      c("d-3", "¿Qué mide el rango de un conjunto de datos?", ["El valor más repetido", "La diferencia entre el mayor y el menor", "El valor central"], 1, "Rango = máximo − mínimo."),
    ],
    questions(v) {
      const data = [
          [2, 5, 6, 9, 11, 12, 14, 20],
          [10, 12, 13, 15, 16, 18, 21, 25],
          [3, 4, 7, 8, 9, 13, 15, 17],
          [20, 22, 23, 25, 30, 31, 33, 40],
          [1, 3, 3, 6, 7, 9, 10, 12],
          [5, 8, 9, 10, 14, 16, 18, 24],
        ][v],
        q1 = median(data.slice(0, 4)),
        q3 = median(data.slice(4)),
        iqr = q3 - q1,
        range = data[7] - data[0],
        mixed = [3, 7, 0, 5, 2, 6, 1, 4].map((i) => data[i]),
        [b1, b3] = [[10, 18], [20, 30], [6, 14], [40, 52], [12, 16], [30, 46]][v],
        fence = b3 + 1.5 * (b3 - b1);
      return [
        v % 2 === 0
          ? c(
              "q0",
              "Dos grupos tienen la misma mediana, pero el RIC de uno es el doble que el del otro. ¿Qué significa?",
              [
                "Sus datos centrales están más dispersos",
                ["Sus valores son el doble", "El RIC mide dispersión, no el tamaño de los datos."],
                ["Tiene el doble de datos", "El RIC no depende de cuántos datos hay."],
              ],
              0,
              "El RIC es la amplitud del 50% central: mayor RIC, más dispersión.",
            )
          : c(
              "q0",
              "¿Por qué el RIC resiste mejor un valor atípico que el rango?",
              [
                ["Porque siempre es mayor que el rango", "El RIC nunca supera al rango: es una parte de él."],
                ["Porque usa la media", "El RIC usa cuartiles, no la media."],
                "Porque solo usa el 50% central y no los extremos",
              ],
              2,
              "Un valor extremo cambia el máximo o el mínimo, pero apenas mueve Q1 y Q3.",
            ),
        n(
          "q1",
          `Datos ordenados: ${list(data)}. ¿Cuál es el rango intercuartílico (Q3 − Q1)?`,
          iqr,
          [`Q1 = (${data[1]} + ${data[2]}) ÷ 2 = ${fmt(q1)}; Q3 = (${data[5]} + ${data[6]}) ÷ 2 = ${fmt(q3)}.`, `RIC = ${fmt(q3)} − ${fmt(q1)} = ${fmt(iqr)}.`],
          ["Divide los datos en dos mitades de cuatro.", "Q1 y Q3 son las medianas de cada mitad.", "Resta Q3 − Q1."],
          {
            errors: [
              { value: range, feedback: "Ese es el rango (máximo − mínimo); el RIC usa Q3 − Q1." },
              { value: data[5] - data[2], feedback: "Q1 y Q3 son medianas de cada mitad: promedia los dos datos centrales de cada una." },
            ].filter((e) => e.value !== iqr),
          },
        ),
        n(
          "q2",
          `Completa: en ${list(data)}, la mitad inferior es ${list(data.slice(0, 4))}, así que Q1 = (${data[1]} + ${data[2]}) ÷ 2 = __.`,
          q1,
          [`(${data[1]} + ${data[2]}) ÷ 2 = ${fmt(q1)}.`],
          ["Suma los dos datos centrales de la mitad inferior.", `${data[1]} + ${data[2]} = ${data[1] + data[2]}.`, "Divide entre 2."],
          { step: true, errors: [{ value: data[1] + data[2], feedback: "Falta dividir la suma entre 2." }] },
        ),
        n(
          "q3",
          `Datos sin ordenar: ${list(mixed)}. ¿Cuál es el rango?`,
          range,
          [`Mayor: ${data[7]}; menor: ${data[0]}.`, `Rango = ${data[7]} − ${data[0]} = ${range}.`],
          ["Busca el mayor y el menor dato.", "No importa el orden en que aparecen.", "Réstalos."],
          {
            errors: [
              { value: Math.abs(mixed[7] - mixed[0]), feedback: "Usaste el primer y el último dato de la lista; el rango usa el mayor y el menor." },
            ].filter((e) => e.value !== range),
          },
        ),
        c(
          "q4",
          `Alguien calcula la mediana de ${list(mixed)} promediando los dos datos que están en el centro de la lista: ${mixed[3]} y ${mixed[4]}. ¿Qué falla?`,
          [
            ["Nada: así se calcula", "Los datos centrales se buscan en la lista ordenada."],
            ["Debía dividir la suma entre 8", "Dividir entre 8 no da la mediana."],
            "Primero hay que ordenar los datos de menor a mayor",
          ],
          2,
          `Ordenados, los centrales son ${data[3]} y ${data[4]}: la mediana es ${fmt(median(data))}.`,
        ),
        n(
          "q5",
          `En un diagrama de caja de tiempos de llegada al colegio (en minutos), Q1 = ${b1} y Q3 = ${b3}. Un tiempo se considera atípico si supera Q3 + 1,5 · RIC. ¿A partir de cuántos minutos un tiempo es atípico?`,
          fence,
          [`RIC = ${b3} − ${b1} = ${b3 - b1}.`, `${b3} + 1,5 · ${b3 - b1} = ${fmt(fence)} minutos.`],
          ["Calcula primero el RIC.", "Multiplícalo por 1,5.", "Súmalo a Q3."],
          {
            intent: "transfer",
            unit: "min",
            errors: [
              { value: b3 - b1, feedback: "Ese es el RIC; hay que multiplicarlo por 1,5 y sumarlo a Q3." },
              { value: b3 * 2.5, feedback: "Se usa 1,5 veces el RIC, no 1,5 veces Q3." },
            ].filter((e) => e.value !== fence),
          },
        ),
        n(
          "q6",
          `Los puntajes de ocho jugadores, ordenados, son ${list(data.slice(0, 7))} y uno más, el mayor. Si el rango es ${range}, ¿cuál es el puntaje mayor?`,
          data[7],
          [`Rango = mayor − menor → ${range} = mayor − ${data[0]}.`, `Mayor = ${data[0]} + ${range} = ${data[7]}.`],
          ["El rango es la diferencia entre el mayor y el menor.", `El menor puntaje es ${data[0]}.`, "Suma el rango al menor."],
          {
            intent: "transfer",
            errors: [
              { value: range, feedback: "El rango es una diferencia; el mayor es el menor más el rango." },
              { value: data[6] + range, feedback: "Se suma el rango al menor dato, no al penúltimo." },
            ].filter((e) => e.value !== data[7]),
          },
        ),
      ];
    },
    application: n(
      "app",
      "En un concurso de lectura, la sección A leyó (libros por estudiante) 2; 3; 3; 4; 4; 5; 5; 6 y la sección B 0; 1; 3; 4; 4; 6; 8; 10. Ambas tienen mediana 4. ¿Cuánto mayor es el RIC de B que el de A?",
      3,
      ["A: Q1 = 3, Q3 = 5, RIC = 2.", "B: Q1 = (1 + 3) ÷ 2 = 2, Q3 = (6 + 8) ÷ 2 = 7, RIC = 5.", "5 − 2 = 3: B es más dispersa en su parte central."],
      ["Calcula Q1 y Q3 de cada sección.", "RIC = Q3 − Q1.", "Resta los dos RIC."],
      {
        intent: "transfer",
        errors: [
          { value: 6, feedback: "Esa es la diferencia de rangos (10 − 4); se piden los RIC." },
          { value: 5, feedback: "Ese es el RIC de B; falta restarle el de A." },
        ],
      },
    ),
    outcome: "Puedes comparar grupos de datos mirando su centro y cuánto se separan.",
    commonErrors: [
      "Calcular cuartiles sin ordenar los datos.",
      "Confundir el rango con el rango intercuartílico.",
      "Comparar grupos solo por su media o mediana, sin mirar la dispersión.",
    ],
  }),
];

export const COUNTING_LESSONS: Lesson[] = [
  defineLesson({
    id: "combinatoria",
    unitId: "datos",
    title: "Técnicas de conteo",
    objective:
      "Contar casos con el principio multiplicativo, distinguir cuándo importa el orden y calcular ordenaciones y elecciones sencillas para hallar probabilidades.",
    purpose:
      "Saber cuántas contraseñas, menús o equipos son posibles sin tener que escribirlos uno por uno.",
    prerequisites: ["probabilidad-simple", "potencias-raices"],
    legacyModuleIds: ["medicion-d10", "medicion-d9"],
    visual: "counting",
    vocabulary: [
      { term: "Principio multiplicativo", meaning: "Si una elección tiene m opciones y otra n, juntas tienen m · n." },
      { term: "Factorial", meaning: "n! = n · (n − 1) · … · 1: formas de ordenar n objetos distintos." },
      { term: "Combinación", meaning: "Elección en la que el orden no importa: {Ana, Luis} es lo mismo que {Luis, Ana}." },
    ],
    sections: [
      {
        title: "Principio multiplicativo",
        paragraphs: [
          "Con 3 polos y 2 pantalones hay 3 · 2 = 6 atuendos: cada polo se combina con cada pantalón.",
          "Si se agregan 2 pares de zapatillas, cada uno de esos 6 atuendos admite 2 opciones: 12.",
        ],
        formula: "m opciones y n opciones → m · n casos",
      },
      {
        title: "Cuando el orden importa",
        paragraphs: [
          "Un podio de 3 entre 5 corredores: 5 opciones para el primer puesto, 4 para el segundo y 3 para el tercero: 5 · 4 · 3 = 60.",
          "Ordenar los 5 corredores completos da 5! = 120.",
        ],
        formula: "n! = n · (n − 1) · … · 1",
      },
      {
        title: "Cuando el orden no importa",
        paragraphs: [
          "Elegir 2 delegados entre 5: si se cuentan ordenados son 5 · 4 = 20, pero cada pareja aparece dos veces (A-B y B-A).",
          "Por eso las parejas sin orden son 20 ÷ 2 = 10.",
        ],
        formula: "parejas sin orden = n · (n − 1) ÷ 2",
      },
    ],
    examples: [
      ex("Un menú tiene 3 entradas, 4 segundos y 2 postres. ¿Cuántos almuerzos distintos hay?", [
        ["3 · 4 = 12", "Cada entrada se combina con cada segundo."],
        ["12 · 2 = 24", "Cada combinación anterior se combina con cada postre."],
        ["24 almuerzos", "Principio multiplicativo: se multiplican las opciones."],
      ], "Hay 24 almuerzos distintos."),
      ex("De 6 candidatos se eligen presidente y secretario. ¿De cuántas formas?", [
        ["6 opciones para presidente", "Cualquiera de los 6 candidatos."],
        ["5 opciones para secretario", "La misma persona no puede tener los dos cargos."],
        ["6 · 5 = 30", "El orden importa: Ana presidenta y Luis secretario no es lo mismo que al revés."],
      ], "Hay 30 formas."),
    ],
    diagnostic: [
      n("d-1", "¿Cuánto es 4 × 3 × 2?", 24, ["4 × 3 = 12; 12 × 2 = 24."], ["Multiplica de izquierda a derecha.", "4 × 3 = 12.", "12 × 2."]),
      n("d-2", "Al lanzar un dado, ¿cuál es la probabilidad de sacar 5? Escríbela como fracción.", 1 / 6, ["1 caso favorable de 6 posibles: 1/6."], ["¿Cuántas caras tiene el dado?", "¿Cuántas muestran un 5?", "Favorables ÷ posibles."]),
      c("d-3", "¿En cuál de estas situaciones importa el orden?", ["Elegir 2 frutas para un jugo", "Elegir el 1.° y el 2.° puesto de una carrera", "Elegir 3 libros para leer"], 1, "En un podio no es lo mismo ganar que quedar segundo."),
    ],
    questions(v) {
      const [a, b, cc] = [[3, 2, 2], [4, 3, 2], [5, 2, 3], [3, 3, 4], [6, 2, 2], [2, 5, 4]][v],
        runners = [5, 6, 7, 8, 4, 9][v],
        teams = [6, 5, 8, 10, 7, 12][v],
        cls = [30, 25, 20, 32, 28, 24][v],
        [k, m] = [[3, 10], [2, 10], [4, 10], [3, 6], [2, 8], [3, 5]][v],
        flavors = [6, 5, 8, 9, 7, 10][v],
        cups = (flavors * (flavors - 1)) / 2,
        podium = runners * (runners - 1) * (runners - 2);
      return [
        v % 2 === 0
          ? c(
              "q0",
              `¿Por qué, para formar parejas de 2 entre ${teams} personas, se divide ${teams} · ${teams - 1} entre 2?`,
              [
                "Porque cada pareja se contó dos veces (A-B y B-A)",
                ["Porque la mitad de las personas no participa", "Todas participan; se divide por el doble conteo."],
                ["Porque así lo indica la fórmula, sin razón", "Hay una razón: A-B y B-A son la misma pareja."],
              ],
              0,
              "Al contar con orden, cada pareja aparece en sus dos órdenes.",
            )
          : c(
              "q0",
              `Una clave de ${k} cifras (0 a 9) puede repetir cifras. ¿Por qué hay 10${sup(k)} claves posibles?`,
              [
                ["Porque hay 10 cifras que se suman", "No se suman: se multiplican las opciones de cada posición."],
                [`Porque es 10 · ${k}`, `10 · ${k} solo cuenta posiciones; las combinaciones son 10 · 10 · …, ${k} veces.`],
                "Porque cada posición tiene 10 opciones independientes",
              ],
              2,
              "Principio multiplicativo: 10 · 10 · … (una vez por posición).",
            ),
        n(
          "q1",
          `Hay ${a} polos, ${b} pantalones y ${cc} pares de zapatillas. ¿Cuántos atuendos distintos se pueden formar con una prenda de cada tipo?`,
          a * b * cc,
          [`${a} · ${b} · ${cc} = ${a * b * cc}.`],
          ["Cada polo se combina con cada pantalón.", "Y cada combinación, con cada par de zapatillas.", "Multiplica las opciones."],
          { errors: [{ value: a + b + cc, feedback: "Sumar cuenta prendas, no combinaciones: se multiplican las opciones." }] },
        ),
        n(
          "q2",
          `Completa: los podios posibles (1.°, 2.° y 3.°) entre ${runners} corredores son ${runners} · ${runners - 1} · ${runners - 2} = __.`,
          podium,
          [`${runners} · ${runners - 1} = ${runners * (runners - 1)}; · ${runners - 2} = ${podium}.`],
          ["Multiplica los dos primeros.", "Multiplica por el tercero.", `${podium}.`],
          {
            step: true,
            errors: [
              { value: runners * 3, feedback: `No es ${runners} · 3: las opciones bajan en cada puesto.` },
              { value: podium / 6, feedback: "Eso sería si el orden no importara; en un podio sí importa." },
            ],
          },
        ),
        n(
          "q3",
          `En un campeonato, ${teams} equipos juegan todos contra todos una sola vez. ¿Cuántos partidos se juegan?`,
          (teams * (teams - 1)) / 2,
          [`Con orden serían ${teams} · ${teams - 1} = ${teams * (teams - 1)}.`, `Cada partido se contó dos veces: ${teams * (teams - 1)} ÷ 2 = ${(teams * (teams - 1)) / 2}.`],
          ["Cada equipo juega contra los demás.", `${teams} · ${teams - 1} cuenta A-B y B-A.`, "Divide entre 2."],
          { errors: [{ value: teams * (teams - 1), feedback: "Así cada partido se cuenta dos veces (A-B y B-A)." }] },
        ),
        c(
          "q4",
          `Para elegir 2 delegados en un aula de ${cls}, alguien calcula ${cls} · ${cls - 1} = ${cls * (cls - 1)}. ¿Qué falla?`,
          [
            ["Nada", "Ana-Luis y Luis-Ana es la misma pareja de delegados."],
            `Los delegados no tienen orden: cada pareja se contó dos veces; son ${(cls * (cls - 1)) / 2}`,
            [`Debía sumar ${cls} + ${cls - 1}`, "Sumar no cuenta parejas."],
          ],
          1,
          "Sin orden, se divide entre las 2 formas de ordenar cada pareja.",
        ),
        n(
          "q5",
          `Un candado tiene ${k} ruedas con las cifras del 0 al ${m - 1}. Si alguien prueba una combinación al azar, ¿cuál es la probabilidad de acertar? Escríbela como fracción.`,
          1 / m ** k,
          [`Combinaciones posibles: ${m}${sup(k)} = ${m ** k}.`, `Probabilidad = 1/${m ** k}.`],
          ["Cada rueda tiene " + m + " opciones.", `Hay ${m}${sup(k)} combinaciones.`, "Solo una es correcta."],
          {
            intent: "transfer",
            errors: [{ value: 1 / (m * k), feedback: `Las ruedas se combinan: son ${m}${sup(k)} casos, no ${m} · ${k}.` }],
          },
        ),
        n(
          "q6",
          `Una heladería ofrece copas de 2 sabores distintos (el orden no importa). Si hay exactamente ${cups} copas posibles, ¿cuántos sabores tiene?`,
          flavors,
          [`Se busca n con n · (n − 1) ÷ 2 = ${cups}.`, `${flavors} · ${flavors - 1} ÷ 2 = ${cups} → n = ${flavors}.`],
          ["Las copas son parejas sin orden.", "n · (n − 1) ÷ 2 = número de copas.", "Prueba valores de n."],
          {
            intent: "transfer",
            errors: [
              { value: cups / 2, feedback: `Busca n tal que n · (n − 1) ÷ 2 = ${cups}; prueba valores.` },
              { value: flavors + 1, feedback: `Con ${flavors + 1} sabores habría ${((flavors + 1) * flavors) / 2} copas.` },
            ].filter((e) => e.value !== flavors),
          },
        ),
      ];
    },
    application: n(
      "app",
      "Para una rifa escolar se forman códigos con 2 letras (de la A a la E) seguidas de 2 cifras (del 0 al 9); letras y cifras pueden repetirse. Se vendieron 600 boletos con códigos distintos. ¿Qué fracción de los códigos posibles se vendió? Escríbela como decimal.",
      0.24,
      ["Códigos posibles: 5 · 5 · 10 · 10 = 2500.", "600 ÷ 2500 = 0,24."],
      ["Cuenta las opciones de cada posición.", "Multiplícalas.", "Divide los vendidos entre los posibles."],
      {
        intent: "transfer",
        errors: [
          { value: r6(600 / 1800), feedback: "Letras y cifras pueden repetirse: son 5 · 5 · 10 · 10 códigos." },
          { value: 20, feedback: "Las opciones se multiplican, no se suman." },
        ],
      },
    ),
    outcome: "Puedes contar casos posibles sin listarlos y usarlos para calcular probabilidades.",
    commonErrors: [
      "Sumar las opciones en vez de multiplicarlas.",
      "Contar dos veces la misma pareja cuando el orden no importa.",
      "Olvidar que las opciones se reducen cuando no se puede repetir.",
    ],
  }),
];

export const TRANSFORMATION_LESSONS: Lesson[] = [
  defineLesson({
    id: "transformaciones",
    unitId: "geometria",
    title: "Transformaciones en el plano",
    objective:
      "Aplicar traslaciones, reflexiones y rotaciones de 90° y 180° a figuras en el plano cartesiano, describir la regla de coordenadas de cada una y reconocer qué propiedades conservan.",
    purpose:
      "Diseñar mosaicos y logotipos o mover piezas en un videojuego es aplicar transformaciones a coordenadas.",
    prerequisites: ["angulos", "perimetro-area"],
    legacyModuleIds: ["geometria-d8", "geometria-d1"],
    visual: "transform",
    vocabulary: [
      { term: "Traslación", meaning: "Mover todos los puntos la misma distancia en la misma dirección, según un vector (a, b)." },
      { term: "Reflexión", meaning: "Imagen de espejo respecto a una recta (un eje)." },
      { term: "Isometría", meaning: "Transformación que conserva longitudes y ángulos: la figura cambia de lugar, no de forma ni de tamaño." },
    ],
    sections: [
      {
        title: "Traslación",
        paragraphs: [
          "Trasladar con el vector (3, −2) es mover cada punto 3 a la derecha y 2 hacia abajo: (1, 4) → (4, 2).",
          "La figura conserva su forma, su tamaño y su orientación.",
        ],
        formula: "(x, y) → (x + a, y + b)",
      },
      {
        title: "Reflexión",
        paragraphs: [
          "Respecto al eje x, cada punto queda a la misma distancia del eje pero del otro lado: cambia de signo la y.",
          "Respecto al eje y, cambia de signo la x. La figura reflejada queda «al revés», como en un espejo.",
        ],
        formula: "eje x: (x, y) → (x, −y) · eje y: (x, y) → (−x, y)",
      },
      {
        title: "Rotación",
        paragraphs: [
          "Rotar 90° en sentido antihorario alrededor del origen: (x, y) → (−y, x). Rotar 180°: (x, y) → (−x, −y).",
          "Traslaciones, reflexiones y rotaciones son isometrías: conservan longitudes y ángulos.",
        ],
        formula: "90°: (x, y) → (−y, x) · 180°: (x, y) → (−x, −y)",
      },
    ],
    examples: [
      ex("Traslada el punto A(2, −1) con el vector (3, 4).", [
        ["x: 2 + 3 = 5", "Se suma el desplazamiento horizontal."],
        ["y: −1 + 4 = 3", "Se suma el desplazamiento vertical."],
        ["A′(5, 3)", "Todos los puntos de la figura se mueven igual."],
      ], "A′ = (5, 3)."),
      ex("Rota el punto P(4, 1) 90° en sentido antihorario alrededor del origen.", [
        ["(x, y) → (−y, x)", "Regla de la rotación de 90° antihoraria."],
        ["(4, 1) → (−1, 4)", "Las coordenadas cambian de lugar y la nueva x cambia de signo."],
        ["OP = OP′ = √17", "La rotación conserva la distancia al centro."],
      ], "P′ = (−1, 4)."),
    ],
    diagnostic: [
      n("d-1", "¿Cuánto es −3 + 5?", 2, ["−3 + 5 = 2."], ["Parte de −3 en la recta.", "Avanza 5 a la derecha.", "2."]),
      c("d-2", "¿En qué cuadrante está el punto (−2, 3)?", ["Primero", "Segundo", "Tercero"], 1, "x negativa e y positiva: segundo cuadrante."),
      n("d-3", "¿Cuál es el opuesto de −7?", 7, ["El opuesto cambia el signo: 7."], ["El opuesto está a la misma distancia del 0.", "Del otro lado.", "7."]),
    ],
    questions(v) {
      const [x, y] = [[2, -1], [3, 4], [-2, 5], [4, -3], [-5, 2], [1, 6]][v],
        [a, b] = [[3, 4], [-2, 1], [5, -3], [-4, -2], [2, -6], [-3, 5]][v],
        moveX = (n: number) => `${Math.abs(n)} ${Math.abs(n) === 1 ? "casilla" : "casillas"} a la ${n > 0 ? "derecha" : "izquierda"}`,
        moveY = (n: number) => `${Math.abs(n)} ${n > 0 ? "hacia arriba" : "hacia abajo"}`;
      return [
        v % 2 === 0
          ? c(
              "q0",
              "¿Qué conserva una rotación?",
              [
                ["La posición de cada punto", "Los puntos cambian de lugar; lo que se conserva es la forma y el tamaño."],
                "Las longitudes y los ángulos de la figura",
                ["La orientación respecto a los ejes", "La figura gira, así que su orientación cambia."],
              ],
              1,
              "Las rotaciones son isometrías.",
            )
          : c(
              "q0",
              "Al reflejar una figura respecto al eje y, ¿qué coordenada cambia de signo?",
              [
                "La x",
                ["La y", "La y cambia al reflejar respecto al eje x."],
                ["Las dos", "Cambiar las dos es una rotación de 180°."],
              ],
              0,
              "Respecto al eje y: (x, y) → (−x, y).",
            ),
        n(
          "q1",
          `Traslada A${pt(x, y)} con el vector ${pt(a, b)}. ¿Cuál es la coordenada y de A′?`,
          y + b,
          [`y′ = ${sg(y)} + ${b < 0 ? `(${sg(b)})` : sg(b)} = ${sg(y + b)}.`],
          ["La traslación suma el vector.", "La y se suma con la segunda componente.", `${sg(y)} + ${sg(b)}.`],
          {
            errors: [
              { value: y - b, feedback: "Se suma la componente vertical del vector, no se resta." },
              { value: x + a, feedback: "Esa es la coordenada x de A′." },
            ].filter((e) => e.value !== y + b),
          },
        ),
        n(
          "q2",
          `Completa: al reflejar P${pt(x, y)} respecto al eje x, P′ = (${sg(x)}, __).`,
          -y,
          [`Respecto al eje x cambia de signo la y: ${sg(-y)}.`],
          ["¿Qué coordenada cambia en esta reflexión?", "La que mide la distancia al eje x.", `El opuesto de ${sg(y)}.`],
          {
            step: true,
            errors: [
              { value: y, feedback: "Respecto al eje x, la y cambia de signo." },
              { value: -x, feedback: "La x se mantiene; cambia la y." },
            ].filter((e) => e.value !== -y),
          },
        ),
        n(
          "q3",
          `Rota Q${pt(x, y)} 90° en sentido antihorario alrededor del origen. ¿Cuál es la coordenada x de Q′?`,
          -y,
          [`Regla: (x, y) → (−y, x).`, `Q′ = ${pt(-y, x)}: la nueva x es ${sg(-y)}.`],
          ["Recuerda la regla (x, y) → (−y, x).", "La nueva x es el opuesto de la y original.", `−(${sg(y)}).`],
          {
            errors: [
              { value: y, feedback: "La regla es (x, y) → (−y, x): la nueva x es −y." },
              { value: -x, feedback: "Eso corresponde a una rotación de 180° o a una reflexión, no a 90°." },
            ].filter((e) => e.value !== -y),
          },
        ),
        c(
          "q4",
          `Alguien rota ${pt(x, y)} 180° alrededor del origen y obtiene ${pt(-x, y)}. ¿Qué falla?`,
          [
            ["Nada", "Así solo se refleja respecto al eje y."],
            ["Debía intercambiar x e y", "Intercambiar (con un cambio de signo) es la rotación de 90°."],
            `En 180° cambian de signo las dos coordenadas: ${pt(-x, -y)}`,
          ],
          2,
          "Rotación de 180°: (x, y) → (−x, −y).",
        ),
        n(
          "q5",
          `En un videojuego, un personaje está en ${pt(x, y)} y se mueve ${moveX(a)} y ${moveY(b)}. ¿Cuál es su nueva coordenada x?`,
          x + a,
          [`Moverse a la ${a > 0 ? "derecha suma" : "izquierda resta"} → ${sg(x)} ${a > 0 ? "+" : "−"} ${Math.abs(a)} = ${sg(x + a)}.`],
          ["El movimiento horizontal cambia la x.", "Derecha suma; izquierda resta.", `${sg(x)} ${a > 0 ? "+" : "−"} ${Math.abs(a)}.`],
          {
            intent: "transfer",
            errors: unique([
              { value: x - a, feedback: "A la derecha se suma y a la izquierda se resta." },
              { value: y + b, feedback: "Esa es la nueva coordenada y." },
            ]).filter((e) => e.value !== x + a),
          },
        ),
        n(
          "q6",
          `Tras trasladar un punto con el vector ${pt(a, b)} quedó en ${pt(x + a, y + b)}. ¿Cuál era su coordenada x original?`,
          x,
          [`Se deshace la traslación restando el vector: ${sg(x + a)} − ${a < 0 ? `(${sg(a)})` : sg(a)} = ${sg(x)}.`],
          ["Piensa hacia atrás.", "Si se sumó el vector, ahora se resta.", `${sg(x + a)} − ${sg(a)}.`],
          {
            intent: "transfer",
            errors: [
              { value: x + 2 * a, feedback: "Para deshacer la traslación se resta el vector, no se suma." },
              { value: y, feedback: "Esa es la coordenada y original." },
            ].filter((e) => e.value !== x),
          },
        ),
      ];
    },
    application: n(
      "app",
      "Un logotipo tiene un vértice en (3, 1). Se refleja respecto al eje y y luego se traslada con el vector (2, 5). ¿Cuál es la coordenada x final del vértice?",
      -1,
      ["Reflexión respecto al eje y: (3, 1) → (−3, 1).", "Traslación: (−3 + 2, 1 + 5) = (−1, 6).", "La coordenada x final es −1."],
      ["Aplica las transformaciones en orden.", "Primero la reflexión: cambia el signo de x.", "Luego suma el vector."],
      {
        intent: "transfer",
        errors: [
          { value: 5, feedback: "Primero se refleja: (3, 1) → (−3, 1); después se suma 2." },
          { value: 6, feedback: "Esa es la coordenada y final." },
        ],
      },
    ),
    outcome: "Puedes describir con coordenadas cómo se mueve, se refleja o gira una figura.",
    commonErrors: [
      "Cambiar el signo de la coordenada equivocada al reflejar.",
      "Confundir la rotación de 90° con la de 180°.",
      "Restar el vector de traslación en lugar de sumarlo (o al revés al deshacerla).",
    ],
  }),
];
