"use client";

import { useSheetInputMode } from "./NumericKeypad";
import { useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import {
  checkDivisionWork,
  checkOpenDivision,
  dividendText,
  exactPlaces,
  fmt,
  isDecimalDivision,
  encodeOpenDivision,
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
import { Comma, makePreference, OptionPicker, placeColor, typedComma } from "./ColumnOperation";

/* División larga en la «galera»: el dividendo a la izquierda, el divisor a
 * la derecha y el cociente debajo de él. El alumno escribe todo el
 * procedimiento: cada cifra del cociente, cada producto (en la disposición
 * completa) y lo que queda tras restar con la cifra que baja; la última fila
 * es el resto. Modos: guiado (cada casilla se corrige al escribirla), libre
 * (se revisa al enviar, en el servidor) y demostración. */

/** Color de la cifra j del dividendo según su posición (unidades verdes…). */
const dividendColor = (trace: DivisionTrace, j: number) => placeColor(trace.intLength - 1 - j);
/** «4,8 entre 0,15» para el lector de pantalla. */
const say = (n: number) => String(n).replace(".", ",");

/** El dividendo de la galera: con su coma y los ceros añadidos en tenue. */
function DividendDigit({ trace, j, className }: { trace: DivisionTrace; j: number; className: string }) {
  const added = j >= trace.dividendDigits.length - trace.padded;
  return (
    <span className={`${className} relative ${dividendColor(trace, j)} ${added ? "opacity-40" : ""}`}>
      {added && <span className="sr-only">cero añadido </span>}
      {trace.dividendDigits[j]}
      {trace.decimals > 0 && j === trace.intLength - 1 && <Comma />}
    </span>
  );
}

/** Nota previa cuando el divisor tiene coma: los dos se multiplican por 10, 100… */
function ShiftNote({ trace }: { trace: DivisionTrace }) {
  if (!trace.shift) return null;
  return (
    <p className="rounded-xl bg-slate-950 p-3 text-sm text-slate-200">
      El divisor tiene coma: multiplica los dos por {fmt(10 ** trace.shift)}.{" "}
      <strong className="text-cyan-100">
        {fmt(trace.spec.a)} ÷ {fmt(trace.spec.b)} = {fmt(trace.dividend)} ÷ {fmt(trace.divisor)}
      </strong>
      : el cociente no cambia.
    </p>
  );
}

/** La coma del cociente que coloca el alumno: un hueco entre dos cifras. */
interface QuotientComma {
  /** Casilla tras la que está la coma (null: sin coma). */
  at: number | null;
  /** Si se puede tocar; sin él, la coma solo se dibuja. */
  onPick?: (i: number) => void;
  wrong?: boolean;
}

function CommaSlot({ i, comma, disabled }: { i: number; comma: QuotientComma; disabled?: boolean }) {
  const on = comma.at === i;
  return (
    <button
      type="button"
      aria-label={`Poner la coma después de la cifra ${i + 1} del cociente`}
      aria-pressed={on}
      disabled={disabled}
      onClick={() => comma.onPick?.(i)}
      className={`flex h-10 w-5 items-end justify-center rounded border pb-1 text-2xl font-bold leading-none focus-visible:outline-2 focus-visible:outline-cyan-300 sm:h-11 ${
        on
          ? comma.wrong
            ? "border-amber-400 bg-amber-950/60 text-amber-200"
            : "border-cyan-300 bg-cyan-950/60 text-cyan-100"
          : "border-dashed border-slate-600 text-slate-500 hover:text-slate-200"
      }`}
    >
      ,
    </button>
  );
}

/** Las casillas del cociente con la coma (fija o en huecos para tocar). */
function QuotientRow({ boxes, comma, disabled }: { boxes: React.ReactNode[]; comma?: QuotientComma; disabled?: boolean }) {
  return (
    <div className="mt-1 flex items-end gap-0.5" role="group" aria-label="Cociente">
      {boxes.map((box, i) => (
        <span key={i} className="flex items-end gap-0.5">
          {box}
          {comma && !comma.onPick && comma.at === i && (
            <span className="self-end pb-0.5 text-3xl font-bold leading-none text-cyan-100">
              <span aria-hidden="true">,</span>
              <span className="sr-only">coma</span>
            </span>
          )}
          {comma?.onPick && i < boxes.length - 1 && <CommaSlot i={i} comma={comma} disabled={disabled} />}
        </span>
      ))}
    </div>
  );
}

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
  onComma,
  onKey,
  refs,
  disabled,
  complete,
  comma,
}: {
  trace: DivisionTrace;
  /** Coma del cociente: fija (demostración) o en huecos para el alumno. */
  comma?: QuotientComma;
  /** Campos visibles, en orden (cociente y filas). */
  fields: DivisionField[];
  cells: (f: DivisionField) => Cell[];
  onInput?: (f: DivisionField, i: number, value: string) => void;
  /** Se escribió «,» en una casilla del cociente (con o sin cifra ya escrita). */
  onComma?: (f: DivisionField, filled: boolean) => void;
  onKey?: (f: DivisionField, i: number, event: React.KeyboardEvent<HTMLInputElement>) => void;
  refs?: React.MutableRefObject<Map<string, HTMLInputElement | null>>;
  disabled?: boolean;
  complete?: boolean;
}) {
  const keypadMode = useSheetInputMode(isDecimalDivision(trace.spec) ? "decimal" : "numeric");
  const digits = trace.dividendDigits;
  const n = digits.length;
  const cell = "flex h-10 w-7 items-center justify-center text-xl font-bold tabular-nums sm:h-11 sm:w-10 sm:text-2xl";
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
        inputMode={keypadMode}
        autoComplete="off"
        maxLength={1}
        value={c.value}
        placeholder={c.placeholder}
        disabled={disabled}
        onChange={(e) => {
          if (typedComma(e.target.value)) return f.kind === "q" ? onComma?.(f, c.value !== "") : undefined;
          onInput?.(f, i, e.target.value.replace(/\D/g, "").slice(-1));
        }}
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
    <div data-arrow-nav="" className="overflow-x-auto" tabIndex={0} role="group" aria-label={`División ${say(trace.dividend)} entre ${say(trace.divisor)}`}>
      <div className="mx-auto flex w-max items-start">
        <div className="grid gap-y-0.5" style={{ gridTemplateColumns: `repeat(${n}, auto)` }}>
          {digits.map((_, j) => (
            <DividendDigit key={`d${j}`} trace={trace} j={j} className={cell} />
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
              {trace.divisor}
            </span>
          </div>
          <QuotientRow boxes={quotient.map((f) => render(f, cells(f)[0], 0, "text-cyan-100"))} comma={comma} disabled={disabled} />
        </div>
      </div>
      {complete && (
        <p className="mt-2 text-center text-sm text-slate-300">
          Cociente <strong className="text-cyan-100">{trace.quotientText}</strong>
          {trace.decimals || trace.shift ? (
            trace.remainder ? " (no es exacta: sigue sobrando algo)" : " · exacta"
          ) : (
            <>
              {" "}· resto <strong className="text-amber-200">{trace.remainder}</strong>
            </>
          )}
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
      <ShiftNote trace={trace} />
      <Galera
        trace={trace}
        fields={visible}
        complete={shown >= total}
        // La coma aparece en cuanto se baja la primera cifra decimal.
        comma={{ at: trace.commaAfter !== null && shown > trace.commaAfter ? trace.commaAfter : null }}
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
  const expected = String(answer).replace(/\D/g, "").replace(/^0+(?=\d)/, "");
  for (let i = 0; i < Math.max(given.length, expected.length); i++) if (given[i] !== expected[i]) return i;
  return null;
}

/** Cifras escritas en una fila, sin los ceros de delante («01» → «1»). */
const typed = (cells: string[]) => cells.join("");
const norm = (text: string) => text.replace(/^0+(?=\d)/, "");

/** Recupera lo escrito desde una respuesta ya enviada (misma disposición),
 *  con la casilla del cociente tras la que el alumno puso la coma. */
function restore(response: string, fields: DivisionField[], layout: DivisionLayout): { work: Work; comma: number | null } {
  const work: Work = Object.fromEntries(fields.map((f) => [f.key, Array(f.width).fill("")]));
  const m = /^([CA])(\d+)(?:,(\d+))?;(.*)$/.exec(response);
  if (!m || (m[1] === "C") !== (layout === "completa")) return { work, comma: null };
  const quotient = m[2] + (m[3] ?? "");
  const rows = m[4].split(",");
  const rowFields = fields.filter((f) => f.kind !== "q");
  for (const f of fields) {
    const text = f.kind === "q" ? (quotient[f.step] ?? "") : (rows[rowFields.indexOf(f)] ?? "");
    work[f.key] = rightAligned(text, f.width);
  }
  return { work, comma: m[3] === undefined ? null : m[2].length - 1 };
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
  /** guided y free muestran una fila por paso; open deja la galera en
   *  blanco (comprobaciones, repasos y ubicación). */
  mode: "guided" | "free" | "open";
  response: string;
  onChange: (response: string) => void;
  onComplete?: (response: string) => void;
  hintLevel?: number;
  /** Respuesta fallida que sigue escrita (fuera de las comprobaciones). */
  failedResponse?: string | null;
  disabled?: boolean;
}) {
  if (mode === "open")
    return <OpenDivisionSheet spec={spec} response={response} onChange={onChange} hintLevel={hintLevel} failedResponse={failedResponse} disabled={disabled} />;
  return <StepDivisionSheet spec={spec} layout={layout} mode={mode} response={response} onChange={onChange} onComplete={onComplete} hintLevel={hintLevel} failedResponse={failedResponse} disabled={disabled} />;
}

function StepDivisionSheet({
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
  failedResponse?: string | null;
  disabled?: boolean;
}) {
  const trace = useMemo(() => divisionTrace(spec, layout), [spec, layout]);
  const fields = useMemo(() => divisionFields(trace), [trace]);
  const refs = useRef(new Map<string, HTMLInputElement | null>());
  const initial = useMemo(() => restore(response, fields, layout), []); // eslint-disable-line react-hooks/exhaustive-deps
  const [work, setWork] = useState<Work>(initial.work);
  const [miss, setMiss] = useState<string | null>(null);
  const [lastWhy, setLastWhy] = useState("");
  // La coma del cociente la coloca el alumno (casilla tras la que va).
  const decimal = isDecimalDivision(spec);
  const [comma, setComma] = useState<number | null>(initial.comma);
  const [commaOk, setCommaOk] = useState(false);
  const [commaMiss, setCommaMiss] = useState<number | null>(null);

  const value = (f: DivisionField, w: Work = work) => norm(typed(w[f.key]));
  const accepted = (f: DivisionField, w: Work = work) => value(f, w) !== "" && Number(value(f, w)) === f.expected;
  // En el modo guiado, el primer campo todavía sin resolver.
  const firstOpen = mode === "guided" ? fields.findIndex((f) => !accepted(f)) : -1;
  // Guiado: tras bajar la primera cifra decimal (la fila del paso de la
  // coma), el alumno marca la coma antes de seguir con el cociente.
  const commaRow = trace.commaAfter === null ? -1 : fields.findIndex((f) => f.key === `r${trace.commaAfter}`);
  const askingComma = mode === "guided" && commaRow >= 0 && !commaOk && (firstOpen === -1 || firstOpen > commaRow);
  const activeIndex = askingComma ? -1 : firstOpen;
  const done = mode === "guided" && firstOpen === -1 && !askingComma;
  const active = activeIndex >= 0 ? fields[activeIndex] : null;

  const encode = (w: Work, at = mode === "guided" ? trace.commaAfter : comma) => {
    const filled = fields.every((f) => typed(w[f.key]) !== "");
    if (!filled) return "";
    const digits = fields.filter((f) => f.kind === "q").map((f) => typed(w[f.key])).join("");
    return encodeDivisionWork(
      layout,
      at === null || at >= digits.length - 1 ? digits : `${digits.slice(0, at + 1)},${digits.slice(at + 1)}`,
      fields.filter((f) => f.kind !== "q").map((f) => typed(w[f.key])),
    );
  };
  const pickComma = (i: number) => {
    if (mode === "guided") {
      if (i === trace.commaAfter) {
        setCommaOk(true);
        setCommaMiss(null);
        setLastWhy("La coma va en el cociente justo cuando bajas la primera cifra decimal: lo que sigue son décimas, centésimas…");
        const following = fields.find((o) => !accepted(o));
        if (following) focusField(following);
      } else setCommaMiss(i);
      return;
    }
    placeComma(comma === i ? null : i);
  };
  const placeComma = (at: number | null) => {
    setComma(at);
    onChange(encode(work, at));
  };
  // «,» en el cociente (se escribe de izquierda a derecha): después de una
  // casilla llena, o antes de una vacía. Escribirla donde ya está la quita.
  const typeComma = (f: DivisionField, filled: boolean) => {
    if (mode !== "free" || !decimal) return;
    const at = filled ? f.step : f.step - 1;
    if (at >= 0 && at < trace.steps.length - 1) placeComma(at === comma ? null : at);
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
        // Tras la fila que baja la primera cifra decimal, primero la coma.
        if (fields.indexOf(f) === commaRow && !commaOk) return;
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
  const commaWrong = !!failed && !failed.firstError && !failed.commaCorrect;

  // Guiado: pasos a la vista y campos ya resueltos (también mientras se pide la coma).
  const visibleStep = done ? Infinity : askingComma ? trace.commaAfter! : (active?.step ?? 0);
  const solvedUpTo = askingComma ? (firstOpen === -1 ? fields.length : firstOpen) : activeIndex;
  const visible =
    mode === "guided" ? fields.filter((f) => f.kind === "q" || f.step <= visibleStep) : fields;
  const cells = (f: DivisionField): Cell[] => {
    if (mode === "guided") {
      const index = fields.indexOf(f);
      if (done || index < solvedUpTo) return rightAligned(f.text, f.width).map((value) => ({ kind: "digit", value, state: f.kind === "q" ? "ok" : undefined }));
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
      <ShiftNote trace={trace} />
      <Galera
        trace={trace}
        fields={visible}
        cells={cells}
        onInput={onInput}
        onComma={typeComma}
        onKey={onKey}
        refs={refs}
        disabled={disabled}
        complete={done}
        comma={
          mode === "guided"
            ? askingComma
              ? { at: commaMiss, onPick: pickComma, wrong: commaMiss !== null }
              : { at: commaOk ? trace.commaAfter : null }
            : decimal
              ? { at: comma }
              : undefined
        }
      />
      <div aria-live="polite" className="text-sm leading-relaxed">
        {mode === "guided" ? (
          askingComma ? (
            <p className={`rounded-xl p-3 ${commaMiss !== null ? "bg-amber-950/40 text-amber-100" : "bg-cyan-950/40 text-cyan-100"}`}>
              {commaMiss === null && lastWhy && <span className="block text-slate-300">{lastWhy}</span>}
              {commaMiss !== null
                ? "Ahí no. La coma separa las cifras que salen de la parte entera del dividendo de las que salen de sus decimales."
                : `Acabas de bajar el ${trace.steps[trace.commaAfter!].down}, la primera cifra decimal. Antes de seguir, toca dónde va la coma en el cociente.`}
            </p>
          ) : miss && active ? (
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
        ) : commaWrong ? (
          <p className="rounded-xl bg-amber-950/40 p-3 text-amber-100">
            Las cifras están bien: revisa la coma del cociente. Va justo cuando bajas la primera cifra decimal del dividendo.
          </p>
        ) : (
          <p className="text-xs text-slate-400">
            Escribe todo el procedimiento: en cada paso, la cifra del cociente,
            {layout === "completa" ? " el producto debajo," : ""} lo que queda al restar con la cifra que bajas al lado.{" "}
            {decimal
              ? "Pon la coma del cociente, si la lleva, escribiendo «,» en su casilla: va al bajar la primera cifra decimal (otra vez en el mismo sitio, la quitas)."
              : "La última fila es el resto."}
          </p>
        )}
      </div>
    </div>
  );
}

/**
 * Galera en blanco: el alumno decide dónde empezar, cuántas filas escribe y
 * si anota los productos. Se valida el cociente y la secuencia de filas
 * (ver `checkOpenDivision`), no la posición exacta de cada cifra.
 */
function OpenDivisionSheet({
  spec,
  response,
  onChange,
  hintLevel = 0,
  failedResponse = null,
  disabled,
}: {
  spec: DivisionSpec;
  response: string;
  onChange: (response: string) => void;
  hintLevel?: number;
  failedResponse?: string | null;
  disabled?: boolean;
}) {
  const keypadMode = useSheetInputMode(isDecimalDivision(spec) ? "decimal" : "numeric");
  const trace = useMemo(() => divisionTrace(spec), [spec]);
  const n = trace.dividendDigits.length;
  // Casillas del cociente: tantas como cifras puede tener (con decimales, el
  // primer reparto no pasa de la parte entera).
  const qCells = Math.max(1, n - Math.min(String(trace.divisor).length, trace.intLength) + 1);
  const decimal = isDecimalDivision(spec);
  const maxRows = 2 * n + 2;
  const [state, setState] = useState(() => {
    const m = /^L(\d*)(?:,(\d+))?;(.*)$/.exec(response);
    const quotient = Array<string>(qCells).fill("");
    const rows: string[][] = [];
    let comma: number | null = null;
    if (m) {
      const digits = (m[1] + (m[2] ?? "")).split("").slice(-qCells);
      digits.forEach((d, i) => (quotient[qCells - digits.length + i] = d));
      if (m[2] !== undefined) comma = qCells - m[2].length - 1;
      for (const text of m[3].split(",")) rows.push(rightAligned(text, n));
    }
    while (rows.length < 2) rows.push(Array(n).fill(""));
    return { quotient, rows, comma };
  });
  const refs = useRef(new Map<string, HTMLInputElement | null>());
  const focus = (key: string) => requestAnimationFrame(() => refs.current.get(key)?.focus());

  const emit = (next: typeof state) => {
    setState(next);
    // Una casilla vacía entre cifras (o entre la coma y las cifras) deja el
    // cociente incompleto: la coma no sabría cuántas cifras tiene detrás.
    const filled = next.quotient.map((d, i) => (d ? i : -1)).filter((i) => i >= 0);
    const [first, last] = [filled[0] ?? -1, filled.at(-1) ?? -1];
    const at = next.comma;
    const gap =
      first < 0 ||
      next.quotient.slice(first, last + 1).some((d) => !d) ||
      (at !== null && at < last && at + 1 < first);
    let q = "";
    if (!gap) {
      const digits = next.quotient.slice(first, last + 1).join("");
      const after = at === null || at >= last ? 0 : last - Math.max(at, first - 1);
      q = after ? `${digits.slice(0, digits.length - after)},${digits.slice(-after)}` : digits;
    }
    const rows = next.rows.map((r) => r.join("")).filter(Boolean);
    onChange(q && rows.length ? encodeOpenDivision(q, rows) : "");
  };
  const setQ = (i: number, d: string) => {
    emit({ ...state, quotient: state.quotient.map((c, k) => (k === i ? d : c)) });
    if (d && i + 1 < qCells) focus(`q:${i + 1}`);
  };
  const setCell = (r: number, j: number, d: string) => {
    emit({ ...state, rows: state.rows.map((row, k) => (k === r ? row.map((c, x) => (x === j ? d : c)) : row)) });
    if (d && j + 1 < n) focus(`r${r}:${j + 1}`);
  };
  const failed = failedResponse !== null && failedResponse === response ? checkOpenDivision(spec, failedResponse) : null;
  // Pistas: las primeras cifras del cociente, en tenue.
  const hinted = hintLevel >= 3 ? Math.max(1, trace.steps.length - 1) : hintLevel >= 2 ? 1 : 0;
  const offset = qCells - trace.steps.length;
  const cell =
    "flex h-10 w-7 items-center justify-center rounded-md border text-center text-xl font-bold tabular-nums placeholder:opacity-40 focus:outline-2 focus:outline-cyan-300 sm:h-11 sm:w-10 sm:text-2xl";
  const placeComma = (at: number | null) => emit({ ...state, comma: at });
  const input = (
    key: string,
    label: string,
    value: string,
    onValue: (d: string) => void,
    extra: string,
    placeholder?: string,
    onComma?: (filled: boolean) => void,
  ) => (
    <input
      key={key}
      ref={(el) => {
        refs.current.set(key, el);
      }}
      aria-label={label}
      inputMode={keypadMode}
      autoComplete="off"
      maxLength={1}
      value={value}
      placeholder={placeholder}
      disabled={disabled}
      onFocus={(e) => e.target.select()}
      onChange={(e) => {
        if (typedComma(e.target.value)) return onComma?.(value !== "");
        onValue(e.target.value.replace(/\D/g, "").slice(-1));
      }}
      className={`${cell} ${extra}`}
    />
  );
  return (
    <div className="space-y-3">
      <ShiftNote trace={trace} />
      <div className="overflow-x-auto" tabIndex={0} role="group" aria-label={`División ${say(trace.dividend)} entre ${say(trace.divisor)}`}>
        <div className="mx-auto flex w-max items-start">
          <div className="grid gap-y-0.5" style={{ gridTemplateColumns: `repeat(${n}, auto)` }}>
            {trace.dividendDigits.map((_, j) => (
              <DividendDigit key={`d${j}`} trace={trace} j={j} className="flex h-10 w-7 items-center justify-center text-xl font-bold sm:h-11 sm:w-10 sm:text-2xl" />
            ))}
            {state.rows.map((row, r) =>
              row.map((value, j) =>
                input(`r${r}:${j}`, `Fila ${r + 1}: columna ${j + 1} de ${n}`, value, (d) => setCell(r, j, d), "border-slate-700 bg-slate-950 text-slate-100"),
              ),
            )}
          </div>
          <div className="ml-1 border-l-2 border-slate-200 pl-2">
            <div className="border-b-2 border-slate-200 pb-0.5">
              <span className="flex h-10 items-center px-1 text-xl font-bold text-slate-100 sm:h-11 sm:text-2xl">
                <span className="sr-only">entre </span>
                {trace.divisor}
              </span>
            </div>
            <QuotientRow
              comma={decimal ? { at: state.comma } : undefined}
              disabled={disabled}
              boxes={state.quotient.map((value, i) => {
                const step = i - offset;
                return input(
                  `q:${i}`,
                  `Cociente: cifra ${i + 1}`,
                  value,
                  (d) => setQ(i, d),
                  failed && !failed.quotientCorrect ? "border-amber-400 bg-amber-950/50 text-cyan-100" : "border-slate-600 bg-slate-950 text-cyan-100",
                  step >= 0 && step < hinted ? String(trace.steps[step].digit) : undefined,
                  // «,»: después de una casilla llena, o antes de una vacía;
                  // donde ya está, la quita.
                  decimal
                    ? (filled) => {
                        const at = filled ? i : i - 1;
                        if (at >= 0 && at < qCells - 1) placeComma(at === state.comma ? null : at);
                      }
                    : undefined,
                );
              })}
            />
          </div>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={secondaryButton}
          disabled={disabled || state.rows.length >= maxRows}
          onClick={() => emit({ ...state, rows: [...state.rows, Array(n).fill("")] })}
        >
          Añadir fila
        </button>
        <button
          type="button"
          className={secondaryButton}
          disabled={disabled || state.rows.length <= 1}
          onClick={() => emit({ ...state, rows: state.rows.slice(0, -1) })}
        >
          Quitar la última fila
        </button>
      </div>
      <p aria-live="polite" className="text-xs text-slate-400">
        {failed && !failed.quotientCorrect
          ? "Revisa el cociente."
          : failed?.mismatch
            ? `Revisa ${failed.mismatch.kind === "p" ? "el producto" : "la resta"} del paso ${failed.mismatch.step + 1}.`
            : `Escribe el cociente y, debajo del dividendo, cada resta con la cifra que bajas (puedes anotar también los productos). ${
                decimal ? "Pon la coma del cociente, si la lleva, escribiendo «,» en su casilla." : "La última fila es el resto."
              }`}
      </p>
    </div>
  );
}

/** Lo que se pregunta en cada casilla del modo guiado. */
function guidedAsk(trace: DivisionTrace, f: DivisionField): string {
  const s = trace.steps[f.step];
  const b = trace.divisor;
  if (f.kind === "q") return s.ask;
  if (f.kind === "p") return `Multiplica la cifra del cociente por el divisor: ${s.digit} × ${b}. Escríbelo debajo de ${s.part}, alineado a la derecha.`;
  return s.down === null
    ? `Resta ${s.part} − ${s.product}: lo que queda ${trace.decimals || trace.shift ? "es lo que sobra al final" : "es el resto"}.`
    : `Resta ${s.part} − ${s.product} y escribe al lado la cifra que bajas (${s.down}).`;
}

/** Exploración de la clase: el alumno elige dividendo y divisor; con
 *  `decimals`, también si sigue dividiendo tras la coma o si los datos tienen coma. */
export function DivisionExplorer({ id, decimals = false }: { id: string; decimals?: boolean }) {
  const [a, setA] = useState(decimals ? 27 : 756);
  const [b, setB] = useState(decimals ? 8 : 3);
  const [kind, setKind] = useState<"natural" | "cociente" | "dividendo" | "divisor">(decimals ? "cociente" : "natural");
  const [layout, setLayout] = useDivisionLayout();
  // Los datos con coma se forman dividiendo entre 10 los que da el deslizador.
  const base: DivisionSpec =
    kind === "dividendo" ? { op: "divide", a: a / 10, b } : kind === "divisor" ? { op: "divide", a, b: b / 10 } : { op: "divide", a, b };
  // Con coma, se sigue dividiendo hasta que sea exacta (o hasta las centésimas).
  const spec: DivisionSpec = kind === "natural" ? base : { ...base, places: exactPlaces(base.a, base.b, 3) ?? 2 };
  const trace = divisionTrace(spec, layout);
  const q = trace.steps.map((s) => s.digit).join("");
  const exact = trace.remainder === 0;
  return (
    <>
      {decimals && (
        <OptionPicker
          label="Qué tiene coma"
          options={[
            { id: "natural", label: "Sin coma (con resto)" },
            { id: "cociente", label: "Seguir tras la coma" },
            { id: "dividendo", label: "Dividendo con coma" },
            { id: "divisor", label: "Divisor con coma" },
          ]}
          value={kind}
          onChange={setKind}
        />
      )}
      <Slider id={`${id}-a`} label={kind === "dividendo" ? "Dividendo (en décimas)" : "Dividendo"} value={a} min={decimals ? 1 : 100} max={999} onChange={setA} />
      <Slider id={`${id}-b`} label={kind === "divisor" ? "Divisor (en décimas)" : "Divisor"} value={b} min={2} max={25} onChange={setB} />
      <LayoutPicker layout={layout} onChange={setLayout} />
      {decimals && (
        <p className="text-sm text-slate-300">
          {fmt(spec.a)} ÷ {fmt(spec.b)}
          {trace.shift ? ` = ${fmt(trace.dividend)} ÷ ${fmt(trace.divisor)}` : ""} ={" "}
          <strong className="text-cyan-100">{trace.quotientText}</strong>
          {kind !== "natural" && !exact ? ` (con ${trace.decimals} decimales; no es exacta)` : ""}
          {trace.padded ? `. Dividendo con ceros añadidos: ${dividendText(trace)}` : ""}
        </p>
      )}
      <DivisionDemo key={`${spec.a}-${spec.b}-${spec.places ?? 0}-${layout}`} spec={spec} layout={layout} initialStep={Infinity} />
      <Challenge
        goals={
          decimals
            ? [
                {
                  text: "Sigue tras la coma y consigue un cociente exacto con dos cifras decimales.",
                  met: kind === "cociente" && exact && trace.decimals === 2,
                  hint: "Prueba a dividir entre 4: los restos 1, 2 y 3 se acaban en las centésimas.",
                },
                {
                  text: "Consigue un cociente que empiece por 0, (el divisor no cabe en la parte entera).",
                  met: trace.decimals > 0 && trace.quotient < 1,
                },
                {
                  text: "Con el divisor con coma, consigue un cociente mayor que el dividendo. ¿Qué tiene que pasar con el divisor?",
                  met: kind === "divisor" && trace.quotient > spec.a,
                  hint: "Un divisor menor que 1 cabe más de una vez en cada unidad.",
                },
              ]
            : [
                {
                  text: "Consigue una división con un 0 en medio del cociente.",
                  met: q.length > 2 && q.slice(1, -1).includes("0"),
                  hint: "Prueba con un dividendo como 612 y un divisor que quepa justo en la primera cifra.",
                },
                { text: "Consigue una división exacta (resto 0) con un divisor mayor que 9.", met: b > 9 && trace.remainder === 0 },
                { text: "Consigue un cociente de dos cifras. ¿Qué tiene que pasar con la primera cifra del dividendo?", met: q.length === 2 },
              ]
        }
      />
    </>
  );
}
