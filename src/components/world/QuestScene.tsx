"use client";

import { useEffect, useRef, useState, type MouseEvent } from "react";
import { useRouter } from "next/navigation";
import { Zap } from "lucide-react";
import { getModule } from "@/lib/curriculum";
import type { SkillProgress } from "@/lib/types";
import { dedupeArea, findPath, nearestWalkablePoint, type Point } from "@/lib/world/navmesh";
import type { Interactable, InteractionKind } from "@/lib/world/scenes";
import { QUESTS, questProgress } from "@/lib/world/quests";
import { hasAnyRealPlay } from "@/lib/world/state";
import {
  CIUDAD_CENTRAL_HOTSPOTS,
  CIUDAD_CENTRAL_IMAGE_SIZE,
  CIUDAD_CENTRAL_WALKABLE,
  NIA_ORIGIN_INTRO,
  PLAYER_START,
  hotspotState,
  stepFromQuestProgress,
  worldFlags,
  type CiudadCentralHotspot,
} from "@/lib/world/questScene";
import { WalkDebugOverlay } from "./WalkDebugOverlay";
import { SceneFx } from "./SceneFx";
import { QuestHotspot } from "./QuestHotspot";
import { PuzzleOverlay } from "./PuzzleOverlay";
import { DialogOverlay, MissionOverlay, RewardOverlay } from "./QuestOverlays";
import { Avatar } from "./Avatar";
import { useCameraBox } from "./useCameraBox";

type Active =
  | { kind: "none" }
  | { kind: "dialog"; hotspot: CiudadCentralHotspot }
  | { kind: "puzzle"; hotspot: CiudadCentralHotspot }
  | { kind: "reward" }
  | { kind: "mission"; intro?: boolean };

/** Envuelto en una función propia para que el linter de pureza de React no
 * confunda estas llamadas (siempre disparadas desde manejadores de evento,
 * nunca durante el render) con una lectura impura del render en sí. */
function now(): number {
  return Date.now();
}

/** Igual que `now()`, para el reloj de mayor resolución que usa `walkPath`. */
function rafNow(): number {
  return performance.now();
}

function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

type Pose = { x: number; y: number; facing: "left" | "right" };

/**
 * `CIUDAD_CENTRAL_WALKABLE` se edita a mano (o con `WalkDebugOverlay`), así
 * que puede colarse algún vértice pegado a otro (arista de longitud ~0) sin
 * que se note a simple vista — eso rompe la asunción de "polígono simple"
 * del pathfinding y hace que una ruta corte por donde no debería. Se
 * normaliza una sola vez acá, a nivel de módulo, para el pathfinding real;
 * `WalkDebugOverlay` sigue recibiendo el `CIUDAD_CENTRAL_WALKABLE` crudo
 * (es la fuente de verdad que edita y guarda).
 */
const GAME_WALKABLE = dedupeArea(CIUDAD_CENTRAL_WALKABLE);

/**
 * Ciudad Central: la misión "El apagón" tal como la definió el prototipo,
 * pero con `step` derivado en cada render de `questProgress` sobre
 * `QUESTS[0]` — nunca un `useState<StepId>` propio (ver `questScene.ts`).
 * El único estado propio es de presentación (posición del avatar, overlay
 * activo, banners) o efímero de sesión (`npcGreeted`).
 */
