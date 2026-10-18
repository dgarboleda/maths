import { getFirebaseFunctions } from "./firebase";

/**
 * El PIN nunca se calcula ni se compara en el navegador: Functions guarda un
 * HMAC con un secreto propio (functions/src/pin.ts) y es la única que puede
 * escribirlo (firestore.rules). Estas funciones solo envuelven los callables.
 */
export async function setChildPin(parentId: string, childId: string, pin: string): Promise<void> {
  const { functions, functionsFns } = await getFirebaseFunctions();
  await functionsFns.httpsCallable(functions, "setChildPin")({ parentId, childId, pin });
}

export type PinCheck = "ok" | "incorrect" | "locked";

/** Comprueba el PIN dentro de la sesión de la familia (dispositivo compartido). */
export async function confirmChildPin(parentId: string, childId: string, pin: string): Promise<PinCheck> {
  const { functions, functionsFns } = await getFirebaseFunctions();
  try {
    await functionsFns.httpsCallable(functions, "verifyChildPin")({ parentId, childId, pin });
    return "ok";
  } catch (err) {
    const code = (err as { code?: string })?.code;
    if (code === "functions/permission-denied") return "incorrect";
    if (code === "functions/resource-exhausted") return "locked";
    throw err;
  }
}

/** Clave aleatoria del enlace de acceso: 32 bytes en base64url (43 caracteres). */
export function newAccessKey(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** La clave va en el fragmento (`#k=`): el navegador no lo envía al servidor,
 * así que no queda en registros de acceso ni en cabeceras Referer. */
export function deviceAccessLink(origin: string, parentId: string, accessKey: string): string {
  return `${origin}/entrar/${encodeURIComponent(parentId)}#k=${accessKey}`;
}

export function accessKeyFromHash(hash: string): string | null {
  const key = new URLSearchParams(hash.replace(/^#/, "")).get("k");
  return key && /^[A-Za-z0-9_-]{43}$/.test(key) ? key : null;
}
