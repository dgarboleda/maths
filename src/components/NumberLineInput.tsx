"use client";

import { useRef, useState } from "react";

export function NumberLineInput({
  min,
  max,
  start,
  onAnswer,
  disabled,
}: {
  min: number;
  max: number;
  start: number;
  onAnswer: (value: number) => void;
  disabled?: boolean;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [value, setValue] = useState(start);
  const [dragging, setDragging] = useState(false);
  const answeredRef = useRef(false);

  const majorStep = Math.max(1, Math.round((max - min) / 10));
  const ticks = Array.from({ length: max - min + 1 }, (_, i) => min + i);

  function valueFromClientX(clientX: number): number {
    const rect = trackRef.current!.getBoundingClientRect();
    const pct = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    return Math.round(min + pct * (max - min));
  }

  return (
    <div className="w-full px-3 py-6">
      <div ref={trackRef} className="relative h-12">
        <div className="absolute left-0 right-0 top-1/2 h-0.5 -translate-y-1/2 bg-neutral-300" />
        {ticks
          .filter((n) => (n - min) % majorStep === 0)
          .map((n) => (
            <div
              key={n}
              className="absolute top-6 -translate-x-1/2 text-xs text-neutral-400"
              style={{ left: `${((n - min) / (max - min)) * 100}%` }}
            >
              {n}
            </div>
          ))}
        <div
          onPointerDown={(e) => {
            if (disabled || answeredRef.current) return;
            (e.currentTarget as Element).setPointerCapture(e.pointerId);
            setDragging(true);
          }}
          onPointerMove={(e) => {
            if (!dragging) return;
            setValue(valueFromClientX(e.clientX));
          }}
          onPointerUp={(e) => {
            if (!dragging || answeredRef.current) return;
            setDragging(false);
            const v = valueFromClientX(e.clientX);
            setValue(v);
            answeredRef.current = true;
            onAnswer(v);
          }}
          className="absolute top-0 h-8 w-8 -translate-x-1/2 touch-none rounded-full bg-neutral-900 active:cursor-grabbing"
          style={{ left: `${((value - min) / (max - min)) * 100}%` }}
        />
      </div>
    </div>
  );
}
