/**
 * Personaje del alumno: los mismos assets del prototipo de referencia
 * (`src/assets/explorer.png` para la escena, `avatar.png` para el HUD/las
 * fichas), no una recreación propia. `variant="explorer"` es el cuerpo
 * completo que camina en Ciudad Central (con el mismo bob de reposo/
 * caminata que `Player.tsx` del prototipo); `variant="headshot"` es el
 * retrato compacto que usan el HUD, la lista de perfiles y el panel.
 */
export function Avatar({
  variant = "headshot",
  walking = false,
  className = "",
  title,
}: {
  variant?: "explorer" | "headshot";
  /** Solo aplica a variant="explorer": alterna el bob de reposo/caminata. */
  walking?: boolean;
  className?: string;
  title?: string;
}) {
  const src = variant === "explorer" ? "/illustrations/explorer.webp" : "/illustrations/avatar.webp";
  const animClass = variant === "explorer" ? (walking ? "anim-walk" : "anim-idle") : "";

  return (
    <img
      src={src}
      alt={title ?? ""}
      className={`${animClass} object-contain object-bottom ${className}`}
    />
  );
}
