"use client";

import { useEffect, useId, useRef, useState } from "react";
import { EXACT_OPS, MAX_EXACT_VALUES, MAX_FACTOR_ROWS, MAX_WORK_STEPS, validateManualSetup, validManualNumber, type WorkOp } from "@/lib/learning/exactCalculator";
import { primaryButton, secondaryButton } from "./LearningShell";
import { calculatorBoardClass, calculatorBoardStyle } from "./calculatorBoard";
import { useSheetInputMode } from "./NumericKeypad";
import { FactorTable } from "./FactorTable";
import { readCalculatorDraft, writeCalculatorDraft } from "./calculatorStorage";
import { checkManualWork, type CheckReport } from "@/lib/learning/calculatorCheck";

interface Step { operation: string; result: string; left?: string; right?: string; operator?: string }
interface FactorRow { divisor: string; cells: string[] }
interface Saved {
  format: "manual-v1"; op: WorkOp; a: string; b: string; extra: string[]; expression: string;
  steps: Step[]; factorRows: FactorRow[]; equivalents: string[]; result: string; confirmed: boolean; staleResult?: boolean;
}
const emptyStep = (): Step => ({ operation: "", result: "" });
const emptyFactorRow = (): FactorRow => ({ divisor: "", cells: [] });
const initialSaved = (): Saved => ({ format: "manual-v1", op: "add", a: "", b: "", extra: [], expression: "", steps: [emptyStep()], factorRows: [emptyFactorRow()], equivalents: [], result: "", confirmed: false });
const shortText = (value: unknown, limit: number): value is string => typeof value === "string" && value.length <= limit;
function load(key: string): Saved {
  const fallback = initialSaved();
  try {
    const saved = JSON.parse(readCalculatorDraft(key) ?? "null") as Partial<Saved> | null;
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
    if (!Array.isArray(steps) || steps.length < 1 || steps.length > MAX_WORK_STEPS || steps.some((step) => !step || !shortText(step.operation, 256) || !shortText(step.result, 64) || (step.left !== undefined && !shortText(step.left, 64)) || (step.right !== undefined && !shortText(step.right, 64)) || (step.operator !== undefined && !["+", "−", "×", "÷"].includes(step.operator)))) return fallback;
    if (!Array.isArray(rows) || rows.length < 1 || rows.length > MAX_FACTOR_ROWS || rows.some((row) => !row || !shortText(row.divisor, 64) || !Array.isArray(row.cells) || row.cells.length > MAX_EXACT_VALUES || row.cells.some((cell) => !shortText(cell, 64)))) return fallback;
    const equivalents = Array.isArray(saved.equivalents) && saved.equivalents.length <= MAX_EXACT_VALUES && saved.equivalents.every((value) => shortText(value, 64)) ? saved.equivalents : [];
    const result = shortText(saved.result, 64) ? saved.result : "";
    const values = saved.op === "simplify" ? [saved.a] : [saved.a, saved.b, ...extra];
    const staleResult = saved.staleResult === true && result.trim() !== "";
    const confirmed = !staleResult && saved.confirmed === true && validManualNumber(result, saved.op === "mcm" || saved.op === "mcd") && !validateManualSetup(saved.op!, values, expression);
    return { format: "manual-v1", op: saved.op!, a: saved.a, b: saved.b, extra, expression, steps, factorRows: rows, equivalents, result, confirmed, staleResult };
  } catch { return fallback; }
}

const field = "block min-h-11 w-full min-w-0 rounded-xl border border-slate-500 bg-slate-950 px-3 font-mono text-lg text-white placeholder:text-slate-500";

