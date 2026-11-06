"use client";

import { useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import {
  checkDivisionWork,
  DIVISION_LAYOUTS,
  divisionFields,
  divisionTrace,
  encodeDivisionWork,
  type DivisionField,
  type DivisionLayout,
  type DivisionSpec,
  type DivisionTrace,
} from "@/lib/learning/core";
import { secondaryButton } from "./LearningShell";
import { Challenge } from "./Challenge";
import { Slider } from "./GraphVisuals";
import { makePreference, OptionPicker } from "./ColumnOperation";

/* División larga en la «galera»: el dividendo a la izquierda, el divisor a
 * la derecha y el cociente debajo de él. El alumno escribe todo el
 * procedimiento: cada cifra del cociente, cada producto (en la disposición
 * completa) y lo que queda tras restar con la cifra que baja; la última fila
 * es el resto. Modos: guiado (cada casilla se corrige al escribirla), libre
 * (se revisa al enviar, en el servidor) y demostración. */

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

type CellState = "ok" | "wrong" | "active" | undefined;
/** Contenido de cada casilla de una fila o del cociente. */
type Cell =
  | { kind: "digit"; value: string; state?: CellState; ghost?: boolean }
  | { kind: "input"; value: string; state?: CellState; placeholder?: string };

/** Lo escrito en cada campo: una cadena por casilla. */
type Work = Record<string, string[]>;

const rowLabel = (f: DivisionField) =>
  f.kind === "p" ? `producto del paso ${f.step + 1}` : `resta del paso ${f.step + 1}`;
/** «el producto…» / «la resta…» */
const theRow = (f: DivisionField) => `${f.kind === "p" ? "el" : "la"} ${rowLabel(f)}`;
const cellLabel = (f: DivisionField, i: number) =>
  f.kind === "q" ? `Cociente: cifra ${f.step + 1}` : `${f.kind === "p" ? "Producto" : "Resta"} del paso ${f.step + 1}: casilla ${i + 1} de ${f.width}`;

/** Texto alineado a la derecha en las casillas de una fila. */
function rightAligned(text: string, width: number): string[] {
  const chars = text.split("").slice(-width);
  return [...Array(width - chars.length).fill(""), ...chars];
}

function Galera({
  trace,
  fields,
  cells,
  onInput,
  onKey,
  refs,
  disabled,
  complete,
}: {
  trace: DivisionTrace;
  /** Campos visibles, en orden (cociente y filas). */
  fields: DivisionField[];
  cells: (f: DivisionField) => Cell[];
  onInput?: (f: DivisionField, i: number, value: string) => void;
  onKey?: (f: DivisionField, i: number, event: React.KeyboardEvent<HTMLInputElement>) => void;
  refs?: React.MutableRefObject<Map<string, HTMLInputElement | null>>;
  disabled?: boolean;
  complete?: boolean;
}) {
  const digits = trace.dividendDigits;
  const n = digits.length;
  const cell = "flex h-10 w-7 items-center justify-center text-xl font-bold tabular-nums sm:h-11 sm:w-10 sm:text-2xl";
  const color = (column: number) => PLACE_COLORS[(n - 1 - column) % 3];
  const ring = (state: CellState) =>
    state === "wrong"
      ? "border-amber-400 bg-amber-950/50"
      : state === "ok"
        ? "border-emerald-400/70 bg-emerald-950/30"
        : state === "active"
          ? "border-cyan-300 bg-cyan-950/40"
          : "border-slate-600 bg-slate-950";
  const render = (f: DivisionField, c: Cell, i: number, extra = "") => {
    if (c.kind === "digit")
      return (
        <span key={`${f.key}-${i}`} className={`${cell} ${c.state ? `rounded-lg border ${ring(c.state)}` : ""} ${extra} ${c.ghost ? "opacity-50" : ""}`}>
          {c.value}
        </span>
      );
    return (
      <input
        key={`${f.key}-${i}`}
        ref={(el) => {
          refs?.current.set(`${f.key}:${i}`, el);
        }}
        aria-label={cellLabel(f, i)}
        aria-invalid={c.state === "wrong"}
        inputMode="numeric"
        autoComplete="off"
        maxLength={1}
        value={c.value}
        placeholder={c.placeholder}
        disabled={disabled}
        onChange={(e) => onInput?.(f, i, e.target.value.replace(/\D/g, "").slice(-1))}
        onKeyDown={(e) => onKey?.(f, i, e)}
        onFocus={(e) => e.target.select()}
        className={`${cell} rounded-md border ${ring(c.state)} ${extra} text-center placeholder:opacity-40 focus:outline-2 focus:outline-cyan-300`}
      />
    );
  };
  const rows = fields.filter((f) => f.kind !== "q");
  const quotient = fields.filter((f) => f.kind === "q");
  return (
    // Enfocable: si no cabe (pantallas muy estrechas), se recorre con el teclado.
    <div className="overflow-x-auto" tabIndex={0} role="group" aria-label={`División ${trace.spec.a} entre ${trace.spec.b}`}>
      <div className="mx-auto flex w-max items-start">
        <div className="grid gap-y-0.5" style={{ gridTemplateColumns: `repeat(${n}, auto)` }}>
          {digits.map((d, j) => (
            <span key={`d${j}`} className={`${cell} ${color(j)}`}>{d}</span>
          ))}
          {rows.map((f) => {
            const start = f.end - f.width + 1;
            const own = cells(f);
            return Array.from({ length: n }, (_, j) => {
              const k = j - start;
              if (k < 0 || k >= f.width) return <span key={`${f.key}-x${j}`} className={cell} />;
              const underline = f.kind === "p" ? "border-b-2 border-b-slate-300" : "";
              return (
                <span key={`${f.key}-w${j}`} className="relative">
                  {f.kind === "p" && k === 0 && (
                    <span aria-hidden="true" className="absolute -left-2 top-2 text-base text-slate-400">−</span>
                  )}
                  {k === 0 && own[0]?.kind === "digit" && <span className="sr-only">{`${rowLabel(f)}: `}</span>}
                  {render(f, own[k], k, `${underline} text-slate-100`)}
                </span>
              );
            });
          })}
        </div>
        <div className="ml-1 border-l-2 border-slate-200 pl-2">
          <div className="border-b-2 border-slate-200 pb-0.5">
            <span className={`${cell} w-auto px-1 text-slate-100`}>
              <span className="sr-only">entre </span>
              {trace.spec.b}
            </span>
          </div>
          <div className="mt-1 flex gap-0.5" aria-label="Cociente" role="group">
            {quotient.map((f) => render(f, cells(f)[0], 0, "text-cyan-100"))}
          </div>
        </div>
      </div>
      {complete && (
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
  const fields = useMemo(() => divisionFields(trace), [trace]);
  const total = trace.steps.length;
  const [shown, setShown] = useState(Math.min(initialStep ?? 0, total));
  const visible = fields.filter((f) => f.kind === "q" || f.step < shown);
  const current = shown > 0 ? trace.steps[shown - 1] : null;
  return (
    <div className="space-y-3">
      <Galera
        trace={trace}
        fields={visible}
        complete={shown >= total}
        cells={(f) =>
          f.kind === "q"
            ? [{ kind: "digit", value: f.step < shown ? f.text : "", state: f.step < shown ? "ok" : f.step === shown ? "active" : undefined }]
            : rightAligned(f.text, f.width).map((value) => ({ kind: "digit", value }))
        }
      />
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

/** Cifras escritas en una fila, sin los ceros de delante («01» → «1»). */
const typed = (cells: string[]) => cells.join("");
const norm = (text: string) => text.replace(/^0+(?=\d)/, "");

/** Recupera lo escrito desde una respuesta ya enviada (misma disposición). */
function restore(response: string, fields: DivisionField[], layout: DivisionLayout): Work {
  const work: Work = Object.fromEntries(fields.map((f) => [f.key, Array(f.width).fill("")]));
  const m = /^([CA])(\d+);(.*)$/.exec(response);
  if (!m || (m[1] === "C") !== (layout === "completa")) return work;
  const rows = m[3].split(",");
  const rowFields = fields.filter((f) => f.kind !== "q");
  for (const f of fields) {
    const text = f.kind === "q" ? (m[2][f.step] ?? "") : (rows[rowFields.indexOf(f)] ?? "");
    work[f.key] = rightAligned(text, f.width);
  }
  return work;
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
  const fields = useMemo(() => divisionFields(trace), [trace]);
  const refs = useRef(new Map<string, HTMLInputElement | null>());
  const [work, setWork] = useState<Work>(() => restore(response, fields, layout));
  const [miss, setMiss] = useState<string | null>(null);
  const [lastWhy, setLastWhy] = useState("");

  const value = (f: DivisionField, w: Work = work) => norm(typed(w[f.key]));
  const accepted = (f: DivisionField, w: Work = work) => value(f, w) !== "" && Number(value(f, w)) === f.expected;
  // En el modo guiado, el primer campo todavía sin resolver.
  const activeIndex = mode === "guided" ? fields.findIndex((f) => !accepted(f)) : -1;
  const done = mode === "guided" && activeIndex === -1;
  const active = activeIndex >= 0 ? fields[activeIndex] : null;

  const encode = (w: Work) => {
    const filled = fields.every((f) => typed(w[f.key]) !== "");
    if (!filled) return "";
    return encodeDivisionWork(
      layout,
      fields.filter((f) => f.kind === "q").map((f) => typed(w[f.key])).join(""),
      fields.filter((f) => f.kind !== "q").map((f) => typed(w[f.key])),
    );
  };
  const focusField = (f: DivisionField, i = f.kind === "q" ? 0 : Math.max(0, f.width - f.text.length)) =>
    requestAnimationFrame(() => refs.current.get(`${f.key}:${i}`)?.focus());

  const onInput = (f: DivisionField, i: number, digit: string) => {
    const next: Work = { ...work, [f.key]: work[f.key].map((c, k) => (k === i ? digit : c)) };
    setWork(next);
    const text = encode(next);
    onChange(text);
    if (mode === "guided") {
      const v = value(f, next);
      if (accepted(f, next)) {
        setMiss(null);
        const step = trace.steps[f.step];
        const lastOfStep = fields.filter((o) => o.step === f.step).at(-1)!.key === f.key;
        if (lastOfStep) setLastWhy(step.why);
        const following = fields.slice(fields.indexOf(f) + 1).find((o) => !accepted(o, next));
        if (following) focusField(following);
        else onComplete?.(text);
      } else if (v.length >= String(f.expected).length) setMiss(f.key);
      else {
        setMiss(null);
        if (digit && i + 1 < f.width) focusField(f, i + 1);
      }
      return;
    }
    if (digit) {
      if (i + 1 < f.width) focusField(f, i + 1);
      else {
        const following = fields[fields.indexOf(f) + 1];
        if (following) focusField(following, following.kind === "q" ? 0 : 0);
      }
    }
  };
  const onKey = (f: DivisionField, i: number, event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowRight" && i + 1 < f.width) {
      event.preventDefault();
      focusField(f, i + 1);
    } else if (event.key === "ArrowLeft" && i > 0) {
      event.preventDefault();
      focusField(f, i - 1);
    } else if (event.key === "Backspace" && !work[f.key][i] && i > 0) {
      event.preventDefault();
      focusField(f, i - 1);
    }
  };

  // Pistas: pasos ya resueltos como referencia tenue.
  const hinted = hintLevel >= 3 ? Math.max(1, trace.steps.length - 1) : hintLevel >= 2 ? 1 : 0;
  const failed = mode === "free" && failedResponse !== null && failedResponse === response ? checkDivisionWork(spec, failedResponse) : null;
  const wrongKey = failed?.firstError?.key ?? null;

  const visible =
    mode === "guided" ? fields.filter((f) => done || f.kind === "q" || f.step <= (active?.step ?? 0)) : fields;
  const cells = (f: DivisionField): Cell[] => {
    if (mode === "guided") {
      const index = fields.indexOf(f);
      if (done || index < activeIndex) return rightAligned(f.text, f.width).map((value) => ({ kind: "digit", value, state: f.kind === "q" ? "ok" : undefined }));
      if (index === activeIndex)
        return work[f.key].map((value) => ({ kind: "input", value, state: miss === f.key ? "wrong" : "active" }));
      return work[f.key].map(() => ({ kind: "digit", value: "" }));
    }
    const ghost = f.step < hinted ? rightAligned(f.text, f.width) : null;
    return work[f.key].map((value, i) => ({
      kind: "input",
      value,
      state: wrongKey === f.key ? "wrong" : undefined,
      placeholder: ghost?.[i] || undefined,
    }));
  };

  return (
    <div className="space-y-3">
      <Galera trace={trace} fields={visible} cells={cells} onInput={onInput} onKey={onKey} refs={refs} disabled={disabled} complete={done} />
      <div aria-live="polite" className="text-sm leading-relaxed">
        {mode === "guided" ? (
          miss && active ? (
            <p className="rounded-xl bg-amber-950/40 p-3 text-amber-100">
              Revisa {active.kind === "q" ? "esa cifra" : theRow(active)}. {guidedAsk(trace, active)}
            </p>
          ) : !done && active ? (
            <p className="rounded-xl bg-cyan-950/40 p-3 text-cyan-100">
              {lastWhy && <span className="block text-slate-300">{lastWhy}</span>}
              {guidedAsk(trace, active)}
            </p>
          ) : (
            <p className="rounded-xl bg-emerald-950/40 p-3 text-emerald-100">{lastWhy}</p>
          )
        ) : failed?.firstError ? (
          <p className="rounded-xl bg-amber-950/40 p-3 text-amber-100">
            Revisa {failed.firstError.kind === "q" ? `la cifra ${failed.firstError.step + 1} del cociente` : theRow(failed.firstError)}: es la primera casilla que no coincide.
          </p>
        ) : (
          <p className="text-xs text-slate-400">
            Escribe todo el procedimiento: en cada paso, la cifra del cociente,
            {layout === "completa" ? " el producto debajo," : ""} lo que queda al restar con la cifra que bajas al lado. La última fila es el resto.
          </p>
        )}
      </div>
    </div>
  );
}

/** Lo que se pregunta en cada casilla del modo guiado. */
function guidedAsk(trace: DivisionTrace, f: DivisionField): string {
  const s = trace.steps[f.step];
  const b = trace.spec.b;
  if (f.kind === "q") return s.ask;
  if (f.kind === "p") return `Multiplica la cifra del cociente por el divisor: ${s.digit} × ${b}. Escríbelo debajo de ${s.part}, alineado a la derecha.`;
  return s.down === null
    ? `Resta ${s.part} − ${s.product}: lo que queda es el resto.`
    : `Resta ${s.part} − ${s.product} y escribe al lado la cifra que bajas (${s.down}).`;
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
