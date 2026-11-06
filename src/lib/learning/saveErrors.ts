/** Códigos de `HttpsError` que dependen del estado guardado, no de la red:
 *  reenviar la misma operación no puede tener éxito. */
const PERMANENT_CODES = new Set([
  "failed-precondition",
  "aborted",
  "already-exists",
  "invalid-argument",
  "permission-denied",
  "unauthenticated",
  "not-found",
]);
export function isRetryable(err: unknown): boolean {
  const code =
    err && typeof err === "object" && "code" in err && typeof err.code === "string"
      ? err.code.replace(/^functions\//, "")
      : "";
  return !PERMANENT_CODES.has(code);
}
