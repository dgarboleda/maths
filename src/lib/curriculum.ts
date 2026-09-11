import type { ComponentType } from "react";
import type { Problem } from "./problem";
import type { SkillProgress } from "./types";
import { isReviewDue, reviewDueAt } from "./mastery";
import { pisa, type PisaTag } from "./pisa";
import { generateProblem as generateAritmetica } from "./arithmetic";
import { generateProblem as generateAlgebra } from "./algebra";
import { generateProblem as generateGeometria } from "./geometria";
import { generateProblem as generateMedicion } from "./medicion";
import { generateProblem as generateLogica } from "./logica";
import { generateMcdMcmProblem, generateUnlikeFractionsProblem } from "./aritmeticaMcdMcm";
import { NumberLineConcept } from "@/components/topic/concepts/NumberLineConcept";
import { ArrayConcept } from "@/components/topic/concepts/ArrayConcept";
import { FractionBarConcept } from "@/components/topic/concepts/FractionBarConcept";
import { PatternConcept } from "@/components/topic/concepts/PatternConcept";
import { BalanceConcept } from "@/components/topic/concepts/BalanceConcept";
import { AlgebraConcept } from "@/components/topic/concepts/AlgebraConcept";
import { ShapeConcept } from "@/components/topic/concepts/ShapeConcept";
import { DataConcept } from "@/components/topic/concepts/DataConcept";
import { WordProblemConcept } from "@/components/topic/concepts/WordProblemConcept";
import { McdMcmConcept } from "@/components/topic/concepts/McdMcmConcept";
import { FraccionesDistintoDenomConcept } from "@/components/topic/concepts/FraccionesDistintoDenomConcept";
import { SlidesConcept } from "@/components/topic/concepts/SlidesConcept";
import { CONCEPT_SLIDES } from "./curriculum/conceptSlides";
import { STRANDS } from "./strands";
import { allModules, getCustomModule } from "./curriculum/customRegistry";

/**
 * Currícula: un solo grafo de módulos con prerrequisitos explícitos, que
 * puede cruzar hilos libremente (p. ej. "figuras semejantes" en Geometría
 * depende de "proporciones" en Álgebra). Reemplaza al modelo anterior de
 * "5 hilos independientes con 10 niveles fijos cada uno", que no tenía
 * ninguna relación real entre hilos ni permitía insertar un tema nuevo sin
 * renumerar todo.
 *
 * El destino es el nivel que evalúa PISA a los 15 años (ver pisa.ts y
 * docs/curricula-pisa.md): `tier` es el grado escolar de referencia y
 * `pisa` la categoría y el nivel de desempeño de los ítems del módulo.
 *
 * El `id` de los 50 módulos que ya existían es exactamente la clave que ya
 * se usa como doc id de `skillsProgress` ("{strand}-d{difficulty}") — no
 * hace falta migrar ningún progreso guardado, y por eso esos ids nunca se
 * renombran aunque cambie su tema, grado o prerrequisitos. Los módulos
 * nuevos usan un id descriptivo en vez de un número de nivel.
 */
export interface ModuleDef {
  id: string;
  strandSlug: string;
  /** Solo determina el valor en estrellas (ver economy.ts) — ya no ordena
   * ni bloquea nada; eso lo hacen `prerequisites` y `tier`. */
  difficulty: number;
  label: string;
  emoji: string;
  /** Grado escolar de referencia: 0 = preescolar, 1–10 = 1.º a 10.º
   * (progresión CCSS-M). Agrupa en la vista del padre y ordena las
   * recomendaciones (`nextChallenge` prefiere el grado más bajo). */
  tier: number;
  /** Categoría y nivel PISA de los ítems del módulo. Obligatorio en los
   * módulos de código (lo exige curriculum-grafo.test.ts); los
   * personalizados (cst-*) no lo tienen y quedan fuera de la medición PISA. */
  pisa?: PisaTag;
  /** Ids de otros módulos —de cualquier hilo— que hay que dominar antes. */
  prerequisites: string[];
  generateProblem: () => Problem;
  ConceptComponent: ComponentType;
  /** Ruta propia (p. ej. la tabla de multiplicar); si falta, se usa la
   * genérica /jugar/{childId}/{strand}/{moduleId}. */
  href?: (childId: string) => string;
}

