"use client";

import { useState } from "react";
import { MiniSlider, SliderPair, Formula } from "./shared";

export type DataVariant = "money" | "clock" | "convert" | "stats" | "probability" | "counting";

function DataMoney() {
  const [c5, setC5] = useState(2);
  const [c10, setC10] = useState(3);
  const total = c5 * 5 + c10 * 10;
  return (
    <div className="space-y-6 text-center">
      <h2 className="text-2xl font-bold text-purple-800 sm:text-3xl">Contar dinero 💰</h2>
      <p className="text-slate-600">Para contar dinero, suma el valor de cada moneda o billete que tienes — no cuántas monedas son, sino cuánto valen juntas.</p>
      <SliderPair labelA="Monedas de 5" a={c5} setA={setC5} labelB="Monedas de 10" b={c10} setB={setC10} maxA={10} maxB={10} />
      <div className="flex flex-wrap justify-center gap-2">
        {Array.from({ length: c5 }).map((_, i) => (
          <span key={`a${i}`} className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-300 font-bold text-amber-900">
            5
          </span>
        ))}
        {Array.from({ length: c10 }).map((_, i) => (
          <span key={`b${i}`} className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500 font-bold text-amber-950">
            10
          </span>
        ))}
      </div>
      <Formula text={`Total = ${total}`} />
    </div>
  );
}

function DataClock() {
  const [hour, setHour] = useState(3);
  const [add, setAdd] = useState(4);
  let final = (hour + add) % 12;
  if (final === 0) final = 12;
  const angle = (final % 12) * 30;
  return (
    <div className="space-y-6 text-center">
      <h2 className="text-2xl font-bold text-purple-800 sm:text-3xl">Leer la hora ⏰</h2>
      <p className="text-slate-600">
        Un reloj solo tiene 12 horas. Si al sumar te pasas de 12, vuelves a empezar a contar desde la 1 — como dar
        una vuelta completa.
      </p>
      <SliderPair labelA="Hora inicial" a={hour} setA={setHour} labelB="Horas que pasan" b={add} setB={setAdd} maxA={12} maxB={11} />
      <svg aria-hidden="true" viewBox="0 0 100 100" className="mx-auto h-32 w-32">
        <circle cx="50" cy="50" r="45" fill="white" stroke="#7C3AED" strokeWidth="3" />
        <line
          x1="50"
          y1="50"
          x2={50 + 30 * Math.sin((angle * Math.PI) / 180)}
          y2={50 - 30 * Math.cos((angle * Math.PI) / 180)}
          stroke="#DB2777"
          strokeWidth="4"
        />
      </svg>
      <Formula text={`${hour} + ${add} horas = las ${final}`} />
    </div>
  );
}

function DataConvert() {
  const pairs: Array<[string, string, number]> = [
    ["metros", "centímetros", 100],
    ["kilogramos", "gramos", 1000],
    ["litros", "mililitros", 1000],
  ];
  const [idx, setIdx] = useState(0);
  const [amount, setAmount] = useState(3);
  const [from, to, factor] = pairs[idx];
  return (
    <div className="space-y-6 text-center">
      <h2 className="text-2xl font-bold text-purple-800 sm:text-3xl">Convertir unidades 📏</h2>
      <p className="text-slate-600">
        Convertir es decir la misma cantidad con una unidad distinta. Como la unidad nueva es más chica, multiplicas
        por el factor de conversión (por ejemplo, 1 metro son 100 centímetros).
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        {pairs.map((p, i) => (
          <button
            key={p[0]}
            type="button"
            aria-pressed={i === idx}
            onClick={() => setIdx(i)}
            className={`rounded-xl border-2 px-3 py-1.5 text-sm font-bold ${
              i === idx ? "border-purple-700 bg-purple-600 text-white" : "border-purple-200 bg-white text-purple-700"
            }`}
          >
            {p[0]} → {p[1]}
          </button>
        ))}
      </div>
      <div className="mx-auto max-w-xs rounded-2xl border-2 border-purple-100 bg-purple-50 p-6">
        <MiniSlider label={`Cantidad en ${from}`} value={amount} setValue={setAmount} max={10} />
      </div>
      <Formula text={`${amount} ${from} = ${amount * factor} ${to}`} />
    </div>
  );
}

