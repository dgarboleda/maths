"use client";

import { useRef, useState } from "react";

interface Item {
  id: number;
  zone: "pool" | "decena" | "sueltas";
}

export function GroupTensInput({
  total,
  onAnswer,
}: {
  total: number;
  onAnswer: (decenaCount: number) => void;
}) {
  const [items, setItems] = useState<Item[]>(() =>
    Array.from({ length: total }, (_, i) => ({ id: i, zone: "pool" as const })),
  );
  const [dragId, setDragId] = useState<number | null>(null);
  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const answeredRef = useRef(false);
  const decenaRef = useRef<HTMLDivElement>(null);
  const sueltasRef = useRef<HTMLDivElement>(null);

  const decenaCount = items.filter((i) => i.zone === "decena").length;

  function commit(id: number, zone: "decena" | "sueltas") {
    if (zone === "decena" && decenaCount >= 10) {
      setError("La decena ya está llena");
      return;
    }
    setError(null);
    const updated = items.map((i) => (i.id === id ? { ...i, zone } : i));
    setItems(updated);
    if (!updated.some((i) => i.zone === "pool") && !answeredRef.current) {
      answeredRef.current = true;
      onAnswer(updated.filter((i) => i.zone === "decena").length);
    }
  }

  function insideRect(el: HTMLDivElement | null, x: number, y: number): boolean {
    if (!el) return false;
    const r = el.getBoundingClientRect();
    return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
  }

  return (
    <div
      className="flex w-full flex-col gap-3"
      onPointerMove={(e) => {
        if (dragId !== null) setDragPos({ x: e.clientX, y: e.clientY });
      }}
      onPointerUp={(e) => {
        if (dragId === null) return;
        if (insideRect(decenaRef.current, e.clientX, e.clientY)) commit(dragId, "decena");
        else if (insideRect(sueltasRef.current, e.clientX, e.clientY)) commit(dragId, "sueltas");
        setDragId(null);
        setDragPos(null);
      }}
    >
      <div className="flex min-h-14 flex-wrap gap-2 rounded-lg border border-neutral-200 p-2">
        {items
          .filter((i) => i.zone === "pool")
          .map((item) => (
            <div
              key={item.id}
              onPointerDown={(e) => {
                (e.currentTarget as Element).setPointerCapture(e.pointerId);
                setDragId(item.id);
                setDragPos({ x: e.clientX, y: e.clientY });
              }}
              className="h-6 w-6 touch-none rounded-full bg-amber-400"
              style={
                dragId === item.id && dragPos
                  ? { position: "fixed", left: dragPos.x - 12, top: dragPos.y - 12, zIndex: 50 }
                  : undefined
              }
            />
          ))}
      </div>
      <div className="flex gap-3">
        <div
          ref={decenaRef}
          className="flex min-h-24 flex-1 flex-wrap content-start gap-1 rounded-lg border-2 border-dashed border-neutral-300 p-2"
        >
          <span className="w-full text-xs text-neutral-400">Decena (10)</span>
          {items
            .filter((i) => i.zone === "decena")
            .map((i) => (
              <div key={i.id} className="h-5 w-5 rounded-full bg-amber-400" />
            ))}
        </div>
        <div
          ref={sueltasRef}
          className="flex min-h-24 flex-1 flex-wrap content-start gap-1 rounded-lg border-2 border-dashed border-neutral-300 p-2"
        >
          <span className="w-full text-xs text-neutral-400">Sueltas</span>
          {items
            .filter((i) => i.zone === "sueltas")
            .map((i) => (
              <div key={i.id} className="h-5 w-5 rounded-full bg-amber-400" />
            ))}
        </div>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
