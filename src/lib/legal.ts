import { getFirebaseFunctions } from "./firebase";

/** Versión vigente de privacidad y términos. Debe coincidir con
 * `functions/src/legalVersion.ts` (lo comprueba `legal.test.ts`). Cambiarla
 * hace que cada familia vuelva a aceptar en `LegalConsentGate`. */
export const LEGAL_VERSION = "2026-11-01";

export function hasCurrentConsent(parent: { legalConsent?: { version?: unknown } } | undefined): boolean {
  return parent?.legalConsent?.version === LEGAL_VERSION;
}

/** El consentimiento lo registra Functions con hora del servidor:
 * firestore.rules no deja que el navegador escriba `legalConsent`. */
export async function acceptLegalTerms(): Promise<void> {
  const { functions, functionsFns } = await getFirebaseFunctions();
  await functionsFns.httpsCallable(functions, "acceptLegalTerms")({ version: LEGAL_VERSION });
}

/**
 * Mensaje para la familia cuando `acceptLegalTerms` falla. Distingue la causa
 * (antes todo decía "revisa la conexión") y deja el código visible para poder
 * diagnosticar desde una captura. Un callable que aún no está desplegado llega
 * al navegador como `functions/internal` (la respuesta 404 no trae CORS).
 */
export function acceptLegalTermsErrorMessage(err: unknown): string {
  const raw = (err as { code?: unknown } | null)?.code;
  const code = typeof raw === "string" ? raw.replace(/^functions\//, "") : "";
  const message = (err as { message?: unknown } | null)?.message;
  switch (code) {
    case "failed-precondition":
      return typeof message === "string" && message ? message : "Los textos legales cambiaron. Recarga la página.";
    case "unauthenticated":
    case "permission-denied":
      return "Tu sesión no es válida para aceptar. Cierra sesión y vuelve a entrar.";
    case "unavailable":
    case "deadline-exceeded":
      return "No hay conexión con el servidor. Revisa la conexión e inténtalo de nuevo.";
    default:
      return `El servidor no pudo guardar tu aceptación${code ? ` (${code})` : ""}. Inténtalo más tarde; si se repite, avísanos.`;
  }
}

/** Borra la cuenta familiar completa. Exige haber reautenticado hace poco. */
export async function deleteFamilyAccount(): Promise<void> {
  const { functions, functionsFns } = await getFirebaseFunctions();
  await functionsFns.httpsCallable(functions, "deleteAccount", { timeout: 300_000 })({});
}
