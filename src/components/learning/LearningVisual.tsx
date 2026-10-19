"use client";

import { useId, useState } from "react";
import type { Visual } from "@/lib/learning/domain";
import {
  InequalityVisual,
  LinearVisual,
  ParabolaVisual,
  ProportionVisual,
} from "./GraphVisuals";
import {
  AnglesVisual,
  CircleVisual,
  DecimalGridVisual,
  PowersVisual,
  PythagorasVisual,
  SimilarityVisual,
  TreeVisual,
  VolumeVisual,
} from "./ShapeVisuals";
import {
  BoxplotVisual,
  CountingVisual,
  ExponentialVisual,
  SystemVisual,
  TransformVisual,
  TrigVisual,
} from "./AdvancedVisuals";

function Bar({
  numerator,
  denominator,
  label,
}: {
  numerator: number;
  denominator: number;
  label: string;
}) {
  return (
    <div
      role="img"
      aria-label={label}
      className="flex h-12 overflow-hidden rounded-lg border border-cyan-300/60"
    >
      {Array.from({ length: denominator }, (_, i) => (
        <span
          key={i}
          aria-hidden="true"
          className={`flex-1 border-r border-slate-600 last:border-r-0 ${i < numerator ? "bg-cyan-300" : "bg-slate-800"}`}
        />
      ))}
    </div>
  );
}
function NumberLineVisual({ id }: { id: string }) {
  const [start, setStart] = useState(-3);
  const [move, setMove] = useState(5);
  const end = start + move;
  const ticks = Array.from({ length: 21 }, (_, i) => i - 10);
  return (
    <>
      <label htmlFor={`${id}-start`} className="block text-sm">
        Punto de partida: <strong>{start}</strong>
      </label>
      <input id={`${id}-start`} type="range" min={-10} max={10} value={start}
        onChange={(e) => setStart(Number(e.target.value))} className="min-h-8 w-full accent-cyan-300" />
      <label htmlFor={`${id}-move`} className="block text-sm">
        Sumar (positivo: derecha; negativo: izquierda): <strong>{move}</strong>
      </label>
      <input id={`${id}-move`} type="range" min={-10} max={10} value={move}
        onChange={(e) => setMove(Number(e.target.value))} className="min-h-8 w-full accent-cyan-300" />
      <div role="img" aria-label={`Recta numérica: de ${start} se avanza ${move} y se llega a ${end}`}
        className="grid grid-cols-[repeat(21,minmax(0,1fr))] gap-px rounded-lg bg-slate-950 p-2 text-center text-[10px]">
        {ticks.map((t) => (
          <span key={t} aria-hidden="true"
            className={`rounded py-1 ${t === start ? "bg-slate-500 text-white" : t === end ? "bg-cyan-300 font-bold text-slate-950" : t === 0 ? "text-white" : "text-slate-400"}`}>
            {t}
          </span>
        ))}
      </div>
      <p className="text-xl font-bold text-white">
        {start} + ({move}) = {end}
        {Math.abs(end) > 10 && " (fuera de la recta dibujada)"}
      </p>
      <p className="text-sm text-slate-300">
        Restar un número equivale a sumar su opuesto: {start} − ({-move}) = {end}.
      </p>
    </>
  );
}

