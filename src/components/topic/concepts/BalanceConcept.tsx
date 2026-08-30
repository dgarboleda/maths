"use client";

import { useId, useState } from "react";

export function BalanceConcept() {
  const [left, setLeft] = useState(3);
  const [right, setRight] = useState(9);
  const izquierdaId = useId();
  const derechaId = useId();
  const x = right - left;

  return (
    <div className="space-y-6">
      <div className="mx-auto max-w-xl text-center">
        <h2 className="text-2xl font-bold text-purple-800 sm:text-3xl">La balanza de las ecuaciones ⚖️</h2>
        <p className="mt-1 text-slate-600">
          Una ecuación es como una balanza: lo que hay a cada lado del signo <strong>=</strong> debe pesar
          exactamente igual. Cuando un lado tiene una incógnita (x), buscamos el valor que hace que ambos lados
          queden equilibrados.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 rounded-2xl border-2 border-purple-100 bg-purple-50 p-6 md:grid-cols-2">
        <div className="space-y-2">
          <div className="flex justify-between font-bold text-purple-800">
            <label htmlFor={izquierdaId}>Lado izquierdo:</label>
            <span className="text-2xl text-pink-600">{left}</span>
          </div>
          <input
            id={izquierdaId}
            type="range"
            min={1}
            max={10}
            value={left}
            onChange={(e) => setLeft(Number(e.target.value))}
            className="h-3 w-full cursor-pointer appearance-none rounded-lg bg-purple-200 accent-purple-600"
          />
        </div>
        <div className="space-y-2">
          <div className="flex justify-between font-bold text-purple-800">
            <label htmlFor={derechaId}>Lado derecho:</label>
            <span className="text-2xl text-blue-600">{right}</span>
          </div>
          <input
            id={derechaId}
            type="range"
            min={1}
            max={20}
            value={right}
            onChange={(e) => setRight(Number(e.target.value))}
            className="h-3 w-full cursor-pointer appearance-none rounded-lg bg-purple-200 accent-blue-600"
          />
        </div>
      </div>

      <div className="rounded-2xl bg-gradient-to-r from-purple-600 to-pink-500 px-6 py-4 text-center text-white shadow-lg">
        <div className="text-3xl font-extrabold sm:text-4xl">
          {left} + x = {right}
        </div>
        <div className="mt-2 text-sm text-purple-100">
          Entonces x = {x}
          {x < 0 ? " (el lado derecho debe ser mayor para que dé positivo)" : ""}
        </div>
      </div>

      <div className="flex flex-col items-center gap-4 rounded-2xl border-2 border-slate-200 bg-slate-50 p-6">
        <svg aria-hidden="true" width="220" height="24">
          <line x1="0" y1="12" x2="220" y2="12" stroke="#a3a3a3" strokeWidth="3" strokeLinecap="round" />
          <circle cx="110" cy="12" r="4" fill="#737373" />
        </svg>
        <div className="flex w-full max-w-xs justify-between">
          <div className="flex h-16 flex-1 items-end justify-center gap-2 rounded-b-lg border border-t-0 border-slate-300 pb-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-900 text-sm font-semibold text-white">
              {left}
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-dashed border-purple-400 text-sm font-semibold text-purple-700">
              x
            </div>
          </div>
          <div className="flex h-16 flex-1 items-end justify-center rounded-b-lg border border-t-0 border-slate-300 pb-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-900 text-sm font-semibold text-white">
              {right}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
