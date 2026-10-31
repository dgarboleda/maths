import "./runtimeOptions";
import { readFileSync } from "node:fs";
import path from "node:path";
import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { defineSecret } from "firebase-functions/params";
import { HttpsError, onCall, onRequest, type CallableRequest } from "firebase-functions/v2/https";
import { ACCESS_KEY_PATTERN, checkPin, PIN_HASH_VERSION, PIN_PATTERN, pinHmac, safeEqual } from "./pin";
import { getProfileAvatar } from "./profileAvatars";
import { childAuthUid } from "./account";

initializeApp();

export { initializeStarBalance, updateStarBalance } from "./stars";
export { recordLearningAction } from "./learning";
export { acceptLegalTerms, deleteAccount } from "./account";

export const deploymentStatus = onRequest((_request, response) => {
  const { release } = JSON.parse(readFileSync(path.join(__dirname, "release.json"), "utf8"));
  response.set("Cache-Control", "no-store").json({ service: "maths-functions", protocol: 13, release });
});

/**
 * Frontera de seguridad real para "el niño juega desde su propio
 * dispositivo, sin la sesión del padre" (docs/plan-salto-producto.md §8):
 * el PIN de 4 dígitos nunca se compara ni se calcula en el cliente: se fija
 * con `setChildPin` y se verifica acá, con el Admin SDK, que lee Firestore
 * sin pasar por firestore.rules. Si coincide, se emite un custom token con claims
 * { role: "child", parentId, childId } — firestore.rules/storage.rules
 * los leen (isChild/isAnyChildOf) para darle a esa sesión exactamente el
 * mismo alcance que ya tenía jugando desde el dispositivo del padre, ni
 * un permiso más.
 *
 * El `uid` del custom token es sintético (`child:{parentId}:{childId}`),
 * nunca un uid real de Firebase Auth: un hijo no tiene cuenta propia, solo
 * una sesión con alcance acotado sobre los datos de SU familia.
 */

const MAX_ATTEMPTS_BEFORE_LOCK = 5;
const BASE_LOCK_MS = 60_000;
const MAX_LOCK_MS = 30 * 60_000;
const ID_PATTERN = /^[^/\s]{1,128}$/;

/** Secreto del HMAC de los PIN (`firebase functions:secrets:set PIN_PEPPER`).
 * Los emuladores no acceden a Secret Manager: usan un valor fijo de pruebas. */
const PIN_PEPPER = defineSecret("PIN_PEPPER");
const EMULATOR_PEPPER = "demo-numerario-pin-pepper-solo-para-emuladores";

function pepper(): string {
  let value = "";
  try {
    value = PIN_PEPPER.value();
  } catch {
    // Sin valor configurado: se decide abajo.
  }
  if (!value && process.env.FUNCTIONS_EMULATOR === "true") value = EMULATOR_PEPPER;
  if (value.length < 32) throw new HttpsError("internal", "El servicio de PIN no está configurado.");
  return value;
}

function childRef(parentId: string, childId: string) {
  return getFirestore().collection("parents").doc(parentId).collection("children").doc(childId);
}

function isParentSession(request: CallableRequest, parentId: string): boolean {
  return request.auth?.uid === parentId && request.auth.token.role !== "child";
}

/**
 * El enlace de acceso lleva una clave aleatoria que la familia genera y puede
 * rotar en Ajustes (`parents/{parentId}.deviceAccessKey`). Sin ella, conocer
 * el `parentId` —que aparece en la URL— ya no permite listar los nombres de
 * los hijos ni gastar sus intentos de PIN hasta bloquearlos.
 */
async function assertAccessKey(parentId: string, accessKey: unknown): Promise<void> {
  // Código distinto de un PIN incorrecto: la pantalla pide un enlace nuevo.
  const invalid = new HttpsError("failed-precondition", "Este enlace ya no es válido. Pide uno nuevo a tu familia.");
  if (typeof accessKey !== "string" || !ACCESS_KEY_PATTERN.test(accessKey)) throw invalid;
  const stored = (await getFirestore().collection("parents").doc(parentId).get()).data()?.deviceAccessKey;
  if (typeof stored !== "string" || !safeEqual(stored, accessKey)) throw invalid;
}

/**
 * Lista de los hijos de una familia para dibujar el selector de perfiles en
 * otro dispositivo — id, nombre y avatar incluido, nunca `pinHash`: firestore.rules no
 * puede exponer un subconjunto de campos de un documento, así que ese
 * filtrado lo hace esta función con el Admin SDK. Exige la clave del enlace.
 */
