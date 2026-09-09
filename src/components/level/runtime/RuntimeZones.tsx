import type { LevelZone } from "@/lib/level/schema";

/**
 * Zonas de disparo — invisibles en juego real (son áreas lógicas, no
 * escenografía; lo que se VE al entrar es la consecuencia narrativa de su
 * evento, no la zona en sí). Solo se dibujan con `debug=1` en la URL, mismo
 * criterio que `walkDebug` de `QuestScene.tsx:135-139` para el polígono
 * caminable.
 */
export function RuntimeZones({ zones, debug }: { zones: LevelZone[]; debug: boolean }) {
  if (!debug) return null;
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 z-10 size-full">
      {zones.map((zone) =>
        zone.shape.kind === "circle" ? (
          <circle key={zone.id} cx={zone.shape.center.x} cy={zone.shape.center.y} r={zone.shape.radius} fill="rgba(167,139,250,0.15)" stroke="#a78bfa" strokeWidth="0.3" strokeDasharray="0.8 0.8" />
        ) : (
          <polygon key={zone.id} points={zone.shape.points.map((p) => `${p.x},${p.y}`).join(" ")} fill="rgba(167,139,250,0.15)" stroke="#a78bfa" strokeWidth="0.3" strokeDasharray="0.8 0.8" />
        ),
      )}
    </svg>
  );
}
