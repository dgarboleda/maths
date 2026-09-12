"use client";

/**
 * Estado compartido, minúsculo, de si la caja de herramientas flotante de
 * capas (`LayersToolbox`) está abierta — mismo patrón que
 * `helpOverlayStore.ts`: así el botón de la barra inferior y el botón de
 * cerrar del propio panel flotante pueden abrirlo/cerrarlo sin pasar por un
 * Context ni por el reducer del nivel (es UI efímera, no algo que deba
 * entrar en el historial de undo/redo).
 */
type Listener = (open: boolean) => void;

let open = false;
const listeners = new Set<Listener>();

export function getLayersToolboxOpen(): boolean {
  return open;
}

export function setLayersToolboxOpen(next: boolean): void {
  if (open === next) return;
  open = next;
  listeners.forEach((l) => l(open));
}

export function toggleLayersToolbox(): void {
  setLayersToolboxOpen(!open);
}

export function subscribeLayersToolbox(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