export const listChildrenPublic = onCall(async (request) => {
  const { parentId, accessKey } = (request.data ?? {}) as { parentId?: unknown; accessKey?: unknown };
  if (typeof parentId !== "string" || !ID_PATTERN.test(parentId)) {
    throw new HttpsError("invalid-argument", "Falta el identificador de la familia.");
  }
  await assertAccessKey(parentId, accessKey);

  const snap = await getFirestore().collection("parents").doc(parentId).collection("children").get();
  return {
    children: snap.docs
      .filter((d) => !d.data().deleting)
      .map((d) => {
        const data = d.data();
        const avatar = getProfileAvatar(data.avatarId);
        return { id: d.id, name: (data.name as string | undefined) ?? "", ...(avatar ? { avatarId: avatar.id } : {}) };
      }),
  };
});

/** Única vía para fijar o restablecer un PIN: el navegador nunca calcula ni
 * escribe el hash (firestore.rules lo impide), así que el secreto no sale de
 * Functions. Solo la sesión de la familia. */
export const setChildPin = onCall({ secrets: [PIN_PEPPER] }, async (request) => {
  const { parentId, childId, pin } = (request.data ?? {}) as { parentId?: unknown; childId?: unknown; pin?: unknown };
  if (
    typeof parentId !== "string" || !ID_PATTERN.test(parentId)
    || typeof childId !== "string" || !ID_PATTERN.test(childId)
    || typeof pin !== "string" || !PIN_PATTERN.test(pin)
  ) {
    throw new HttpsError("invalid-argument", "Datos inválidos.");
  }
  if (!request.auth) throw new HttpsError("unauthenticated", "Inicia sesión.");
  if (!isParentSession(request, parentId)) throw new HttpsError("permission-denied", "Solo la familia puede cambiar el PIN.");
  const secret = pepper();
  const ref = childRef(parentId, childId);
  await getFirestore().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists || snap.data()?.deleting) throw new HttpsError("not-found", "El perfil no existe.");
    tx.update(ref, {
      pinHash: pinHmac(secret, parentId, childId, pin),
      pinHashVersion: PIN_HASH_VERSION,
      pinFailCount: 0,
      pinLockedUntil: FieldValue.delete(),
    });
  });
  return { ok: true };
});

/**
 * Desde otro dispositivo (sin sesión) exige la clave del enlace y devuelve el
 * custom token del hijo. En el dispositivo de la familia (`/perfiles`) basta
 * su sesión y solo confirma el PIN: no hace falta un token infantil.
 */
export const verifyChildPin = onCall({ secrets: [PIN_PEPPER] }, async (request) => {
  const { parentId, childId, pin, accessKey } = (request.data ?? {}) as {
    parentId?: unknown;
    childId?: unknown;
    pin?: unknown;
    accessKey?: unknown;
  };
  if (
    typeof parentId !== "string" ||
    !ID_PATTERN.test(parentId) ||
    typeof childId !== "string" ||
    !ID_PATTERN.test(childId) ||
    typeof pin !== "string" ||
    !PIN_PATTERN.test(pin)
  ) {
    throw new HttpsError("invalid-argument", "Datos inválidos.");
  }
  const fromFamilyDevice = isParentSession(request, parentId);
  if (!fromFamilyDevice) await assertAccessKey(parentId, accessKey);
  const secret = pepper();

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
    const data = snap.data() as { pinHash?: string; pinHashVersion?: number; pinFailCount?: number; pinLockedUntil?: number; deleting?: boolean };
    if (data.deleting) return "incorrect";
    const now = Date.now();
    if (data.pinLockedUntil && data.pinLockedUntil > now) {
      return "locked";
    }

    const { ok, upgrade } = checkPin(data, secret, parentId, childId, pin);
    if (!ok) {
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

    tx.update(ref, {
      pinFailCount: 0,
      pinLockedUntil: FieldValue.delete(),
      // Migración perezosa del SHA-256 sin secreto al HMAC.
      ...(upgrade ? { pinHash: pinHmac(secret, parentId, childId, pin), pinHashVersion: PIN_HASH_VERSION } : {}),
    });
    return "ok";
  });

  if (outcome === "locked") {
    throw new HttpsError("resource-exhausted", "Demasiados intentos. Espera un momento e intenta de nuevo.");
  }
  if (outcome !== "ok") throw new HttpsError("permission-denied", "PIN incorrecto.");
  if (fromFamilyDevice) return { ok: true };

  const token = await getAuth().createCustomToken(childAuthUid(parentId, childId), { role: "child", parentId, childId });
  return { token };
});

export { answerCustomLesson } from "./customLessons/actions";
