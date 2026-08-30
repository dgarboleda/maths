"use client";

import { useId } from "react";

export function MiniSlider({
  label,
  value,
  setValue,
  min = 1,
  max,
}: {
  label: string;
  value: number;
  setValue: (n: number) => void;
  min?: number;
  max: number;
}) {
  // El texto de arriba es la etiqueta del control: sin `htmlFor` el
  // deslizador se anunciaba sin nombre (axe: regla "label", crítica).
  const id = useId();
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm font-bold text-purple-800">
        <label htmlFor={id}>{label}:</label>
        <span className="text-pink-700">{value}</span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => setValue(Number(e.target.value))}
        className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-purple-200 accent-purple-600"
      />
    </div>
  );
}

export function SliderPair({
  labelA,
  a,
  setA,
  labelB,
  b,
  setB,
  maxA,
  maxB,
}: {
  labelA: string;
  a: number;
  setA: (n: number) => void;
  labelB: string;
  b: number;
  setB: (n: number) => void;
  maxA: number;
  maxB: number;
}) {
  return (
    <div className="grid grid-cols-1 gap-6 rounded-2xl border-2 border-purple-100 bg-purple-50 p-6 text-left md:grid-cols-2">
      <MiniSlider label={labelA} value={a} setValue={setA} max={maxA} />
      <MiniSlider label={labelB} value={b} setValue={setB} max={maxB} />
    </div>
  );
}

export function Formula({ text }: { text: string }) {
  return (
    <div className="rounded-2xl bg-gradient-to-r from-purple-600 to-pink-500 px-6 py-4 text-center text-white shadow-lg">
      <div className="text-2xl font-extrabold sm:text-3xl">{text}</div>
    </div>
  );
}
