"use client";

import { useState } from "react";
import { gcd, lcm } from "@/lib/aritmeticaMcdMcm";
import { MiniSlider, Formula } from "./shared";

function divisors(n: number): number[] {
  const result: number[] = [];
  for (let i = 1; i <= n; i++) if (n % i === 0) result.push(i);
  return result;
}

function multiples(n: number, count: number): number[] {
  return Array.from({ length: count }, (_, i) => n * (i + 1));
}

export function McdMcmConcept() {
  const [a, setA] = useState(8);
  const [b, setB] = useState(12);
  const divA = divisors(a);
  const divB = divisors(b);
  const commonDivisors = divA.filter((d) => divB.includes(d));
  const theGcd = gcd(a, b);

  const multA = multiples(a, 4);
  const multB = multiples(b, 4);
  const theLcm = lcm(a, b);

  return (
    <div className="space-y-6 text-center">
      <h2 className="text-2xl font-bold text-purple-800 sm:text-3xl">MCD y MCM 🔢</h2>
      <p className="text-slate-600">
        El <strong>máximo común divisor (MCD)</strong> es el número más grande que divide a los dos a la vez. El{" "}
        <strong>mínimo común múltiplo (MCM)</strong> es el número más chico que aparece en la tabla de los dos.
      </p>

      <div className="grid grid-cols-1 gap-6 rounded-2xl border-2 border-purple-100 bg-purple-50 p-6 text-left md:grid-cols-2">
        <MiniSlider label="Primer número" value={a} setValue={setA} min={2} max={30} />
        <MiniSlider label="Segundo número" value={b} setValue={setB} min={2} max={30} />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-2xl border-2 border-slate-200 bg-slate-50 p-4 text-left">
          <p className="mb-2 text-sm font-bold text-purple-800">Divisores de {a} y {b}</p>
          <p className="text-sm text-slate-600">
            {a}: {divA.join(", ")}
            <br />
            {b}: {divB.join(", ")}
          </p>
          <p className="mt-2 text-sm text-slate-700">
            Comunes: <strong>{commonDivisors.join(", ")}</strong>
          </p>
        </div>
        <div className="rounded-2xl border-2 border-slate-200 bg-slate-50 p-4 text-left">
          <p className="mb-2 text-sm font-bold text-purple-800">Múltiplos de {a} y {b}</p>
          <p className="text-sm text-slate-600">
            {a}: {multA.join(", ")}…
            <br />
            {b}: {multB.join(", ")}…
          </p>
        </div>
      </div>

      <Formula text={`MCD(${a}, ${b}) = ${theGcd}   ·   MCM(${a}, ${b}) = ${theLcm}`} />
    </div>
  );
}
