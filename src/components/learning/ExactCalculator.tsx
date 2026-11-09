"use client";

import { useEffect, useState } from "react";
import { EXACT_OPS, MAX_EXACT_VALUES, MAX_FACTOR_ROWS, MAX_WORK_STEPS, validateManualSetup, validManualNumber, type WorkOp } from "@/lib/learning/exactCalculator";
import { primaryButton, secondaryButton } from "./LearningShell";

interface Step { operation: string; result: string }
interface FactorRow { divisor: string; cells: string[] }
interface Saved {
  format: "manual-v1"; op: WorkOp; a: string; b: string; extra: string[]; expression: string;
  steps: Step[]; factorRows: FactorRow[]; result: string; confirmed: boolean;
}
const emptyStep = (): Step => ({ operation: "", result: "" });
const emptyFactorRow = (): FactorRow => ({ divisor: "", cells: [] });
const initialSaved = (): Saved => ({ format: "manual-v1", op: "add", a: "", b: "", extra: [], expression: "", steps: [emptyStep()], factorRows: [emptyFactorRow()], result: "", confirmed: false });
const shortText = (value: unknown, limit: number): value is string => typeof value === "string" && value.length <= limit;
function load(key: string): Saved {
  const fallback = initialSaved();
  try {
    const saved = JSON.parse(sessionStorage.getItem(key) ?? "null") as Partial<Saved> | null;
    if (!saved || (saved.op !== "expression" && !EXACT_OPS.some((item) => item.id === saved.op)) || !shortText(saved.a, 64) || !shortText(saved.b, 64)) return fallback;
    const extra = saved.extra ?? [];
    if (!Array.isArray(extra) || extra.length > MAX_EXACT_VALUES - 2 || extra.some((value) => !shortText(value, 64))) return fallback;
    const expression = saved.expression ?? "";
    if (!shortText(expression, 256)) return fallback;
    // Los datos de la versión anterior conservan sus operandos, pero nunca
    // recuperan el resultado automático como si lo hubiera escrito el alumno.
    if (saved.format !== "manual-v1") return { ...fallback, op: saved.op!, a: saved.a, b: saved.b, extra, expression };
    const steps = saved.steps;
    const rows = saved.factorRows;
    if (!Array.isArray(steps) || steps.length < 1 || steps.length > MAX_WORK_STEPS || steps.some((step) => !step || !shortText(step.operation, 256) || !shortText(step.result, 64))) return fallback;
    if (!Array.isArray(rows) || rows.length < 1 || rows.length > MAX_FACTOR_ROWS || rows.some((row) => !row || !shortText(row.divisor, 64) || !Array.isArray(row.cells) || row.cells.length > MAX_EXACT_VALUES || row.cells.some((cell) => !shortText(cell, 64)))) return fallback;
    const result = shortText(saved.result, 64) ? saved.result : "";
    const values = saved.op === "simplify" ? [saved.a] : [saved.a, saved.b, ...extra];
    const confirmed = saved.confirmed === true && validManualNumber(result, saved.op === "mcm" || saved.op === "mcd") && !validateManualSetup(saved.op!, values, expression);
    return { format: "manual-v1", op: saved.op!, a: saved.a, b: saved.b, extra, expression, steps, factorRows: rows, result, confirmed };
  } catch { return fallback; }
}

const field = "block min-h-11 w-full min-w-0 rounded-xl border border-slate-500 bg-slate-950 px-3 font-mono text-lg text-white placeholder:text-slate-500";

