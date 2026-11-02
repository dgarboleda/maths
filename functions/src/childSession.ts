import { HttpsError, type CallableRequest } from "firebase-functions/v2/https";
import type { DocumentSnapshot } from "firebase-admin/firestore";

/** Ejecutar dentro de la transacción que lee el perfil y modifica sus datos. */
export function assertChildSessionCurrent(request: CallableRequest, profile: DocumentSnapshot): void {
  if (request.auth?.token.role !== "child") return;
  if (!profile.exists || profile.data()?.deleting ||
      (profile.data()?.sessionVersion ?? 0) !== (request.auth.token.sessionVersion ?? 0)) {
    throw new HttpsError("permission-denied", "La sesión infantil ya no está vigente.");
  }
}
