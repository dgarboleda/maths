/**
 * Catálogo de plantillas de concepto — Fase 21 (docs/level-editor-plan-v2.md
 * §8.1). 11 entradas, una por cada `*Concept.tsx` existente (envueltas con
 * sus props reales, sin tocarlas) más `slides`, la única genuinamente
 * data-driven — la que hace posible explicar un concepto propio sin
 * escribir código.
 *
 * `params` son los MISMOS `PropertyFieldDef` del Level Editor
 * (`src/lib/level/entities/registry.ts`): el editor de currícula no
 * necesita ni un componente de campo nuevo, y hereda los tooltips de la
 * Fase 15 gratis.
 */
import type { ComponentType } from "react";
import type { PropertyFieldDef } from "@/lib/level/entities";
import type { PropertyValue } from "@/lib/level/schema";
import type { ConceptSpec } from "./customSchema";

export type { ConceptSpec };
import { STRANDS } from "@/lib/strands";
import { NumberLineConcept } from "@/components/topic/concepts/NumberLineConcept";
import { ArrayConcept } from "@/components/topic/concepts/ArrayConcept";
import { FractionBarConcept } from "@/components/topic/concepts/FractionBarConcept";
import { PatternConcept } from "@/components/topic/concepts/PatternConcept";
import { BalanceConcept } from "@/components/topic/concepts/BalanceConcept";
import { AlgebraConcept, type AlgebraVariant } from "@/components/topic/concepts/AlgebraConcept";
import { ShapeConcept, type ShapeVariant } from "@/components/topic/concepts/ShapeConcept";
import { DataConcept, type DataVariant } from "@/components/topic/concepts/DataConcept";
import { WordProblemConcept } from "@/components/topic/concepts/WordProblemConcept";
import { McdMcmConcept } from "@/components/topic/concepts/McdMcmConcept";
import { FraccionesDistintoDenomConcept } from "@/components/topic/concepts/FraccionesDistintoDenomConcept";
import { SlidesConcept, type ConceptSlide } from "@/components/topic/concepts/SlidesConcept";

export interface ConceptTemplateDef {
  id: string;
  label: string;
  params: PropertyFieldDef[];
  build: (params: Record<string, PropertyValue>) => ComponentType;
}

function str(params: Record<string, PropertyValue>, key: string, fallback: string): string {
  const v = params[key];
  return typeof v === "string" ? v : fallback;
}
function num(params: Record<string, PropertyValue>, key: string, fallback: number): number {
  const v = params[key];
  return typeof v === "number" ? v : fallback;
}

const shapeOptions = (["sides", "perimeter", "area-rect", "area-triangle", "angle", "volume", "coords", "pythagoras", "scale"] as ShapeVariant[]).map(
  (v) => ({ value: v, label: v }),
);
const dataOptions = (["money", "clock", "convert", "stats", "probability", "counting"] as DataVariant[]).map((v) => ({
  value: v,
  label: v,
}));
const algebraOptions = (["simple", "mult-sub", "proportion", "evaluate", "two-step", "inequality", "function", "quadratic"] as AlgebraVariant[]).map(
  (v) => ({ value: v, label: v }),
);
const strandOptions = STRANDS.map((s) => ({ value: s.slug, label: s.label }));

/** Parsea `slidesJson` de forma tolerante: nunca lanza — un JSON inválido
 *  (a medio escribir mientras el padre edita) se ve como "sin láminas". */
function parseSlides(json: string): ConceptSlide[] {
  try {
    const parsed = JSON.parse(json);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((s): s is Record<string, unknown> => typeof s === "object" && s !== null)
      .map((s) => ({
        title: typeof s.title === "string" ? s.title : "",
        text: typeof s.text === "string" ? s.text : "",
        imageSrc: typeof s.imageSrc === "string" && s.imageSrc ? s.imageSrc : undefined,
      }));
  } catch {
    return [];
  }
}

