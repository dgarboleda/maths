"use client";

import type { ReactNode } from "react";
import type { PracticeGame } from "@/lib/minigames/lessonExercise";
import { levelPerks, MAX_LEVEL, useArcadeLevel } from "@/lib/minigames/arcadeLevel";

/** Ilustraciones propias: sin descargas, fuentes de emoji ni peticiones externas. */
const ART = {
  ship: <><path fill="#fb923c" d="m24 45 8 17 8-17Z"/><path fill="#a5f3fc" d="M32 3 8 48l17-6h14l17 6Z"/><path fill="#0891b2" d="m32 3-7 39h14Z"/><circle cx="32" cy="27" r="7" fill="#0f172a"/><circle cx="30" cy="25" r="3" fill="#67e8f9"/></>,
  alien: <><path d="m20 16-5-9m29 9 5-9" stroke="#c4b5fd" strokeWidth="4" strokeLinecap="round"/><path fill="#8b5cf6" d="M12 17h40v10h8v21H4V27h8Z"/><path fill="#c4b5fd" d="M12 17h40v9H12Z"/><path d="M12 48v8m40-8v8" stroke="#a78bfa" strokeWidth="7"/><path fill="#0f172a" d="M17 29h10v9H17zm20 0h10v9H37Z"/><path fill="#e0f2fe" d="M17 29h4v4h-4zm20 0h4v4h-4Z"/></>,
  frog: <><ellipse cx="32" cy="49" rx="27" ry="11" fill="#166534"/><ellipse cx="32" cy="36" rx="24" ry="20" fill="#4ade80"/><circle cx="18" cy="18" r="12" fill="#86efac"/><circle cx="46" cy="18" r="12" fill="#86efac"/><circle cx="18" cy="17" r="7" fill="white"/><circle cx="46" cy="17" r="7" fill="white"/><circle cx="20" cy="17" r="4" fill="#0f172a"/><circle cx="44" cy="17" r="4" fill="#0f172a"/><path d="M22 38q10 10 20 0" fill="none" stroke="#14532d" strokeWidth="3" strokeLinecap="round"/></>,
  crocodile: <><path fill="#15803d" d="m3 43 9-17 6 7 9-15 7 11 7-8 7 12 13 7-6 14H16Z"/><path fill="#86efac" d="M11 40h48l-4 14H16Z"/><circle cx="43" cy="30" r="7" fill="#bbf7d0"/><circle cx="45" cy="29" r="3" fill="#0f172a"/><path fill="white" d="m24 40 3 6 3-6Zm12 0 3 6 3-6Zm12 0 3 6 3-6Z"/></>,
  car: <><path fill="#fb7185" d="M4 31h10l9-13h22l10 13 7 5v15H3V36Z"/><path fill="#be123c" d="M3 41h59v10H3Z"/><path fill="#a5f3fc" d="m27 22-7 10h27l-6-10Z"/><path d="M33 22v10" stroke="#0f172a" strokeWidth="3"/><circle cx="16" cy="51" r="9" fill="#0f172a"/><circle cx="50" cy="51" r="9" fill="#0f172a"/><circle cx="16" cy="51" r="4" fill="#94a3b8"/><circle cx="50" cy="51" r="4" fill="#94a3b8"/><path fill="#fef08a" d="M55 35h7v7h-7Z"/></>,
  explorer: <><circle cx="32" cy="32" r="27" fill="#facc15"/><path fill="#ca8a04" d="M6 36a27 27 0 0 0 52 0c-12 13-39 13-52 0"/><path fill="#0f172a" d="M22 20h8v13h-8zm16 0h8v13h-8Z"/><path d="M24 43q10 8 20-2" fill="none" stroke="#713f12" strokeWidth="3" strokeLinecap="round"/></>,
  ghost: <><path fill="#c4b5fd" d="M7 59V29a25 25 0 0 1 50 0v30l-9-7-8 7-8-7-8 7-8-7Z"/><ellipse cx="23" cy="29" rx="8" ry="10" fill="white"/><ellipse cx="43" cy="29" rx="8" ry="10" fill="white"/><circle cx="21" cy="30" r="4" fill="#312e81"/><circle cx="41" cy="30" r="4" fill="#312e81"/><path d="M27 45h10" stroke="#7c3aed" strokeWidth="3" strokeLinecap="round"/></>,
  mole: <><circle cx="12" cy="22" r="10" fill="#a16207"/><circle cx="52" cy="22" r="10" fill="#a16207"/><path fill="#b45309" d="M10 58V31a22 22 0 0 1 44 0v27Z"/><ellipse cx="32" cy="41" rx="17" ry="14" fill="#fde68a"/><circle cx="22" cy="29" r="4" fill="#0f172a"/><circle cx="42" cy="29" r="4" fill="#0f172a"/><ellipse cx="32" cy="38" rx="7" ry="5" fill="#fb7185"/><path fill="white" d="M28 44h8v8h-8Z"/><path d="M32 44v8" stroke="#d97706" strokeWidth="2"/></>,
  worker: <><path fill="#38bdf8" d="M15 61V42h34v19Z"/><path fill="#bae6fd" d="M19 40h26v17H19Z"/><circle cx="32" cy="29" r="19" fill="#fdba74"/><path fill="#fbbf24" d="M11 26v-5a21 21 0 0 1 42 0v5Z"/><path d="M7 27h50M32 2v20" stroke="#fef08a" strokeWidth="6" strokeLinecap="round"/><circle cx="25" cy="31" r="2" fill="#0f172a"/><circle cx="39" cy="31" r="2" fill="#0f172a"/><path d="M27 39q5 4 10 0" fill="none" stroke="#9a3412" strokeWidth="2"/></>,
  truck: <><path fill="#22d3ee" d="M2 16h35v34H2Zm35 12h16l10 13v9H37Z"/><path fill="#cffafe" d="M41 31h10l8 11H41Z"/><path fill="#fbbf24" d="M9 23h21v18H9Z"/><path d="m9 23 21 18m0-18L9 41" stroke="#d97706" strokeWidth="3"/><circle cx="15" cy="51" r="8" fill="#0f172a"/><circle cx="50" cy="51" r="8" fill="#0f172a"/><circle cx="15" cy="51" r="3" fill="#94a3b8"/><circle cx="50" cy="51" r="3" fill="#94a3b8"/></>,
  rocket: <><path fill="#fb923c" d="m23 43 9 20 9-20Z"/><path fill="#fef08a" d="m28 43 4 12 4-12Z"/><path fill="#f43f5e" d="M18 30 6 51l17-7h18l17 7-12-21Z"/><path fill="#e2e8f0" d="M32 2C18 13 16 29 21 44h22C48 29 46 13 32 2"/><path fill="#f43f5e" d="M32 2c-6 5-10 10-12 16h24C42 12 38 7 32 2"/><circle cx="32" cy="29" r="9" fill="#0891b2"/><circle cx="32" cy="29" r="6" fill="#a5f3fc"/><path d="M29 26h4" stroke="white" strokeWidth="3" strokeLinecap="round"/></>,
  snake: <><rect x="4" y="4" width="56" height="56" rx="21" fill="#34d399"/><path fill="#059669" d="M4 39c12 12 44 12 56 0v7a14 14 0 0 1-14 14H18A14 14 0 0 1 4 46Z"/><circle cx="40" cy="19" r="9" fill="#ecfdf5"/><circle cx="40" cy="45" r="9" fill="#ecfdf5"/><circle cx="44" cy="19" r="4" fill="#064e3b"/><circle cx="44" cy="45" r="4" fill="#064e3b"/><path d="M58 30h6m-3 0 3-3m-3 3 3 3" stroke="#fb7185" strokeWidth="3"/></>,
  bricks: <><rect x="4" y="7" width="26" height="19" rx="4" fill="#fb923c"/><rect x="34" y="7" width="26" height="19" rx="4" fill="#a78bfa"/><rect x="4" y="30" width="26" height="19" rx="4" fill="#22d3ee"/><rect x="34" y="30" width="26" height="19" rx="4" fill="#fbbf24"/><circle cx="31" cy="55" r="5" fill="white"/></>,
  earth: <><circle cx="32" cy="32" r="28" fill="#38bdf8"/><path fill="#34d399" d="m9 17 14-9 9 7-5 9 8 7-8 9-3 16-9-10 1-13-9-6Zm37-8 8 9-6 11 10 7-5 13-11-6-4-16 7-7Z"/><path d="M10 47a28 28 0 0 0 44-1" fill="none" stroke="#0284c7" strokeWidth="6"/></>,
  moon: <><circle cx="32" cy="32" r="28" fill="#e2e8f0"/><circle cx="21" cy="20" r="8" fill="#94a3b8"/><circle cx="43" cy="36" r="10" fill="#cbd5e1"/><circle cx="23" cy="46" r="5" fill="#cbd5e1"/></>,
} satisfies Record<string, ReactNode>;

