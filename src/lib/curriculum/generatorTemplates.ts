/**
 * Compila un `GeneratorSpec` (dato, ver customSchema.ts) en la misma forma
 * que ya usan los 6 generadores de código: `() => Problem` — Fase 20
 * (docs/level-editor-plan-v2.md §7.5). `rng` es inyectable (default
 * `Math.random`) para que las pruebas sean deterministas, algo que hoy no
 * existe para ningún generador de código (mejora colateral documentada).
 */
import { getStrand } from "@/lib/strands";
import type { Problem, InputType } from "@/lib/problem";
import { evalExpr, fillTemplate, parseExpr, type ExprNode } from "./expr";
import type {
  ArithmeticGeneratorSpec,
  ChoiceGeneratorSpec,
  GeneratorConstraint,
  GeneratorSpec,
  GeneratorVariable,
  NumberLineGeneratorSpec,
  TableGeneratorSpec,
  VariantGeneratorSpec,
} from "./customSchema";

const MAX_RESAMPLES = 50;

type Rng = () => number;

function decimalPlaces(step: number): number {
  const s = String(step);
  const dot = s.indexOf(".");
  return dot === -1 ? 0 : s.length - dot - 1;
}

function sampleVariable(rng: Rng, v: GeneratorVariable): number {
  if (v.choices && v.choices.length > 0) {
    return v.choices[Math.floor(rng() * v.choices.length)];
  }
  const step = v.step || 1;
  const steps = Math.max(0, Math.round((v.max - v.min) / step));
  const idx = Math.floor(rng() * (steps + 1));
  const raw = v.min + idx * step;
  const decimals = decimalPlaces(step);
  const factor = 10 ** decimals;
  return Math.round(raw * factor) / factor;
}

function sampleVariables(rng: Rng, variables: GeneratorVariable[]): Record<string, number> {
  const vars: Record<string, number> = {};
  for (const v of variables) vars[v.name] = sampleVariable(rng, v);
  return vars;
}

/** Parsea de antemano (fuera del bucle de re-sorteo) para no volver a
 *  tokenizar en cada intento — la validación en sí ya corrió en
 *  `validateCustomModule`, así que un fallo de parseo acá es defensivo. */
function parseOrNull(src: string): ExprNode | null {
  const result = parseExpr(src);
  return "ast" in result ? result.ast : null;
}

function constraintsSatisfied(vars: Record<string, number>, constraintAsts: (ExprNode | null)[]): boolean {
  for (const ast of constraintAsts) {
    if (!ast) continue; // constraint inválida: se ignora en vez de bloquear el generador entero
    try {
      const v = evalExpr(ast, vars);
      if (v === 0 || Number.isNaN(v)) return false;
    } catch {
      return false;
    }
  }
  return true;
}

function sampleWithConstraints(
  rng: Rng,
  variables: GeneratorVariable[],
  constraints: GeneratorConstraint[],
): Record<string, number> {
  const constraintAsts = constraints.map((c) => parseOrNull(c.expr));
  let vars = sampleVariables(rng, variables);
  let attempt = 0;
  while (attempt < MAX_RESAMPLES && !constraintsSatisfied(vars, constraintAsts)) {
    vars = sampleVariables(rng, variables);
    attempt++;
  }
  return vars;
}

function evalWithVars(ast: ExprNode | null, vars: Record<string, number>, fallback = 0): number {
  if (!ast) return fallback;
  try {
    return evalExpr(ast, vars);
  } catch {
    return fallback;
  }
}

function fillOrLiteral(tpl: string, vars: Record<string, number>): string {
  try {
    return fillTemplate(tpl, vars);
  } catch {
    return tpl;
  }
}

function buildHints(spec: Pick<ArithmeticGeneratorSpec, "hintTemplates">, vars: Record<string, number>): [string, string, string] {
  return [
    fillOrLiteral(spec.hintTemplates[0], vars),
    fillOrLiteral(spec.hintTemplates[1], vars),
    fillOrLiteral(spec.hintTemplates[2], vars),
  ];
}

