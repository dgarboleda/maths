"use client";

import { useMemo, useState } from "react";
import {
  buildTargetList,
  formatCell,
  generatePyramid,
  opSymbol,
  pyramidDifficulty,
  type PyramidOp,
} from "@/lib/pyramid";
import { playSound } from "@/lib/gameSound";
import { triggerConfetti } from "@/lib/confetti";

const OPTIONS: Array<{ id: PyramidOp; label: string }> = [
  { id: "suma", label: "➕ Suma" },
  { id: "resta", label: "➖ Resta" },
  { id: "multiplicacion", label: "✖️ Multiplicación" },
  { id: "fracciones", label: "🍕 Fracciones" },
];

export function PyramidGame({
  soundOn,
  onAnswer,
}: {
  soundOn: boolean;
  onAnswer: (difficulty: number, correct: boolean) => Promise<number>;
}) {
  const [op, setOp] = useState<PyramidOp>("suma");
  const [puzzle, setPuzzle] = useState(() => generatePyramid("suma"));
  const targets = useMemo(() => buildTargetList(puzzle.rows), [puzzle]);

  const [filled, setFilled] = useState<(number | null)[][]>(() => initFilled(puzzle.rows));
  const [targetIndex, setTargetIndex] = useState(0);
  const [inputValue, setInputValue] = useState("");
  const [feedback, setFeedback] = useState<{ correct: boolean; value: number } | null>(null);
  const [starsThisRound, setStarsThisRound] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  function initFilled(rows: number[][]): (number | null)[][] {
    return rows.map((row, r) => (r === 0 ? [...row] : row.map(() => null)));
  }

  function startNew(nextOp: PyramidOp) {
    playSound("click", soundOn);
    const p = generatePyramid(nextOp);
    setOp(nextOp);
    setPuzzle(p);
    setFilled(initFilled(p.rows));
    setTargetIndex(0);
    setInputValue("");
    setFeedback(null);
    setStarsThisRound(0);
  }

  const current = targetIndex < targets.length ? targets[targetIndex] : null;
  const done = current === null;
  const trueValue = current ? puzzle.rows[current.r][current.c] : null;
  const left = current ? filled[current.r - 1][current.c] : null;
  const right = current ? filled[current.r - 1][current.c + 1] : null;

  async function submit() {
    if (!current || trueValue === null || submitting) return;
    const given = parseInt(inputValue, 10);
    if (Number.isNaN(given)) return;

    setSubmitting(true);
    const correct = given === trueValue;
    const stars = await onAnswer(pyramidDifficulty(op), correct);

    setFilled((prev) => {
      const next = prev.map((row) => [...row]);
      next[current.r][current.c] = trueValue;
      return next;
    });

    if (correct) {
      playSound("correct", soundOn);
      setStarsThisRound((s) => s + stars);
    } else {
      playSound("wrong", soundOn);
    }
    setFeedback({ correct, value: trueValue });
    setSubmitting(false);
  }

  function next() {
    const isLast = targetIndex >= targets.length - 1;
    setTargetIndex((i) => i + 1);
    setInputValue("");
    setFeedback(null);
    if (isLast) {
      playSound("fanfare", soundOn);
      triggerConfetti();
    }
  }

  return (
    <div className="space-y-6">
      <div className="mx-auto max-w-xl text-center">
        <h2 className="text-2xl font-bold text-purple-800 sm:text-3xl">Pirámide numérica 🔺</h2>
        <p className="mt-1 text-slate-600">
          Cada bloque es el resultado de combinar los dos bloques que tiene justo debajo. La base ya está
          completa — ve resolviendo hacia arriba hasta llegar a la cima.
        </p>
      </div>

      <div className="flex flex-wrap justify-center gap-2">
        {OPTIONS.map((o) => (
          <button
            key={o.id}
            onClick={() => startNew(o.id)}
            className={`rounded-xl border-2 px-4 py-2 text-sm font-bold transition-colors ${
              op === o.id ? "border-purple-700 bg-purple-600 text-white" : "border-purple-200 bg-white text-purple-700 hover:bg-purple-100"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>

      <div className="flex flex-col items-center gap-3 rounded-3xl border-2 border-purple-100 bg-purple-50 p-6">
        {puzzle.rows
          .map((row, r) => r)
          .reverse()
          .map((r) => (
            <div key={r} className="flex gap-3">
              {puzzle.rows[r].map((_, c) => {
                const value = filled[r][c];
                const isCurrent = current?.r === r && current?.c === c;
                const isSupport = current && r === current.r - 1 && (c === current.c || c === current.c + 1);
                return (
                  <div
                    key={c}
                    className={`flex h-14 w-14 items-center justify-center rounded-xl border-2 text-lg font-bold sm:h-16 sm:w-16 sm:text-xl ${
                      isCurrent
                        ? "border-pink-500 bg-white"
                        : isSupport
                          ? "border-purple-500 bg-purple-100 text-purple-900"
                          : value !== null
                            ? "border-purple-200 bg-white text-purple-900"
                            : "border-dashed border-slate-300 bg-white text-slate-300"
                    }`}
                  >
                    {value !== null ? formatCell(value, op, puzzle.denominator) : isCurrent ? "?" : ""}
                  </div>
                );
              })}
            </div>
          ))}
      </div>

      {puzzle.op === "fracciones" && (
        <p className="text-center text-xs text-slate-500">
          Todos los números son numeradores sobre el mismo denominador: /{puzzle.denominator}
        </p>
      )}

      <div className="mx-auto max-w-md space-y-4 text-center">
        {done ? (
          <div className="space-y-2 rounded-2xl border-2 border-green-400 bg-green-100 p-6 text-green-900">
            <div className="text-3xl">🏆 ¡Pirámide completa!</div>
            <p className="font-bold">Ganaste {starsThisRound} ★ en esta ronda.</p>
            <button onClick={() => startNew(op)} className="mt-2 rounded-xl bg-green-600 px-6 py-2 font-bold text-white">
              Nueva pirámide
            </button>
          </div>
        ) : (
          <>
            <p className="text-xl font-bold text-purple-900">
              ¿Cuánto es {left !== null ? formatCell(left, op, puzzle.denominator) : "?"} {opSymbol(op)}{" "}
              {right !== null ? formatCell(right, op, puzzle.denominator) : "?"}?
            </p>
            {!feedback && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  submit();
                }}
                className="flex flex-col items-center gap-3"
              >
                <input
                  type="text"
                  inputMode={op === "resta" ? "text" : "numeric"}
                  autoFocus
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value.replace(/[^0-9-]/g, ""))}
                  className="w-28 rounded-xl border-2 border-purple-300 px-3 py-2 text-center text-xl outline-none focus:border-purple-500"
                />
                <button
                  type="submit"
                  disabled={submitting || inputValue.trim() === ""}
                  className="rounded-2xl bg-purple-600 px-6 py-2 font-bold text-white disabled:opacity-40"
                >
                  Comprobar
                </button>
              </form>
            )}
            {feedback && (
              <div className="space-y-3">
                {feedback.correct ? (
                  <p className="text-lg font-bold text-emerald-600">¡Correcto! 🎉</p>
                ) : (
                  <p className="text-lg font-bold text-slate-600">
                    Casi — era {formatCell(feedback.value, op, puzzle.denominator)}
                  </p>
                )}
                <button onClick={next} className="rounded-2xl bg-purple-600 px-6 py-2 font-bold text-white">
                  Siguiente
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
