"use client";

import { useState } from "react";

const THEMES = ["🍎", "⭐", "🚀", "🐱", "🍕"];

export function ConceptoTab() {
  const [f1, setF1] = useState(3);
  const [f2, setF2] = useState(4);
  const [theme, setTheme] = useState(THEMES[0]);

  const result = f1 * f2;
  const additionText = Array(f1).fill(f2).join(" + ");

  return (
    <div className="space-y-6">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-2xl font-bold text-purple-800 sm:text-3xl">¿Qué es multiplicar? 🤔</h2>
        <p className="mt-1 text-slate-600">
          Multiplicar es solo <strong>sumar el mismo número varias veces</strong>. ¡Usa las barras para ver la magia!
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 rounded-2xl border-2 border-purple-100 bg-purple-50 p-6 md:grid-cols-2">
        <div className="space-y-2">
          <div className="flex justify-between font-bold text-purple-800">
            <span>Grupos (filas):</span>
            <span className="text-2xl text-pink-600">{f1}</span>
          </div>
          <input
            type="range"
            min={1}
            max={10}
            value={f1}
            onChange={(e) => setF1(Number(e.target.value))}
            className="h-3 w-full cursor-pointer appearance-none rounded-lg bg-purple-200 accent-purple-600"
          />
        </div>
        <div className="space-y-2">
          <div className="flex justify-between font-bold text-purple-800">
            <span>Objetos por grupo (columnas):</span>
            <span className="text-2xl text-blue-600">{f2}</span>
          </div>
          <input
            type="range"
            min={1}
            max={10}
            value={f2}
            onChange={(e) => setF2(Number(e.target.value))}
            className="h-3 w-full cursor-pointer appearance-none rounded-lg bg-purple-200 accent-blue-600"
          />
        </div>
      </div>

      <div className="flex items-center justify-center gap-3">
        <span className="text-sm font-bold text-slate-500">Cambiar objeto:</span>
        <div className="flex gap-2">
          {THEMES.map((icon) => (
            <button
              key={icon}
              type="button"
              aria-pressed={theme === icon}
              aria-label={`Usar ${icon} como objeto`}
              onClick={() => setTheme(icon)}
              className={`rounded-xl border-2 p-2 text-xl transition-colors ${
                theme === icon ? "border-purple-500 bg-purple-200" : "border-purple-200 hover:bg-purple-100"
              }`}
            >
              {icon}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-2xl bg-gradient-to-r from-purple-600 to-pink-500 px-6 py-4 text-center text-white shadow-lg">
        <div className="text-3xl font-extrabold tracking-wide sm:text-4xl">
          {f1} × {f2} = <span className="text-yellow-300 underline decoration-wavy">{result}</span>
        </div>
        <div className="mt-2 text-sm font-medium text-purple-100 sm:text-base">
          Es decir: {additionText} = {result}
        </div>
      </div>

      <div className="flex min-h-[220px] flex-col items-center justify-center rounded-2xl border-2 border-slate-200 bg-slate-50 p-6">
        <div className="flex w-full flex-col items-center justify-center gap-3 overflow-x-auto p-2">
          {Array.from({ length: f1 }, (_, i) => (
            <div
              key={i}
              className="flex items-center gap-2 rounded-xl border border-purple-200 bg-white px-3 py-2 shadow-sm"
            >
              <span className="mr-1 text-xs font-bold text-purple-600">G{i + 1}</span>
              {Array.from({ length: f2 }, (_, j) => (
                <span key={j} className="inline-block text-2xl sm:text-3xl">
                  {theme}
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-start gap-3 rounded-2xl border-2 border-amber-200 bg-amber-50 p-4">
        <span className="text-2xl">💡</span>
        <p className="text-sm text-amber-900">
          <strong>Truco de magia:</strong> si cambias los números de orden ({f2} × {f1}), ¡el resultado sigue
          siendo exactamente el mismo! Esto se llama <em>propiedad conmutativa</em>.
        </p>
      </div>
    </div>
  );
}
