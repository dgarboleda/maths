import { createHash } from "node:crypto";
import { getAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { HttpsError, onCall, type CallableRequest } from "firebase-functions/v2/https";
import { LEGAL_VERSION } from "./legalVersion";

/** Borrar la cuenta exige haber escrito la contraseña hace poco. */
export const RECENT_LOGIN_SECONDS = 5 * 60;

/** uid de Auth de la sesión propia de un hijo (custom token de verifyChildPin).
 * Firebase Auth limita el uid a 128 caracteres, incluso con ids largos. */
export function childAuthUid(parentId: string, childId: string): string {
  return `child:${createHash("sha256").update(JSON.stringify([parentId, childId])).digest("hex")}`;
}

function familyUid(request: CallableRequest): string {
  const uid = request.auth?.uid;
  if (!uid || request.auth?.token.role === "child") {
    throw new HttpsError("permission-denied", "Solo la cuenta de la familia puede hacer esto.");
  }
  return uid;
}

/**
 * Registra que la persona adulta aceptó la versión vigente de la privacidad y
 * los términos y autorizó el tratamiento de los datos de sus hijos. Lo escribe
 * el servidor, con su propia hora: firestore.rules impide que el navegador
 * cree o modifique `legalConsent`.
 */
export const acceptLegalTerms = onCall(async (request) => {
  const uid = familyUid(request);
  const { version } = (request.data ?? {}) as { version?: unknown };
  if (version !== LEGAL_VERSION) {
    throw new HttpsError("failed-precondition", "Los textos legales cambiaron. Recarga la página para leer la versión vigente.");
  }
  await getFirestore().collection("parents").doc(uid).set(
    { legalConsent: { version: LEGAL_VERSION, acceptedAt: FieldValue.serverTimestamp() } },
    { merge: true },
  );
  return { version: LEGAL_VERSION };
});

/**
 * Borra la cuenta familiar completa: perfiles, avance, evidencia, creaciones,
 * archivos subidos, las sesiones de cada hijo y, al final, el usuario de Auth.
 * Es idempotente: si algo falla a mitad, repetirla termina el trabajo.
 */
export const deleteAccount = onCall({ timeoutSeconds: 300 }, async (request) => {
  const uid = familyUid(request);
  const authTime = Number(request.auth?.token.auth_time ?? 0);
  if (Date.now() / 1000 - authTime > RECENT_LOGIN_SECONDS) {
    throw new HttpsError("failed-precondition", "Por seguridad, vuelve a escribir tu contraseña.");
  }
  const db = getFirestore();
  const parent = db.collection("parents").doc(uid);
  const children = await parent.collection("children").get();
  // Primero se corta el acceso: un perfil marcado ya no entra ni guarda nada.
  await Promise.all(children.docs.map((child) => child.ref.update({ deleting: true })));
  await db.recursiveDelete(parent);
  await getStorage().bucket().deleteFiles({ prefix: `parents/${uid}/` });
  if (children.size) await getAuth().deleteUsers(children.docs.map((child) => childAuthUid(uid, child.id)));
  // Último paso: mientras exista el usuario, la familia puede reintentar.
  await getAuth().deleteUser(uid).catch((error: { code?: string }) => {
    if (error.code !== "auth/user-not-found") throw error;
  });
  return { deleted: true };
});
