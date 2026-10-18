import { createHash, timingSafeEqual } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { HttpsError, onCall, onRequest } from "firebase-functions/v2/https";

initializeApp();

export { initializeStarBalance, updateStarBalance } from "./stars";
export { recordLearningAction } from "./learning";

export const deploymentStatus = onRequest((_request, response) => {
  const { release } = JSON.parse(readFileSync(path.join(__dirname, "release.json"), "utf8"));
  response.set("Cache-Control", "no-store").json({ service: "maths-functions", protocol: 3, release });
});

/**
 * Frontera de seguridad real para "el niño juega desde su propio
 * dispositivo, sin la sesión del padre" (docs/plan-salto-producto.md §8):
 * el PIN de 4 dígitos deja de compararse en el cliente (src/lib/pin.ts,
 * usado hoy solo dentro de la sesión ya autenticada del padre) y pasa a
 * verificarse acá, con el Admin SDK, que lee Firestore sin pasar por
 * firestore.rules. Si coincide, se emite un custom token con claims
 * { role: "child", parentId, childId } — firestore.rules/storage.rules
 * los leen (isChild/isAnyChildOf) para darle a esa sesión exactamente el
 * mismo alcance que ya tenía jugando desde el dispositivo del padre, ni
 * un permiso más.
 *
 * El `uid` del custom token es sintético (`child:{parentId}:{childId}`),
 * nunca un uid real de Firebase Auth: un hijo no tiene cuenta propia, solo
 * una sesión con alcance acotado sobre los datos de SU familia.
 */

const PIN_PATTERN = /^\d{4}$/;
const MAX_ATTEMPTS_BEFORE_LOCK = 5;
const BASE_LOCK_MS = 60_000;
const MAX_LOCK_MS = 30 * 60_000;

function hashPin(pin: string): string {
  return createHash("sha256").update(pin, "utf8").digest("hex");
}

function hashesMatch(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "hex");
  const bufB = Buffer.from(b, "hex");
  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB);
}

function childRef(parentId: string, childId: string) {
  return getFirestore().collection("parents").doc(parentId).collection("children").doc(childId);
}

/**
 * Lista pública (sin sesión) de los hijos de una familia — solo lo
 * imprescindible para dibujar el selector de perfiles (id + nombre), nunca
 * `pinHash`: firestore.rules no puede exponer un subconjunto de campos de un
 * documento, así que ese filtrado lo hace esta función con el Admin SDK.
 */
export const listChildrenPublic = onCall(async (request) => {
  const parentId = request.data?.parentId;
  if (typeof parentId !== "string" || !/^[^/\s]{1,128}$/.test(parentId)) {
    throw new HttpsError("invalid-argument", "Falta el identificador de la familia.");
  }

  const snap = await getFirestore().collection("parents").doc(parentId).collection("children").get();
  return {
    children: snap.docs.map((d) => ({ id: d.id, name: (d.data().name as string | undefined) ?? "" })),
  };
});

export const verifyChildPin = onCall(async (request) => {
  const { parentId, childId, pin } = (request.data ?? {}) as {
    parentId?: unknown;
    childId?: unknown;
    pin?: unknown;
  };
  if (
    typeof parentId !== "string" ||
    !/^[^/\s]{1,128}$/.test(parentId) ||
    typeof childId !== "string" ||
    !/^[^/\s]{1,128}$/.test(childId) ||
    typeof pin !== "string" ||
    !PIN_PATTERN.test(pin)
  ) {
    throw new HttpsError("invalid-argument", "Datos inválidos.");
  }

  const ref = childRef(parentId, childId);

  // Transacción: el conteo de intentos fallidos y el bloqueo se leen y
  // escriben atómicamente, para que dos intentos casi simultáneos (o un
  // script que dispare varios a la vez) no se salteen el bloqueo por una
  // condición de carrera.
  const outcome = await getFirestore().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) {
      // Mismo mensaje que un PIN incorrecto: no delatar si el childId existe.
      return "incorrect";
    }
    const data = snap.data() as { pinHash?: string; pinFailCount?: number; pinLockedUntil?: number; deleting?: boolean };
    if (data.deleting) return "incorrect";
    const now = Date.now();
    if (data.pinLockedUntil && data.pinLockedUntil > now) {
      return "locked";
    }

    if (!data.pinHash || !hashesMatch(hashPin(pin), data.pinHash)) {
      const failCount = (data.pinFailCount ?? 0) + 1;
      if (failCount >= MAX_ATTEMPTS_BEFORE_LOCK) {
        const lockMs = Math.min(BASE_LOCK_MS * 2 ** (failCount - MAX_ATTEMPTS_BEFORE_LOCK), MAX_LOCK_MS);
        tx.update(ref, { pinFailCount: failCount, pinLockedUntil: now + lockMs });
      } else {
        tx.update(ref, { pinFailCount: failCount });
      }
      // Lanzar aquí abortaría también tx.update: el contador nunca subiría.
      return "incorrect";
    }

    tx.update(ref, { pinFailCount: 0, pinLockedUntil: FieldValue.delete() });
    return "ok";
  });

  if (outcome === "locked") {
    throw new HttpsError("resource-exhausted", "Demasiados intentos. Espera un momento e intenta de nuevo.");
  }
  if (outcome !== "ok") throw new HttpsError("permission-denied", "PIN incorrecto.");

  // Firebase Auth limita el uid a 128 caracteres, incluso con ids largos.
  const uid = `child:${createHash("sha256").update(JSON.stringify([parentId, childId])).digest("hex")}`;
  const token = await getAuth().createCustomToken(uid, { role: "child", parentId, childId });
  return { token };
});
