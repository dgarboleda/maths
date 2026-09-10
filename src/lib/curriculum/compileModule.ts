/**
 * `compileModule(doc): ModuleDef` — la única función que convierte un
 * `CustomModuleDoc` (dato de Firestore) en el mismo tipo `ModuleDef` que ya
 * usan los ~52 módulos de código (`curriculum.ts`) — Fase 20
 * (docs/level-editor-plan-v2.md §7.4). Es el punto de contacto exacto que
 * hace que el resto del sistema (29 consumidores de `getModule`) no
 * necesite saber que este módulo vino de un editor y no de código.
 */
import type { ModuleDef } from "@/lib/curriculum";
import { compileGenerator } from "./generatorTemplates";
import { buildConcept } from "./conceptCatalog";
import type { CustomModuleDoc } from "./customSchema";

export function compileModule(doc: CustomModuleDoc): ModuleDef {
  const generate = compileGenerator(doc.generator);
  return {
    id: doc.id,
    strandSlug: doc.strandSlug,
    difficulty: doc.difficulty,
    label: doc.label,
    emoji: doc.emoji,
    tier: doc.tier,
    prerequisites: doc.prerequisites,
    generateProblem: () => ({ ...generate(), difficulty: doc.difficulty }),
    ConceptComponent: buildConcept(doc.concept),
  };
}
