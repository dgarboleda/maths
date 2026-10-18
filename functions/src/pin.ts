import { createHash, createHmac, timingSafeEqual } from "node:crypto";

/**
 * Formato del hash del PIN. La versión 1 (sin campo) era un SHA-256 sin
 * secreto calculado en el navegador: con solo 10⁴ PIN posibles, quien leyera
 * el documento lo invertía al instante. La versión 2 es un HMAC con un
 * secreto que solo conoce Functions, ligado además a la familia y al perfil,
 * de modo que el mismo PIN produce hashes distintos en cada hijo.
 */
export const PIN_HASH_VERSION = 2;
export const PIN_PATTERN = /^\d{4}$/;

export function legacyPinHash(pin: string): string {
  return createHash("sha256").update(pin, "utf8").digest("hex");
}

export function pinHmac(pepper: string, parentId: string, childId: string, pin: string): string {
  return createHmac("sha256", pepper).update(JSON.stringify([parentId, childId, pin]), "utf8").digest("hex");
}

/** Comparación en tiempo constante; nunca lanza con entradas de distinto largo. */
export function safeEqual(a: string, b: string): boolean {
  const bufA = createHash("sha256").update(a, "utf8").digest();
  const bufB = createHash("sha256").update(b, "utf8").digest();
  return timingSafeEqual(bufA, bufB);
}

export interface StoredPin {
  pinHash?: unknown;
  pinHashVersion?: unknown;
}

/** `upgrade` indica que el PIN era correcto pero estaba en el formato
 * anterior: quien llama debe reescribirlo como HMAC en la misma transacción. */
export function checkPin(
  stored: StoredPin,
  pepper: string,
  parentId: string,
  childId: string,
  pin: string,
): { ok: boolean; upgrade: boolean } {
  if (typeof stored.pinHash !== "string" || !stored.pinHash) return { ok: false, upgrade: false };
  if (stored.pinHashVersion === PIN_HASH_VERSION) {
    return { ok: safeEqual(pinHmac(pepper, parentId, childId, pin), stored.pinHash), upgrade: false };
  }
  const ok = safeEqual(legacyPinHash(pin), stored.pinHash);
  return { ok, upgrade: ok };
}

/** Clave del enlace "entrar desde otro dispositivo": 32 bytes en base64url. */
export const ACCESS_KEY_PATTERN = /^[A-Za-z0-9_-]{43}$/;