/** Dos casillas representan una fracción; sin denominador, es un número. */
function NumberBlocks({ label, value, onChange, integer = false }: { label: string; value: string; onChange: (value: string) => void; integer?: boolean }) {
  const slash = value.indexOf("/");
  const numerator = slash < 0 ? value : value.slice(0, slash);
  const denominator = slash < 0 ? "" : value.slice(slash + 1);
  if (integer) return <label className="block min-w-0 text-sm font-semibold text-slate-200">{label}
    <input className={`${field} mt-1.5`} inputMode="text" autoComplete="off" maxLength={30} value={value} onChange={(event) => onChange(event.target.value)} />
  </label>;
  return <fieldset className="min-w-0 space-y-1.5">
    <legend className="text-sm font-semibold text-slate-200">{label}</legend>
    <div className="flex items-center gap-2">
      <label className="min-w-0 flex-1 text-xs text-slate-400">Numerador o entero
        <input className={`${field} mt-1`} aria-label={`Numerador o entero de ${label}`} inputMode="text" autoComplete="off" maxLength={64} value={numerator} onChange={(event) => { const next = event.target.value; onChange(next.includes("/") ? next : denominator ? `${next}/${denominator}` : next); }} />
      </label>
      <span aria-hidden="true" className="mt-5 text-xl text-slate-400">/</span>
      <label className="min-w-0 flex-1 text-xs text-slate-400">Denominador
        <input className={`${field} mt-1`} aria-label={`Denominador de ${label}`} inputMode="text" autoComplete="off" maxLength={30} value={denominator} onChange={(event) => onChange(event.target.value ? `${numerator}/${event.target.value}` : numerator)} />
      </label>
    </div>
  </fieldset>;
}

