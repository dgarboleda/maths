"use client";

import Link from 'next/link';
import styles from './target.module.css';
import { useEffect, useRef, useState } from 'react';
import { useTargetProgress } from '@/lib/minigames/useTargetProgress';
import { LearningShell, primaryButton, secondaryButton } from '@/components/learning/LearningShell';
import { applyMove, findAlternative, makePuzzle, makePracticePuzzle, solveBoard, OPERATIONS, type Operation, type GameTile } from '@/lib/minigames/targetMasters';

const worldColors = ['from-emerald-950 via-slate-900 to-teal-950', 'from-amber-950 via-slate-900 to-orange-950', 'from-cyan-950 via-slate-900 to-blue-950', 'from-emerald-950 via-slate-900 to-violet-950', 'from-indigo-950 via-slate-900 to-violet-950'];
const worlds = ['Jardín de los Números', 'Montaña de los Factores', 'Templo de las Divisiones', 'Bosque de los Signos', 'Ciudad de los Portales'];
type Mode = 'aventura' | 'practica' | 'diario' | 'infinito' | 'tiempo';
const MODES: { id: Mode; label: string; description: string; icon: string }[] = [
  { id: 'aventura', label: 'Aventura', description: 'Abre portales y descubre cinco mundos.', icon: '🗺️' },
  { id: 'practica', label: 'Práctica', description: 'Elige operaciones y juega a tu ritmo.', icon: '🧩' },
  { id: 'diario', label: 'Reto diario', description: 'Un nuevo acertijo cada día.', icon: '✨' },
  { id: 'infinito', label: 'Infinito', description: 'Sigue abriendo portales sin límite.', icon: '♾️' },
  { id: 'tiempo', label: 'Contrarreloj', description: '¿Cuántos portales abres en 90 segundos?', icon: '⏱️' },
];
const tileSet = (numbers: number[], special = 0): GameTile[] => numbers.map((value, i) => ({ id: String(i), value, expression: String(value), special: special === 1 && i < 2 ? 'gemela' : special === 2 && i === 2 ? 'congelada' : special === 3 && i === 0 ? 'cambiante' : 'normal', ...(special === 3 && i === 0 ? { alternate: value + 1 } : {}) }));
const dayKey = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
const daySeed = (day: string) => Number(day.replaceAll('-', ''));