function AreaVisual({ id }: { id: string }) {
  const [width, setWidth] = useState(6);
  const [height, setHeight] = useState(4);
  return (
    <>
      <label htmlFor={`${id}-w`} className="block text-sm">Base: <strong>{width} cm</strong></label>
      <input id={`${id}-w`} type="range" min={1} max={12} value={width}
        onChange={(e) => setWidth(Number(e.target.value))} className="min-h-8 w-full accent-cyan-300" />
      <label htmlFor={`${id}-h`} className="block text-sm">Altura: <strong>{height} cm</strong></label>
      <input id={`${id}-h`} type="range" min={1} max={8} value={height}
        onChange={(e) => setHeight(Number(e.target.value))} className="min-h-8 w-full accent-cyan-300" />
      <div role="img" aria-label={`Rectángulo de ${width} por ${height} cuadrados de 1 cm²`}
        className="grid w-fit gap-px rounded bg-cyan-300/40 p-px"
        style={{ gridTemplateColumns: `repeat(${width}, 1.25rem)` }}>
        {Array.from({ length: width * height }, (_, i) => (
          <span key={i} aria-hidden="true" className="size-5 bg-slate-800" />
        ))}
      </div>
      <p className="font-mono text-sm">
        Área = {width} × {height} = <strong>{width * height} cm²</strong> (cuadrados que cubren).<br />
        Perímetro = 2 × ({width} + {height}) = <strong>{2 * (width + height)} cm</strong> (borde que rodea).<br />
        Triángulo con la misma base y altura: {width} × {height} ÷ 2 = {(width * height) / 2} cm².
      </p>
    </>
  );
}

function DataVisual({ id }: { id: string }) {
  const [extra, setExtra] = useState(9);
  const values = [3, 4, 4, 5, 6, extra].sort((a, b) => a - b);
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const median = (values[2] + values[3]) / 2;
  return (
    <>
      <label htmlFor={`${id}-x`} className="block text-sm">
        Cambia el último dato: <strong>{extra}</strong>
      </label>
      <input id={`${id}-x`} type="range" min={0} max={30} value={extra}
        onChange={(e) => setExtra(Number(e.target.value))} className="min-h-8 w-full accent-cyan-300" />
      <p className="font-mono text-lg">Datos ordenados: {values.join(", ")}</p>
      <p className="text-sm">
        Media = suma ÷ cantidad = {values.reduce((a, b) => a + b, 0)} ÷ 6 = <strong>{mean.toLocaleString("es", { maximumFractionDigits: 2 })}</strong>.<br />
        Mediana = promedio de los dos centrales = <strong>{median.toLocaleString("es")}</strong>.<br />
        Moda = <strong>4</strong> · Rango = {values[5]} − {values[0]} = <strong>{values[5] - values[0]}</strong>.
      </p>
      <p className="text-sm text-slate-300">
        Lleva el dato a 30: la media cambia mucho y la mediana casi nada. Por eso la mediana resiste los valores extremos.
      </p>
    </>
  );
}

function ProbabilityVisual({ id }: { id: string }) {
  const [red, setRed] = useState(3);
  const [blue, setBlue] = useState(5);
  const total = red + blue;
  return (
    <>
      <label htmlFor={`${id}-r`} className="block text-sm">Fichas rojas: <strong>{red}</strong></label>
      <input id={`${id}-r`} type="range" min={0} max={10} value={red}
        onChange={(e) => setRed(Number(e.target.value))} className="min-h-8 w-full accent-cyan-300" />
      <label htmlFor={`${id}-b`} className="block text-sm">Fichas azules: <strong>{blue}</strong></label>
      <input id={`${id}-b`} type="range" min={0} max={10} value={blue}
        onChange={(e) => setBlue(Number(e.target.value))} className="min-h-8 w-full accent-cyan-300" />
      <div role="img" aria-label={`${red} fichas rojas y ${blue} azules`} className="flex flex-wrap gap-1">
        {Array.from({ length: total }, (_, i) => (
          <span key={i} aria-hidden="true" className={`size-5 rounded-full ${i < red ? "bg-rose-400" : "bg-sky-400"}`} />
        ))}
      </div>
      <p className="font-mono text-sm">
        {total === 0
          ? "La bolsa está vacía: no hay casos posibles."
          : <>P(roja) = casos favorables ÷ casos posibles = {red}/{total} = {(red / total).toLocaleString("es", { maximumFractionDigits: 3 })}<br />P(no roja) = 1 − {red}/{total} = {blue}/{total}</>}
      </p>
    </>
  );
}

