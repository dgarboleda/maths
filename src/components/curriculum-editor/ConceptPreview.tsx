"use client";

import type { ReactNode } from "react";
import { getConceptTemplate, type ConceptSpec } from "@/lib/curriculum/conceptCatalog";

/**
 * Vista previa en vivo de un `ConceptSpec` en edición — Fase 21
 * (docs/level-editor-plan-v2.md §8.3-3).
 *
 * A diferencia de `ModuleDef.ConceptComponent` (que sí puede ser un
 * `ComponentType` recién armado, porque `compileModule` lo arma UNA vez por
 * módulo dentro de un efecto — no durante el render de nadie), acá el
 * `spec` cambia en cada tecla que escribe el padre. Armar un componente
 * nuevo en cada render y montarlo con `<Componente/>` reiniciaría su
 * estado interno todo el tiempo (y las reglas de hooks lo prohíben
 * directamente). Por eso este componente es **estático** — declarado una
 * sola vez acá — y en su cuerpo solo hace llamadas de función simples
 * (`template.build(params)()`), exactamente el mismo patrón ya usado en
 * `curriculum.ts` (`ConceptComponent: () => NumberLineConcept({...})`),
 * con un nivel menos de indirección.
 */
export function ConceptPreview({ spec }: { spec: ConceptSpec }) {
  const template = getConceptTemplate(spec.templateId);
  if (!template) return null;
  // Todas las entradas de CONCEPT_TEMPLATES arman `build` como una función
  // simple (nunca una clase) — el tipo `ComponentType` es más amplio de lo
  // necesario acá porque es el mismo que exige `ModuleDef.ConceptComponent`.
  const render = template.build(spec.params) as () => ReactNode;
  return render();
}
