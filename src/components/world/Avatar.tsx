/**
 * Personaje del alumno: los mismos assets del prototipo de referencia
 * (`src/assets/explorer.png` para la escena, `avatar.png` para el HUD/las
 * fichas), no una recreación propia. `variant="explorer"` es el cuerpo
 * completo que camina en Ciudad Central (con el mismo bob de reposo/
 * caminata que `Player.tsx` del prototipo); `variant="headshot"` es el
 * retrato compacto que usan el HUD, la lista de perfiles y el panel.
 *
 * `bodySrc`/`headshotSrc`/`scale` son opcionales — Fase 19
 * (docs/level-editor-plan-v2.md §6.2): sin ellos, byte a byte el mismo
 * comportamiento de siempre (mismo patrón "props opcionales que preservan
 * el default" ya usado con `PuzzleOverlay`). Los pasa `useResolvedAvatar`
 * cuando el padre eligió un avatar personalizado del catálogo del Mundo.
 */
export function Avatar({
  variant = "headshot",
  walking = false,
  className = "",
  title,
  bodySrc,
  headshotSrc,
  scale = 1,
}: {
  variant?: "explorer" | "headshot";
  /** Solo aplica a variant="explorer": alterna el bob de reposo/caminata. */
  walking?: boolean;
  className?: string;
  title?: string;
  bodySrc?: string;
  headshotSrc?: string;
  scale?: number;
}) {
  const src = variant === "explorer" ? (bodySrc ?? "/illustrations/explorer.webp") : (headshotSrc ?? "/illustrations/avatar.webp");
  const animClass = variant === "explorer" ? (walking ? "anim-walk" : "anim-idle") : "";

  // `bodySrc`/`headshotSrc` puede ser un avatar subido por el padre (Firebase
  // Storage, Fase 19), sin ancho/alto conocidos de antemano, y este
  // componente se usa con decenas de tamaños distintos vía `className`
  // (h-16, size-11, size-14...) — `next/image` exige `width`/`height` o
  // `fill`, ninguno de los dos es válido para todos los llamadores a la vez.
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={title ?? ""}
      className={`${animClass} object-contain object-bottom ${className}`}
      style={scale !== 1 ? { transform: `scale(${scale})` } : undefined}
    />
  );
}
