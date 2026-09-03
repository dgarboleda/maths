"use client";

import { useId, useState } from "react";

const SYMBOLS = ["●", "■", "▲"];

export function PatternConcept() {
  const [unitLength, setUnitLength] = useState(2);
  const [visibleCount, setVisibleCount] = useState(6);
  const tamanoId = useId();
  const unit = Array.from({ length: unitLength }, (_, i) => i % SYMBOLS.length);
  const sequence = Array.from({ length: visibleCount }, (_, i) => unit[i % unitLength]);
  const next = unit[visibleCount % unitLength];

  return (
    <div className="space-y-6">
      <div className="mx-auto max-w-xl text-center">
        <h2 className="text-2xl font-bold text-purple-800 sm:text-3xl">Patrones que se repiten 🔁</h2>
        <p className="mt-1 text-slate-600">
          Un patrón tiene una <strong>unidad</strong> (un grupito de figuras) que se repite exacta una y otra vez.
          Para saber qué sigue, encuentra dónde empieza la unidad y continúa contando desde ahí.
        </p>
      </div>

      <div className="space-y-2 rounded-2xl border-2 border-purple-100 bg-purple-50 p-6">
        <div className="flex justify-between font-bold text-purple-800">
          <label htmlFor={tamanoId}>Tamaño del patrón:</label>
          <span className="text-2xl text-pink-600">{unitLength}</span>
        </div>
        <input
          id={tamanoId}
          type="range"
          min={2}
          max={3}
          value={unitLength}
          onChange={(e) => {
            setUnitLength(Number(e.target.value));
            setVisibleCount(6);
          }}
          className="h-3 w-full cursor-pointer appearance-none rounded-lg bg-purple-200 accent-purple-600"
        />
      </div>

      <div className="rounded-2xl border-2 border-slate-200 bg-slate-50 p-6 text-center">
        {/* flex-wrap, no texto en línea: las figuras van pegadas sin espacio
            entre sí (el espaciado es margin, no un carácter de espacio), así
            que el navegador no tiene dónde partir la línea y, sin flex-wrap,
            la secuencia se sale del recuadro (y hasta de la pantalla) apenas
            "Agregar uno más" la alarga lo suficiente. */}
        <div className="flex flex-wrap items-center justify-center gap-1 text-4xl">
          {sequence.map((s, i) => (
            <span key={i}>{SYMBOLS[s]}</span>
          ))}
          <span className="mx-1 text-purple-600">→</span>
          <span className="text-pink-500">{SYMBOLS[next]}</span>
        </div>
        <button
          type="button"
          onClick={() => setVisibleCount((v) => v + 1)}
          className="mt-4 rounded-xl bg-purple-600 px-5 py-2 font-bold text-white"
        >
          Agregar uno más
        </button>
      </div>
    </div>
  );
}
