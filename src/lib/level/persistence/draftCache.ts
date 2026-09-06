import type { LevelDefinition } from "../schema";

/**
 * Borrador local del editor — mismo patrón que ya usa
 * `WalkDebugOverlay.tsx:33-45` (clave por id, `try/catch` silencioso en cada
 * operación). NUNCA es la fuente de verdad: solo protege contra una pestaña
 * cerrada sin guardar. Firestore (`levelRepository`) sigue siendo lo único
 * que persiste de verdad — docs/level-editor-plan.md §10.5.
 */

interface Draft {
  savedAt: number;
  level: LevelDefinition;
}

function storageKey(levelId: string): string {
  return `level-editor-draft:${levelId}`;
}

export function saveDraft(levelId: string, level: LevelDefinition): void {
  try {
    const draft: Draft = { savedAt: Date.now(), level };
    window.localStorage.setItem(storageKey(levelId), JSON.stringify(draft));
  } catch {
    // Almacenamiento lleno o bloqueado: el borrador sigue vivo en memoria, se pierde solo si se recarga.
  }
}

export function loadDraft(levelId: string): Draft | null {
  try {
    const raw = window.localStorage.getItem(storageKey(levelId));
    return raw ? (JSON.parse(raw) as Draft) : null;
  } catch {
    return null;
  }
}

export function clearDraft(levelId: string): void {
  try {
    window.localStorage.removeItem(storageKey(levelId));
  } catch {
    // nada que limpiar si el storage no está disponible
  }
}
