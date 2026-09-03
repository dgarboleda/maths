/**
 * Siluetas de los edificios del mundo. Son SVG sin dependencias, pensados
 * para sustituirse más adelante por ilustración profesional: el resto del
 * mundo solo depende de `variant`, `accent` y `lit`.
 */
export type BuildingVariant =
  | "energia"
  | "laboratorio"
  | "construccion"
  | "control"
  | "misterio"
  | "central"
  | "tienda";

/** Ventanas encendidas en proporción al avance real de la zona (0-1). */
function Windows({ lit, rows, cols, x, y, w, h }: { lit: number; rows: number; cols: number; x: number; y: number; w: number; h: number }) {
  const cells = [];
  const total = rows * cols;
  const onCount = Math.round(lit * total);
  for (let i = 0; i < total; i++) {
    const r = Math.floor(i / cols);
    const c = i % cols;
    cells.push(
      <rect
        key={i}
        x={x + c * (w + 3)}
        y={y + r * (h + 3)}
        width={w}
        height={h}
        rx={1}
        fill={i < onCount ? "#fde68a" : "#1e293b"}
        opacity={i < onCount ? 0.95 : 0.8}
      />,
    );
  }
  return <>{cells}</>;
}

export function BuildingArt({
  variant,
  accent,
  lit = 0,
  className = "",
}: {
  variant: BuildingVariant;
  accent: string;
  lit?: number;
  className?: string;
}) {
  const glow = lit > 0 ? Math.min(0.25 + lit * 0.55, 0.8) : 0.18;

  return (
    <svg viewBox="0 0 100 110" className={className} aria-hidden="true">
      {/* halo de la zona */}
      <ellipse cx="50" cy="100" rx="46" ry="10" fill={accent} opacity={glow * 0.5} />

      {variant === "energia" && (
        <>
          <path d="M22 100V52l14-10 14 10v48Z" fill="#1e293b" stroke={accent} strokeWidth="2" />
          <path d="M56 100V38c0-6 5-10 11-10s11 4 11 10v62Z" fill="#0f172a" stroke={accent} strokeWidth="2" />
          <Windows lit={lit} rows={4} cols={2} x={28} y={58} w={7} h={6} />
          <circle cx="67" cy="46" r="7" fill={accent} opacity={0.25 + lit * 0.6} />
          <path d="M67 40v12M62 46h10" stroke={accent} strokeWidth="2.5" strokeLinecap="round" />
        </>
      )}

      {variant === "laboratorio" && (
        <>
          <rect x="20" y="58" width="60" height="42" rx="3" fill="#1e293b" stroke={accent} strokeWidth="2" />
          <path d="M28 58a22 22 0 0 1 44 0Z" fill="#0f172a" stroke={accent} strokeWidth="2" />
          <circle cx="50" cy="48" r="6" fill={accent} opacity={0.3 + lit * 0.6} />
          <Windows lit={lit} rows={3} cols={4} x={27} y={66} w={8} h={6} />
        </>
      )}

      {variant === "construccion" && (
        <>
          <rect x="16" y="62" width="46" height="38" rx="2" fill="#1e293b" stroke={accent} strokeWidth="2" />
          <path d="M70 100V28h4v72Z" fill="#0f172a" stroke={accent} strokeWidth="2" />
          <path d="M72 32h22M94 32v10" stroke={accent} strokeWidth="2.5" strokeLinecap="round" />
          <rect x="88" y="42" width="12" height="9" rx="1.5" fill={accent} opacity={0.35 + lit * 0.5} />
          <Windows lit={lit} rows={3} cols={4} x={22} y={68} w={8} h={7} />
        </>
      )}

      {variant === "control" && (
        <>
          <path d="M32 100 40 48h20l8 52Z" fill="#1e293b" stroke={accent} strokeWidth="2" />
          <rect x="34" y="36" width="32" height="14" rx="4" fill="#0f172a" stroke={accent} strokeWidth="2" />
          <path d="M50 36V22" stroke={accent} strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="50" cy="19" r="4" fill={accent} opacity={0.4 + lit * 0.5} />
          <path d="M40 28a14 14 0 0 1 20 0" stroke={accent} strokeWidth="2" fill="none" opacity={0.3 + lit * 0.6} />
          <Windows lit={lit} rows={3} cols={3} x={38} y={56} w={7} h={6} />
        </>
      )}

      {variant === "misterio" && (
        <>
          <rect x="24" y="46" width="52" height="54" rx="2" fill="#1e293b" stroke={accent} strokeWidth="2" />
          <path d="M20 46 50 26l30 20Z" fill="#0f172a" stroke={accent} strokeWidth="2" />
          <circle cx="50" cy="60" r="9" fill="#0f172a" stroke={accent} strokeWidth="2" />
          <path d="M50 55v5l4 3" stroke={accent} strokeWidth="2" strokeLinecap="round" fill="none" />
          <Windows lit={lit} rows={2} cols={4} x={30} y={78} w={8} h={7} />
        </>
      )}

      {variant === "central" && (
        <>
          <path d="M14 100V44l18-14 18 14v56Z" fill="#0f172a" stroke={accent} strokeWidth="2.5" />
          <path d="M52 100V56c0-8 6-14 14-14s14 6 14 14v44Z" fill="#1e293b" stroke={accent} strokeWidth="2.5" />
          <path d="M66 34l-8 16h10l-8 16" stroke="#fbbf24" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" opacity={0.5 + lit * 0.5} />
          <Windows lit={lit} rows={4} cols={3} x={19} y={52} w={7} h={6} />
        </>
      )}

      {variant === "tienda" && (
        <>
          <rect x="20" y="56" width="60" height="44" rx="3" fill="#1e293b" stroke={accent} strokeWidth="2" />
          <path d="M14 56 50 34l36 22Z" fill="#0f172a" stroke={accent} strokeWidth="2" />
          <path d="M20 62h60v10H20Z" fill={accent} opacity="0.6" />
          <rect x="42" y="76" width="16" height="24" rx="2" fill="#0f172a" stroke={accent} strokeWidth="1.5" />
        </>
      )}
    </svg>
  );
}
