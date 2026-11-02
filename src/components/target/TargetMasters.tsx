"use client";

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { LearningShell, primaryButton, secondaryButton } from '@/components/learning/LearningShell';
import { calculate, makePuzzle, solve, type Operation, type Tile } from '@/lib/minigames/targetMasters';

const worlds = ['Jardín de las Sumas', 'Montaña de los Factores', 'Templo de las Divisiones', 'Bosque de los Signos', 'Ciudad de los Portales'];
type Mode = 'aventura' | 'practica' | 'diario' | 'infinito';
type Progress = { unlocked: number; stars: Record<string, number>; daily: string };
const fresh: Progress = { unlocked: 1, stars: {}, daily: '' };
const tileSet = (numbers: number[]): Tile[] => numbers.map((value, i) => ({ id: String(i), value, expression: String(value) }));
const dayKey = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
const daySeed = (day: string) => Number(day.replaceAll('-', ''));

export function TargetMasters({ childId }: { childId: string }) {
  const [progress, setProgress] = useState<Progress>(fresh);
  const [loaded, setLoaded] = useState(false);
  const [mode, setMode] = useState<Mode>('aventura');
  const [level, setLevel] = useState(1);
  const [seed, setSeed] = useState(0);
  const [tiles, setTiles] = useState<Tile[]>(() => tileSet(makePuzzle(0).numbers));
  const [selected, setSelected] = useState<string[]>([]);
  const [operation, setOperation] = useState<Operation | null>(null);
  const [history, setHistory] = useState<Tile[][]>([]);
  const [hints, setHints] = useState(0);
  const [message, setMessage] = useState('Selecciona dos fichas y una operación para combinarlas.');
  const [won, setWon] = useState(false);
  const [expression, setExpression] = useState('');
  const puzzle = makePuzzle(seed);
  const key = `numerario:target-masters:${childId}`;

  useEffect(() => {
    let cancelled = false;
    Promise.resolve().then(() => {
    if (cancelled) return;
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (typeof parsed.unlocked === 'number' && parsed.stars && typeof parsed.stars === 'object') setProgress({ unlocked: Math.min(100, Math.max(1, parsed.unlocked)), stars: parsed.stars, daily: typeof parsed.daily === 'string' ? parsed.daily : '' });
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
    setMode(nextMode); setLevel(nextLevel); setSeed(s); setTiles(tileSet(makePuzzle(s).numbers));
    setSelected([]); setOperation(null); setHistory([]); setHints(0); setWon(false); setExpression('');
    setMessage('Selecciona dos fichas y una operación para combinarlas.');
  }
  function combine() {
    if (selected.length !== 2 || !operation || won) return;
    const left = tiles.find(t => t.id === selected[0])!, right = tiles.find(t => t.id === selected[1])!;
    const result = calculate(left.value, operation, right.value);
    if (result === null) { setMessage('Esa operación no produce un número entero positivo o cero. Prueba otra.'); return; }
    const combined = { id: `${Date.now()}-${history.length}`, value: result, expression: `(${left.expression} ${operation} ${right.expression})` };
    const next = [...tiles.filter(t => !selected.includes(t.id)), combined];
    setHistory([...history, tiles]); setTiles(next); setSelected([]); setOperation(null);
    if (next.length === 1 && result === puzzle.target) {
      setWon(true); setExpression(combined.expression); setMessage('¡Portal abierto! Encontraste una solución.');
      setProgress(current => {
        const stars = hints === 0 ? 3 : hints === 1 ? 2 : 1;
        return { ...current, unlocked: mode === 'aventura' ? Math.max(current.unlocked, Math.min(100, level + 1)) : current.unlocked,
          stars: mode === 'aventura' ? { ...current.stars, [level]: Math.max(current.stars[level] ?? 0, stars) } : current.stars,
          daily: mode === 'diario' ? dayKey() : current.daily };
      });
    } else if (next.length === 1) setMessage('No llegaste al objetivo. Deshaz el último movimiento y prueba otra ruta.');
    else setMessage(`${left.value} ${operation} ${right.value} = ${result}. ¡Sigue combinando!`);
  }
  function undo() {
    const previous = history.at(-1); if (!previous || won) return;
    setTiles(previous); setHistory(history.slice(0, -1)); setSelected([]); setOperation(null); setMessage('Movimiento deshecho.');
  }
  function hint() {
    const next = solve(tiles.map(t => t.value), puzzle.target, puzzle.operations);
    setHints(hints + 1);
    if (!next?.length) { setMessage('Desde aquí no encontramos una solución. Deshaz un movimiento o reinicia.'); return; }
    const s = next[0];
    setMessage(hints === 0 ? `Pista: prueba combinar ${s.left} y ${s.right}.` : `Pista: ${s.left} ${s.op} ${s.right} = ${s.result}.`);
  }
  const world = Math.min(4, Math.floor((level - 1) / 20));
  return <LearningShell childId={childId} title="Target Masters" eyebrow="Minijuegos · abre el portal">
    <div className="mx-auto max-w-3xl space-y-5">
      <Link href={`/jugar/${childId}/practicar`} className="inline-block text-sm font-bold text-cyan-200 hover:underline">← Volver a practicar</Link>
      <div className="flex flex-wrap gap-2" aria-label="Modos de juego">
        {([['aventura', 'Aventura'], ['practica', 'Práctica'], ['diario', 'Reto diario'], ['infinito', 'Infinito']] as const).map(([id, label]) => <button key={id} type="button" onClick={() => start(id, id === 'aventura' ? Math.min(progress.unlocked, 100) : 1, id === 'practica' || id === 'infinito' ? Math.floor(Math.random() * 10000) : undefined)} aria-pressed={mode === id} className={`${secondaryButton} ${mode === id ? 'border-violet-300 bg-violet-900' : ''}`}>{label}</button>)}
      </div>
      <section className="overflow-hidden rounded-3xl border border-violet-300/30 bg-gradient-to-br from-indigo-950 via-slate-900 to-violet-950 p-5 shadow-xl sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm font-semibold text-violet-200"><span>{mode === 'aventura' ? `${worlds[world]} · Nivel ${level}/100` : mode === 'diario' ? `Reto diario${progress.daily === dayKey() ? ' · Completado ✓' : ''}` : mode === 'practica' ? 'Práctica libre' : 'Viaje infinito'}</span>{mode === 'aventura' && <span>⭐ {progress.stars[level] ?? 0}/3</span>}</div>
        <div className={`mx-auto my-7 grid size-36 place-items-center rounded-full border-4 text-center shadow-[0_0_45px_rgba(167,139,250,0.35)] ${won ? 'border-emerald-300 bg-emerald-400/20' : 'border-violet-300 bg-violet-500/20'}`}><div><div className="text-xs font-bold uppercase tracking-widest text-violet-100">Objetivo</div><div className="text-5xl font-black text-white">{puzzle.target}</div></div></div>
        <p className="text-center text-sm text-slate-300">Usa todas las fichas. El orden importa en la resta y la división.</p>
        <div className="mt-5 flex flex-wrap justify-center gap-3" aria-label="Fichas numéricas">{tiles.map(tile => <button key={tile.id} type="button" disabled={won} aria-pressed={selected.includes(tile.id)} aria-label={`Ficha ${tile.value}${selected.includes(tile.id) ? ', seleccionada' : ''}`} onClick={() => setSelected(current => current.includes(tile.id) ? current.filter(id => id !== tile.id) : current.length < 2 ? [...current, tile.id] : [tile.id])} className={`min-h-16 min-w-16 rounded-2xl border-2 px-4 text-2xl font-black transition ${selected.includes(tile.id) ? 'border-cyan-200 bg-cyan-400 text-slate-950' : 'border-violet-300/50 bg-violet-900/70 text-white hover:bg-violet-800'}`}>{tile.value}</button>)}</div>
        <div className="mt-5 flex flex-wrap justify-center gap-2" aria-label="Operaciones">{puzzle.operations.map(op => <button key={op} type="button" disabled={won} aria-label={{'+':'Sumar','−':'Restar','×':'Multiplicar','÷':'Dividir'}[op]} aria-pressed={operation === op} onClick={() => setOperation(op)} className={`size-12 rounded-xl border text-2xl font-bold ${operation === op ? 'border-cyan-200 bg-cyan-400 text-slate-950' : 'border-slate-500 bg-slate-800 text-white hover:bg-slate-700'}`}>{op}</button>)}</div>
        <div className="mt-5 flex flex-wrap justify-center gap-2"><button className={primaryButton} onClick={combine} disabled={selected.length !== 2 || !operation || won}>Combinar</button><button className={secondaryButton} onClick={undo} disabled={!history.length || won}>Deshacer</button><button className={secondaryButton} onClick={hint} disabled={won}>Pista</button><button className={secondaryButton} onClick={() => start(mode, level, seed)}>Reiniciar</button></div>
        <p aria-live="polite" className="mt-5 min-h-12 rounded-xl bg-slate-950/60 p-3 text-center text-sm text-slate-100">{message}{won && <span className="mt-2 block font-bold text-emerald-200">{expression} = {puzzle.target}</span>}</p>
        {won && <div className="mt-4 text-center"><button className={primaryButton} onClick={() => mode === 'aventura' ? start(mode, Math.min(100, level + 1)) : start(mode, level + 1, mode === 'diario' ? seed : Math.floor(Math.random() * 10000))}>{mode === 'diario' ? 'Volver a jugar' : level === 100 && mode === 'aventura' ? 'Repetir último nivel' : 'Siguiente desafío →'}</button></div>}
      </section>
      {mode === 'aventura' && <div className="rounded-2xl border border-slate-700 bg-slate-900 p-4"><label htmlFor="target-level" className="mr-3 text-sm font-bold">Elegir nivel desbloqueado</label><select id="target-level" value={level} onChange={event => start('aventura', Number(event.target.value))} className="rounded-lg border border-slate-500 bg-slate-800 p-2 text-white">{Array.from({ length: progress.unlocked }, (_, i) => <option key={i} value={i + 1}>Nivel {i + 1} {progress.stars[i + 1] ? `· ${progress.stars[i + 1]} estrellas` : ''}</option>)}</select></div>}
      <p className="text-sm text-slate-400">Tu progreso se guarda en este dispositivo y no modifica tus logros de clase.</p>
    </div>
  </LearningShell>;
}
