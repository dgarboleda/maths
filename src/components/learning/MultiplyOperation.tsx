"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import {
  digitsOf,
  fmt,
  fmtProduct,
  multiplyTrace,
  placeName,
  type MultiplySpec,
  type MultiplyStep,
  type MultiplyTrace,
} from "@/lib/learning/core";
import { useSheetInputMode } from "./NumericKeypad";
import { calculatorBoardClass, calculatorBoardStyle } from "./calculatorBoard";
import { secondaryButton } from "./LearningShell";
import { Challenge } from "./Challenge";
import { Slider } from "./GraphVisuals";
import { Comma, CommaSlotRow, columnsText, OptionPicker, placeColor, typedComma, writtenColumns } from "./ColumnOperation";

/* Multiplicación en columnas: el factor de más cifras arriba y el otro
 * debajo, alineados por la derecha (no por la coma). Una fila por cada cifra
 * de abajo distinta de 0, desplazada según su posición; si hay más de una,
 * se suman. Con decimales, al final se elige cuántas cifras decimales lleva
 * el producto. Modos: guided (cada cifra se corrige al escribirla), free (el
 * alumno opera solo; las filas intermedias y las llevadas son su borrador) y
 * demo (el desarrollo paso a paso). */

type CellState = "ok" | "wrong" | "active" | undefined;
type Cell =
  | { kind: "digit"; value: string; state?: CellState; ghost?: boolean }
  | { kind: "input"; value: string; state?: CellState; placeholder?: string }
  | null;

interface GridRow {
  key: string;
  /** Nombre de la fila para el lector de pantalla. */
  label: string;
  cells: Cell[];
  sign?: string;
  /** Columna tras la que se dibuja la coma (null: sin coma). */
  comma?: number | null;
  /** Línea debajo de la fila. */
  line?: boolean;
}

/** El producto como lo escribe el alumno: «0,72», sin espacios de miles. */
export const productText = (product: number, scale: number) => fmtProduct(product, scale).replace(/\s/g, "");

const ring = (state: CellState) =>
  state === "wrong"
    ? "border-amber-400 bg-amber-950/50"
    : state === "ok"
      ? "border-emerald-400/70 bg-emerald-950/30"
      : state === "active"
        ? "border-cyan-300 bg-cyan-950/40"
        : "border-slate-600 bg-slate-950";

