"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type MouseEvent } from "react";
import { masteredCountForStrand } from "@/lib/curriculum";
import type { SkillProgress } from "@/lib/types";
import { CITY_LANDMARKS, cityBuildings } from "@/lib/world/scenes";
import { Avatar } from "./Avatar";
import { BuildingArt } from "./BuildingArt";

const LAMPS = [
  { x: 21, y: 25 }, { x: 79, y: 25 }, { x: 14, y: 52 }, { x: 86, y: 52 },
  { x: 50, y: 68 }, { x: 19, y: 84 }, { x: 81, y: 84 }, { x: 50, y: 10 },
];

const FIREFLIES = [
  { x: 30, y: 40 }, { x: 62, y: 36 }, { x: 40, y: 60 }, { x: 68, y: 62 },
  { x: 25, y: 70 }, { x: 74, y: 40 },
];

/**
 * Plano de la Ciudad Central. Cada edificio es una zona real del currículo y
 * su iluminación sale de `masteredCountForStrand` — el mundo se enciende
 * porque el alumno domina habilidades, no porque la narrativa lo decida.
 *
 * La interacción sigue el patrón "explorar → aproximarse → entrar": al tocar
 * un edificio el avatar camina hacia él antes de navegar, así la ciudad se
 * siente como un lugar que se recorre y no como una lista de tarjetas.
 */
