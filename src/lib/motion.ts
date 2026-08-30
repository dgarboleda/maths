/** Respeta la preferencia del sistema "reducir movimiento" (WCAG 2.3.3). */
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
