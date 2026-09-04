export type CharacterPose = "idle" | "walk" | "jump" | "celebrate" | "interact" | "think";

const POSE_SRC: Record<CharacterPose, string> = {
  idle: "/illustrations/alex-idle.webp",
  walk: "/illustrations/alex-walk.webp",
  jump: "/illustrations/alex-jump.webp",
  celebrate: "/illustrations/alex-celebrate.webp",
  interact: "/illustrations/alex-interact.webp",
  think: "/illustrations/alex-think.webp",
};

/**
 * Alex, el personaje de Math Quest. Ilustración fija (sin personalización de
 * color): cada `pose` es una imagen real, no un SVG paramétrico. `object-fit:
 * contain` evita deformar el dibujo aunque cada pose tenga proporciones
 * distintas (una corrida es más ancha que la postura de reposo).
 */
export function Avatar({
  pose = "idle",
  className = "",
  title,
}: {
  pose?: CharacterPose;
  className?: string;
  title?: string;
}) {
  return (
    <img
      src={POSE_SRC[pose]}
      alt={title ?? ""}
      className={`object-contain object-bottom ${className}`}
    />
  );
}
