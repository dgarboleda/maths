"use client";

import { useState } from "react";

export function FractionBarConcept({ mode }: { mode: "fraction" | "decimal" | "percent" }) {
  const fixedDen = mode === "fraction" ? null : 10;
  const [denominator, setDenominator] = useState(fixedDen ?? 4);
  const [numerator, setNumerator] = useState(1);
  const clampedNum = Math.min(numerator, denominator);

  const label =
    mode === "fraction"
      ? `${clampedNum}/${denominator}`
      : mode === "decimal"
        ? `0,${clampedNum}`
        : `${clampedNum * 10}%`;

  const title =
    mode === "fraction" ? "Fracciones con barras 🍫" : mode === "decimal" ? "Decimales con barras 🔟" : "Porcentajes con barras 💯";

  const explanation =
    mode === "fraction"
      ? "Una fracción son partes de un todo. El número de abajo (denominador) dice en cuántas partes iguales se corta; el de arriba (numerador) dice cuántas partes tomas."
      : mode === "decimal"
        ? "Los decimales son fracciones que siempre parten el todo en 10, 100 o 1000. 0,3 significa 3 de cada 10 partes — lo mismo que 3/10."
        : "Porcentaje significa 'de cada 100'. 30% es exactamente lo mismo que 30/100 o 0,30 — siempre comparas contra 100 partes.";

  return (
    <div className="space-y-6">
      <div className="mx-auto max-w-xl text-center">
        <h2 className="text-2xl font-bold text-purple-800 sm:text-3xl">{title}</h2>
        <p className="mt-1 text-slate-600">{explanation}</p>
      </div>

      <div className="grid grid-cols-1 gap-6 rounded-2xl border-2 border-purple-100 bg-purple-50 p-6 md:grid-cols-2">
        {mode === "fraction" && (
          <div className="space-y-2">
            <div className="flex justify-between font-bold text-purple-800">
              <span>Partes totales:</span>
              <span className="text-2xl text-blue-600">{denominator}</span>
            </div>
            <input
              type="range"
              min={2}
              max={10}
              value={denominator}
              onChange={(e) => {
                const d = Number(e.target.value);
                setDenominator(d);
                setNumerator((n) => Math.min(n, d));
              }}
              className="h-3 w-full cursor-pointer appearance-none rounded-lg bg-purple-200 accent-blue-600"
            />
          </div>
        )}
        <div className="space-y-2">
          <div className="flex justify-between font-bold text-purple-800">
            <span>Partes coloreadas:</span>
            <span className="text-2xl text-pink-600">{clampedNum}</span>
          </div>
          <input
            type="range"
            min={0}
            max={denominator}
            value={clampedNum}
            onChange={(e) => setNumerator(Number(e.target.value))}
            className="h-3 w-full cursor-pointer appearance-none rounded-lg bg-purple-200 accent-pink-600"
          />
        </div>
      </div>

      <div className="rounded-2xl bg-gradient-to-r from-purple-600 to-pink-500 px-6 py-4 text-center text-white shadow-lg">
        <div className="text-3xl font-extrabold sm:text-4xl">{label}</div>
      </div>

      <div className="flex overflow-hidden rounded-xl border-2 border-slate-300">
        {Array.from({ length: denominator }, (_, i) => (
          <div
            key={i}
            className={`h-16 flex-1 border-r border-slate-300 last:border-r-0 ${i < clampedNum ? "bg-pink-400" : "bg-slate-100"}`}
          />
        ))}
      </div>

      {mode !== "fraction" && (
        <p className="text-center text-sm text-slate-500">
          {clampedNum}/10 = 0,{clampedNum} = {clampedNum * 10}% — son tres formas de escribir lo mismo.
        </p>
      )}
    </div>
  );
}
