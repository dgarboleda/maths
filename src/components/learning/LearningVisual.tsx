"use client";

import { useId, useState } from "react";
import type { Visual } from "@/lib/learning/domain";

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
export function LearningVisual({ kind }: { kind: Visual }) {
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
