import Image from "next/image";
import type { WorldFlags } from "@/lib/world/questScene";

const LAMPS = [
  { x: 48.3, y: 33.8 },
  { x: 27.4, y: 52.3 },
  { x: 36.8, y: 70.6 },
  { x: 47.2, y: 77.2 },
  { x: 64.6, y: 56.4 },
  { x: 61.6, y: 88.2 },
  { x: 71.4, y: 87.2 },
  { x: 92.4, y: 57.4 },
];

const FIREFLIES = [
  { x: 12, y: 64 },
  { x: 20, y: 60 },
  { x: 41, y: 66 },
  { x: 58, y: 70 },
  { x: 66, y: 45 },
  { x: 77, y: 63 },
  { x: 87, y: 72 },
];

const PLANT_WINDOWS = [
  { x: 22.5, y: 33 },
  { x: 26, y: 34.5 },
  { x: 29.5, y: 33.5 },
  { x: 33.5, y: 30.5 },
];

/**
 * Capa de vida de Ciudad Central: niebla, farolas, fuente, humo, luciérnagas
 * y los brillos de terminal/medidor/compuerta/ciudad restaurada. Todo
 * decorativo (`aria-hidden`); los estados llegan ya derivados de
 * `worldFlags(step)` — no hay ningún progreso paralelo aquí.
 */
export function SceneFx({ terminalOn, medidorListo, compuertaVisible, cityRestored }: WorldFlags) {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      <div
        className="anim-fog absolute top-[6%] h-40 rounded-full bg-violet-500/10 blur-3xl"
        style={{ left: "-10%", right: "-10%", animationDuration: "26s" }}
      />
      <div
        className="anim-fog absolute bottom-[4%] h-44 rounded-full bg-cyan-400/10 blur-3xl"
        style={{ left: "-10%", right: "-10%", animationDuration: "34s", animationDelay: "-9s" }}
      />

      {/* fuente de la plaza */}
      <span
        className="anim-shimmer absolute size-28 -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-400/25 blur-xl"
        style={{ left: "48.3%", top: "57.5%" }}
      />
      <span
        className="anim-shimmer absolute size-10 -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-400/40 blur-md"
        style={{ left: "48.3%", top: "52.5%", animationDelay: "-1.6s" }}
      />

      {LAMPS.map((l, i) => (
        <span
          key={`${l.x}-${l.y}`}
          className="anim-flicker absolute size-8 -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-400/30 blur-md"
          style={{
            left: `${l.x}%`,
            top: `${l.y}%`,
            animationDelay: `${i * 0.7}s`,
            animationDuration: `${2.6 + (i % 3) * 0.9}s`,
          }}
        />
      ))}

      {FIREFLIES.map((f, i) => (
        <span
          key={`${f.x}-${f.y}`}
          className="anim-firefly absolute size-1.5 rounded-full bg-cyan-300/80"
          style={{
            left: `${f.x}%`,
            top: `${f.y}%`,
            animationDelay: `${i * 1.3}s`,
            animationDuration: `${6 + (i % 4)}s`,
          }}
        />
      ))}

      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="anim-smoke absolute size-6 rounded-full bg-white/10 blur-md"
          style={{ left: `${55 + i * 1.4}%`, top: "8.5%", animationDelay: `${i * 2.1}s` }}
        />
      ))}

      {/* Dra. Nia junto a la fuente */}
      <div className="absolute -translate-x-1/2 -translate-y-full" style={{ left: "49%", top: "63.5%" }}>
        <span className="absolute bottom-0 left-1/2 h-2.5 w-12 -translate-x-1/2 rounded-full bg-black/40 blur-sm" />
        <Image
          src="/illustrations/nia-standing.webp"
          alt=""
          width={768}
          height={1280}
          className="anim-idle relative h-[11vh] max-h-28 min-h-14 w-auto select-none"
          style={{ animationDelay: "-1.2s" }}
        />
      </div>

      {/* terminal: apagada parpadea, activa respira en cian */}
      <span
        className={`absolute size-9 -translate-x-1/2 -translate-y-1/2 rounded-full blur-md transition-colors duration-700 ${
          terminalOn ? "anim-breathe bg-cyan-400/70" : "anim-flicker bg-cyan-400/25"
        }`}
        style={{ left: "26%", top: "45.5%" }}
      />

      {/* medidor: se enciende cuando ya se leyó */}
      <span
        className={`absolute h-16 w-8 -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-400/50 blur-lg transition-opacity duration-1000 ${
          medidorListo ? "anim-breathe opacity-90" : "opacity-0"
        }`}
        style={{ left: "33%", top: "36%" }}
      />

      {/* compuerta/núcleo del reactor: latido débil al revelarse, pleno al restaurar */}
      <span
        className={`absolute size-16 -translate-x-1/2 -translate-y-1/2 rounded-full blur-xl transition-all duration-1000 ${
          cityRestored
            ? "anim-breathe bg-amber-300/60 opacity-100"
            : compuertaVisible
              ? "animate-[worldPulse_2.4s_ease-in-out_infinite] bg-amber-400/30 opacity-80"
              : "bg-amber-400/20 opacity-0"
        }`}
        style={{ left: "27%", top: "24%" }}
      />

      {/* ciudad restaurada: baño cálido + ventanas de la central encendidas */}
      <div
        className={`absolute inset-0 transition-opacity duration-1000 ${cityRestored ? "opacity-100" : "opacity-0"}`}
      >
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(45% 40% at 27% 26%, rgba(251,191,36,0.24) 0%, transparent 70%)",
          }}
        />
        {PLANT_WINDOWS.map((w, i) => (
          <span
            key={`${w.x}-${w.y}`}
            className="anim-flicker absolute size-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-300/60 blur-[3px]"
            style={{ left: `${w.x}%`, top: `${w.y}%`, animationDelay: `${i * 0.4}s` }}
          />
        ))}
        {[0, 1].map((i) => (
          <span
            key={i}
            className="anim-smoke absolute size-5 rounded-full bg-amber-300/20 blur-md"
            style={{ left: `${24 + i * 3.2}%`, top: "10%", animationDelay: `${i * 2.6}s` }}
          />
        ))}
        <div className="absolute inset-0 bg-amber-400/5" />
      </div>
    </div>
  );
}
