"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { makePreference } from "./preferences";
import { calculatorBoardClass, calculatorBoardStyle } from "./calculatorBoard";
import { useSheetInputMode } from "./NumericKeypad";
import { ArrowLeft, ArrowRight } from "lucide-react";
import {
  columnTrace,
  decimalsOf,
  digitsOf,
  scaled,
  placeName,
  SUBTRACT_STRATEGIES,
  type ArithmeticSpec,
  type ColumnTrace,
  type SubtractStrategy,
} from "@/lib/learning/core";
import { secondaryButton } from "./LearningShell";
import { Challenge } from "./Challenge";
import { Slider } from "./GraphVisuals";

/* Hoja de cálculo en columnas: suma y resta de naturales con llevadas,
 * préstamos o compensación. Modos:
 * - guided: columna a columna; cada cifra se corrige al escribirla.
 * - free: el alumno opera solo; las notas de llevada son suyas.
 * - demo: el desarrollo paso a paso (ejemplos, clase y solución). */

/** Colores por posición (convención Montessori: unidades verdes, decenas
 *  azules, centenas rojas; se repite en cada periodo de miles). */
const PLACE_COLORS = ["text-emerald-300", "text-sky-300", "text-rose-300"];
export const placeColor = (column: number) => PLACE_COLORS[((column % 3) + 3) % 3];
/** La coma decimal, a la derecha de la columna de las unidades. */
export const Comma = () => (
  <span aria-hidden="true" className="pointer-events-none absolute -right-2 bottom-0 text-3xl font-bold text-slate-100">,</span>
);

/**
 * Fila de huecos bajo el resultado de una cuadrícula en columnas: el alumno
 * toca dónde va la coma. El hueco k deja k cifras a su derecha. No dice qué
 * posición es (decenas, décimas…) para no dar la respuesta.
 */
export function CommaSlotRow({
  order,
  cells,
  active,
  onPick,
  disabled,
  wrong,
}: {
  /** Columnas de la cuadrícula de izquierda a derecha (la más alta primero). */
  order: number[];
  /** Casillas del resultado: hay huecos entre ellas (1…cells−1). */
  cells: number;
  active: number | null;
  onPick: (k: number) => void;
  disabled?: boolean;
  wrong?: boolean;
}) {
  return (
    <>
      <span aria-hidden="true" />
      {order.map((i) => (
        <span key={`coma${i}`} className="relative h-9">
          {i >= 1 && i < cells && (
            <button
              type="button"
              aria-label={`Poner la coma con ${i} ${i === 1 ? "cifra" : "cifras"} a su derecha`}
              aria-pressed={active === i}
              disabled={disabled}
              onClick={() => onPick(i)}
              className={`absolute -right-3.5 top-0 z-10 flex h-9 w-6 items-start justify-center rounded-md border text-2xl font-bold leading-6 focus-visible:outline-2 focus-visible:outline-cyan-300 disabled:cursor-default ${
                active === i
                  ? wrong
                    ? "border-amber-400 bg-amber-950/60 text-amber-200"
                    : "border-cyan-300 bg-cyan-950/60 text-cyan-100"
                  : "border-dashed border-slate-600 text-slate-500 hover:text-slate-200"
              }`}
            >
              ,
            </button>
          )}
        </span>
      ))}
    </>
  );
}

/** «,» o «.» escrito en una casilla de una cifra: se pone la coma y la cifra no cambia. */
export const typedComma = (raw: string) => /[,.]/.test(raw);

/** Cifras de una respuesta escrita con coma, por columna (0 = la de la
 *  derecha), y cuántas quedan tras la coma (null si no hay coma). */
export function writtenColumns(response: string): { digits: string[]; comma: number | null } {
  const clean = response.replace(/[^\d,.]/g, "");
  if (!clean) return { digits: [], comma: null };
  const [int = "", frac] = clean.split(/[,.]/);
  return { digits: (int + (frac ?? "")).split("").reverse(), comma: frac === undefined ? null : frac.length };
}

