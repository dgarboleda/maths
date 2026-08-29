import type { Problem } from "./problem";
import { generateProblem as generateAritmetica } from "./arithmetic";
import { generateProblem as generateAlgebra } from "./algebra";
import { generateProblem as generateGeometria } from "./geometria";
import { generateProblem as generateMedicion } from "./medicion";
import { generateProblem as generateLogica } from "./logica";

export interface StrandDef {
  slug: string;
  label: string;
  emoji: string;
  generateProblem: (difficulty: number) => Problem;
}

export const STRANDS: StrandDef[] = [
  { slug: "aritmetica", label: "Aritmética", emoji: "🔢", generateProblem: generateAritmetica },
  { slug: "algebra", label: "Álgebra", emoji: "⚖️", generateProblem: generateAlgebra },
  { slug: "geometria", label: "Geometría", emoji: "📐", generateProblem: generateGeometria },
  { slug: "medicion", label: "Medición y datos", emoji: "📊", generateProblem: generateMedicion },
  { slug: "logica", label: "Lógica", emoji: "🤔", generateProblem: generateLogica },
];

export function getStrand(slug: string): StrandDef | undefined {
  return STRANDS.find((s) => s.slug === slug);
}
