import { STRANDS } from "@/lib/strands";
import { CUSTOM_MODULE_SCHEMA_VERSION, type ArithmeticGeneratorSpec, type CustomModuleDoc } from "./customSchema";

/** Slug estable a partir del nombre — Fase 21 (docs/level-editor-plan-v2.md
 *  §8.3): "Restas hasta 20" → "cst-restas-hasta-20". Nunca vacío. */
export function slugForLabel(label: string): string {
  const base = label
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `cst-${base || "modulo"}`;
}

const DEFAULT_GENERATOR: ArithmeticGeneratorSpec = {
  kind: "arithmetic",
  variables: [
    { name: "a", min: 1, max: 10, step: 1 },
    { name: "b", min: 1, max: 10, step: 1 },
  ],
  constraints: [],
  promptTemplate: "¿Cuánto es {a} + {b}?",
  flavor: "",
  answerExpr: "a + b",
  inputType: "integer",
  hintTemplates: ["Piensa en juntar dos grupos.", "Empieza en {a} y sigue contando {b} más.", "{a} + {b} = {answer}"],
  problemKind: "personalizado",
};

/** Módulo vacío listo para editar — se crea como borrador
 *  (`published: false`), no aparece en `ChallengePicker` hasta publicarlo. */
export function createEmptyCustomModule(authorUid: string, id: string): CustomModuleDoc {
  const now = Date.now();
  return {
    id,
    schemaVersion: CUSTOM_MODULE_SCHEMA_VERSION,
    strandSlug: STRANDS[0].slug,
    label: "Módulo nuevo",
    emoji: "✨",
    difficulty: 1,
    tier: 0,
    prerequisites: [],
    generator: { ...DEFAULT_GENERATOR, problemKind: id },
    concept: { templateId: "slides", params: { slidesJson: "[]" } },
    examples: [],
    published: false,
    metadata: { authorUid, createdAt: now, updatedAt: now },
  };
}
