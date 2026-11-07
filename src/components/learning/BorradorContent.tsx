"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Calculator, ChevronDown, ChevronUp } from "lucide-react";
import {
  divisionTrace,
  exactPlaces,
  isDecimalDivision,
  multiplyScaled,
  quotientValue,
  validColumnSpec,
  validDivisionSpec,
  validMultiplySpec,
  type ArithmeticSpec,
  type DivisionSpec,
  type MultiplySpec,
} from "@/lib/learning/core";
import { secondaryButton } from "./LearningShell";
import { ColumnSheet, OptionPicker, useSubtractStrategy } from "./ColumnOperation";
import { DivisionSheet } from "./DivisionOperation";
import { MultiplySheet } from "./MultiplyOperation";
import { NumericKeypadArea } from "./NumericKeypad";

/* Borrador de cálculo: el papel de al lado. El alumno escribe una suma, una
 * resta, una multiplicación o una división (también con decimales) y la
 * resuelve en la hoja de columnas o en la galera.
 * No se corrige ni se registra como ayuda (es su propio trabajo) y el
 * resultado se puede copiar a la respuesta. */

const OPS = [
  { id: "add", label: "Sumar" },
  { id: "subtract", label: "Restar" },
  { id: "multiply", label: "Multiplicar" },
  { id: "divide", label: "Dividir" },
] as const;
type Op = (typeof OPS)[number]["id"];

/** Cifras y, como mucho, una coma decimal. */
const decimalInput = (text: string) => {
  const clean = text.replace(/\./g, ",").replace(/[^\d,]/g, "");
  const [int, ...rest] = clean.split(",");
  return rest.length ? `${int},${rest.join("")}` : int;
};

type Spec = ArithmeticSpec | MultiplySpec | DivisionSpec;

/** Resultado escrito en la hoja (en la galera, el cociente con su coma). */
function resultOf(spec: Spec, response: string): string {
  if (spec.op === "divide") {
    const written = /^L(\d+(?:,\d+)?|,\d+);/.exec(response)?.[1];
    if (!written) return "";
    return String(quotientValue(written)).replace(".", ",");
  }
  return response;
}