export function ArcadeSprite({ kind, className = "size-10" }: { kind: keyof typeof ART; className?: string }) {
  return <svg aria-hidden="true" focusable="false" viewBox="0 0 64 64" className={`arcade-sprite shrink-0 ${className}`}>{ART[kind]}</svg>;
}

const INTRO: Record<PracticeGame, { sprite: keyof typeof ART; caption: string }> = {
  snake: { sprite: "snake", caption: "Calcula · Traza tu ruta · Recoge" },
  numberpac: { sprite: "explorer", caption: "Explora · Busca el escudo · Elige" },
  invaders: { sprite: "ship", caption: "Calcula · Apunta · Dispara" },
  runner: { sprite: "car", caption: "Elige tu carril · Conduce · Acelera" },
  frogger: { sprite: "frog", caption: "Observa · Busca el hueco · Salta" },
  breakout: { sprite: "bricks", caption: "Apunta · Elige tu rebote · Lanza" },
  topos: { sprite: "mole", caption: "Observa · Calcula · Atrapa" },
  cajas: { sprite: "worker", caption: "Piensa · Abre paso · Empuja" },
  cohete: { sprite: "rocket", caption: "Resuelve · Despega · Llega a la Luna" },
};

/** Ficha de inicio: qué se hace, el nivel del juego, lo que trae y la opción
 *  de jugar con calma. El nivel es local y solo cambia el reto del juego. */
export function ArcadeIntro({ game }: { game: PracticeGame }) {
  const { sprite, caption } = INTRO[game];
  const { level, calm, effective, toggleCalm } = useArcadeLevel(game);
  const { unlocked, next } = levelPerks(game, effective);
  return <div className="arcade-intro mx-auto flex max-w-xs flex-col items-center gap-3 rounded-2xl border border-white/15 p-4">
    <ArcadeSprite kind={sprite} className="size-20" />
    <p className="text-xs font-bold tracking-wide text-slate-200">{caption}</p>
    <p data-arcade-level={effective} className="arcade-level-badge rounded-full px-3 py-1 text-xs font-black tracking-widest">
      {calm ? `MODO TRANQUILO · NIVEL 1` : `NIVEL ${level} DE ${MAX_LEVEL}`}
    </p>
    {!calm && unlocked.length > 0 && <p className="text-xs text-slate-200">Novedad: {unlocked[unlocked.length - 1]}.</p>}
    {!calm && next && <p className="text-[11px] text-slate-400">Nivel {next[0]}: {next[1].toLowerCase()}.</p>}
    <button type="button" aria-pressed={calm} onClick={toggleCalm} className="arcade-option text-xs">
      Modo tranquilo
    </button>
  </div>;
}
