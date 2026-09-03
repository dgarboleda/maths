"use client";

import { useEffect, useRef, type KeyboardEvent } from "react";

/**
 * Comportamiento mínimo de diálogo modal accesible: foco al abrir, Escape para
 * cerrar y tabulador atrapado dentro del panel. Lo comparten todas las fichas
 * del mundo (puzzle, tienda, diálogo del NPC, personaje) para no repetirlo.
 */
export function useDialogFocus(onClose: () => void) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    dialogRef.current?.focus();
  }, []);

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.stopPropagation();
      onClose();
      return;
    }
    if (event.key !== "Tab") return;
    const focusables = dialogRef.current?.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );
    if (!focusables || focusables.length === 0) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  return { dialogRef, handleKeyDown };
}
