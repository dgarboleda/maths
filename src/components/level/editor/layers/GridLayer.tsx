"use client";

import { useId } from "react";

/**
 * Rejilla del editor — cuadrada en modo `flat`, romboidal en `isometric`
 * (docs/level-editor-plan.md §7.4: la proyección "solo afecta la rejilla del
 * editor, nunca las coordenadas"). Puramente decorativa: no participa en
 * ninguna consulta de navegación ni de colisión.
 */
export function GridLayer({
  visible,
  sizePct,
  projection,
}: {
  visible: boolean;
  sizePct: number;
  projection: "flat" | "isometric";
}) {
  const id = useId();
  const patternId = `editor-grid-${id}`;

  if (!visible || sizePct <= 0) return null;

  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 size-full">
      <defs>
        {projection === "flat" ? (
          <pattern id={patternId} width={sizePct} height={sizePct} patternUnits="userSpaceOnUse">
            <path d={`M ${sizePct} 0 L 0 0 0 ${sizePct}`} fill="none" stroke="#e2e8f0" strokeOpacity="0.18" strokeWidth="0.15" />
          </pattern>
        ) : (
          <pattern id={patternId} width={sizePct * 2} height={sizePct} patternUnits="userSpaceOnUse">
            <path
              d={`M0 ${sizePct / 2} L ${sizePct} 0 L ${sizePct * 2} ${sizePct / 2} L ${sizePct} ${sizePct} Z`}
              fill="none"
              stroke="#e2e8f0"
              strokeOpacity="0.18"
              strokeWidth="0.15"
            />
          </pattern>
        )}
      </defs>
      <rect width="100" height="100" fill={`url(#${patternId})`} />
    </svg>
  );
}
