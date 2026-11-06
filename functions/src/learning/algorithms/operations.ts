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

export type ColumnSpec = ArithmeticSpec | DivisionSpec;
/** Preferencias del alumno para escribir el procedimiento. */
export interface OperationStyle {
  strategy?: SubtractStrategy;
  layout?: DivisionLayout;
}

/** La respuesta de una pregunta en columnas: el resultado o el cociente. */
export function operationResult(spec: ColumnSpec): number {
  return spec.op === "divide" ? divisionTrace(spec).quotient : columnTrace(spec).result;
}
export function operationExpression(spec: ColumnSpec): string {
  return spec.op === "divide" ? divisionExpression(spec) : columnExpression(spec);
}
export function operationSolution(spec: ColumnSpec, style: OperationStyle = {}): string[] {
  return spec.op === "divide" ? divisionSolution(spec, style.layout) : columnSolution(spec, style.strategy);
}
export function operationHints(spec: ColumnSpec, style: OperationStyle = {}): [string, string, string] {
  return spec.op === "divide" ? divisionHints(spec, style.layout) : columnHints(spec, style.strategy);
}
export function operationBugs(spec: ColumnSpec): { id: string; value: number; feedback: string }[] {
  return spec.op === "divide" ? divisionBugs(spec) : columnBugs(spec);
}