export const MODULES: ModuleDef[] = [
  // ── Aritmética (PISA: Cantidad) ────────────────────────────────────
  {
    id: "aritmetica-d1",
    strandSlug: "aritmetica",
    difficulty: 1,
    label: "Sumas hasta 5",
    emoji: "➕",
    tier: 0,
    pisa: pisa("cantidad", "B"),
    prerequisites: [],
    generateProblem: () => generateAritmetica(1),
    ConceptComponent: () => NumberLineConcept({ min: 0, max: 5 }),
  },
  {
    id: "aritmetica-d2",
    strandSlug: "aritmetica",
    difficulty: 2,
    label: "Sumas y restas hasta 10",
    emoji: "➖",
    tier: 1,
    pisa: pisa("cantidad", "1c"),
    prerequisites: ["aritmetica-d1"],
    generateProblem: () => generateAritmetica(2),
    ConceptComponent: () => NumberLineConcept({ min: 0, max: 10 }),
  },
  {
    id: "aritmetica-d3",
    strandSlug: "aritmetica",
    difficulty: 3,
    label: "Sumas y restas hasta 100",
    emoji: "🔢",
    tier: 2,
    pisa: pisa("cantidad", "1c"),
    prerequisites: ["aritmetica-d2"],
    generateProblem: () => generateAritmetica(3),
    ConceptComponent: () => NumberLineConcept({ min: 0, max: 100 }),
  },
  {
    id: "aritmetica-d4",
    strandSlug: "aritmetica",
    difficulty: 4,
    label: "Sumas y restas hasta 1000",
    emoji: "🧮",
    tier: 3,
    pisa: pisa("cantidad", "1b"),
    prerequisites: ["aritmetica-d3"],
    generateProblem: () => generateAritmetica(4),
    ConceptComponent: () => NumberLineConcept({ min: 0, max: 999 }),
  },
  {
    id: "aritmetica-d5",
    strandSlug: "aritmetica",
    difficulty: 5,
    label: "Multiplicación",
    emoji: "✖️",
    tier: 3,
    pisa: pisa("cantidad", "1b"),
    prerequisites: ["aritmetica-d3"],
    generateProblem: () => generateAritmetica(5),
    ConceptComponent: () => ArrayConcept({ mode: "mult" }),
    href: (childId) => `/jugar/${childId}/aritmetica/multiplicacion`,
  },
  {
    id: "aritmetica-d6",
    strandSlug: "aritmetica",
    difficulty: 6,
    label: "División",
    emoji: "➗",
    tier: 3,
    pisa: pisa("cantidad", "1b"),
    prerequisites: ["aritmetica-d5"],
    generateProblem: () => generateAritmetica(6),
    ConceptComponent: () => ArrayConcept({ mode: "div" }),
  },
  {
    id: "aritmetica-d7",
    strandSlug: "aritmetica",
    difficulty: 7,
    label: "Fracciones",
    emoji: "🍕",
    tier: 4,
    pisa: pisa("cantidad", "1a"),
    prerequisites: ["aritmetica-d6"],
    generateProblem: () => generateAritmetica(7),
    ConceptComponent: () => FractionBarConcept({ mode: "fraction" }),
  },
  {
    id: "aritmetica-mcd-mcm",
    strandSlug: "aritmetica",
    difficulty: 6,
    label: "MCD y MCM",
    emoji: "🔗",
    tier: 5,
    pisa: pisa("cantidad", "1a"),
    prerequisites: ["aritmetica-d6"],
    generateProblem: generateMcdMcmProblem,
    ConceptComponent: McdMcmConcept,
  },
  {
    id: "aritmetica-fracciones-2",
    strandSlug: "aritmetica",
    difficulty: 7,
    label: "Fracciones con distinto denominador",
    emoji: "🍕",
    tier: 5,
    pisa: pisa("cantidad", "1a"),
    prerequisites: ["aritmetica-d7", "aritmetica-mcd-mcm"],
    generateProblem: generateUnlikeFractionsProblem,
    ConceptComponent: FraccionesDistintoDenomConcept,
  },
  {
    id: "aritmetica-d8",
    strandSlug: "aritmetica",
    difficulty: 8,
    label: "Decimales",
    emoji: "🔟",
    tier: 5,
    pisa: pisa("cantidad", "1a"),
    // Los décimos se leen como fracciones de denominador 10, y las cuentas
    // llegan a 3 cifras: pide ambas cosas.
    prerequisites: ["aritmetica-d7", "aritmetica-d4"],
    generateProblem: () => generateAritmetica(8),
    ConceptComponent: () => FractionBarConcept({ mode: "decimal" }),
  },
  {
    id: "aritmetica-d9",
    strandSlug: "aritmetica",
    difficulty: 9,
    label: "Porcentajes",
    emoji: "💯",
    tier: 6,
    pisa: pisa("cantidad", "2"),
    prerequisites: ["aritmetica-d7", "aritmetica-d8"],
    generateProblem: () => generateAritmetica(9),
    ConceptComponent: () => FractionBarConcept({ mode: "percent" }),
  },
  {
    id: "aritmetica-d10",
    strandSlug: "aritmetica",
    difficulty: 10,
    label: "Números enteros",
    emoji: "🌡️",
    tier: 7,
    pisa: pisa("cantidad", "2"),
    // El generador también multiplica con negativos, no solo suma y resta.
    prerequisites: ["aritmetica-d4", "aritmetica-d5"],
    generateProblem: () => generateAritmetica(10),
    ConceptComponent: () => NumberLineConcept({ min: -20, max: 20 }),
  },

  // ── Álgebra (PISA: Cambio y relaciones) ────────────────────────────
  {
    id: "algebra-d1",
    strandSlug: "algebra",
    difficulty: 1,
    label: "Patrones",
    emoji: "🔁",
    tier: 0,
    pisa: pisa("cambio", "B"),
    prerequisites: [],
    generateProblem: () => generateAlgebra(1),
    ConceptComponent: PatternConcept,
  },
  {
    id: "algebra-d2",
    strandSlug: "algebra",
    difficulty: 2,
    label: "Balanza (igualdad)",
    emoji: "⚖️",
    tier: 1,
    pisa: pisa("cambio", "1c"),
    prerequisites: ["aritmetica-d2"],
    generateProblem: () => generateAlgebra(2),
    ConceptComponent: BalanceConcept,
  },
  {
    id: "algebra-d3",
    strandSlug: "algebra",
    difficulty: 3,
    label: "Ecuaciones simples",
    emoji: "🧩",
    tier: 3,
    pisa: pisa("cambio", "1b"),
    prerequisites: ["algebra-d2", "aritmetica-d3"],
    generateProblem: () => generateAlgebra(3),
    ConceptComponent: () => AlgebraConcept({ variant: "simple" }),
  },
  {
    id: "algebra-d4",
    strandSlug: "algebra",
    difficulty: 4,
    label: "Ecuaciones (× y −)",
    emoji: "🧩",
    tier: 4,
    pisa: pisa("cambio", "1a"),
    prerequisites: ["algebra-d3", "aritmetica-d6"],
    generateProblem: () => generateAlgebra(4),
    ConceptComponent: () => AlgebraConcept({ variant: "mult-sub" }),
  },
  {
    id: "algebra-d6",
    strandSlug: "algebra",
    difficulty: 6,
    label: "Evaluar expresiones",
    emoji: "🔡",
    tier: 6,
    pisa: pisa("cambio", "2"),
    prerequisites: ["algebra-d3", "aritmetica-d5"],
    generateProblem: () => generateAlgebra(6),
    ConceptComponent: () => AlgebraConcept({ variant: "evaluate" }),
  },
  {
    id: "algebra-d5",
    strandSlug: "algebra",
    difficulty: 5,
    label: "Proporciones",
    emoji: "🔀",
    tier: 7,
    pisa: pisa("cambio", "2"),
    prerequisites: ["aritmetica-d6", "algebra-d4"],
    generateProblem: () => generateAlgebra(5),
    ConceptComponent: () => AlgebraConcept({ variant: "proportion" }),
  },
  {
    id: "algebra-d7",
    strandSlug: "algebra",
    difficulty: 7,
    label: "Ecuaciones de dos pasos",
    emoji: "🧮",
    tier: 7,
    pisa: pisa("cambio", "2"),
    prerequisites: ["algebra-d4", "algebra-d6"],
    generateProblem: () => generateAlgebra(7),
    ConceptComponent: () => AlgebraConcept({ variant: "two-step" }),
  },
  {
    id: "algebra-d8",
    strandSlug: "algebra",
    difficulty: 8,
    label: "Inecuaciones",
    emoji: "📏",
    tier: 7,
    pisa: pisa("cambio", "2"),
    prerequisites: ["algebra-d7"],
    generateProblem: () => generateAlgebra(8),
    ConceptComponent: () => AlgebraConcept({ variant: "inequality" }),
  },
  {
    id: "algebra-d9",
    strandSlug: "algebra",
    difficulty: 9,
    label: "Funciones desde una tabla",
    emoji: "🎛️",
    tier: 8,
    pisa: pisa("cambio", "3"),
    prerequisites: ["algebra-d6"],
    generateProblem: () => generateAlgebra(9),
    ConceptComponent: () => AlgebraConcept({ variant: "function" }),
  },
  {
    id: "algebra-d10",
    strandSlug: "algebra",
    difficulty: 10,
    label: "Ecuaciones cuadráticas",
    emoji: "🌀",
    tier: 10,
    pisa: pisa("cambio", "5"),
    // Antes dependía de Pitágoras, al revés de lo que corresponde: es
    // Pitágoras el que necesita saber sacar raíces, no esto de aquello.
    prerequisites: ["algebra-d7"],
    generateProblem: () => generateAlgebra(10),
    ConceptComponent: () => AlgebraConcept({ variant: "quadratic" }),
  },

  // ── Geometría (PISA: Espacio y forma) ──────────────────────────────
  {
    id: "geometria-d1",
    strandSlug: "geometria",
    difficulty: 1,
    label: "Lados de figuras",
    emoji: "🔺",
    tier: 0,
    pisa: pisa("espacio", "B"),
    prerequisites: [],
    generateProblem: () => generateGeometria(1),
    ConceptComponent: () => ShapeConcept({ variant: "sides" }),
  },
  {
    id: "geometria-d2",
    strandSlug: "geometria",
    difficulty: 2,
    label: "Cuerpos geométricos",
    emoji: "🧊",
    tier: 1,
    pisa: pisa("espacio", "1c"),
    // Sin prerrequisitos a propósito: es objetivo de la misión 2 del mundo
    // (world/quests.ts) y no debe quedar bloqueado detrás de otra práctica.
    prerequisites: [],
    generateProblem: () => generateGeometria(2),
    ConceptComponent: () => SlidesConcept({ slides: CONCEPT_SLIDES["geometria-d2"] }),
  },
  {
    id: "geometria-d3",
    strandSlug: "geometria",
    difficulty: 3,
    label: "Perímetro",
    emoji: "📏",
    tier: 3,
    pisa: pisa("espacio", "1b"),
    // Los perímetros llegan a 80: hace falta sumar hasta 100.
    prerequisites: ["geometria-d1", "aritmetica-d3"],
    generateProblem: () => generateGeometria(3),
    ConceptComponent: () => ShapeConcept({ variant: "perimeter" }),
  },
  {
    id: "geometria-d4",
    strandSlug: "geometria",
    difficulty: 4,
    label: "Área de rectángulos",
    emoji: "📐",
    tier: 3,
    pisa: pisa("espacio", "1b"),
    prerequisites: ["geometria-d3", "aritmetica-d5"],
    generateProblem: () => generateGeometria(4),
    ConceptComponent: () => ShapeConcept({ variant: "area-rect" }),
  },
  {
    id: "geometria-d6",
    strandSlug: "geometria",
    difficulty: 6,
    label: "Ángulos",
    emoji: "📐",
    tier: 5,
    pisa: pisa("espacio", "1a"),
    // Complementar a 90° o 180° es restar con números de 3 cifras.
    prerequisites: ["geometria-d1", "aritmetica-d4"],
    generateProblem: () => generateGeometria(6),
    ConceptComponent: () => ShapeConcept({ variant: "angle" }),
  },
  {
    id: "geometria-d7",
    strandSlug: "geometria",
    difficulty: 7,
    label: "Volumen",
    emoji: "📦",
    tier: 5,
    pisa: pisa("espacio", "1a"),
    prerequisites: ["geometria-d4"],
    generateProblem: () => generateGeometria(7),
    ConceptComponent: () => ShapeConcept({ variant: "volume" }),
  },
  {
    id: "geometria-d5",
    strandSlug: "geometria",
    difficulty: 5,
    label: "Área de triángulos",
    emoji: "🔻",
    tier: 6,
    pisa: pisa("espacio", "2"),
    prerequisites: ["geometria-d4"],
    generateProblem: () => generateGeometria(5),
    ConceptComponent: () => ShapeConcept({ variant: "area-triangle" }),
  },
  {
    id: "geometria-d8",
    strandSlug: "geometria",
    difficulty: 8,
    label: "Coordenadas",
    emoji: "📍",
    tier: 7,
    pisa: pisa("espacio", "2"),
    prerequisites: ["aritmetica-d10"],
    generateProblem: () => generateGeometria(8),
    ConceptComponent: () => ShapeConcept({ variant: "coords" }),
  },
  {
    id: "geometria-d9",
    strandSlug: "geometria",
    difficulty: 9,
    label: "Teorema de Pitágoras",
    emoji: "📐",
    tier: 8,
    pisa: pisa("espacio", "3"),
    prerequisites: ["geometria-d5", "aritmetica-d5"],
    generateProblem: () => generateGeometria(9),
    ConceptComponent: () => ShapeConcept({ variant: "pythagoras" }),
  },
  {
    id: "geometria-d10",
    strandSlug: "geometria",
    difficulty: 10,
    label: "Figuras semejantes",
    emoji: "🔍",
    tier: 8,
    pisa: pisa("espacio", "3"),
    prerequisites: ["algebra-d5"],
    generateProblem: () => generateGeometria(10),
    ConceptComponent: () => ShapeConcept({ variant: "scale" }),
  },

  // ── Medición y datos (PISA: Cantidad d1–d4; Incertidumbre y datos el resto) ──
  {
    id: "medicion-d1",
    strandSlug: "medicion",
    difficulty: 1,
    label: "Comparar números",
    emoji: "⚖️",
    tier: 1,
    pisa: pisa("cantidad", "1c"),
    prerequisites: [],
    generateProblem: () => generateMedicion(1),
    ConceptComponent: () => NumberLineConcept({ min: 0, max: 20 }),
  },
  {
    id: "medicion-d2",
    strandSlug: "medicion",
    difficulty: 2,
    label: "Dinero",
    emoji: "💰",
    tier: 2,
    pisa: pisa("cantidad", "1c"),
    // Los totales llegan a 75: hace falta sumar hasta 100.
    prerequisites: ["aritmetica-d3"],
    generateProblem: () => generateMedicion(2),
    ConceptComponent: () => DataConcept({ variant: "money" }),
  },
  {
    id: "medicion-d3",
    strandSlug: "medicion",
    difficulty: 3,
    label: "Tiempo",
    emoji: "⏰",
    tier: 3,
    pisa: pisa("cantidad", "1b"),
    prerequisites: ["aritmetica-d3"],
    generateProblem: () => generateMedicion(3),
    ConceptComponent: () => DataConcept({ variant: "clock" }),
  },
  {
    id: "medicion-d4",
    strandSlug: "medicion",
    difficulty: 4,
    label: "Conversión de unidades",
    emoji: "📏",
    tier: 4,
    pisa: pisa("cantidad", "1a"),
    prerequisites: ["aritmetica-d5"],
    generateProblem: () => generateMedicion(4),
    ConceptComponent: () => DataConcept({ variant: "convert" }),
  },
  {
    id: "medicion-d7",
    strandSlug: "medicion",
    difficulty: 7,
    label: "Moda",
    emoji: "📊",
    tier: 4,
    pisa: pisa("datos", "1a"),
    // La moda solo pide contar repeticiones: no necesita dividir.
    prerequisites: ["aritmetica-d3"],
    generateProblem: () => generateMedicion(7),
    ConceptComponent: () => DataConcept({ variant: "stats" }),
  },
  {
    id: "medicion-d8",
    strandSlug: "medicion",
    difficulty: 8,
    label: "Rango",
    emoji: "📊",
    tier: 4,
    pisa: pisa("datos", "1a"),
    // El rango es una resta: no necesita dividir.
    prerequisites: ["aritmetica-d3"],
    generateProblem: () => generateMedicion(8),
    ConceptComponent: () => DataConcept({ variant: "stats" }),
  },
  {
    id: "medicion-d10",
    strandSlug: "medicion",
    difficulty: 10,
    label: "Conteo",
    emoji: "🧮",
    tier: 4,
    pisa: pisa("datos", "1a"),
    prerequisites: ["aritmetica-d5"],
    generateProblem: () => generateMedicion(10),
    ConceptComponent: () => DataConcept({ variant: "counting" }),
  },
  {
    id: "medicion-d6",
    strandSlug: "medicion",
    difficulty: 6,
    label: "Mediana",
    emoji: "📊",
    tier: 6,
    pisa: pisa("datos", "2"),
    // Ordenar los datos (comparar) y ya conocer el rango, que también los ordena.
    prerequisites: ["medicion-d8", "medicion-d1"],
    generateProblem: () => generateMedicion(6),
    ConceptComponent: () => DataConcept({ variant: "stats" }),
  },
  {
    id: "medicion-d5",
    strandSlug: "medicion",
    difficulty: 5,
    label: "Media (promedio)",
    emoji: "📊",
    tier: 6,
    pisa: pisa("datos", "2"),
    prerequisites: ["aritmetica-d6"],
    generateProblem: () => generateMedicion(5),
    ConceptComponent: () => DataConcept({ variant: "stats" }),
  },
  {
    id: "medicion-d9",
    strandSlug: "medicion",
    difficulty: 9,
    label: "Probabilidad",
    emoji: "🎲",
    tier: 7,
    pisa: pisa("datos", "2"),
    // La respuesta se da en porcentaje, y contar casos es la base.
    prerequisites: ["aritmetica-d9", "medicion-d10"],
    generateProblem: () => generateMedicion(9),
    ConceptComponent: () => DataConcept({ variant: "probability" }),
  },

  // ── Lógica: resolución de problemas (PISA: Cantidad salvo que se indique) ──
  {
    id: "logica-d1",
    strandSlug: "logica",
    difficulty: 1,
    label: "Problemas de suma",
    emoji: "🍎",
    tier: 1,
    pisa: pisa("cantidad", "1c"),
    prerequisites: ["aritmetica-d1"],
    generateProblem: () => generateLogica(1),
    ConceptComponent: () => WordProblemConcept({ strandSlug: "logica", difficulty: 1 }),
  },
  {
    id: "logica-d2",
    strandSlug: "logica",
    difficulty: 2,
    label: "Problemas de resta",
    emoji: "🎈",
    tier: 1,
    pisa: pisa("cantidad", "1c"),
    prerequisites: ["aritmetica-d2", "logica-d1"],
    generateProblem: () => generateLogica(2),
    ConceptComponent: () => WordProblemConcept({ strandSlug: "logica", difficulty: 2 }),
  },
  {
    id: "logica-d4",
    strandSlug: "logica",
    difficulty: 4,
    label: "Problemas de dos pasos",
    emoji: "👫",
    tier: 2,
    pisa: pisa("cantidad", "1c"),
    prerequisites: ["aritmetica-d3", "logica-d2"],
    generateProblem: () => generateLogica(4),
    ConceptComponent: () => WordProblemConcept({ strandSlug: "logica", difficulty: 4 }),
  },
  {
    id: "logica-d3",
    strandSlug: "logica",
    difficulty: 3,
    label: "Problemas de división",
    emoji: "🍪",
    tier: 3,
    pisa: pisa("cantidad", "1b"),
    // "Repartir en partes iguales" se puede razonar con multiplicación de
    // prueba, sin necesitar el símbolo ÷ todavía — por eso exige
    // aritmetica-d5 y no aritmetica-d6, para introducir la idea de división
    // en palabras antes de formalizarla.
    prerequisites: ["aritmetica-d5"],
    generateProblem: () => generateLogica(3),
    ConceptComponent: () => WordProblemConcept({ strandSlug: "logica", difficulty: 3 }),
  },
  {
    id: "logica-d5",
    strandSlug: "logica",
    difficulty: 5,
    label: "Problemas combinados",
    emoji: "✏️",
    tier: 3,
    pisa: pisa("cantidad", "1b"),
    prerequisites: ["logica-d3", "logica-d4"],
    generateProblem: () => generateLogica(5),
    ConceptComponent: () => WordProblemConcept({ strandSlug: "logica", difficulty: 5 }),
  },
  {
    id: "logica-d8",
    strandSlug: "logica",
    difficulty: 8,
    label: "Redondeo y estimación",
    emoji: "🎯",
    tier: 3,
    pisa: pisa("cantidad", "1b"),
    prerequisites: ["aritmetica-d4"],
    generateProblem: () => generateLogica(8),
    ConceptComponent: () => WordProblemConcept({ strandSlug: "logica", difficulty: 8 }),
  },
  {
    id: "logica-d6",
    strandSlug: "logica",
    difficulty: 6,
    label: "Datos que sobran",
    emoji: "🔍",
    tier: 4,
    pisa: pisa("cantidad", "1a"),
    prerequisites: ["logica-d5"],
    generateProblem: () => generateLogica(6),
    ConceptComponent: () => WordProblemConcept({ strandSlug: "logica", difficulty: 6 }),
  },
  {
    id: "logica-d7",
    strandSlug: "logica",
    difficulty: 7,
    label: "Presupuesto",
    emoji: "💵",
    tier: 4,
    pisa: pisa("cantidad", "1a"),
    prerequisites: ["medicion-d2", "logica-d6"],
    generateProblem: () => generateLogica(7),
    ConceptComponent: () => WordProblemConcept({ strandSlug: "logica", difficulty: 7 }),
  },
  {
    id: "logica-d9",
    strandSlug: "logica",
    difficulty: 9,
    label: "Pensar hacia atrás",
    emoji: "🤔",
    tier: 5,
    pisa: pisa("cambio", "1a"),
    prerequisites: ["algebra-d4", "aritmetica-d6"],
    generateProblem: () => generateLogica(9),
    ConceptComponent: () => WordProblemConcept({ strandSlug: "logica", difficulty: 9 }),
  },
  {
    id: "logica-d10",
    strandSlug: "logica",
    difficulty: 10,
    label: "Optimización",
    emoji: "🎈",
    tier: 5,
    // Varios pasos en contexto: un nivel por encima de su grado.
    pisa: pisa("cantidad", "2"),
    prerequisites: ["logica-d7", "aritmetica-d6"],
    generateProblem: () => generateLogica(10),
    ConceptComponent: () => WordProblemConcept({ strandSlug: "logica", difficulty: 10 }),
  },
];

