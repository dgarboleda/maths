"use client";

import { useMemo } from "react";
import dynamic from "next/dynamic";
import { MathText } from "@/components/MathText";
import {
  checkDivisionWork,
  checkFactorWork,
  checkOpenDivision,
  factorWorkFeedback,
  isFactorSpec,
  isMultiplySpec,
  isRuffiniSpec,
  multiplyTrace,
  checkRuffiniWork,
  ruffiniWorkFeedback,
  type FactorSpec,
  type RuffiniSpec,
  divisionWorkFeedback,
  fmt,
  isAnswerCorrect,
  operationHints,
  placeName,
  scaled,
  type Question,
  operationResult,
  operationSolution,
  type ColumnSpec,
  type MultiplySpec,
} from "@/lib/learning/core";
import {
  ColumnDemo,
  ColumnSheet,
  firstWrongColumn,
  StrategyPicker,
  useSubtractStrategy,
} from "./ColumnOperation";
import { NumericKeypadArea } from "./NumericKeypad";
import { DivisionDemo, DivisionSheet, firstWrongQuotientDigit, LayoutPicker, useDivisionLayout } from "./DivisionOperation";

const FactorDemo = dynamic(() => import("./FactorOperation").then((module) => module.FactorDemo));
const FactorSheet = dynamic(() => import("./FactorOperation").then((module) => module.FactorSheet));
const MultiplyDemo = dynamic(() => import("./MultiplyOperation").then((module) => module.MultiplyDemo));
const MultiplySheet = dynamic(() => import("./MultiplyOperation").then((module) => module.MultiplySheet));
const RuffiniDemo = dynamic(() => import("./RuffiniOperation").then((module) => module.RuffiniDemo));
const RuffiniSheet = dynamic(() => import("./RuffiniOperation").then((module) => module.RuffiniSheet));
/* Punto de entrada único para las operaciones escritas (suma, resta,
 * multiplicación y división larga): elige la hoja, la demostración y las ayudas según la
 * operación y las preferencias del alumno. */

/** Pistas y desarrollo con la manera de escribir que eligió el alumno. */
export function useOperationHelp(spec: ColumnSpec | undefined) {
  const [strategy] = useSubtractStrategy();
  const [layout] = useDivisionLayout();
  return useMemo(
    () =>
      spec
        ? { hints: operationHints(spec, { strategy, layout }), solution: operationSolution(spec, { strategy, layout }) }
        : null,
    [spec, strategy, layout],
  );
}

/** Selector de estilo (si la operación tiene más de una manera correcta). */
function StylePicker({ spec, disabled }: { spec: ColumnSpec; disabled?: boolean }) {
  const [strategy, setStrategy] = useSubtractStrategy();
  const [layout, setLayout] = useDivisionLayout();
  if (spec.op === "subtract") return <StrategyPicker strategy={strategy} onChange={setStrategy} disabled={disabled} />;
  if (spec.op === "divide") return <LayoutPicker layout={layout} onChange={setLayout} disabled={disabled} />;
  return null;
}

export function OperationDemo({ spec, initialStep }: { spec: ColumnSpec; initialStep?: number }) {
  if (isFactorSpec(spec)) return <FactorDemo spec={spec} initialStep={initialStep} />;
  if (isRuffiniSpec(spec)) return <RuffiniDemo spec={spec} initialStep={initialStep} />;
  if (isMultiplySpec(spec)) return <MultiplyDemo spec={spec} initialStep={initialStep} />;
  return <WrittenDemo spec={spec} initialStep={initialStep} />;
}

function WrittenDemo({ spec, initialStep }: { spec: Exclude<ColumnSpec, FactorSpec | RuffiniSpec | MultiplySpec>; initialStep?: number }) {
  const [strategy] = useSubtractStrategy();
  const [layout] = useDivisionLayout();
  return spec.op === "divide" ? (
    <DivisionDemo key={layout} spec={spec} layout={layout} initialStep={initialStep} />
  ) : (
    <ColumnDemo key={strategy} spec={spec} strategy={strategy} initialStep={initialStep} />
  );
}

/** Ejemplo razonado animado, con la manera de escribir que elija el alumno. */
export function OperationExample({ spec }: { spec: ColumnSpec }) {
  return (
    <div className="space-y-3 rounded-xl border border-slate-700 bg-slate-950 p-4">
      <StylePicker spec={spec} />
      <OperationDemo spec={spec} />
    </div>
  );
}

