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
  "starBalance",
  "redemptionRequests",
  "placements",
  "badges",
  "records",
  "learningProgress",
  "customLessonProgress",
  "learningEvidence",
  "learningMissions",
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
  const {
    collection,
    doc,
    deleteDoc,
    getDocFromServer,
    getDocsFromServer,
    writeBatch,
    query,
    limit,
    updateDoc,
  } = firestore;
  const profile = doc(db, "parents", parentId, "children", childId);
  // Primero comprobar la existencia y TODOS los permisos de lectura en el
  // servidor. Las reglas antiguas pueden denegar incluso colecciones vacías:
  // no bloquear el perfil ni borrar progreso si falta publicar alguna regla.
  const snapshot = await getDocFromServer(profile);
  for (const sub of CHILD_SUBCOLLECTIONS) {
    await getDocsFromServer(
      query(
        collection(db, "parents", parentId, "children", childId, sub),
        limit(1),
      ),
    );
  }
  // Cierra escritores infantiles antes de vaciar subcolecciones. Si falla
  // un lote, la familia puede reintentar sin que el niño genere huérfanos.
  if (snapshot.exists()) await updateDoc(profile, { deleting: true });

  for (const sub of CHILD_SUBCOLLECTIONS) {
    // Lecturas acotadas: un perfil con años de intentos no se carga entero.
    while (true) {
      const snap = await getDocsFromServer(
        query(
          collection(db, "parents", parentId, "children", childId, sub),
          limit(450),
        ),
      );
      if (snap.empty) break;
      const batch = writeBatch(db);
      for (const entry of snap.docs) batch.delete(entry.ref);
      await batch.commit();
    }
  }

  await deleteDoc(profile);
}
