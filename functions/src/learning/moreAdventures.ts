import type { AdventureDef, AdventureInput } from "./adventures";
import type { UnitId } from "./types";

type Spec = {
  id: string; unitId: UnitId; title: string; intro: string; inputs: AdventureInput[];
  goals: string[]; lessonIds: string[]; success: string;
  checks: ((v: number[]) => boolean)[]; hints: string[];
};
const input = (id: string, label: string, max: number, clue: string, unit?: string): AdventureInput =>
  ({ id, label, min: 0, max, step: 1, start: 0, clue, unit });
const make = (s: Spec): AdventureDef => ({
  ...s, eyebrow: "Nueva misión / Ciudad Central", initialFeedback: "Investiga la situación antes de preparar tu plan.",
  inspectFeedback: s.intro, inspectFirst: "Investiga primero la situación.",
  evaluate(values) {
    const goals = s.checks.map((check) => check(values));
    const failed = goals.indexOf(false);
    return { goals, feedback: failed < 0 ? s.success : s.hints[failed] };
  },
});

export const MORE_ADVENTURES: AdventureDef[] = [
  make({ id: "convoy-suministros", unitId: "numeros", title: "El convoy de suministros",
    intro: "Dos vehículos parten juntos ahora. El primero vuelve cada 12 minutos y el segundo cada 18. Deben reunirse de nuevo lo antes posible y realizar una entrega 6 minutos después.",
    inputs: [input("encuentro", "Minutos hasta el encuentro", 100, "Busca el menor múltiplo positivo común de 12 y 18.", "min"), input("entrega", "Minutos hasta la entrega", 100, "La entrega es 6 minutos después del encuentro.", "min")],
    goals: ["Primer encuentro después de partir", "Entrega 6 minutos después"], lessonIds: ["mcd-mcm"], checks: [v => v[0] === 36, v => v[1] === v[0] + 6], hints: ["Compara las salidas de ambos vehículos y busca la primera coincidencia después del minuto 0.", "Suma 6 minutos al encuentro que elegiste."], success: "Los múltiplos coinciden por primera vez en 36; la entrega será en el minuto 42." }),
  make({ id: "mezcla-emergencia", unitId: "fracciones", title: "La mezcla de emergencia",
    intro: "Un depósito contiene 3/4 de litro de solución y se añaden 2/3 de litro. Cada equipo necesita 1/12 de litro. Indica la cantidad total en doceavos y los equipos completos que se pueden abastecer.",
    inputs: [input("doceavos", "Cantidad total en doceavos de litro", 30, "Expresa ambas fracciones con denominador 12."), input("equipos", "Equipos completos", 30, "Cada equipo consume un doceavo de litro.")],
    goals: ["Cantidad total correcta", "Equipos abastecidos correctamente"], lessonIds: ["fracciones-suma-resta"], checks: [v => v[0] === 17, v => v[1] === v[0]], hints: ["Convierte 3/4 y 2/3 a doceavos antes de sumar.", "Cada equipo usa una de las partes de 1/12 que calculaste."], success: "3/4 + 2/3 = 9/12 + 8/12 = 17/12 litros: alcanza para 17 equipos." }),
  make({ id: "mercado-barrio", unitId: "proporcionalidad", title: "El mercado del barrio",
    intro: "Un kit cuesta 200 soles. La tienda aplica primero un descuento del 20 % y luego otro del 10 % sobre el precio rebajado. El presupuesto es 450 soles. Calcula el precio final de un kit y cuántos kits completos puedes comprar como máximo.",
    inputs: [input("precio", "Precio final por kit", 250, "Aplica cada descuento al precio vigente.", "soles"), input("kits", "Kits", 10, "Compra tantos kits completos como permita el presupuesto.")],
    goals: ["Precio con ambos descuentos", "Máximo de kits dentro del presupuesto"], lessonIds: ["porcentajes-aplicados"], checks: [v => v[0] === 144, v => v[1] === 3], hints: ["El segundo descuento se calcula después del primero, no sobre los 200 iniciales.", "Compara el coste de 3 y 4 kits con los 450 soles."], success: "200 × 0,8 × 0,9 = 144 soles. Tres kits cuestan 432 soles y cuatro exceden el presupuesto." }),
  make({ id: "rescate-montana", unitId: "proporcionalidad", title: "El rescate en la montaña",
    intro: "Ocho rescatistas despejan una ruta en 15 horas trabajando al mismo ritmo. Hay 12 disponibles. Elige un equipo y calcula sus horas: la ruta debe quedar lista en 10 horas como máximo usando el menor equipo posible.",
    inputs: [input("personas", "Rescatistas", 12, "El trabajo total se mantiene en 8 × 15 horas-persona."), input("horas", "Horas de trabajo", 120, "Personas × horas debe igualar el trabajo total.", "h")],
    goals: ["Equipo mínimo para terminar en 10 horas", "Tiempo coherente con el trabajo total"], lessonIds: ["proporcionalidad-inversa"], checks: [v => v[0] === 12, v => v[0] * v[1] === 120], hints: ["Divide las 120 horas-persona entre el límite de 10 horas.", "Conserva el producto personas × horas = 120."], success: "El trabajo requiere 120 horas-persona: 12 rescatistas tardan 10 horas." }),
  make({ id: "feria-energia", unitId: "expresiones", title: "La feria de energía",
    intro: "La feria necesita exactamente 10 generadores que produzcan 32 kW. Los pequeños producen 2 kW y los grandes 5 kW. Decide cuántos de cada tipo instalar.",
    inputs: [input("pequenos", "Generadores pequeños", 20, "Cada uno produce 2 kW."), input("grandes", "Generadores grandes", 20, "Cada uno produce 5 kW.")],
    goals: ["10 generadores", "Producción de 32 kW"], lessonIds: ["sistemas-ecuaciones"], checks: [v => v[0] + v[1] === 10, v => 2*v[0] + 5*v[1] === 32], hints: ["Los dos tipos deben sumar 10 generadores.", "Multiplica cada cantidad por su producción y suma hasta 32 kW."], success: "Dos ecuaciones describen el plan: p + g = 10 y 2p + 5g = 32. Se necesitan 6 pequeños y 4 grandes." }),
  make({ id: "ruta-dron", unitId: "geometria", title: "La ruta del dron",
    intro: "El dron sale de A(0, 0) hacia B(12, 8). La estación de recarga debe colocarse exactamente en el punto medio. Indica sus coordenadas.",
    inputs: [input("x", "Coordenada x", 12, "Promedia las coordenadas horizontales de A y B."), input("y", "Coordenada y", 8, "Promedia las coordenadas verticales de A y B.")],
    goals: ["Coordenada horizontal del punto medio", "Coordenada vertical del punto medio"], lessonIds: ["distancia-punto-medio"], checks: [v => v[0] === 6, v => v[1] === 4], hints: ["Busca el punto a mitad de camino entre x = 0 y x = 12.", "Busca el punto a mitad de camino entre y = 0 y y = 8."], success: "El punto medio es ((0 + 12)/2, (0 + 8)/2) = (6, 4)." }),
  make({ id: "deposito-agua", unitId: "geometria", title: "El depósito de agua",
    intro: "Un depósito rectangular mide 3 m de largo, 2 m de ancho y 2 m de alto. Ya contiene 4.000 litros. Calcula su capacidad en metros cúbicos y los litros que faltan para llenarlo.",
    inputs: [input("volumen", "Capacidad", 30, "Multiplica largo × ancho × alto.", "m³"), input("faltan", "Litros que faltan", 15000, "Un metro cúbico equivale a 1.000 litros.", "L")],
    goals: ["Volumen del depósito", "Litros necesarios para llenarlo"], lessonIds: ["sistema-metrico", "volumen"], checks: [v => v[0] === 12, v => v[1] === 8000], hints: ["Multiplica las tres dimensiones en metros.", "Convierte la capacidad a litros y resta los 4.000 litros existentes."], success: "El volumen es 3 × 2 × 2 = 12 m³, o 12.000 L. Faltan 8.000 L." }),
  make({ id: "puente-valle", unitId: "geometria", title: "El puente del valle",
    intro: "El plano forma un triángulo rectángulo con catetos de 6 m y 8 m. La pasarela cruza en diagonal y las piezas miden 2 m. Calcula la longitud de la diagonal y el número mínimo de piezas.",
    inputs: [input("diagonal", "Longitud diagonal", 30, "Usa la suma de los cuadrados de los catetos.", "m"), input("piezas", "Piezas de 2 m", 20, "Cada pieza cubre 2 metros completos.")],
    goals: ["Longitud de la diagonal", "Número mínimo de piezas"], lessonIds: ["pitagoras"], checks: [v => v[0] === 10, v => v[1] === 5], hints: ["Plantea diagonal² = 6² + 8² y busca su raíz.", "Divide la longitud necesaria entre 2 m por pieza."], success: "6² + 8² = 100, así que la diagonal mide 10 m y hacen falta 5 piezas." }),
  make({ id: "tombola-solidaria", unitId: "datos", title: "La tómbola solidaria",
    intro: "La bolsa tendrá 20 boletos: algunos premiados y el resto sin premio. La probabilidad de sacar un premio debe ser 3/10. Cada premio cuesta 4 soles y el presupuesto máximo es 24 soles. Decide cuántos boletos premiados y sin premio incluir.",
    inputs: [input("premios", "Boletos premiados", 20, "La probabilidad es premiados ÷ total."), input("sin", "Boletos sin premio", 20, "Entre los dos tipos deben sumar 20.")],
    goals: ["20 boletos en total", "Probabilidad 3/10", "Coste de premios dentro del presupuesto"], lessonIds: ["probabilidad-simple"], checks: [v => v[0]+v[1] === 20, v => v[0]*10 === 3*(v[0]+v[1]) && v[0]+v[1] > 0, v => v[0]*4 <= 24], hints: ["Suma los boletos de ambos tipos hasta 20.", "Compara premiados / total con 3/10.", "Multiplica los premios por 4 y compara con el presupuesto."], success: "6 de 20 boletos dan 3/10; los premios cuestan 24 soles." }),
  make({ id: "alerta-meteorologica", unitId: "datos", title: "La alerta meteorológica",
    intro: "De 20 días con lluvia, 15 tuvieron alerta previa. En los otros 30 días no llovió. Calcula cuántos días de lluvia no tuvieron alerta y qué porcentaje de los días lluviosos sí tuvieron alerta.",
    inputs: [input("sin-alerta", "Días lluviosos sin alerta", 20, "Resta los días lluviosos con alerta del total lluvioso."), input("porcentaje", "Días lluviosos con alerta", 100, "Compara 15 con los 20 días lluviosos, no con los 50 días totales.", "%")],
    goals: ["Días lluviosos sin alerta", "Porcentaje condicionado a lluvia"], lessonIds: ["probabilidad-condicional"], checks: [v => v[0] === 5, v => v[1] === 75], hints: ["De los 20 días de lluvia, 15 ya están contados con alerta.", "Divide 15 entre los 20 días con lluvia y convierte a porcentaje."], success: "Faltaron alertas en 5 días lluviosos; 15/20 = 75 % de los días lluviosos tuvieron alerta." }),
  make({ id: "ahorro-observatorio", unitId: "proporcionalidad", title: "El ahorro para el observatorio",
    intro: "La escuela ahorra 1.000 soles al 10 % de interés compuesto anual. El interés se añade al capital cada año. Calcula el saldo después del primer y del segundo año.",
    inputs: [input("ano1", "Saldo tras el primer año", 2000, "Añade el 10 % de 1.000.", "soles"), input("ano2", "Saldo tras el segundo año", 2500, "El segundo 10 % se calcula sobre el saldo del primer año.", "soles")],
    goals: ["Saldo al terminar el primer año", "Saldo al terminar el segundo año"], lessonIds: ["interes-compuesto"], checks: [v => v[0] === 1100, v => v[1] === 1210], hints: ["Calcula 1.000 × 1,10.", "Multiplica el saldo del primer año por 1,10 otra vez."], success: "El ahorro pasa de 1.000 a 1.100 y luego a 1.210 soles; el segundo interés también produce interés." }),
  make({ id: "trayectoria-cohete", unitId: "expresiones", title: "La trayectoria del cohete",
    intro: "La altura del cohete viene dada por h(t) = −t² + 8t, en metros, con t en segundos. Calcula en qué segundo alcanza su altura máxima y cuánto mide esa altura.",
    inputs: [input("tiempo", "Segundo de altura máxima", 8, "La parábola es simétrica entre el despegue y el aterrizaje.", "s"), input("altura", "Altura máxima", 30, "Sustituye el tiempo de tu plan en h(t) = −t² + 8t.", "m")],
    goals: ["Instante del vértice", "Altura máxima"], lessonIds: ["funcion-cuadratica"], checks: [v => v[0] === 4, v => v[1] === 16], hints: ["El cohete despega en t = 0 y vuelve al suelo en t = 8; el vértice está a mitad de camino.", "Sustituye t = 4 en la expresión de altura."], success: "La parábola alcanza su vértice en t = 4; h(4) = −16 + 32 = 16 m." }),
];
