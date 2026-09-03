import { type Problem, randInt, choiceSet } from "./problem";
import {
  datoIrrelevanteHints,
  deduccionHints,
  optimizacionHints,
  presupuestoHints,
  problemaDivisionHints,
  problemaDosPasosHints,
  problemaMultiplicacionSumaHints,
  problemaRestaHints,
  problemaSumaHints,
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
    case 9: {
      const secret = randInt(1, 50);
      const add = randInt(2, 20);
      return {
        id,
        difficulty,
        kind: "deduccion",
        prompt: `Pienso un número. Si le sumo ${add}, obtengo ${secret + add}. ¿Cuál es mi número?`,
        answer: secret,
        inputType: "integer",
        hints: deduccionHints(add, secret + add, secret),
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
