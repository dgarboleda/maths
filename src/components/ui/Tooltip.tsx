"use client";

import { cloneElement, isValidElement, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { ReactElement } from "react";

export type TooltipSide = "top" | "right" | "bottom" | "left";

const GAP = 6; // separación entre el trigger y la burbuja, en px

/** Posición fija (viewport) de la burbuja, calculada contra el `rect` real
 *  del trigger — no CSS puro, a propósito: los paneles del editor son
 *  columnas con `overflow-y-auto` (para poder hacer scroll con muchas
 *  entidades/eventos), y una burbuja `position: absolute` dentro de un
 *  ancestro con overflow no-visible queda RECORTADA en el borde de ese
 *  ancestro aunque tenga `z-50` — es una limitación de CSS, no de z-index.
 *  Un portal a `document.body` con `position: fixed` es la única forma de
 *  escapar ese recorte sin agregar una librería de posicionamiento (P4). */
function positionFor(side: TooltipSide, rect: DOMRect): { top: number; left: number; transform: string } {
  switch (side) {
    case "top":
      return { top: rect.top - GAP, left: rect.left + rect.width / 2, transform: "translate(-50%, -100%)" };
    case "bottom":
      return { top: rect.bottom + GAP, left: rect.left + rect.width / 2, transform: "translate(-50%, 0)" };
    case "left":
      return { top: rect.top + rect.height / 2, left: rect.left - GAP, transform: "translate(-100%, -50%)" };
    case "right":
      return { top: rect.top + rect.height / 2, left: rect.right + GAP, transform: "translate(0, -50%)" };
  }
}

/**
 * Tooltip de ayuda — Fase 15 (docs/level-editor-plan-v2.md §2.2). Tailwind
 * puro, sin dependencia nueva (P4): el posicionamiento lo calcula este mismo
 * componente con `getBoundingClientRect`, no una librería externa.
 *
 * El trigger nunca recibe un `ref` clonado (evita el patrón "merge de refs
 * en cloneElement", que la regla `react-hooks/refs` del repo rechaza): en
 * cambio, los eventos de hover/foco y la medición viven en el `<span>`
 * envolvente — funciona igual porque el wrapper es `inline-flex` pegado al
 * contenido, y el foco de un botón hijo burbujea hasta acá.
 *
 * Aparece con hover Y con foco de teclado, no solo con el mouse — un usuario
 * que navega la toolbox con Tab también ve la ayuda. En pantallas táctiles
 * (`hidden md:block`) no hay hover: el `title` nativo que pone `IconButton`
 * es el fallback ahí, junto con `HelpOverlay` (tecla `?`).
 */
export function Tooltip({
  content,
  shortcut,
  side = "right",
  wide = false,
  children,
}: {
  content: string;
  shortcut?: string;
  side?: TooltipSide;
  wide?: boolean;
  children: ReactElement<{ "aria-describedby"?: string }>;
}) {
  const id = useId();
  const wrapperRef = useRef<HTMLSpanElement | null>(null);
  const [open, setOpen] = useState(false);
  const [rect, setRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    if (!open) return;
    function onReflow() {
      const el = wrapperRef.current;
      if (el) setRect(el.getBoundingClientRect());
    }
    window.addEventListener("scroll", onReflow, true);
    window.addEventListener("resize", onReflow);
    return () => {
      window.removeEventListener("scroll", onReflow, true);
      window.removeEventListener("resize", onReflow);
    };
  }, [open]);

  if (!content || !isValidElement(children)) return children ?? null;

  function show() {
    const el = wrapperRef.current;
    if (el) setRect(el.getBoundingClientRect());
    setOpen(true);
  }
  function hide() {
    setOpen(false);
  }

  const trigger = cloneElement(children, { "aria-describedby": id });
  const pos = rect ? positionFor(side, rect) : null;

  return (
    <span ref={wrapperRef} className="group relative inline-flex" onMouseEnter={show} onMouseLeave={hide} onFocus={show} onBlur={hide}>
      {trigger}
      {open &&
        pos &&
        createPortal(
          <span
            role="tooltip"
            id={id}
            style={{ position: "fixed", top: pos.top, left: pos.left, transform: pos.transform }}
            className={`pointer-events-none z-50 hidden whitespace-nowrap rounded-md border border-indigo-500/20 bg-slate-900 px-2 py-1 text-[11px] font-semibold text-slate-200 shadow-lg md:block ${
              wide ? "max-w-56 whitespace-normal" : ""
            }`}
          >
            {content}
            {shortcut && <kbd className="ml-1.5 rounded bg-slate-800 px-1 text-[10px] text-slate-400">{shortcut}</kbd>}
          </span>,
          document.body,
        )}
    </span>
  );
}