/** Dos casillas representan una fracción; sin denominador, es un número. */
function NumberBlocks({ label, value, onChange, integer = false, compact = false }: { label: string; value: string; onChange: (value: string) => void; integer?: boolean; compact?: boolean }) {
  const id = useId();
  const keypadMode = useSheetInputMode("text");
  const slash = value.indexOf("/");
  const numerator = slash < 0 ? value : value.slice(0, slash);
  const denominator = slash < 0 ? "" : value.slice(slash + 1);
  if (compact) return <fieldset className="w-12 shrink-0">
    <legend className="sr-only">{label}</legend>
    <label className="sr-only" htmlFor={`${id}-numerador`}>Numerador o entero de {label}</label>
    <input id={`${id}-numerador`} className="h-14 w-12 rounded-lg border border-slate-600 bg-slate-800/90 text-center font-mono text-2xl text-sky-300 focus:outline-2 focus:outline-cyan-300" inputMode={keypadMode} autoComplete="off" maxLength={64} value={numerator} onChange={(event) => { const next = event.target.value; onChange(next.includes("/") ? next : denominator ? `${next}/${denominator}` : next); }} />
    <span aria-hidden="true" className="my-1 block h-0.5 bg-slate-200" />
    <label className="sr-only" htmlFor={`${id}-denominador`}>Denominador de {label}</label>
    <input id={`${id}-denominador`} className="h-14 w-12 rounded-lg border border-slate-600 bg-slate-800/90 text-center font-mono text-2xl text-emerald-300 focus:outline-2 focus:outline-cyan-300" inputMode={keypadMode} autoComplete="off" maxLength={30} value={denominator} onChange={(event) => onChange(event.target.value ? `${numerator}/${event.target.value}` : numerator)} />
  </fieldset>;
  if (integer) return <label className="block min-w-0 text-sm font-semibold text-slate-200">{label}
    <input className={`${field} mt-1.5`} inputMode={keypadMode} autoComplete="off" maxLength={30} value={value} onChange={(event) => onChange(event.target.value)} />
  </label>;
  return <fieldset className="min-w-0 space-y-1.5">
    <legend className="text-sm font-semibold text-slate-200">{label}</legend>
    <div className="flex items-center gap-2">
      <label className="min-w-0 flex-1 text-xs text-slate-400">Numerador o entero
        <input className={`${field} mt-1`} aria-label={`Numerador o entero de ${label}`} inputMode={keypadMode} autoComplete="off" maxLength={64} value={numerator} onChange={(event) => { const next = event.target.value; onChange(next.includes("/") ? next : denominator ? `${next}/${denominator}` : next); }} />
      </label>
      <span aria-hidden="true" className="mt-5 text-xl text-slate-400">/</span>
      <label className="min-w-0 flex-1 text-xs text-slate-400">Denominador
        <input className={`${field} mt-1`} aria-label={`Denominador de ${label}`} inputMode={keypadMode} autoComplete="off" maxLength={30} value={denominator} onChange={(event) => onChange(event.target.value ? `${numerator}/${event.target.value}` : numerator)} />
      </label>
    </div>
  </fieldset>;
}

/** Detecta si conviene ofrecer equivalencias sin calcularlas. */
function needsCommonDenominator(values: string[]): boolean {
  const denominators = values.map((value) => {
    const text = value.trim().replace(/[−–]/g, "-").replace(/\s/g, "");
    const fraction = /^[+-]?\d+\/([+-]?\d+)$/.exec(text);
    if (fraction && BigInt(fraction[1]) !== BigInt(0)) return BigInt(fraction[1]);
    return null;
  });
  return denominators.length > 1 && denominators.every((value) => value !== null) && denominators.some((value) => value !== denominators[0]);
}

/** Muestra el valor original como referencia; el alumno escribe la equivalencia. */
function FractionReference({ value, index }: { value: string; index: number }) {
  const slash = value.indexOf("/");
  const numerator = slash < 0 ? value : value.slice(0, slash);
  const denominator = slash < 0 ? "" : value.slice(slash + 1);
  return <span role="img" aria-label={`Número ${index + 1}: ${value || "sin escribir"}`} className="block w-14 shrink-0 text-center font-mono text-xl font-bold">
    <span title={numerator} className="block h-10 overflow-hidden text-ellipsis whitespace-nowrap leading-10 text-sky-300">{numerator || "?"}</span>
    <span aria-hidden="true" className="my-1 block h-0.5 bg-slate-200" />
    <span title={denominator} className="block h-10 overflow-hidden text-ellipsis whitespace-nowrap leading-10 text-emerald-300">{denominator || (value ? "1" : "?")}</span>
  </span>;
}