export function Borrador({
  targets = [],
  onUse,
  disabled,
  initialOpen = false,
}: {
  /** Dónde se puede copiar el resultado (la respuesta, o cada valor de un plan). */
  targets?: string[];
  onUse?: (value: string, target: number) => void;
  disabled?: boolean;
  initialOpen?: boolean;
}) {
  const id = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => { if (initialOpen) trigger.current?.focus(); }, [initialOpen]);
  const [open, setOpen] = useState(initialOpen);
  const [op, setOp] = useState<Op>("add");
  const [a, setA] = useState("");
  const [b, setB] = useState("");
  const [spec, setSpec] = useState<Spec | null>(null);
  const [work, setWork] = useState("");
  const [target, setTarget] = useState(0);
  const [strategy] = useSubtractStrategy();
  const [problem, setProblem] = useState<string | null>(null);
  const [continueDecimal, setContinueDecimal] = useState(false);
  const [revision, setRevision] = useState(0);

  const write = () => {
    const [x, y] = [Number(a.replace(",", ".")), Number(b.replace(",", "."))];
    if (!a || !b || !Number.isFinite(x) || !Number.isFinite(y)) return setProblem("Escribe los dos números.");
    if (/,\d{4,}/.test(`${a} ${b}`)) return setProblem("Usa como mucho tres decimales.");
    if (op === "divide" && /,\d{3,}/.test(b)) return setProblem("En la división, el divisor puede tener como mucho dos decimales.");
    if (op === "subtract" && x < y) return setProblem("En la resta, el primer número no puede ser menor que el segundo.");
    if (op === "divide" && y === 0) return setProblem("No se puede dividir entre 0.");
    if (op === "multiply" && (x === 0 || y === 0)) return setProblem("Multiplicar por 0 da 0: no hace falta escribir la cuenta.");
    let next: Spec;
    if (op === "multiply") {
      // Arriba va el factor de más cifras.
      const [top, bottom] = String(multiplyScaled({ op, a: y, b: x }).A).length > String(multiplyScaled({ op, a: x, b: y }).A).length ? [y, x] : [x, y];
      const scale = (value: string) => (value.split(",")[1] ?? "").length;
      const swapped = top === y && bottom === x && x !== y;
      next = { op, a: top, b: bottom, scaleA: scale(swapped ? b : a), scaleB: scale(swapped ? a : b) };
      if (!validMultiplySpec(next)) return setProblem("El factor más corto puede tener hasta 3 cifras, y el otro, hasta 6.");
    } else if (op === "divide") {
      next = { op, a: x, b: y };
      // Hasta tres decimales: así el resultado se puede usar en otra cuenta.
      if (isDecimalDivision(next) || a.includes(",") || b.includes(",") || continueDecimal) next = { ...next, places: exactPlaces(x, y, 3) ?? 3 };
      if (y > 999 || Math.round(y * 10 ** (b.split(",")[1]?.length ?? 0)) > 999) return setProblem("El divisor puede tener hasta 3 cifras.");
      if (!validDivisionSpec(next)) return setProblem("Usa números menores que 10 000 000.");
    } else {
      next = { op, a: x, b: y };
      // Los mismos límites que la hoja: así nunca se dibuja una cuenta que no puede trazar.
      if (!validColumnSpec(next)) return setProblem("Usa números menores que 10 000 000.");
    }
    setProblem(null);
    setWork("");
    setRevision((n) => n + 1);
    setSpec(next);
  };
  const result = spec ? resultOf(spec, work) : "";
  const field = "mt-1 block min-h-11 w-32 rounded-xl border border-slate-500 bg-slate-950 px-3 font-mono text-lg text-white";

  return (
    <section aria-labelledby={`${id}-title`} className="rounded-xl border border-slate-700 bg-slate-950/60">
      <h3 id={`${id}-title`} className="m-0">
        <button
          type="button"
          ref={trigger}
          aria-expanded={open}
          aria-controls={`${id}-panel`}
          disabled={disabled}
          onClick={() => setOpen((o) => !o)}
          className="flex min-h-11 w-full items-center gap-2 px-4 text-left text-sm font-bold text-cyan-200"
        >
          <Calculator size={16} aria-hidden="true" />
          Borrador de cálculo
          <span className="ml-auto">
            {open ? <ChevronUp size={16} aria-hidden="true" /> : <ChevronDown size={16} aria-hidden="true" />}
          </span>
        </button>
      </h3>
      {open && (
        <div id={`${id}-panel`} className="space-y-3 border-t border-slate-700 p-4">
          <p className="text-xs text-slate-400">Haz aquí tus cuentas: no se corrigen ni cuentan como ayuda.</p>
          <OptionPicker label="Operación del borrador" options={OPS} value={op} onChange={setOp} disabled={disabled} />
          <div className="flex flex-wrap items-end gap-3">
            <label className="text-sm text-slate-300">
              {op === "divide" ? "Dividendo" : op === "multiply" ? "Primer factor" : "Primer número"}
              <input className={field} inputMode="decimal" maxLength={11} value={a} disabled={disabled}
                onChange={(e) => setA(decimalInput(e.target.value))} />
            </label>
            <label className="text-sm text-slate-300">
              {op === "divide" ? "Divisor" : op === "multiply" ? "Segundo factor" : "Segundo número"}
              <input className={field} inputMode="decimal" maxLength={11} value={b} disabled={disabled}
                onChange={(e) => setB(decimalInput(e.target.value))} />
            </label>
            <button type="button" className={secondaryButton} disabled={disabled} onClick={write}>
              Escribir la cuenta
            </button>
          </div>
          {op === "divide" && (
            <label className="flex items-center gap-2 text-sm text-slate-300">
              <input type="checkbox" checked={continueDecimal} disabled={disabled} onChange={(e) => setContinueDecimal(e.target.checked)} />
              Continuar la división con decimales
            </label>
          )}
          {problem && <p role="alert" className="text-sm text-amber-200">{problem}</p>}
          {spec && (
            <>
              <NumericKeypadArea>
                {spec.op === "divide" ? (
                  <DivisionSheet key={`division-${revision}`} spec={spec} layout="completa" mode="open" response="" onChange={setWork} />
                ) : spec.op === "multiply" ? (
                  <MultiplySheet key={`multiply-${revision}`} spec={spec} mode="free" response="" onChange={setWork} />
                ) : (
                  <ColumnSheet key={`${revision}-${strategy}`} spec={spec} strategy={strategy} mode="free" response="" onChange={setWork} />
                )}
              </NumericKeypadArea>
              {result && spec.op === "divide" && divisionTrace(spec).remainder !== 0 && (
                <p className="text-sm text-amber-200">El cociente es incompleto: todavía queda un resto. Si lo usas, el siguiente cálculo será aproximado.</p>
              )}
              {result && (
                <div className="flex flex-wrap gap-2">
                  <button type="button" className={secondaryButton} disabled={disabled} onClick={() => setA(result)}>Usar {result} como primer número</button>
                  <button type="button" className={secondaryButton} disabled={disabled} onClick={() => setB(result)}>Usar {result} como segundo número</button>
                </div>
              )}
              {onUse && targets.length > 0 && (
                <div className="flex flex-wrap items-end gap-2">
                  {targets.length > 1 && (
                    <label className="text-sm text-slate-300">
                      Copiar en
                      <select className={`${field} w-auto`} value={target} onChange={(e) => setTarget(Number(e.target.value))}>
                        {targets.map((t, i) => (
                          <option key={t} value={i}>{t}</option>
                        ))}
                      </select>
                    </label>
                  )}
                  <button type="button" className={secondaryButton} disabled={disabled || !result} onClick={() => onUse(result, target)}>
                    {result ? `Usar ${result} ${targets.length > 1 ? "" : `en ${targets[0]}`}`.trim() : "Escribe el resultado para copiarlo"}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </section>
  );
}
