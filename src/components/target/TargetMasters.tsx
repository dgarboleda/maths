"use client";

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { LearningShell, primaryButton, secondaryButton } from '@/components/learning/LearningShell';
import { applyMove, findAlternative, makePuzzle, makePracticePuzzle, solveBoard, OPERATIONS, type Operation, type GameTile } from '@/lib/minigames/targetMasters';

const worldColors = ['from-emerald-950 via-slate-900 to-teal-950', 'from-amber-950 via-slate-900 to-orange-950', 'from-cyan-950 via-slate-900 to-blue-950', 'from-emerald-950 via-slate-900 to-violet-950', 'from-indigo-950 via-slate-900 to-violet-950'];
const worlds = ['Jardín de las Sumas', 'Montaña de los Factores', 'Templo de las Divisiones', 'Bosque de los Signos', 'Ciudad de los Portales'];
type Mode = 'aventura' | 'practica' | 'diario' | 'infinito' | 'tiempo';
type Progress = { unlocked: number; stars: Record<string, number>; daily: string; attempts?: number; completed?: number; hintsUsed?: number; operationsUsed?: Partial<Record<Operation, number>>; dailyWins?: number };
const fresh: Progress = { unlocked: 1, stars: {}, daily: '' };
const tileSet = (numbers: number[], special = 0): GameTile[] => numbers.map((value, i) => ({ id: String(i), value, expression: String(value), special: special === 1 && i < 2 ? 'gemela' : special === 2 && i === 2 ? 'congelada' : special === 3 && i === 0 ? 'cambiante' : 'normal', ...(special === 3 && i === 0 ? { alternate: value + 1 } : {}) }));
const dayKey = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
const daySeed = (day: string) => Number(day.replaceAll('-', ''));