const MODULES_BY_ID = new Map(MODULES.map((m) => [m.id, m]));

/** Reexportado para que los consumidores del catálogo completo (Level
 *  Editor, panel familiar) no necesiten conocer `curriculum/customRegistry`. */
export { allModules } from "./curriculum/customRegistry";

/** Cae al registro de módulos personalizados (Fase 20,
 *  docs/level-editor-plan-v2.md §7.1) cuando `id` no es uno de los
 *  módulos de código — nunca al revés, así un `cst-*` nunca puede pisar un
 *  módulo de código con el mismo id. */
export function getModule(id: string): ModuleDef | undefined {
  return MODULES_BY_ID.get(id) ?? getCustomModule(id);
}

/** Ruta de un módulo: la propia si la tiene (p. ej. la tabla de multiplicar), si no la genérica. */
export function moduleHref(childId: string, mod: ModuleDef): string {
  return mod.href ? mod.href(childId) : `/jugar/${childId}/${mod.strandSlug}/${mod.id}`;
}

/** Módulos de un hilo, en orden de grado (y de dificultad dentro del grado). */
export function modulesForStrand(strandSlug: string): ModuleDef[] {
  return allModules()
    .filter((m) => m.strandSlug === strandSlug)
    .sort((a, b) => a.tier - b.tier || a.difficulty - b.difficulty);
}