/* ════════════════════════════════════════════════════════════════════════
 * arithmetic / choice / numberLine comparten la misma base: sortear
 * variables con restricciones, resolver answerExpr, rellenar plantillas.
 * Solo `arithmetic` declara `inputType` (choice/numberLine tienen su propio
 * `Problem.inputType` fijo, "choice"/"numberLine") — por eso el redondeo de
 * la respuesta se pasa aparte en vez de leerlo de `spec`.
 * ════════════════════════════════════════════════════════════════════════ */

type CommonGenFields = Pick<ArithmeticGeneratorSpec, "variables" | "constraints" | "promptTemplate" | "flavor" | "answerExpr" | "hintTemplates">;

function makeArithmeticLike(spec: CommonGenFields, rng: Rng, roundAnswer: (n: number) => number) {
  const vars = sampleWithConstraints(rng, spec.variables, spec.constraints);
  const answerAst = parseOrNull(spec.answerExpr);
  const rawAnswer = evalWithVars(answerAst, vars, NaN);
  const answer = roundAnswer(rawAnswer);
  const varsWithAnswer = { ...vars, answer };
  return {
    vars: varsWithAnswer,
    answer,
    prompt: fillOrLiteral(spec.promptTemplate, varsWithAnswer),
    flavor: spec.flavor ? fillOrLiteral(spec.flavor, varsWithAnswer) : undefined,
    hints: buildHints(spec, varsWithAnswer),
  };
}

function roundAnswerFor(inputType: "integer" | "decimal"): (n: number) => number {
  return inputType === "integer" ? Math.round : (n) => Math.round(n * 100) / 100;
}

function compileArithmetic(spec: ArithmeticGeneratorSpec): (rng: Rng) => Problem {
  const round = roundAnswerFor(spec.inputType);
  return (rng) => {
    const built = makeArithmeticLike(spec, rng, round);
    return {
      id: crypto.randomUUID(),
      difficulty: 0,
      kind: spec.problemKind,
      prompt: built.prompt,
      answer: built.answer,
      inputType: spec.inputType,
      hints: built.hints,
      flavor: built.flavor,
    };
  };
}

function nearChoices(rng: Rng, answer: number, spread: number): number[] {
  const options = new Set<number>([answer]);
  let guard = 0;
  while (options.size < 3 && guard < 200) {
    const delta = Math.floor(rng() * (spread * 2 + 1)) - spread;
    const candidate = answer + delta;
    if (candidate >= 0) options.add(candidate);
    guard++;
  }
  while (options.size < 3) options.add(answer + options.size);
  return shuffleRng(rng, [...options]);
}

