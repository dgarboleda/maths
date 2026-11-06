"use client";

import { TRAY_SIZE, ARRAY_MAX, MAX_DENOMINATOR, balanceEquation, lineExpression, type ArrayState, type BalanceState, type FractionState, type LineState, type PlaceValueState, type TutorAction } from "./model";
import styles from "./tutor.module.css";

/*
 * Materiales manipulables. Cada pieza o control es un botón: funciona con
 * toque, ratón y teclado (Tab + Enter/Espacio) sin arrastrar. Las
 * animaciones son CSS y la regla global de `prefers-reduced-motion` las anula.
 */

type Dispatch = (action: TutorAction) => void;

const control =
  "min-h-11 min-w-11 rounded-lg border border-slate-500 bg-slate-900 px-3 font-semibold text-slate-100 hover:border-cyan-300 disabled:cursor-not-allowed disabled:opacity-40";

const cubeColor = (c: "a" | "b") => (c === "a" ? "bg-cyan-400" : "bg-amber-300");

export function PlaceValueBoard({ state, dispatch }: { state: PlaceValueState; dispatch: Dispatch }) {
  const trayFull = state.tray.length === TRAY_SIZE;
  return (
    <div className="grid gap-4 sm:grid-cols-[auto_1fr]">
      <div>
        <p className="text-sm font-semibold text-slate-300">Decenas: {state.tens}</p>
        <div className={`mt-2 flex items-end gap-1.5 ${state.tens > 0 ? "min-h-32" : ""}`} aria-hidden="true">
          {Array.from({ length: state.tens }, (_, i) => (
            <span key={i} className={`grid grid-rows-10 gap-px rounded border border-cyan-200 bg-cyan-700 p-0.5 ${styles.pop}`}>
              {Array.from({ length: 10 }, (_, j) => (
                <span key={j} className="h-2.5 w-4 rounded-sm bg-cyan-300" />
              ))}
            </span>
          ))}
        </div>
        <button type="button" className={`${control} mt-2 text-sm`} disabled={state.tens === 0} onClick={() => dispatch({ type: "unbundle" })}>
          Deshacer una decena
        </button>
      </div>
      <div className="space-y-3">
        <div>
          <p className="text-sm font-semibold text-slate-300">Unidades sueltas: {state.loose.length}. Toca una para llevarla a la bandeja.</p>
          <ul className="mt-2 flex max-w-sm flex-wrap gap-2" aria-label="Unidades sueltas">
            {state.loose.map((c, i) => (
              <li key={i}>
                <button
                  type="button"
                  disabled={trayFull}
                  aria-label={`Unidad ${i + 1} de ${state.loose.length}: llevar a la bandeja`}
                  onClick={() => dispatch({ type: "to-tray", index: i })}
                  className={`h-11 w-11 rounded-md border-2 border-slate-950 ${cubeColor(c)} ${styles.pop} hover:scale-105 disabled:opacity-50`}
                />
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-300">Bandeja de diez: {state.tray.length} de {TRAY_SIZE}</p>
          <ul aria-label="Bandeja de diez" className="mt-2 grid w-fit grid-cols-5 gap-1 rounded-lg sm:gap-1.5 border-2 border-dashed border-slate-500 p-1.5">
            {Array.from({ length: TRAY_SIZE }, (_, i) => (
              <li key={i}>
                {state.tray[i] ? (
                  <button
                    type="button"
                    aria-label={`Devolver la unidad ${i + 1} de la bandeja`}
                    onClick={() => dispatch({ type: "from-tray", index: i })}
                    className={`h-9 w-9 rounded-md border-2 border-slate-950 sm:h-11 sm:w-11 ${cubeColor(state.tray[i])} ${styles.pop}`}
                  />
                ) : (
                  <span aria-hidden="true" className="block h-9 w-9 rounded-md bg-slate-800 sm:h-11 sm:w-11" />
                )}
              </li>
            ))}
          </ul>
          <button type="button" className={`${control} mt-2 border-cyan-300 text-cyan-100`} disabled={!trayFull} onClick={() => dispatch({ type: "bundle" })}>
            Formar decena
          </button>
        </div>
      </div>
    </div>
  );
}

/** Arreglo de paneles en filas y columnas. También lo usa el modelo visual de la clase. */
export function PanelArray({ rows, cols, turns = 0, label }: { rows: number; cols: number; turns?: number; label: string }) {
  return (
    <div role="img" aria-label={label} className="overflow-x-auto">
      <div key={turns} className={`grid w-fit gap-1.5 ${turns > 0 ? styles.turn : ""}`} style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
        {Array.from({ length: rows * cols }, (_, i) => (
          <span key={i} aria-hidden="true" className={`h-7 w-7 rounded-md border border-cyan-100 bg-gradient-to-br from-cyan-400 to-blue-600 sm:h-8 sm:w-8 ${styles.pop}`} />
        ))}
      </div>
    </div>
  );
}

function Stepper({ label, value, onChange }: { label: string; value: number; onChange: (delta: 1 | -1) => void }) {
  return (
    <div className="flex w-full items-center gap-2 sm:w-auto">
      <button type="button" className={control} aria-label={`Quitar: ${label}`} disabled={value <= 1} onClick={() => onChange(-1)}>
        −
      </button>
      <span className="min-w-0 flex-1 text-center text-slate-100 sm:min-w-36">
        {label}: <strong>{value}</strong>
      </span>
      <button type="button" className={control} aria-label={`Añadir: ${label}`} disabled={value >= ARRAY_MAX} onClick={() => onChange(1)}>
        +
      </button>
    </div>
  );
}

export function ArrayBuilder({ state, dispatch }: { state: ArrayState; dispatch: Dispatch }) {
  const sums = Array.from({ length: state.rows }, () => state.cols).join(" + ");
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-3">
        <Stepper label="Filas" value={state.rows} onChange={(delta) => dispatch({ type: "rows", delta })} />
        <Stepper label="Paneles por fila" value={state.cols} onChange={(delta) => dispatch({ type: "cols", delta })} />
        <button type="button" className={`${control} border-cyan-300 text-cyan-100`} onClick={() => dispatch({ type: "turn" })}>
          Girar instalación ↻
        </button>
      </div>
      <PanelArray rows={state.rows} cols={state.cols} turns={state.turns} label={`${state.rows} filas de ${state.cols} paneles`} />
      <p className="text-slate-200">
        {state.rows > 1 && <span className="text-slate-400">{sums} = </span>}
        <strong>
          {state.rows} × {state.cols} = {state.rows * state.cols}
        </strong>
      </p>
    </div>
  );
}

function Reserve({ name, part, onSplit, disabled, highlight }: { name: string; part: { num: number; den: number }; onSplit: (factor: 2 | 3) => void; disabled: boolean; highlight: string }) {
  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-semibold text-slate-100">
          {name}: {part.num}/{part.den}
        </p>
        <div className="flex gap-2">
          {([2, 3] as const).map((factor) => (
            <button
              key={factor}
              type="button"
              aria-label={`Partir en ${factor === 2 ? "dos" : "tres"} (${name.toLowerCase()})`}
              className={`${control} text-sm`}
              disabled={disabled || part.den * factor > MAX_DENOMINATOR}
              onClick={() => onSplit(factor)}
            >
              Partir en {factor === 2 ? "dos" : "tres"}
            </button>
          ))}
        </div>
      </div>
      <div role="img" aria-label={`${name}: ${part.num} de ${part.den} partes llenas`} className="flex h-12 max-w-md gap-0.5 rounded-lg border border-slate-500 p-0.5">
        {Array.from({ length: part.den }, (_, i) => (
          <span key={`${part.den}-${i}`} aria-hidden="true" className={`flex-1 rounded transition-colors duration-500 ${i < part.num ? highlight : "bg-slate-700"}`} />
        ))}
      </div>
    </div>
  );
}

export function FractionReserves({ state, dispatch }: { state: FractionState; dispatch: Dispatch }) {
  const { top, bottom } = state;
  if (state.joinable === false) {
    const same = top.den === bottom.den;
    const sign = top.num * bottom.den > bottom.num * top.den ? ">" : top.num * bottom.den < bottom.num * top.den ? "<" : "=";
    return (
      <div className="space-y-4">
        <Reserve name="Reserva de arriba" part={top} disabled={false} onSplit={(factor) => dispatch({ type: "split", bar: "top", factor })} highlight="bg-emerald-400" />
        <Reserve name="Reserva de abajo" part={bottom} disabled={false} onSplit={(factor) => dispatch({ type: "split", bar: "bottom", factor })} highlight="bg-amber-300" />
        <p className="text-slate-200">
          {same ? (
            <strong>
              {top.num}/{top.den} {sign} {bottom.num}/{bottom.den}
            </strong>
          ) : (
            <>
              {top.num}/{top.den} y {bottom.num}/{bottom.den}: partes de distinto tamaño
            </>
          )}
        </p>
      </div>
    );
  }
  return (
    <div className="space-y-4">
      <Reserve name="Reserva de arriba" part={top} disabled={state.joined} onSplit={(factor) => dispatch({ type: "split", bar: "top", factor })} highlight="bg-emerald-400" />
      <Reserve name="Reserva de abajo" part={bottom} disabled={state.joined} onSplit={(factor) => dispatch({ type: "split", bar: "bottom", factor })} highlight="bg-amber-300" />
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" className={`${control} border-cyan-300 text-cyan-100`} disabled={state.joined} onClick={() => dispatch({ type: "join" })}>
          Juntar reservas
        </button>
        <p className="text-slate-200">
          {state.joined ? (
            <strong>Total: {state.top.num}/{state.top.den}</strong>
          ) : (
            <>
              {state.top.num}/{state.top.den} + {state.bottom.num}/{state.bottom.den}
            </>
          )}
        </p>
      </div>
    </div>
  );
}

const sg = (n: number) => (n < 0 ? `−${-n}` : String(n));

/** Recta numérica: el punto se mueve de uno en uno; el tramo recorrido queda marcado. */
export function NumberLine({ state, dispatch }: { state: LineState; dispatch: Dispatch }) {
  const W = 300;
  const span = state.max - state.min;
  const x = (v: number) => 16 + ((v - state.min) / span) * (W - 32);
  const ticks = Array.from({ length: span + 1 }, (_, i) => state.min + i);
  const moved = state.pos - state.start;
  return (
    <div className="space-y-3">
      <svg role="img" viewBox={`0 0 ${W} 80`} className="w-full max-w-lg" aria-label={`Recta numérica: empiezas en ${sg(state.start)} y estás en ${sg(state.pos)}`}>
        <line x1={8} x2={W - 8} y1={40} y2={40} className="stroke-slate-500" strokeWidth={2} />
        {moved !== 0 && (
          <line x1={x(state.start)} x2={x(state.pos)} y1={40} y2={40} strokeWidth={6} strokeLinecap="round"
            className={`transition-all duration-300 ${moved > 0 ? "stroke-cyan-300" : "stroke-rose-300"}`} />
        )}
        {ticks.map((t) => (
          <g key={t}>
            <line x1={x(t)} x2={x(t)} y1={34} y2={46} className={t === 0 ? "stroke-white" : "stroke-slate-500"} strokeWidth={t === 0 ? 2 : 1} />
            <text x={x(t)} y={68} textAnchor="middle" className={`text-[15px] ${t === 0 ? "fill-white font-bold" : "fill-slate-300"}`}>{sg(t)}</text>
          </g>
        ))}
        <circle cx={x(state.start)} cy={40} r={6} className="fill-slate-950 stroke-amber-300" strokeWidth={2} />
        <circle cx={x(state.pos)} cy={40} r={7} className="fill-amber-300 transition-all duration-300" />
        <text x={x(state.pos)} y={20} textAnchor="middle" className="fill-amber-200 text-[16px] font-bold">{sg(state.pos)}</text>
      </svg>
      <div className="flex flex-wrap gap-2">
        <button type="button" className={control} disabled={state.pos <= state.min} onClick={() => dispatch({ type: "step", delta: -1 })}>
          ← Retroceder 1
        </button>
        <button type="button" className={control} disabled={state.pos >= state.max} onClick={() => dispatch({ type: "step", delta: 1 })}>
          Avanzar 1 →
        </button>
      </div>
      <p className="text-slate-200">
        {moved === 0 ? <>Estás en {sg(state.start)}.</> : <strong>{lineExpression(state)}</strong>}
      </p>
    </div>
  );
}

function Pan({ label, xs, units }: { label: string; xs: number; units: number }) {
  return (
    <div className="min-w-0 flex-1">
      <p className="mb-1 text-center text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <div className="flex min-h-24 flex-wrap content-end justify-center gap-1 rounded-b-2xl border-x-2 border-b-2 border-slate-500 bg-slate-950/50 p-2" aria-hidden="true">
        {Array.from({ length: xs }, (_, i) => (
          <span key={`x${i}`} className={`grid h-9 w-9 place-items-center rounded-md bg-violet-400 font-bold text-slate-950 ${styles.pop}`}>x</span>
        ))}
        {Array.from({ length: units }, (_, i) => (
          <span key={`u${i}`} className={`grid h-6 w-6 place-items-center rounded-full bg-amber-300 text-[10px] font-bold text-slate-950 ${styles.pop}`}>1</span>
        ))}
      </div>
    </div>
  );
}

/** Balanza: solo se permiten cambios que la mantienen equilibrada; el otro botón muestra por qué no. */
export function BalanceBoard({ state, dispatch }: { state: BalanceState; dispatch: Dispatch }) {
  return (
    <div className="space-y-3">
      <div role="img" aria-label={`Balanza equilibrada: ${balanceEquation(state)}`} className="space-y-1">
        <div className="flex items-end gap-3">
          <Pan label="Izquierda" xs={state.xs} units={state.left} />
          <Pan label="Derecha" xs={0} units={state.right} />
        </div>
        <div aria-hidden="true" className="mx-auto h-1.5 w-full rounded bg-slate-400" />
        <div aria-hidden="true" className="mx-auto h-6 w-2 rounded-b bg-slate-500" />
      </div>
      <p className="text-center text-lg font-bold text-slate-100">{balanceEquation(state)}</p>
      <div className="flex flex-wrap gap-2">
        <button type="button" className={`${control} border-cyan-300 text-cyan-100`} disabled={state.left === 0} onClick={() => dispatch({ type: "remove-both" })}>
          Quitar 1 de cada lado
        </button>
        <button type="button" className={control} disabled={state.left === 0} onClick={() => dispatch({ type: "remove-left" })}>
          Quitar 1 solo a la izquierda
        </button>
        <button type="button" className={`${control} border-cyan-300 text-cyan-100`} disabled={state.xs === 1} onClick={() => dispatch({ type: "share" })}>
          Repartir en {state.xs > 1 ? state.xs : "grupos"}
        </button>
      </div>
    </div>
  );
}
