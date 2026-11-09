"use client";

import { useEffect, useState } from "react";
import { EXACT_OPS, MAX_EXACT_VALUES, calculateExact, calculateExpression, calculateManyExact, type ExactOp, type ExactOutcome } from "@/lib/learning/exactCalculator";
import { primaryButton, secondaryButton } from "./LearningShell";

type WorkOp = ExactOp | "expression";
interface Saved { op: WorkOp; a: string; b: string; extra: string[]; expression: string; calculated: boolean }
const initialSaved = (): Saved => ({ op: "add", a: "", b: "", extra: [], expression: "", calculated: false });
function load(key: string): Saved {
  const fallback = initialSaved();
  try {
    const saved = JSON.parse(sessionStorage.getItem(key) ?? "null") as Partial<Saved> | null;
    if (!saved || (saved.op !== "expression" && !EXACT_OPS.some((item) => item.id === saved.op)) || typeof saved.a !== "string" || typeof saved.b !== "string" || saved.a.length > 64 || saved.b.length > 64) return fallback;
    const extra = saved.extra === undefined ? [] : saved.extra;
    if (!Array.isArray(extra) || extra.length > MAX_EXACT_VALUES - 2 || extra.some((v) => typeof v !== "string" || v.length > 64)) return fallback;
    const expression = saved.expression ?? "";
    if (typeof expression !== "string" || expression.length > 256) return fallback;
    return { op: saved.op!, a: saved.a, b: saved.b, extra, expression, calculated: saved.calculated === true };
  } catch { return fallback; }
}
function evaluate(op: WorkOp, a: string, b: string, extra: string[], expression: string): ExactOutcome {
  if (op === "expression") return calculateExpression(expression);
  if (op === "simplify" || extra.length === 0) return calculateExact(op, a, b);
  return calculateManyExact(op, [a, b, ...extra]);
}