export function OperationWorkspace({
  questionId,
  spec,
  mode,
  response,
  onChange,
  onComplete,
  hintLevel,
  failedResponse,
  disabled,
}: {
  questionId: string;
  spec: ColumnSpec;
  mode: "guided" | "free" | "open";
  response: string;
  onChange: (response: string) => void;
  onComplete: (response: string) => void;
  hintLevel: number;
  failedResponse: string | null;
  disabled?: boolean;
}) {
  const [strategy] = useSubtractStrategy();
  const [layout] = useDivisionLayout();
  return (
    <div className="space-y-3">
      {!(spec.op === "divide" && mode === "open") && <StylePicker spec={spec} disabled={disabled} />}
      <NumericKeypadArea sign={isRuffiniSpec(spec)}>
      {isRuffiniSpec(spec) ? (
        <RuffiniSheet
          key={`${questionId}-${mode === "guided" ? "g" : "f"}`}
          spec={spec}
          mode={mode === "guided" ? "guided" : "free"}
          response={response}
          onChange={onChange}
          onComplete={onComplete}
          failedResponse={failedResponse}
          disabled={disabled}
        />
      ) : isFactorSpec(spec) ? (
        <FactorSheet
          key={`${questionId}-${mode === "guided" ? "g" : "f"}`}
          spec={spec}
          mode={mode === "guided" ? "guided" : "free"}
          response={response}
          onChange={onChange}
          onComplete={onComplete}
          failedResponse={failedResponse}
          disabled={disabled}
        />
      ) : isMultiplySpec(spec) ? (
        <MultiplySheet
          key={`${questionId}-${mode === "guided" ? "g" : "f"}`}
          spec={spec}
          mode={mode === "guided" ? "guided" : "free"}
          response={response}
          onChange={onChange}
          onComplete={onComplete}
          hintLevel={hintLevel}
          failedResponse={failedResponse}
          disabled={disabled}
        />
      ) : spec.op === "divide" ? (
        <DivisionSheet
          key={`${questionId}-${mode === "open" ? "open" : layout}`}
          spec={spec}
          layout={layout}
          mode={mode}
          response={response}
          onChange={onChange}
          onComplete={onComplete}
          hintLevel={hintLevel}
          failedResponse={failedResponse}
          disabled={disabled}
        />
      ) : (
        <ColumnSheet
          key={`${questionId}-${strategy}`}
          spec={spec}
          strategy={strategy}
          mode={mode === "guided" ? "guided" : "free"}
          response={response}
          onChange={onChange}
          onComplete={onComplete}
          hintLevel={hintLevel}
          wrongColumn={
            failedResponse !== null && failedResponse === response
              ? firstWrongColumn(response, operationResult(spec), scaled(spec).scale)
              : null
          }
          disabled={disabled}
        />
      )}
      </NumericKeypadArea>
    </div>
  );
}

/** Dónde se separó una respuesta numérica del resultado, en palabras. */
export function operationMistake(spec: ColumnSpec, response: string): string | null {
  if (isRuffiniSpec(spec)) {
    const work = checkRuffiniWork(spec, response);
    return work ? ruffiniWorkFeedback(spec, work) : null;
  }
  if (isFactorSpec(spec)) {
    const work = checkFactorWork(spec, response);
    if (work) return factorWorkFeedback(spec, work);
    return null;
  }
  if (spec.op === "divide") {
    const work = checkDivisionWork(spec, response);
    if (work) return work.firstError ? divisionWorkFeedback(spec, work.firstError, work.layout) : null;
    const open = checkOpenDivision(spec, response);
    if (open)
      return !open.quotientCorrect
        ? `Tu cociente fue ${fmt(open.quotient)}; el correcto es ${fmt(operationResult(spec))}.`
        : open.mismatch
          ? divisionWorkFeedback(spec, open.mismatch, open.mismatch.kind === "p" ? "completa" : "abreviada")
          : null;
  }
  if (!/^\s*\d+(?:[,.]\d+)?\s*$/.test(response)) return null;
  const answer = operationResult(spec);
  const given = Number(response.replace(",", "."));
  if (spec.op === "divide") {
    const i = firstWrongQuotientDigit(response, answer);
    return i === null ? null : `Tu cociente fue ${fmt(given)}: la primera cifra distinta es la ${i + 1}.ª del cociente.`;
  }
  if (isMultiplySpec(spec)) {
    const t = multiplyTrace(spec);
    const digits = response.replace(/\D/g, "").replace(/^0+(?=\d)/, "");
    if (digits === String(t.product) && given !== t.result)
      return `Tu resultado fue ${fmt(given)}: las cifras están bien, pero la coma no. El producto lleva ${t.scale} ${t.scale === 1 ? "cifra decimal" : "cifras decimales"}.`;
    const column = firstWrongColumn(digits, t.product);
    return column === null ? null : `Tu resultado fue ${fmt(given)}: sin la coma, la primera cifra distinta está en las ${placeName(column)}.`;
  }
  const { scale } = scaled(spec);
  const column = firstWrongColumn(response, answer, scale);
  return column === null ? null : `Tu resultado fue ${fmt(given)}: la primera cifra distinta está en las ${placeName(column - scale)}.`;
}

/**
 * «Ver el razonamiento» de los resúmenes de repaso: el desarrollo con la
 * manera de escribir que eligió el alumno y, si la pregunta se resuelve en
 * columnas, la operación completa y dónde se separó su respuesta.
 */
export function OperationReasoning({ question, response }: { question: Question; response?: string | null }) {
  const help = useOperationHelp(question.column);
  const spec = question.column;
  const mistake = spec && response && !isAnswerCorrect(question, response) ? operationMistake(spec, response) : null;
  return (
    <details className="mt-2 text-sm text-slate-300">
      <summary className="cursor-pointer font-semibold text-cyan-200">Ver el razonamiento</summary>
      {spec && (
        <div className="mt-3 space-y-3">
          <StylePicker spec={spec} />
          <OperationDemo spec={spec} initialStep={Infinity} />
        </div>
      )}
      {mistake && <p className="mt-2 rounded-lg bg-amber-950/40 p-2 text-amber-100">{mistake}</p>}
      <ol className="mt-2 list-decimal space-y-1 pl-5">
        {(help?.solution ?? question.solution).map((step) => (
          <li key={step}><MathText text={step} /></li>
        ))}
      </ol>
    </details>
  );
}