export function TargetMasters({ childId }: { childId: string }) {
  const { setProgress, visible: progress, loaded, syncStatus } = useTargetProgress(childId);
  const [mode, setMode] = useState<Mode>('aventura');
  const [showModeMenu, setShowModeMenu] = useState(true);
  const boardRef = useRef<HTMLElement>(null);
  const menuRef = useRef<HTMLElement>(null);
  const timerDeadline = useRef<number | null>(null);
  const [hasStarted, setHasStarted] = useState(false);
  const [level, setLevel] = useState(1);
  const [seed, setSeed] = useState(0);
  const [tiles, setTiles] = useState<GameTile[]>(() => tileSet(makePuzzle(0).numbers));
  const [practiceOps, setPracticeOps] = useState<Operation[]>(['+', '−', '×', '÷']);
  const [difficulty, setDifficulty] = useState(1);
  const [configuredPuzzle, setConfiguredPuzzle] = useState(() => makePuzzle(0));
  const [seconds, setSeconds] = useState(90);
  const [score, setScore] = useState(0);
  const [moves, setMoves] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [showSolution, setShowSolution] = useState(false);
  const [revealTarget, setRevealTarget] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [operation, setOperation] = useState<Operation | null>(null);
  const [history, setHistory] = useState<GameTile[][]>([]);
  const [hints, setHints] = useState(0);
  const [message, setMessage] = useState('Selecciona dos fichas y una operación para combinarlas.');
  const [won, setWon] = useState(false);
  const [expression, setExpression] = useState('');
  const puzzle = configuredPuzzle;
  function start(nextMode: Mode, nextLevel: number, nextSeed?: number) {
    const s = nextSeed ?? (nextMode === 'diario' ? daySeed(dayKey()) : nextLevel - 1);
    const nextPuzzle = nextMode === 'practica' ? makePracticePuzzle(s, practiceOps, difficulty) : makePuzzle(s);
    const special = nextMode === 'aventura' && nextLevel > 10 ? (nextLevel % 20 === 0 ? 1 : nextLevel % 4 === 0 ? 2 : nextLevel % 5 === 0 ? 3 : 0) : 0;
    setShowModeMenu(false); setHasStarted(true);
    setMode(nextMode); setLevel(nextLevel); setSeed(s); setConfiguredPuzzle(nextPuzzle); setTiles(tileSet(nextPuzzle.numbers, special));
    setSelected([]); setOperation(null); setHistory([]); setHints(0); setMoves(0); setMistakes(0); setShowSolution(false); setRevealTarget(false); setWon(false); setExpression('');
    if (nextMode === 'tiempo' && (showModeMenu || mode !== 'tiempo')) { timerDeadline.current = null; setSeconds(90); setScore(0); }
    setMessage('Selecciona dos fichas y una operación para combinarlas.');
  }
  function combine() {
    if (selected.length !== 2 || !operation || won) return;
    const left = tiles.find(t => t.id === selected[0])!, right = tiles.find(t => t.id === selected[1])!;
    if (history.length === 0) setProgress(current => ({ ...current, attempts: (current.attempts ?? 0) + 1 }));
    const next = applyMove(tiles, left.id, right.id, operation);
    if (!next) { setMistakes(mistakes + 1); setMessage('Movimiento no permitido. Revisa las fichas especiales y la operación.'); return; }
    const combined = next[next.length - 1];
    const result = combined.value;
    setMoves(moves + 1);
    setProgress(current => ({ ...current, operationsUsed: { ...current.operationsUsed, [operation]: (current.operationsUsed?.[operation] ?? 0) + 1 } }));
    setHistory([...history, tiles]); setTiles(next); setSelected([]); setOperation(null);
    if (next.length === 1 && result === puzzle.target) {
      if (mode === 'tiempo') setScore(score + 1);
      setWon(true); setExpression(combined.expression); setMessage('¡Portal abierto! Encontraste una solución.');
      setProgress(current => {
        const stars = 1 + (hints === 0 ? 1 : 0) + (mistakes === 0 && moves + 1 === puzzle.numbers.length - 1 ? 1 : 0);
        return { ...current, unlocked: mode === 'aventura' ? Math.max(current.unlocked, Math.min(100, level + 1)) : current.unlocked,
          stars: mode === 'aventura' ? { ...current.stars, [level]: Math.max(current.stars[level] ?? 0, stars) } : current.stars,
          daily: mode === 'diario' ? dayKey() : current.daily, completed: (current.completed ?? 0) + 1, dailyDates: mode === 'diario' && progress.daily !== dayKey() ? [...new Set([...(current.dailyDates ?? []), dayKey()])].slice(-366) : current.dailyDates };
      });
    } else if (next.length === 1) setMessage('No llegaste al objetivo. Deshaz el último movimiento y prueba otra ruta.');
    else setMessage(`${left.value} ${operation} ${right.value} = ${result}. ¡Sigue combinando!`);
  }
  function undo() {
    const previous = history.at(-1); if (!previous || won) return;
    setMistakes(mistakes + 1); setTiles(previous); setHistory(history.slice(0, -1)); setSelected([]); setOperation(null); setMessage('Movimiento deshecho.');
  }
  function hint() {
    const next = solveBoard(tiles, puzzle.target, puzzle.operations);
    setHints(hints + 1);
    setProgress(current => ({ ...current, hintsUsed: (current.hintsUsed ?? 0) + 1 }));
    if (!next?.length) { setMessage(tiles.some(tile => tile.special === 'cambiante') ? 'Prueba cambiar la ficha cambiante, deshacer un movimiento o reiniciar.' : 'Desde aquí no encontramos una solución. Deshaz un movimiento o reinicia.'); return; }
    const s = next[0];
    const left = tiles.find(t => t.id === s.leftId)!, right = tiles.find(t => t.id === s.rightId)!;
    setMessage(hints === 0 ? `Pista: prueba combinar ${left.value} y ${right.value}.` : `Pista: ${left.value} ${s.op} ${right.value} = ${s.result}.`);
  }
  useEffect(() => {
    if (showModeMenu || mode !== 'tiempo' || seconds <= 0 || won) { timerDeadline.current = null; return; }
    const deadline = timerDeadline.current ?? Date.now() + seconds * 1000;
    timerDeadline.current = deadline;
    const timer = window.setTimeout(() => setSeconds(Math.max(0, Math.ceil((deadline - Date.now()) / 1000))), 1000);
    return () => window.clearTimeout(timer);
  }, [mode, seconds, won, showModeMenu]);
  useEffect(() => {
    if (hasStarted) (showModeMenu ? menuRef.current : boardRef.current)?.focus();
  }, [showModeMenu, hasStarted]);
  const world = Math.min(4, Math.floor((level - 1) / 20));
  const special = mode === 'aventura' && level > 10 ? (level % 20 === 0 ? 1 : level % 4 === 0 ? 2 : level % 5 === 0 ? 3 : 0) : 0;
  const alternative = won && showSolution ? findAlternative(tileSet(puzzle.numbers, special), puzzle.target, puzzle.operations, expression) : null;
  return <LearningShell childId={childId} title="Target Masters" eyebrow="Minijuegos · abre el portal">
    <div className="mx-auto max-w-3xl space-y-5">
      <Link href={`/jugar/${childId}/practicar`} className="inline-block text-sm font-bold text-cyan-200 hover:underline">← Volver a practicar</Link>
      {showModeMenu && <div className={`${styles.hero} relative overflow-hidden rounded-3xl border border-indigo-300/30 px-5 py-7 sm:px-8 sm:py-10`}>
        <div className="relative max-w-md"><span className="rounded-full border border-cyan-200/30 bg-slate-950/70 px-3 py-1 text-xs font-bold uppercase tracking-widest text-cyan-200">✦ Tu próxima aventura</span><h2 className="mt-4 text-2xl font-black text-white sm:text-3xl">Despierta los portales</h2><p className="mt-2 max-w-sm text-sm leading-relaxed text-slate-200">Combina números, descubre nuevas rutas y llena de magia cada mundo.</p></div>
      </div>}
      <fieldset disabled={!loaded} className="space-y-5">
      {showModeMenu ? <section ref={menuRef} tabIndex={-1} aria-labelledby="target-modes" className="rounded-3xl border border-violet-300/25 bg-slate-900/80 p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 id="target-modes" className="text-xl font-bold text-white">Elige tu aventura</h2><p className="mt-1 text-sm text-slate-300">Cada modo es una forma distinta de abrir portales.</p></div>{hasStarted && <button type="button" className={secondaryButton} onClick={() => setShowModeMenu(false)}>Continuar partida</button>}</div>
        {hasStarted && <p className="mt-3 text-sm text-slate-400">Elegir un modo inicia un desafío nuevo. Puedes continuar tu partida actual.</p>}
        <div className="mt-5 grid gap-3 sm:grid-cols-2">{MODES.map(({ id, label, description, icon }) => <button key={id} type="button" onClick={() => start(id, id === 'aventura' ? Math.min(progress.unlocked, 100) : 1, id === 'practica' || id === 'infinito' || id === 'tiempo' ? Math.floor(Math.random() * 10000) : undefined)} className="flex min-h-24 items-center gap-4 rounded-2xl border border-violet-300/25 bg-violet-950/40 p-4 text-left transition hover:border-cyan-300 hover:bg-violet-900/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300"><span className="grid size-12 shrink-0 place-items-center rounded-xl bg-violet-400/15 text-2xl" aria-hidden="true">{icon}</span><span><strong className="block text-white">{label}</strong><span className="mt-1 block text-sm text-slate-300">{description}</span></span></button>)}</div>
      </section> : <>
      {mode === 'practica' && <div className="rounded-2xl border border-slate-700 bg-slate-900 p-4"><p className="font-bold">Configura tu práctica</p><div className="mt-2 flex flex-wrap gap-2">{OPERATIONS.map(op => <button type="button" key={op} aria-pressed={practiceOps.includes(op)} className={secondaryButton} onClick={() => setPracticeOps(current => current.includes(op) ? current.length > 1 ? current.filter(item => item !== op) : current : [...current, op])}>{op}</button>)}<label className="flex items-center gap-2">Dificultad <select className="rounded bg-slate-800 p-2" value={difficulty} onChange={event => setDifficulty(Number(event.target.value))}><option value={0}>Inicial</option><option value={1}>Intermedia</option><option value={2}>Avanzada</option></select></label><button className={primaryButton} onClick={() => start('practica', 1, Math.floor(Math.random() * 10000))}>Crear desafío</button></div></div>}
      {mode === 'tiempo' && <p className="rounded-xl bg-slate-800 p-3">Tiempo: {seconds} s · Portales abiertos: {score}{seconds === 0 ? <span role="status"> · Tiempo agotado</span> : null} <button className="ml-2 underline" onClick={() => { timerDeadline.current = null; setSeconds(90); setScore(0); start('tiempo', 1, Math.floor(Math.random() * 10000)); }}>Empezar de nuevo</button></p>}
      <section ref={boardRef} tabIndex={-1} aria-label="Tablero de Target Masters" className={`overflow-hidden rounded-3xl border border-violet-300/30 bg-gradient-to-br ${worldColors[mode === 'aventura' ? world : 4]} p-5 shadow-xl sm:p-8`}>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><span className="text-xs font-bold uppercase tracking-widest text-cyan-200">{MODES.find(item => item.id === mode)?.label}</span><button type="button" className={secondaryButton} onClick={() => setShowModeMenu(true)}>Cambiar modo</button></div>
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm font-semibold text-violet-200"><span>{mode === 'aventura' ? `${worlds[world]} · Nivel ${level}/100${level % 20 === 0 ? ' · Guardián de las gemelas' : ''}` : mode === 'diario' ? `Reto diario${progress.daily === dayKey() ? ' · Completado ✓' : ''}` : mode === 'practica' ? 'Práctica libre' : mode === 'tiempo' ? 'Contrarreloj' : 'Viaje infinito'}</span>{mode === 'aventura' && <span>⭐ {progress.stars[level] ?? 0}/3</span>}</div>
        <div className={`${styles.portal} mx-auto my-7 grid size-36 place-items-center rounded-full border-4 text-center shadow-[0_0_45px_rgba(167,139,250,0.35)] ${won ? 'border-emerald-300 bg-emerald-400/20' : 'border-violet-300 bg-violet-500/20'}`}><div><div className="text-xs font-bold uppercase tracking-widest text-violet-100">Objetivo</div><div aria-live="polite" className="text-5xl font-black text-white">{puzzle.clue && !revealTarget && !won ? '?' : puzzle.target}</div></div></div>
        {puzzle.clue && <div className="mx-auto mb-5 max-w-lg rounded-2xl border border-cyan-300/25 bg-slate-950/60 p-4 text-center"><p className="text-xs font-bold uppercase tracking-widest text-cyan-200">Acertijo del portal</p><p className="mt-2 font-semibold text-white">{puzzle.clue}</p>{!won && <button type="button" aria-disabled={revealTarget} className="mt-3 min-h-11 rounded-lg px-3 text-sm font-semibold text-cyan-200 underline hover:text-white focus-visible:outline-2 focus-visible:outline-cyan-300 aria-disabled:text-slate-400" onClick={() => { if (revealTarget) return; setRevealTarget(true); setHints(current => current + 1); setProgress(current => ({ ...current, hintsUsed: (current.hintsUsed ?? 0) + 1 })); }}>{revealTarget ? 'Objetivo revelado' : 'Revelar objetivo (usa una pista)'}</button>}<p className="mt-2 text-xs text-slate-300">Resuelve el acertijo y alcanza ese número usando todas las fichas.</p></div>}
        <p className="text-center text-sm text-slate-300">Usa todas las fichas; puedes elegir entre las cuatro operaciones. El orden importa en la resta y la división.</p>
        <div className="mt-5 flex flex-wrap justify-center gap-3" aria-label="Fichas numéricas">{tiles.map(tile => <button key={tile.id} type="button" disabled={won} aria-pressed={selected.includes(tile.id)} aria-label={`Ficha ${tile.value}${tile.special === 'normal' ? '' : `, ${tile.special}`}${selected.includes(tile.id) ? ', seleccionada' : ''}`} onClick={() => setSelected(current => current.includes(tile.id) ? current.filter(id => id !== tile.id) : current.length < 2 ? [...current, tile.id] : [tile.id])} className={`min-h-16 min-w-16 rounded-2xl border-2 px-4 text-2xl font-black shadow-lg shadow-violet-950/50 transition hover:-translate-y-1 motion-reduce:transform-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300 ${selected.includes(tile.id) ? 'border-cyan-200 bg-cyan-400 text-slate-950' : 'border-violet-300/50 bg-violet-900/70 text-white hover:bg-violet-800'}`}>{tile.value}{tile.special !== 'normal' && <span className="block text-xs">{tile.special === 'gemela' ? '👯 Gemela' : tile.special === 'congelada' ? '❄ Congelada' : '🔄 Cambiante'}</span>}</button>)}</div>
        {tiles.some(t => t.special === 'cambiante') && !won && <div className="mt-3 text-center">{tiles.filter(t => t.special === 'cambiante').map(tile => <button className={secondaryButton} key={tile.id} onClick={() => { setTiles(current => current.map(t => t.id === tile.id ? { ...t, value: t.alternate!, alternate: t.value, expression: String(t.alternate) } : t)); setSelected([]); }}>Cambiar {tile.value} por {tile.alternate}</button>)}</div>}
        {tiles.some(t => t.special !== 'normal') && <p className="mt-3 text-center text-sm text-violet-200">Las gemelas se combinan entre sí; la ficha congelada se libera tras otro movimiento; la cambiante puede cambiar de valor.</p>}
        <div className="mt-5 flex flex-wrap justify-center gap-2" aria-label="Operaciones">{puzzle.operations.map(op => <button key={op} type="button" disabled={won} aria-label={{'+':'Sumar','−':'Restar','×':'Multiplicar','÷':'Dividir'}[op]} aria-pressed={operation === op} onClick={() => setOperation(op)} className={`size-12 rounded-xl border text-2xl font-bold ${operation === op ? 'border-cyan-200 bg-cyan-400 text-slate-950' : 'border-slate-500 bg-slate-800 text-white hover:bg-slate-700'}`}>{op}</button>)}</div>
        <div className="mt-5 flex flex-wrap justify-center gap-2"><button className={primaryButton} onClick={combine} disabled={selected.length !== 2 || !operation || won || (mode === 'tiempo' && seconds === 0)}>Combinar</button><button className={secondaryButton} onClick={undo} disabled={!history.length || won}>Deshacer</button><button className={secondaryButton} onClick={hint} disabled={won}>Pista</button><button className={secondaryButton} onClick={() => start(mode, level, seed)}>Reiniciar</button></div>
        <p aria-live="polite" className="mt-5 min-h-12 rounded-xl bg-slate-950/60 p-3 text-center text-sm text-slate-100">{message}{won && <span className="mt-2 block font-bold text-emerald-200">{expression} = {puzzle.target}</span>}</p>
        {won && <div className="mt-4 text-center"><p className="mb-2 text-sm">⭐ Completar · ⭐ Sin pistas · ⭐ Sin deshacer ni movimientos inválidos</p><button className={secondaryButton} onClick={() => setShowSolution(!showSolution)}>{showSolution ? 'Ocultar laboratorio' : 'Ver laboratorio de soluciones'}</button>{showSolution && <div className="mt-3 rounded-xl bg-slate-950/60 p-3 text-sm"><p>Tu solución: {expression} = {puzzle.target}</p><p className="mt-2">{alternative ? `Otra solución: ${alternative.expression} = ${puzzle.target}. Pasos: ${alternative.steps.map(step => `${step.left} ${step.op} ${step.right} = ${step.result}`).join(' → ')}` : 'No encontramos otra expresión con las fichas y reglas de este nivel.'}</p></div>}<div className="mt-3"><button className={primaryButton} onClick={() => mode === 'aventura' ? start(mode, Math.min(100, level + 1)) : start(mode, level + 1, mode === 'diario' ? seed : Math.floor(Math.random() * 10000))}>{mode === 'diario' ? 'Volver a jugar' : level === 100 && mode === 'aventura' ? 'Repetir último nivel' : 'Siguiente desafío →'}</button></div></div>}
      </section>
      {mode === 'aventura' && <div className="rounded-2xl border border-slate-700 bg-slate-900 p-4"><label htmlFor="target-level" className="mr-3 text-sm font-bold">Elegir nivel desbloqueado</label><select id="target-level" value={level} onChange={event => start('aventura', Number(event.target.value))} className="rounded-lg border border-slate-500 bg-slate-800 p-2 text-white">{Array.from({ length: progress.unlocked }, (_, i) => <option key={i} value={i + 1}>Nivel {i + 1} {progress.stars[i + 1] ? `· ${progress.stars[i + 1]} estrellas` : ''}</option>)}</select></div>}
      </>}
      </fieldset>
      <p className="text-sm text-violet-200">Insignia diaria: {(progress.dailyWins ?? 0) >= 10 ? '👑 Maestría estelar' : (progress.dailyWins ?? 0) >= 3 ? '🌟 Guardián del portal' : '✨ Explorador'} ({progress.dailyWins ?? 0} retos) · Intentos: {progress.attempts ?? 0} · Completados: {progress.completed ?? 0} · Pistas usadas: {progress.hintsUsed ?? 0} · Operaciones: {OPERATIONS.map(op => `${op} ${progress.operationsUsed?.[op] ?? 0}`).join(' · ')}</p>
      <p className="text-sm text-slate-400">{!loaded ? 'Cargando progreso…' : syncStatus === 'sincronizado' ? 'Progreso sincronizado con tu perfil.' : syncStatus === 'conectando' ? 'Conectando tu progreso…' : syncStatus === 'pendiente' ? 'Sin conexión: guardado en este dispositivo; se sincronizará al reconectar.' : syncStatus === 'error' ? 'No se pudo sincronizar; tu progreso sigue en este dispositivo.' : 'Progreso guardado en este dispositivo.'} Tus logros de clase no cambian.</p>
    </div>
  </LearningShell>;
}