export function isMastered(
  progressBySkill: Record<string, SkillProgress>,
  moduleId: string,
): boolean {
  return Boolean(progressBySkill[moduleId]?.masteredAt);
}

/**
 * Prerrequisitos que cuentan como cumplidos: los módulos dominados más todo
 * su cierre transitivo de prerrequisitos. Quien domina un módulo ya demostró
 * lo que ese módulo exige, aunque no lo haya practicado por separado —
 * porque la evaluación lo ubicó más arriba, o porque la currícula le agregó
 * un prerrequisito nuevo después de que lo dominara. Sin esto, cada tema
 * insertado en la currícula volvería a bloquear avances ya ganados.
 */
function satisfiedIds(progressBySkill: Record<string, SkillProgress>): Set<string> {
  const satisfied = new Set<string>();
  const pending = Object.keys(progressBySkill).filter((id) => isMastered(progressBySkill, id));
  while (pending.length > 0) {
    const id = pending.pop()!;
    if (satisfied.has(id)) continue;
    satisfied.add(id);
    const mod = getModule(id);
    if (mod) pending.push(...mod.prerequisites);
  }
  return satisfied;
}

/**
 * Desbloqueado = todos los prerrequisitos están cumplidos (ver
 * `satisfiedIds`); sin prerrequisitos, siempre desbloqueado. Un módulo que
 * ya tiene progreso guardado sigue desbloqueado aunque la currícula le haya
 * sumado un prerrequisito después: nunca se le quita a un niño algo que ya
 * estaba practicando.
 */
