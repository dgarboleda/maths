"use client";

import { useLayoutEffect, useRef, type KeyboardEvent, type RefObject } from "react";

/**
 * Comportamiento mínimo de diálogo modal accesible: foco al abrir, Escape para
 * cerrar y tabulador atrapado dentro del panel. Lo comparten todas las fichas
 * del mundo (puzzle, tienda, diálogo del NPC, personaje) para no repetirlo.
 *
 * `initialFocusRef` (opcional) es el elemento que debe recibir el foco al
 * abrir — normalmente el primer campo interactivo — en vez del propio div
 * del diálogo. Se enfoca con `useLayoutEffect`, después de bloquear el
 * scroll del documento, en la misma pasada síncrona: si en cambio se usara
 * el atributo nativo `autoFocus` del input, el navegador lo procesa como una
 * tarea encolada aparte, sin garantía de orden frente a nuestro efecto —con
 * la página de fondo scrolleable (aunque sea por unos pocos px), eso dejaba
 * una ventana en la que Chrome móvil "corregía" el foco con un zoom que
 * ensanchaba el layout viewport para siempre, descentrando el diálogo
 * `position: fixed`. Bloquear el scroll ANTES de enfocar, ambos en el mismo
 * callback, cierra esa ventana.
 */
export function useDialogFocus(onClose: () => void, initialFocusRef?: RefObject<HTMLElement | null>) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const html = document.documentElement;
    const prevOverflow = html.style.overflow;
    html.style.overflow = "hidden";

    const target = initialFocusRef?.current ?? dialogRef.current;
    target?.focus();

    return () => {
      html.style.overflow = prevOverflow;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