function shuffleRng<T>(rng: Rng, items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function compileChoice(spec: ChoiceGeneratorSpec): (rng: Rng) => Problem {
  const exprAsts =
    spec.distractors.mode === "expr" ? spec.distractors.exprs.map(parseOrNull) : [];
  const labelAsts =
    spec.distractors.mode === "labels"
      ? spec.distractors.options.map((o) => ({ label: o.label, ast: parseOrNull(o.valueExpr) }))
      : [];

  return (rng) => {
    const built = makeArithmeticLike(spec, rng, Math.round);
    let choices: number[];
    let choiceLabels: string[] | undefined;

    if (spec.distractors.mode === "near") {
      choices = nearChoices(rng, built.answer, spec.distractors.spread);
    } else if (spec.distractors.mode === "expr") {
      const options = new Set<number>([built.answer]);
      for (const ast of exprAsts) options.add(evalWithVars(ast, built.vars, built.answer));
      choices = shuffleRng(rng, [...options]);
    } else {
      const pairs = labelAsts.map((o) => ({ label: o.label, value: evalWithVars(o.ast, built.vars, 0) }));
      const shuffled = shuffleRng(rng, pairs);
      choices = shuffled.map((p) => p.value);
      choiceLabels = shuffled.map((p) => p.label);
    }

    if (!choiceLabels && spec.choiceLabelTemplate) {
      choiceLabels = choices.map((c) => fillOrLiteral(spec.choiceLabelTemplate!, { ...built.vars, c }));
    }

    return {
      id: crypto.randomUUID(),
      difficulty: 0,
      kind: spec.problemKind,
      prompt: built.prompt,
      answer: built.answer,
      choices,
      choiceLabels,
      inputType: "choice",
      hints: built.hints,
      flavor: built.flavor,
    };
  };
}

function compileNumberLine(spec: NumberLineGeneratorSpec): (rng: Rng) => Problem {
  const lineMinAst = parseOrNull(spec.lineMinExpr);
  const lineMaxAst = parseOrNull(spec.lineMaxExpr);
  const startAst = parseOrNull(spec.startExpr);

  return (rng) => {
    const built = makeArithmeticLike(spec, rng, Math.round);
    return {
      id: crypto.randomUUID(),
      difficulty: 0,
      kind: spec.problemKind,
      prompt: built.prompt,
      answer: built.answer,
      inputType: "numberLine",
      lineMin: evalWithVars(lineMinAst, built.vars, 0),
      lineMax: evalWithVars(lineMaxAst, built.vars, 10),
      startValue: evalWithVars(startAst, built.vars, 0),
      hints: built.hints,
      flavor: built.flavor,
    };
  };
}

function compileTable(spec: TableGeneratorSpec): (rng: Rng) => Problem {
  return (rng) => {
    const rows = spec.rows.length > 0 ? spec.rows : [{ id: "vacio", prompt: "(sin preguntas cargadas)", answer: 0, inputType: "integer" as const, hints: ["", "", ""] as [string, string, string] }];
    const row = rows[Math.floor(rng() * rows.length)];
    return {
      id: crypto.randomUUID(),
      difficulty: 0,
      kind: spec.problemKind,
      prompt: row.prompt,
      answer: row.answer,
      choices: row.choices,
      choiceLabels: row.choiceLabels,
      inputType: row.inputType as InputType,
      hints: row.hints,
    };
  };
}

function compileVariants(spec: VariantGeneratorSpec): (rng: Rng) => Problem {
  const compiled = spec.variants.map((v) => ({ weight: Math.max(0, v.weight), gen: compileGeneratorInner(v.spec) }));
  const totalWeight = compiled.reduce((s, v) => s + v.weight, 0);
  return (rng) => {
    if (totalWeight <= 0) return compiled[0]?.gen(rng) ?? placeholderProblem();
    let roll = rng() * totalWeight;
    for (const v of compiled) {
      roll -= v.weight;
      if (roll <= 0) return v.gen(rng);
    }
    return compiled[compiled.length - 1].gen(rng);
  };
}

function placeholderProblem(): Problem {
  return { id: crypto.randomUUID(), difficulty: 0, kind: "vacio", prompt: "(sin configurar)", answer: 0, inputType: "integer" };
}

function compileBuiltin(strandSlug: string, difficulty: number): (rng: Rng) => Problem {
  // Los generadores de código usan Math.random() internamente y no aceptan
  // `rng` — se documenta como límite conocido (§7.5): esta rama no es
  // determinista aunque se le pase un rng fijo.
  return () => {
    const strand = getStrand(strandSlug);
    if (!strand) return placeholderProblem();
    return strand.generateProblem(difficulty);
  };
}

function compileGeneratorInner(spec: GeneratorSpec): (rng: Rng) => Problem {
  switch (spec.kind) {
    case "arithmetic":
      return compileArithmetic(spec);
    case "choice":
      return compileChoice(spec);
    case "numberLine":
      return compileNumberLine(spec);
    case "table":
      return compileTable(spec);
    case "variants":
      return compileVariants(spec);
    case "builtin":
      return compileBuiltin(spec.strandSlug, spec.difficulty);
  }
}

/** `rng` inyectable (default `Math.random`) — con un generador
 *  determinista (p. ej. un PRNG con semilla fija en pruebas), produce la
 *  misma secuencia de problemas entre corridas. */
export function compileGenerator(spec: GeneratorSpec, rng: Rng = Math.random): () => Problem {
  const gen = compileGeneratorInner(spec);
  return () => gen(rng);
}
