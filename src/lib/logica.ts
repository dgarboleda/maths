import { type Problem, randInt, choiceSet } from "./problem";
import {
  datoIrrelevanteHints,
  estimacionHints,
  optimizacionHints,
  pensarHaciaAtrasHints,
  presupuestoHints,
  problemaDivisionHints,
  problemaDosPasosHints,
  problemaMultiplicacionSumaHints,
  problemaRestaHints,
  problemaSumaHints,
  redondeoCentenaHints,
  redondeoHints,
} from "./hints";

export function generateProblem(difficulty: number): Problem {
  const id = crypto.randomUUID();

  switch (difficulty) {
    case 1: {
      const a = randInt(1, 5);
      const b = randInt(1, 4);
      const answer = a + b;
      return {
        id,
        difficulty,
        kind: "problema_suma",
        prompt: `Tienes ${a} manzana(s) y te regalan ${b} más. ¿Cuántas manzanas tienes ahora?`,
        answer,
        choices: choiceSet(answer, 2),
        inputType: "choice",
        hints: problemaSumaHints(a, b, answer),
      };
    }
    case 2: {
      const a = randInt(5, 10);
      const b = randInt(1, a - 1);
      const answer = a - b;
      return {
        id,
        difficulty,
        kind: "problema_resta",
        prompt: `Tenías ${a} globos y se te reventaron ${b}. ¿Cuántos globos te quedan?`,
        answer,
        choices: choiceSet(answer, 2),
        inputType: "choice",
        hints: problemaRestaHints(a, b, answer),
      };
    }
    case 3: {
      const porPlato = randInt(2, 8);
      const platos = randInt(2, 6);
      return {
        id,
        difficulty,
        kind: "problema_division",
        prompt: `Hay ${porPlato * platos} galletas repartidas en partes iguales en ${platos} platos. ¿Cuántas galletas hay en cada plato?`,
        answer: porPlato,
        inputType: "integer",
        hints: problemaDivisionHints(porPlato * platos, platos, porPlato),
        flavor: "🕵️ En el Distrito Misterioso hay que repartir las pistas por igual entre los investigadores.",
      };
    }
    case 4: {
      const inicial = randInt(10, 30);
      const gana = randInt(1, 15);
      const pierde = randInt(1, 10);
      return {
        id,
        difficulty,
        kind: "problema_dos_pasos",
        prompt: `Tenías ${inicial} canicas. Ganaste ${gana} y luego perdiste ${pierde}. ¿Cuántas canicas tienes ahora?`,
        answer: inicial + gana - pierde,
        inputType: "integer",
        hints: problemaDosPasosHints(inicial, gana, pierde, inicial + gana - pierde),
      };
    }
    case 5: {
      const paquetes = randInt(2, 6);
      const porPaquete = randInt(2, 6);
      const yaTenia = randInt(1, 10);
      return {
        id,
        difficulty,
        kind: "problema_multiplicacion_suma",
        prompt: `Compraste ${paquetes} paquetes de ${porPaquete} lápices cada uno, y ya tenías ${yaTenia} lápices. ¿Cuántos lápices tienes en total?`,
        answer: paquetes * porPaquete + yaTenia,
        inputType: "integer",
        hints: problemaMultiplicacionSumaHints(paquetes, porPaquete, yaTenia, paquetes * porPaquete + yaTenia),
      };
    }
    case 6: {
      const edadA = randInt(10, 16);
      const edadB = randInt(4, edadA - 1);
      const alturaDistractor = randInt(100, 160);
      return {
        id,
        difficulty,
        kind: "dato_irrelevante",
        prompt: `Ana tiene ${edadA} años. Su hermano tiene ${edadB} años y mide ${alturaDistractor} cm. ¿Cuántos años más tiene Ana que su hermano?`,
        answer: edadA - edadB,
        inputType: "integer",
        hints: datoIrrelevanteHints(edadA, edadB, edadA - edadB),
      };
    }
    case 7: {
      const dinero = randInt(30, 100);
      const gasto1 = randInt(5, Math.floor(dinero / 3));
      const gasto2 = randInt(5, Math.floor(dinero / 3));
      return {
        id,
        difficulty,
        kind: "presupuesto",
        prompt: `Tienes $${dinero}. Compras algo de $${gasto1} y otra cosa de $${gasto2}. ¿Cuánto dinero te queda?`,
        answer: dinero - gasto1 - gasto2,
        inputType: "integer",
        hints: presupuestoHints(dinero, gasto1, gasto2, dinero - gasto1 - gasto2),
      };
    }
    case 8: {
      const variant = randInt(0, 2);
      if (variant === 0) {
        const n = randInt(11, 989);
        const rounded = Math.round(n / 10) * 10;
        return {
          id,
          difficulty,
          kind: "redondeo",
          prompt: `Redondea ${n} a la decena más cercana.`,
          answer: rounded,
          inputType: "integer",
          hints: redondeoHints(n, rounded),
        };
      }
      if (variant === 1) {
        const n = randInt(101, 9899);
        const rounded = Math.round(n / 100) * 100;
        return {
          id,
          difficulty,
          kind: "redondeo_centena",
          prompt: `Redondea ${n} a la centena más cercana.`,
          answer: rounded,
          inputType: "integer",
          hints: redondeoCentenaHints(n, rounded),
        };
      }
      const a = randInt(120, 880);
      const b = randInt(120, 880);
      const ra = Math.round(a / 100) * 100;
      const rb = Math.round(b / 100) * 100;
      return {
        id,
        difficulty,
        kind: "estimacion",
        prompt: `Estima ${a} + ${b} redondeando cada número a la centena más cercana. ¿Qué resultado aproximado obtienes?`,
        answer: ra + rb,
        inputType: "integer",
        hints: estimacionHints(a, b, ra, rb, ra + rb),
      };
    }
    case 9: {
      // Dos operaciones que hay que deshacer en orden inverso: la versión
      // "en palabras" de una ecuación de dos pasos, antes de escribirla con x.
      const x = randInt(2, 15);
      const m = randInt(2, 5);
      const a = randInt(1, 20);
      const suma = Math.random() < 0.6 || m * x - a <= 0;
      const result = suma ? m * x + a : m * x - a;
      return {
        id,
        difficulty,
        kind: "pensar_hacia_atras",
        prompt: `Pienso un número. Lo multiplico por ${m} y después ${suma ? "le sumo" : "le resto"} ${a}. Obtengo ${result}. ¿Qué número pensé?`,
        answer: x,
        inputType: "integer",
        hints: pensarHaciaAtrasHints(m, a, suma, result, x),
      };
    }
    default: {
      const dinero = randInt(15, 50);
      const precio = randInt(2, 7);
      return {
        id,
        difficulty: 10,
        kind: "optimizacion",
        prompt: `Quieres comprar la mayor cantidad posible de globos que cuestan $${precio} cada uno, con $${dinero}. ¿Cuántos globos puedes comprar?`,
        answer: Math.floor(dinero / precio),
        inputType: "integer",
        hints: optimizacionHints(dinero, precio, Math.floor(dinero / precio)),
      };
    }
  }
}
