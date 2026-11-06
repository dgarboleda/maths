"use client";

import { useMemo } from "react";
import { MathText } from "@/components/MathText";
import {
  checkDivisionWork,
  checkFactorWork,
  checkOpenDivision,
  factorWorkFeedback,
  isFactorSpec,
  type FactorSpec,
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
} from "@/lib/learning/core";
import {
  ColumnDemo,
  ColumnSheet,
  firstWrongColumn,
  StrategyPicker,
  useSubtractStrategy,
} from "./ColumnOperation";
import { FactorDemo, FactorSheet } from "./FactorOperation";
import { DivisionDemo, DivisionSheet, firstWrongQuotientDigit, LayoutPicker, useDivisionLayout } from "./DivisionOperation";

/* Punto de entrada único para las operaciones escritas (suma, resta y
 * división larga): elige la hoja, la demostración y las ayudas según la
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
  return <WrittenDemo spec={spec} initialStep={initialStep} />;
}

function WrittenDemo({ spec, initialStep }: { spec: Exclude<ColumnSpec, FactorSpec>; initialStep?: number }) {
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
      {isFactorSpec(spec) ? (
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
    </div>
  );
}

/** Dónde se separó una respuesta numérica del resultado, en palabras. */
export function operationMistake(spec: ColumnSpec, response: string): string | null {
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
  if (spec.op === "divide") {
    const i = firstWrongQuotientDigit(response, answer);
    return i === null ? null : `Tu cociente fue ${fmt(Number(response))}: la primera cifra distinta es la ${i + 1}.ª del cociente.`;
  }
  const { scale } = scaled(spec);
  const column = firstWrongColumn(response, answer, scale);
  return column === null ? null : `Tu resultado fue ${fmt(Number(response.replace(",", ".")))}: la primera cifra distinta está en las ${placeName(column - scale)}.`;
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
