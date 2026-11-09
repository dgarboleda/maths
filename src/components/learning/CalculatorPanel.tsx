"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight, Calculator as CalculatorIcon, ClipboardCopy, RotateCcw, X } from "lucide-react";
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
import { checkSignedWork, checkWrittenWork } from "@/lib/learning/calculatorWrittenCheck";
import type { CheckReport } from "@/lib/learning/calculatorCheck";
import { primaryButton, secondaryButton } from "./LearningShell";
import { ColumnSheet, OptionPicker, useSubtractStrategy, type ColumnDraft } from "./ColumnOperation";
import { calculatorBoardClass, calculatorBoardStyle } from "./calculatorBoard";
import { readCalculatorDraft, restoreCalculatorFromProfile, saveCalculatorToProfile, writeCalculatorDraft } from "./calculatorStorage";
import { DivisionSheet, type DivisionDraft } from "./DivisionOperation";
import { MultiplySheet, type MultiplyDraft } from "./MultiplyOperation";
import { NumericKeypadArea, useSheetInputMode } from "./NumericKeypad";
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
  signedDraft?: { written: { op: CalculatorOp; a: string; b: string }; result: string; steps: string } | null;
  sheet?: { written: { op: CalculatorOp; a: string; b: string }; continueDecimal: boolean; work: string; draft?: ColumnDraft | MultiplyDraft | DivisionDraft } | null;
}

function load(key: string): Saved | null {
  try {
    const raw = readCalculatorDraft(key);
    const saved = raw ? (JSON.parse(raw) as Saved) : null;
    if (!saved || !Array.isArray(saved.chain) || !CALCULATOR_OPS.some((item) => item.id === saved.op) || typeof saved.a !== "string" || typeof saved.b !== "string") return null;
    const validWritten = (entry: unknown): entry is { op: CalculatorOp; a: string; b: string } => {
      if (!entry || typeof entry !== "object") return false;
      const value = entry as { op?: unknown; a?: unknown; b?: unknown };
      return CALCULATOR_OPS.some((item) => item.id === value.op) && typeof value.a === "string" && value.a.length <= 20 && typeof value.b === "string" && value.b.length <= 20;
    };
    if (saved.signedDraft && (!validWritten(saved.signedDraft.written) || typeof saved.signedDraft.result !== "string" || typeof saved.signedDraft.steps !== "string")) saved.signedDraft = null;
    if (saved.sheet && (!validWritten(saved.sheet.written) || typeof saved.sheet.work !== "string" || typeof saved.sheet.continueDecimal !== "boolean")) saved.sheet = null;
    return saved;
  } catch {
    return null;
  }
}

function SignedResult({ value, onChange, className }: { value: string; onChange: (value: string) => void; className: string }) {
  const keypadMode = useSheetInputMode("text");
  return <label className="block text-sm text-slate-300">Mi resultado con signo<input className={className} inputMode={keypadMode} value={value} onChange={(event) => onChange(decimalInput(event.target.value).slice(0, 20))} /></label>;
}

