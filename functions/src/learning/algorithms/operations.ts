/** Una sola entrada para las operaciones escritas: suma y resta en columnas
 *  y división larga. Las preguntas y la interfaz usan estas funciones. */
import {
  columnBugs,
  columnExpression,
  columnHints,
  columnSolution,
  columnTrace,
  type ArithmeticSpec,
  type SubtractStrategy,
} from "./columns";
import {
  divisionBugs,
  divisionExpression,
  divisionHints,
  divisionSolution,
  divisionTrace,
  type DivisionLayout,
  type DivisionSpec,
} from "./division";
import {
  factorAnswer,
  factorBugs,
  factorExpression,
  factorHints,
  factorSolution,
  type FactorSpec,
} from "./factors";
import {
  ruffiniBugs,
  ruffiniExpression,
  ruffiniHints,
  ruffiniRemainder,
  ruffiniSolution,
  type RuffiniSpec,
} from "./ruffini";

export type ColumnSpec = ArithmeticSpec | DivisionSpec | FactorSpec | RuffiniSpec;
export const isRuffiniSpec = (spec: ColumnSpec): spec is RuffiniSpec => spec.op === "ruffini";
export const isFactorSpec = (spec: ColumnSpec): spec is FactorSpec => spec.op === "mcd" || spec.op === "mcm";
/** Preferencias del alumno para escribir el procedimiento. */
export interface OperationStyle {
  strategy?: SubtractStrategy;
  layout?: DivisionLayout;
}

/** La respuesta de una pregunta en columnas: el resultado o el cociente. */
export function operationResult(spec: ColumnSpec): number {
  if (isRuffiniSpec(spec)) return ruffiniRemainder(spec);
  if (isFactorSpec(spec)) return factorAnswer(spec);
  return spec.op === "divide" ? divisionTrace(spec).quotient : columnTrace(spec).result;
}
export function operationExpression(spec: ColumnSpec): string {
  if (isRuffiniSpec(spec)) return ruffiniExpression(spec);
  if (isFactorSpec(spec)) return factorExpression(spec);
  return spec.op === "divide" ? divisionExpression(spec) : columnExpression(spec);
}
export function operationSolution(spec: ColumnSpec, style: OperationStyle = {}): string[] {
  if (isRuffiniSpec(spec)) return ruffiniSolution(spec);
  if (isFactorSpec(spec)) return factorSolution(spec);
  return spec.op === "divide" ? divisionSolution(spec, style.layout) : columnSolution(spec, style.strategy);
}
export function operationHints(spec: ColumnSpec, style: OperationStyle = {}): [string, string, string] {
  if (isRuffiniSpec(spec)) return ruffiniHints(spec);
  if (isFactorSpec(spec)) return factorHints(spec);
  return spec.op === "divide" ? divisionHints(spec, style.layout) : columnHints(spec, style.strategy);
}
export function operationBugs(spec: ColumnSpec): { id: string; value: number; feedback: string }[] {
  if (isRuffiniSpec(spec)) return ruffiniBugs(spec);
  if (isFactorSpec(spec)) return factorBugs(spec);
  return spec.op === "divide" ? divisionBugs(spec) : columnBugs(spec);
}