function Grid({
  trace,
  columns,
  marks,
  notes,
  onNote,
  rows,
  onInput,
  onComma,
  onKey,
  inputRefs,
  idPrefix,
  disabled,
  slots, calculator = false,
}: {
  calculator?: boolean;
  /** Huecos bajo el producto para que el alumno ponga la coma. */
  slots?: { active: number | null; onPick: (k: number) => void; wrong?: boolean };
  trace: MultiplyTrace;
  columns: number;
  /** Llevadas sobre el factor de arriba (por columna). */
  marks?: string[];
  /** Modo libre: llevadas que anota el alumno (borrador). */
  notes?: string[];
  onNote?: (column: number, value: string) => void;
  rows: GridRow[];
  onInput?: (row: string, column: number, value: string) => void;
  /** Se escribió «,» en una casilla (con o sin cifra ya escrita). */
  onComma?: (row: string, column: number, filled: boolean) => void;
  onKey?: (row: string, column: number, event: React.KeyboardEvent<HTMLInputElement>) => void;
  inputRefs?: React.MutableRefObject<Map<string, HTMLInputElement | null>>;
  idPrefix: string;
  disabled?: boolean;
}) {
  // Con decimales, el teclado del teléfono también ofrece la coma.
  const keypadMode = useSheetInputMode(trace.scale ? "decimal" : "numeric");
  const order = Array.from({ length: columns }, (_, k) => columns - 1 - k);
  const { scaleA, scaleB } = trace;
  // Con coma, el 0 de las unidades también se escribe (0,4).
  const topDigits = digitsOf(trace.A, scaleA + 1);
  const bottomDigits = digitsOf(trace.B, scaleB + 1);
  const cell = calculator ? "flex h-14 w-12 items-center justify-center text-3xl font-bold tabular-nums" : "flex h-11 w-8 items-center justify-center text-2xl font-bold tabular-nums sm:h-12 sm:w-11 sm:text-3xl";
  const say = (n: number, scale: number) => n.toFixed(scale).replace(".", ",");
  return (
    <div
      data-arrow-nav=""
      className={calculator ? calculatorBoardClass : "overflow-x-auto"}
      style={calculator ? calculatorBoardStyle : undefined}
      tabIndex={0}
      role="group"
      aria-label={`${say(trace.spec.a, scaleA)} por ${say(trace.spec.b, scaleB)} en columnas`}
    >
      <div className="mx-auto grid w-max gap-x-1" style={{ gridTemplateColumns: `1.75rem repeat(${columns}, auto)` }}>
        {/* Llevadas */}
        <span aria-hidden="true" />
        {order.map((i) => (
          <span key={`m${i}`} className="flex h-8 items-end justify-center text-base font-bold text-amber-200">
            {notes && onNote ? (
              i > 0 && i < trace.topDigits.length ? (
                <input
                  aria-label={`Llevada sobre las ${placeName(i)} (opcional)`}
                  inputMode={keypadMode}
                  maxLength={1}
                  value={notes[i] ?? ""}
                  disabled={disabled}
                  onChange={(e) => onNote(i, e.target.value.replace(/\D/g, "").slice(-1))}
                  className="h-7 w-7 rounded border border-dashed border-slate-600 bg-transparent text-center text-sm text-amber-200 focus:border-amber-300 focus:outline-none"
                />
              ) : null
            ) : (
              marks?.[i] && (
                <span>
                  <span className="sr-only">{`Llevas ${marks[i]} sobre las ${placeName(i)}: `}</span>
                  {marks[i]}
                </span>
              )
            )}
          </span>
        ))}
        {/* Factores */}
        <span aria-hidden="true" />
        {order.map((i) => (
          <span key={`t${i}`} className={`${cell} relative ${placeColor(i - scaleA)}`}>
            {i < topDigits.length ? topDigits[i] : ""}
            {scaleA > 0 && i === scaleA && <Comma />}
          </span>
        ))}
        <span className={`${cell} text-slate-200`}>
          <span aria-hidden="true">×</span>
          <span className="sr-only">por</span>
        </span>
        {order.map((i) => (
          <span key={`b${i}`} className={`${cell} relative ${placeColor(i - scaleB)}`}>
            {i < bottomDigits.length ? bottomDigits[i] : ""}
            {scaleB > 0 && i === scaleB && <Comma />}
          </span>
        ))}
        <span aria-hidden="true" className="col-span-full my-1 h-0.5 bg-slate-200" />
        {rows.map((row) => (
          <Row key={row.key} row={row} order={order} cell={cell} onInput={onInput} onComma={onComma} onKey={onKey} inputRefs={inputRefs} idPrefix={idPrefix} disabled={disabled} keypadMode={keypadMode} calculator={calculator} />
        ))}
        {slots && <CommaSlotRow order={order} cells={columns} active={slots.active} onPick={slots.onPick} disabled={disabled} wrong={slots.wrong} />}
      </div>
    </div>
  );
}

