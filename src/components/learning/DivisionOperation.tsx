"use client";

import { useId, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import {
  DIVISION_LAYOUTS,
  divisionTrace,
  type DivisionLayout,
  type DivisionSpec,
  type DivisionTrace,
} from "@/lib/learning/core";
import { secondaryButton } from "./LearningShell";
import { Challenge } from "./Challenge";
import { Slider } from "./GraphVisuals";
import { makePreference, OptionPicker } from "./ColumnOperation";

/* División larga en la «galera»: el dividendo a la izquierda, el divisor a
 * la derecha y el cociente debajo de él. Modos como la hoja de columnas:
 * guiado (cada cifra del cociente se corrige al escribirla), libre y
 * demostración. */

const PLACE_COLORS = ["text-emerald-300", "text-sky-300", "text-rose-300"];

export const useDivisionLayout = makePreference<DivisionLayout>(
  "maths:division:disposicion",
  DIVISION_LAYOUTS.map((l) => l.id),
  "completa",
);

export function LayoutPicker({
  layout,
  onChange,
  disabled,
}: {
  layout: DivisionLayout;
  onChange: (l: DivisionLayout) => void;
  disabled?: boolean;
}) {
  return (
    <OptionPicker label="Cómo escribir las restas de la división" options={DIVISION_LAYOUTS} value={layout} onChange={onChange} disabled={disabled} />
  );
}

interface Row {
  /** Texto alineado a la derecha en la columna `end` del dividendo. */
  text: string;
  end: number;
  product?: boolean;
  remainder?: boolean;
}

/** Filas de trabajo bajo el dividendo tras mostrar `shown` pasos. Un 0 en el
 *  cociente no añade filas: la cifra que se baja se escribe junto a la anterior. */
function workRows(trace: DivisionTrace, shown: number): Row[] {
  const rows: Row[] = [];
  for (const step of trace.steps.slice(0, shown)) {
    const tail = step.down !== null ? String(step.down) : "";
    if (step.digit === 0 && step.index > 0 && rows.length) {
      const last = rows[rows.length - 1];
      if (tail) {
        last.text += tail;
        last.end += 1;
      } else last.remainder = true;
      continue;
    }
    if (step.digit === 0) continue;
    if (trace.layout === "completa") rows.push({ text: String(step.product), end: step.end, product: true });
    rows.push({ text: String(step.rest) + tail, end: step.end + (tail ? 1 : 0), remainder: !tail });
  }
  return rows;
}

type QCell =
  | { kind: "digit"; value: number | null; state?: "ok" | "active" | "ghost" }
  | { kind: "input"; value: string; state?: "wrong" | "active"; placeholder?: string };

function Galera({
  trace,
  shown,
  quotient,
  onInput,
  onKey,
  refs,
  disabled,
}: {
  trace: DivisionTrace;
  shown: number;
  quotient: QCell[];
  onInput?: (i: number, value: string) => void;
  onKey?: (i: number, event: React.KeyboardEvent<HTMLInputElement>) => void;
  refs?: React.MutableRefObject<(HTMLInputElement | null)[]>;
  disabled?: boolean;
}) {
  const digits = trace.dividendDigits;
  const n = digits.length;
  const rows = workRows(trace, shown);
  const cell = "flex h-10 w-7 items-center justify-center text-xl font-bold tabular-nums sm:h-11 sm:w-10 sm:text-2xl";
  const color = (column: number) => PLACE_COLORS[(n - 1 - column) % 3];
  return (
    // Enfocable: si no cabe (pantallas muy estrechas), se recorre con el teclado.
    <div className="overflow-x-auto" tabIndex={0} role="group" aria-label={`División ${trace.spec.a} entre ${trace.spec.b}`}>
      <div className="mx-auto flex w-max items-start">
        <div className="grid" style={{ gridTemplateColumns: `repeat(${n}, auto)` }}>
          {digits.map((d, j) => (
            <span key={`d${j}`} className={`${cell} ${color(j)}`}>{d}</span>
          ))}
          {rows.map((row, r) =>
            Array.from({ length: n }, (_, j) => {
              const k = j - (row.end - row.text.length + 1);
              const ch = k >= 0 && k < row.text.length ? row.text[k] : "";
              return (
                <span
                  key={`r${r}-${j}`}
                  className={`${cell} relative text-slate-100 ${row.product && ch ? "border-b-2 border-slate-300" : ""}`}
                >
                  {row.product && k === 0 && (
                    <span aria-hidden="true" className="absolute -left-1 text-base text-slate-400">−</span>
                  )}
                  {k === 0 && <span className="sr-only">{row.product ? "restas " : row.remainder ? "resto " : "queda "}</span>}
                  {ch}
                </span>
              );
            }),
          )}
        </div>
        <div className="ml-1 border-l-2 border-slate-200 pl-2">
          <div className="border-b-2 border-slate-200 pb-0.5">
            <span className={`${cell} w-auto px-1 text-slate-100`}>
              <span className="sr-only">entre </span>
              {trace.spec.b}
            </span>
          </div>
          <div className="mt-1 flex gap-0.5" aria-label="Cociente" role="group">
            {quotient.map((q, i) => {
              const ring =
                q.state === "wrong"
                  ? "border-amber-400 bg-amber-950/50"
                  : q.state === "ok"
                    ? "border-emerald-400/70 bg-emerald-950/30"
                    : q.state === "active"
                      ? "border-cyan-300 bg-cyan-950/40"
                      : "border-slate-600 bg-slate-950";
              if (q.kind === "digit")
                return (
                  <span key={i} className={`${cell} rounded-lg border ${ring} text-cyan-100 ${q.state === "ghost" ? "opacity-50" : ""}`}>
                    {q.value ?? ""}
                  </span>
                );
              return (
                <input
                  key={i}
                  ref={(el) => {
                    if (refs) refs.current[i] = el;
                  }}
                  aria-label={`Cociente: cifra ${i + 1}`}
                  aria-invalid={q.state === "wrong"}
                  inputMode="numeric"
                  autoComplete="off"
                  maxLength={1}
                  value={q.value}
                  placeholder={q.placeholder}
                  disabled={disabled}
                  onChange={(e) => onInput?.(i, e.target.value.replace(/\D/g, "").slice(-1))}
                  onKeyDown={(e) => onKey?.(i, e)}
                  onFocus={(e) => e.target.select()}
                  className={`${cell} rounded-lg border ${ring} text-center text-cyan-100 placeholder:opacity-40 focus:outline-2 focus:outline-cyan-300`}
                />
              );
            })}
          </div>
        </div>
      </div>
      {shown >= trace.steps.length && (
        <p className="mt-2 text-center text-sm text-slate-300">
          Cociente <strong className="text-cyan-100">{trace.quotient}</strong> · resto{" "}
          <strong className="text-amber-200">{trace.remainder}</strong>
        </p>
      )}
    </div>
  );
}

export function DivisionDemo({
  spec,
  layout,
  initialStep,
}: {
  spec: DivisionSpec;
  layout: DivisionLayout;
  initialStep?: number;
}) {
  const trace = useMemo(() => divisionTrace(spec, layout), [spec, layout]);
  const total = trace.steps.length;
  const [shown, setShown] = useState(Math.min(initialStep ?? 0, total));
  const quotient: QCell[] = trace.steps.map((s, i) => ({
    kind: "digit",
    value: i < shown ? s.digit : null,
    state: i === shown ? "active" : undefined,
  }));
  const current = shown > 0 ? trace.steps[shown - 1] : null;
  return (
    <div className="space-y-3">
      <Galera trace={trace} shown={shown} quotient={quotient} />
      <p aria-live="polite" className="min-h-12 rounded-xl bg-slate-950 p-3 text-sm leading-relaxed text-slate-200">
        {current ? current.why : `Empieza por la izquierda: ${trace.steps[0].ask}`}
      </p>
      <div className="flex flex-wrap gap-2">
        <button type="button" className={secondaryButton} disabled={shown === 0} onClick={() => setShown(shown - 1)}>
          <ArrowLeft size={16} aria-hidden="true" /> Paso anterior
        </button>
        <button type="button" className={secondaryButton} disabled={shown >= total} onClick={() => setShown(shown + 1)}>
          {shown === 0 ? "Empezar" : "Siguiente paso"} <ArrowRight size={16} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

/** Primera cifra del cociente (desde la izquierda) que no coincide. */
export function firstWrongQuotientDigit(response: string, answer: number): number | null {
  const given = response.replace(/\D/g, "").replace(/^0+(?=\d)/, "");
  const expected = String(answer);
  for (let i = 0; i < Math.max(given.length, expected.length); i++) if (given[i] !== expected[i]) return i;
  return null;
}

export function DivisionSheet({
  spec,
  layout,
  mode,
  response,
  onChange,
  onComplete,
  hintLevel = 0,
  failedResponse = null,
  disabled,
}: {
  spec: DivisionSpec;
  layout: DivisionLayout;
  mode: "guided" | "free";
  response: string;
  onChange: (response: string) => void;
  onComplete?: (response: string) => void;
  hintLevel?: number;
  /** Respuesta fallida que sigue escrita (fuera de las comprobaciones). */
  failedResponse?: string | null;
  disabled?: boolean;
}) {
  const trace = useMemo(() => divisionTrace(spec, layout), [spec, layout]);
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const steps = trace.steps.length;
  // En modo libre no se revela cuántas cifras tiene el cociente.
  const cells = mode === "guided" ? steps : Math.max(steps, String(spec.a).length - String(spec.b).length + 1);
  const offset = cells - steps;
  const [digits, setDigits] = useState<string[]>(() => {
    const given = response.replace(/\D/g, "").split("");
    const pad = mode === "guided" ? 0 : Math.max(0, cells - given.length);
    return Array.from({ length: cells }, (_, i) => given[i - pad] ?? "");
  });
  const [miss, setMiss] = useState<{ index: number; value: string } | null>(null);
  const [lastWhy, setLastWhy] = useState("");
  const id = useId();

  const active = mode === "guided" ? digits.findIndex((d, i) => d === "" || Number(d) !== trace.steps[i].digit) : -1;
  const done = mode === "guided" && active === -1;
  const emit = (next: string[]) => {
    const text = next.join("").replace(/^0+(?=\d)/, "");
    onChange(text);
    return text;
  };
  const focus = (i: number) => refs.current[i]?.focus();

  const setDigit = (i: number, value: string) => {
    if (mode === "guided") {
      if (value === "") {
        setMiss((m) => (m ? { ...m, value: "" } : m));
        return;
      }
      if (Number(value) !== trace.steps[i].digit) {
        setMiss({ index: i, value });
        return;
      }
      const next = digits.map((d, k) => (k === i ? value : d));
      setDigits(next);
      setMiss(null);
      setLastWhy(trace.steps[i].why);
      const text = emit(next);
      if (i + 1 < cells) requestAnimationFrame(() => focus(i + 1));
      else onComplete?.(text);
      return;
    }
    const next = digits.map((d, k) => (k === i ? value : d));
    setDigits(next);
    emit(next);
    if (value && i + 1 < cells) focus(i + 1);
  };
  const onKey = (i: number, event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowRight" && i + 1 < cells) {
      event.preventDefault();
      focus(i + 1);
    } else if (event.key === "ArrowLeft" && i > 0) {
      event.preventDefault();
      focus(i - 1);
    } else if (event.key === "Backspace" && mode === "free" && !digits[i] && i > 0) {
      event.preventDefault();
      focus(i - 1);
    }
  };

  const hinted = hintLevel >= 3 ? Math.max(1, steps - 1) : hintLevel >= 2 ? 1 : 0;
  const wrong =
    mode === "free" && failedResponse !== null && failedResponse === response
      ? firstWrongQuotientDigit(failedResponse, trace.quotient)
      : null;
  const shown = mode === "guided" ? (done ? steps : active) : hinted;
  const quotient: QCell[] = Array.from({ length: cells }, (_, i) => {
    if (mode === "guided") {
      if (done || i < active) return { kind: "digit", value: trace.steps[i].digit, state: "ok" };
      if (i === active)
        return miss?.index === i ? { kind: "input", value: miss.value, state: "wrong" } : { kind: "input", value: "", state: "active" };
      return { kind: "digit", value: null };
    }
    const step = i - offset;
    return {
      kind: "input",
      value: digits[i],
      state: wrong !== null && wrong + offset === i ? "wrong" : undefined,
      placeholder: step >= 0 && step < hinted ? String(trace.steps[step].digit) : undefined,
    };
  });

  return (
    <div className="space-y-3" id={id}>
      <Galera trace={trace} shown={shown} quotient={quotient} onInput={setDigit} onKey={onKey} refs={refs} disabled={disabled} />
      <div aria-live="polite" className="text-sm leading-relaxed">
        {mode === "guided" ? (
          miss !== null ? (
            <p className="rounded-xl bg-amber-950/40 p-3 text-amber-100">Revisa esa cifra. {trace.steps[miss.index].ask}</p>
          ) : !done ? (
            <p className="rounded-xl bg-cyan-950/40 p-3 text-cyan-100">
              {lastWhy && <span className="block text-slate-300">{lastWhy}</span>}
              {trace.steps[active]?.ask}
            </p>
          ) : (
            <p className="rounded-xl bg-emerald-950/40 p-3 text-emerald-100">{lastWhy}</p>
          )
        ) : wrong !== null ? (
          <p className="rounded-xl bg-amber-950/40 p-3 text-amber-100">
            Revisa la cifra {wrong + 1} del cociente: es la primera que no coincide.
          </p>
        ) : (
          <p className="text-xs text-slate-400">
            Escribe el cociente de izquierda a derecha, una cifra por cada paso. Haz las restas en tu cuaderno.
          </p>
        )}
      </div>
    </div>
  );
}

/** Exploración de la clase: el alumno elige dividendo y divisor. */
export function DivisionExplorer({ id }: { id: string }) {
  const [a, setA] = useState(756);
  const [b, setB] = useState(3);
  const [layout, setLayout] = useDivisionLayout();
  const spec: DivisionSpec = { op: "divide", a, b };
  const trace = divisionTrace(spec, layout);
  const q = String(trace.quotient);
  return (
    <>
      <Slider id={`${id}-a`} label="Dividendo" value={a} min={100} max={999} onChange={setA} />
      <Slider id={`${id}-b`} label="Divisor" value={b} min={2} max={25} onChange={setB} />
      <LayoutPicker layout={layout} onChange={setLayout} />
      <DivisionDemo key={`${a}-${b}-${layout}`} spec={spec} layout={layout} initialStep={Infinity} />
      <Challenge
        goals={[
          {
            text: "Consigue una división con un 0 en medio del cociente.",
            met: q.length > 2 && q.slice(1, -1).includes("0"),
            hint: "Prueba con un dividendo como 612 y un divisor que quepa justo en la primera cifra.",
          },
          { text: "Consigue una división exacta (resto 0) con un divisor mayor que 9.", met: b > 9 && trace.remainder === 0 },
          { text: "Consigue un cociente de dos cifras. ¿Qué tiene que pasar con la primera cifra del dividendo?", met: q.length === 2 },
        ]}
      />
    </>
  );
}
