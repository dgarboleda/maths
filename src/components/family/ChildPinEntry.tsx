"use client";

import type { KeyboardEvent, RefObject } from "react";

/** Sin campos editables ni formulario de credenciales: en móvil se usa solo
 * este teclado y el PIN nunca se ofrece como contraseña al navegador. */
export function ChildPinEntry({ id, childName, pin, onChange, onConfirm, disabled, error, shakes, entryRef }: {
  id: string;
  childName: string;
  pin: string;
  onChange: (pin: string) => void;
  onConfirm: () => void;
  disabled: boolean;
  error: string | null;
  shakes: number;
  entryRef: RefObject<HTMLDivElement | null>;
}) {
  function press(key: string) {
    if (disabled) return;
    if (key === "Backspace" || key === "Delete") onChange(pin.slice(0, -1));
    else if (/^\d$/.test(key) && pin.length < 4) onChange(pin + key);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    if (/^\d$/.test(event.key) || event.key === "Backspace" || event.key === "Delete") {
      event.preventDefault();
      press(event.key);
    } else if (event.key === "Enter" && event.target === entryRef.current) {
      event.preventDefault();
      if (!disabled && pin.length === 4) onConfirm();
    }
  }

  return (
    <div className="flex w-full flex-col items-center gap-3" onKeyDown={handleKeyDown}>
      <h2 id={id} className="text-center text-sm font-bold text-white">PIN de {childName}</h2>
      <div key={shakes} ref={entryRef} role="textbox" tabIndex={disabled ? -1 : 0}
        aria-labelledby={id} aria-describedby={`${id}-hint ${id}-count`}
        aria-disabled={disabled} aria-invalid={Boolean(error)}
        className={`family-input flex h-11 w-32 items-center justify-center gap-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300${error ? " anim-shake has-error" : ""}`}>
        {Array.from({ length: 4 }, (_, i) => (
          <span key={i} aria-hidden="true" className={`size-3 rounded-full border border-indigo-200 ${i < pin.length ? "bg-indigo-100" : "bg-transparent"}`} />
        ))}
      </div>
      <p id={`${id}-hint`} className="text-center text-xs text-indigo-200">Usa estos números o tu teclado.</p>
      <span id={`${id}-count`} className="sr-only" role="status">{pin.length} de 4 dígitos</span>
      <span role="alert" className="min-h-4 text-center text-xs font-semibold text-red-300">{error ?? ""}</span>
      <div role="group" aria-label={`Teclado numérico para ${childName}`} className="grid grid-cols-3 gap-1.5">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((digit) => (
          <button key={digit} type="button" disabled={disabled} onClick={() => press(digit)}
            className="family-keycap min-h-11 min-w-11 rounded-lg font-display text-sm font-bold disabled:opacity-40">{digit}</button>
        ))}
        <span aria-hidden="true" />
        <button type="button" disabled={disabled} onClick={() => press("0")}
          className="family-keycap min-h-11 min-w-11 rounded-lg font-display text-sm font-bold disabled:opacity-40">0</button>
        <button type="button" disabled={disabled} onClick={() => press("Backspace")} aria-label="Borrar último dígito"
          className="family-keycap grid min-h-11 min-w-11 place-items-center rounded-lg text-xs disabled:opacity-40">⌫</button>
      </div>
    </div>
  );
}
