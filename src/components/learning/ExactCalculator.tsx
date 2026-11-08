"use client";

import { useEffect, useState } from "react";
import { EXACT_OPS, calculateExact, type ExactOp, type ExactOutcome } from "@/lib/learning/exactCalculator";
import { primaryButton, secondaryButton } from "./LearningShell";

interface Saved { op: ExactOp; a: string; b: string; calculated: boolean }
function load(key: string): Saved {
  const fallback: Saved = { op: "add", a: "", b: "", calculated: false };
  try {
    const saved = JSON.parse(sessionStorage.getItem(key) ?? "null") as Partial<Saved> | null;
    if (!saved || !EXACT_OPS.some((item) => item.id === saved.op) || typeof saved.a !== "string" || typeof saved.b !== "string" || saved.a.length > 64 || saved.b.length > 64) return fallback;
    return { op: saved.op!, a: saved.a, b: saved.b, calculated: saved.calculated === true };
  } catch { return fallback; }
}

/** Cuentas exactas separadas de la hoja libre: muestra cómo se obtiene el resultado. */
export function ExactCalculator({ storageKey, onResult }: { storageKey: string; onResult: (value: string) => void }) {
  const [initial] = useState(() => load(storageKey));
  const [op, setOp] = useState<ExactOp>(initial.op);
  const [a, setA] = useState(initial.a);
  const [b, setB] = useState(initial.b);
  const [outcome, setOutcome] = useState<ExactOutcome | null>(() => initial.calculated ? calculateExact(initial.op, initial.a, initial.b) : null);
  const result = outcome && "value" in outcome ? outcome.value : "";
  const unary = op === "simplify";
  const integer = op === "mcm" || op === "mcd";
  useEffect(() => { onResult(result); }, [result, onResult]);
  useEffect(() => {
    try { sessionStorage.setItem(storageKey, JSON.stringify({ op, a, b, calculated: Boolean(result) } satisfies Saved)); } catch { /* la calculadora sigue disponible sin almacenamiento */ }
  }, [storageKey, op, a, b, result]);
  const clearResult = () => { setOutcome(null); onResult(""); };
  const calculate = () => {
    const next = calculateExact(op, a, b);
    setOutcome(next);
    onResult("value" in next ? next.value : "");
  };
  const field = "mt-1 block min-h-11 w-full max-w-48 rounded-xl border border-slate-500 bg-slate-950 px-3 font-mono text-lg text-white";
  return <section aria-labelledby="exact-calculator-title" className="space-y-4">
    <h3 id="exact-calculator-title" className="text-sm font-bold text-cyan-200">Fracciones y divisibilidad</h3>
    <p className="text-sm text-slate-300">Escribe enteros, decimales o fracciones como −3/4. Usa hasta 30 cifras por entero y seis decimales. El resultado se simplifica y se muestran los pasos.</p>
    <label className="block text-sm text-slate-300">Operación
      <select className={field} value={op} onChange={(event) => { setOp(event.target.value as ExactOp); clearResult(); }}>
        {EXACT_OPS.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
      </select>
    </label>
    <div className="flex flex-wrap items-end gap-3">
      <label className="text-sm text-slate-300">{unary ? "Fracción" : integer ? "Primer entero" : "Primera fracción o número"}
        <input className={field} inputMode="text" autoComplete="off" maxLength={64} value={a} placeholder={integer ? "12" : "3/4"} onChange={(event) => { setA(event.target.value); clearResult(); }} />
      </label>
      {!unary && <label className="text-sm text-slate-300">{integer ? "Segundo entero" : "Segunda fracción o número"}
        <input className={field} inputMode="text" autoComplete="off" maxLength={64} value={b} placeholder={integer ? "18" : "2/3"} onChange={(event) => { setB(event.target.value); clearResult(); }} />
      </label>}
      <button type="button" className={primaryButton} onClick={calculate}>Calcular</button>
    </div>
    {integer && <p className="text-xs text-slate-400">El MCD y el MCM se calculan con números enteros.</p>}
    {outcome && "problem" in outcome && <p role="alert" className="text-sm text-amber-200">{outcome.problem}</p>}
    {outcome && "value" in outcome && <div className="space-y-3 rounded-xl border border-cyan-400/30 bg-slate-900 p-4">
      <p className="font-bold text-cyan-100">Resultado exacto: <span className="font-mono">{outcome.value}</span></p>
      <ol className="list-decimal space-y-1 pl-5 text-sm text-slate-200">{outcome.steps.map((step, i) => <li key={i}>{step}</li>)}</ol>
      <button type="button" className={secondaryButton} disabled={"problem" in calculateExact("simplify", outcome.value, "")} onClick={() => { setA(outcome.value); setB(""); clearResult(); }}>Usar como primer número</button>
      {"problem" in calculateExact("simplify", outcome.value, "") && <p className="text-xs text-slate-400">El resultado es demasiado largo para otra operación, pero puedes copiarlo.</p>}
    </div>}
  </section>;
}