/** Texto de las cifras escritas (por columna) con la coma en el hueco elegido. */
export function columnsText(digits: string[], comma: number | null): string {
  const highest = digits.reduce((h, d, i) => (d ? i : h), -1);
  if (highest < 0) return "";
  const k = comma ?? 0;
  const text = (from: number, to: number) => digits.slice(from, to).reverse().join("");
  if (!k) return text(0, highest + 1).replace(/^0+(?=\d)/, "");
  const int = highest >= k ? text(k, highest + 1).replace(/^0+(?=\d)/, "") : "0";
  return `${int},${text(0, k).padStart(k, "0")}`;
}

// ── Estrategia de resta (preferencia del alumno en este navegador) ──────

export { makePreference } from "./preferences";

export const useSubtractStrategy = makePreference<SubtractStrategy>(
  "maths:resta:estrategia",
  SUBTRACT_STRATEGIES.map((s) => s.id),
  "prestamo",
);

/** Elección entre maneras correctas de escribir un procedimiento. */
export function OptionPicker<T extends string>({
  label,
  options,
  value,
  onChange,
  disabled,
}: {
  label: string;
  options: readonly { id: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  disabled?: boolean;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-2">
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          role="radio"
          aria-checked={value === option.id}
          disabled={disabled}
          onClick={() => onChange(option.id)}
          className={`min-h-11 rounded-full border px-4 text-sm font-semibold ${
            value === option.id
              ? "border-cyan-300 bg-cyan-950/60 text-cyan-100"
              : "border-slate-600 bg-slate-950 text-slate-300"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function StrategyPicker({
  strategy,
  onChange,
  disabled,
}: {
  strategy: SubtractStrategy;
  onChange: (s: SubtractStrategy) => void;
  disabled?: boolean;
}) {
  return (
    <OptionPicker
      label="Cómo restar cuando la cifra de arriba es menor"
      options={SUBTRACT_STRATEGIES}
      value={strategy}
      onChange={onChange}
      disabled={disabled}
    />
  );
}

// ── Cuadrícula ──────────────────────────────────────────────────────────

interface Marks {
  /** Pequeño número sobre la columna (llevada o cifra tras el préstamo). */
  above?: string;
  /** La cifra de arriba se tacha (préstamo). */
  crossTop?: boolean;
  /** «1» delante de la cifra de arriba: +10 (compensación). */
  plusTen?: boolean;
  /** «+1» junto a la cifra de abajo (compensación). */
  plusOneBottom?: boolean;
}

/** Marcas visibles en cada columna cuando ya se mostraron `shown` pasos. En
 *  la resta, el paso activo prepara su columna antes de escribir la cifra. */
function marksFor(trace: ColumnTrace, shown: number, prepare: boolean): Marks[] {
  const width = trace.steps.length;
  const marks: Marks[] = Array.from({ length: width }, () => ({}));
  const limit = Math.min(width, shown + (prepare && trace.spec.op === "subtract" ? 1 : 0));
  for (let i = 0; i < limit; i++) {
    const step = trace.steps[i];
    if (trace.spec.op === "add") {
      if (i < shown && step.regroup && marks[i + 1]) marks[i + 1].above = "1";
    } else if (trace.strategy === "prestamo") {
      if (step.workTop !== step.top) {
        marks[i].crossTop = true;
        marks[i].above = String(step.workTop);
      }
    } else {
      if (step.regroup) marks[i].plusTen = true;
      if (step.workBottom !== step.bottom) marks[i].plusOneBottom = true;
    }
  }
  return marks;
}

type Cell =
  | { kind: "digit"; value: number | null; ghost?: boolean; state?: "ok" | "wrong" | "active" }
  | { kind: "input"; value: string; state?: "ok" | "wrong" | "active"; placeholder?: string };

function Grid({
  trace,
  marks,
  result,
  notes,
  onInput,
  onNote,
  onKey,
  inputRefs,
  idPrefix,
  disabled,
  resultComma,
  slots,
  onComma,
  calculator = false,
}: {
  trace: ColumnTrace;
  calculator?: boolean;
  /** Se escribió «,» en la casilla `column` (con o sin cifra ya escrita). */
  onComma?: (column: number, filled: boolean) => void;
  /** Coma del resultado: undefined, la de la operación; null, ninguna; k, con k cifras a la derecha. */
  resultComma?: number | null;
  /** Huecos para que el alumno ponga la coma bajo el resultado. */
  slots?: { active: number | null; onPick: (k: number) => void; wrong?: boolean };
  marks: Marks[];
  /** Una celda por columna del resultado, de unidades hacia la izquierda. */
  result: Cell[];
  notes?: string[];
  onInput?: (column: number, value: string) => void;
  onNote?: (column: number, value: string) => void;
  onKey?: (column: number, event: React.KeyboardEvent<HTMLInputElement>) => void;
  inputRefs?: React.MutableRefObject<(HTMLInputElement | null)[]>;
  idPrefix: string;
  disabled?: boolean;
}) {
  // Con decimales, el teclado del teléfono también ofrece la coma.
  const keypadMode = useSheetInputMode(trace.scale ? "decimal" : "numeric");
  const columns = Math.max(trace.steps.length, result.length);
  // De izquierda a derecha en pantalla: la columna más alta primero.
  const order = Array.from({ length: columns }, (_, k) => columns - 1 - k);
  // Con decimales, las columnas 0…scale−1 están a la derecha de la coma; los
  // ceros que completan los decimales se ven tenues.
  const { scale } = trace;
  const sc = scaled(trace.spec);
  const top = trace.topDigits, bottom = trace.bottomDigits;
  const topLen = Math.max(digitsOf(sc.a).length, scale + 1), bottomLen = Math.max(digitsOf(sc.b).length, scale + 1);
  const padTop = scale - decimalsOf(trace.spec.a), padBottom = scale - decimalsOf(trace.spec.b);
  const name = (i: number) => placeName(i - scale);
  const color = (i: number) => placeColor(i - scale);
  const comma = (i: number) => (scale > 0 && i === scale ? <Comma /> : null);
  const ownComma = (i: number) =>
    resultComma === undefined ? comma(i) : resultComma && i === resultComma ? <Comma /> : null;
  const say = (n: number) => String(n).replace(".", ",");
  const symbol = trace.spec.op === "add" ? "+" : "−";
  const cell = calculator
    ? "flex h-14 w-12 items-center justify-center text-4xl font-bold tabular-nums sm:h-16 sm:w-14"
    : "flex h-11 w-8 items-center justify-center text-2xl font-bold tabular-nums sm:h-12 sm:w-12 sm:text-3xl";
  return (
    // Enfocable: si no cabe (pantallas muy estrechas), se recorre con el teclado.
    <div
      data-arrow-nav=""
      className={calculator ? calculatorBoardClass : "overflow-x-auto"}
      style={calculator ? calculatorBoardStyle : undefined}
      tabIndex={0}
      role="group"
      aria-label={`${say(trace.spec.a)} ${trace.spec.op === "add" ? "más" : "menos"} ${say(trace.spec.b)} en columnas`}
    >
      <div
        className="mx-auto grid w-max gap-x-1"
        style={{ gridTemplateColumns: `1.75rem repeat(${columns}, auto)` }}
      >
        {/* Fila de marcas o notas */}
        <span aria-hidden="true" />
        {order.map((i) => (
          <span key={`m${i}`} className={`flex items-end justify-center text-base font-bold text-amber-200 ${calculator ? "h-12" : "h-8"}`}>
            {notes && onNote ? (
              <input
                aria-label={`Nota para ${name(i)} (llevada o préstamo, opcional)`}
                inputMode={keypadMode}
                maxLength={2}
                value={notes[i] ?? ""}
                disabled={disabled}
                onChange={(e) => onNote(i, e.target.value.replace(/\D/g, ""))}
                className={calculator ? "h-11 w-11 rounded-lg border border-slate-600 bg-slate-800/90 text-center text-xl text-amber-200 focus:border-amber-300 focus:outline-none" : "h-7 w-7 rounded border border-dashed border-slate-600 bg-transparent text-center text-sm text-amber-200 focus:border-amber-300 focus:outline-none"}
              />
            ) : (
              marks[i]?.above && (
                <span>
                  <span className="sr-only">{`Marca en ${name(i)}: `}</span>
                  {marks[i].above}
                </span>
              )
            )}
          </span>
        ))}
        {/* Primer número */}
        <span aria-hidden="true" />
        {order.map((i) => (
          <span key={`t${i}`} className={`${cell} relative ${color(i)} ${i < padTop ? "opacity-40" : ""}`}>
            {comma(i)}
            {i < padTop && <span className="sr-only">cero añadido </span>}
            {i < topLen && (
              <>
                {marks[i]?.plusTen && (
                  <span className="mr-0.5 self-start text-base text-amber-200">
                    <span className="sr-only">más diez: </span>1
                  </span>
                )}
                <span className={marks[i]?.crossTop ? "line-through decoration-amber-300 decoration-2 opacity-60" : ""}>
                  {marks[i]?.crossTop && <span className="sr-only">tachado </span>}
                  {top[i]}
                </span>
              </>
            )}
          </span>
        ))}
        {/* Segundo número */}
        <span className={`${cell} text-slate-200`}>
          <span aria-hidden="true">{symbol}</span>
          <span className="sr-only">{trace.spec.op === "add" ? "más" : "menos"}</span>
        </span>
        {order.map((i) => (
          <span key={`b${i}`} className={`${cell} relative ${color(i)} ${i < padBottom ? "opacity-40" : ""}`}>
            {comma(i)}
            {i < padBottom && <span className="sr-only">cero añadido </span>}
            {i < bottomLen && bottom[i]}
            {marks[i]?.plusOneBottom && (
              <span className="ml-0.5 self-start text-base text-amber-200">
                <span className="sr-only">compensado, </span>+1
              </span>
            )}
          </span>
        ))}
        <span aria-hidden="true" className="col-span-full my-1 h-0.5 bg-slate-200" />
        {/* Resultado */}
        <span aria-hidden="true" />
        {order.map((i) => {
          const c = result[i];
          if (!c) return <span key={`r${i}`} className={cell} />;
          const ring =
            c.state === "wrong"
              ? "border-amber-400 bg-amber-950/50"
              : c.state === "ok"
                ? "border-emerald-400/70 bg-emerald-950/30"
                : c.state === "active"
                  ? "border-cyan-300 bg-cyan-950/40"
                  : calculator ? "border-slate-600 bg-slate-800/90" : "border-slate-600 bg-slate-950";
          if (c.kind === "digit")
            return (
              <span key={`r${i}`} className={`${cell} relative rounded-lg border ${ring} ${color(i)} ${c.ghost ? "opacity-50" : ""}`}>
                {c.value ?? ""}
                {ownComma(i)}
              </span>
            );
          return (
            <span key={`r${i}`} className="relative">
            {ownComma(i)}
            <input
              id={`${idPrefix}-r${i}`}
              ref={(el) => {
                if (inputRefs) inputRefs.current[i] = el;
              }}
              aria-label={`Resultado: ${name(i)}`}
              aria-invalid={c.state === "wrong"}
              inputMode={keypadMode}
              autoComplete="off"
              maxLength={1}
              value={c.value}
              placeholder={c.placeholder}
              disabled={disabled || (c.state === "ok" && c.kind === "input" && !onKey)}
              onChange={(e) => {
                if (typedComma(e.target.value)) return onComma?.(i, c.value !== "");
                onInput?.(i, e.target.value.replace(/\D/g, "").slice(-1));
              }}
              onKeyDown={(e) => onKey?.(i, e)}
              onFocus={(e) => e.target.select()}
              className={`${cell} rounded-lg border ${ring} ${color(i)} text-center placeholder:opacity-40 focus:outline-2 focus:outline-cyan-300`}
            />
            </span>
          );
        })}
        {slots && <CommaSlotRow order={order} cells={result.length} active={slots.active} onPick={slots.onPick} disabled={disabled} wrong={slots.wrong} />}
      </div>
    </div>
  );
}

// ── Demostración paso a paso ────────────────────────────────────────────

export function ColumnDemo({
  spec,
  strategy,
  initialStep,
}: {
  spec: ArithmeticSpec;
  strategy: SubtractStrategy;
  /** Pasos ya mostrados al abrir (por defecto, ninguno; el desarrollo completo usa todos). */
  initialStep?: number;
}) {
  const trace = useMemo(() => columnTrace(spec, strategy), [spec, strategy]);
  const total = trace.steps.length;
  const [shown, setShown] = useState(Math.min(initialStep ?? 0, total));
  const id = useId();
  const result: Cell[] = trace.steps.map((step, i) => ({
    kind: "digit",
    value: i < shown && i < trace.width ? step.digit : null,
    state: i === shown ? "active" : undefined,
  }));
  const current = shown > 0 ? trace.steps[shown - 1] : null;
  return (
    <div className="space-y-3">
      <Grid trace={trace} marks={marksFor(trace, shown, shown < total)} result={result} idPrefix={id} />
      <p aria-live="polite" className="min-h-12 rounded-xl bg-slate-950 p-3 text-sm leading-relaxed text-slate-200">
        {current
          ? current.why
          : shown < total
            ? `Empieza por la derecha: ${trace.steps[0].ask}`
            : ""}
      </p>
      <div className="flex flex-wrap gap-2">
        <button type="button" className={secondaryButton} disabled={shown === 0} onClick={() => setShown(shown - 1)}>
          <ArrowLeft size={16} aria-hidden="true" /> Paso anterior
        </button>
        <button type="button" className={secondaryButton} disabled={shown >= total} onClick={() => setShown(shown + 1)}>
          {shown === 0 ? "Empezar" : "Siguiente columna"} <ArrowRight size={16} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

/** Exploración de la clase: el alumno elige los números y la operación. */
export function ColumnExplorer({ id }: { id: string }) {
  const [op, setOp] = useState<ArithmeticSpec["op"]>("add");
  const [a, setA] = useState(325);
  const [b, setB] = useState(148);
  // Decimales de cada número: el deslizador da el número sin coma.
  const [da, setDa] = useState<"0" | "1" | "2">("0");
  const [db, setDb] = useState<"0" | "1" | "2">("0");
  const [strategy, setStrategy] = useSubtractStrategy();
  const x = Number((a / 10 ** Number(da)).toFixed(Number(da)));
  const y = Number((b / 10 ** Number(db)).toFixed(Number(db)));
  // En la resta se escribe arriba el mayor.
  const spec: ArithmeticSpec = op === "add" ? { op, a: x, b: y } : { op, a: Math.max(x, y), b: Math.min(x, y) };
  const decimalOptions = [
    { id: "0" as const, label: "Sin coma" },
    { id: "1" as const, label: "Décimas" },
    { id: "2" as const, label: "Centésimas" },
  ];
  const trace = columnTrace(spec, strategy);
  const regroups = trace.steps.filter((s) => s.regroup).length;
  const tensTop = digitsOf(spec.a, 3)[1];
  return (
    <>
      <Slider id={`${id}-a`} label="Primer número (sin coma)" value={a} min={100} max={999} onChange={setA} />
      <OptionPicker label="Decimales del 1.er número" options={decimalOptions} value={da} onChange={setDa} />
      <Slider id={`${id}-b`} label="Segundo número (sin coma)" value={b} min={1} max={999} onChange={setB} />
      <OptionPicker label="Decimales del 2.º número" options={decimalOptions} value={db} onChange={setDb} />
      <p className="text-sm text-slate-300">
        Con la coma alineada: <strong className="text-cyan-100">{String(spec.a).replace(".", ",")}</strong> y{" "}
        <strong className="text-cyan-100">{String(spec.b).replace(".", ",")}</strong>
        {trace.scale && decimalsOf(spec.a) !== decimalsOf(spec.b) ? " (al que tiene menos decimales se le añaden ceros)" : ""}.
      </p>
      <div role="radiogroup" aria-label="Operación" className="flex flex-wrap gap-2">
        {(["add", "subtract"] as const).map((value) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={op === value}
            onClick={() => setOp(value)}
            className={`min-h-11 rounded-full border px-4 text-sm font-semibold ${
              op === value ? "border-cyan-300 bg-cyan-950/60 text-cyan-100" : "border-slate-600 bg-slate-950 text-slate-300"
            }`}
          >
            {value === "add" ? "Sumar" : "Restar"}
          </button>
        ))}
      </div>
      {op === "subtract" && <StrategyPicker strategy={strategy} onChange={setStrategy} />}
      {op === "subtract" && y > x && (
        <p className="text-sm text-slate-300">En la resta se escribe arriba el número mayor.</p>
      )}
      <ColumnDemo key={`${spec.op}-${spec.a}-${spec.b}-${strategy}`} spec={spec} strategy={strategy} initialStep={Infinity} />
      <Challenge
        goals={[
          { text: "Consigue una resta en la que haya que reagrupar en dos columnas.", met: op === "subtract" && regroups >= 2 },
          { text: "Consigue una suma cuyo resultado tenga cuatro cifras.", met: op === "add" && !trace.scale && a + b >= 1000 },
          {
            text: "Consigue una suma de un número con décimas y otro con centésimas: ¿dónde aparece el cero añadido?",
            met: op === "add" && decimalsOf(spec.a) + decimalsOf(spec.b) === 3,
          },
          {
            text: "Consigue una resta con un 0 en las decenas de arriba que tenga que prestar.",
            met: op === "subtract" && !trace.scale && tensTop === 0 && trace.steps[0].regroup === 1,
            hint: "Prueba con un primer número como 305 y un segundo que termine en una cifra mayor que 5.",
          },
        ]}
      />
    </>
  );
}

// ── Hoja para responder ─────────────────────────────────────────────────

/** Una respuesta escrita como cifras por columna (0 = la última decimal). */
export function columnDigits(response: string, scale = 0): string[] {
  const [int = "", frac = ""] = response.replace(/[^\d,.]/g, "").split(/[,.]/);
  return (int + frac.padEnd(scale, "0").slice(0, scale)).split("").reverse();
}

/** Primera columna (desde la derecha) cuya cifra no coincide con el resultado. */
export function firstWrongColumn(response: string, answer: number, scale = 0): number | null {
  const given = columnDigits(response, scale);
  const expected = digitsOf(Math.round(answer * 10 ** scale));
  for (let i = 0; i < Math.max(given.length, expected.length); i++)
    if (Number(given[i] ?? 0) !== (expected[i] ?? 0)) return i;
  return null;
}

export interface ColumnDraft { digits: string[]; commaAt: number | null; notes: string[] }

export function ColumnSheet({
  spec,
  strategy,
  mode,
  response,
  onChange,
  onComplete,
  hintLevel = 0,
  wrongColumn = null,
  commaWrong = false,
  disabled,
  calculator = false,
  draft, onDraft,
}: {
  draft?: ColumnDraft; onDraft?: (draft: ColumnDraft) => void;
  spec: ArithmeticSpec;
  strategy: SubtractStrategy;
  /** Presentación amplia para el panel de calculadora. */
  calculator?: boolean;
  /** Tras un intento fallido: las cifras están bien, pero la coma no. */
  commaWrong?: boolean;
  mode: "guided" | "free";
  response: string;
  onChange: (response: string) => void;
  /** Modo guiado: todas las cifras son correctas. */
  onComplete?: (response: string) => void;
  /** Pistas pedidas: la 2.ª deja ver las unidades; la 3.ª, todo menos la última columna. */
  hintLevel?: number;
  /** Columna a revisar tras un intento fallido (fuera de las comprobaciones). */
  wrongColumn?: number | null;
  disabled?: boolean;
}) {
  const trace = useMemo(() => columnTrace(spec, strategy), [spec, strategy]);
  const id = useId();
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  // Celdas libres: no se revela cuántas cifras tiene el resultado.
  const { scale } = trace;
  const operandWidth = trace.topDigits.length;
  const cells = mode === "guided" ? trace.width : operandWidth + (spec.op === "add" ? 1 : 0);
  // La coma del resultado la pone el alumno (hueco k: k cifras a su derecha).
  const initial = useMemo(() => writtenColumns(response), []); // eslint-disable-line react-hooks/exhaustive-deps
  const [digits, setDigits] = useState<string[]>(() => Array.from({ length: cells }, (_, i) => draft?.digits?.[i] ?? initial.digits[i] ?? ""));
  const [commaAt, setCommaAt] = useState<number | null>(scale ? (draft?.commaAt ?? initial.comma) : null);
  const [commaOk, setCommaOk] = useState(false);
  const [commaMiss, setCommaMiss] = useState<number | null>(null);
  const [notes, setNotes] = useState<string[]>(() => Array.from({ length: cells }, (_, i) => draft?.notes?.[i] ?? ""));
  const [miss, setMiss] = useState<{ column: number; value: string } | null>(null);
  const [lastWhy, setLastWhy] = useState<string>("");
  useEffect(() => { if (mode === "free") onDraft?.({ digits, commaAt, notes }); }, [mode, onDraft, digits, commaAt, notes]);

  const active = mode === "guided" ? digits.findIndex((d, i) => Number(d) !== trace.steps[i].digit || d === "") : -1;
  // Guiado: al terminar la parte decimal, el alumno coloca la coma antes de seguir.
  const askingComma = mode === "guided" && scale > 0 && !commaOk && active === scale;
  const done = mode === "guided" && active === -1;

  const emit = (next: string[], comma = mode === "guided" ? (scale || null) : commaAt) => {
    // Solo se ignoran las casillas vacías de la izquierda: una casilla vacía
    // entre cifras (o en las unidades) deja la respuesta incompleta, para no
    // correr cifras de columna (9, 6 y 4 sin unidades no son 964).
    const highest = next.reduce((h, d, i) => (d ? i : h), -1);
    const gap = next.slice(0, highest + 1).some((d) => !d);
    const text = gap ? "" : columnsText(next, comma);
    onChange(text);
    return text;
  };

  const pickComma = (k: number) => {
    if (mode === "guided") {
      if (k === scale) {
        setCommaOk(true);
        setCommaMiss(null);
        setLastWhy(`La coma del resultado va debajo de las comas de los números: deja ${scale} ${scale === 1 ? "cifra decimal" : "cifras decimales"} a su derecha.`);
        requestAnimationFrame(() => focus(scale));
      } else setCommaMiss(k);
      return;
    }
    placeComma(commaAt === k ? null : k);
  };
  const placeComma = (k: number | null) => {
    setCommaAt(k);
    emit(digits, k);
  };
  // «,» en una casilla: la coma va justo después de la última cifra escrita
  // (se escribe de derecha a izquierda): a la izquierda de una casilla llena,
  // a la derecha de una vacía. Escribirla donde ya está la quita.
  const typeComma = (i: number, filled: boolean) => {
    if (mode !== "free" || !scale) return;
    const k = filled ? i + 1 : i;
    if (k >= 1 && k < cells) placeComma(k === commaAt ? null : k);
  };

  const focus = (i: number) => refs.current[i]?.focus();
  const highestFilled = digits.reduce((h, d, i) => (d ? i : h), -1);
  const hasGap = mode === "free" && digits.slice(0, highestFilled + 1).some((d) => !d);

  const setDigit = (i: number, value: string) => {
    const next = [...digits];
    next[i] = value;
    if (mode === "guided") {
      if (value === "") {
        setMiss((m) => (m ? { ...m, value: "" } : m));
        return;
      }
      if (Number(value) === trace.steps[i].digit) {
        setDigits(next);
        setMiss(null);
        setLastWhy(trace.steps[i].why);
        const text = emit(next);
        if (i + 1 < cells) requestAnimationFrame(() => focus(i + 1));
        else onComplete?.(text);
      } else {
        setMiss({ column: i, value });
      }
      return;
    }
    setDigits(next);
    emit(next);
    if (value && i + 1 < cells) focus(i + 1);
  };

  const onKey = (i: number, event: React.KeyboardEvent<HTMLInputElement>) => {
    // En pantalla la izquierda es la columna más alta.
    if (event.key === "ArrowLeft" && i + 1 < cells) {
      event.preventDefault();
      focus(i + 1);
    } else if (event.key === "ArrowRight" && i > 0) {
      event.preventDefault();
      focus(i - 1);
    } else if (event.key === "Backspace" && mode === "free" && !digits[i] && i > 0) {
      event.preventDefault();
      focus(i - 1);
    }
  };

  // Pistas visuales: columnas ya resueltas como referencia tenue.
  const hinted = hintLevel >= 3 ? Math.max(1, trace.width - 1) : hintLevel >= 2 ? 1 : 0;
  const shownMarks = mode === "guided" ? (done ? trace.steps.length : active) : hinted;
  const result: Cell[] = Array.from({ length: cells }, (_, i) => {
    if (mode === "guided") {
      if (i < active || done)
        return { kind: "digit", value: trace.steps[i].digit, state: "ok" };
      if (i === active && askingComma) return { kind: "digit", value: null };
      if (i === active)
        return miss?.column === i
          ? { kind: "input", value: miss.value, state: "wrong" }
          : { kind: "input", value: "", state: "active" };
      return { kind: "digit", value: null };
    }
    return {
      kind: "input",
      value: digits[i],
      state: wrongColumn === i ? "wrong" : undefined,
      placeholder: i < hinted && i < trace.width ? String(trace.steps[i].digit) : undefined,
    };
  });

  return (
    <div className="space-y-3">
      <Grid
        trace={trace}
        calculator={calculator}
        marks={marksFor(trace, shownMarks, mode === "guided" && !done)}
        result={result}
        notes={mode === "free" ? notes : undefined}
        onNote={(i, v) => setNotes((n) => n.map((x, k) => (k === i ? v : x)))}
        onInput={setDigit}
        onKey={onKey}
        inputRefs={refs}
        idPrefix={id}
        disabled={disabled}
        resultComma={mode === "guided" ? (commaOk ? scale : null) : commaAt}
        onComma={typeComma}
        slots={askingComma ? { active: commaMiss, onPick: pickComma, wrong: commaMiss !== null } : undefined}
      />
      <div aria-live="polite" className="text-sm leading-relaxed">
        {mode === "guided" ? (
          askingComma ? (
            <p className={`rounded-xl p-3 ${commaMiss !== null ? "bg-amber-950/40 text-amber-100" : "bg-cyan-950/40 text-cyan-100"}`}>
              {commaMiss === null && lastWhy && <span className="block text-slate-300">{lastWhy}</span>}
              {commaMiss !== null
                ? "Ahí no: la coma del resultado va justo debajo de las comas de los dos números."
                : "Terminaste la parte decimal. ¿Dónde va la coma del resultado? Toca su lugar debajo de las casillas."}
            </p>
          ) : miss !== null ? (
            <p className="rounded-xl bg-amber-950/40 p-3 text-amber-100">Revisa esa cifra. {trace.steps[miss.column].ask}</p>
          ) : !done ? (
            <p className="rounded-xl bg-cyan-950/40 p-3 text-cyan-100">
              {lastWhy && <span className="block text-slate-300">{lastWhy}</span>}
              {trace.steps[active]?.ask}
            </p>
          ) : (
            <p className="rounded-xl bg-emerald-950/40 p-3 text-emerald-100">{lastWhy}</p>
          )
        ) : hasGap ? (
          <p className="text-xs text-amber-200">Completa las casillas vacías entre las cifras: cada cifra va en su columna.</p>
        ) : commaWrong ? (
          <p className="rounded-xl bg-amber-950/40 p-3 text-amber-100">
            Las cifras están bien: revisa la coma. Va justo debajo de las comas de los dos números.
          </p>
        ) : wrongColumn !== null ? (
          <p className="rounded-xl bg-amber-950/40 p-3 text-amber-100">
            Revisa la columna de las {placeName(wrongColumn - scale)}: es la primera cifra que no coincide.
          </p>
        ) : (
          <p className="text-xs text-slate-400">
            Escribe el resultado desde la derecha. Arriba puedes anotar llevadas o préstamos.
            {scale ? " Pon la coma escribiendo «,» en la casilla donde va (otra vez en el mismo sitio, la quitas)." : ""}
          </p>
        )}
      </div>
    </div>
  );
}

/** Ejemplo razonado animado, con la estrategia de resta que elija el alumno. */
export function ColumnExample({ spec }: { spec: ArithmeticSpec }) {
  const [strategy, setStrategy] = useSubtractStrategy();
  return (
    <div className="space-y-3 rounded-xl border border-slate-700 bg-slate-950 p-4">
      {spec.op === "subtract" && <StrategyPicker strategy={strategy} onChange={setStrategy} />}
      <ColumnDemo key={strategy} spec={spec} strategy={strategy} />
    </div>
  );
}
