"use client";

import { useRef, useState } from "react";

interface Item {
  id: number;
  zone: "pool" | "decena" | "sueltas";
}

/**
 * Reparto de fichas entre una decena y las unidades sueltas. Se puede
 * arrastrar (ratón o dedo) o usar los botones "A la decena" / "A sueltas",
 * que hacen exactamente lo mismo con teclado — antes el arrastre era la única
 * forma de contestar (WCAG 2.1.1 y 2.5.7). El estado se anuncia en una región
 * viva para quien no ve las fichas moverse.
 */
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
  const sueltasCount = items.filter((i) => i.zone === "sueltas").length;
  const pending = items.filter((i) => i.zone === "pool");

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

  function moveNext(zone: "decena" | "sueltas") {
    const next = pending[0];
    if (!next) return;
    commit(next.id, zone);
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
      <p className="text-sm text-slate-700">
        Arrastra las fichas, o usa los botones para repartirlas.
      </p>

      <div className="flex min-h-14 flex-wrap gap-2 rounded-lg border border-neutral-300 p-2">
        {pending.map((item) => (
          <div
            key={item.id}
            aria-hidden="true"
            onPointerDown={(e) => {
              (e.currentTarget as Element).setPointerCapture(e.pointerId);
              setDragId(item.id);
              setDragPos({ x: e.clientX, y: e.clientY });
            }}
            className="h-6 w-6 touch-none rounded-full bg-amber-500"
            style={
              dragId === item.id && dragPos
                ? { position: "fixed", left: dragPos.x - 12, top: dragPos.y - 12, zIndex: 50 }
                : undefined
            }
          />
        ))}
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => moveNext("decena")}
          disabled={pending.length === 0 || decenaCount >= 10}
          className="rounded-xl bg-purple-100 px-4 py-2 text-sm font-bold text-purple-800 hover:bg-purple-200 disabled:opacity-40"
        >
          A la decena
        </button>
        <button
          type="button"
          onClick={() => moveNext("sueltas")}
          disabled={pending.length === 0}
          className="rounded-xl bg-purple-100 px-4 py-2 text-sm font-bold text-purple-800 hover:bg-purple-200 disabled:opacity-40"
        >
          A sueltas
        </button>
      </div>

      <div className="flex gap-3">
        <div
          ref={decenaRef}
          className="flex min-h-24 flex-1 flex-wrap content-start gap-1 rounded-lg border-2 border-dashed border-neutral-400 p-2"
        >
          <span className="w-full text-xs text-neutral-700">Decena (10)</span>
          {items
            .filter((i) => i.zone === "decena")
            .map((i) => (
              <div key={i.id} aria-hidden="true" className="h-5 w-5 rounded-full bg-amber-500" />
            ))}
        </div>
        <div
          ref={sueltasRef}
          className="flex min-h-24 flex-1 flex-wrap content-start gap-1 rounded-lg border-2 border-dashed border-neutral-400 p-2"
        >
          <span className="w-full text-xs text-neutral-700">Sueltas</span>
          {items
            .filter((i) => i.zone === "sueltas")
            .map((i) => (
              <div key={i.id} aria-hidden="true" className="h-5 w-5 rounded-full bg-amber-500" />
            ))}
        </div>
      </div>

      <p role="status" className="text-sm text-slate-700">
        Decena: {decenaCount} · Sueltas: {sueltasCount} · Por repartir: {pending.length}
      </p>
      {error && (
        <p role="alert" className="text-xs font-bold text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
