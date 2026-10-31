import { LESSONS } from "../../../functions/src/learning/catalog";

export interface GlossaryEntry {
  term: string;
  meaning: string;
  example?: string;
  aliases?: string[];
}

// Definiciones generales, independientes de las respuestas de cada actividad.
const EVERYDAY_TERMS: GlossaryEntry[] = [
  { term: "Pendiente", aliases: ["inclinación", "inclinacion"], meaning: "En una gráfica, indica cuánto cambia una cantidad cuando otra aumenta una unidad. También puede describir la inclinación de una subida o bajada; en otro contexto, algo pendiente es algo que falta hacer.", example: "Si una calle sube 2 metros por cada 10 metros de avance horizontal, su pendiente es 2/10." },
  { term: "Fusible", aliases: ["fusibles"], meaning: "Pieza de seguridad que interrumpe el paso de la corriente eléctrica si esta es demasiado intensa, para proteger un circuito." },
  { term: "Circuito eléctrico", aliases: ["circuito", "circuitos"], meaning: "Camino cerrado por el que puede circular corriente eléctrica entre una fuente y los aparatos conectados." },
  { term: "Corriente eléctrica", aliases: ["corriente"], meaning: "Movimiento de cargas eléctricas a través de un material, como un cable." },
  { term: "Voltaje", aliases: ["tensión eléctrica", "tension electrica"], meaning: "Diferencia de energía eléctrica por carga entre dos puntos; ayuda a impulsar la corriente en un circuito." },
  { term: "Generador", meaning: "Máquina que transforma otra forma de energía en energía eléctrica." },
  { term: "Suministro", meaning: "Entrega de un recurso necesario, como agua, electricidad o alimentos." },
  { term: "Reserva", meaning: "Cantidad de un recurso que se guarda y está disponible para usar después." },
  { term: "Distribuir", aliases: ["distribución", "distribucion", "repartir", "reparto"], meaning: "Repartir una cantidad entre varias personas, lugares o usos." },
  { term: "Capacidad", meaning: "Cantidad máxima que puede contener o admitir algo, según el contexto." },
  { term: "Recurso", meaning: "Algo disponible que se puede utilizar para conseguir un objetivo, como agua, dinero o tiempo." },
  { term: "Proporción", aliases: ["proporcional", "proporcionalidad"], meaning: "Relación entre cantidades que permite comparar cómo cambia una respecto a otra." },
  { term: "Porcentaje", aliases: ["por ciento", "%"], meaning: "Una forma de expresar una cantidad por cada cien partes iguales.", example: "25 % significa 25 de cada 100." },
  { term: "Fracción", aliases: ["fracciones"], meaning: "Número que puede representar partes iguales de una unidad o una división.", example: "3/4 representa tres partes de una unidad dividida en cuatro partes iguales." },
  { term: "Variable", meaning: "Símbolo, normalmente una letra, que representa una cantidad que puede cambiar o cuyo valor se busca." },
  { term: "Ecuación", aliases: ["ecuaciones"], meaning: "Igualdad con una o más cantidades desconocidas. Resolverla es encontrar los valores que hacen verdadera la igualdad." },
  { term: "Promedio", aliases: ["media aritmética", "media aritmetica"], meaning: "Para calcular la media aritmética, suma los valores y divide entre cuántos valores hay." },
  { term: "Probabilidad", meaning: "Medida de qué tan posible es que ocurra un suceso, desde 0 (imposible) hasta 1 (seguro)." },
];

const normalize = (text: string) => text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

const entries: GlossaryEntry[] = (() => {
  const terms = new Set(EVERYDAY_TERMS.map(({ term }) => normalize(term)));
  const result = [...EVERYDAY_TERMS];
  for (const lesson of LESSONS) for (const { term, meaning } of lesson.vocabulary) {
    const key = normalize(term);
    if (!terms.has(key)) { terms.add(key); result.push({ term, meaning }); }
  }
  return result;
})();

/** Busca nombres y sinónimos sin distinguir mayúsculas ni tildes. */
export function searchGlossary(query: string): GlossaryEntry[] {
  const value = normalize(query).replace(/\s+/g, " ");
  if (!value) return [];
  const variants = value.endsWith("s") && value.length > 3 ? [value, value.slice(0, -1)] : [value];
  return entries.filter(({ term, aliases = [] }) => [term, ...aliases].some((name) => {
    const normalized = normalize(name);
    return variants.some((variant) => normalized.includes(variant));
  })).sort((a, b) => {
    const rank = (entry: GlossaryEntry) => normalize(entry.term) === value ? 0 : normalize(entry.term).startsWith(value) ? 1 : 2;
    return rank(a) - rank(b) || a.term.localeCompare(b.term, "es");
  });
}