const OWN_VISUALS: Partial<Record<Visual, (props: { id: string }) => React.JSX.Element>> = {
  integers: NumberLineVisual,
  area: AreaVisual,
  data: DataVisual,
  probability: ProbabilityVisual,
  linear: LinearVisual,
  direct: ({ id }) => <ProportionVisual id={id} initial="direct" />,
  inverse: ({ id }) => <ProportionVisual id={id} initial="inverse" />,
  parabola: ParabolaVisual,
  inequality: InequalityVisual,
  angles: AnglesVisual,
  pythagoras: PythagorasVisual,
  circle: CircleVisual,
  similarity: SimilarityVisual,
  volume: VolumeVisual,
  tree: TreeVisual,
  powers: PowersVisual,
  "decimal-grid": DecimalGridVisual,
  system: SystemVisual,
  exponential: ExponentialVisual,
  trig: TrigVisual,
  boxplot: BoxplotVisual,
  counting: CountingVisual,
  transform: TransformVisual,
};

export function LearningVisual({ kind }: { kind: Visual }) {
  const Own = OWN_VISUALS[kind];
  const ownId = useId();
  if (Own)
    return (
      <section aria-label="Explora la idea" className="space-y-4 rounded-2xl border border-cyan-300/25 bg-cyan-950/20 p-5">
        <h3 className="text-base font-bold text-cyan-200">Explora: cambia un valor y observa qué se conserva</h3>
        <Own id={ownId} />
        <p className="text-sm text-slate-300">Antes de mover el control, predice qué sucederá. Después explica el cambio con tus palabras.</p>
      </section>
    );
  return <ClassicVisual kind={kind} />;
}