function DataStats() {
  const [values, setValues] = useState([4, 6, 8, 6, 10]);
  function setAt(i: number, v: number) {
    setValues((arr) => arr.map((x, j) => (j === i ? v : x)));
  }
  const sorted = [...values].sort((a, b) => a - b);
  const mean = (values.reduce((s, v) => s + v, 0) / values.length).toFixed(1);
  const median = sorted[Math.floor(sorted.length / 2)];
  const counts: Record<number, number> = {};
  values.forEach((v) => (counts[v] = (counts[v] || 0) + 1));
  const mode = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
  const range = Math.max(...values) - Math.min(...values);
  return (
    <div className="space-y-6 text-center">
      <h2 className="text-2xl font-bold text-purple-800 sm:text-3xl">Media, mediana, moda y rango 📊</h2>
      <p className="text-slate-600">
        <strong>Media</strong>: suma todos los datos y divide entre cuántos hay (el promedio). <strong>Mediana</strong>:
        el valor que queda justo en medio al ordenarlos. <strong>Moda</strong>: el valor que más se repite.{" "}
        <strong>Rango</strong>: la diferencia entre el mayor y el menor.
      </p>
      <div className="grid grid-cols-2 gap-3 rounded-2xl border-2 border-purple-100 bg-purple-50 p-6 sm:grid-cols-5">
        {values.map((v, i) => (
          <MiniSlider key={i} label={`Dato ${i + 1}`} value={v} setValue={(n) => setAt(i, n)} min={1} max={20} />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl bg-purple-600 p-3 text-white">
          <div className="text-xs">Media</div>
          <div className="text-xl font-bold">{mean}</div>
        </div>
        <div className="rounded-xl bg-purple-600 p-3 text-white">
          <div className="text-xs">Mediana</div>
          <div className="text-xl font-bold">{median}</div>
        </div>
        <div className="rounded-xl bg-purple-600 p-3 text-white">
          <div className="text-xs">Moda</div>
          <div className="text-xl font-bold">{mode}</div>
        </div>
        <div className="rounded-xl bg-purple-600 p-3 text-white">
          <div className="text-xs">Rango</div>
          <div className="text-xl font-bold">{range}</div>
        </div>
      </div>
    </div>
  );
}

function DataProbability() {
  const [red, setRed] = useState(3);
  const [total, setTotal] = useState(5);
  const pct = Math.round((Math.min(red, total) / total) * 100);
  return (
    <div className="space-y-6 text-center">
      <h2 className="text-2xl font-bold text-purple-800 sm:text-3xl">Probabilidad con bolas 🎲</h2>
      <p className="text-slate-600">
        La probabilidad mide qué tan seguro es que pase algo: se calcula dividiendo los casos que te interesan
        (bolas rojas) entre el total de casos posibles.
      </p>
      <div className="grid grid-cols-1 gap-4 rounded-2xl border-2 border-purple-100 bg-purple-50 p-6 text-left md:grid-cols-2">
        <MiniSlider label="Bolas rojas" value={red} setValue={setRed} max={total} />
        <MiniSlider
          label="Bolas en total"
          value={total}
          setValue={(v) => {
            setTotal(v);
            setRed((r) => Math.min(r, v));
          }}
          min={2}
          max={10}
        />
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        {Array.from({ length: total }).map((_, i) => (
          <span key={i} className={`h-8 w-8 rounded-full ${i < red ? "bg-red-500" : "bg-slate-300"}`} />
        ))}
      </div>
      <Formula text={`Probabilidad de roja = ${red}/${total} = ${pct}%`} />
    </div>
  );
}

function DataCounting() {
  const [a, setA] = useState(3);
  const [b, setB] = useState(4);
  return (
    <div className="space-y-6 text-center">
      <h2 className="text-2xl font-bold text-purple-800 sm:text-3xl">Contar combinaciones 🧮</h2>
      <p className="text-slate-600">
        Si tienes A opciones para una cosa y B opciones para otra, puedes combinarlas de A × B formas distintas —
        por cada camiseta puedes elegir cualquiera de los pantalones.
      </p>
      <SliderPair labelA="Camisetas" a={a} setA={setA} labelB="Pantalones" b={b} setB={setB} maxA={6} maxB={6} />
      <div className="mx-auto grid max-w-md gap-1" style={{ gridTemplateColumns: `repeat(${b},minmax(0,1fr))` }}>
        {Array.from({ length: a * b }).map((_, i) => (
          <span key={i} className="text-lg">
            👕
          </span>
        ))}
      </div>
      <Formula text={`${a} × ${b} = ${a * b} combinaciones`} />
    </div>
  );
}

export function DataConcept({ variant }: { variant: DataVariant }) {
  switch (variant) {
    case "money":
      return <DataMoney />;
    case "clock":
      return <DataClock />;
    case "convert":
      return <DataConvert />;
    case "stats":
      return <DataStats />;
    case "probability":
      return <DataProbability />;
    case "counting":
      return <DataCounting />;
  }
}