export function QuestScene({
  childId,
  parentId,
  childName,
  progressBySkill,
  streak,
  soundOn,
  onResolved,
  onOpenShop,
}: {
  childId: string;
  parentId: string;
  childName: string;
  progressBySkill: Record<string, SkillProgress>;
  streak: number;
  soundOn: boolean;
  onResolved: (moduleId: string, updated: SkillProgress, correct: boolean) => void;
  onOpenShop: () => void;
}) {
  const router = useRouter();
  const quest = questProgress(progressBySkill, QUESTS[0]);
  const [npcGreeted, setNpcGreeted] = useState(false);
  // "Nueva misión" mientras la misión siga abierta (aunque ya tenga algún
  // objetivo hecho): ese es el único momento en que tiene sentido el botón
  // "Comenzar a explorar". Una vez completa, seguir marcándola como nueva —
  // con sus objetivos ya tachados — no tiene sentido: en su lugar se abre el
  // panel completo (otras zonas, tienda), para no dejar al jugador sin salida.
  // El padre (jugar/[childId]/page.tsx) no monta esta escena hasta que
  // progressBySkill viene de Firestore, así que este cálculo inicial ya lee
  // progreso real, nunca el estado vacío de mientras carga.
  const [active, setActive] = useState<Active>(() => ({ kind: "mission", intro: !quest.complete }));
  const [pose, setPose] = useState<Pose>({ ...PLAYER_START, facing: "left" });
  const [walking, setWalking] = useState(false);
  const [reactingId, setReactingId] = useState<string | null>(null);
  const [banner, setBanner] = useState<string | null>(null);
  const [starFly, setStarFly] = useState<{ x: number; y: number; key: number } | null>(null);
  const [flashKey, setFlashKey] = useState<number | null>(null);
  const [masteredLabel, setMasteredLabel] = useState<string | null>(null);
  const [walkDebug, setWalkDebug] = useState(false);

  const timers = useRef<number[]>([]);
  const busyRef = useRef(false);
  const walkToken = useRef(0);
  const rafRef = useRef<number | null>(null);
  const bannerToken = useRef(0);
  const justSolvedRef = useRef(false);
  const sceneRef = useRef<HTMLDivElement>(null);
  const sceneBox = useCameraBox(sceneRef, CIUDAD_CENTRAL_IMAGE_SIZE, pose);

  useEffect(() => {
    const pending = timers.current;
    return () => {
      pending.forEach((t) => window.clearTimeout(t));
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  // Herramienta de autoría del polígono caminable (ver WalkDebugOverlay):
  // nunca en producción, y en dev solo si se pide explícitamente por URL —
  // por eso se resuelve en un efecto (tras montar) y no durante el render,
  // que en el servidor no conoce `window.location`.
  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    const hasFlag = new URLSearchParams(window.location.search).has("walkdebug");
    queueMicrotask(() => setWalkDebug(hasFlag));
  }, []);

  function schedule(fn: () => void, ms: number) {
    timers.current.push(window.setTimeout(fn, ms));
  }

  function showBanner(text: string, ms = 3800) {
    const token = ++bannerToken.current;
    setBanner(text);
    schedule(() => {
      if (bannerToken.current === token) setBanner(null);
    }, ms);
  }

  const step = stepFromQuestProgress(quest, npcGreeted);
  const flags = worldFlags(step);
  const visibleHotspots = CIUDAD_CENTRAL_HOTSPOTS.filter((h) => h.id !== "compuerta" || flags.compuertaVisible);

  function segmentMs(dist: number): number {
    return prefersReducedMotion() ? 0 : Math.round(Math.min(1500, Math.max(420, dist * 30)));
  }

  /**
   * Anima el avatar a lo largo de una ruta de varios tramos (salida de
   * `findPath`, que puede rodear obstáculos en vez de una sola línea recta).
   * Un único bucle de `requestAnimationFrame` interpola la posición según
   * cuánto tiempo real pasó desde que arrancó la ruta — nunca "fija" un
   * tramo y espera que la animación llegue a tiempo: la posición pintada
   * siempre es un punto calculado sobre el camino, así que aunque un frame
   * se retrase (pestaña en segundo plano, jank), al volver retoma
   * exactamente donde el reloj dice que debería estar, nunca salta directo
   * al destino saltándose los tramos de en medio (eso era lo que pasaba
   * antes: cada tramo dependía de que un `setTimeout` disparara justo
   * cuando terminaba la transición CSS del tramo anterior). `walkToken`
   * sigue cancelando una ruta vieja si el jugador hace otro clic a mitad de
   * camino.
   */
  function walkPath(waypoints: Point[]): number {
    if (waypoints.length <= 1) return 0;
    const token = ++walkToken.current;
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    const segments = waypoints.slice(1).map((to, i) => ({
      from: waypoints[i],
      to,
      ms: segmentMs(Math.hypot(to.x - waypoints[i].x, to.y - waypoints[i].y)),
    }));
    const total = segments.reduce((sum, s) => sum + s.ms, 0);
    const last = segments[segments.length - 1];

    function facingFor(seg: { from: Point; to: Point }, fallback: Pose["facing"]): Pose["facing"] {
      if (seg.to.x < seg.from.x) return "left";
      if (seg.to.x > seg.from.x) return "right";
      return fallback;
    }

    if (total === 0) {
      // `prefers-reduced-motion`: sin animación, salto directo al destino.
      setPose((p) => ({ x: last.to.x, y: last.to.y, facing: facingFor(last, p.facing) }));
      setWalking(false);
      return 0;
    }

    setWalking(true);
    const start = rafNow();

    function frame(now: number) {
      if (walkToken.current !== token) return; // otra ruta la reemplazó
      const elapsed = now - start;
      if (elapsed >= total) {
        setPose((p) => ({ x: last.to.x, y: last.to.y, facing: facingFor(last, p.facing) }));
        setWalking(false);
        rafRef.current = null;
        return;
      }
      let remaining = elapsed;
      let current = segments[0];
      for (const s of segments) {
        if (remaining <= s.ms) {
          current = s;
          break;
        }
        remaining -= s.ms;
      }
      const frac = current.ms === 0 ? 1 : remaining / current.ms;
      const x = current.from.x + (current.to.x - current.from.x) * frac;
      const y = current.from.y + (current.to.y - current.from.y) * frac;
      setPose((p) => ({ x, y, facing: facingFor(current, p.facing) }));
      rafRef.current = requestAnimationFrame(frame);
    }
    rafRef.current = requestAnimationFrame(frame);
    return total;
  }

  function continueLabelFor(h: CiudadCentralHotspot): string {
    const s = hotspotState(h, step);
    if (h.id === "siguiente-mision") return s === "activo" ? "Ir al Laboratorio ▸" : "Entendido";
    if (s !== "activo") return "Entendido";
    if (h.id === "compuerta") return "Abrir la compuerta";
    if (h.id === "nia") return "¡Voy a por el código!";
    return "¡Sí, vamos!";
  }

  function openFor(h: CiudadCentralHotspot) {
    const s = hotspotState(h, step);
    if (s === "activo" && h.objectiveId) {
      setActive({ kind: "puzzle", hotspot: h });
      return;
    }
    if (h.id === "siguiente-mision" && s === "activo") {
      setActive({
        kind: "dialog",
        hotspot: {
          ...h,
          intro: ["Los escombros del túnel ya se movieron. El camino al Laboratorio está despejado."],
        },
      });
      return;
    }
    if (h.id === "nia" && !hasAnyRealPlay(progressBySkill)) {
      // Primera vez de verdad en el mundo (nunca antes hubo un acierto real,
      // sin contar lo que la evaluación de ubicación otorgó de entrada — ver
      // `hasAnyRealPlay`): antes de entrar en "El apagón" hay que presentar a
      // Khaos (docs/guion-narrativa-math-quest.md §7-13) — si no, "Null
      // Drenador" y "NEXUS" son jerga sin sentido para quien recién llega.
      setActive({
        kind: "dialog",
        hotspot: { ...h, intro: [...NIA_ORIGIN_INTRO, ...h.intro] },
      });
      return;
    }
    setActive({ kind: "dialog", hotspot: h });
  }

  function approach(h: CiudadCentralHotspot) {
    if (busyRef.current || active.kind !== "none") return;
    busyRef.current = true;
    const ms = walkPath(findPath(pose, { x: h.standX, y: h.standY }, GAME_WALKABLE));
    schedule(() => {
      setPose((p) => ({ ...p, facing: h.x < h.standX ? "left" : "right" }));
      setReactingId(h.id);
      schedule(
        () => {
          setReactingId(null);
          openFor(h);
          busyRef.current = false;
        },
        prefersReducedMotion() ? 100 : 520,
      );
    }, ms + 60);
  }

  function wander(e: MouseEvent<HTMLDivElement>) {
    if (busyRef.current || active.kind !== "none") return;
    // `e.currentTarget` es el div que llena la caja de la cámara (`inset-0`
    // dentro del div posicionado en sceneBox.left/top): su
    // getBoundingClientRect() ya cae exactamente sobre esa caja, así que
    // resta directamente contra sus propios bordes da la posición en % de
    // la imagen completa — sin volver a restar sceneBox.left/top, que ya
    // están incluidos en el rect y duplicarían el desplazamiento.
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / sceneBox.width) * 100;
    const y = ((e.clientY - rect.top) / sceneBox.height) * 100;
    const target = nearestWalkablePoint({ x, y }, GAME_WALKABLE);
    walkPath(findPath(pose, target, GAME_WALKABLE));
  }

  function closeMission(wasIntro: boolean) {
    setActive({ kind: "none" });
    if (wasIntro) showBanner("Explora la plaza… la Dra. Nia te espera junto a la fuente", 5200);
  }

  function onDialogContinue(h: CiudadCentralHotspot) {
    setActive({ kind: "none" });
    if (h.id === "nia" && !npcGreeted) {
      setNpcGreeted(true);
      if (h.outcome) showBanner(h.outcome, 4200);
      return;
    }
    if (h.id === "siguiente-mision" && hotspotState(h, step) === "activo") {
      router.push(`/jugar/${childId}/algebra`);
    }
  }

  function handlePuzzleResolved(moduleId: string, updated: SkillProgress, correct: boolean) {
    onResolved(moduleId, updated, correct);
    justSolvedRef.current = correct;
    if (correct) {
      const wasMastered = Boolean(progressBySkill[moduleId]?.masteredAt);
      const nowMastered = updated.masteredAt !== null;
      setMasteredLabel(!wasMastered && nowMastered ? (getModule(moduleId)?.label ?? null) : null);
    }
  }

  function handlePuzzleClose(hotspot: CiudadCentralHotspot) {
    const correct = justSolvedRef.current;
    justSolvedRef.current = false;
    setActive({ kind: "none" });
    if (!correct) return;
    showBanner(hotspot.outcome, 4400);
    setStarFly({ x: hotspot.x, y: hotspot.y, key: now() });
    schedule(() => setStarFly(null), 1400);
    if (hotspot.id === "compuerta") {
      setFlashKey(now());
      schedule(() => setFlashKey(null), 1300);
      schedule(() => setActive({ kind: "reward" }), 1900);
    }
  }

  const currentLabel =
    step === "npc"
      ? "Hablar con la Dra. Nia en la plaza"
      : step === "fin"
        ? "Central restaurada"
        : (quest.objectives.find((o) => o.id === step)?.label ?? "Central restaurada");

  const guide =
    active.kind === "none" && reactingId === null
      ? visibleHotspots.find((h) => hotspotState(h, step) === "activo")
      : null;

  const puzzle =
    active.kind === "puzzle"
      ? (() => {
          const objective = QUESTS[0].objectives.find((o) => o.id === active.hotspot.objectiveId);
          const mod = objective ? getModule(objective.moduleId) : undefined;
          if (!objective || !mod) return null;
          const interactable: Interactable = {
            id: active.hotspot.id,
            moduleId: objective.moduleId,
            kind: active.hotspot.kind as InteractionKind,
            label: active.hotspot.label,
            clue: active.hotspot.intro.join(" "),
            reward: active.hotspot.outcome,
            x: active.hotspot.x,
            y: active.hotspot.y,
          };
          return { interactable, mod, hotspot: active.hotspot };
        })()
      : null;

  return (
    // El contenedor ocupa toda la altura que le deja el layout (ver
    // `h-full` en jugar/[childId]/page.tsx, que a su vez encaja en el
    // viewport con `h-dvh` — nunca scroll vertical de página). Como esa
    // altura no tiene por qué guardar la proporción de la imagen,
    // `useCameraBox` la escala para cubrir siempre el contenedor (igual que
    // `object-cover`) y sigue la posición del personaje (`pose`) en vez de
    // centrarla de forma fija: la cámara "recorta" la imagen y se desplaza
    // con el jugador, como el lente de una cámara de videojuego. Todo lo
    // que pertenece al mundo (fondo, avatar, hotspots, flecha guía,
    // estrella) vive dentro de ese `div` con esa geometría exacta en px —
    // así el % de cada uno sigue siendo "% de la imagen completa" sin
    // importar cuánto se vea del contenedor ni hacia dónde mire la cámara.
    <div
      ref={sceneRef}
      className="relative h-full w-full overflow-clip rounded-3xl border border-indigo-500/25 bg-slate-950"
    >
      <div
        className="absolute"
        style={{
          left: sceneBox.left,
          top: sceneBox.top,
          width: sceneBox.width,
          height: sceneBox.height,
        }}
      >
        <div className="world-scene-vignette absolute inset-0">
          <img
            src="/illustrations/city-central.webp"
            alt="Ciudad Central de noche: plaza con fuente, central eléctrica apagada, tienda, taller, laboratorio y un túnel bloqueado."
            className={`block size-full transition-[filter] duration-1000 ${
              flags.cityRestored ? "brightness-110 saturate-125" : "brightness-90"
            }`}
          />
          <SceneFx {...flags} />
        </div>

        <div
          aria-hidden="true"
          className="pointer-events-none absolute z-20"
          style={{
            left: `${pose.x}%`,
            top: `${pose.y}%`,
          }}
        >
          <div style={{ transform: "translate(-50%, -97%)", transformOrigin: "50% 100%" }}>
            <span className="absolute bottom-0 left-1/2 h-3 w-16 -translate-x-1/2 rounded-full bg-black/50 blur-md" />
            <div style={{ transform: pose.facing === "left" ? "scaleX(-1)" : undefined }}>
              <Avatar
                variant="explorer"
                walking={walking}
                className="h-16 drop-shadow-[0_0_12px_rgba(34,211,238,0.5)]"
                title={`${childName}, en Ciudad Central`}
              />
            </div>
          </div>
        </div>

        <div className="absolute inset-0" onClick={wander}>
          {visibleHotspots.map((h) => (
            <QuestHotspot
              key={h.id}
              data={h}
              state={hotspotState(h, step)}
              reacting={reactingId === h.id}
              onSelect={approach}
            />
          ))}
        </div>

        {walkDebug && (
          <WalkDebugOverlay area={CIUDAD_CENTRAL_WALKABLE} sceneId="ciudad-central" exportName="CIUDAD_CENTRAL_WALKABLE" />
        )}

        {guide && (
          <span
            aria-hidden="true"
            className="anim-guide world-text-glow pointer-events-none absolute z-10 font-display text-xl font-bold text-amber-300"
            style={{ left: `${guide.x}%`, top: `${guide.y - 8}%` }}
          >
            ▼
          </span>
        )}

        {starFly && (
          <span
            key={`star-${starFly.key}`}
            aria-hidden="true"
            className="anim-star-float absolute z-30 font-display text-lg font-bold text-amber-300"
            style={{ left: `${starFly.x}%`, top: `${starFly.y}%` }}
          >
            +★
          </span>
        )}
      </div>

      {banner && (
        <div className="pointer-events-none absolute inset-x-0 top-3 z-30 flex justify-center px-4">
          <p role="status" className="anim-rise world-hud-panel max-w-md rounded-full px-4 py-2 text-center text-sm font-semibold text-slate-100">
            {banner}
          </p>
        </div>
      )}

      {flashKey && (
        <div
          key={`flash-${flashKey}`}
          aria-hidden="true"
          className="anim-flash pointer-events-none absolute inset-0 z-30 bg-amber-400/40"
        />
      )}

      {/* `fixed`, no `absolute`: la caja de la escena crece con el aspect-ratio
          de la imagen (aspect-square en móvil) y puede acabar más alta que el
          viewport, dejando este indicador fuera de la vista si dependiera de
          los bordes de la escena en vez de los de la ventana. */}
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 flex items-end p-2 sm:p-3">
        <button
          type="button"
          onClick={() => setActive({ kind: "mission" })}
          aria-label="Abrir registro de misión"
          className="pointer-events-auto flex min-h-11 max-w-[min(88vw,24rem)] items-center gap-2.5 rounded-full world-hud-panel px-3 py-1.5 text-left transition-transform hover:scale-[1.02]"
        >
          <Zap className="size-4 shrink-0 text-amber-300" aria-hidden="true" />
          <span className="min-w-0" aria-hidden="true">
            <span className="block font-display text-[9px] uppercase tracking-[0.22em] text-slate-400">
              MISIÓN 01 · {Math.min(quest.doneCount + 1, quest.total)}/{quest.total}
            </span>
            <span className="block truncate text-[13px] font-semibold text-slate-100">{currentLabel}</span>
          </span>
        </button>
      </div>

      {active.kind === "dialog" && (
        <DialogOverlay
          hotspot={active.hotspot}
          onClose={() => setActive({ kind: "none" })}
          continueLabel={continueLabelFor(active.hotspot)}
          onContinue={() => onDialogContinue(active.hotspot)}
        />
      )}

      {active.kind === "puzzle" && puzzle && (
        <PuzzleOverlay
          parentId={parentId}
          childId={childId}
          interactable={puzzle.interactable}
          mod={puzzle.mod}
          progressBySkill={progressBySkill}
          streak={streak}
          soundOn={soundOn}
          onClose={() => handlePuzzleClose(puzzle.hotspot)}
          onResolved={handlePuzzleResolved}
        />
      )}

      {active.kind === "reward" && (
        <RewardOverlay masteredLabel={masteredLabel} nextQuest={QUESTS[1] ?? null} onClose={() => setActive({ kind: "none" })} />
      )}

      {active.kind === "mission" && (
        <MissionOverlay
          childId={childId}
          quest={quest}
          progressBySkill={progressBySkill}
          intro={active.intro === true}
          onClose={() => closeMission(active.intro === true)}
          onOpenShop={onOpenShop}
        />
      )}

      <p className="sr-only" aria-live="polite">
        {`Objetivo actual: ${currentLabel}.`}
      </p>
    </div>
  );
}
