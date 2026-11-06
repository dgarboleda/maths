"use client";

import { useId, useMemo, useRef, useState, useSyncExternalStore } from "react";
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
const placeColor = (column: number) => PLACE_COLORS[((column % 3) + 3) % 3];
/** La coma decimal, a la derecha de la columna de las unidades. */
const Comma = () => (
  <span aria-hidden="true" className="pointer-events-none absolute -right-2 bottom-0 text-3xl font-bold text-slate-100">,</span>
);

// ── Estrategia de resta (preferencia del alumno en este navegador) ──────

/** Preferencia del alumno guardada en este navegador y compartida por todas
 *  las hojas de la página. Sin almacenamiento, dura mientras la página esté abierta. */
export function makePreference<T extends string>(key: string, values: readonly T[], fallbackValue: T) {
  const event = `maths:pref:${key}`;
  const read = (): T => {
    try {
      const v = localStorage.getItem(key);
      return values.includes(v as T) ? (v as T) : fallbackValue;
    } catch {
      return fallbackValue;
    }
  };
  const subscribe = (onChange: () => void) => {
    window.addEventListener(event, onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener(event, onChange);
      window.removeEventListener("storage", onChange);
    };
  };
  return function usePreference(): [T, (value: T) => void] {
    const [memory, setMemory] = useState<T | null>(null);
    const stored = useSyncExternalStore(subscribe, read, () => fallbackValue);
    return [
      memory ?? stored,
      (next) => {
        try {
          localStorage.setItem(key, next);
          setMemory(null);
        } catch {
          setMemory(next);
        }
        window.dispatchEvent(new Event(event));
      },
    ];
  };
}

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
}: {
  trace: ColumnTrace;
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
  const say = (n: number) => String(n).replace(".", ",");
  const symbol = trace.spec.op === "add" ? "+" : "−";
  const cell = "flex h-11 w-8 items-center justify-center text-2xl font-bold tabular-nums sm:h-12 sm:w-12 sm:text-3xl";
  return (
    // Enfocable: si no cabe (pantallas muy estrechas), se recorre con el teclado.
    <div
      className="overflow-x-auto"
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
          <span key={`m${i}`} className="flex h-8 items-end justify-center text-base font-bold text-amber-200">
            {notes && onNote ? (
              <input
                aria-label={`Nota para ${name(i)} (llevada o préstamo, opcional)`}
                inputMode="numeric"
                maxLength={2}
                value={notes[i] ?? ""}
                disabled={disabled}
                onChange={(e) => onNote(i, e.target.value.replace(/\D/g, ""))}
                className="h-7 w-7 rounded border border-dashed border-slate-600 bg-transparent text-center text-sm text-amber-200 focus:border-amber-300 focus:outline-none"
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
                  : "border-slate-600 bg-slate-950";
          if (c.kind === "digit")
            return (
              <span key={`r${i}`} className={`${cell} relative rounded-lg border ${ring} ${color(i)} ${c.ghost ? "opacity-50" : ""}`}>
                {c.value ?? ""}
                {comma(i)}
              </span>
            );
          return (
            <span key={`r${i}`} className="relative">
            {comma(i)}
            <input
              id={`${idPrefix}-r${i}`}
              ref={(el) => {
                if (inputRefs) inputRefs.current[i] = el;
              }}
              aria-label={`Resultado: ${name(i)}`}
              aria-invalid={c.state === "wrong"}
              inputMode="numeric"
              autoComplete="off"
              maxLength={1}
              value={c.value}
              placeholder={c.placeholder}
              disabled={disabled || (c.state === "ok" && c.kind === "input" && !onKey)}
              onChange={(e) => onInput?.(i, e.target.value.replace(/\D/g, "").slice(-1))}
              onKeyDown={(e) => onKey?.(i, e)}
              onFocus={(e) => e.target.select()}
              className={`${cell} rounded-lg border ${ring} ${color(i)} text-center placeholder:opacity-40 focus:outline-2 focus:outline-cyan-300`}
            />
            </span>
          );
        })}
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
  const [strategy, setStrategy] = useSubtractStrategy();
  // En la resta se escribe arriba el mayor.
  const spec: ArithmeticSpec = op === "add" ? { op, a, b } : { op, a: Math.max(a, b), b: Math.min(a, b) };
  const trace = columnTrace(spec, strategy);
  const regroups = trace.steps.filter((s) => s.regroup).length;
  const tensTop = digitsOf(spec.a, 3)[1];
  return (
    <>
      <Slider id={`${id}-a`} label="Primer número" value={a} min={100} max={999} onChange={setA} />
      <Slider id={`${id}-b`} label="Segundo número" value={b} min={1} max={999} onChange={setB} />
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
      {op === "subtract" && b > a && (
        <p className="text-sm text-slate-300">En la resta se escribe arriba el número mayor.</p>
      )}
      <ColumnDemo key={`${spec.op}-${spec.a}-${spec.b}-${strategy}`} spec={spec} strategy={strategy} initialStep={Infinity} />
      <Challenge
        goals={[
          { text: "Consigue una resta en la que haya que reagrupar en dos columnas.", met: op === "subtract" && regroups >= 2 },
          { text: "Consigue una suma cuyo resultado tenga cuatro cifras.", met: op === "add" && a + b >= 1000 },
          {
            text: "Consigue una resta con un 0 en las decenas de arriba que tenga que prestar.",
            met: op === "subtract" && tensTop === 0 && trace.steps[0].regroup === 1,
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

export function ColumnSheet({
  spec,
  strategy,
  mode,
  response,
  onChange,
  onComplete,
  hintLevel = 0,
  wrongColumn = null,
  disabled,
}: {
  spec: ArithmeticSpec;
  strategy: SubtractStrategy;
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
  const [digits, setDigits] = useState<string[]>(() => {
    const given = response ? columnDigits(response, scale) : [];
    return Array.from({ length: cells }, (_, i) => given[i] ?? "");
  });
  const [notes, setNotes] = useState<string[]>(() => Array(cells).fill(""));
  const [miss, setMiss] = useState<{ column: number; value: string } | null>(null);
  const [lastWhy, setLastWhy] = useState<string>("");

  const active = mode === "guided" ? digits.findIndex((d, i) => Number(d) !== trace.steps[i].digit || d === "") : -1;
  const done = mode === "guided" && active === -1;

  const emit = (next: string[]) => {
    // Solo se ignoran las casillas vacías de la izquierda: una casilla vacía
    // entre cifras (o en las unidades) deja la respuesta incompleta, para no
    // correr cifras de columna (9, 6 y 4 sin unidades no son 964).
    const highest = next.reduce((h, d, i) => (d ? i : h), -1);
    const gap = next.slice(0, highest + 1).some((d) => !d);
    let text: string;
    if (gap) text = "";
    else if (!scale) text = [...next].reverse().join("").replace(/^0+(?=\d)/, "");
    else {
      const int = next.slice(scale).reverse().join("").replace(/^0+(?=\d)/, "");
      const frac = next.slice(0, scale).reverse().join("");
      text = int || frac ? `${int || "0"},${frac}` : "";
    }
    onChange(text);
    return text;
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
        marks={marksFor(trace, shownMarks, mode === "guided" && !done)}
        result={result}
        notes={mode === "free" ? notes : undefined}
        onNote={(i, v) => setNotes((n) => n.map((x, k) => (k === i ? v : x)))}
        onInput={setDigit}
        onKey={onKey}
        inputRefs={refs}
        idPrefix={id}
        disabled={disabled}
      />
      <div aria-live="polite" className="text-sm leading-relaxed">
        {mode === "guided" ? (
          miss !== null ? (
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
        ) : wrongColumn !== null ? (
          <p className="rounded-xl bg-amber-950/40 p-3 text-amber-100">
            Revisa la columna de las {placeName(wrongColumn - scale)}: es la primera cifra que no coincide.
          </p>
        ) : (
          <p className="text-xs text-slate-400">
            Escribe el resultado desde las unidades (a la derecha). Arriba puedes anotar llevadas o préstamos.
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
