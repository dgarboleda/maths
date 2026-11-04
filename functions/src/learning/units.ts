import type { UnitId } from "./types";

/** Unidades del programa. Sin lecciones: el navegador lo importa sin cargar el catálogo. */
export const LEARNING_UNITS = [
  {
    id: "numeros",
    title: "Números enteros y operaciones",
    description: "Ubica, compara y opera con números positivos y negativos.",
  },
  {
    id: "fracciones",
    title: "Fracciones y representaciones",
    description: "Entiende qué representa una parte, cómo calcularla y cómo operar con ella.",
  },
  {
    id: "proporcionalidad",
    title: "Razones y proporcionalidad",
    description: "Compara, escala y decide con una referencia común.",
  },
  {
    id: "algebra",
    title: "Ecuaciones para resolver situaciones",
    description: "Representa lo desconocido y comprueba tus decisiones.",
  },
  {
    id: "expresiones",
    title: "Expresiones, ecuaciones y funciones",
    description: "Transforma expresiones, equilibra ecuaciones completas y describe relaciones lineales.",
  },
  {
    id: "geometria",
    title: "Geometría y medida",
    description: "Mide superficies, contornos, volúmenes y distancias con sentido.",
  },
  {
    id: "datos",
    title: "Datos y probabilidad",
    description: "Resume un conjunto de datos y cuantifica la incertidumbre.",
  },
] as const satisfies readonly { id: UnitId; title: string; description: string }[];