function ClassicVisual({ kind }: { kind: Visual }) {
  const [parts, setParts] = useState(kind === "percent" ? 100 : 4);
  const [taken, setTaken] = useState(kind === "percent" ? 75 : 3);
  const [factor, setFactor] = useState(2);
  const [total, setTotal] = useState(120);
  const id = useId();
  const fractional = [
    "fraction",
    "equivalence",
    "percent",
    "quantity",
  ].includes(kind);
  return (
    <section
      aria-label="Explora la idea"
      className="space-y-4 rounded-2xl border border-cyan-300/25 bg-cyan-950/20 p-5"
    >
      <h3 className="text-base font-bold text-cyan-200">
        Explora: cambia un valor y observa qué se conserva
      </h3>
      {fractional ? (
        <>
          <p className="text-sm text-slate-300">
            Cada barra completa representa una unidad del mismo tamaño. Las
            partes de cada barra son iguales.
          </p>
          <label htmlFor={`${id}-taken`} className="block text-sm">
            Partes tomadas: <strong>{taken}</strong> de {parts}
          </label>
          <input
            id={`${id}-taken`}
            type="range"
            min={0}
            max={parts * (kind === "fraction" ? 2 : 1)}
            value={taken}
            onChange={(e) => setTaken(Number(e.target.value))}
            className="min-h-8 w-full accent-cyan-300"
          />
          {kind === "fraction" && (
            <>
              <label htmlFor={`${id}-parts`} className="block text-sm">
                Partes iguales de una unidad: <strong>{parts}</strong>
              </label>
              <input
                id={`${id}-parts`}
                type="range"
                min={2}
                max={12}
                value={parts}
                onChange={(e) => {
                  const next = Number(e.target.value);
                  setParts(next);
                  setTaken((old) => Math.min(old, next * 2));
                }}
                className="min-h-8 w-full accent-cyan-300"
              />
            </>
          )}
          <Bar
            numerator={Math.min(taken, parts)}
            denominator={parts}
            label={`${Math.min(taken, parts)} de ${parts} partes de la primera unidad`}
          />
          {taken > parts && (
            <Bar
              numerator={taken - parts}
              denominator={parts}
              label={`${taken - parts} de ${parts} partes de la segunda unidad`}
            />
          )}
          <p className="text-xl font-bold text-white">
            {taken}/{parts}
            {kind === "percent" &&
              ` = ${(taken / 100).toLocaleString("es")} = ${taken}%`}
          </p>
          {kind === "equivalence" && (
            <>
              <Bar
                numerator={taken * 2}
                denominator={parts * 2}
                label={`${taken * 2} de ${parts * 2} partes; la misma proporción`}
              />
              <p className="text-sm text-cyan-100">
                {taken}/{parts} = {taken * 2}/{parts * 2}. Al dividir cada parte
                en dos, cambia el conteo y se conserva la cantidad.
              </p>
            </>
          )}
          {kind === "quantity" && (
            <>
              <label htmlFor={`${id}-total`} className="block text-sm">
                Cantidad total: <strong>{total} unidades</strong>
              </label>
              <input
                id={`${id}-total`}
                type="range"
                min={40}
                max={200}
                step={4}
                value={total}
                onChange={(e) => setTotal(Number(e.target.value))}
                className="min-h-8 w-full accent-cyan-300"
              />
              <p className="rounded-xl bg-slate-950 p-3 font-mono text-sm">
                Un cuarto: {total} ÷ 4 = {total / 4}.<br />
                {taken}/4 del total: {total / 4} × {taken} ={" "}
                {(total / 4) * taken}.
              </p>
            </>
          )}
          <p className="text-sm text-slate-300">
            Antes de mover el control, predice qué sucederá. Después explica el
            cambio con tus palabras.
          </p>
        </>
      ) : (
        <>
          <label htmlFor={`${id}-factor`} className="block text-sm">
            {["balance", "equation"].includes(kind)
              ? "Valor de x"
              : "Cantidad de conjuntos"}
            : <strong>{factor}</strong>
          </label>
          <input
            id={`${id}-factor`}
            type="range"
            min={1}
            max={8}
            value={factor}
            onChange={(e) => setFactor(Number(e.target.value))}
            className="min-h-8 w-full accent-cyan-300"
          />
          {kind === "ratio" ? (
            <div className="space-y-3">
              <p className="font-mono text-lg">
                Azules:verdes = {2 * factor}:{3 * factor} = 2:3
              </p>
              <p className="text-sm">
                Total: {5 * factor}. La fracción azul del total es {2 * factor}/
                {5 * factor} = 2/5.
              </p>
            </div>
          ) : kind === "change" ? (
            <div className="space-y-3">
              <p className="font-mono text-lg">
                Base: {factor * 100}. Descuento: 25%.
              </p>
              <p>
                Un cuarto de {factor * 100} es {factor * 25}; se pagan{" "}
                {factor * 100} − {factor * 25} = <strong>{factor * 75}</strong>.
              </p>
              <p className="text-sm">
                El porcentaje se mantiene, pero la cantidad descontada cambia
                con la base.
              </p>
            </div>
          ) : ["balance", "equation"].includes(kind) ? (
            <div className="space-y-3">
              <div
                role="img"
                aria-label={`Los dos lados valen ${3 * factor + 6}`}
                className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 rounded-xl bg-slate-950 p-4 text-center font-mono text-lg"
              >
                <span>3 × {factor} + 6</span>
                <span>=</span>
                <span>{3 * factor + 6}</span>
              </div>
              <p className="text-sm">
                Al restar 6 a ambos lados: 3 × {factor} = {3 * factor}. Al
                dividir ambos entre 3: x = {factor}. Predice el total antes de
                cambiar x.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="font-mono text-lg">
                {factor} sensores × 5 créditos/sensor = {5 * factor} créditos
              </p>
              <table className="w-full text-left text-sm">
                <caption className="sr-only">
                  Cantidad y costo proporcional, sin cargo fijo
                </caption>
                <thead>
                  <tr>
                    <th className="p-2">Sensores</th>
                    <th className="p-2">Costo</th>
                    <th className="p-2">Costo / sensores</th>
                  </tr>
                </thead>
                <tbody>
                  {[1, 2, factor + 2].map((x) => (
                    <tr key={x} className="border-t border-slate-700">
                      <td className="p-2">{x}</td>
                      <td className="p-2">{x * 5}</td>
                      <td className="p-2">5</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="text-sm">
                Con un envío fijo de 6, el costo sería 5x + 6: la razón
                costo/cantidad cambiaría.
              </p>
            </div>
          )}
        </>
      )}
    </section>
  );
}
