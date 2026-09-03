"use client";

import { useState } from "react";
import { lcm } from "@/lib/aritmeticaMcdMcm";
import { MiniSlider, Formula } from "./shared";

function Bar({ denominator, filled }: { denominator: number; filled: number }) {
  return (
    <div className="flex h-10 overflow-hidden rounded-lg border-2 border-slate-300">
      {Array.from({ length: denominator }, (_, i) => (
        <div
          key={i}
          className={`flex-1 border-r border-slate-300 last:border-r-0 ${
            i < filled ? "bg-pink-400" : "bg-slate-100"
          }`}
        />
      ))}
    </div>
  );
}

export function FraccionesDistintoDenomConcept() {
  const [d1, setD1] = useState(2);
  const [n1, setN1] = useState(1);
  const [d2, setD2] = useState(3);
  const [n2, setN2] = useState(1);

  const clampedN1 = Math.min(n1, d1 - 1) || 1;
  const clampedN2 = Math.min(n2, d2 - 1) || 1;
  const common = lcm(d1, d2);
  const scaled1 = clampedN1 * (common / d1);
  const scaled2 = clampedN2 * (common / d2);
  const sum = scaled1 + scaled2;

  return (
    <div className="space-y-6 text-center">
      <h2 className="text-2xl font-bold text-purple-800 sm:text-3xl">Sumar fracciones con distinto denominador ➕</h2>
      <p className="text-slate-600">
        No se pueden sumar fracciones con denominadores distintos directamente: primero hay que convertirlas al{" "}
        <strong>mínimo común múltiplo (MCM)</strong> de los denominadores, que se convierte en el nuevo denominador
        común.
      </p>

      <div className="grid grid-cols-1 gap-6 rounded-2xl border-2 border-purple-100 bg-purple-50 p-6 text-left md:grid-cols-2">
        <div className="space-y-3">
          <MiniSlider label="Primer denominador" value={d1} setValue={setD1} min={2} max={12} />
          <MiniSlider label="Primer numerador" value={clampedN1} setValue={setN1} min={1} max={Math.max(1, d1 - 1)} />
        </div>
        <div className="space-y-3">
          <MiniSlider label="Segundo denominador" value={d2} setValue={setD2} min={2} max={12} />
          <MiniSlider label="Segundo numerador" value={clampedN2} setValue={setN2} min={1} max={Math.max(1, d2 - 1)} />
        </div>
      </div>

      <div className="space-y-3 rounded-2xl border-2 border-slate-200 bg-slate-50 p-4">
        <div className="text-left text-sm font-bold text-purple-800">
          {clampedN1}/{d1}
        </div>
        <Bar denominator={d1} filled={clampedN1} />
        <div className="text-left text-sm font-bold text-purple-800">
          {clampedN2}/{d2}
        </div>
        <Bar denominator={d2} filled={clampedN2} />
        <div className="text-left text-sm font-bold text-purple-800">
          Convertidas a /{common}: {scaled1}/{common} + {scaled2}/{common}
        </div>
        <Bar denominator={common} filled={Math.min(sum, common)} />
      </div>

      <Formula text={`${clampedN1}/${d1} + ${clampedN2}/${d2} = ${sum}/${common}`} />
    </div>
  );
}