export function isUnlocked(
  progressBySkill: Record<string, SkillProgress>,
  moduleId: string,
): boolean {
  const mod = getModule(moduleId);
  if (!mod) return false;
  if (progressBySkill[moduleId]) return true;
  const satisfied = satisfiedIds(progressBySkill);
  return mod.prerequisites.every((p) => satisfied.has(p));
}

export function missingPrerequisites(
  progressBySkill: Record<string, SkillProgress>,
  moduleId: string,
): ModuleDef[] {
  const mod = getModule(moduleId);
  if (!mod || isUnlocked(progressBySkill, moduleId)) return [];
  const satisfied = satisfiedIds(progressBySkill);
  return mod.prerequisites
    .filter((p) => !satisfied.has(p))
    .map((p) => getModule(p))
    .filter((m): m is ModuleDef => m !== undefined);
}

/** Primer módulo del hilo que está desbloqueado y todavía no se domina — reemplaza a frontierDifficulty. */
export function recommendedModule(
  progressBySkill: Record<string, SkillProgress>,
  strandSlug: string,
): ModuleDef | null {
  const modules = modulesForStrand(strandSlug);
  return (
    modules.find((m) => isUnlocked(progressBySkill, m.id) && !isMastered(progressBySkill, m.id)) ??
    null
  );
}

