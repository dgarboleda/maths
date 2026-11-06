"use client";

import { useSheetInputMode } from "./NumericKeypad";
import { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import {
  checkFactorWork,
  encodeFactorWork,
  factorTrace,
  gcdOf,
  isPrime,
  type FactorSpec,
  type FactorTrace,
} from "@/lib/learning/core";
import { secondaryButton } from "./LearningShell";
import { Challenge } from "./Challenge";
import { Slider } from "./GraphVisuals";

/* Tabla de descomposición simultánea en factores primos (MCD y MCM): los
 * números a la izquierda de la raya y, en cada línea, el primo que divide a
 * la derecha. Modos: guiado (cada casilla se corrige), libre (se revisa al
 * enviar, con cualquier orden de primos) y demostración. */

const box =
  "h-10 min-w-0 rounded-md border text-center font-mono text-lg tabular-nums focus:outline-2 focus:outline-cyan-300 sm:h-11";
const numberCell = "flex h-10 w-14 items-center justify-center font-mono text-lg tabular-nums sm:h-11 sm:w-16";

type Line = { values: string[]; prime: string };

function Table({
  spec,
  lines,
  render,
  commons,
}: {
  spec: FactorSpec;
  lines: number;
  render: (line: number, column: number | "p") => React.ReactNode;
  /** Líneas cuyo primo divide a todos (se marcan en la demostración). */
  commons?: Set<number>;
}) {
  const k = spec.values.length;
  return (
    <div className="overflow-x-auto" tabIndex={0} role="group" aria-label={`Tabla de factores primos de ${spec.values.join(", ")}`}>
      <div className="mx-auto grid w-max gap-y-1" style={{ gridTemplateColumns: `repeat(${k}, auto) auto` }}>
        {Array.from({ length: lines }, (_, line) => (
          <div key={line} className="contents">
            {spec.values.map((_, c) => (
              <span key={c} className={numberCell}>{render(line, c)}</span>
            ))}
            <span className={`${numberCell} ml-2 border-l-2 border-slate-200 pl-2 ${commons?.has(line) ? "text-amber-200" : "text-cyan-100"}`}>
              {render(line, "p")}
              {commons?.has(line) && <span className="ml-1 text-xs" aria-label="divide a todos">●</span>}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function linesOf(trace: FactorTrace): Line[] {
  return [
    ...trace.rows.map((r) => ({ values: r.values.map(String), prime: String(r.prime) })),
    { values: trace.rows.at(-1)!.next.map(String), prime: "" },
  ];
}

export function FactorDemo({ spec, initialStep }: { spec: FactorSpec; initialStep?: number }) {
  const trace = useMemo(() => factorTrace(spec), [spec]);
  const total = trace.rows.length;
  const [shown, setShown] = useState(Math.min(initialStep ?? 0, total));
  const lines = linesOf(trace);
  const commons = new Set(trace.rows.flatMap((r, i) => (r.common && i < shown ? [i] : [])));
  const current = shown > 0 ? trace.rows[shown - 1] : null;
  return (
    <div className="space-y-3">
      <Table
        spec={spec}
        lines={shown + 1}
        commons={commons}
        render={(line, c) => (c === "p" ? (line < shown ? lines[line].prime : "") : lines[line].values[c])}
      />
      <p aria-live="polite" className="min-h-12 rounded-xl bg-slate-950 p-3 text-sm leading-relaxed text-slate-200">
        {current ? current.why : trace.rows[0].ask}
        {shown >= total && (
          <strong className="mt-1 block text-cyan-100">
            {spec.op === "mcd"
              ? `MCD = ${trace.rows.map((r) => r.prime).join(" × ")} = ${trace.mcd}`
              : `MCM = ${trace.rows.map((r) => r.prime).join(" × ")} = ${trace.mcm} · MCD = ${
                  trace.rows.filter((r) => r.common).map((r) => r.prime).join(" × ") || "1"
                } = ${trace.mcd}`}
          </strong>
        )}
      </p>
      <div className="flex flex-wrap gap-2">
        <button type="button" className={secondaryButton} disabled={shown === 0} onClick={() => setShown(shown - 1)}>
          <ArrowLeft size={16} aria-hidden="true" /> Paso anterior
        </button>
        <button type="button" className={secondaryButton} disabled={shown >= total} onClick={() => setShown(shown + 1)}>
          {shown === 0 ? "Empezar" : "Siguiente fila"} <ArrowRight size={16} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

/** Lo escrito: cada línea con sus números (la primera es el enunciado) y su primo. */
function restore(spec: FactorSpec, response: string): { lines: Line[]; answer: string } {
  const m = /^T(\d+);(.*)$/.exec(response);
  const lines: Line[] = [{ values: spec.values.map(String), prime: "" }];
  if (m)
    for (const row of m[2].split("|")) {
      const [p, rest] = row.split(":");
      lines[lines.length - 1].prime = p;
      lines.push({ values: rest.split("."), prime: "" });
    }
  while (lines.length < 3) lines.push({ values: spec.values.map(() => ""), prime: "" });
  return { lines, answer: m?.[1] ?? "" };
}

export function FactorSheet({
  spec,
  mode,
  response,
  onChange,
  onComplete,
  failedResponse = null,
  disabled,
}: {
  spec: FactorSpec;
  mode: "guided" | "free";
  response: string;
  onChange: (response: string) => void;
  onComplete?: (response: string) => void;
  failedResponse?: string | null;
  disabled?: boolean;
}) {
  const keypadMode = useSheetInputMode("numeric");
  const trace = useMemo(() => factorTrace(spec), [spec]);
  const [state, setState] = useState(() => restore(spec, response));
  const [miss, setMiss] = useState<string | null>(null);
  const label = spec.op === "mcd" ? "MCD" : "MCM";
  const answerValue = spec.op === "mcd" ? trace.mcd : trace.mcm;

  // Valor que debería ir en una línea según lo ya escrito (cualquier orden de primos).
  const expectedNext = (lines: Line[], line: number) => {
    const prev = lines[line - 1];
    const p = Number(prev.prime);
    return prev.values.map((v) => (Number(v) % p === 0 ? String(Number(v) / p) : v));
  };
  // MCD: la tabla termina cuando no queda ningún divisor común; MCM: en 1.
  const mcd = spec.op === "mcd";
  const lineDone = (lines: Line[], line: number) =>
    lines[line].values.every((v) => v !== "") &&
    (mcd ? gcdOf(lines[line].values.map(Number)) === 1 : lines[line].values.every((v) => Number(v) === 1));
  /** El primo sirve: en el MCD divide a todos; en el MCM, a alguno. */
  const primeFits = (values: string[], p: number) =>
    isPrime(p) && (mcd ? values.every((v) => Number(v) % p === 0) : values.some((v) => Number(v) % p === 0));
  const rowsOf = (lines: Line[]) => {
    const rows: { prime: string; next: string[] }[] = [];
    for (let i = 0; i + 1 < lines.length && lines[i].prime; i++) rows.push({ prime: lines[i].prime, next: lines[i + 1].values });
    return rows;
  };
  const encode = (s: typeof state) => {
    const rows = rowsOf(s.lines);
    const complete = rows.length > 0 && rows.every((r) => r.next.every((v) => v !== "")) && s.answer !== "";
    return complete ? encodeFactorWork(s.answer, rows) : "";
  };
  const update = (next: typeof state) => {
    setState(next);
    const text = encode(next);
    onChange(text);
    return text;
  };

  // Modo guiado: la casilla activa es la primera sin resolver.
  const active = (() => {
    if (mode !== "guided") return null;
    const lines = state.lines;
    for (let i = 0; i < lines.length; i++) {
      if (i > 0) {
        const want = expectedNext(lines, i);
        const c = lines[i].values.findIndex((v, k) => v === "" || v !== want[k]);
        if (c >= 0) return { line: i, column: c as number | "p" };
      }
      if (lineDone(lines, i)) return { line: i, column: "answer" as const };
      const p = Number(lines[i].prime);
      if (!lines[i].prime || !primeFits(lines[i].values, p)) return { line: i, column: "p" as const };
    }
    return null;
  })();
  const done = mode === "guided" && state.answer !== "" && Number(state.answer) === answerValue && active?.column === "answer";

  const setValue = (line: number, column: number | "p", raw: string) => {
    const value = raw.replace(/\D/g, "").slice(0, 4);
    const lines = state.lines.map((l, i) =>
      i !== line ? l : column === "p" ? { ...l, prime: value } : { ...l, values: l.values.map((v, k) => (k === column ? value : v)) },
    );
    if (mode === "guided") {
      if (column === "p") {
        const p = Number(value);
        const ok = primeFits(state.lines[line].values, p);
        setMiss(value && !ok && value.length >= 1 && (p > 1 || value.length > 1) ? `p${line}` : null);
        if (ok && !lines[line + 1]) lines.push({ values: spec.values.map(() => ""), prime: "" });
      } else {
        const want = expectedNext(lines, line)[column];
        setMiss(value.length >= want.length && value !== want ? `${line}:${column}` : null);
      }
    }
    // Modo libre: al escribir el primo de la última línea aparece debajo
    // otra para los cocientes (sin tener que pulsar «Añadir fila»).
    if (mode === "free" && column === "p" && value && line === lines.length - 1 && lines.length < 16)
      lines.push({ values: spec.values.map(() => ""), prime: "" });
    update({ ...state, lines });
  };
  const setAnswer = (raw: string) => {
    const answer = raw.replace(/\D/g, "").slice(0, 8);
    const text = update({ ...state, answer });
    if (mode === "guided") {
      const ok = Number(answer) === answerValue;
      setMiss(answer && !ok && answer.length >= String(answerValue).length ? "answer" : null);
      if (ok) onComplete?.(text);
    }
  };

  const failed = mode === "free" && failedResponse !== null && failedResponse === response ? checkFactorWork(spec, failedResponse) : null;
  // El motivo ya lo da la respuesta de la actividad: aquí solo se señala la fila.
  const failedRow = failed?.problem && failed.problem.kind !== "incompleta" ? failed.problem.row : null;

  const visibleLines = mode === "guided" ? Math.min(state.lines.length, (active?.line ?? state.lines.length - 1) + 1) : state.lines.length;
  return (
    <div className="space-y-3">
      <Table
        spec={spec}
        lines={visibleLines}
        render={(line, c) => {
          if (line === 0 && c !== "p") return <span className="text-slate-100">{spec.values[c]}</span>;
          const value = c === "p" ? state.lines[line].prime : state.lines[line].values[c];
          const key = c === "p" ? `p${line}` : `${line}:${c}`;
          const isActive = active?.line === line && active.column === c;
          const accepted = mode === "guided" && !isActive && (line < (active?.line ?? Infinity) || (active?.line === line && c !== "p" && (active.column === "p" || active.column === "answer")));
          if (mode === "guided" && accepted) return <span className={c === "p" ? "" : "text-slate-100"}>{value}</span>;
          if (mode === "guided" && !isActive) return null;
          return (
            <input
              aria-label={c === "p" ? `Primo de la fila ${line + 1}` : `Fila ${line + 1}: número ${c + 1}`}
              aria-invalid={miss === key}
              inputMode={keypadMode}
              autoComplete="off"
              value={value}
              disabled={disabled}
              onChange={(e) => setValue(line, c, e.target.value)}
              className={`${box} w-12 sm:w-14 ${miss === key ? "border-amber-400 bg-amber-950/50" : isActive ? "border-cyan-300 bg-cyan-950/40" : "border-slate-600 bg-slate-950"} text-slate-100`}
            />
          );
        }}
      />
      {mode === "free" && (
        <div className="flex flex-wrap gap-2">
          <button type="button" className={secondaryButton} disabled={disabled || state.lines.length >= 16}
            onClick={() => update({ ...state, lines: [...state.lines, { values: spec.values.map(() => ""), prime: "" }] })}>
            Añadir fila
          </button>
          <button type="button" className={secondaryButton} disabled={disabled || state.lines.length <= 2}
            onClick={() => update({ ...state, lines: state.lines.slice(0, -1) })}>
            Quitar la última fila
          </button>
        </div>
      )}
      {(mode === "free" || active?.column === "answer" || done) && (
        <label className="flex items-center gap-2 text-lg font-bold text-white">
          {label} =
          <input
            aria-label={`${label} de ${spec.values.join(", ")}`}
            aria-invalid={miss === "answer"}
            inputMode={keypadMode}
            autoComplete="off"
            value={state.answer}
            disabled={disabled || done}
            onChange={(e) => setAnswer(e.target.value)}
            className={`${box} w-28 ${miss === "answer" ? "border-amber-400 bg-amber-950/50" : "border-slate-600 bg-slate-950"} text-cyan-100`}
          />
        </label>
      )}
      <p aria-live="polite" className="text-sm leading-relaxed">
        {mode === "guided" ? (
          miss ? (
            <span className="block rounded-xl bg-amber-950/40 p-3 text-amber-100">
              {miss.startsWith("p")
                ? mcd
                  ? "Revisa el primo: para el MCD tiene que ser primo y dividir a todos los números de la fila."
                  : "Revisa el primo: tiene que ser primo y dividir a alguno de los números de la fila."
                : miss === "answer"
                  ? spec.op === "mcd"
                    ? "Multiplica solo los primos de las filas que dividieron a todos."
                    : "Multiplica todos los primos de la derecha."
                  : "Revisa: si el primo divide al número, escribe el cociente; si no, bájalo igual."}
            </span>
          ) : done ? (
            <span className="block rounded-xl bg-emerald-950/40 p-3 text-emerald-100">{label} = {answerValue}.</span>
          ) : active?.column === "answer" ? (
            <span className="block rounded-xl bg-cyan-950/40 p-3 text-cyan-100">
              {mcd
                ? "Ya no queda ningún divisor común: la tabla termina. Multiplica los primos de la derecha."
                : "Todos quedaron en 1. Multiplica todos los primos."}
            </span>
          ) : active?.column === "p" ? (
            <span className="block rounded-xl bg-cyan-950/40 p-3 text-cyan-100">¿Qué primo divide a alguno de los números de la fila {active.line + 1}? Empieza por el menor.</span>
          ) : (
            <span className="block rounded-xl bg-cyan-950/40 p-3 text-cyan-100">Divide entre el primo los que se puedan y baja sin cambiar los demás.</span>
          )
        ) : failedRow !== null ? (
          <span className="block rounded-xl bg-amber-950/40 p-3 text-amber-100">Revisa la fila {failedRow}: es la primera que no coincide.</span>
        ) : (
          <span className="text-xs text-slate-400">
            {mcd
              ? "A la derecha de la raya, un primo que divida a todos los números; debajo, lo que queda. Termina cuando ya no tengan ningún divisor común."
              : "A la derecha de la raya, un primo por fila; debajo, lo que queda de cada número. Sigue hasta que todos sean 1."}
          </span>
        )}
      </p>
    </div>
  );
}

/** Exploración de la clase: el alumno elige dos números. */
export function FactorExplorer({ id }: { id: string }) {
  const [a, setA] = useState(12);
  const [b, setB] = useState(18);
  const spec: FactorSpec = { op: "mcm", values: [a, b] };
  const trace = factorTrace(spec);
  return (
    <>
      <Slider id={`${id}-a`} label="Primer número" value={a} min={2} max={120} onChange={setA} />
      <Slider id={`${id}-b`} label="Segundo número" value={b} min={2} max={120} onChange={setB} />
      <FactorDemo key={`${a}-${b}`} spec={spec} initialStep={Infinity} />
      <Challenge
        goals={[
          { text: "Consigue dos números cuyo MCD sea 1 (primos entre sí).", met: trace.mcd === 1 },
          { text: "Consigue dos números distintos cuyo MCM sea su producto. ¿Qué tienen de especial?", met: a !== b && trace.mcm === a * b },
          { text: "Consigue que el MCM sea igual a uno de los dos números.", met: a !== b && (trace.mcm === a || trace.mcm === b) },
        ]}
      />
    </>
  );
}