function Row({
  row,
  order,
  cell,
  onInput,
  onComma,
  onKey,
  inputRefs,
  idPrefix,
  disabled,
  keypadMode, calculator = false,
}: {
  calculator?: boolean;
  row: GridRow;
  order: number[];
  cell: string;
  onInput?: (row: string, column: number, value: string) => void;
  /** Se escribió «,» en una casilla (con o sin cifra ya escrita). */
  onComma?: (row: string, column: number, filled: boolean) => void;
  onKey?: (row: string, column: number, event: React.KeyboardEvent<HTMLInputElement>) => void;
  inputRefs?: React.MutableRefObject<Map<string, HTMLInputElement | null>>;
  idPrefix: string;
  disabled?: boolean;
  keypadMode: "none" | "numeric" | "decimal" | "text";
}) {
  const comma = (i: number) => (row.comma && i === row.comma ? <Comma /> : null);
  return (
    <>
      <span className={`${cell} text-slate-200`}>
        {row.sign && (
          <>
            <span aria-hidden="true">{row.sign}</span>
            <span className="sr-only">más</span>
          </>
        )}
      </span>
      {order.map((i) => {
        const c = row.cells[i];
        if (!c) return <span key={`${row.key}-${i}`} className={`${cell} relative`}>{comma(i)}</span>;
        if (c.kind === "digit")
          return (
            <span
              key={`${row.key}-${i}`}
              className={`${cell} relative ${c.state ? `rounded-lg border ${ring(c.state)}` : ""} ${placeColor(i)} ${c.ghost ? "opacity-40" : ""}`}
            >
              {c.ghost && c.value && <span className="sr-only">cero añadido </span>}
              {c.value}
              {comma(i)}
            </span>
          );
        return (
          <span key={`${row.key}-${i}`} className="relative">
            {comma(i)}
            <input
              id={`${idPrefix}-${row.key}-${i}`}
              ref={(el) => {
                inputRefs?.current.set(`${row.key}:${i}`, el);
              }}
              aria-label={`${row.label}: ${placeName(i)}`}
              aria-invalid={c.state === "wrong"}
              inputMode={keypadMode}
              autoComplete="off"
              maxLength={1}
              value={c.value}
              placeholder={c.placeholder}
              disabled={disabled}
              onChange={(e) => {
                if (typedComma(e.target.value)) return onComma?.(row.key, i, c.value !== "");
                onInput?.(row.key, i, e.target.value.replace(/\D/g, "").slice(-1));
              }}
              onKeyDown={(e) => { if ((e.key === "," || e.key === ".") && onComma) { e.preventDefault(); onComma(row.key, i, c.value !== ""); } else onKey?.(row.key, i, e); }}
              onFocus={(e) => e.target.select()}
              className={`${cell} rounded-lg border ${calculator && !c.state ? "border-slate-600 bg-slate-800/90" : ring(c.state)} ${placeColor(i)} text-center placeholder:opacity-40 focus:outline-2 focus:outline-cyan-300`}
            />
          </span>
        );
      })}
      {row.line && <span aria-hidden="true" className="col-span-full my-1 h-0.5 bg-slate-200" />}
    </>
  );
}

/** Nombre de cada fila del resultado para el lector de pantalla. */
function rowLabel(trace: MultiplyTrace, row: number): string {
  if (row >= trace.partials.length) return "Suma de las filas";
  const p = trace.partials[row];
  return trace.summed ? `Fila del ${p.digit} de las ${placeName(p.shift)}` : "Producto";
}

/**
 * Filas del desarrollo con `shown` pasos escritos (los pasos de cifra; el de
 * la coma decide si se dibuja). El paso `active` (si lo hay) queda marcado.
 */
function writtenRows(
  trace: MultiplyTrace,
  shown: number,
  active: (step: MultiplyStep) => Cell | undefined,
  commaShown: boolean,
): GridRow[] {
  const writing = trace.steps.filter((s) => s.kind !== "comma");
  const count = trace.partials.length + (trace.summed ? 1 : 0);
  const rows: GridRow[] = Array.from({ length: count }, (_, r) => ({
    key: `r${r}`,
    label: rowLabel(trace, r),
    cells: [],
    sign: trace.summed && r === trace.partials.length - 1 ? "+" : undefined,
    line: trace.summed && r === trace.partials.length - 1,
  }));
  writing.forEach((s, k) => {
    const c = k < shown ? ({ kind: "digit", value: String(s.digit) } as Cell) : k === shown ? active(s) : undefined;
    if (c) rows[s.row].cells[s.column] = c;
  });
  const last = rows[count - 1];
  if (commaShown && trace.scale) {
    last.comma = trace.scale;
    // Ceros que completan la parte decimal (0,06).
    for (let i = trace.productDigits.length; i < trace.resultDigits.length; i++)
      last.cells[i] ??= { kind: "digit", value: "0", ghost: true };
  }
  // Las filas que aún no empiezan no se muestran (no revelan su longitud).
  const lastRow = shown < writing.length ? writing[shown].row : count - 1;
  return rows.filter((_, r) => r <= lastRow);
}