export function countUnlocked(
  progressBySkill: Record<string, SkillProgress>,
  strandSlug: string,
): { unlocked: number; total: number } {
  const modules = modulesForStrand(strandSlug);
  const unlocked = modules.filter((m) => isUnlocked(progressBySkill, m.id)).length;
  return { unlocked, total: modules.length };
}

export function masteredCountForStrand(
  progressBySkill: Record<string, SkillProgress>,
  strandSlug: string,
): { mastered: number; total: number } {
  const modules = modulesForStrand(strandSlug);
  const mastered = modules.filter((m) => isMastered(progressBySkill, m.id)).length;
  return { mastered, total: modules.length };
}

/**
 * "Tu próximo desafío": el mismo criterio que `recommendedModule` (nunca
 * bloqueado, nunca ya dominado), pero mirando todos los hilos a la vez.
 * Si se pasa `preferredStrand`, se prioriza el recomendado de ese hilo;
 * si no hay ninguno ahí (o no se pasó), se elige entre los recomendados de
 * cada hilo el de menor grado, y ante empate el que aparece primero en
 * `STRANDS`.
 */
export function nextChallenge(
  progressBySkill: Record<string, SkillProgress>,
  preferredStrand?: string,
): ModuleDef | null {
  if (preferredStrand) {
    const preferred = recommendedModule(progressBySkill, preferredStrand);
    if (preferred) return preferred;
  }

  let best: ModuleDef | null = null;
  for (const strand of STRANDS) {
    const candidate = recommendedModule(progressBySkill, strand.slug);
    if (candidate && (!best || candidate.tier < best.tier)) {
      best = candidate;
    }
  }
  return best;
}

/**
 * El módulo dominado con el repaso más vencido, o `null` si ninguno tiene
 * uno pendiente — Fase 27 (docs/plan-salto-producto.md §5.5/§5.6). A
 * propósito devuelve UNO, nunca una lista: un niño que dominó 20 módulos y
 * dejó la app dos semanas no debe volver a una cola de repasos pendientes,
 * eso desmotiva más de lo que ayuda. `nextChallenge` no se toca — este es
 * un hermano, no un reemplazo, para no arrastrar su semántica a `WorldHud`/
 * `boss/page.tsx`/`evaluacion/page.tsx`.
 */
export function nextReview(progressBySkill: Record<string, SkillProgress>, now: number = Date.now()): ModuleDef | null {
  let best: { mod: ModuleDef; dueAt: number } | null = null;
  for (const [moduleId, progress] of Object.entries(progressBySkill)) {
    if (!isReviewDue(progress, now)) continue;
    const dueAt = reviewDueAt(progress);
    const mod = getModule(moduleId);
    if (dueAt === null || !mod) continue;
    if (!best || dueAt < best.dueAt) best = { mod, dueAt };
  }
  return best?.mod ?? null;
}
