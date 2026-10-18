import { FieldValue, getFirestore, type Transaction, type DocumentReference } from "firebase-admin/firestore";
import { HttpsError, onCall, type CallableRequest } from "firebase-functions/v2/https";

const BALANCE_SCHEMA = 1;

function scope(request: CallableRequest) {
  if (!request.auth) throw new HttpsError("unauthenticated", "Inicia sesión.");
  const { parentId, childId } = request.data ?? {};
  if (![parentId, childId].every((id) => typeof id === "string" && /^[^/\s]{1,128}$/.test(id))) {
    throw new HttpsError("invalid-argument", "Perfil inválido.");
  }
  const isParent = request.auth.uid === parentId && request.auth.token.role !== "child";
  const isChild = request.auth.token.role === "child"
    && request.auth.token.parentId === parentId && request.auth.token.childId === childId;
  if (!isParent && !isChild) throw new HttpsError("permission-denied", "Este perfil pertenece a otra sesión.");
  const child = getFirestore().collection("parents").doc(parentId).collection("children").doc(childId);
  return { child, isParent };
}

/** El documento de saldo serializa premios, migración y reconciliaciones.
 * El Admin SDK permite leer el libro mayor dentro de la misma transacción.
 * También repara agregados de la versión anterior que perdieron el histórico. */
export async function readBalance(tx: Transaction, child: DocumentReference, force = false) {
  const balance = child.collection("starBalance").doc("total");
  const [profile, snapshot] = await Promise.all([tx.get(child), tx.get(balance)]);
  if (!profile.exists) throw new HttpsError("not-found", "El perfil ya no existe.");
  if (profile.data()?.deleting) throw new HttpsError("failed-precondition", "El perfil se está eliminando.");
  if (!force && snapshot.data()?.schemaVersion === BALANCE_SCHEMA) {
    const total: unknown = snapshot.data()!.total;
    if (typeof total !== "number" || !Number.isSafeInteger(total)) throw new HttpsError("failed-precondition", "Saldo inválido: reconcilia el historial.");
    return { balance, total };
  }
  const ledger = await tx.get(child.collection("starLedger").select("delta"));
  const total = ledger.docs.reduce((sum, entry) => {
    const delta = entry.data().delta;
    if (typeof delta !== "number" || !Number.isSafeInteger(delta)) {
      throw new HttpsError("failed-precondition", "El historial contiene un importe inválido.");
    }
    return sum + delta;
  }, 0);
  return { balance, total };
}

export const initializeStarBalance = onCall(async (request) => {
  const { child, isParent } = scope(request);
  const force = request.data?.reconcile === true;
  if (force && !isParent) throw new HttpsError("permission-denied", "Solo la familia puede reconciliar el saldo.");
  return getFirestore().runTransaction(async (tx) => {
    const { balance, total } = await readBalance(tx, child, force);
    tx.set(balance, { total, schemaVersion: BALANCE_SCHEMA });
    return { total };
  });
});

export const updateStarBalance = onCall(async (request) => {
  const { child, isParent } = scope(request);
  const { delta, reason, operationId, attemptId = null } = request.data ?? {};
  if (!Number.isSafeInteger(delta) || delta === 0 || Math.abs(delta) > 1_000_000
    || typeof operationId !== "string" || !/^[a-zA-Z0-9_-]{1,128}$/.test(operationId)
    || (attemptId !== null && (typeof attemptId !== "string" || attemptId.length > 128))) {
    throw new HttpsError("invalid-argument", "Movimiento inválido.");
  }
  if (!["problem_solved", "boss_level", "redemption"].includes(reason)) {
    throw new HttpsError("invalid-argument", "Motivo inválido.");
  }
  if ((reason === "redemption" && (!isParent || delta > 0))
    || (reason !== "redemption" && delta < 0)
    || (!isParent && delta > (reason === "boss_level" ? 15 : 30))) {
    throw new HttpsError("permission-denied", "Movimiento no permitido.");
  }

  return getFirestore().runTransaction(async (tx) => {
    // El id se conserva al reintentar la misma operación: jamás cobra dos veces.
    const entry = child.collection("starLedger").doc(operationId);
    const previous = await tx.get(entry);
    const { balance, total } = await readBalance(tx, child);
    if (previous.exists) {
      if (previous.data()?.delta !== delta || previous.data()?.reason !== reason || previous.data()?.attemptId !== attemptId) {
        throw new HttpsError("already-exists", "La operación ya existe con otros datos.");
      }
      return { total };
    }
    if (delta < 0 && total + delta < 0) throw new HttpsError("failed-precondition", "No hay estrellas suficientes.");
    tx.create(entry, { delta, reason, attemptId, createdAt: FieldValue.serverTimestamp() });
    tx.set(balance, { total: total + delta, schemaVersion: BALANCE_SCHEMA });
    return { total: total + delta };
  });
});
