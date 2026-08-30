"use client";

import { useState } from "react";

export function NumberLineConcept({ min, max }: { min: number; max: number }) {
  const [a, setA] = useState(Math.round(min + (max - min) / 3));
  const [b, setB] = useState(Math.max(1, Math.round((max - min) / 6)));
  const [op, setOp] = useState<"+" | "-">("+");

  const result = op === "+" ? a + b : a - b;
  const clamped = Math.max(min, Math.min(max, result));

  return (
    <div className="space-y-6">
      <div className="mx-auto max-w-xl text-center">
        <h2 className="text-2xl font-bold text-purple-800 sm:text-3xl">Sumar y restar en la recta 🔢</h2>
        <p className="mt-1 text-slate-600">
          La recta numérica pone todos los números en fila, del más chico al más grande. Sumar es{" "}
          <strong>saltar hacia la derecha</strong>; restar es <strong>saltar hacia la izquierda</strong>.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 rounded-2xl border-2 border-purple-100 bg-purple-50 p-6 md:grid-cols-2">
        <div className="space-y-2">
          <div className="flex justify-between font-bold text-purple-800">
            <span>Número inicial:</span>
            <span className="text-2xl text-pink-600">{a}</span>
          </div>
          <input
            type="range"
            min={min}
            max={max}
            value={a}
            onChange={(e) => setA(Number(e.target.value))}
            className="h-3 w-full cursor-pointer appearance-none rounded-lg bg-purple-200 accent-purple-600"
          />
        </div>
        <div className="space-y-2">
          <div className="flex justify-between font-bold text-purple-800">
            <span>Cuánto se mueve:</span>
            <span className="text-2xl text-blue-600">{b}</span>
          </div>
          <input
            type="range"
            min={0}
            max={max - min}
            value={b}
            onChange={(e) => setB(Number(e.target.value))}
            className="h-3 w-full cursor-pointer appearance-none rounded-lg bg-purple-200 accent-blue-600"
          />
        </div>
      </div>

      <div className="flex justify-center gap-3">
        {(["+", "-"] as const).map((o) => (
          <button
            key={o}
            type="button"
            aria-pressed={op === o}
            aria-label={o === "+" ? "Sumar" : "Restar"}
            onClick={() => setOp(o)}
            className={`rounded-xl border-2 px-5 py-2 text-xl font-bold transition-colors ${
              op === o ? "border-purple-700 bg-purple-600 text-white" : "border-purple-200 bg-white text-purple-700 hover:bg-purple-100"
            }`}
          >
            {o}
          </button>
        ))}
      </div>

      <div className="rounded-2xl bg-gradient-to-r from-purple-600 to-pink-500 px-6 py-4 text-center text-white shadow-lg">
        <div className="text-3xl font-extrabold sm:text-4xl">
          {a} {op} {b} = <span className="text-yellow-300">{result}</span>
        </div>
      </div>

      <div className="relative h-20 rounded-2xl border-2 border-slate-200 bg-slate-50 px-6 pt-8">
        <div className="absolute left-6 right-6 top-1/2 h-0.5 -translate-y-1/2 bg-slate-300" />
        <span className="absolute left-6 top-2 text-xs text-slate-600">{min}</span>
        <span className="absolute right-6 top-2 text-xs text-slate-600">{max}</span>
        <div
          className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-purple-600"
          style={{ left: `calc(1.5rem + (100% - 3rem) * ${(a - min) / (max - min)})` }}
          title="inicio"
        />
        <div
          className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-pink-500"
          style={{ left: `calc(1.5rem + (100% - 3rem) * ${(clamped - min) / (max - min)})` }}
          title="resultado"
        />
      </div>
      <p className="text-center text-xs text-slate-500">
        <span className="mr-1 inline-block h-2 w-2 rounded-full bg-purple-600" /> dónde empiezas ·{" "}
        <span className="mx-1 inline-block h-2 w-2 rounded-full bg-pink-500" /> dónde terminas
      </p>
    </div>
  );
}
