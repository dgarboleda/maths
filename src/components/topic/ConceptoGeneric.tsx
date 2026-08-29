"use client";

import { NumberLineConcept } from "./concepts/NumberLineConcept";
import { ArrayConcept } from "./concepts/ArrayConcept";
import { FractionBarConcept } from "./concepts/FractionBarConcept";
import { PatternConcept } from "./concepts/PatternConcept";
import { BalanceConcept } from "./concepts/BalanceConcept";
import { ShapeConcept, type ShapeVariant } from "./concepts/ShapeConcept";
import { DataConcept, type DataVariant } from "./concepts/DataConcept";
import { WordProblemConcept } from "./concepts/WordProblemConcept";

const GEOMETRIA_VARIANTS: Record<number, ShapeVariant> = {
  1: "sides",
  2: "sides",
  3: "perimeter",
  4: "area-rect",
  5: "area-triangle",
  6: "angle",
  7: "volume",
  8: "coords",
  9: "pythagoras",
  10: "scale",
};

const MEDICION_VARIANTS: Record<number, DataVariant> = {
  2: "money",
  3: "clock",
  4: "convert",
  5: "stats",
  6: "stats",
  7: "stats",
  8: "stats",
  9: "probability",
  10: "counting",
};

export function ConceptoGeneric({ strandSlug, difficulty }: { strandSlug: string; difficulty: number }) {
  if (strandSlug === "aritmetica") {
    if (difficulty === 1) return <NumberLineConcept min={0} max={5} />;
    if (difficulty === 2) return <NumberLineConcept min={0} max={10} />;
    if (difficulty === 3) return <NumberLineConcept min={0} max={100} />;
    if (difficulty === 4) return <NumberLineConcept min={0} max={999} />;
    if (difficulty === 5) return <ArrayConcept mode="mult" />;
    if (difficulty === 6) return <ArrayConcept mode="div" />;
    if (difficulty === 7) return <FractionBarConcept mode="fraction" />;
    if (difficulty === 8) return <FractionBarConcept mode="decimal" />;
    if (difficulty === 9) return <FractionBarConcept mode="percent" />;
    return <NumberLineConcept min={-20} max={20} />;
  }

  if (strandSlug === "algebra") {
    if (difficulty === 1) return <PatternConcept />;
    return <BalanceConcept />;
  }

  if (strandSlug === "geometria") {
    return <ShapeConcept variant={GEOMETRIA_VARIANTS[difficulty] ?? "sides"} />;
  }

  if (strandSlug === "medicion") {
    if (difficulty === 1) return <NumberLineConcept min={0} max={20} />;
    return <DataConcept variant={MEDICION_VARIANTS[difficulty] ?? "stats"} />;
  }

  return <WordProblemConcept strandSlug={strandSlug} difficulty={difficulty} />;
}
