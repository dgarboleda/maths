import type { AvatarLook } from "@/lib/world/avatar";

/**
 * Personaje del jugador. SVG puro y sin dependencias: se puede sustituir más
 * adelante por una ilustración profesional sin tocar nada de la lógica, porque
 * solo recibe `look`.
 */
export function Avatar({
  look,
  className = "",
  title,
}: {
  look: AvatarLook;
  className?: string;
  title?: string;
}) {
  return (
    <svg viewBox="0 0 40 56" className={className} role="img" aria-label={title ?? "Tu personaje"}>
      {/* sombra */}
      <ellipse cx="20" cy="53" rx="11" ry="2.5" fill="#000" opacity="0.35" />
      {/* piernas */}
      <rect x="14" y="38" width="5" height="13" rx="2.5" fill="#1e293b" />
      <rect x="21" y="38" width="5" height="13" rx="2.5" fill="#1e293b" />
      {/* cuerpo */}
      <rect x="11" y="22" width="18" height="18" rx="6" fill={look.outfit} />
      <rect x="11" y="22" width="18" height="6" rx="3" fill="#ffffff" opacity="0.18" />
      {/* brazos */}
      <rect x="6" y="23" width="5" height="13" rx="2.5" fill={look.outfit} />
      <rect x="29" y="23" width="5" height="13" rx="2.5" fill={look.outfit} />
      <circle cx="8.5" cy="37" r="2.6" fill={look.skin} />
      <circle cx="31.5" cy="37" r="2.6" fill={look.skin} />
      {/* cabeza */}
      <circle cx="20" cy="14" r="9" fill={look.skin} />
      {/* pelo */}
      <path d="M11 13a9 9 0 0 1 18 0c0-4-3-6-9-6s-9 2-9 6Z" fill={look.hair} />
      {/* ojos */}
      <circle cx="16.6" cy="15" r="1.4" fill="#0f172a" />
      <circle cx="23.4" cy="15" r="1.4" fill="#0f172a" />
      {/* accesorios */}
      {look.accessory === "casco" && (
        <>
          <path d="M10 14a10 10 0 0 1 20 0Z" fill="#f59e0b" />
          <rect x="9" y="13" width="22" height="2.6" rx="1.3" fill="#fbbf24" />
        </>
      )}
      {look.accessory === "gorra" && (
        <>
          <path d="M11 12a9 9 0 0 1 18 0Z" fill="#0ea5e9" />
          <rect x="27" y="11" width="8" height="2.4" rx="1.2" fill="#0284c7" />
        </>
      )}
      {look.accessory === "visor" && (
        <rect x="10" y="12.4" width="20" height="5" rx="2.5" fill="#22d3ee" opacity="0.75" />
      )}
    </svg>
  );
}
