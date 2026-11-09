"use client";

import type { ReactNode } from "react";
import { calculatorBoardClass, calculatorBoardStyle } from "./calculatorBoard";

/** Estructura compartida de las tablas de factores de las clases y la calculadora. */
export function FactorTable({ columns, rows, label, renderValue, renderDivisor, calculator = false }: {
  columns: number;
  rows: number;
  label: string;
  renderValue: (row: number, column: number) => ReactNode;
  renderDivisor: (row: number) => ReactNode;
  calculator?: boolean;
}) {
  const numberClass = calculator ? "min-w-12 p-0.5" : "min-w-14 p-0.5 sm:min-w-16";
  const divisorClass = calculator ? "border-l-2 border-slate-200 p-0.5 pl-1" : "border-l-2 border-slate-200 p-0.5 pl-2 text-cyan-100";
  const values = (row: number, header: boolean) => Array.from({ length: columns }, (_, column) => header
    ? <th key={column} scope="col" className={numberClass}>{renderValue(row, column)}</th>
    : <td key={column} className={numberClass}>{renderValue(row, column)}</td>);
  return <div className={calculator ? calculatorBoardClass : "overflow-x-auto"} style={calculator ? calculatorBoardStyle : undefined} tabIndex={0} role={calculator ? "region" : "group"} aria-label={label}>
    <table className="mx-auto border-collapse text-center"><caption className="sr-only">{label}</caption>
      <thead><tr>{values(0, true)}<th scope="col" className={divisorClass}><span className="sr-only">Divisor</span>{renderDivisor(0)}</th></tr></thead>
      <tbody>{Array.from({ length: Math.max(0, rows - 1) }, (_, i) => <tr key={i}>{values(i + 1, false)}<td className={divisorClass}>{renderDivisor(i + 1)}</td></tr>)}</tbody>
    </table>
  </div>;
}
