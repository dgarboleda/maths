/** Conserva borradores en el dispositivo y migra los de la pestaña anterior. */
export function readCalculatorDraft(key: string): string | null {
  try {
    return localStorage.getItem(key) ?? sessionStorage.getItem(key);
  } catch {
    try { return sessionStorage.getItem(key); } catch { return null; }
  }
}

export function writeCalculatorDraft(key: string, value: string): void {
  try { localStorage.setItem(key, value); } catch { /* El borrador sigue disponible en esta pestaña. */ }
  try { sessionStorage.setItem(key, value); } catch { /* La hoja sigue disponible en memoria. */ }
}

/** Guarda una copia explícita del borrador en el perfil del alumno. */
export async function saveCalculatorToProfile(parentId: string, childId: string, key: string): Promise<void> {
  const { getFirebase } = await import("@/lib/firebase");
  const { db, firestore } = await getFirebase();
  const written = readCalculatorDraft(key) ?? "";
  const exact = readCalculatorDraft(`${key}:exacta`) ?? "";
  await firestore.setDoc(firestore.doc(db, "parents", parentId, "children", childId, "calculatorDraft", "actual"), {
    written, exact, updatedAt: firestore.serverTimestamp(),
  });
}

/** Restaura una copia guardada; devuelve false si todavía no hay ninguna. */
export async function restoreCalculatorFromProfile(parentId: string, childId: string, key: string): Promise<boolean> {
  const { getFirebase } = await import("@/lib/firebase");
  const { db, firestore } = await getFirebase();
  const snapshot = await firestore.getDoc(firestore.doc(db, "parents", parentId, "children", childId, "calculatorDraft", "actual"));
  if (!snapshot.exists()) return false;
  const data = snapshot.data();
  if (typeof data.written !== "string" || typeof data.exact !== "string" || data.written.length > 100_000 || data.exact.length > 100_000) throw new Error("Borrador inválido");
  if (data.written) JSON.parse(data.written);
  if (data.exact) JSON.parse(data.exact);
  writeCalculatorDraft(key, data.written);
  writeCalculatorDraft(`${key}:exacta`, data.exact);
  return true;
}
