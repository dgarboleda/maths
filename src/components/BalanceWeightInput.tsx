"use client";

import { useRef, useState } from "react";

/**
 * Balanza: hay que poner en el platillo izquierdo el peso que la equilibra.
 * Cada peso es un botón, así que vale arrastrarlo hasta el hueco, tocarlo o
 * activarlo con el teclado — el arrastre ya no es la única vía (WCAG 2.1.1 y
 * 2.5.7).
 */
export function BalanceWeightInput({
  leftFixed,
  rightFixed,
  weights,
  onAnswer,
}: {
  leftFixed: number;
  rightFixed: number;
  weights: number[];
  onAnswer: (chosen: number) => void;
}) {
  const [chosen, setChosen] = useState<number | null>(null);
  const [dragValue, setDragValue] = useState<number | null>(null);
  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null);
  const slotRef = useRef<HTMLDivElement>(null);
  const answeredRef = useRef(false);

  const diff = chosen === null ? 0 : rightFixed - (leftFixed + chosen);
  const angle = Math.max(-12, Math.min(12, diff * 6));

  function choose(value: number) {
    if (answeredRef.current) return;
    answeredRef.current = true;
    setChosen(value);
    onAnswer(value);
  }

  return (
    <div
      className="flex w-full flex-col items-center gap-6 py-4"
      onPointerMove={(e) => {
        if (dragValue !== null) setDragPos({ x: e.clientX, y: e.clientY });
      }}
      onPointerUp={(e) => {
        if (dragValue === null) return;
        const rect = slotRef.current?.getBoundingClientRect();
        if (
          rect &&
          e.clientX >= rect.left &&
          e.clientX <= rect.right &&
          e.clientY >= rect.top &&
          e.clientY <= rect.bottom
        ) {
          choose(dragValue);
        }
        setDragValue(null);
        setDragPos(null);
      }}
    >
      <svg
        aria-hidden="true"
        width="220"
        height="24"
        style={{ transform: `rotate(${angle}deg)`, transformOrigin: "110px 12px", transition: "transform 0.25s ease" }}
      >
        <line x1="0" y1="12" x2="220" y2="12" stroke="#a3a3a3" strokeWidth="3" strokeLinecap="round" />
        <circle cx="110" cy="12" r="4" fill="#737373" />
      </svg>
      <div className="flex w-full max-w-xs justify-between">
        <div className="flex min-h-16 w-28 items-end justify-center gap-2 rounded-b-lg border border-t-0 border-neutral-400 pb-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-900 text-sm font-semibold text-white">
            {leftFixed}
          </div>
          <div
            ref={slotRef}
            aria-label={chosen === null ? "Hueco vacío del platillo izquierdo" : `Hueco con el peso ${chosen}`}
            className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-dashed border-neutral-500 text-sm font-semibold text-neutral-900"
          >
            {chosen ?? ""}
          </div>
        </div>
        <div className="flex min-h-16 w-28 items-end justify-center rounded-b-lg border border-t-0 border-neutral-400 pb-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-900 text-sm font-semibold text-white">
            {rightFixed}
          </div>
        </div>
      </div>
      <p className="text-sm text-slate-700">Elige el peso que equilibra la balanza:</p>
      <div className="flex gap-3">
        {weights.map((w) => (
          <button
            key={w}
            type="button"
            aria-label={`Peso ${w}`}
            disabled={chosen !== null}
            onClick={() => choose(w)}
            onPointerDown={(e) => {
              if (answeredRef.current) return;
              (e.currentTarget as Element).setPointerCapture(e.pointerId);
              setDragValue(w);
              setDragPos({ x: e.clientX, y: e.clientY });
            }}
            className="flex h-9 w-9 touch-none items-center justify-center rounded-full border border-neutral-400 text-sm font-semibold text-neutral-900 disabled:opacity-40"
            style={
              dragValue === w && dragPos
                ? { position: "fixed", left: dragPos.x - 18, top: dragPos.y - 18, zIndex: 50 }
                : undefined
            }
          >
            {w}
          </button>
        ))}
      </div>
    </div>
  );
}
