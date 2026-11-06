"use client";

import { useMemo } from "react";
import {
  operationHints,
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
import { DivisionDemo, DivisionSheet, LayoutPicker, useDivisionLayout } from "./DivisionOperation";

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
  mode: "guided" | "free";
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
      <StylePicker spec={spec} disabled={disabled} />
      {spec.op === "divide" ? (
        <DivisionSheet
          key={`${questionId}-${layout}`}
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
          mode={mode}
          response={response}
          onChange={onChange}
          onComplete={onComplete}
          hintLevel={hintLevel}
          wrongColumn={failedResponse !== null && failedResponse === response ? firstWrongColumn(response, operationResult(spec)) : null}
          disabled={disabled}
        />
      )}
    </div>
  );
}
