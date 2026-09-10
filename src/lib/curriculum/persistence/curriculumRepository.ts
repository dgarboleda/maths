import type { Firestore } from "firebase/firestore";
import { prepareForFirestore, assertSize } from "@/lib/level/serialize";
import { createEmptyCustomModule } from "../defaults";
import { CUSTOM_MODULE_SCHEMA_VERSION, type CustomModuleDoc } from "../customSchema";

/**
 * Acceso a Firestore de la Currícula personalizada — Fase 20
 * (docs/level-editor-plan-v2.md §7.3). Mismo estilo que `levelRepository`/
 * `worldRepository`: funciones puras que reciben `firestoreFns`/`db` como
 * parámetros (nunca importan `firebase/firestore` de forma estática,
 * criterio A5), pero **sin** subcolección `versions/` — un módulo pesa
 * mucho menos que un nivel y su historial no justifica el costo (queda
 * anotado como posible ampliación futura).
 *
 * Esquema: `/parents/{parentId}/curriculumModules/{moduleId}`.
 */

type FirestoreFns = typeof import("firebase/firestore");

export class CustomModuleNotFoundError extends Error {
  moduleId: string;
  constructor(moduleId: string) {
    super(`El módulo personalizado "${moduleId}" no existe.`);
    this.name = "CustomModuleNotFoundError";
    this.moduleId = moduleId;
  }
}

function moduleDocRef(firestoreFns: FirestoreFns, db: Firestore, parentId: string, moduleId: string) {
  return firestoreFns.doc(db, "parents", parentId, "curriculumModules", moduleId);
}

/** Todos los módulos personalizados del padre (borrador y publicado), más
 *  recientes primero — para la lista de `/panel/curriculum`. */
export async function listCustomModuleDocs(firestoreFns: FirestoreFns, db: Firestore, parentId: string): Promise<CustomModuleDoc[]> {
  const { collection, getDocs, orderBy, query } = firestoreFns;
  const snap = await getDocs(query(collection(db, "parents", parentId, "curriculumModules"), orderBy("metadata.updatedAt", "desc")));
  return snap.docs.map((d) => d.data() as CustomModuleDoc);
}

export async function getCustomModuleDoc(firestoreFns: FirestoreFns, db: Firestore, parentId: string, moduleId: string): Promise<CustomModuleDoc | null> {
  const snap = await firestoreFns.getDoc(moduleDocRef(firestoreFns, db, parentId, moduleId));
  if (!snap.exists()) return null;
  return { ...(snap.data() as CustomModuleDoc), schemaVersion: CUSTOM_MODULE_SCHEMA_VERSION };
}

/** Crea un borrador vacío con `id` (ya validado/único por el llamador —
 *  el editor lo arma con `slugForLabel` + comprobación contra la lista
 *  cargada) y lo persiste tal cual. */
export async function createCustomModuleDoc(firestoreFns: FirestoreFns, db: Firestore, parentId: string, authorUid: string, id: string): Promise<CustomModuleDoc> {
  const doc = createEmptyCustomModule(authorUid, id);
  const clean = prepareForFirestore(doc);
  assertSize(clean);
  await firestoreFns.setDoc(moduleDocRef(firestoreFns, db, parentId, id), clean);
  return doc;
}

/** Guarda `doc` tal cual (última escritura gana — sin versionado optimista,
 *  ver nota de cabecera). Actualiza `metadata.updatedAt`. */
export async function saveCustomModuleDoc(firestoreFns: FirestoreFns, db: Firestore, parentId: string, doc: CustomModuleDoc): Promise<CustomModuleDoc> {
  const updated: CustomModuleDoc = { ...doc, metadata: { ...doc.metadata, updatedAt: Date.now() } };
  const clean = prepareForFirestore(updated);
  assertSize(clean);
  await firestoreFns.setDoc(moduleDocRef(firestoreFns, db, parentId, doc.id), clean);
  return updated;
}

export async function deleteCustomModuleDoc(firestoreFns: FirestoreFns, db: Firestore, parentId: string, moduleId: string): Promise<void> {
  await firestoreFns.deleteDoc(moduleDocRef(firestoreFns, db, parentId, moduleId));
}