/** La familia de bloques es una hoja libre: solo el alumno escribe pasos y resultado. */
export function ExactCalculator({ storageKey, onResult }: { storageKey: string; onResult: (value: string) => void }) {
  const keypadMode = useSheetInputMode("numeric");
  const [initial] = useState(() => load(storageKey));
  const [op, setOp] = useState<WorkOp>(initial.op);
  const [a, setA] = useState(initial.a);
  const [b, setB] = useState(initial.b);
  const [extra, setExtra] = useState(initial.extra);
  const [expression, setExpression] = useState(initial.expression);
  const [steps, setSteps] = useState(initial.steps);
  const [factorRows, setFactorRows] = useState(initial.factorRows);
  const [equivalents, setEquivalents] = useState(initial.equivalents);
  const [result, setResult] = useState(initial.result);
  const [confirmed, setConfirmed] = useState(initial.confirmed);
  const [staleResult, setStaleResult] = useState(initial.staleResult ?? false);
  const expressionInput = useRef<HTMLInputElement>(null);
  const [showEquivalents, setShowEquivalents] = useState(() => initial.equivalents.some(Boolean) || ((initial.op === "add" || initial.op === "subtract") && needsCommonDenominator([initial.a, initial.b, ...initial.extra])));
  const dismissedEquivalents = useRef(false);
  const [showSteps, setShowSteps] = useState(() => initial.steps.length > 1 || initial.steps.some((step) => step.operation || step.result || step.left || step.right));
  const considerEquivalents = (nextValues: string[]) => { if (!dismissedEquivalents.current && needsCommonDenominator(nextValues)) setShowEquivalents(true); };
  const [problem, setProblem] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<CheckReport | null>(null);
  const unary = op === "simplify", integer = op === "mcm" || op === "mcd", expressionMode = op === "expression";
  const values = unary ? [a] : [a, b, ...extra];
  const fractionBoard = !integer && !expressionMode;
  const symbol = op === "add" ? "+" : op === "subtract" ? "−" : op === "multiply" ? "×" : "÷";
  const final = confirmed ? result.trim().replace(/[−–]/g, "-") : "";
  useEffect(() => { onResult(final); }, [final, onResult]);
  useEffect(() => {
    try { writeCalculatorDraft(storageKey, JSON.stringify({ format: "manual-v1", op, a, b, extra, expression, steps, factorRows, equivalents, result, confirmed, staleResult } satisfies Saved)); } catch { /* la hoja sigue disponible sin almacenamiento */ }
  }, [storageKey, op, a, b, extra, expression, steps, factorRows, equivalents, result, confirmed, staleResult]);
  const invalidate = () => { setConfirmed(false); setProblem(null); setFeedback(null); onResult(""); };
  const invalidateEquation = () => { if (result.trim()) setStaleResult(true); invalidate(); };
  const updateResult = (value: string) => { setResult(value); setStaleResult(false); invalidate(); };
  const insertExpression = (token: string) => {
    const input = expressionInput.current;
    const start = input?.selectionStart ?? expression.length, end = input?.selectionEnd ?? start;
    const next = (expression.slice(0, start) + token + expression.slice(end)).slice(0, 256);
    setExpression(next); invalidateEquation();
    requestAnimationFrame(() => { input?.focus(); input?.setSelectionRange(Math.min(start + token.length, next.length), Math.min(start + token.length, next.length)); });
  };
  const confirm = () => {
    if (staleResult) { setProblem("Revisa o conserva el resultado anterior antes de usarlo."); return; }
    const issue = validateManualSetup(op, values, expression);
    if (issue) { setProblem(issue); setConfirmed(false); onResult(""); return; }
    if (!validManualNumber(result, integer)) { setProblem(integer ? "Escribe tu resultado como número entero." : "Escribe tu resultado como número o fracción con denominador distinto de cero."); setConfirmed(false); onResult(""); return; }
    setProblem(null); setConfirmed(true); onResult(result.trim().replace(/[−–]/g, "-"));
  };
  const check = () => {
    const report = checkManualWork(op, values, expression, steps, factorRows, result, equivalents);
    setFeedback(report);
    if (report.ok) { setProblem(null); setStaleResult(false); setConfirmed(true); onResult(result.trim().replace(/[−–]/g, "-")); }
  };
  const updateStep = (index: number, key: keyof Step, value: string) => { setSteps((old) => old.map((step, i) => i === index ? { ...step, [key]: value } : step)); invalidate(); };
  const updateRow = (index: number, column: number | "divisor", value: string) => {
    setFactorRows((old) => {
      const updated = old.map((row, i) => {
        if (i !== index) return row;
        if (column === "divisor") return { ...row, divisor: value };
        const cells = [...row.cells];
        while (cells.length <= column) cells.push("");
        cells[column] = value;
        return { ...row, cells };
      });
      const last = updated[updated.length - 1];
      if (index === old.length - 1 && updated.length < MAX_FACTOR_ROWS && last.divisor.trim() && values.every((_, i) => last.cells[i]?.trim())) updated.push(emptyFactorRow());
      return updated;
    });
    invalidate();
  };
  const clear = () => { setA(""); setB(""); setExtra([]); setEquivalents([]); setExpression(""); setShowEquivalents(false); dismissedEquivalents.current = false; setShowSteps(false); setSteps([emptyStep()]); setFactorRows([emptyFactorRow()]); setResult(""); setStaleResult(false); invalidate(); };
  return <section aria-labelledby="exact-calculator-title" className="space-y-4">
    <div><h3 id="exact-calculator-title" className="text-base font-bold text-white">Tu hoja de bloques</h3><p className="mt-1 text-sm leading-relaxed text-slate-300">Escribe la cuenta, desarrolla cada paso y coloca tu resultado. Puedes comprobar tu trabajo cuando quieras.</p></div>
    <div className="space-y-4 rounded-2xl border border-slate-700 bg-slate-900/80 p-4">
      <label className="block text-sm font-semibold text-slate-200">Operación
        <select className="mt-1.5 block min-h-11 w-full rounded-xl border border-slate-500 bg-slate-950 px-3 text-base text-white" value={op} onChange={(event) => { setOp(event.target.value as WorkOp); if (event.target.value === "add" || event.target.value === "subtract") considerEquivalents([a, b, ...extra]); invalidateEquation(); }}>
          {EXACT_OPS.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
          <option value="expression">Expresión con paréntesis</option>
        </select>
      </label>
      {expressionMode ? <div><label className="block text-sm font-semibold text-slate-200">Expresión
        <input ref={expressionInput} className={`${field} mt-1.5`} inputMode="text" autoComplete="off" maxLength={256} value={expression} placeholder="(1/2 + 1/3) × 3" onChange={(event) => { setExpression(event.target.value); invalidateEquation(); }} /></label>
        <div className={`${calculatorBoardClass} mt-3`} style={calculatorBoardStyle} role="group" aria-label="Bloques de la expresión">
          <div className="flex min-h-12 w-max items-center gap-1">{(expression.match(/\d+(?:[.,]\d+)?|[.,]\d+|\S/g) ?? []).map((token, index, tokens) => <button key={index} type="button" aria-label={`Quitar bloque ${index + 1}: ${token}`} className="min-h-11 min-w-11 rounded-lg border border-slate-600 bg-slate-800 px-2 font-mono text-xl text-cyan-100" onClick={() => { setExpression(tokens.filter((_, i) => i !== index).join(" ")); invalidateEquation(); }}>{token}</button>)}</div>
        </div>
        <span className="mt-2 block text-xs font-normal text-slate-400">Escribe números y añade signos con los botones. Toca un bloque para quitarlo.</span>
        <span className="mt-2 flex flex-wrap gap-1">{["(", ")", "+", "−", "×", "÷"].map((token) => <button key={token} type="button" aria-label={`Añadir ${token} a la expresión`} className="min-h-11 min-w-11 rounded-lg border border-slate-600 bg-slate-800 px-2 text-xl text-cyan-100" onClick={() => insertExpression(token)}>{token}</button>)}</span>
      </div> : fractionBoard ? <div className="space-y-3">
        <p className="text-sm text-slate-300">Escribe el numerador arriba y el denominador abajo. Deja el denominador vacío para un entero o decimal.</p>
        <div className={calculatorBoardClass} style={calculatorBoardStyle} role="region" aria-label="Operación con fracciones" tabIndex={0}>
          <div className="mx-auto flex w-max items-center gap-1">
            <NumberBlocks compact label={unary ? "Fracción" : "Primera fracción o número"} value={a} onChange={(value) => { setA(value); considerEquivalents([value, b, ...extra]); invalidateEquation(); }} />
            {!unary && <><span aria-hidden="true" className="w-7 text-center text-3xl font-bold text-slate-100">{symbol}</span><NumberBlocks compact label="Segunda fracción o número" value={b} onChange={(value) => { setB(value); considerEquivalents([a, value, ...extra]); invalidateEquation(); }} /></>}
            {!unary && extra.map((value, index) => <div key={index} className="flex items-center gap-1"><span aria-hidden="true" className="w-7 text-center text-3xl font-bold text-slate-100">{symbol}</span><NumberBlocks compact label={`Número ${index + 3}`} value={value} onChange={(next) => { setExtra((old) => old.map((v, i) => i === index ? next : v)); considerEquivalents([a, b, ...extra.map((v, i) => i === index ? next : v)]); invalidateEquation(); }} /></div>)}
            <span aria-hidden="true" className="w-7 text-center text-3xl font-bold text-slate-100">=</span>
            <NumberBlocks compact label="Mi resultado" value={result} onChange={updateResult} />
          </div>
        </div>
        <p className="text-xs text-slate-400">El resultado va en los bloques después del signo igual. Desliza el tablero si no cabe en la pantalla.</p>
        {!unary && <div className="flex flex-wrap gap-2"><button type="button" className={secondaryButton} disabled={extra.length >= MAX_EXACT_VALUES - 2} onClick={() => { setExtra((old) => [...old, ""]); invalidateEquation(); }}>+ Añadir número</button>{extra.map((_, index) => <button key={index} type="button" className={secondaryButton} aria-label={`Quitar número ${index + 3}`} onClick={() => { setExtra((old) => old.filter((_, i) => i !== index)); setEquivalents((old) => old.filter((_, i) => i !== index + 2)); setFactorRows((old) => old.map((row) => ({ ...row, cells: row.cells.filter((_, column) => column !== index + 2) }))); invalidateEquation(); }}>Quitar {index + 3}</button>)}</div>}
        {(op === "add" || op === "subtract") && <details open={showEquivalents} onToggle={(event) => setShowEquivalents(event.currentTarget.open)} className="space-y-3">
          <summary onClick={() => { dismissedEquivalents.current = showEquivalents; }} className="cursor-pointer font-bold text-cyan-100">Preparar denominador común (opcional)</summary>
          <p className="text-sm text-slate-300">Si los denominadores son diferentes, escribe una fracción equivalente para cada número usando el mismo denominador. Puedes usar cualquier múltiplo común.</p>
          <div className={`${calculatorBoardClass} space-y-3`} style={calculatorBoardStyle}>
            {values.map((value, index) => <div key={index} role="group" aria-label={`Equivalencia del número ${index + 1}`} className="flex items-center justify-center gap-3">
              <FractionReference value={value} index={index} />
              <span aria-hidden="true" className="text-3xl font-bold text-slate-100">=</span>
              <NumberBlocks compact label={`Equivalente del número ${index + 1}`} value={equivalents[index] ?? ""} onChange={(next) => { setEquivalents((old) => { const updated = [...old]; while (updated.length <= index) updated.push(""); updated[index] = next; return updated; }); invalidate(); }} />
            </div>)}
          </div>
          <p className="text-xs text-slate-400">Multiplica o divide el numerador y el denominador por el mismo número. Después puedes usar estas fracciones en «Mis pasos».</p>
        </details>}
      </div> : <div className="space-y-3">
        <NumberBlocks label={unary ? "Fracción" : integer ? "Primer entero" : "Primera fracción o número"} value={a} integer={integer} onChange={(value) => { setA(value); considerEquivalents([value, b, ...extra]); invalidateEquation(); }} />
        {!unary && <NumberBlocks label={integer ? "Segundo entero" : "Segunda fracción o número"} value={b} integer={integer} onChange={(value) => { setB(value); considerEquivalents([a, value, ...extra]); invalidateEquation(); }} />}
        {!unary && extra.map((value, index) => <div key={index} className="flex min-w-0 items-end gap-2"><div className="min-w-0 flex-1"><NumberBlocks label={integer ? `Entero ${index + 3}` : `Número ${index + 3}`} value={value} integer={integer} onChange={(next) => { setExtra((old) => old.map((v, i) => i === index ? next : v)); considerEquivalents([a, b, ...extra.map((v, i) => i === index ? next : v)]); invalidateEquation(); }} /></div><button type="button" aria-label={`Quitar número ${index + 3}`} className={`${secondaryButton} shrink-0`} onClick={() => { setExtra((old) => old.filter((_, i) => i !== index)); setEquivalents((old) => old.filter((_, i) => i !== index + 2)); setFactorRows((old) => old.map((row) => ({ ...row, cells: row.cells.filter((_, column) => column !== index + 2) }))); invalidateEquation(); }}>Quitar</button></div>)}
        {!unary && <button type="button" className={secondaryButton} disabled={extra.length >= MAX_EXACT_VALUES - 2} onClick={() => { setExtra((old) => [...old, ""]); invalidateEquation(); }}>+ Añadir número</button>}
        <p className="text-xs text-slate-400">Hasta {MAX_EXACT_VALUES} números. {integer ? "Escribe enteros." : "Deja el denominador vacío para escribir un entero o decimal."}</p>
      </div>}
      <button type="button" className={secondaryButton} onClick={clear}>Limpiar cuenta</button>
    </div>
    {integer && <section aria-label="Tabla de factores" className="space-y-3 rounded-2xl border border-slate-700 bg-slate-900/80 p-4">
      <h4 className="font-bold text-white">Tabla de factores</h4>
      <p className="text-sm text-slate-300">Escribe cada divisor y los números que quedan en la fila siguiente. Al completar una fila aparece otra vacía.</p>
      <FactorTable calculator columns={values.length} rows={factorRows.length + 1} label="Tabla desplazable de factores"
        renderValue={(row, column) => row === 0
          ? <><span title={values[column]} className={`block w-11 truncate text-2xl font-bold tabular-nums ${["text-rose-300", "text-sky-300", "text-emerald-300"][column % 3]}`}>{values[column] || "—"}</span><span className="sr-only">Número {column + 1}</span></>
          : <input className={`h-14 w-11 rounded-lg border border-slate-600 bg-slate-800/90 text-center font-mono text-2xl focus:outline-2 focus:outline-cyan-300 ${["text-rose-300", "text-sky-300", "text-emerald-300"][column % 3]}`} aria-label={`Fila ${row}, número ${column + 1}`} inputMode={keypadMode} autoComplete="off" maxLength={64} value={factorRows[row - 1].cells[column] ?? ""} onChange={(event) => updateRow(row - 1, column, event.target.value)} />}
        renderDivisor={(row) => factorRows[row] && <input className="h-14 w-11 rounded-lg border border-slate-600 bg-slate-800/90 text-center font-mono text-2xl text-amber-200 focus:outline-2 focus:outline-cyan-300" aria-label={`Divisor de la fila ${row + 1}`} inputMode={keypadMode} autoComplete="off" maxLength={64} value={factorRows[row].divisor} onChange={(event) => updateRow(row, "divisor", event.target.value)} />} />
      {values.length > 3 && <p className="text-xs text-slate-400">Si no ves todas las columnas, desliza la tabla horizontalmente.</p>}
      <div className="flex flex-wrap gap-2"><button type="button" className={secondaryButton} disabled={factorRows.length >= MAX_FACTOR_ROWS} onClick={() => { setFactorRows((old) => [...old, emptyFactorRow()]); invalidate(); }}>Añadir fila</button><button type="button" className={secondaryButton} disabled={factorRows.length <= 1} onClick={() => { setFactorRows((old) => old.slice(0, -1)); invalidate(); }}>Quitar última fila</button></div>
    </section>}
    <section aria-label="Mi resultado" className="space-y-3 rounded-2xl border border-cyan-400/30 bg-cyan-950/30 p-4">
      <h4 className="font-bold text-white">Mi resultado</h4>
      {fractionBoard ? <p className="text-sm text-slate-300">Escribe tu resultado en el tablero de arriba.</p> : <NumberBlocks label="Mi resultado" value={result} integer={integer} onChange={updateResult} />}
      <p className="text-xs text-slate-300">Comprueba tu trabajo para recibir pistas y usar el resultado si es correcto.</p>
      {staleResult && <div className="space-y-2 text-sm text-amber-200"><p>La cuenta cambió. Revisa el resultado anterior antes de usarlo.</p><button type="button" className={secondaryButton} onClick={() => setStaleResult(false)}>Conservar resultado</button></div>}
      {problem && <p role="alert" className="text-sm text-amber-200">{problem}</p>}
      <button type="button" className={secondaryButton} onClick={check}>Comprobar mi trabajo</button>
      {feedback && <div role="status" className={`space-y-1 rounded-xl p-3 text-sm ${feedback.ok ? "bg-emerald-950/60 text-emerald-100" : "bg-amber-950/60 text-amber-100"}`}><p className="font-semibold">{feedback.message}</p>{feedback.details.map((detail, i) => <p key={i}>{detail}</p>)}</div>}
      <div className="flex flex-wrap gap-2">{!confirmed && <button type="button" className={primaryButton} disabled={staleResult} onClick={confirm}>Confirmar mi resultado</button>}<button type="button" className={secondaryButton} disabled={!confirmed} onClick={() => { if (expressionMode) setExpression(result); else setA(result); invalidateEquation(); }}>{expressionMode ? "Copiar a la expresión" : "Copiar al primer número"}</button></div>
      {confirmed && <p role="status" className="text-sm text-cyan-100">Resultado escrito: {result}</p>}
    </section>
    <details open={showSteps} onToggle={(event) => setShowSteps(event.currentTarget.open)} className="space-y-3 rounded-2xl border border-slate-700 bg-slate-900/80 p-4">
      <summary className="cursor-pointer font-bold text-white">Mis pasos (opcional)</summary>
      <p className="text-sm text-slate-300">Completa los bloques con tus operaciones y resultados intermedios. Puedes añadir o quitar pasos.</p>
      {steps.map((step, i) => <fieldset key={i} className="space-y-2 rounded-xl border border-slate-700 p-3"><legend className="px-1 text-sm font-bold text-cyan-200">Paso {i + 1}</legend>
        {step.left !== undefined ? <div className={calculatorBoardClass} style={calculatorBoardStyle} role="region" aria-label={`Fracciones del paso ${i + 1}`} tabIndex={0}>
          <div className="mx-auto flex w-max items-center gap-1">
            <NumberBlocks compact label={`Primera fracción del paso ${i + 1}`} value={step.left} onChange={(value) => updateStep(i, "left", value)} />
            <label className="sr-only" htmlFor={`operador-paso-${i}`}>Operación del paso {i + 1}</label>
            <select id={`operador-paso-${i}`} value={step.operator ?? "+"} onChange={(event) => updateStep(i, "operator", event.target.value)} className="min-h-11 w-12 rounded-lg border border-slate-600 bg-slate-900 text-center text-xl text-white">
              {["+", "−", "×", "÷"].map((symbol) => <option key={symbol}>{symbol}</option>)}
            </select>
            <NumberBlocks compact label={`Segunda fracción del paso ${i + 1}`} value={step.right ?? ""} onChange={(value) => updateStep(i, "right", value)} />
            <span aria-hidden="true" className="text-2xl font-bold text-slate-100">=</span>
            <NumberBlocks compact label={`Resultado del paso ${i + 1}`} value={step.result} onChange={(value) => updateStep(i, "result", value)} />
          </div>
        </div> : <><label className="block text-sm text-slate-300">Operación del paso {i + 1}<input className={`${field} mt-1`} inputMode="text" maxLength={256} value={step.operation} onChange={(event) => updateStep(i, "operation", event.target.value)} /></label>
        <label className="block text-sm text-slate-300">Resultado del paso {i + 1}<input className={`${field} mt-1`} inputMode="text" maxLength={64} value={step.result} onChange={(event) => updateStep(i, "result", event.target.value)} /></label></>}
        {steps.length > 1 && <button type="button" className={secondaryButton} onClick={() => { setSteps((old) => old.filter((_, n) => n !== i)); invalidate(); }}>Quitar paso {i + 1}</button>}
      </fieldset>)}
      <div className="flex flex-wrap gap-2"><button type="button" className={secondaryButton} disabled={steps.length >= MAX_WORK_STEPS} onClick={() => { setSteps((old) => [...old, emptyStep()]); invalidate(); }}>Añadir paso</button>
      <button type="button" className={secondaryButton} disabled={steps.length >= MAX_WORK_STEPS} onClick={() => { setSteps((old) => [...old, { operation: "", result: "", left: "", right: "", operator: "+" }]); invalidate(); }}>Añadir paso con fracciones</button></div>
    </details>

  </section>;
}
