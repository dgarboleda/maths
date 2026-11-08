"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight, ClipboardCopy, RotateCcw, X } from "lucide-react";
import {
  CALCULATOR_OPS,
  calculatorEntry,
  calculatorResult,
  calculatorSpec,
  decimalInput,
  entryText,
  hasDecimals,
  type CalculatorEntry,
  type CalculatorOp,
  type CalculatorSpec,
} from "@/lib/learning/calculator";
import { divisionTrace, isDecimalDivision, parseNumber } from "@/lib/learning/core";
import { primaryButton, secondaryButton } from "./LearningShell";
import { ColumnSheet, OptionPicker, useSubtractStrategy } from "./ColumnOperation";
import { DivisionSheet } from "./DivisionOperation";
import { MultiplySheet } from "./MultiplyOperation";
import { NumericKeypadArea } from "./NumericKeypad";
import type { CalculatorTarget } from "./Calculator";
import { ExactCalculator } from "./ExactCalculator";
import styles from "./calculator.module.css";

/* El panel de la calculadora: una cadena de cuentas terminadas, la cuenta
 * en curso (escrita en la hoja de columnas, de multiplicar o en la galera) y
 * el resultado final para copiar o pasar a la pantalla. La cadena y lo
 * escrito en los números se conservan en esta pestaña al cambiar de pantalla. */

interface Saved {
  chain: CalculatorEntry[];
  op: CalculatorOp;
  a: string;
  b: string;
}

function load(key: string): Saved | null {
  try {
    const raw = sessionStorage.getItem(key);
    const saved = raw ? (JSON.parse(raw) as Saved) : null;
    return saved && Array.isArray(saved.chain) ? saved : null;
  } catch {
    return null;
  }
}