/** Llevadas de la fila en curso, sobre la cifra de arriba a la que se suman. */
function carryMarks(trace: MultiplyTrace, shown: number): string[] {
  const writing = trace.steps.filter((s) => s.kind !== "comma");
  const current = writing[Math.min(shown, writing.length - 1)];
  if (!current || current.kind !== "row" || shown >= writing.length) return [];
  const marks: string[] = [];
  writing.slice(0, shown).forEach((s) => {
    if (s.row === current.row && s.topIndex >= 0 && s.carry) marks[s.topIndex + 1] = String(s.carry);
  });
  return marks;
}

// ── Demostración paso a paso ────────────────────────────────────────────

export function MultiplyDemo({ spec, initialStep }: { spec: MultiplySpec; initialStep?: number }) {
  const trace = useMemo(() => multiplyTrace(spec), [spec]);
  const total = trace.steps.length;
  const writingCount = trace.steps.filter((s) => s.kind !== "comma").length;
  const [shown, setShown] = useState(Math.min(initialStep ?? 0, total));
  const id = useId();
  const current = shown > 0 ? trace.steps[shown - 1] : null;
  const columns = Math.max(trace.width, trace.topDigits.length + trace.bottomDigits.length);
  return (
    <div className="space-y-3">
      <Grid
        trace={trace}
        columns={columns}
        marks={carryMarks(trace, shown)}
        rows={writtenRows(trace, Math.min(shown, writingCount), () => ({ kind: "digit", value: "", state: "active" }), shown > writingCount)}
        idPrefix={id}
      />
      <p aria-live="polite" className="min-h-12 rounded-xl bg-slate-950 p-3 text-sm leading-relaxed text-slate-200">
        {current ? current.why : `Empieza por la derecha: ${trace.steps[0].ask}`}
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

// ── Hoja para responder ─────────────────────────────────────────────────

export interface MultiplyDraft { digits: string[]; commaAt: number | null; notes: string[]; scratch: string[][] }

export function MultiplySheet({
  spec,
  mode,
  response,
  onChange,
  onComplete,
  hintLevel = 0,
  failedResponse = null,
  disabled,
  draft, onDraft, calculator = false,
}: {
  calculator?: boolean;
  draft?: MultiplyDraft; onDraft?: (draft: MultiplyDraft) => void;
  spec: MultiplySpec;
  mode: "guided" | "free";
  response: string;
  onChange: (response: string) => void;
  onComplete?: (response: string) => void;
  hintLevel?: number;
  failedResponse?: string | null;
  disabled?: boolean;
}) {
  const trace = useMemo(() => multiplyTrace(spec), [spec]);
  const id = useId();
  const refs = useRef(new Map<string, HTMLInputElement | null>());
  const focus = (key: string) => requestAnimationFrame(() => refs.current.get(key)?.focus());
  const columns = Math.max(trace.width, trace.topDigits.length + trace.bottomDigits.length);
  const writing = trace.steps.filter((s) => s.kind !== "comma");
  const commaStep = trace.steps.find((s) => s.kind === "comma");
  // En libre, la fila del producto (las demás son borrador).
  const resultKey = "res";
  const answer = productText(trace.product, trace.scale);

  // Guiado
  const [filled, setFilled] = useState(0);
  const [commaOk, setCommaOk] = useState(false);
  const [miss, setMiss] = useState<string | null>(null);
  const [lastWhy, setLastWhy] = useState("");
  // Libre
  const scratchRows = trace.bottomDigits.length > 1 ? trace.bottomDigits.length : 0;
  const [scratch, setScratch] = useState<string[][]>(() => Array.from({ length: scratchRows }, (_, row) => Array.from({ length: columns }, (_, col) => draft?.scratch?.[row]?.[col] ?? "")));
  const [notes, setNotes] = useState<string[]>(() => Array.from({ length: columns }, (_, i) => draft?.notes?.[i] ?? ""));
  const initial = useMemo(() => writtenColumns(response), []); // eslint-disable-line react-hooks/exhaustive-deps
  const [digits, setDigits] = useState<string[]>(() => Array.from({ length: columns }, (_, i) => draft?.digits?.[i] ?? initial.digits[i] ?? ""));
  // La coma la pone el alumno: hueco k, con k cifras a su derecha.
  const [commaAt, setCommaAt] = useState<number | null>(draft?.commaAt ?? initial.comma ?? null);
  const [commaMiss, setCommaMiss] = useState<number | null>(null);
  useEffect(() => { if (mode === "free") onDraft?.({ digits, commaAt, notes, scratch }); }, [mode, onDraft, digits, commaAt, notes, scratch]);

  const active = mode === "guided" && filled < writing.length ? writing[filled] : null;
  const askingComma = mode === "guided" && !active && !!commaStep && !commaOk;
  const done = mode === "guided" && !active && !askingComma;

  const emitFree = (nextDigits: string[], comma: number | null) => {
    const highest = nextDigits.reduce((h, d, i) => (d ? i : h), -1);
    const gap = nextDigits.slice(0, highest + 1).some((d) => !d);
    onChange(gap ? "" : columnsText(nextDigits, comma));
  };

  const finish = () => {
    onChange(answer);
    onComplete?.(answer);
  };

  const onInput = (row: string, column: number, value: string) => {
    if (mode === "guided") {
      if (!active || value === "") return setMiss(null);
      if (Number(value) === active.digit) {
        setMiss(null);
        setLastWhy(active.why);
        const next = filled + 1;
        setFilled(next);
        if (next < writing.length) focus(`r${writing[next].row}:${writing[next].column}`);
        else if (!commaStep) finish();
      } else setMiss(value);
      return;
    }
    if (row === resultKey) {
      const next = digits.map((d, i) => (i === column ? value : d));
      setDigits(next);
      emitFree(next, commaAt);
    } else {
      const r = Number(row.slice(1));
      setScratch((s) => s.map((cells, k) => (k === r ? cells.map((d, i) => (i === column ? value : d)) : cells)));
    }
    if (value && column + 1 < columns) focus(`${row}:${column + 1}`);
  };
  const onKey = (row: string, column: number, event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowLeft" && column + 1 < columns) {
      event.preventDefault();
      focus(`${row}:${column + 1}`);
    } else if (event.key === "ArrowRight" && column > 0) {
      event.preventDefault();
      focus(`${row}:${column - 1}`);
    } else if (event.key === "Backspace" && mode === "free" && !(event.currentTarget.value) && column > 0) {
      event.preventDefault();
      focus(`${row}:${column - 1}`);
    }
  };
  const pickComma = (k: number) => {
    if (mode === "guided") {
      if (k === commaStep?.digit) {
        setCommaOk(true);
        setCommaMiss(null);
        setLastWhy(commaStep.why);
        finish();
      } else setCommaMiss((previous) => previous === k ? null : k);
      return;
    }
    placeComma(commaAt === k ? null : k);
  };
  const placeComma = (k: number | null) => {
    setCommaAt(k);
    emitFree(digits, k);
  };
  // «,» en una casilla del producto: justo después de la última cifra escrita
  // (de derecha a izquierda).
  const typeComma = (row: string, i: number, filled: boolean) => {
    if (mode !== "free" || !trace.scale || row !== resultKey) return;
    if (commaAt !== null) { placeComma(null); return; }
    const k = filled ? i + 1 : i;
    if (k >= 1 && k < columns) placeComma(k);
  };

  // Tras un intento fallido (fuera de las comprobaciones): qué revisar.
  const failed = mode === "free" && failedResponse !== null && failedResponse === response && response !== "";
  const givenDigits = response.replace(/\D/g, "").replace(/^0+(?=\d)/, "");
  const commaOnly = failed && givenDigits === String(trace.product);
  const wrongColumn = failed && !commaOnly ? firstWrongDigit(response, trace) : null;

  // Pistas: la 2.ª deja ver la primera fila; la 3.ª, todas las filas (o el
  // producto menos su primera cifra si hay una sola).
  const hintRows = hintLevel >= 3 ? trace.partials.length : hintLevel >= 2 ? 1 : 0;
  let rows: GridRow[];
  if (mode === "guided") {
    rows = writtenRows(
      trace,
      filled,
      () => ({ kind: "input", value: miss ?? "", state: miss ? "wrong" : "active" }),
      commaOk,
    );
    rows = rows.map((r) => ({ ...r, cells: r.cells.map((c) => (c?.kind === "digit" && !c.ghost ? { ...c, state: "ok" as const } : c)) }));
  } else {
    rows = [];
    if (scratchRows) {
      for (let r = 0; r < scratchRows; r++) {
        const partial = trace.partials[r];
        rows.push({
          key: `r${r}`,
          label: `Fila ${r + 1} (borrador)`,
          sign: r === scratchRows - 1 ? "+" : undefined,
          line: r === scratchRows - 1,
          cells: scratch[r].map((value, i) => ({
            kind: "input",
            value,
            placeholder: partial && r < hintRows && i < partial.digits.length ? String(partial.digits[i]) : undefined,
          })),
        });
      }
    }
    const resultHint = hintLevel >= 3 && !trace.summed ? trace.productDigits.length - 1 : 0;
    rows.push({
      key: resultKey,
      label: "Producto",
      comma: commaAt,
      cells: digits.map((value, i) => ({
        kind: "input",
        value,
        state: wrongColumn === i ? "wrong" : undefined,
        placeholder: i < resultHint ? String(trace.productDigits[i]) : undefined,
      })),
    });
  }

  return (
    <div className="space-y-3">
      <Grid
        calculator={calculator}
        trace={trace}
        columns={columns}
        marks={mode === "guided" ? carryMarks(trace, filled) : undefined}
        notes={mode === "free" ? notes : undefined}
        onNote={(i, v) => setNotes((n) => n.map((x, k) => (k === i ? v : x)))}
        rows={rows}
        onInput={onInput}
        onKey={onKey}
        inputRefs={refs}
        idPrefix={id}
        disabled={disabled}
        onComma={typeComma}
        slots={
          mode === "guided"
            ? askingComma
              ? { active: commaMiss, onPick: pickComma, wrong: commaMiss !== null }
              : undefined
            : undefined
        }
      />
      <div aria-live="polite" className="text-sm leading-relaxed">
        {mode === "guided" ? (
          askingComma && commaMiss !== null ? (
            <p className="rounded-xl bg-amber-950/40 p-3 text-amber-100">
              Ahí no: cuenta las cifras decimales de {fmt(spec.a)} y de {fmt(spec.b)}, súmalas y deja ese número de cifras a la derecha de la coma.
            </p>
          ) : miss !== null ? (
            <p className="rounded-xl bg-amber-950/40 p-3 text-amber-100">Revisa esa cifra. {active?.ask ?? ""}</p>
          ) : !done ? (
            <p className="rounded-xl bg-cyan-950/40 p-3 text-cyan-100">
              {lastWhy && <span className="block text-slate-300">{lastWhy}</span>}
              {askingComma ? "¿Dónde va la coma del producto? Cuenta las cifras decimales de los dos factores y toca su lugar debajo de las casillas." : active?.ask}
            </p>
          ) : (
            <p className="rounded-xl bg-emerald-950/40 p-3 text-emerald-100">
              {lastWhy} Resultado: {fmtProduct(trace.product, trace.scale)}.
            </p>
          )
        ) : commaOnly ? (
          <p className="rounded-xl bg-amber-950/40 p-3 text-amber-100">
            Las cifras están bien: revisa la coma. Cuenta las cifras decimales de los dos factores.
          </p>
        ) : wrongColumn !== null ? (
          <p className="rounded-xl bg-amber-950/40 p-3 text-amber-100">
            Revisa la columna de las {placeName(wrongColumn)} del producto: es la primera cifra que no coincide.
          </p>
        ) : (
          <p className="text-xs text-slate-400">
            Escribe el producto en la última fila, desde la derecha.
            {scratchRows ? " Arriba tienes filas de borrador para cada cifra de abajo." : ""}
            {trace.scale ? " Pon la coma escribiendo «,» en la casilla donde va (si vuelves a pulsar la coma, la quitas)." : ""}
          </p>
        )}
      </div>
    </div>
  );
}

/** Primera columna del producto (sin coma) que no coincide con la escrita. */
function firstWrongDigit(response: string, trace: MultiplyTrace): number | null {
  const given = response.replace(/\D/g, "").replace(/^0+(?=\d)/, "").split("").reverse().map(Number);
  const expected = digitsOf(trace.product);
  for (let i = 0; i < Math.max(given.length, expected.length); i++) if ((given[i] ?? 0) !== (expected[i] ?? 0)) return i;
  return null;
}

/** Ejemplo razonado animado. */
export function MultiplyExample({ spec }: { spec: MultiplySpec }) {
  return (
    <div className="space-y-3 rounded-xl border border-slate-700 bg-slate-950 p-4">
      <MultiplyDemo spec={spec} />
    </div>
  );
}

// ── Exploración de la clase ─────────────────────────────────────────────

export function MultiplyExplorer({ id }: { id: string }) {
  const [a, setA] = useState(347);
  const [b, setB] = useState(25);
  const [da, setDa] = useState<"0" | "1" | "2">("0");
  const [db, setDb] = useState<"0" | "1">("0");
  const spec: MultiplySpec = {
    op: "multiply",
    a: Number((a / 10 ** Number(da)).toFixed(Number(da))),
    b: Number((b / 10 ** Number(db)).toFixed(Number(db))),
  };
  const trace = multiplyTrace(spec);
  const carries = trace.partials.some((p) => p.carries.some((c) => c > 0));
  return (
    <>
      <Slider id={`${id}-a`} label="Factor de arriba (sin coma)" value={a} min={10} max={999} onChange={setA} />
      <Slider id={`${id}-b`} label="Factor de abajo (sin coma)" value={b} min={2} max={99} onChange={setB} />
      <OptionPicker
        label="Cifras decimales del factor de arriba"
        options={[
          { id: "0", label: "Sin coma arriba" },
          { id: "1", label: "1 decimal" },
          { id: "2", label: "2 decimales" },
        ]}
        value={da}
        onChange={setDa}
      />
      <OptionPicker
        label="Cifras decimales del factor de abajo"
        options={[
          { id: "0", label: "Sin coma abajo" },
          { id: "1", label: "1 decimal" },
        ]}
        value={db}
        onChange={setDb}
      />
      <p className="text-sm text-slate-300">
        {fmt(spec.a)} × {fmt(spec.b)} = <strong className="text-cyan-100">{fmtProduct(trace.product, trace.scale)}</strong>
        {trace.scale ? ` (${fmt(trace.A)} × ${fmt(trace.B)} = ${fmt(trace.product)} y ${trace.scale} ${trace.scale === 1 ? "decimal" : "decimales"})` : ""}
      </p>
      <MultiplyDemo key={`${spec.a}-${spec.b}`} spec={spec} initialStep={Infinity} />
      <Challenge
        goals={[
          { text: "Consigue una multiplicación en la que no haya que llevar en ninguna fila.", met: !carries },
          { text: "Consigue un producto de cinco cifras (sin contar la coma).", met: String(trace.product).length === 5 },
          {
            text: "Consigue un producto con tres cifras decimales. ¿Cuántas tiene que aportar cada factor?",
            met: trace.scale === 3,
            hint: "Los decimales del producto son la suma de los de los dos factores: 2 + 1.",
          },
        ]}
      />
    </>
  );
}
