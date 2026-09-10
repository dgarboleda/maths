/**
 * Modelo de datos de la Currícula personalizada — Fase 20
 * (docs/level-editor-plan-v2.md §7.4-§7.5). Puro dato, sin React ni
 * Firebase: lo compila `compileModule.ts` al mismo `ModuleDef` que ya usan
 * los ~52 módulos de código (`curriculum.ts`), y lo edita `/panel/curriculum`
 * (Fase 21) con el mismo `PropertyField` del Level Editor.
 */

export const CUSTOM_MODULE_SCHEMA_VERSION = 1;

/** El id ES el doc id en `/parents/{parentId}/curriculumModules/{id}` y la
 *  clave de `skillsProgress/{id}` — por eso vive bajo el namespace `cst-`
 *  (§7.2): nunca puede colisionar con un módulo de código. */
export interface CustomModuleDoc {
  id: string;
  schemaVersion: number;
  /** Slug de STRANDS (src/lib/strands.ts). No se inventan hilos nuevos en
   *  esta fase — eso implicaría ruta, narrativa y navegación nuevas. */
  strandSlug: string;
  label: string;
  emoji: string;
  /** 1-10 → solo valor en estrellas (economy.ts), sin efecto en orden ni bloqueo. */
  difficulty: number;
  tier: number;
  /** Ids de MODULES o de otros módulos personalizados. */
  prerequisites: string[];
  generator: GeneratorSpec;
  concept: ConceptSpec;
  examples: WorkedExample[];
  /** `false` = borrador, no aparece en `ChallengePicker` ni se hidrata en
   *  el registro de módulos usado durante el juego. */
  published: boolean;
  metadata: { authorUid: string; createdAt: number; updatedAt: number };
}

/* ════════════════════════════════════════════════════════════════════════
 * CONCEPTO — el tipo vive acá (dato puro); el catálogo de plantillas reales
 * (que sí importa componentes React) vive en conceptCatalog.ts (Fase 21).
 * ════════════════════════════════════════════════════════════════════════ */

export interface ConceptSpec {
  templateId: string;
  params: Record<string, string | number | boolean>;
}

/* ════════════════════════════════════════════════════════════════════════
 * EJEMPLOS RESUELTOS
 * ════════════════════════════════════════════════════════════════════════ */

export interface ExampleStep {
  id: string;
  text: string;
  math?: string;
  imageSrc?: string;
}

export interface WorkedExample {
  id: string;
  /** Literal, no plantilla: un ejemplo es contenido fijo, no generado. */
  prompt: string;
  steps: ExampleStep[];
  answer: number;
  /** "12 manzanas", cuando el número solo no alcanza para expresar la respuesta. */
  answerText: string;
}

/* ════════════════════════════════════════════════════════════════════════
 * GENERADOR — plantillas extraídas por inspección de los 6 generadores de
 * código (docs/level-editor-plan-v2.md §7.5): sortear variables enteras →
 * restricción de coherencia → plantilla de string → fórmula → 3 pistas.
 * ════════════════════════════════════════════════════════════════════════ */

export type GeneratorSpec =
  | ArithmeticGeneratorSpec
  | ChoiceGeneratorSpec
  | NumberLineGeneratorSpec
  | TableGeneratorSpec
  | VariantGeneratorSpec
  | BuiltinGeneratorSpec;

export interface GeneratorVariable {
  /** [a-z][a-z0-9]* */
  name: string;
  min: number;
  max: number;
  /** 1 = entero, 0.1 = decimal (o cualquier paso fraccionario). */
  step: number;
  /** Si está presente, se sortea de esta lista en vez del rango min-max. */
  choices?: number[];
}

export interface GeneratorConstraint {
  /** "a + b <= 10", "b != 0", "a % b == 0" — evaluada con expr.ts. */
  expr: string;
  /** Se muestra en la vista previa cuando la restricción se agota sin cumplirse. */
  message: string;
}

export interface ArithmeticGeneratorSpec {
  kind: "arithmetic";
  variables: GeneratorVariable[];
  /** Re-sorteo hasta MAX_RESAMPLES (generatorTemplates.ts) si no se cumplen. */
  constraints: GeneratorConstraint[];
  /** "¿Cuánto es {a} + {b}?" */
  promptTemplate: string;
  /** Problem.flavor, decorativo. */
  flavor: string;
  /** "a + b" */
  answerExpr: string;
  inputType: "integer" | "decimal";
  /** Conceptual → primer paso → casi completo. Admite placeholders. */
  hintTemplates: [string, string, string];
  /** Problem.kind — identidad para problemSignature. */
  problemKind: string;
}

export type ChoiceDistractorSpec =
  | { mode: "near"; spread: number }
  | { mode: "expr"; exprs: string[] }
  | { mode: "labels"; options: { label: string; valueExpr: string }[] };

export interface ChoiceGeneratorSpec extends Omit<ArithmeticGeneratorSpec, "kind" | "inputType"> {
  kind: "choice";
  distractors: ChoiceDistractorSpec;
  choiceLabelTemplate?: string;
}

export interface NumberLineGeneratorSpec extends Omit<ArithmeticGeneratorSpec, "kind" | "inputType"> {
  kind: "numberLine";
  lineMinExpr: string;
  lineMaxExpr: string;
  startExpr: string;
}

/** Salida de emergencia data-driven: preguntas escritas a mano, una por
 *  fila. Garantiza que nunca haya un ejercicio inexpresable sin código. */
export interface TableGeneratorSpec {
  kind: "table";
  rows: {
    id: string;
    prompt: string;
    answer: number;
    inputType: "integer" | "decimal" | "choice";
    choices?: number[];
    choiceLabels?: string[];
    hints: [string, string, string];
  }[];
  problemKind: string;
}

export interface VariantGeneratorSpec {
  kind: "variants";
  variants: { weight: number; spec: Exclude<GeneratorSpec, VariantGeneratorSpec> }[];
}

/** Delega en un hilo/dificultad de código ya existente — atajo para
 *  reutilizar un generador de `STRANDS` sin reescribirlo como fórmula. */
export interface BuiltinGeneratorSpec {
  kind: "builtin";
  strandSlug: string;
  difficulty: number;
}
