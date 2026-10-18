import type { Firestore } from "firebase/firestore";
import { getFirebaseFunctionsForApp } from "./firebase";

/** El libro mayor y su agregado los escribe Functions en una transacción.
 * Conservamos la firma de los repositorios para no acoplar pantallas al SDK
 * de Functions. El operationId se puede reutilizar tras un fallo de red. */
export async function awardStars(
  firestoreFns: typeof import("firebase/firestore"),
  db: Firestore,
  parentId: string,
  childId: string,
  delta: number,
  reason: string,
  attemptId: string | null = null,
  operationId = crypto.randomUUID(),
): Promise<void> {
  void firestoreFns;
  const { functions, functionsFns } = await getFirebaseFunctionsForApp(db.app);
  const update = functionsFns.httpsCallable(functions, "updateStarBalance");
  await update({ parentId, childId, delta, reason, attemptId, operationId });
}

export async function ensureStarBalanceSeeded(
  firestoreFns: typeof import("firebase/firestore"),
  db: Firestore,
  parentId: string,
  childId: string,
  reconcile = false,
): Promise<void> {
  const ref = firestoreFns.doc(db, "parents", parentId, "children", childId, "starBalance", "total");
  if (!reconcile && (await firestoreFns.getDoc(ref)).data()?.schemaVersion === 1) return;
  const { functions, functionsFns } = await getFirebaseFunctionsForApp(db.app);
  const initialize = functionsFns.httpsCallable(functions, "initializeStarBalance");
  await initialize({ parentId, childId, reconcile });
}
