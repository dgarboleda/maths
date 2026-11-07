import type { CustomLesson } from "../../../../functions/src/customLessons/schema";

/**
 * Copia local de los cambios sin guardar, por familia y clase, para no
 * perder trabajo si se cierra la pestaña. Es solo una comodidad: el
 * almacenamiento puede no existir (ventana privada) y todo sigue funcionando.
 */
export interface StoredDraft { draft: CustomLesson; baseUpdatedAt: number | null; savedAt: number }

const key = (parentId: string, id: string | null) => `customLessonDraft:${parentId}:${id ?? "nueva"}`;

export function readDraft(parentId: string, id: string | null): StoredDraft | null {
  try {
    const raw = localStorage.getItem(key(parentId, id));
    if (!raw) return null;
    const value = JSON.parse(raw) as StoredDraft;
    return value && typeof value === "object" && value.draft && typeof value.savedAt === "number" ? value : null;
  } catch { return null; }
}

export function writeDraft(parentId: string, id: string | null, value: StoredDraft): void {
  try { localStorage.setItem(key(parentId, id), JSON.stringify(value)); } catch { /* sin almacenamiento */ }
}

export function clearDraft(parentId: string, id: string | null): void {
  try { localStorage.removeItem(key(parentId, id)); } catch { /* sin almacenamiento */ }
}
