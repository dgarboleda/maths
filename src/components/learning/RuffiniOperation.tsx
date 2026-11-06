"use client";

import { useSheetInputMode } from "./NumericKeypad";
import { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import {
  checkRuffiniWork,
  encodeRuffiniWork,
  polynomialText,
  ruffiniTrace,
  sg,
  termName,
  divisorText,
  type RuffiniSpec,
} from "@/lib/learning/core";
import { MathText } from "@/components/MathText";
import { secondaryButton } from "./LearningShell";
import { Challenge } from "./Challenge";
import { Slider } from "./GraphVisuals";

/* Tabla de Ruffini: en la esquina el número que anula el divisor; arriba
 * los coeficientes; en medio los productos; abajo las sumas (la última es el
 * resto). Modos: guiado (cada casilla se corrige), libre (se revisa al
 * enviar) y demostración. */

type Key = "root" | `c${number}` | `p${number}` | `r${number}`;
const cellClass = "flex h-11 w-10 items-center justify-center font-mono text-base tabular-nums sm:w-14 sm:text-lg";
const inputClass =
  "h-10 w-9 rounded-md border text-center font-mono text-base tabular-nums focus:outline-2 focus:outline-cyan-300 sm:w-12 sm:text-lg";
const parse = (text: string) => (/^[−-]?\d+$/.test(text) ? Number(text.replace("−", "-")) : Number.NaN);
const clean = (text: string) => text.replace(/-/g, "−").replace(/[^\d−]/g, "").replace(/(?!^)−/g, "").slice(0, 5);

/** Orden en que se escribe la tabla. */
function order(n: number): Key[] {
  const keys: Key[] = ["root"];
  for (let i = 0; i < n; i++) keys.push(`c${i}`);
  for (let i = 0; i < n; i++) {
    if (i > 0) keys.push(`p${i}`);
    keys.push(`r${i}`);
  }
  return keys;
}

function expectedOf(spec: RuffiniSpec, key: Key): number {
  const t = ruffiniTrace(spec);
  if (key === "root") return spec.root;
  const i = Number(key.slice(1));
  if (key[0] === "c") return spec.coefficients[i];
  if (key[0] === "p") return t.steps[i].product!;
  return t.steps[i].result;
}

function labelOf(spec: RuffiniSpec, key: Key): string {
  const degree = spec.coefficients.length - 1;
  if (key === "root") return "Esquina de la tabla";
  const i = Number(key.slice(1));
  if (key[0] === "c") return `Coeficiente de ${termName(degree, i)}`;
  if (key[0] === "p") return `Producto de la columna ${i + 1}`;
  return i === degree ? "Resto" : `Suma de la columna ${i + 1}`;
}

function Table({
  spec,
  render,
}: {
  spec: RuffiniSpec;
  render: (key: Key) => React.ReactNode;
}) {
  const n = spec.coefficients.length;
  const cols = Array.from({ length: n }, (_, i) => i);
  return (
    <div className="overflow-x-auto" tabIndex={0} role="group" aria-label={`Ruffini: ${polynomialText(spec.coefficients)} entre ${divisorText(spec.root)}`}>
      <div className="mx-auto grid w-max" style={{ gridTemplateColumns: `auto repeat(${n}, auto)` }}>
        <span className={`${cellClass} border-r-2 border-slate-200`} />
        {cols.map((i) => (
          <span key={`c${i}`} className={`${cellClass} text-slate-100`}>{render(`c${i}`)}</span>
        ))}
        <span className={`${cellClass} border-b-2 border-r-2 border-slate-200 text-amber-200`}>{render("root")}</span>
        {cols.map((i) => (
          <span key={`p${i}`} className={`${cellClass} border-b-2 border-slate-200 text-slate-300`}>{i > 0 ? render(`p${i}`) : null}</span>
        ))}
        <span className={cellClass} />
        {cols.map((i) => (
          <span key={`r${i}`} className={`${cellClass} ${i === n - 1 ? "rounded-md border-2 border-amber-300/70" : ""} text-cyan-100`}>
            {render(`r${i}`)}
          </span>
        ))}
      </div>
    </div>
  );
}

export function RuffiniDemo({ spec, initialStep }: { spec: RuffiniSpec; initialStep?: number }) {
  const trace = useMemo(() => ruffiniTrace(spec), [spec]);
  const total = trace.steps.length;
  const [shown, setShown] = useState(Math.min(initialStep ?? 0, total));
  const current = shown > 0 ? trace.steps[shown - 1] : null;
  return (
    <div className="space-y-3">
      <Table
        spec={spec}
        render={(key) => {
          if (key === "root") return sg(spec.root);
          const i = Number(key.slice(1));
          if (key[0] === "c") return sg(spec.coefficients[i]);
          if (i >= shown) return null;
          return sg(key[0] === "p" ? trace.steps[i].product! : trace.steps[i].result);
        }}
      />
      <p aria-live="polite" className="min-h-12 rounded-xl bg-slate-950 p-3 text-sm leading-relaxed text-slate-200">
        {current ? current.why : `En la esquina, ${sg(spec.root)}: ${divisorText(spec.root)} = 0 cuando x = ${sg(spec.root)}.`}
        {shown >= total && (
          <strong className="mt-1 block text-cyan-100">
            <MathText text={`Cociente: ${polynomialText(trace.quotient)} · resto: ${sg(trace.remainder)}`} />
          </strong>
        )}
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

function restore(spec: RuffiniSpec, response: string): Record<string, string> {
  const values: Record<string, string> = {};
  const parts = response.split("|");
  if (parts.length !== 4 || !parts[0].startsWith("R")) return values;
  values.root = clean(parts[0].slice(1));
  parts[1].split(",").forEach((v, i) => (values[`c${i}`] = clean(v)));
  parts[2].split(",").forEach((v, i) => (values[`p${i + 1}`] = clean(v)));
  parts[3].split(",").forEach((v, i) => (values[`r${i}`] = clean(v)));
  return values;
}

export function RuffiniSheet({
  spec,
  mode,
  response,
  onChange,
  onComplete,
  failedResponse = null,
  disabled,
}: {
  spec: RuffiniSpec;
  mode: "guided" | "free";
  response: string;
  onChange: (response: string) => void;
  onComplete?: (response: string) => void;
  failedResponse?: string | null;
  disabled?: boolean;
}) {
  const keypadMode = useSheetInputMode("text");
  const n = spec.coefficients.length;
  const keys = useMemo(() => order(n), [n]);
  const [values, setValues] = useState<Record<string, string>>(() => restore(spec, response));
  const [miss, setMiss] = useState<Key | null>(null);
  const [lastWhy, setLastWhy] = useState("");
  const trace = useMemo(() => ruffiniTrace(spec), [spec]);

  const ok = (key: Key, v = values) => parse(v[key] ?? "") === expectedOf(spec, key);
  const activeIndex = mode === "guided" ? keys.findIndex((k) => !ok(k)) : -1;
  const active = activeIndex >= 0 ? keys[activeIndex] : null;
  const done = mode === "guided" && activeIndex === -1;

  const encode = (v: Record<string, string>) => {
    if (keys.some((k) => !v[k])) return "";
    const range = (prefix: string, from: number) => Array.from({ length: n - from }, (_, i) => v[`${prefix}${i + from}`]);
    return encodeRuffiniWork(v.root, range("c", 0), range("p", 1), range("r", 0));
  };
  const set = (key: Key, raw: string) => {
    const next = { ...values, [key]: clean(raw) };
    setValues(next);
    const text = encode(next);
    onChange(text);
    if (mode === "guided") {
      const want = expectedOf(spec, key);
      if (ok(key, next)) {
        setMiss(null);
        if (key !== "root" && key[0] === "r") setLastWhy(trace.steps[Number(key.slice(1))].why);
        if (keys.every((k) => ok(k, next))) onComplete?.(text);
      } else if (next[key].replace("−", "").length >= String(Math.abs(want)).length && next[key] !== "−") setMiss(key);
      else setMiss(null);
    }
  };

  const failed = mode === "free" && failedResponse !== null && failedResponse === response ? checkRuffiniWork(spec, failedResponse) : null;
  const wrongKey: Key | null = failed?.firstError
    ? failed.firstError.kind === "root"
      ? "root"
      : (`${failed.firstError.kind[0] === "c" ? "c" : failed.firstError.kind[0] === "p" ? "p" : "r"}${failed.firstError.column}` as Key)
    : null;

  return (
    <div className="space-y-3">
      <Table
        spec={spec}
        render={(key) => {
          const index = keys.indexOf(key);
          if (mode === "guided" && (done || index < activeIndex)) return sg(expectedOf(spec, key));
          if (mode === "guided" && key !== active) return null;
          return (
            <input
              aria-label={labelOf(spec, key)}
              aria-invalid={miss === key || wrongKey === key}
              inputMode={keypadMode}
              autoComplete="off"
              value={values[key] ?? ""}
              disabled={disabled}
              onChange={(e) => set(key, e.target.value)}
              className={`${inputClass} ${miss === key || wrongKey === key ? "border-amber-400 bg-amber-950/50" : key === active ? "border-cyan-300 bg-cyan-950/40" : "border-slate-600 bg-slate-950"} text-slate-100`}
            />
          );
        }}
      />
      <p aria-live="polite" className="text-sm leading-relaxed">
        {mode === "guided" ? (
          done ? (
            <span className="block rounded-xl bg-emerald-950/40 p-3 text-emerald-100">
              <MathText text={`${lastWhy} Cociente: ${polynomialText(trace.quotient)}; resto: ${sg(trace.remainder)}.`} />
            </span>
          ) : (
            <span className={`block rounded-xl p-3 ${miss ? "bg-amber-950/40 text-amber-100" : "bg-cyan-950/40 text-cyan-100"}`}>
              {miss && "Revisa esa casilla. "}
              {lastWhy && !miss && <span className="block text-slate-300">{lastWhy}</span>}
              {active === "root"
                ? `¿Qué valor de x anula ${divisorText(spec.root)}? Va en la esquina.`
                : active?.[0] === "c"
                  ? `Escribe el ${labelOf(spec, active).toLowerCase()}, con su signo${spec.coefficients[Number(active.slice(1))] === 0 ? "" : ""}. Si falta un término, va 0.`
                  : active === "r0"
                    ? "Baja el primer coeficiente."
                    : active?.[0] === "p"
                      ? `Multiplica la esquina (${sg(spec.root)}) por el número de abajo de la columna anterior.`
                      : "Suma la columna: coeficiente + producto."}
            </span>
          )
        ) : failed?.firstError ? (
          <span className="block rounded-xl bg-amber-950/40 p-3 text-amber-100">Revisa la casilla marcada: es la primera que no coincide.</span>
        ) : (
          <span className="text-xs text-slate-400">
            Completa la tabla: la esquina, los coeficientes (0 si falta un término), cada producto y cada suma. La casilla
            marcada es el resto. Escribe el signo menos con «-».
          </span>
        )}
      </p>
    </div>
  );
}

/** Exploración de la clase: P(x) = x³ − 2x² − 5x + c entre (x − r). */
export function RuffiniExplorer({ id }: { id: string }) {
  const [root, setRoot] = useState(2);
  const [c, setC] = useState(6);
  const spec: RuffiniSpec = { op: "ruffini", coefficients: [1, -2, -5, c], root };
  const trace = ruffiniTrace(spec);
  return (
    <>
      <Slider id={`${id}-r`} label="Valor de la esquina (r)" value={root} min={-4} max={4} onChange={setRoot} />
      <Slider id={`${id}-c`} label="Término independiente (c)" value={c} min={-12} max={12} onChange={setC} />
      <p className="text-sm text-slate-300">
        <MathText text={`Divides ${polynomialText(spec.coefficients)} entre (${divisorText(root)}).`} />
      </p>
      <RuffiniDemo key={`${root}/${c}`} spec={spec} initialStep={Infinity} />
      <Challenge
        goals={[
          { text: "Consigue que el resto sea 0: entonces (x − r) es un factor del polinomio.", met: trace.remainder === 0 },
          { text: "Con r negativo, consigue un resto positivo.", met: root < 0 && trace.remainder > 0 },
          { text: "Consigue que el resto sea igual a c. ¿Qué valor de r lo logra siempre?", met: trace.remainder === c },
        ]}
      />
    </>
  );
}
