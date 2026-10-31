"use client";

import { useRef, useState } from "react";
import { useGameLoop } from "@/lib/minigames/useGameLoop";

type Encounter = { lane: number; kind: "meteor" | "fuel" };
const EVENTS: readonly Encounter[] = [
  { lane: 1, kind: "meteor" }, { lane: 0, kind: "fuel" },
  { lane: 2, kind: "meteor" }, { lane: 1, kind: "fuel" },
  { lane: 0, kind: "meteor" }, { lane: 2, kind: "fuel" },
];

/** Desafío opcional de reflejos: no conoce ni envía respuestas matemáticas. */
export function OrbitalManeuver({ paused, round, onBonus }: {
  paused: boolean;
  round: number;
  onBonus: (points: number) => void;
}) {
  const [active, setActive] = useState(false);
  const [lane, setLane] = useState(1);
  const [index, setIndex] = useState(0);
  const [shield, setShield] = useState(3);
  const [notice, setNotice] = useState("Elige tu ruta y esquiva los meteoritos.");
  const laneRef = useRef(1);
  const indexRef = useRef(0);
  const shieldRef = useRef(3);
  const elapsed = useRef(0);
  const duration = Math.max(1100, 2000 - Math.min(round, 6) * 120);

  function start() {
    laneRef.current = 1;
    indexRef.current = 0;
    shieldRef.current = 3;
    elapsed.current = 0;
    setLane(1); setIndex(0); setShield(3);
    setNotice("¡Maniobra iniciada! Cambia de ruta antes de que llegue el objeto.");
    setActive(true);
  }
  function move(next: number) {
    if (!active || paused) return;
    laneRef.current = next;
    setLane(next);
  }
  useGameLoop((dt) => {
    elapsed.current += dt;
    if (elapsed.current < duration) return;
    elapsed.current -= duration;
    const event = EVENTS[indexRef.current];
    const sameLane = event.lane === laneRef.current;
    if (event.kind === "meteor" && sameLane) {
      shieldRef.current--;
      setShield(shieldRef.current);
      setNotice("¡Impacto! El escudo perdió una unidad. No afecta tu respuesta.");
    } else if (event.kind === "fuel" && sameLane) {
      onBonus(50);
      setNotice("¡Cápsula recogida! +50 puntos de juego.");
    } else if (event.kind === "meteor") {
      onBonus(20);
      setNotice("¡Meteorito esquivado! +20 puntos de juego.");
    } else setNotice("La cápsula pasó de largo.");
    indexRef.current++;
    setIndex(indexRef.current);
    if (indexRef.current >= EVENTS.length || shieldRef.current <= 0) setActive(false);
  }, { running: active && !paused });

  const encounter = EVENTS[index];
  return (
    <section className="rounded-2xl border border-cyan-700 bg-slate-950 p-4 text-left" aria-label="Maniobra orbital opcional">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-bold text-cyan-100">Maniobra orbital</h3>
        <span className="text-sm text-slate-200">Escudo: {shield}/3</span>
      </div>
      <p className="mt-1 text-sm text-slate-300">Esquiva meteoritos y recoge cápsulas. Esta maniobra no responde la pregunta.</p>
      {active && encounter ? <>
        <div className="mt-3 grid grid-cols-3 gap-2" role="group" aria-label="Rutas del cohete">
          {[0, 1, 2].map((n) => <button key={n} type="button" onClick={() => move(n)} disabled={paused}
            aria-label={`Ruta ${n + 1}${encounter.lane === n ? encounter.kind === "meteor" ? ": meteorito" : ": cápsula" : ""}`}
            aria-pressed={lane === n}
            className={`min-h-16 rounded-xl border-2 p-2 text-center text-lg ${lane === n ? "border-cyan-200 bg-cyan-900" : "border-slate-600 bg-slate-900"}`}>
            <span aria-hidden="true">{encounter.lane === n ? encounter.kind === "meteor" ? "☄️" : "🟡" : "·"} {lane === n ? "🚀" : ""}</span>
            <span className="block text-xs">Ruta {n + 1}</span>
          </button>)}
        </div>
        <p className="mt-2 text-xs text-cyan-100">{encounter.kind === "meteor" ? "Meteorito" : "Cápsula"} en la ruta {encounter.lane + 1} · {index + 1}/{EVENTS.length}</p>
      </> : <button type="button" onClick={start} disabled={paused} className="mt-3 min-h-11 rounded-xl bg-cyan-300 px-4 font-bold text-slate-950 disabled:opacity-50">{index ? "Repetir maniobra" : "Iniciar maniobra"}</button>}
      <p role="status" className="mt-2 text-sm text-cyan-100">{notice}</p>
    </section>
  );
}
