"use client";

import { useId, type ReactNode } from "react";
import { useDialogFocus } from "./useDialogFocus";

/** Ficha flotante del mundo (tienda, diálogo, personaje): un diálogo modal real. */
export function WorldDialog({
  icon,
  title,
  subtitle,
  onClose,
  children,
}: {
  icon: string;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const titleId = useId();
  const { dialogRef, handleKeyDown } = useDialogFocus(onClose);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/80 p-3 backdrop-blur-sm sm:items-center sm:p-6">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
        className="max-h-full w-full max-w-md overflow-y-auto rounded-3xl border-2 border-indigo-400/40 bg-slate-900 shadow-[0_0_60px_rgba(99,102,241,0.25)] focus:outline-none"
      >
        <div className="flex items-start justify-between gap-3 border-b-2 border-indigo-400/25 px-5 py-4">
          <div className="flex items-center gap-3">
            <span aria-hidden="true" className="text-3xl">
              {icon}
            </span>
            <div>
              <h2 id={titleId} className="font-display text-lg font-bold text-indigo-100">
                {title}
              </h2>
              {subtitle && <p className="text-xs text-slate-400">{subtitle}</p>}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-slate-800 px-3 py-1.5 text-sm font-bold text-slate-300 hover:bg-slate-700"
          >
            Salir
          </button>
        </div>
        <div className="px-5 py-5">{children}</div>
      </div>
    </div>
  );
}