export function CalculatorPanel({
  id,
  open,
  onClose,
  target,
  storageKey,
}: {
  id: string;
  open: boolean;
  onClose: () => void;
  target: CalculatorTarget | null;
  storageKey: string;
}) {
  const [initial] = useState(() => load(storageKey));
  const [mode, setMode] = useState<"written" | "exact">("written");
  const [exactResult, setExactResult] = useState("");
  const [chain, setChain] = useState<CalculatorEntry[]>(initial?.chain ?? []);
  const [op, setOp] = useState<CalculatorOp>(initial?.op ?? "add");
  const [a, setA] = useState(initial?.a ?? "");
  const [b, setB] = useState(initial?.b ?? "");
  const [continueDecimal, setContinueDecimal] = useState(false);
  const [spec, setSpec] = useState<CalculatorSpec | null>(null);
  const [written, setWritten] = useState<{ op: CalculatorOp; a: string; b: string } | null>(null);
  const [work, setWork] = useState("");
  const [revision, setRevision] = useState(0);
  const [problem, setProblem] = useState<string | null>(null);
  // Aviso de la última copia: solo se muestra mientras el resultado final siga siendo ese.
  const [copied, setCopied] = useState<{ value: string; text: string } | null>(null);
  const [targetIndex, setTargetIndex] = useState(0);
  const [strategy] = useSubtractStrategy();
  const heading = useRef<HTMLHeadingElement>(null);
  const second = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      sessionStorage.setItem(storageKey, JSON.stringify({ chain, op, a, b } satisfies Saved));
    } catch {
      /* sin almacenamiento, la cadena dura mientras la pantalla esté abierta */
    }
  }, [storageKey, chain, op, a, b]);
  useEffect(() => {
    if (open) heading.current?.focus();
  }, [open]);

  const write = (next = { op, a, b }, decimals = continueDecimal) => {
    const outcome = calculatorSpec(next.op, next.a, next.b, decimals);
    if ("problem" in outcome) return setProblem(outcome.problem);
    setProblem(null);
    setWork("");
    setRevision((n) => n + 1);
    setSpec(outcome.spec);
    setWritten(next);
  };
  // Con coma en los números, la división siempre sigue con decimales.
  const forcedDecimals = a.includes(",") || b.includes(",");
  /** La casilla se aplica al momento a la división que ya está escrita. */
  const toggleDecimals = (on: boolean) => {
    setContinueDecimal(on);
    if (written?.op === "divide") write(written, on);
  };
  const result = spec ? calculatorResult(spec, work) : "";
  const last = chain.at(-1);
  const final = mode === "written" ? result || last?.result || "" : exactResult;
  const copyNotice = copied?.value === final ? copied.text : null;
  // Si la pantalla cambia de destinos, se vuelve al primero.
  const index = target && targetIndex < target.labels.length ? targetIndex : 0;
  const needsInteger = Boolean(target?.integerOnly && final && !/^[+-]?\d+(?:[,.]0+)?$/.test(final));
  const incompatibleTarget = Boolean(target && final && (needsInteger || parseNumber(final) === null));

  /** Guarda la cuenta en la cadena y empieza otra con su resultado. */
  const continueWith = () => {
    if (!spec || !written || !result) return;
    setChain((c) => [...c, calculatorEntry(written.op, written.a, written.b, spec, work)]);
    setA(result);
    setB("");
    setSpec(null);
    setWritten(null);
    setWork("");
    requestAnimationFrame(() => second.current?.focus());
  };
  /** Un resultado de la cadena pasa al primer número vacío de la cuenta nueva. */
  const reuse = (value: string) => {
    if (!a) setA(value);
    else setB(value);
  };
  const reset = () => {
    setChain([]);
    setA("");
    setB("");
    setSpec(null);
    setWritten(null);
    setWork("");
    setProblem(null);
  };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(final);
      setCopied({ value: final, text: `Copiado: ${final}` });
    } catch {
      setCopied({ value: final, text: `No se pudo copiar. El resultado es ${final}.` });
    }
  };
  const useInTarget = () => {
    if (!target || !final || incompatibleTarget) return;
    target.onUse(target.integerOnly ? final.replace(/[,.]0+$/, "") : final, index);
    onClose();
  };

  const field = "mt-1 block min-h-11 w-32 rounded-xl border border-slate-500 bg-slate-950 px-3 font-mono text-lg text-white";
  const remainderNote = result && spec?.op === "divide" && isDecimalDivision(spec) && divisionTrace(spec).remainder !== 0;

  return (
    <aside
      id={id}
      aria-labelledby={`${id}-title`}
      hidden={!open}
      className={styles.panel}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.stopPropagation();
          onClose();
        }
      }}
    >
      <header className="flex items-center gap-3 border-b border-slate-700 px-4 py-3">
        <h2 id={`${id}-title`} ref={heading} tabIndex={-1} className="font-display text-xl font-bold text-white">
          Calculadora
        </h2>
        <button type="button" aria-label="Cerrar la calculadora" onClick={onClose}
          className="ml-auto grid size-11 place-items-center rounded-xl text-slate-300 hover:bg-white/5 hover:text-white">
          <X size={20} aria-hidden="true" />
        </button>
      </header>
      <div className={`${styles.body} space-y-4`}>
        <p className="text-xs text-slate-400">Usa la hoja para escribir una cuenta o calcula fracciones, MCM y MCD con sus pasos.</p>
        <div role="group" aria-label="Tipo de calculadora" className="flex flex-wrap gap-2">
          <button type="button" aria-pressed={mode === "written"} className={mode === "written" ? primaryButton : secondaryButton} onClick={() => setMode("written")}>Cuentas escritas</button>
          <button type="button" aria-pressed={mode === "exact"} className={mode === "exact" ? primaryButton : secondaryButton} onClick={() => setMode("exact")}>Fracciones y MCM</button>
        </div>
        <div hidden={mode !== "exact"}><ExactCalculator storageKey={`${storageKey}:exacta`} onResult={setExactResult} /></div>
        <div hidden={mode !== "written"} className="space-y-4">

        {chain.length > 0 && (
          <section aria-labelledby={`${id}-chain`} className="space-y-2">
            <h3 id={`${id}-chain`} className="text-sm font-bold text-cyan-200">Cadena de cuentas</h3>
            <ol className="space-y-1.5">
              {chain.map((entry, i) => (
                <li key={i} className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2">
                  <span className="text-xs font-bold text-slate-400">{i + 1}.</span>
                  <span className="font-mono text-base text-slate-100">{entryText(entry)}</span>
                  <button type="button" onClick={() => reuse(entry.result)} aria-label={`Usar ${entry.result} en la cuenta nueva`}
                    className="ml-auto min-h-9 rounded-lg border border-slate-600 px-2.5 text-xs font-semibold text-cyan-100 hover:bg-slate-800">
                    Usar
                  </button>
                </li>
              ))}
            </ol>
          </section>
        )}

        <section aria-labelledby={`${id}-new`} className="space-y-3">
          <h3 id={`${id}-new`} className="text-sm font-bold text-cyan-200">{chain.length ? "Cuenta siguiente" : "Cuenta"}</h3>
          <OptionPicker label="Operación de la calculadora" options={CALCULATOR_OPS} value={op} onChange={setOp} />
          <div className="flex flex-wrap items-end gap-3">
            <label className="text-sm text-slate-300">
              {op === "divide" ? "Dividendo" : op === "multiply" ? "Primer factor" : "Primer número"}
              <input className={field} inputMode="decimal" maxLength={11} value={a} onChange={(e) => setA(decimalInput(e.target.value))} />
            </label>
            <label className="text-sm text-slate-300">
              {op === "divide" ? "Divisor" : op === "multiply" ? "Segundo factor" : "Segundo número"}
              <input ref={second} className={field} inputMode="decimal" maxLength={11} value={b} onChange={(e) => setB(decimalInput(e.target.value))} />
            </label>
            <button type="button" className={secondaryButton} onClick={() => write()}>
              Escribir la cuenta
            </button>
          </div>
          {op === "divide" && (
            <label className="flex items-center gap-2 text-sm text-slate-300">
              <input
                type="checkbox"
                checked={continueDecimal || forcedDecimals}
                disabled={forcedDecimals}
                onChange={(e) => toggleDecimals(e.target.checked)}
              />
              Continuar la división con decimales
              {forcedDecimals && <span className="text-xs text-slate-400">(con coma en los números, siempre)</span>}
            </label>
          )}
          {problem && <p role="alert" className="text-sm text-amber-200">{problem}</p>}
          {spec && (
            <>
              {/* En el panel no hay navegación inferior: el teclado va pegado abajo. */}
              <NumericKeypadArea bottom="0px" comma={hasDecimals(spec)}>
                {spec.op === "divide" ? (
                  <DivisionSheet key={`division-${revision}`} spec={spec} layout="completa" mode="open" response="" onChange={setWork} />
                ) : spec.op === "multiply" ? (
                  <MultiplySheet key={`multiply-${revision}`} spec={spec} mode="free" response="" onChange={setWork} />
                ) : (
                  <ColumnSheet key={`${revision}-${strategy}`} spec={spec} strategy={strategy} mode="free" response="" onChange={setWork} />
                )}
              </NumericKeypadArea>
              {remainderNote && (
                <p className="text-sm text-amber-200">El cociente es incompleto: todavía queda un resto. Si lo usas, la cuenta siguiente será aproximada.</p>
              )}
              {result && (
                <button type="button" className={primaryButton} onClick={continueWith}>
                  Seguir con {result} <ArrowRight size={16} aria-hidden="true" />
                </button>
              )}
            </>
          )}
        </section>
        </div>
      </div>

      <footer className={`${styles.footer} space-y-2`}>
        <p className="text-sm text-slate-300" aria-live="polite">
          {final ? (
            <>
              Resultado final: <strong className="font-mono text-lg text-cyan-100">{final}</strong>
            </>
          ) : (
            mode === "written" ? "Escribe el resultado en la hoja para usarlo." : "Calcula para usar el resultado."
          )}
        </p>
        <div className="flex flex-wrap items-end gap-2">
          <button type="button" className={secondaryButton} disabled={!final} onClick={() => void copy()}>
            <ClipboardCopy size={16} aria-hidden="true" />
            Copiar
          </button>
          {target && target.labels.length > 1 && (
            <label className="text-sm text-slate-300">
              Copiar en
              <select className={`${field} w-auto`} value={index} onChange={(e) => setTargetIndex(Number(e.target.value))}>
                {target.labels.map((label, i) => (
                  <option key={label} value={i}>{label}</option>
                ))}
              </select>
            </label>
          )}
          {target && (
            <button type="button" className={primaryButton} disabled={!final || incompatibleTarget} onClick={useInTarget}>
              {final ? `Usar ${final}${target.labels.length > 1 ? "" : ` en ${target.labels[0]}`}` : "Usar el resultado"}
            </button>
          )}
          {mode === "written" && (chain.length > 0 || spec) && (
            <button type="button" className={`${secondaryButton} ml-auto`} onClick={reset}>
              <RotateCcw size={16} aria-hidden="true" />
              Empezar de nuevo
            </button>
          )}
        </div>
        {incompatibleTarget && <p className="text-xs text-amber-200">{needsInteger ? "Esta actividad solo admite números enteros." : "Este resultado está fuera del rango que admite la actividad."} Puedes copiar el resultado o usar otro cálculo.</p>}
        <p className="sr-only" aria-live="polite">{copyNotice}</p>
        {copyNotice && <p aria-hidden="true" className="text-xs text-slate-400">{copyNotice}</p>}
      </footer>
    </aside>
  );
}
