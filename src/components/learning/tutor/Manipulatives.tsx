"use client";

import { TRAY_SIZE, ARRAY_MAX, MAX_DENOMINATOR, type ArrayState, type FractionState, type PlaceValueState, type TutorAction } from "./model";
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

function Reserve({ name, part, onSplit, disabled, highlight }: { name: string; part: { num: number; den: number }; onSplit: () => void; disabled: boolean; highlight: string }) {
  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-semibold text-slate-100">
          {name}: {part.num}/{part.den}
        </p>
        <button type="button" className={`${control} text-sm`} disabled={disabled || part.den * 2 > MAX_DENOMINATOR} onClick={onSplit}>
          Partir en dos ({name.toLowerCase()})
        </button>
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
  return (
    <div className="space-y-4">
      <Reserve name="Reserva de arriba" part={state.top} disabled={state.joined} onSplit={() => dispatch({ type: "split", bar: "top" })} highlight="bg-emerald-400" />
      <Reserve name="Reserva de abajo" part={state.bottom} disabled={state.joined} onSplit={() => dispatch({ type: "split", bar: "bottom" })} highlight="bg-amber-300" />
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
