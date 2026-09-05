const LIGHTS = [
  { x: 12, y: 10 },
  { x: 88, y: 14 },
  { x: 22, y: 28 },
  { x: 78, y: 32 },
  { x: 50, y: 8 },
];

const EMBERS = [
  { x: 18, y: 92 },
  { x: 46, y: 96 },
  { x: 74, y: 90 },
  { x: 62, y: 98 },
];

const MOTES = [
  { x: 30, y: 20 },
  { x: 65, y: 24 },
  { x: 10, y: 40 },
  { x: 90, y: 44 },
  { x: 40, y: 12 },
];

/**
 * Vida ambiental para las zonas fuera de Ciudad Central: niebla, luces que
 * titilan y motas de AXIA/brasas que suben — mismas animaciones CSS que
 * `SceneFx` (Ciudad Central), pero en posiciones genéricas en vez de atadas
 * a un mapa isométrico concreto, porque estos fondos son ambientación sin
 * correspondencia con la posición de los objetos (ver ZoneScene.tsx). Todo
 * decorativo (`aria-hidden`), no lee ni afecta ningún estado real.
 */
export function ZoneSceneFx() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      {LIGHTS.map((l, i) => (
        <span
          key={`light-${l.x}-${l.y}`}
          className="anim-flicker absolute size-7 -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-300/25 blur-md"
          style={{
            left: `${l.x}%`,
            top: `${l.y}%`,
            animationDelay: `${i * 0.8}s`,
            animationDuration: `${2.6 + (i % 3) * 0.9}s`,
          }}
        />
      ))}

      {MOTES.map((m, i) => (
        <span
          key={`mote-${m.x}-${m.y}`}
          className="anim-firefly absolute size-1.5 rounded-full bg-cyan-300/70"
          style={{
            left: `${m.x}%`,
            top: `${m.y}%`,
            animationDelay: `${i * 1.4}s`,
            animationDuration: `${6 + (i % 4)}s`,
          }}
        />
      ))}

      {EMBERS.map((e, i) => (
        <span
          key={`ember-${e.x}-${e.y}`}
          className="anim-smoke absolute size-3 rounded-full bg-amber-400/40 blur-[2px]"
          style={{ left: `${e.x}%`, top: `${e.y}%`, animationDelay: `${i * 2.3}s` }}
        />
      ))}
    </div>
  );
}