export function CityScene({
  childId,
  childName,
  progressBySkill,
  questStrandSlug,
  onOpenShop,
  onOpenNpc,
}: {
  childId: string;
  childName: string;
  progressBySkill: Record<string, SkillProgress>;
  questStrandSlug: string | null;
  onOpenShop: () => void;
  onOpenNpc: () => void;
}) {
  const router = useRouter();
  const buildings = cityBuildings();
  const [pos, setPos] = useState<{ x: number; y: number }>(CITY_LANDMARKS.player);
  const [walking, setWalking] = useState(false);
  const [walkMs, setWalkMs] = useState(500);
  const busy = useRef(false);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    };
  }, []);

  const reducedMotion = () =>
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /** Camina hacia el punto de interés y solo entonces ejecuta la acción (navegar, abrir panel). */
  function approach(x: number, y: number, run: () => void) {
    if (busy.current) return;
    busy.current = true;
    const reduced = reducedMotion();
    const dist = Math.hypot(x - pos.x, y - pos.y);
    const ms = reduced ? 0 : Math.round(Math.min(900, Math.max(260, dist * 16)));
    setWalkMs(ms);
    setPos({ x, y });
    setWalking(!reduced);
    timer.current = window.setTimeout(() => {
      setWalking(false);
      busy.current = false;
      run();
    }, ms);
  }

  /**
   * Intercepta el clic normal de un enlace de zona para caminar antes de
   * navegar; deja pasar el clic sin modificar (clic central, Cmd/Ctrl+clic)
   * para que abrir en pestaña nueva siga funcionando como cualquier enlace.
   */
  function walkThenNavigate(e: MouseEvent<HTMLAnchorElement>, x: number, y: number, href: string) {
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    approach(x, y, () => router.push(href));
  }

  return (
    <div className="relative mx-auto aspect-[3/4] w-full max-w-3xl overflow-hidden rounded-3xl border border-indigo-500/25 bg-slate-950 sm:aspect-[4/3]">
      {/* Fondo: cielo, skyline y caminos. Las coordenadas del viewBox son
          porcentajes, así que los caminos caen justo bajo los edificios. */}
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden="true"
        className="absolute inset-0 h-full w-full"
      >
        <defs>
          <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0b1026" />
            <stop offset="45%" stopColor="#131a3a" />
            <stop offset="100%" stopColor="#1b1035" />
          </linearGradient>
          <radialGradient id="plazaGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#a78bfa" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#a78bfa" stopOpacity="0" />
          </radialGradient>
        </defs>

        <rect width="100" height="100" fill="url(#sky)" />
        {[
          [8, 7], [17, 13], [31, 5], [44, 15], [63, 8], [72, 16], [88, 6], [93, 19], [26, 21], [55, 22],
        ].map(([cx, cy], i) => (
          <circle key={i} cx={cx} cy={cy} r={i % 3 === 0 ? 0.5 : 0.3} fill="#e2e8f0" opacity={0.7} />
        ))}

        {/* skyline lejano y niebla baja, para dar profundidad */}
        <g fill="#1e1b4b" opacity="0.75">
          {[
            [2, 30, 7, 12], [10, 26, 5, 16], [16, 31, 8, 11], [76, 28, 6, 14],
            [83, 32, 7, 10], [91, 25, 6, 17],
          ].map(([x, y, w, h], i) => (
            <rect key={i} x={x} y={y} width={w} height={h} />
          ))}
        </g>
        <ellipse cx="50" cy="97" rx="70" ry="14" fill="#312e81" opacity="0.45" />

        {/* calles desde la plaza a cada zona */}
        <g
          stroke="#6d28d9"
          strokeWidth="0.6"
          strokeDasharray="2 1.6"
          strokeLinecap="round"
          opacity="0.5"
        >
          {buildings.map((b) => (
            <line
              key={b.strandSlug}
              x1={CITY_LANDMARKS.player.x}
              y1={CITY_LANDMARKS.player.y}
              x2={b.x}
              y2={b.y + 4}
            />
          ))}
          <line
            x1={CITY_LANDMARKS.player.x}
            y1={CITY_LANDMARKS.player.y}
            x2={CITY_LANDMARKS.central.x}
            y2={CITY_LANDMARKS.central.y + 5}
          />
          <line
            x1={CITY_LANDMARKS.player.x}
            y1={CITY_LANDMARKS.player.y}
            x2={CITY_LANDMARKS.tienda.x}
            y2={CITY_LANDMARKS.tienda.y}
          />
        </g>

        <ellipse
          cx={CITY_LANDMARKS.player.x}
          cy={CITY_LANDMARKS.player.y}
          rx="16"
          ry="12"
          fill="url(#plazaGlow)"
        />
      </svg>

      {/* Vida ambiental: niebla, farolas parpadeantes y luciérnagas. Todo
          decorativo (aria-hidden), nunca sustituye a un estado real. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="anim-fog absolute top-[4%] h-32 rounded-full bg-violet-500/10 blur-3xl"
          style={{ left: "-10%", right: "-10%" }}
        />
        <div
          className="anim-fog absolute bottom-[2%] h-36 rounded-full bg-cyan-400/10 blur-3xl"
          style={{ left: "-10%", right: "-10%", animationDuration: "34s", animationDelay: "-9s" }}
        />
        {LAMPS.map((l, i) => (
          <span
            key={`${l.x}-${l.y}`}
            className="anim-flicker absolute size-7 -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-400/25 blur-md"
            style={{ left: `${l.x}%`, top: `${l.y}%`, animationDelay: `${i * 0.7}s`, animationDuration: `${2.6 + (i % 3) * 0.9}s` }}
          />
        ))}
        {FIREFLIES.map((f, i) => (
          <span
            key={`${f.x}-${f.y}`}
            className="anim-firefly absolute size-1.5 rounded-full bg-cyan-300/80"
            style={{ left: `${f.x}%`, top: `${f.y}%`, animationDelay: `${i * 1.3}s`, animationDuration: `${6 + (i % 4)}s` }}
          />
        ))}
      </div>

      {/* Central eléctrica: la puerta al desafío final. */}
      <div
        className="absolute w-32 -translate-x-1/2 -translate-y-1/2 text-center sm:w-40"
        style={{ left: `${CITY_LANDMARKS.central.x}%`, top: `${CITY_LANDMARKS.central.y}%` }}
      >
        <Link
          href={`/jugar/${childId}/boss`}
          onClick={(e) => walkThenNavigate(e, CITY_LANDMARKS.central.x, CITY_LANDMARKS.central.y + 9, `/jugar/${childId}/boss`)}
          className="block rounded-2xl transition-transform hover:scale-105 focus:outline-none focus-visible:ring-4 focus-visible:ring-white"
        >
          <BuildingArt variant="central" accent={CITY_LANDMARKS.central.accent} lit={0.6} className="mx-auto h-24 w-28 drop-shadow-[0_0_18px_rgba(244,114,182,0.35)] sm:h-28 sm:w-32" />
          <span className="mt-0.5 block rounded-xl bg-slate-950/85 px-2 py-1 text-[11px] font-bold leading-tight text-pink-200 ring-1 ring-pink-400/30">
            Central eléctrica
            <span className="block text-[10px] font-semibold text-slate-400">Boss Challenge</span>
          </span>
        </Link>
      </div>

      {/* Zonas del currículo */}
      {buildings.map((building) => {
        const { mastered, total } = masteredCountForStrand(progressBySkill, building.strandSlug);
        const ratio = total > 0 ? mastered / total : 0;
        const isQuestZone = questStrandSlug === building.strandSlug;
        return (
          <div
            key={building.strandSlug}
            className="absolute w-28 -translate-x-1/2 -translate-y-1/2 text-center sm:w-32"
            style={{ left: `${building.x}%`, top: `${building.y}%` }}
          >
            {/* El latido va en un halo decorativo detrás, nunca en el propio
                enlace: animar el elemento pulsable lo convierte en un blanco
                móvil (y en un elemento "inestable" para el teclado y las
                pruebas). */}
            {isQuestZone && (
              <>
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute -inset-2 animate-[worldPulse_2.4s_ease-in-out_infinite] rounded-3xl bg-amber-400/10"
                />
                <span
                  aria-hidden="true"
                  className="anim-guide world-text-glow pointer-events-none absolute -top-6 left-1/2 text-xl font-bold text-amber-300"
                >
                  ▼
                </span>
              </>
            )}
            <Link
              href={`/jugar/${childId}/${building.strandSlug}`}
              onClick={(e) => walkThenNavigate(e, building.x, building.y + 8, `/jugar/${childId}/${building.strandSlug}`)}
              className="relative block rounded-2xl transition-transform hover:scale-105 focus:outline-none focus-visible:ring-4 focus-visible:ring-white"
            >
              <BuildingArt
                variant={building.variant}
                accent={building.accent}
                lit={ratio}
                className={`mx-auto h-20 w-24 sm:h-24 sm:w-28 ${isQuestZone ? "drop-shadow-[0_0_16px_rgba(251,191,36,0.4)]" : ""}`}
              />
              <span
                className={`mt-0.5 block rounded-xl bg-slate-950/85 px-2 py-1 text-[11px] font-bold leading-tight text-slate-100 ring-1 ${isQuestZone ? "ring-amber-300/50" : "ring-white/10"}`}
              >
                <span aria-hidden="true">{building.icon} </span>
                {building.zoneName}
                <span className="block text-[10px] font-semibold text-slate-400">{building.strandLabel}</span>
              </span>
            </Link>
            <div className="mt-1 flex items-center gap-1.5 px-1">
              <div
                role="progressbar"
                aria-valuenow={Math.round(ratio * 100)}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`Progreso en ${building.zoneName}`}
                className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/15"
              >
                <div
                  className="h-1.5 rounded-full transition-[width] duration-700"
                  style={{ width: `${ratio * 100}%`, backgroundColor: building.accent }}
                />
              </div>
              <span className="text-[10px] font-bold text-slate-300">
                {mastered}/{total}
              </span>
            </div>
          </div>
        );
      })}

      {/* Tienda: el canje de estrellas, dentro del mundo. */}
      <div
        className="absolute w-24 -translate-x-1/2 -translate-y-1/2 text-center sm:w-28"
        style={{ left: `${CITY_LANDMARKS.tienda.x}%`, top: `${CITY_LANDMARKS.tienda.y}%` }}
      >
        <button
          type="button"
          onClick={() => approach(CITY_LANDMARKS.tienda.x, CITY_LANDMARKS.tienda.y + 6, onOpenShop)}
          className="block w-full rounded-2xl transition-transform hover:scale-105 focus:outline-none focus-visible:ring-4 focus-visible:ring-white"
        >
          <BuildingArt variant="tienda" accent={CITY_LANDMARKS.tienda.accent} lit={0.5} className="mx-auto h-16 w-24" />
          <span className="mt-0.5 block rounded-xl bg-slate-950/85 px-2 py-1 text-[11px] font-bold leading-tight text-sky-200 ring-1 ring-sky-400/30">
            Tienda
            <span className="block text-[10px] font-semibold text-slate-400">Canjear estrellas</span>
          </span>
        </button>
      </div>

      {/* NPC: la técnica que propone la evaluación de ubicación. */}
      <div
        className="absolute w-24 -translate-x-1/2 -translate-y-1/2 text-center sm:w-28"
        style={{ left: `${CITY_LANDMARKS.npc.x}%`, top: `${CITY_LANDMARKS.npc.y}%` }}
      >
        <button
          type="button"
          onClick={() => approach(CITY_LANDMARKS.npc.x, CITY_LANDMARKS.npc.y + 6, onOpenNpc)}
          className="block w-full rounded-2xl focus:outline-none focus-visible:ring-4 focus-visible:ring-white"
        >
          <span
            aria-hidden="true"
            className="anim-breathe world-ring-glow mx-auto flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl border-2 border-cyan-300/60 bg-cyan-500/15"
          >
            <img src="/illustrations/ada-portrait.webp" alt="" className="h-full w-full object-cover" />
          </span>
          <span className="mt-1 block rounded-xl bg-slate-950/85 px-2 py-1 text-[11px] font-bold leading-tight text-cyan-100 ring-1 ring-cyan-400/30">
            Ada, la ingeniera
          </span>
        </button>
      </div>

      {/* El personaje, caminando por la plaza hacia lo que toques. */}
      <div
        className="pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-1/2"
        style={{ left: `${pos.x}%`, top: `${pos.y}%`, transition: `left ${walkMs}ms ease-in-out, top ${walkMs}ms ease-in-out` }}
      >
        <span className="absolute bottom-0 left-1/2 h-2.5 w-10 -translate-x-1/2 rounded-full bg-black/40 blur-sm" />
        <Avatar
          variant="explorer"
          walking={walking}
          className="h-16 drop-shadow-[0_0_12px_rgba(167,139,250,0.6)]"
          title={`${childName}, en la plaza`}
        />
      </div>

      {/* Viñeta de profundidad sobre toda la escena. */}
      <div aria-hidden="true" className="world-scene-vignette pointer-events-none absolute inset-0" />
    </div>
  );
}
