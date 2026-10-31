"use client";

import { ArcadeIntro, ArcadeSprite } from "./ArcadeArt";
import { ArcadeFinalScore, ArcadeFxLayer, ArcadeScoreBar, cellAt, useArcadeFx } from "./ArcadeFx";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { getModule } from "@/lib/curriculum";
import { type Problem } from "@/lib/problem";
import { playSound } from "@/lib/gameSound";
import { triggerConfetti } from "@/lib/confetti";
import { useArrowKeys } from "@/lib/minigames/useArrowKeys";
import { useArcadeFocus } from "@/lib/minigames/useArcadeFocus";
import { WAREHOUSES, deliverySquares, floorAt, goalAt, initialWarehouse, moveWarehouse, sameCell, warehouseFor, warehousePar, type Direction, type WarehouseState } from "@/lib/minigames/sokoban";
import { TouchDPad } from "@/components/level/runtime/TouchDPad";
import type { LessonExercise } from "@/lib/minigames/lessonExercise";
import { useContinueArcade } from "@/lib/minigames/useContinueArcade";
import { lessonArcadeState, arcadeValues, ChoiceText, PromptText, lessonValues, gamePromptSize } from "@/lib/minigames/lessonArcade";

const CHOICES = 5;
const GOAL = 3;
const LIVES_START = 3;
// Puntuación de almacén: entregar da puntos y planificar con pocos pasos suma
// un extra («par»). No hay reloj: pensar despacio nunca resta.
const DELIVERY_POINTS = 150;
const PAR_BONUS_MAX = 250;
const PAR_STEP_COST = 5;

type Phase = "start" | "playing" | "over";

/**
 * Caja numérica (tipo Sokoban) — mismo contrato que el resto de la serie
 * retro (docs/plan-minijuegos-retro.md). Por turnos y sin reloj: nada se
 * mueve si el jugador no pulsa una flecha, así que no hay fallos de
 * reflejos. Se empuja una caja (nunca se tira de ella) y una caja no
 * empuja a otra; solo la que llega a la meta del almacén es la respuesta.
 *
 * Paredes y pasillos exigen cambiar de lado y recolocar otras cajas.
 * Deshacer y reiniciar no envían respuestas ni cuestan premios.
 */