export function CalculatorPanel({
  id,
  open,
  onClose,
  target,
  storageKey,
  parentId, childId, onRestore, initialMode = "written", restored = false,
}: {
  id: string;
  open: boolean;
  onClose: () => void;
  target: CalculatorTarget | null;
  storageKey: string;
  parentId?: string | null; childId: string; onRestore: (mode: "written" | "exact") => void; initialMode?: "written" | "exact"; restored?: boolean;
}) {
  const [initial] = useState(() => load(storageKey));
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState("");
  const [mode, setMode] = useState<"written" | "exact">(initialMode);
  const [exactResult, setExactResult] = useState("");
  const [chain, setChain] = useState<CalculatorEntry[]>(initial?.chain ?? []);
  const [op, setOp] = useState<CalculatorOp>(initial?.op ?? "add");
  const [a, setA] = useState(initial?.a ?? "");
  const [b, setB] = useState(initial?.b ?? "");
  const [continueDecimal, setContinueDecimal] = useState(initial?.sheet?.continueDecimal ?? false);
  const [spec, setSpec] = useState<CalculatorSpec | null>(() => {
    const sheet = initial?.sheet;
    if (!sheet?.written) return null;
    const restored = calculatorSpec(sheet.written.op, sheet.written.a, sheet.written.b, sheet.continueDecimal);
    return "spec" in restored ? restored.spec : null;
  });
  const [sheetDraft, setSheetDraft] = useState<ColumnDraft | MultiplyDraft | DivisionDraft | undefined>(initial?.sheet?.draft);
  const [written, setWritten] = useState<{ op: CalculatorOp; a: string; b: string } | null>(initial?.signedDraft?.written ?? initial?.sheet?.written ?? null);
  const [signed, setSigned] = useState(Boolean(initial?.signedDraft));
  const [signedResult, setSignedResult] = useState(initial?.signedDraft?.result ?? "");
  const [signedSteps, setSignedSteps] = useState(initial?.signedDraft?.steps ?? "");
  const [work, setWork] = useState(initial?.sheet?.work ?? "");
  const [revision, setRevision] = useState(0);
  const [problem, setProblem] = useState<string | null>(null);
  const [checked, setChecked] = useState<{ signature: string; report: CheckReport & { wrongColumn?: number } } | null>(null);
  // Aviso de la última copia: solo se muestra mientras el resultado final siga siendo ese.
  const [copied, setCopied] = useState<{ value: string; text: string } | null>(null);
  const [targetIndex, setTargetIndex] = useState(0);
  const [strategy] = useSubtractStrategy();
  const heading = useRef<HTMLHeadingElement>(null);
  const second = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      writeCalculatorDraft(storageKey, JSON.stringify({ chain, op, a, b, signedDraft: signed && written ? { written, result: signedResult, steps: signedSteps } : null, sheet: spec && written ? { written, continueDecimal, work, draft: sheetDraft } : null } satisfies Saved));
    } catch {
      /* sin almacenamiento, la cadena dura mientras la pantalla esté abierta */
    }
  }, [storageKey, chain, op, a, b, signed, written, signedResult, signedSteps, spec, continueDecimal, work, sheetDraft]);
  useEffect(() => {
    if (open) heading.current?.focus();
  }, [open]);

  const write = (next = { op, a, b }, decimals = continueDecimal) => {
    const x = Number(next.a.replace(",", ".")), y = Number(next.b.replace(",", "."));
    const needsSigned = next.a.startsWith("-") || next.b.startsWith("-") || (next.op === "subtract" && x < y);
    if (needsSigned) {
      if (!/^-?\d+(?:,\d{0,3})?$/.test(next.a) || !/^-?\d+(?:,\d{0,3})?$/.test(next.b)) return setProblem("Escribe dos números con hasta tres decimales.");
      if (next.op === "divide" && y === 0) return setProblem("No se puede dividir entre 0.");
      if (Math.abs(x) >= 10_000_000 || Math.abs(y) >= 10_000_000) return setProblem("Usa números menores que 10 000 000 en valor absoluto.");
      setProblem(null); setSigned(true); setSignedResult(""); setSignedSteps(""); setSpec(null); setSheetDraft(undefined); setWork(""); setWritten(next); return;
    }
    const outcome = calculatorSpec(next.op, next.a, next.b, decimals);
    if ("problem" in outcome) return setProblem(outcome.problem);
    setProblem(null);
    setSigned(false);
    setSheetDraft(undefined);
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
  const result = signed ? (/^-?\d+(?:,\d+)?$/.test(signedResult) ? signedResult : "") : spec ? calculatorResult(spec, work) : "";
  const checkSignature = JSON.stringify([spec, written, work, sheetDraft, signed, signedResult, signedSteps, strategy]);
  const feedback = checked?.signature === checkSignature ? checked.report : null;
  const last = chain.at(-1);
  const final = mode === "written" ? result || last?.result || "" : exactResult;
  const copyNotice = copied?.value === final ? copied.text : null;
  // Si la pantalla cambia de destinos, se vuelve al primero.
  const index = target && targetIndex < target.labels.length ? targetIndex : 0;
  const needsInteger = Boolean(target?.integerOnly && final && !/^[+-]?\d+(?:[,.]0+)?$/.test(final));
  const incompatibleTarget = Boolean(target && final && (needsInteger || parseNumber(final) === null));

  /** Guarda la cuenta en la cadena y empieza otra con su resultado. */
  const continueWith = () => {
    if ((!spec && !signed) || !written || !result) return;
    setChain((c) => [...c, spec ? calculatorEntry(written.op, written.a, written.b, spec, work) : { ...written, result }]);
    setA(result);
    setB("");
    setSpec(null);
    setSheetDraft(undefined);
    setSigned(false);
    setSignedResult("");
    setSignedSteps("");
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
    setSheetDraft(undefined);
    setSigned(false);
    setSignedResult("");
    setSignedSteps("");
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
      <header className={styles.header}>
        <span aria-hidden="true" className={styles.headerIcon}><CalculatorIcon size={22} /></span>
        <div className="min-w-0 flex-1">
          <h2 id={`${id}-title`} ref={heading} tabIndex={-1} className="font-display text-xl font-bold text-white">Calculadora</h2>
          <p className="mt-0.5 text-xs text-slate-300">Tu espacio para resolver paso a paso</p>
        </div>
        <button type="button" aria-label="Cerrar la calculadora" onClick={onClose}
          className="ml-auto grid size-11 place-items-center rounded-xl text-slate-300 hover:bg-white/5 hover:text-white">
          <X size={20} aria-hidden="true" />
        </button>
      </header>
      <div role="group" aria-label="Tipo de calculadora" className={styles.modeGroup}>
        <button type="button" aria-pressed={mode === "written"} className={`${styles.modeButton} ${mode === "written" ? styles.modeActive : ""}`} onClick={() => setMode("written")}>Cuentas escritas</button>
        <button type="button" aria-pressed={mode === "exact"} className={`${styles.modeButton} ${mode === "exact" ? styles.modeActive : ""}`} onClick={() => setMode("exact")}>Fracciones y MCM</button>
      </div>
      <div className={`${styles.body} space-y-4`}>
        {restored && <p role="status" className="text-sm text-cyan-100">Copia recuperada de tu perfil.</p>}
        {parentId && <details className="rounded-xl border border-slate-700 bg-slate-900/80 p-3 text-sm text-slate-200">
          <summary className="cursor-pointer font-semibold">Guardar o recuperar en otro dispositivo</summary>
          <p className="mt-2 text-xs text-slate-300">Guarda una copia en tu perfil. Al recuperarla, sustituye la hoja guardada en este dispositivo.</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button type="button" disabled={syncing} className={secondaryButton} onClick={async () => { setSyncing(true); try { await saveCalculatorToProfile(parentId, childId, storageKey); setSyncMessage("Copia guardada en tu perfil."); } catch { setSyncMessage("No se pudo guardar la copia. Inténtalo con conexión."); } finally { setSyncing(false); } }}>Guardar copia</button>
            <button type="button" disabled={syncing} className={secondaryButton} onClick={async () => { setSyncing(true); try { if (await restoreCalculatorFromProfile(parentId, childId, storageKey)) onRestore(mode); else setSyncMessage("Aún no hay una copia guardada."); } catch { setSyncMessage("No se pudo recuperar la copia. Inténtalo con conexión."); } finally { setSyncing(false); } }}>Recuperar copia</button>
          </div><p role="status" className="mt-2 text-xs text-cyan-100">{syncMessage}</p>
        </details>}
        <div hidden={mode !== "exact"}><NumericKeypadArea bottom="0px" hideWhenIdle sign comma><ExactCalculator storageKey={`${storageKey}:exacta`} onResult={setExactResult} /></NumericKeypadArea></div>
        <div hidden={mode !== "written"} className="space-y-4">
        <p className="text-sm leading-relaxed text-slate-300">Escribe una cuenta en la hoja. Para combinar más de dos números, abre «Fracciones y MCM».</p>

        {chain.length > 0 && (
          <section aria-labelledby={`${id}-chain`} className="space-y-2">
            <h3 id={`${id}-chain`} className="text-sm font-bold text-cyan-200">Cadena de cuentas</h3>
            <ol className="space-y-1.5">
              {chain.map((entry, i) => (
                <li key={i} className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2">
                  <span className="text-xs font-bold text-slate-400">{i + 1}.</span>
                  <span className="break-all font-mono text-base text-slate-100">{entryText(entry)}</span>
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
              <input className={field} inputMode="text" maxLength={11} value={a} onChange={(e) => setA(decimalInput(e.target.value))} />
            </label>
            <label className="text-sm text-slate-300">
              {op === "divide" ? "Divisor" : op === "multiply" ? "Segundo factor" : "Segundo número"}
              <input ref={second} className={field} inputMode="text" maxLength={11} value={b} onChange={(e) => setB(decimalInput(e.target.value))} />
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
          {signed && written && <NumericKeypadArea bottom="0px" hideWhenIdle sign comma>
            <div className={`${calculatorBoardClass} space-y-3`} style={calculatorBoardStyle} role="group" aria-label="Cuenta con números con signo">
              <p className="text-center font-mono text-3xl font-bold text-sky-300">{written.a} <span className="text-white">{{ add: "+", subtract: "−", multiply: "×", divide: "÷" }[written.op]}</span> {written.b}</p>
              <label className="block text-sm text-slate-300">Mis pasos<input className={`${field} w-full`} value={signedSteps} onChange={(event) => setSignedSteps(event.target.value.slice(0, 256))} /></label>
              <SignedResult className={`${field} w-full`} value={signedResult} onChange={setSignedResult} />
              <p className="text-xs text-slate-300">Escribe el signo y el resultado que calculaste. Para revisar un paso, usa una igualdad, por ejemplo: 3 − 4 = −1.</p>
            </div>
          </NumericKeypadArea>}
          {signed && result && <button type="button" className={primaryButton} onClick={continueWith}>Seguir con {result} <ArrowRight size={16} aria-hidden="true" /></button>}
          {spec && (
            <>
              {/* En el panel no hay navegación inferior: el teclado va pegado abajo. */}
              <NumericKeypadArea bottom="0px" hideWhenIdle comma={hasDecimals(spec)}>
                {spec.op === "divide" ? (
                  <DivisionSheet calculator key={`division-${revision}`} spec={spec} layout="completa" mode="open" response={work} onChange={setWork} draft={sheetDraft as DivisionDraft | undefined} onDraft={setSheetDraft} />
                ) : spec.op === "multiply" ? (
                  <MultiplySheet calculator key={`multiply-${revision}`} spec={spec} mode="free" response={work} onChange={setWork} draft={sheetDraft as MultiplyDraft | undefined} onDraft={setSheetDraft} />
                ) : (
                  <ColumnSheet key={`${revision}-${strategy}`} spec={spec} strategy={strategy} mode="free" calculator response={work} onChange={setWork} draft={sheetDraft as ColumnDraft | undefined} onDraft={setSheetDraft} wrongColumn={feedback?.wrongColumn ?? null} />
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
          {(spec || (signed && written)) && <div className="space-y-2">
            <button type="button" className={secondaryButton} onClick={() => {
              const report = signed && written ? checkSignedWork(written, signedResult, signedSteps) : spec ? checkWrittenWork(spec, work, sheetDraft as ColumnDraft | MultiplyDraft | undefined, strategy) : null;
              if (report) setChecked({ signature: checkSignature, report });
            }}>Comprobar mi trabajo</button>
            {feedback && <div role="status" className={`space-y-1 rounded-xl p-3 text-sm ${feedback.ok ? "bg-emerald-950/60 text-emerald-100" : "bg-amber-950/60 text-amber-100"}`}><p className="font-semibold">{feedback.message}</p>{feedback.details.map((detail, i) => <p key={i}>{detail}</p>)}</div>}
          </div>}
        </section>
        </div>
      </div>

      <footer className={`${styles.footer} space-y-2`}>
        <p className={styles.resultRow} aria-live="polite">
          {final ? (
            <>Resultado final: <strong className={styles.resultValue}>{final}</strong></>
          ) : (
            mode === "written" ? "Escribe el resultado en la hoja para usarlo." : "Escribe y confirma tu resultado para usarlo."
          )}
        </p>
        {final && target && target.labels.length > 1 && (
          <label className={styles.destination}>
            <span>Copiar en</span>
            <select value={index} onChange={(e) => setTargetIndex(Number(e.target.value))}>
              {target.labels.map((label, i) => <option key={label} value={i}>{label}</option>)}
            </select>
          </label>
        )}
        <div className="flex flex-wrap items-center gap-2">
          {final && <button type="button" className={secondaryButton} onClick={() => void copy()}>
            <ClipboardCopy size={16} aria-hidden="true" />
            Copiar
          </button>}
          {target && final && (
            <button type="button" className={primaryButton} disabled={incompatibleTarget} onClick={useInTarget}>
              {final ? `Usar ${final.length > 24 ? "resultado" : final}${target.labels.length > 1 ? "" : ` en ${target.labels[0]}`}` : "Usar el resultado"}
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
