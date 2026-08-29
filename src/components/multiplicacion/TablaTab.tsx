"use client";

import { useState } from "react";
import { playSound } from "@/lib/gameSound";

export function TablaTab({ soundOn }: { soundOn: boolean }) {
  const [selected, setSelected] = useState<{ r: number; c: number } | null>(null);

  return (
    <div className="space-y-6">
      <div className="mx-auto max-w-xl text-center">
        <h2 className="text-2xl font-bold text-purple-800 sm:text-3xl">Tabla de multiplicar 10 × 10 📊</h2>
        <p className="mt-1 text-sm text-slate-600">
          Haz clic o toca cualquier casilla para ver cómo se combinan los números.
        </p>
      </div>

      <div className="rounded-2xl border-2 border-purple-200 bg-purple-50 p-4 text-center">
        {selected ? (
          <div>
            <div className="text-xl font-bold text-purple-900">
              {selected.r} × {selected.c} = <span className="text-2xl text-pink-600">{selected.r * selected.c}</span>
            </div>
            <div className="mt-1 text-xs text-purple-700">
              {selected.r} grupos de {selected.c} objetos = {Array(selected.r).fill(selected.c).join(" + ")}
            </div>
          </div>
        ) : (
          <span className="text-sm text-slate-500">Selecciona una casilla de la tabla</span>
        )}
      </div>

      <div className="overflow-x-auto pb-2">
        <table className="mx-auto select-none border-collapse text-center">
          <tbody>
            <tr>
              <td className="rounded-tl-xl border border-purple-600 bg-purple-700 p-2 text-sm font-bold text-white">
                ✖️
              </td>
              {Array.from({ length: 10 }, (_, i) => i + 1).map((c) => (
                <td key={c} className="border border-purple-500 bg-purple-600 p-2 text-sm font-bold text-white">
                  {c}
                </td>
              ))}
            </tr>
            {Array.from({ length: 10 }, (_, i) => i + 1).map((r) => (
              <tr key={r}>
                <td className="border border-purple-500 bg-purple-600 p-2 text-sm font-bold text-white">{r}</td>
                {Array.from({ length: 10 }, (_, i) => i + 1).map((c) => {
                  const isSquare = r === c;
                  return (
                    <td
                      key={c}
                      onClick={() => {
                        playSound("click", soundOn);
                        setSelected({ r, c });
                      }}
                      className={`cursor-pointer border p-2 text-sm font-semibold transition-colors hover:bg-yellow-200 ${
                        isSquare
                          ? "border-pink-300 bg-pink-100 font-extrabold text-pink-900"
                          : "border-purple-100 bg-slate-50 text-slate-700"
                      }`}
                    >
                      {r * c}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
