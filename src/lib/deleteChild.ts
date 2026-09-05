import type { Firebase } from "./firebase";

/**
 * Todas las subcolecciones reales que cuelgan de un hijo (ver firestore.rules
 * y los `collection(db, "parents", ..., "children", childId, "...")` de toda
 * la app) — Firestore no borra subcolecciones en cascada al borrar el
 * documento padre, así que hay que vaciar cada una antes de borrar al hijo.
 */
const CHILD_SUBCOLLECTIONS = [
  "skillsProgress",
  "attempts",
  "starLedger",
  "redemptionRequests",
  "placements",
  "badges",
] as const;

/**
 * Borra un perfil de hijo por completo: todo su progreso, intentos, estrellas,
 * canjes, evaluaciones e insignias, y al final el propio perfil. Corre como
 * el padre autenticado (mismas reglas que cualquier otra escritura bajo
 * `children/{childId}`), sin necesitar una Cloud Function. Se hace en lotes
 * de `writeBatch` (tope real de 500 operaciones por lote) para no fallar si
 * algún día un hijo acumula más documentos de los que caben en un solo lote.
 * Irreversible: quien llame a esto debe haber confirmado con la familia.
 */
export async function deleteChildProfile(
  firestore: Firebase["firestore"],
  db: Firebase["db"],
  parentId: string,
  childId: string,
): Promise<void> {
  const { collection, doc, deleteDoc, getDocs, writeBatch } = firestore;

  for (const sub of CHILD_SUBCOLLECTIONS) {
    const snap = await getDocs(collection(db, "parents", parentId, "children", childId, sub));
    const refs = snap.docs.map((d) => d.ref);
    for (let i = 0; i < refs.length; i += 450) {
      const batch = writeBatch(db);
      for (const ref of refs.slice(i, i + 450)) batch.delete(ref);
      await batch.commit();
    }
  }

  await deleteDoc(doc(db, "parents", parentId, "children", childId));
}
