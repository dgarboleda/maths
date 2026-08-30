"use client";

import { useState } from "react";
import { playSound } from "@/lib/gameSound";

/**
 * Tabla 10 × 10. Las cabeceras son `<th scope>` y cada casilla es un botón,
 * así que la tabla se puede recorrer y activar con el teclado — antes el
 * `onClick` colgaba de un `<td>`, invisible para teclado y lectores.
 */
export function TablaTab({ soundOn }: { soundOn: boolean }) {
  const [selected, setSelected] = useState<{ r: number; c: number } | null>(null);
  const numbers = Array.from({ length: 10 }, (_, i) => i + 1);

  return (
    <div className="space-y-6">
      <div className="mx-auto max-w-xl text-center">
        <h2 className="text-2xl font-bold text-purple-800 sm:text-3xl">
          Tabla de multiplicar 10 × 10 <span aria-hidden="true">📊</span>
        </h2>
        <p className="mt-1 text-sm text-slate-700">
          Haz clic o toca cualquier casilla para ver cómo se combinan los números.
        </p>
      </div>

      <div role="status" className="rounded-2xl border-2 border-purple-200 bg-purple-50 p-4 text-center">
        {selected ? (
          <div>
            <div className="text-xl font-bold text-purple-900">
              {selected.r} × {selected.c} ={" "}
              <span className="text-2xl text-pink-700">{selected.r * selected.c}</span>
            </div>
            <div className="mt-1 text-xs text-purple-800">
              {selected.r} grupos de {selected.c} objetos = {Array(selected.r).fill(selected.c).join(" + ")}
            </div>
          </div>
        ) : (
          <span className="text-sm text-slate-700">Selecciona una casilla de la tabla</span>
        )}
      </div>

      <div className="overflow-x-auto pb-2">
        <table className="mx-auto select-none border-collapse text-center">
          <caption className="sr-only">
            Tabla de multiplicar del 1 al 10. Activa una casilla para ver el detalle de la operación.
          </caption>
          <thead>
            <tr>
              <th
                scope="col"
                className="rounded-tl-xl border border-purple-600 bg-purple-700 p-2 text-sm font-bold text-white"
              >
                <span aria-hidden="true">✖️</span>
                <span className="sr-only">Factores</span>
              </th>
              {numbers.map((c) => (
                <th
                  key={c}
                  scope="col"
                  className="border border-purple-500 bg-purple-600 p-2 text-sm font-bold text-white"
                >
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {numbers.map((r) => (
              <tr key={r}>
                <th
                  scope="row"
                  className="border border-purple-500 bg-purple-600 p-2 text-sm font-bold text-white"
                >
                  {r}
                </th>
                {numbers.map((c) => {
                  const isSquare = r === c;
                  const isSelected = selected?.r === r && selected?.c === c;
                  return (
                    <td
                      key={c}
                      className={`border p-0 ${
                        isSquare ? "border-pink-300 bg-pink-100" : "border-purple-100 bg-slate-50"
                      }`}
                    >
                      <button
                        type="button"
                        aria-pressed={isSelected}
                        aria-label={`${r} por ${c} igual a ${r * c}`}
                        onClick={() => {
                          playSound("click", soundOn);
                          setSelected({ r, c });
                        }}
                        className={`h-full w-full cursor-pointer p-2 text-sm font-semibold transition-colors hover:bg-yellow-200 ${
                          isSelected ? "bg-yellow-200" : ""
                        } ${isSquare ? "font-extrabold text-pink-900" : "text-slate-800"}`}
                      >
                        {r * c}
                      </button>
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
