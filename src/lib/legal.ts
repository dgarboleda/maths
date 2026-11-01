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

/** Borra la cuenta familiar completa. Exige haber reautenticado hace poco. */
export async function deleteFamilyAccount(): Promise<void> {
  const { functions, functionsFns } = await getFirebaseFunctions();
  await functionsFns.httpsCallable(functions, "deleteAccount", { timeout: 300_000 })({});
}