export const CONCEPT_TEMPLATES: ConceptTemplateDef[] = [
  {
    id: "numberLine",
    label: "Recta numérica",
    params: [
      { key: "min", label: "Mínimo", kind: "number", default: 0 },
      { key: "max", label: "Máximo", kind: "number", default: 10 },
    ],
    build: (p) => () => NumberLineConcept({ min: num(p, "min", 0), max: num(p, "max", 10) }),
  },
  {
    id: "array",
    label: "Grupos (multiplicación/división)",
    params: [
      {
        key: "mode",
        label: "Modo",
        kind: "select",
        default: "mult",
        options: [
          { value: "mult", label: "Multiplicación" },
          { value: "div", label: "División" },
        ],
      },
    ],
    build: (p) => () => ArrayConcept({ mode: str(p, "mode", "mult") as "mult" | "div" }),
  },
  {
    id: "fractionBar",
    label: "Barra de fracciones",
    params: [
      {
        key: "mode",
        label: "Modo",
        kind: "select",
        default: "fraction",
        options: [
          { value: "fraction", label: "Fracción" },
          { value: "decimal", label: "Decimal" },
          { value: "percent", label: "Porcentaje" },
        ],
      },
    ],
    build: (p) => () => FractionBarConcept({ mode: str(p, "mode", "fraction") as "fraction" | "decimal" | "percent" }),
  },
  {
    id: "pattern",
    label: "Patrones",
    params: [],
    build: () => PatternConcept,
  },
  {
    id: "balance",
    label: "Balanza (igualdad)",
    params: [],
    build: () => BalanceConcept,
  },
  {
    id: "algebra",
    label: "Álgebra",
    params: [{ key: "variant", label: "Variante", kind: "select", default: "simple", options: algebraOptions }],
    build: (p) => () => AlgebraConcept({ variant: str(p, "variant", "simple") as AlgebraVariant }),
  },
  {
    id: "shape",
    label: "Geometría",
    params: [{ key: "variant", label: "Variante", kind: "select", default: "sides", options: shapeOptions }],
    build: (p) => () => ShapeConcept({ variant: str(p, "variant", "sides") as ShapeVariant }),
  },
  {
    id: "data",
    label: "Datos y medición",
    params: [{ key: "variant", label: "Variante", kind: "select", default: "money", options: dataOptions }],
    build: (p) => () => DataConcept({ variant: str(p, "variant", "money") as DataVariant }),
  },
  {
    id: "wordProblem",
    label: "Problema con palabras",
    params: [
      { key: "strandSlug", label: "Hilo", kind: "select", default: STRANDS[0].slug, options: strandOptions },
      { key: "difficulty", label: "Dificultad (1-10)", kind: "number", default: 1, min: 1, max: 10, step: 1 },
    ],
    build: (p) => () => WordProblemConcept({ strandSlug: str(p, "strandSlug", STRANDS[0].slug), difficulty: num(p, "difficulty", 1) }),
  },
  {
    id: "mcdMcm",
    label: "MCD y MCM",
    params: [],
    build: () => McdMcmConcept,
  },
  {
    id: "fraccionesDistintoDenom",
    label: "Fracciones con distinto denominador",
    params: [],
    build: () => FraccionesDistintoDenomConcept,
  },
  {
    id: "slides",
    label: "Láminas (texto + imagen)",
    // El contenido real (título/texto/imagen por lámina) se edita con una UI
    // dedicada en el editor de currícula, no con `PropertyField` genérico —
    // no hay forma de expresar una lista de objetos como `PropertyValue`.
    // Se persiste serializado en un único campo de texto.
    params: [{ key: "slidesJson", label: "Láminas (JSON)", kind: "text", default: "[]" }],
    build: (p) => () => SlidesConcept({ slides: parseSlides(str(p, "slidesJson", "[]")) }),
  },
];

const BY_ID = new Map(CONCEPT_TEMPLATES.map((t) => [t.id, t]));

export function getConceptTemplate(id: string): ConceptTemplateDef | undefined {
  return BY_ID.get(id);
}

/** `ConceptSpec` → el `ComponentType` que va en `ModuleDef.ConceptComponent`.
 *  `templateId` desconocido (dato corrupto, o plantilla borrada) cae a un
 *  componente que lo avisa en vez de romper el render. */
export function buildConcept(spec: ConceptSpec): ComponentType {
  const template = getConceptTemplate(spec.templateId);
  if (!template) {
    return function ConceptoDesconocido() {
      return null;
    };
  }
  return template.build(spec.params);
}