export function CajasGeneric({
  moduleId,
  soundOn,
  onAnswer,
  onWin,
  bestScore,
  onGameOver,
  exercise,
}: {
  moduleId: string;
  soundOn: boolean;
  onAnswer: (correct: boolean) => Promise<number>;
  onWin?: () => void;
  /** `undefined`/`null` = sin marca todavía (nunca se trata como 0). */
  bestScore?: number | null;
  /** Se llama al agotar las vidas o al ganar, con las entregas correctas. */
  onGameOver?: (correctCount: number) => void;
  /** Modo clase: solo la caja que llega al camión envía una respuesta. */
  exercise?: LessonExercise;
}) {
  const newProblem = () => exercise?.problem ?? getModule(moduleId)!.generateProblem();
  const { lesson, frozen, solved } = lessonArcadeState(exercise);
  const goal = lesson ? (exercise?.rounds ?? 1) : GOAL;
  const promptId = useId();

  const [phase, setPhase] = useState<Phase>("start");
  const [level, setLevel] = useState(WAREHOUSES[0]);
  const levelRef = useRef(WAREHOUSES[0]);
  const [board, setBoard] = useState(() => initialWarehouse(WAREHOUSES[0], []));
  const boardRef = useRef(board);
  const historyRef = useRef<WarehouseState[]>([]);
  const [undoCount, setUndoCount] = useState(0);
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState("");
  const [showTraps, setShowTraps] = useState(false);
  const deliverable = useMemo(() => deliverySquares(level), [level]);
  const [lives, setLives] = useState(LIVES_START);
  const [legacyProblem, setProblem] = useState<Problem>(newProblem);
  const problem = exercise?.problem ?? legacyProblem;
  const [correctCount, setCorrectCount] = useState(0);
  const [starsThisRound, setStarsThisRound] = useState(0);
  const [win, setWin] = useState(false);
  const candidatesRef = useRef<number[]>([]);
  const busyRef = useRef(false); // true mientras se espera la respuesta
  const cabinetRef = useRef<HTMLDivElement>(null);
  const fx = useArcadeFx({ game: "cajas", soundOn, solved, cabinetRef, session: exercise?.session });
  const par = warehousePar(level, fx.level);
  const at = (c: { x: number; y: number }) => cellAt(c.x, c.y, levelRef.current.rows[0].length, levelRef.current.rows.length);

  function resetBoxes() {
    const initial = initialWarehouse(levelRef.current, candidatesRef.current);
    boardRef.current = initial;
    setBoard(initial);
    historyRef.current = [];
    setUndoCount(0);
    setNotice("");
  }

  function spawnRound(round = 0) {
    const nextProblem = newProblem();
    setProblem(nextProblem);
    candidatesRef.current = exercise ? lessonValues(exercise) : arcadeValues(nextProblem, CHOICES, Math.max(8, CHOICES * 2));
    levelRef.current = warehouseFor(nextProblem.id, round, fx.level);
    setLevel(levelRef.current);
    resetBoxes();
  }

  function endGame(didWin: boolean, finalCount: number) {
    setWin(didWin);
    setPhase("over");
    fx.end(didWin);
    playSound(didWin ? "fanfare" : "fail", soundOn);
    onGameOver?.(finalCount);
    if (didWin) {
      triggerConfetti("medium");
      onWin?.();
    }
  }

  useContinueArcade(exercise, start);

  function start() {
    if (frozen) return;
    playSound("click", soundOn);
    setLives(LIVES_START);
    setCorrectCount(0);
    setStarsThisRound(0);
    setWin(false);
    busyRef.current = false;
    setPending(false);
    setPhase("playing");
    fx.start("¡A empujar!");
    spawnRound(exercise?.round ?? 0);
  }

  async function resolveRound(correct: boolean, where: { x: number; y: number }, moves: number) {
    busyRef.current = true;
    playSound(correct ? "correct" : "wrong", soundOn);
    if (correct) {
      const par = Math.max(0, PAR_BONUS_MAX - moves * PAR_STEP_COST);
      fx.award(DELIVERY_POINTS + par, at(where), { label: par > 0 ? `¡Entregada! +${DELIVERY_POINTS} · par +${par}` : undefined });
    } else fx.oops(at(where), "✗");
    const stars = await onAnswer(correct);
    if (correct) {
      const next = correctCount + 1;
      setStarsThisRound((s) => s + stars);
      setCorrectCount(next);
      if (next >= GOAL) {
        endGame(true, next);
        return;
      }
    } else {
      const remaining = lives - 1;
      setLives(remaining);
      if (remaining <= 0) {
        endGame(false, correctCount);
        return;
      }
    }
    spawnRound(correct ? correctCount + 1 : correctCount);
    busyRef.current = false;
    setPending(false);
  }

  async function deliverLesson(value: number) {
    busyRef.current = true;
    try {
      // Se envía la caja entregada: el resultado lo decide el servidor.
      await exercise!.onResponse(value);
    } finally {
      resetBoxes();
      busyRef.current = false;
      setPending(false);
    }
  }

  function move(direction: Direction) {
    if (busyRef.current || frozen || solved || phase !== "playing") return;
    const previous = boardRef.current;
    const result = moveWarehouse(levelRef.current, previous, direction);
    if (result.state === previous) { setNotice(result.blocked ?? ""); return; }
    historyRef.current = [...historyRef.current.slice(-99), previous];
    setUndoCount(historyRef.current.length);
    boardRef.current = result.state;
    setBoard(result.state);
    const trapped = result.state.boxes.some((box) => !deliverable.has(`${box.x},${box.y}`));
    const wasTrapped = previous.boxes.some((box) => !deliverable.has(`${box.x},${box.y}`));
    setNotice(trapped ? "Una caja quedó sin salida hacia la meta. Puedes deshacer o reiniciar sin perder nada." : "");
    const pushed = result.state.pushes > previous.pushes;
    if (pushed && !result.delivered) {
      playSound("pop", soundOn);
      const crate = result.state.boxes.find((box) => !previous.boxes.some((old) => sameCell(old, box)));
      if (crate) fx.burst(at(crate), "info");
      if (trapped && !wasTrapped) fx.shake(3);
    }
    if (result.delivered) {
      busyRef.current = true;
      setPending(true);
      playSound("click", soundOn);
      fx.burst(at(result.delivered), "bonus");
      fx.shake(3);
      if (lesson) {
        fx.pop("¡Al camión!", at(result.delivered), "info");
        // Planificar bien da puntos: entregar dentro del par de pasos.
        if (result.state.moves <= par) fx.award(120, at(result.delivered), { label: "¡Dentro del par! +120", tone: "bonus", burst: false });
        void deliverLesson(result.delivered.value);
      } else void resolveRound(result.delivered.value === problem.answer, result.delivered, result.state.moves);
    }
  }

  function undo() {
    if (busyRef.current || frozen || solved || phase !== "playing") return;
    const previous = historyRef.current.pop();
    if (!previous) return;
    boardRef.current = previous;
    setBoard(previous);
    setUndoCount(historyRef.current.length);
    setNotice("Movimiento deshecho. Prueba otro camino.");
    playSound("whoosh", soundOn);
  }

  function restart() {
    if (busyRef.current || frozen || solved || phase !== "playing") return;
    resetBoxes();
    setNotice("Almacén reiniciado. Conservas la misma pregunta y las mismas cajas.");
  }

  // Igual que las flechas, Z sigue funcionando con el foco en los controles
  // externos de pausa. Nunca intercepta la escritura ni atajos del navegador.
  useEffect(() => {
    if (phase !== "playing" || frozen || solved) return;
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target;
      if (event.code !== "KeyZ" || event.ctrlKey || event.metaKey || event.altKey || event.repeat || event.isComposing) return;
      if (target instanceof HTMLElement && target.closest('input, textarea, select, [contenteditable]:not([contenteditable="false"])')) return;
      event.preventDefault();
      undo();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  useArrowKeys(
    {
      up: () => move("U"),
      down: () => move("D"),
      left: () => move("L"),
      right: () => move("R"),
    },
    { enabled: phase === "playing" && !frozen && !solved },
  );

  function onTouchMove(dx: number, dy: number) {
    if (dx !== 0) move(dx > 0 ? "R" : "L");
    else if (dy !== 0) move(dy > 0 ? "D" : "U");
  }

  const shownPhase = solved ? "over" : phase;
  const promptFocus = useArcadeFocus(shownPhase === "playing", frozen);
  const shownCount = lesson ? (exercise?.round ?? 0) + Number(solved) : correctCount;
  const shownWin = lesson ? solved : win;
  const goalProgressPct = Math.min(100, (shownCount / goal) * 100);

  return (
    <div ref={cabinetRef} data-game="cajas" data-paused={Boolean(exercise?.paused || exercise?.disabled)} className="arcade-cabinet relative overflow-hidden rounded-3xl border-4 border-orange-500 bg-slate-950 p-3 text-white shadow-2xl sm:p-6">
      {exercise?.controls}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-20"
        style={{ backgroundImage: "radial-gradient(#fb923c 1px, transparent 0)", backgroundSize: "24px 24px" }}
      />

      <ArcadeFxLayer fx={fx} scope="cabinet" />
      <div className="relative z-10 mx-auto max-w-2xl text-center">
        <h2 className="mb-2 bg-gradient-to-r from-orange-300 to-sky-400 bg-clip-text text-3xl font-extrabold text-transparent">
          📦 Caja numérica
        </h2>
        <p className="mb-4 text-sm text-orange-200">Abre paso entre las cajas y empuja tu respuesta hasta la meta 🚚.</p>

        {shownPhase === "start" && (
          <div className="space-y-6 py-8">
            <ArcadeIntro game="cajas" />
            <button
              type="button"
              onClick={start}
              disabled={frozen}
              className="arcade-start-pulse rounded-2xl border-2 border-white bg-gradient-to-r from-orange-400 to-sky-500 px-10 py-4 text-2xl font-extrabold text-slate-900 shadow-lg transition-transform hover:scale-105"
            >
              ¡Empezar!
            </button>
            <p className="text-xs text-orange-300">
              Solo puedes empujar, nunca tirar de una caja ni empujar dos a la vez. Rodea las paredes y cambia de lado. Sin reloj: puedes deshacer y reiniciar. Entregar con pocos pasos suma puntos extra.
            </p>
          </div>
        )}

        {shownPhase === "playing" && (
          <div className="space-y-4">
            <div
              role="progressbar"
              aria-label="Cajas entregadas"
              aria-valuemin={0}
              aria-valuemax={goal}
              aria-valuenow={shownCount}
              aria-valuetext={`${shownCount} de ${goal} cajas entregadas`}
              className="h-3 w-full overflow-hidden rounded-full bg-orange-950"
            >
              <div
                className="h-3 rounded-full bg-gradient-to-r from-orange-400 to-sky-400 transition-all duration-500"
                style={{ width: `${goalProgressPct}%` }}
              />
            </div>

            <ArcadeScoreBar fx={fx} />
            {!lesson && (
              <div className="flex items-center justify-between rounded-xl border border-orange-700 bg-orange-950/80 p-3 text-sm">
                <span aria-live="polite">
                  <span aria-hidden="true">❤️ </span>Vidas: <strong className="text-orange-300">{lives}</strong>
                </span>
                <span>
                  <span aria-hidden="true">⭐ </span>Estrellas: <strong className="text-sky-300">{starsThisRound}</strong>
                </span>
              </div>
            )}

            <div className="rounded-2xl border-2 border-sky-400 bg-orange-900/30 p-3">
              {problem.flavor && (
                <p aria-hidden="true" className="mb-1 text-xs italic text-orange-300">
                  {problem.flavor}
                </p>
              )}
              <p ref={promptFocus} tabIndex={-1} id={promptId} className={`${gamePromptSize(problem.prompt)} font-black text-sky-200 outline-none`}>
                <PromptText problem={problem} />
              </p>
            </div>

            <div className="flex flex-wrap justify-between gap-2 text-xs text-slate-300"><span>{level.name}</span><span>Pasos: {board.moves}/{par} par · Empujes: {board.pushes}</span></div>
            <div
              aria-hidden="true"
              data-sokoban-board="" data-warehouse={level.id} data-player-x={board.player.x} data-player-y={board.player.y}
              className="relative mx-auto grid max-w-[min(100%,36rem,65vh)] gap-0.5 rounded-2xl border-2 border-amber-700 bg-stone-950 p-2"
              style={{ gridTemplateColumns: `repeat(${level.rows[0].length}, minmax(0, 1fr))` }}
            >
              {Array.from({ length: level.rows.length * level.rows[0].length }, (_, i) => {
                const cell = { x: i % level.rows[0].length, y: Math.floor(i / level.rows[0].length) };
                const box = board.boxes.find((item) => sameCell(item, cell));
                const isPlayer = sameCell(board.player, cell);
                const wall = !floorAt(level, cell);
                const goal = goalAt(level, cell);
                const dead = showTraps && !wall && !deliverable.has(`${cell.x},${cell.y}`);
                return (
                  <div
                    key={i}
                    data-x={cell.x} data-y={cell.y} data-wall={wall || undefined} data-goal={goal || undefined} data-box-id={box?.id} data-dead-square={dead || undefined}
                    className={`relative flex aspect-square min-w-0 items-center justify-center rounded text-xs font-black sm:text-sm ${wall ? "sokoban-wall" : box ? "sokoban-crate text-slate-950" : goal ? "border-2 border-dashed border-cyan-300 bg-cyan-950 text-cyan-100" : "border border-slate-700/70 bg-slate-800"}`}
                  >
                    {dead && <span className="absolute right-0.5 top-0 text-xs font-bold text-rose-200">×</span>}
                    {box ? <span className="arcade-value relative z-10 px-0.5 leading-tight"><ChoiceText problem={problem} value={box.value} /></span> : isPlayer ? <ArcadeSprite kind="worker" className="size-full" /> : goal ? <ArcadeSprite kind="truck" className="size-full" /> : ""}
                  </div>
                );
              })}
              <ArcadeFxLayer fx={fx} />
            </div>

            <p className="text-xs text-slate-300">🧱 Pared · 📦 Caja · 🚚 Meta. Mueve otras cajas si necesitas abrir paso.</p>
            <p role="status" className="min-h-5 text-sm text-amber-200">{pending ? "Entregando tu respuesta…" : notice || "Elige qué caja entregar. Solo llegar a la meta envía una respuesta."}</p>
            <div className="flex flex-wrap justify-center gap-2">
              <button type="button" onClick={undo} disabled={frozen || pending || undoCount === 0} aria-keyshortcuts="Z" className="min-h-11 rounded-xl border border-slate-500 bg-slate-800 px-4 text-sm font-bold text-slate-100 disabled:opacity-50">Deshacer</button>
              <button type="button" onClick={restart} disabled={frozen || pending} className="min-h-11 rounded-xl bg-slate-800 px-4 py-2 text-sm font-bold text-orange-200 hover:bg-slate-700">Reiniciar cajas</button>
              <button type="button" onClick={() => setShowTraps(!showTraps)} aria-pressed={showTraps} disabled={frozen || pending} className="arcade-option">Ver atascos</button>
            </div>
            {showTraps && <p className="text-xs text-rose-100">× Si empujas una caja aquí, no podrá llegar a la meta. Puedes deshacer.</p>}
            <p className="text-xs text-slate-400">Flechas: moverte · Z: deshacer</p>
            <TouchDPad inline repeat={false} disabled={frozen || pending || solved} onMove={onTouchMove} />
          </div>
        )}

        {shownPhase === "over" && (
          <div role="status" className="space-y-6 py-6">
            <div aria-hidden="true" className="arcade-win text-6xl">
              {shownWin ? "🏆" : "📦"}
            </div>
            <h3 className="text-3xl font-bold text-sky-200">{shownWin ? "¡Caja entregada!" : "¡Buen intento!"}</h3>
            <div className="mx-auto max-w-xs space-y-2 rounded-xl border border-orange-700 bg-orange-950 p-4 text-left">
              <div className="flex justify-between">
                <span>Cajas entregadas:</span>
                <strong className="text-sky-300">{shownCount}</strong>
              </div>
              <ArcadeFinalScore fx={fx} />
              {!lesson && (
                <div className="flex justify-between">
                  <span>Estrellas ganadas:</span>
                  <strong className="text-orange-300">+{starsThisRound} ★</strong>
                </div>
              )}
              {bestScore != null && (
                <div className="flex justify-between border-t border-orange-800 pt-2">
                  <span>Tu marca:</span>
                  <strong className="text-orange-300">{correctCount > bestScore ? <>¡Nueva marca! 🏅 {correctCount}</> : bestScore}</strong>
                </div>
              )}
            </div>
            {!lesson && (
              <button type="button" onClick={start} className="rounded-xl bg-sky-600 px-8 py-3 font-bold text-white hover:bg-sky-500">
                Jugar de nuevo 🔄
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
