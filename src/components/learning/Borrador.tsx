"use client";

import { useId, useState } from "react";
import { Calculator, ChevronDown, ChevronUp } from "lucide-react";
import type { ColumnSpec } from "@/lib/learning/core";
import { secondaryButton } from "./LearningShell";
import { ColumnSheet, OptionPicker, useSubtractStrategy } from "./ColumnOperation";
import { DivisionSheet } from "./DivisionOperation";

/* Borrador de cálculo: el papel de al lado. El alumno escribe una suma, una
 * resta o una división y la resuelve en la hoja de columnas o en la galera.
 * No se corrige ni se registra como ayuda (es su propio trabajo) y el
 * resultado se puede copiar a la respuesta. */

const OPS = [
  { id: "add", label: "Sumar" },
  { id: "subtract", label: "Restar" },
  { id: "divide", label: "Dividir" },
] as const;
type Op = (typeof OPS)[number]["id"];

/** Resultado escrito en la hoja (en la galera, el cociente). */
function resultOf(op: Op, response: string): string {
  if (op === "divide") return /^L(\d+);/.exec(response)?.[1]?.replace(/^0+(?=\d)/, "") ?? "";
  return response;
}

export function Borrador({
  targets = [],
  onUse,
  disabled,
}: {
  /** Dónde se puede copiar el resultado (la respuesta, o cada valor de un plan). */
  targets?: string[];
  onUse?: (value: string, target: number) => void;
  disabled?: boolean;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [op, setOp] = useState<Op>("add");
  const [a, setA] = useState("");
  const [b, setB] = useState("");
  const [spec, setSpec] = useState<ColumnSpec | null>(null);
  const [work, setWork] = useState("");
  const [target, setTarget] = useState(0);
  const [strategy] = useSubtractStrategy();
  const [problem, setProblem] = useState<string | null>(null);

  const write = () => {
    const [x, y] = [Number(a), Number(b)];
    if (!a || !b) return setProblem("Escribe los dos números.");
    if (op === "subtract" && x < y) return setProblem("En la resta, el primer número no puede ser menor que el segundo.");
    if (op === "divide" && y === 0) return setProblem("No se puede dividir entre 0.");
    if (op === "divide" && y > 999) return setProblem("El divisor puede tener hasta 3 cifras.");
    setProblem(null);
    setWork("");
    setSpec({ op, a: x, b: y });
  };
  const result = spec ? resultOf(spec.op, work) : "";
  const field = "mt-1 block min-h-11 w-32 rounded-xl border border-slate-500 bg-slate-950 px-3 font-mono text-lg text-white";

  return (
    <section aria-labelledby={`${id}-title`} className="rounded-xl border border-slate-700 bg-slate-950/60">
      <h3 id={`${id}-title`} className="m-0">
        <button
          type="button"
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
              {op === "divide" ? "Dividendo" : "Primer número"}
              <input className={field} inputMode="numeric" maxLength={7} value={a} disabled={disabled}
                onChange={(e) => setA(e.target.value.replace(/\D/g, ""))} />
            </label>
            <label className="text-sm text-slate-300">
              {op === "divide" ? "Divisor" : "Segundo número"}
              <input className={field} inputMode="numeric" maxLength={7} value={b} disabled={disabled}
                onChange={(e) => setB(e.target.value.replace(/\D/g, ""))} />
            </label>
            <button type="button" className={secondaryButton} disabled={disabled} onClick={write}>
              Escribir la cuenta
            </button>
          </div>
          {problem && <p role="alert" className="text-sm text-amber-200">{problem}</p>}
          {spec && (
            <>
              {spec.op === "divide" ? (
                <DivisionSheet key={`${spec.a}/${spec.b}`} spec={spec} layout="completa" mode="open" response="" onChange={setWork} />
              ) : (
                <ColumnSheet key={`${spec.op}${spec.a}-${spec.b}-${strategy}`} spec={spec} strategy={strategy} mode="free" response="" onChange={setWork} />
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