/** Cuentas exactas separadas de la hoja libre: muestra cómo se obtiene el resultado. */
export function ExactCalculator({ storageKey, onResult }: { storageKey: string; onResult: (value: string) => void }) {
  const [initial] = useState(() => load(storageKey));
  const [op, setOp] = useState<WorkOp>(initial.op);
  const [a, setA] = useState(initial.a);
  const [b, setB] = useState(initial.b);
  const [extra, setExtra] = useState(initial.extra);
  const [expression, setExpression] = useState(initial.expression);
  const [outcome, setOutcome] = useState<ExactOutcome | null>(() => initial.calculated ? evaluate(initial.op, initial.a, initial.b, initial.extra, initial.expression) : null);
  const result = outcome && "value" in outcome ? outcome.value : "";
  const unary = op === "simplify";
  const integer = op === "mcm" || op === "mcd";
  const expressionMode = op === "expression";
  useEffect(() => { onResult(result); }, [result, onResult]);
  useEffect(() => {
    try { sessionStorage.setItem(storageKey, JSON.stringify({ op, a, b, extra, expression, calculated: Boolean(result) } satisfies Saved)); } catch { /* la calculadora sigue disponible sin almacenamiento */ }
  }, [storageKey, op, a, b, extra, expression, result]);
  const clearResult = () => { setOutcome(null); onResult(""); };
  const calculate = () => {
    const next = evaluate(op, a, b, extra, expression);
    setOutcome(next);
    onResult("value" in next ? next.value : "");
  };
  const field = "mt-1.5 block min-h-11 w-full rounded-xl border border-slate-500 bg-slate-950 px-3 font-mono text-lg text-white placeholder:text-slate-500";
  const canReuse = result && !("problem" in calculateExact("simplify", result, ""));
  return <section aria-labelledby="exact-calculator-title" className="space-y-4">
    <div><h3 id="exact-calculator-title" className="text-base font-bold text-white">Calcula y explora</h3><p className="mt-1 text-sm leading-relaxed text-slate-300">Combina números, fracciones y decimales. Verás el resultado exacto y sus pasos.</p></div>
    <div className="space-y-4 rounded-2xl border border-slate-700 bg-slate-900/80 p-4">
      <label className="block text-sm font-semibold text-slate-200">Operación
        <select className="mt-1.5 block min-h-11 w-full rounded-xl border border-slate-500 bg-slate-950 px-3 text-base text-white" value={op} onChange={(event) => { setOp(event.target.value as WorkOp); clearResult(); }}>
          {EXACT_OPS.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
          <option value="expression">Expresión con paréntesis</option>
        </select>
      </label>
      {expressionMode ? <div className="space-y-1">
        <label className="block text-sm font-semibold text-slate-200">Expresión
          <input className={field} inputMode="text" autoComplete="off" maxLength={256} value={expression} placeholder="(1/2 + 1/3) × 3" onChange={(event) => { setExpression(event.target.value); clearResult(); }} />
        </label>
        <p className="text-xs leading-relaxed text-slate-400">Usa +, −, * (×), / (÷) y paréntesis. Se respeta el orden de las operaciones; admite hasta 32 números de 30 cifras y 6 decimales.</p>
      </div> : <>
        <div className="grid grid-cols-2 gap-3">
          <label className={`${unary ? "col-span-2" : ""} block min-w-0 text-sm font-semibold text-slate-200`}>{unary ? "Fracción" : integer ? "Primer entero" : "Primera fracción o número"}
            <input className={field} inputMode="text" autoComplete="off" maxLength={64} value={a} placeholder={integer ? "12" : "3/4"} onChange={(event) => { setA(event.target.value); clearResult(); }} />
          </label>
          {!unary && <label className="block min-w-0 text-sm font-semibold text-slate-200">{integer ? "Segundo entero" : "Segunda fracción o número"}
            <input className={field} inputMode="text" autoComplete="off" maxLength={64} value={b} placeholder={integer ? "18" : "2/3"} onChange={(event) => { setB(event.target.value); clearResult(); }} />
          </label>}
          {!unary && extra.map((value, index) => <div key={index} className="col-span-2 flex min-w-0 items-end gap-2">
            <label className="block min-w-0 flex-1 text-sm font-semibold text-slate-200">{integer ? `Entero ${index + 3}` : `Número ${index + 3}`}
              <input className={field} inputMode="text" autoComplete="off" maxLength={64} value={value} placeholder={integer ? "24" : "1/4"} onChange={(event) => { const next = event.target.value; setExtra((old) => old.map((v, i) => i === index ? next : v)); clearResult(); }} />
            </label>
            <button type="button" aria-label={`Quitar número ${index + 3}`} className={`${secondaryButton} shrink-0`} onClick={() => { setExtra((old) => old.filter((_, i) => i !== index)); clearResult(); }}>Quitar</button>
          </div>)}
        </div>
        {!unary && <div className="space-y-2">
          <button type="button" className={secondaryButton} disabled={extra.length >= MAX_EXACT_VALUES - 2} onClick={() => { setExtra((old) => [...old, ""]); clearResult(); }}>+ Añadir número</button>
          <p className="text-xs text-slate-400">Hasta {MAX_EXACT_VALUES} números.{op === "subtract" || op === "divide" ? " Se resuelve de izquierda a derecha." : ""}{integer ? " Usa enteros." : " Usa / para las fracciones."}</p>
        </div>}
        <p className="text-xs text-slate-400">Hasta 30 cifras por entero y 6 decimales.</p>
      </>}
      <div className="flex flex-wrap gap-2">
        <button type="button" className={`${primaryButton} min-w-24 flex-1 justify-center`} onClick={calculate}>Calcular</button>
        <button type="button" className={secondaryButton} disabled={!a && !b && !extra.length && !expression && !outcome} onClick={() => { setA(""); setB(""); setExtra([]); setExpression(""); clearResult(); }}>Limpiar cuenta</button>
      </div>
    </div>
    {outcome && "problem" in outcome && <p role="alert" className="rounded-xl border border-amber-400/40 bg-amber-950/40 p-3 text-sm text-amber-100">{outcome.problem}</p>}
    {outcome && "value" in outcome && <div className="space-y-3 rounded-2xl border border-cyan-400/30 bg-cyan-950/30 p-4">
      <p className="text-xs font-bold uppercase tracking-wider text-cyan-200">Resultado exacto</p>
      <p className="break-all text-xl font-bold text-white">Resultado exacto: <span className="font-mono">{outcome.value}</span></p>
      <details open className="text-sm text-slate-200"><summary className="cursor-pointer font-bold">Ver pasos</summary><ol className="mt-2 list-decimal space-y-2 break-words pl-5">{outcome.steps.map((step, i) => <li key={i}>{step}</li>)}</ol></details>
      <button type="button" className={secondaryButton} disabled={!canReuse} onClick={() => { if (expressionMode) setExpression(outcome.value); else { setA(outcome.value); setB(""); setExtra([]); } clearResult(); }}>Usar como primer número</button>
      {!canReuse && <p className="text-xs text-slate-400">El resultado es demasiado largo para otra operación, pero puedes copiarlo.</p>}
    </div>}
  </section>;
}