/** La familia de bloques es una hoja libre: solo el alumno escribe pasos y resultado. */
export function ExactCalculator({ storageKey, onResult }: { storageKey: string; onResult: (value: string) => void }) {
  const [initial] = useState(() => load(storageKey));
  const [op, setOp] = useState<WorkOp>(initial.op);
  const [a, setA] = useState(initial.a);
  const [b, setB] = useState(initial.b);
  const [extra, setExtra] = useState(initial.extra);
  const [expression, setExpression] = useState(initial.expression);
  const [steps, setSteps] = useState(initial.steps);
  const [factorRows, setFactorRows] = useState(initial.factorRows);
  const [result, setResult] = useState(initial.result);
  const [confirmed, setConfirmed] = useState(initial.confirmed);
  const [problem, setProblem] = useState<string | null>(null);
  const unary = op === "simplify", integer = op === "mcm" || op === "mcd", expressionMode = op === "expression";
  const values = unary ? [a] : [a, b, ...extra];
  const final = confirmed ? result.trim().replace(/[−–]/g, "-") : "";
  useEffect(() => { onResult(final); }, [final, onResult]);
  useEffect(() => {
    try { sessionStorage.setItem(storageKey, JSON.stringify({ format: "manual-v1", op, a, b, extra, expression, steps, factorRows, result, confirmed } satisfies Saved)); } catch { /* la hoja sigue disponible sin almacenamiento */ }
  }, [storageKey, op, a, b, extra, expression, steps, factorRows, result, confirmed]);
  const invalidate = () => { setConfirmed(false); setProblem(null); onResult(""); };
  const confirm = () => {
    const issue = validateManualSetup(op, values, expression);
    if (issue) { setProblem(issue); setConfirmed(false); onResult(""); return; }
    if (!validManualNumber(result, integer)) { setProblem(integer ? "Escribe tu resultado como número entero." : "Escribe tu resultado como número o fracción con denominador distinto de cero."); setConfirmed(false); onResult(""); return; }
    setProblem(null); setConfirmed(true); onResult(result.trim().replace(/[−–]/g, "-"));
  };
  const updateStep = (index: number, key: keyof Step, value: string) => { setSteps((old) => old.map((step, i) => i === index ? { ...step, [key]: value } : step)); invalidate(); };
  const updateRow = (index: number, column: number | "divisor", value: string) => {
    setFactorRows((old) => old.map((row, i) => {
      if (i !== index) return row;
      if (column === "divisor") return { ...row, divisor: value };
      const cells = [...row.cells];
      while (cells.length <= column) cells.push("");
      cells[column] = value;
      return { ...row, cells };
    }));
    invalidate();
  };
  const clear = () => { setA(""); setB(""); setExtra([]); setExpression(""); setSteps([emptyStep()]); setFactorRows([emptyFactorRow()]); setResult(""); invalidate(); };
  return <section aria-labelledby="exact-calculator-title" className="space-y-4">
    <div><h3 id="exact-calculator-title" className="text-base font-bold text-white">Tu hoja de bloques</h3><p className="mt-1 text-sm leading-relaxed text-slate-300">Escribe la cuenta, desarrolla cada paso y coloca tu resultado. La hoja no calcula ni corrige por ti.</p></div>
    <div className="space-y-4 rounded-2xl border border-slate-700 bg-slate-900/80 p-4">
      <label className="block text-sm font-semibold text-slate-200">Operación
        <select className="mt-1.5 block min-h-11 w-full rounded-xl border border-slate-500 bg-slate-950 px-3 text-base text-white" value={op} onChange={(event) => { setOp(event.target.value as WorkOp); invalidate(); }}>
          {EXACT_OPS.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
          <option value="expression">Expresión con paréntesis</option>
        </select>
      </label>
      {expressionMode ? <label className="block text-sm font-semibold text-slate-200">Expresión
        <input className={`${field} mt-1.5`} inputMode="text" autoComplete="off" maxLength={256} value={expression} placeholder="(1/2 + 1/3) × 3" onChange={(event) => { setExpression(event.target.value); invalidate(); }} />
      </label> : <div className="space-y-3">
        <NumberBlocks label={unary ? "Fracción" : integer ? "Primer entero" : "Primera fracción o número"} value={a} integer={integer} onChange={(value) => { setA(value); invalidate(); }} />
        {!unary && <NumberBlocks label={integer ? "Segundo entero" : "Segunda fracción o número"} value={b} integer={integer} onChange={(value) => { setB(value); invalidate(); }} />}
        {!unary && extra.map((value, index) => <div key={index} className="flex min-w-0 items-end gap-2"><div className="min-w-0 flex-1"><NumberBlocks label={integer ? `Entero ${index + 3}` : `Número ${index + 3}`} value={value} integer={integer} onChange={(next) => { setExtra((old) => old.map((v, i) => i === index ? next : v)); invalidate(); }} /></div><button type="button" aria-label={`Quitar número ${index + 3}`} className={`${secondaryButton} shrink-0`} onClick={() => { setExtra((old) => old.filter((_, i) => i !== index)); setFactorRows((old) => old.map((row) => ({ ...row, cells: row.cells.filter((_, column) => column !== index + 2) }))); invalidate(); }}>Quitar</button></div>)}
        {!unary && <button type="button" className={secondaryButton} disabled={extra.length >= MAX_EXACT_VALUES - 2} onClick={() => { setExtra((old) => [...old, ""]); invalidate(); }}>+ Añadir número</button>}
        <p className="text-xs text-slate-400">Hasta {MAX_EXACT_VALUES} números. {integer ? "Escribe enteros." : "Deja el denominador vacío para escribir un entero o decimal."}</p>
      </div>}
      <button type="button" className={secondaryButton} onClick={clear}>Limpiar cuenta</button>
    </div>
    {integer && <section aria-label="Tabla de factores" className="space-y-3 rounded-2xl border border-slate-700 bg-slate-900/80 p-4">
      <h4 className="font-bold text-white">Tabla de factores</h4>
      <p className="text-sm text-slate-300">Escribe cada divisor y los números que quedan en la fila siguiente. Añade las filas que necesites.</p>
      <div className="overflow-x-auto" role="region" aria-label="Tabla desplazable de factores" tabIndex={0}>
        <table className="border-collapse text-center text-sm"><caption className="sr-only">Tabla de factores escrita por el alumno</caption><thead><tr>{values.map((value, i) => <th key={i} scope="col" className="min-w-20 p-1">{value || `Número ${i + 1}`}</th>)}<th scope="col" className="min-w-20 border-l border-slate-500 p-1">Divisor</th></tr></thead>
          <tbody>{factorRows.map((row, rowIndex) => <tr key={rowIndex}>{values.map((_, column) => <td key={column} className="p-1"><input className={field} aria-label={`Fila ${rowIndex + 1}, número ${column + 1}`} inputMode="text" autoComplete="off" maxLength={64} value={row.cells[column] ?? ""} onChange={(event) => updateRow(rowIndex, column, event.target.value)} /></td>)}<td className="border-l border-slate-500 p-1"><input className={field} aria-label={`Divisor de la fila ${rowIndex + 1}`} inputMode="text" autoComplete="off" maxLength={64} value={row.divisor} onChange={(event) => updateRow(rowIndex, "divisor", event.target.value)} /></td></tr>)}</tbody>
        </table>
      </div>
      <div className="flex flex-wrap gap-2"><button type="button" className={secondaryButton} disabled={factorRows.length >= MAX_FACTOR_ROWS} onClick={() => { setFactorRows((old) => [...old, emptyFactorRow()]); invalidate(); }}>Añadir fila</button><button type="button" className={secondaryButton} disabled={factorRows.length <= 1} onClick={() => { setFactorRows((old) => old.slice(0, -1)); invalidate(); }}>Quitar última fila</button></div>
    </section>}
    <section aria-label="Pasos de mi cuenta" className="space-y-3 rounded-2xl border border-slate-700 bg-slate-900/80 p-4">
      <h4 className="font-bold text-white">Mis pasos</h4>
      <p className="text-sm text-slate-300">Completa los bloques con tus operaciones y resultados intermedios. Puedes añadir o quitar pasos.</p>
      {steps.map((step, i) => <fieldset key={i} className="space-y-2 rounded-xl border border-slate-700 p-3"><legend className="px-1 text-sm font-bold text-cyan-200">Paso {i + 1}</legend>
        <label className="block text-sm text-slate-300">Operación del paso {i + 1}<input className={`${field} mt-1`} inputMode="text" maxLength={256} value={step.operation} onChange={(event) => updateStep(i, "operation", event.target.value)} /></label>
        <label className="block text-sm text-slate-300">Resultado del paso {i + 1}<input className={`${field} mt-1`} inputMode="text" maxLength={64} value={step.result} onChange={(event) => updateStep(i, "result", event.target.value)} /></label>
        {steps.length > 1 && <button type="button" className={secondaryButton} onClick={() => { setSteps((old) => old.filter((_, n) => n !== i)); invalidate(); }}>Quitar paso {i + 1}</button>}
      </fieldset>)}
      <button type="button" className={secondaryButton} disabled={steps.length >= MAX_WORK_STEPS} onClick={() => { setSteps((old) => [...old, emptyStep()]); invalidate(); }}>Añadir paso</button>
    </section>
    <section aria-label="Mi resultado" className="space-y-3 rounded-2xl border border-cyan-400/30 bg-cyan-950/30 p-4">
      <h4 className="font-bold text-white">Mi resultado</h4>
      <NumberBlocks label="Mi resultado" value={result} integer={integer} onChange={(value) => { setResult(value); invalidate(); }} />
      <p className="text-xs text-slate-300">Confirma lo que escribiste para copiarlo o usarlo. La hoja no comprueba si es correcto.</p>
      {problem && <p role="alert" className="text-sm text-amber-200">{problem}</p>}
      <div className="flex flex-wrap gap-2"><button type="button" className={primaryButton} onClick={confirm}>Confirmar mi resultado</button><button type="button" className={secondaryButton} disabled={!confirmed} onClick={() => { if (expressionMode) setExpression(result); else setA(result); invalidate(); }}>{expressionMode ? "Copiar a la expresión" : "Copiar al primer número"}</button></div>
      {confirmed && <p role="status" className="text-sm text-cyan-100">Resultado escrito: {result}</p>}
    </section>
  </section>;
}
