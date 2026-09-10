export type ErrorContext = "root" | "panel" | "editor" | "jugar";

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
}
