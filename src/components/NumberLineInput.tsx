"use client";

import { useRef, useState, type KeyboardEvent } from "react";

/**
 * Recta numérica. El punto se puede arrastrar, tocar en cualquier parte de la
 * recta o mover con el teclado (flechas, Inicio/Fin, RePág/AvPág), y la
 * respuesta se envía con el botón "Responder". Antes solo respondía al soltar
 * un arrastre: sin teclado no había forma de contestar (WCAG 2.1.1) y el
 * arrastre era el único gesto posible (WCAG 2.5.7).
 */
export function NumberLineInput({
  min,
  max,
  start,
  onAnswer,
  disabled,
  label = "Elige un número en la recta",
  labelledBy,
}: {
  min: number;
  max: number;
  start: number;
  onAnswer: (value: number) => void;
  disabled?: boolean;
  label?: string;
  /** id del enunciado, cuando la recta debe etiquetarse con él. */
  labelledBy?: string;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [value, setValue] = useState(start);
  const [dragging, setDragging] = useState(false);
  const [answered, setAnswered] = useState(false);

  const majorStep = Math.max(1, Math.round((max - min) / 10));
  const ticks = Array.from({ length: max - min + 1 }, (_, i) => min + i);
  const locked = disabled || answered;

  function valueFromClientX(clientX: number): number {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return value;
    const pct = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    return Math.round(min + pct * (max - min));
  }

  function clamp(next: number): number {
    return Math.min(max, Math.max(min, next));
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (locked) return;
    const bigStep = Math.max(1, Math.round((max - min) / 10));
    let next: number | null = null;
    if (event.key === "ArrowRight" || event.key === "ArrowUp") next = clamp(value + 1);
    else if (event.key === "ArrowLeft" || event.key === "ArrowDown") next = clamp(value - 1);
    else if (event.key === "PageUp") next = clamp(value + bigStep);
    else if (event.key === "PageDown") next = clamp(value - bigStep);
    else if (event.key === "Home") next = min;
    else if (event.key === "End") next = max;
    else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      submit();
      return;
    }
    if (next === null) return;
    event.preventDefault();
    setValue(next);
  }

  function submit() {
    if (locked) return;
    setAnswered(true);
    onAnswer(value);
  }

  return (
    <div className="flex w-full flex-col items-center gap-4 px-3 py-6">
      <div
        ref={trackRef}
        className="relative h-12 w-full"
        onPointerDown={(event) => {
          if (locked) return;
          setValue(valueFromClientX(event.clientX));
        }}
      >
        <div className="absolute left-0 right-0 top-1/2 h-0.5 -translate-y-1/2 bg-neutral-400" />
        {ticks
          .filter((n) => (n - min) % majorStep === 0)
          .map((n) => (
            <div
              key={n}
              aria-hidden="true"
              className="absolute top-6 -translate-x-1/2 text-xs text-neutral-600"
              style={{ left: `${((n - min) / (max - min)) * 100}%` }}
            >
              {n}
            </div>
          ))}
        <div
          role="slider"
          tabIndex={locked ? -1 : 0}
          aria-label={labelledBy ? undefined : label}
          aria-labelledby={labelledBy}
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={value}
          aria-disabled={locked || undefined}
          onKeyDown={handleKeyDown}
          onPointerDown={(event) => {
            if (locked) return;
            (event.currentTarget as Element).setPointerCapture(event.pointerId);
            setDragging(true);
          }}
          onPointerMove={(event) => {
            if (!dragging || locked) return;
            setValue(valueFromClientX(event.clientX));
          }}
          onPointerUp={(event) => {
            if (!dragging) return;
            setDragging(false);
            setValue(valueFromClientX(event.clientX));
          }}
          className="absolute top-0 h-8 w-8 -translate-x-1/2 touch-none rounded-full bg-purple-700 active:cursor-grabbing"
          style={{ left: `${((value - min) / (max - min)) * 100}%` }}
        />
      </div>
      <p className="text-sm font-bold text-purple-900" aria-hidden="true">
        {value}
      </p>
      <button
        type="button"
        onClick={submit}
        disabled={locked}
        className="rounded-2xl bg-purple-600 px-6 py-2 font-bold text-white shadow-md disabled:opacity-40"
      >
        Responder
      </button>
    </div>
  );
}
