export type ErrorContext = "root" | "panel" | "editor" | "jugar";

let reportsSent = 0;
const reported = new WeakSet<object>();

/**
 * Punto ÚNICO de salida de errores no manejados de la app — Fase 23
 * (docs/plan-salto-producto.md §1.3). Hoy solo deja un `console.error` con
 * forma estable; el día que haya un servicio real de registro (Sentry o el
 * que sea) se cambia acá y en ningún otro archivo — por eso cada `error.tsx`
 * y cada `.catch()` nuevo pasa por acá en vez de llamar a `console.error`
 * directo.
 */
export function reportError(error: unknown, context: ErrorContext, extra?: Record<string, unknown>): void {
  console.error(`[${context}]`, error, extra ?? "");
  if (typeof window === "undefined" || process.env.NODE_ENV !== "production" || reportsSent >= 10) return;
  if (typeof error === "object" && error !== null) {
    if (reported.has(error)) return;
    reported.add(error);
  }
  reportsSent++;
  const details = error as { name?: unknown; code?: unknown; digest?: unknown } | null;
  // No se transmiten mensajes, stacks, URLs, nombres, ids de hijos ni extra.
  const safe = (value: unknown) => typeof value === "string" && /^[a-zA-Z0-9_./-]{1,80}$/.test(value) ? value : undefined;
  void fetch("/api/telemetry", {
    method: "POST", headers: { "Content-Type": "application/json" }, keepalive: true,
    body: JSON.stringify({ context, name: safe(details?.name) ?? "Error", code: safe(details?.code), digest: safe(details?.digest) }),
  }).catch(() => {});
}
