"use client";

/**
 * Estado compartido, minúsculo, de si `HelpOverlay` está abierto — para que
 * tanto el atajo de teclado `?` como un botón visible (`EditorBottomBar`)
 * puedan abrirlo/cerrarlo sin pasar por un Context ni por el reducer del
 * nivel (esto es UI efímera, no algo que deba entrar en el historial de
 * undo/redo del nivel).
 */
type Listener = (open: boolean) => void;

let open = false;
const listeners = new Set<Listener>();

export function getHelpOverlayOpen(): boolean {
  return open;
}

export function setHelpOverlayOpen(next: boolean): void {
  if (open === next) return;
  open = next;
  listeners.forEach((l) => l(open));
}

export function toggleHelpOverlay(): void {
  setHelpOverlayOpen(!open);
}

export function subscribeHelpOverlay(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
