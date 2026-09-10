/**
 * Validación de un `CustomModuleDoc` — Fase 20 (docs/level-editor-plan-v2.md
 * §7.2/§7.4). Mismas convenciones que `validateLevel`/`validateWorld`:
 * devuelve una lista de problemas, nunca lanza. La usan tanto el guardado
 * (`curriculumRepository`) como el editor en vivo (Fase 21) para mostrar
 * errores mientras el padre escribe.
 */
import { getStrand } from "@/lib/strands";
import { allModules } from "./customRegistry";
import { parseExpr } from "./expr";
import type { CustomModuleDoc, GeneratorSpec } from "./customSchema";
import { getConceptTemplate } from "./conceptCatalog";

export interface CustomModuleIssue {
  severity: "error" | "warning";
  message: string;
  field?: string;
}

const ID_RE = /^cst-[a-z0-9-]+$/;
const VAR_NAME_RE = /^[a-z][a-z0-9]*$/;

function checkExpr(src: string, field: string, label: string): CustomModuleIssue[] {
  if (!src.trim()) return [{ severity: "error", message: `${label}: no puede estar vacío.`, field }];
  const result = parseExpr(src);
  if ("error" in result) {
    return [{ severity: "error", message: `${label}: ${result.error} (columna ${result.position + 1}).`, field }];
  }
  return [];
}

function checkGeneratorBase(
  spec: { variables: { name: string; min: number; max: number; choices?: number[] }[]; constraints: { expr: string }[]; promptTemplate: string; answerExpr: string; hintTemplates: [string, string, string] },
  field: string,
): CustomModuleIssue[] {
  const issues: CustomModuleIssue[] = [];
  const seen = new Set<string>();
  for (const v of spec.variables) {
    if (!VAR_NAME_RE.test(v.name)) {
      issues.push({ severity: "error", message: `Variable "${v.name}" inválida: debe empezar con minúscula y usar solo letras/números.`, field });
    }
    if (seen.has(v.name)) issues.push({ severity: "error", message: `Variable "${v.name}" repetida.`, field });
    seen.add(v.name);
    if (!v.choices && v.min > v.max) {
      issues.push({ severity: "error", message: `Variable "${v.name}": el mínimo (${v.min}) es mayor que el máximo (${v.max}).`, field });
    }
  }
  for (const c of spec.constraints) issues.push(...checkExpr(c.expr, field, `Restricción "${c.expr || "(vacía)"}"`));
  issues.push(...checkExpr(spec.answerExpr, field, "Fórmula de respuesta"));
  if (!spec.promptTemplate.trim()) issues.push({ severity: "error", message: "El enunciado no puede estar vacío.", field });
  return issues;
}

function checkGenerator(spec: GeneratorSpec, field = "generator"): CustomModuleIssue[] {
  switch (spec.kind) {
    case "arithmetic":
    case "numberLine":
      return [
        ...checkGeneratorBase(spec, field),
        ...(spec.kind === "numberLine"
          ? [...checkExpr(spec.lineMinExpr, field, "Recta: mínimo"), ...checkExpr(spec.lineMaxExpr, field, "Recta: máximo"), ...checkExpr(spec.startExpr, field, "Recta: valor inicial")]
          : []),
      ];
    case "choice": {
      const issues = checkGeneratorBase(spec, field);
      if (spec.distractors.mode === "expr") {
        for (const e of spec.distractors.exprs) issues.push(...checkExpr(e, field, `Distractor "${e || "(vacío)"}"`));
      } else if (spec.distractors.mode === "labels") {
        if (spec.distractors.options.length < 2) {
          issues.push({ severity: "error", message: "Opción múltiple con etiquetas necesita al menos 2 opciones.", field });
        }
        for (const o of spec.distractors.options) issues.push(...checkExpr(o.valueExpr, field, `Valor de "${o.label || "(sin etiqueta)"}"`));
      }
      return issues;
    }
    case "table": {
      const issues: CustomModuleIssue[] = [];
      if (spec.rows.length === 0) issues.push({ severity: "error", message: "El banco de preguntas está vacío.", field });
      for (const row of spec.rows) {
        if (!row.prompt.trim()) issues.push({ severity: "error", message: `Fila "${row.id}": el enunciado no puede estar vacío.`, field });
        if (row.inputType === "choice" && (!row.choices || row.choices.length < 2)) {
          issues.push({ severity: "error", message: `Fila "${row.id}": opción múltiple necesita al menos 2 opciones.`, field });
        }
      }
      return issues;
    }
    case "variants": {
      const issues: CustomModuleIssue[] = [];
      if (spec.variants.length === 0) issues.push({ severity: "error", message: "La mezcla de variantes está vacía.", field });
      if (spec.variants.every((v) => v.weight <= 0)) issues.push({ severity: "error", message: "Todas las variantes tienen peso 0 — ninguna se sortearía nunca.", field });
      for (const v of spec.variants) issues.push(...checkGenerator(v.spec, field));
      return issues;
    }
    case "builtin": {
      if (!getStrand(spec.strandSlug)) return [{ severity: "error", message: `"${spec.strandSlug}" no es un hilo válido.`, field }];
      if (spec.difficulty < 1 || spec.difficulty > 10) return [{ severity: "error", message: "La dificultad del generador base debe estar entre 1 y 10.", field }];
      return [];
    }
  }
}

export function validateCustomModule(doc: CustomModuleDoc, existingIds: string[]): CustomModuleIssue[] {
  const issues: CustomModuleIssue[] = [];

  if (!ID_RE.test(doc.id)) {
    issues.push({ severity: "error", message: `El id "${doc.id}" debe empezar con "cst-" y usar solo minúsculas, números y guiones.`, field: "id" });
  }
  if (existingIds.filter((id) => id === doc.id).length > 1) {
    issues.push({ severity: "error", message: `Ya existe otro módulo con el id "${doc.id}".`, field: "id" });
  }
  if (!doc.label.trim()) issues.push({ severity: "error", message: "El nombre no puede estar vacío.", field: "label" });
  if (!getStrand(doc.strandSlug)) issues.push({ severity: "error", message: `"${doc.strandSlug}" no es un hilo válido.`, field: "strandSlug" });
  if (doc.difficulty < 1 || doc.difficulty > 10) issues.push({ severity: "error", message: "La dificultad debe estar entre 1 y 10.", field: "difficulty" });
  if (doc.tier < 0) issues.push({ severity: "error", message: "La franja (tier) no puede ser negativa.", field: "tier" });

  if (doc.prerequisites.includes(doc.id)) {
    issues.push({ severity: "error", message: "Un módulo no puede ser prerrequisito de sí mismo.", field: "prerequisites" });
  }
  const known = new Set(allModules().map((m) => m.id));
  for (const p of doc.prerequisites) {
    if (p !== doc.id && !known.has(p)) {
      issues.push({ severity: "warning", message: `El prerrequisito "${p}" no existe (¿se borró?).`, field: "prerequisites" });
    }
  }

  issues.push(...checkGenerator(doc.generator));

  if (!getConceptTemplate(doc.concept.templateId)) {
    issues.push({ severity: "error", message: `"${doc.concept.templateId}" no es una plantilla de concepto conocida.`, field: "concept" });
  }

  for (const ex of doc.examples) {
    if (!ex.prompt.trim()) issues.push({ severity: "warning", message: "Hay un ejemplo sin enunciado.", field: "examples" });
    if (ex.steps.length === 0) issues.push({ severity: "warning", message: `El ejemplo "${ex.prompt || ex.id}" no tiene pasos.`, field: "examples" });
  }

  return issues;
}