export function TargetMasters({ childId }: { childId: string }) {
  const [progress, setProgress] = useState<Progress>(fresh);
  const [loaded, setLoaded] = useState(false);
  const [mode, setMode] = useState<Mode>('aventura');
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
  const [selected, setSelected] = useState<string[]>([]);
  const [operation, setOperation] = useState<Operation | null>(null);
  const [history, setHistory] = useState<GameTile[][]>([]);
  const [hints, setHints] = useState(0);
  const [message, setMessage] = useState('Selecciona dos fichas y una operación para combinarlas.');
  const [won, setWon] = useState(false);
  const [expression, setExpression] = useState('');
  const puzzle = configuredPuzzle;
  const key = `numerario:target-masters:${childId}`;

  useEffect(() => {
    let cancelled = false;
    Promise.resolve().then(() => {
    if (cancelled) return;
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (typeof parsed.unlocked === 'number' && parsed.stars && typeof parsed.stars === 'object') setProgress({ unlocked: Math.min(100, Math.max(1, parsed.unlocked)), stars: parsed.stars, daily: typeof parsed.daily === 'string' ? parsed.daily : '', attempts: parsed.attempts ?? 0, completed: parsed.completed ?? 0, hintsUsed: parsed.hintsUsed ?? 0, operationsUsed: parsed.operationsUsed ?? {}, dailyWins: parsed.dailyWins ?? 0 });
      }
    } catch { /* El juego sigue funcionando sin almacenamiento. */ }
    setLoaded(true);
    });
    return () => { cancelled = true; };
  }, [key]);
  useEffect(() => {
    if (!loaded) return;
    try { localStorage.setItem(key, JSON.stringify(progress)); } catch { /* Progreso disponible durante la sesión. */ }
  }, [key, loaded, progress]);

  function start(nextMode: Mode, nextLevel: number, nextSeed?: number) {
    const s = nextSeed ?? (nextMode === 'diario' ? daySeed(dayKey()) : nextLevel - 1);
    const nextPuzzle = nextMode === 'practica' ? makePracticePuzzle(s, practiceOps, difficulty) : makePuzzle(s);
    const special = nextMode === 'aventura' && nextLevel > 10 ? (nextLevel % 20 === 0 ? 1 : nextLevel % 4 === 0 ? 2 : nextLevel % 5 === 0 ? 3 : 0) : 0;
    setMode(nextMode); setLevel(nextLevel); setSeed(s); setConfiguredPuzzle(nextPuzzle); setTiles(tileSet(nextPuzzle.numbers, special));
    setSelected([]); setOperation(null); setHistory([]); setHints(0); setMoves(0); setMistakes(0); setShowSolution(false); setWon(false); setExpression('');
    if (nextMode === 'tiempo' && mode !== 'tiempo') { setSeconds(90); setScore(0); }
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
          daily: mode === 'diario' ? dayKey() : current.daily, completed: (current.completed ?? 0) + 1, dailyWins: mode === 'diario' && current.daily !== dayKey() ? (current.dailyWins ?? 0) + 1 : current.dailyWins };
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
    if (!next?.length) { setMessage('Desde aquí no encontramos una solución. Deshaz un movimiento o reinicia.'); return; }
    const s = next[0];
    const left = tiles.find(t => t.id === s.leftId)!, right = tiles.find(t => t.id === s.rightId)!;
    setMessage(hints === 0 ? `Pista: prueba combinar ${left.value} y ${right.value}.` : `Pista: ${left.value} ${s.op} ${right.value} = ${s.result}.`);
  }
  useEffect(() => {
    if (mode !== 'tiempo' || seconds <= 0 || won) return;
    const timer = window.setTimeout(() => setSeconds(value => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [mode, seconds, won]);
  const world = Math.min(4, Math.floor((level - 1) / 20));
  const special = mode === 'aventura' && level > 10 ? (level % 20 === 0 ? 1 : level % 4 === 0 ? 2 : level % 5 === 0 ? 3 : 0) : 0;
  const alternative = won && showSolution ? findAlternative(tileSet(puzzle.numbers, special), puzzle.target, puzzle.operations, expression) : null;
  return <LearningShell childId={childId} title="Target Masters" eyebrow="Minijuegos · abre el portal">
    <div className="mx-auto max-w-3xl space-y-5">
      <Link href={`/jugar/${childId}/practicar`} className="inline-block text-sm font-bold text-cyan-200 hover:underline">← Volver a practicar</Link>
      <div className="flex flex-wrap gap-2" aria-label="Modos de juego">
        {([['aventura', 'Aventura'], ['practica', 'Práctica'], ['diario', 'Reto diario'], ['infinito', 'Infinito'], ['tiempo', 'Contrarreloj']] as const).map(([id, label]) => <button key={id} type="button" onClick={() => start(id, id === 'aventura' ? Math.min(progress.unlocked, 100) : 1, id === 'practica' || id === 'infinito' || id === 'tiempo' ? Math.floor(Math.random() * 10000) : undefined)} aria-pressed={mode === id} className={`${secondaryButton} ${mode === id ? 'border-violet-300 bg-violet-900' : ''}`}>{label}</button>)}
      </div>
      {mode === 'practica' && <div className="rounded-2xl border border-slate-700 bg-slate-900 p-4"><p className="font-bold">Configura tu práctica</p><div className="mt-2 flex flex-wrap gap-2">{OPERATIONS.map(op => <button type="button" key={op} aria-pressed={practiceOps.includes(op)} className={secondaryButton} onClick={() => setPracticeOps(current => current.includes(op) ? current.length > 1 ? current.filter(item => item !== op) : current : [...current, op])}>{op}</button>)}<label className="flex items-center gap-2">Dificultad <select className="rounded bg-slate-800 p-2" value={difficulty} onChange={event => setDifficulty(Number(event.target.value))}><option value={0}>Inicial</option><option value={1}>Intermedia</option><option value={2}>Avanzada</option></select></label><button className={primaryButton} onClick={() => start('practica', 1, Math.floor(Math.random() * 10000))}>Crear desafío</button></div></div>}
      {mode === 'tiempo' && <p className="rounded-xl bg-slate-800 p-3" role="status">Tiempo: {seconds} s · Portales abiertos: {score}{seconds === 0 ? ' · Tiempo agotado' : ''} <button className="ml-2 underline" onClick={() => { setSeconds(90); setScore(0); start('tiempo', 1, Math.floor(Math.random() * 10000)); }}>Empezar de nuevo</button></p>}
      <section className={`overflow-hidden rounded-3xl border border-violet-300/30 bg-gradient-to-br ${worldColors[mode === 'aventura' ? world : 4]} p-5 shadow-xl sm:p-8`}>
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm font-semibold text-violet-200"><span>{mode === 'aventura' ? `${worlds[world]} · Nivel ${level}/100${level % 20 === 0 ? ' · Guardián de las gemelas' : ''}` : mode === 'diario' ? `Reto diario${progress.daily === dayKey() ? ' · Completado ✓' : ''}` : mode === 'practica' ? 'Práctica libre' : mode === 'tiempo' ? 'Contrarreloj' : 'Viaje infinito'}</span>{mode === 'aventura' && <span>⭐ {progress.stars[level] ?? 0}/3</span>}</div>
        <div className={`mx-auto my-7 grid size-36 place-items-center rounded-full border-4 text-center shadow-[0_0_45px_rgba(167,139,250,0.35)] ${won ? 'border-emerald-300 bg-emerald-400/20' : 'border-violet-300 bg-violet-500/20'}`}><div><div className="text-xs font-bold uppercase tracking-widest text-violet-100">Objetivo</div><div className="text-5xl font-black text-white">{puzzle.target}</div></div></div>
        <p className="text-center text-sm text-slate-300">Usa todas las fichas. El orden importa en la resta y la división.</p>
        <div className="mt-5 flex flex-wrap justify-center gap-3" aria-label="Fichas numéricas">{tiles.map(tile => <button key={tile.id} type="button" disabled={won} aria-pressed={selected.includes(tile.id)} aria-label={`Ficha ${tile.value}${selected.includes(tile.id) ? ', seleccionada' : ''}`} onClick={() => setSelected(current => current.includes(tile.id) ? current.filter(id => id !== tile.id) : current.length < 2 ? [...current, tile.id] : [tile.id])} className={`min-h-16 min-w-16 rounded-2xl border-2 px-4 text-2xl font-black transition ${selected.includes(tile.id) ? 'border-cyan-200 bg-cyan-400 text-slate-950' : 'border-violet-300/50 bg-violet-900/70 text-white hover:bg-violet-800'}`}>{tile.value}{tile.special !== 'normal' && <span className="block text-xs">{tile.special === 'gemela' ? '👯 Gemela' : tile.special === 'congelada' ? '❄ Congelada' : '🔄 Cambiante'}</span>}</button>)}</div>
        {tiles.some(t => t.special === 'cambiante') && !won && <div className="mt-3 text-center">{tiles.filter(t => t.special === 'cambiante').map(tile => <button className={secondaryButton} key={tile.id} onClick={() => { setTiles(current => current.map(t => t.id === tile.id ? { ...t, value: t.alternate!, alternate: t.value, expression: String(t.alternate) } : t)); setSelected([]); }}>Cambiar {tile.value} por {tile.alternate}</button>)}</div>}
        {tiles.some(t => t.special !== 'normal') && <p className="mt-3 text-center text-sm text-violet-200">Las gemelas se combinan entre sí; la ficha congelada se libera tras otro movimiento; la cambiante puede cambiar de valor.</p>}
        <div className="mt-5 flex flex-wrap justify-center gap-2" aria-label="Operaciones">{puzzle.operations.map(op => <button key={op} type="button" disabled={won} aria-label={{'+':'Sumar','−':'Restar','×':'Multiplicar','÷':'Dividir'}[op]} aria-pressed={operation === op} onClick={() => setOperation(op)} className={`size-12 rounded-xl border text-2xl font-bold ${operation === op ? 'border-cyan-200 bg-cyan-400 text-slate-950' : 'border-slate-500 bg-slate-800 text-white hover:bg-slate-700'}`}>{op}</button>)}</div>
        <div className="mt-5 flex flex-wrap justify-center gap-2"><button className={primaryButton} onClick={combine} disabled={selected.length !== 2 || !operation || won || (mode === 'tiempo' && seconds === 0)}>Combinar</button><button className={secondaryButton} onClick={undo} disabled={!history.length || won}>Deshacer</button><button className={secondaryButton} onClick={hint} disabled={won}>Pista</button><button className={secondaryButton} onClick={() => start(mode, level, seed)}>Reiniciar</button></div>
        <p aria-live="polite" className="mt-5 min-h-12 rounded-xl bg-slate-950/60 p-3 text-center text-sm text-slate-100">{message}{won && <span className="mt-2 block font-bold text-emerald-200">{expression} = {puzzle.target}</span>}</p>
        {won && <div className="mt-4 text-center"><p className="mb-2 text-sm">⭐ Completar · ⭐ Sin pistas · ⭐ Sin deshacer ni movimientos inválidos</p><button className={secondaryButton} onClick={() => setShowSolution(!showSolution)}>{showSolution ? 'Ocultar laboratorio' : 'Ver laboratorio de soluciones'}</button>{showSolution && <div className="mt-3 rounded-xl bg-slate-950/60 p-3 text-sm"><p>Tu solución: {expression} = {puzzle.target}</p><p className="mt-2">{alternative ? `Otra solución: ${alternative.expression} = ${puzzle.target}. Pasos: ${alternative.steps.map(step => `${step.left} ${step.op} ${step.right} = ${step.result}`).join(' → ')}` : 'No encontramos otra expresión con las fichas y reglas de este nivel.'}</p></div>}<div className="mt-3"><button className={primaryButton} onClick={() => mode === 'aventura' ? start(mode, Math.min(100, level + 1)) : start(mode, level + 1, mode === 'diario' ? seed : Math.floor(Math.random() * 10000))}>{mode === 'diario' ? 'Volver a jugar' : level === 100 && mode === 'aventura' ? 'Repetir último nivel' : 'Siguiente desafío →'}</button></div></div>}
      </section>
      {mode === 'aventura' && <div className="rounded-2xl border border-slate-700 bg-slate-900 p-4"><label htmlFor="target-level" className="mr-3 text-sm font-bold">Elegir nivel desbloqueado</label><select id="target-level" value={level} onChange={event => start('aventura', Number(event.target.value))} className="rounded-lg border border-slate-500 bg-slate-800 p-2 text-white">{Array.from({ length: progress.unlocked }, (_, i) => <option key={i} value={i + 1}>Nivel {i + 1} {progress.stars[i + 1] ? `· ${progress.stars[i + 1]} estrellas` : ''}</option>)}</select></div>}
      <p className="text-sm text-violet-200">Insignia diaria: {(progress.dailyWins ?? 0) >= 10 ? '👑 Maestría estelar' : (progress.dailyWins ?? 0) >= 3 ? '🌟 Guardián del portal' : '✨ Explorador'} ({progress.dailyWins ?? 0} retos) · Intentos: {progress.attempts ?? 0} · Completados: {progress.completed ?? 0} · Pistas usadas: {progress.hintsUsed ?? 0} · Operaciones: {OPERATIONS.map(op => `${op} ${progress.operationsUsed?.[op] ?? 0}`).join(' · ')}</p>
      <p className="text-sm text-slate-400">Tu progreso se guarda en este dispositivo y no modifica tus logros de clase.</p>
    </div>
  </LearningShell>;
}
