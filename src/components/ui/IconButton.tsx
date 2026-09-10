"use client";

import type { ComponentType } from "react";
import { Tooltip, type TooltipSide } from "./Tooltip";

export type IconButtonTone = "neutral" | "accent" | "danger";

const TONE_CLASS: Record<IconButtonTone, string> = {
  neutral: "text-slate-300 hover:bg-slate-800",
  accent: "text-cyan-300 hover:bg-cyan-500/10",
  danger: "text-rose-400 hover:bg-rose-500/10",
};

const ACTIVE_CLASS = "bg-cyan-500/15 text-cyan-300";

const SIZE_CLASS: Record<"sm" | "md", string> = {
  sm: "rounded-md p-1.5",
  md: "min-h-9 gap-1.5 rounded-lg px-2.5",
};

const ICON_SIZE: Record<"sm" | "md", string> = {
  sm: "size-3.5",
  md: "size-4",
};

export interface IconButtonProps {
  icon: ComponentType<{ className?: string }>;
  /** Nombre accesible del botón — siempre obligatorio, se usa como
   *  `aria-label`, `title` de respaldo (táctil/sin JS de tooltip) y texto
   *  visible por defecto del tooltip. */
  label: string;
  /** Texto del tooltip si difiere de `label` (p. ej. una explicación más
   *  larga que el nombre corto del botón). */
  tooltip?: string;
  /** Atajo de teclado — se muestra dentro del tooltip siempre, y además
   *  como `<kbd>` visible junto al texto cuando `fullWidth`. */
  shortcut?: string;
  side?: TooltipSide;
  /** Toggle activo (`aria-pressed` + resalte cyan), independiente de `tone`.
   *  Solo pasar esta prop en botones que son un toggle real (herramienta
   *  seleccionada, Grid/Snap/Debug) — `aria-pressed` se omite del todo
   *  cuando no se pasa, en vez de quedar en `"false"`, porque un botón de
   *  acción simple (p. ej. "Eliminar") no es un toggle y no debe llevar ese
   *  atributo ARIA. */
  active?: boolean;
  tone?: IconButtonTone;
  size?: "sm" | "md";
  /** Muestra el texto de `label` junto al icono (botones compactos no-toolbox). */
  showLabel?: boolean;
  /** Fila completa con icono + texto + atajo visible — el patrón de
   *  `EditorToolbox` (Navegación/Objetos/Gameplay). */
  fullWidth?: boolean;
  disabled?: boolean;
  onClick: () => void;
}

/**
 * Botón con tooltip de ayuda — Fase 15 (docs/level-editor-plan-v2.md §2.2).
 * Sustituye el JSX de botón repetido a mano en ~12 archivos del editor,
 * conservando exactamente las clases/comportamiento ya vigentes
 * (`aria-label`, `aria-pressed`, tamaños `p-1.5`/`min-h-9`, colores por
 * `tone`) y añadiendo un tooltip visual consistente encima.
 */
export function IconButton({
  icon: Icon,
  label,
  tooltip,
  shortcut,
  side = "top",
  active,
  tone = "neutral",
  size = "sm",
  showLabel = false,
  fullWidth = false,
  disabled = false,
  onClick,
}: IconButtonProps) {
  const classes = fullWidth
    ? `flex min-h-9 w-full items-center gap-2 rounded-lg px-2 text-left font-bold transition-colors ${active ? ACTIVE_CLASS : TONE_CLASS[tone]}`
    : `flex items-center justify-center gap-1.5 font-bold transition-colors disabled:opacity-40 ${SIZE_CLASS[size]} ${active ? ACTIVE_CLASS : TONE_CLASS[tone]}`;

  return (
    <Tooltip content={tooltip ?? label} shortcut={shortcut} side={side}>
      <button type="button" aria-label={label} aria-pressed={active} title={tooltip ?? label} disabled={disabled} onClick={onClick} className={classes}>
        <Icon className={`shrink-0 ${fullWidth ? "size-4" : ICON_SIZE[size]}`} aria-hidden="true" />
        {(showLabel || fullWidth) && <span className={fullWidth ? "min-w-0 flex-1 truncate" : "truncate"}>{label}</span>}
        {fullWidth && shortcut && <kbd className="rounded bg-slate-800 px-1 text-[10px] text-slate-400">{shortcut}</kbd>}
      </button>
    </Tooltip>
  );
}
