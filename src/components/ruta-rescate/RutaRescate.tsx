'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Volume2, VolumeX } from 'lucide-react';
import { LearningShell, primaryButton, secondaryButton } from '@/components/learning/LearningShell';
import { useTargetProgress } from '@/lib/minigames/useTargetProgress';
import { useSoundPreference } from '@/lib/useSoundPreference';
import { playSound } from '@/lib/gameSound';
import { BASE, GRID_SIZE, LABELS, MISSIONS, simulate, type Command, type Frame } from '@/lib/minigames/rutaRescate';
import styles from './ruta.module.css';

const arrows = ['↑', '→', '↓', '←'];
const directions = ['norte', 'este', 'sur', 'oeste'];
const icons: Record<Command, string> = { forward: '🚙', left: '↶', right: '↷', forward2: '⏩', forward3: '⏩' };

export function RutaRescate({ childId }: { childId: string }) {
  const { visible: progress, setProgress, loaded, syncStatus } = useTargetProgress(childId, 'ruta-rescate');
  const [soundOn, toggleSound] = useSoundPreference();
  const [level, setLevel] = useState<number | null>(null);
  const [program, setProgram] = useState<Command[]>([]);
  const [frame, setFrame] = useState<Frame | null>(null);
  const [running, setRunning] = useState(false);
  const [solved, setSolved] = useState(false);
  const [hint, setHint] = useState(false);
  const [message, setMessage] = useState('');
  const heading = useRef<HTMLHeadingElement>(null);
  const mapHeading = useRef<HTMLHeadingElement>(null);
  const nextButton = useRef<HTMLButtonElement>(null);
  const started = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mission = level === null ? null : MISSIONS[level - 1];
  const completed = MISSIONS.filter((_, index) => (progress.stars[index + 1] ?? 0) > 0).length;
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  useEffect(() => { if (level !== null) heading.current?.focus(); else if (started.current) mapHeading.current?.focus(); }, [level]);
  useEffect(() => { if (solved) nextButton.current?.focus(); }, [solved]);

  function stop() { if (timer.current) clearTimeout(timer.current); timer.current = null; setRunning(false); }
  function begin(n: number) {
    stop(); started.current = true; setLevel(n); setProgram([]); setFrame(simulate(MISSIONS[n - 1], []).frames[0]); setSolved(false); setHint(false); setMessage('');
  }
  function backToMap() { stop(); setLevel(null); }
  function add(command: Command) { if (!running && !solved && program.length < 24) { setProgram(current => [...current, command]); setMessage(''); } }
  function move(index: number, delta: number) {
    setProgram(current => { const next = [...current], target = index + delta; if (target < 0 || target >= next.length) return current; [next[index], next[target]] = [next[target], next[index]]; return next; }); setMessage('');
  }
  function execute() {
    if (!mission || level === null || !program.length || running || solved) return;
    const result = simulate(mission, program);
    const final = result.frames[result.frames.length - 1];
    const stars = 1 + Number(program.length <= mission.parCommands) + Number(final.fuelUsed <= mission.parFuel);
    setProgress(current => ({ ...current, attempts: (current.attempts ?? 0) + 1 }));
    setFrame(result.frames[0]); setMessage('En marcha…'); setRunning(true);
    const reduced = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const delay = reduced ? 80 : 360;
    function advance(index: number) {
      if (index < result.frames.length) { setFrame(result.frames[index]); timer.current = setTimeout(() => advance(index + 1), delay); return; }
      timer.current = null; setRunning(false);
      if (!result.success) { setMessage(result.message); playSound('wrong', soundOn); return; }
      setProgress(current => ({ ...current, unlocked: Math.max(current.unlocked, Math.min(MISSIONS.length, level! + 1)), stars: { ...current.stars, [level!]: Math.max(current.stars[level!] ?? 0, stars) }, completed: (current.completed ?? 0) + 1 }));
      setSolved(true); setMessage(`${result.message} Ganaste ${stars} de 3 estrellas.`); playSound('fanfare', soundOn);
    }
    timer.current = setTimeout(() => advance(1), delay);
  }
  const commandTypes: Command[] = mission?.repeat ? ['forward', 'left', 'right', 'forward2', 'forward3'] : ['forward', 'left', 'right'];
  return <LearningShell childId={childId} title="Ruta de Rescate" eyebrow="Minijuegos · rutas y estrategia">
    <div className="mx-auto max-w-6xl space-y-5 pb-8">
      <div className="flex flex-wrap items-center justify-between gap-3"><Link href={`/jugar/${childId}/practicar`} className="text-sm font-bold text-amber-200 hover:underline">← Volver a practicar</Link><button type="button" className={secondaryButton} onClick={toggleSound} aria-pressed={soundOn} aria-label="Sonido del juego">{soundOn ? <Volume2 size={18} /> : <VolumeX size={18} />} Sonido {soundOn ? 'activado' : 'desactivado'}</button></div>
      {!mission ? <>
        <section className={`${styles.hero} rounded-3xl border border-amber-200/30 p-6 sm:p-9`}><div className="relative max-w-lg"><span className="text-xs font-bold uppercase tracking-widest text-amber-200">Equipo de rescate · misión en el valle</span><h2 className="mt-3 text-3xl font-black text-white sm:text-5xl">¡Prepara tu ruta!</h2><p className="mt-3 max-w-md text-sm leading-relaxed text-white">Programa el vehículo, encuentra a los exploradores y llévalos a salvo a la base.</p><p className="mt-4 inline-block rounded-full bg-slate-950/85 px-4 py-2 text-sm font-bold text-amber-100">🚙 {completed} de {MISSIONS.length} misiones completadas</p></div></section>
        <section aria-labelledby="rescue-map"><h2 id="rescue-map" ref={mapHeading} tabIndex={-1} className="text-xl font-bold">Elige una misión</h2><p className="mt-1 text-sm text-slate-300">Piensa, prueba y mejora tu ruta. No hay reloj.</p><div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{MISSIONS.map((item, index) => { const n = index + 1, locked = !loaded || n > progress.unlocked, stars = progress.stars[n] ?? 0; return <button key={item.name} type="button" disabled={locked} onClick={() => begin(n)} aria-label={`Misión ${n}, ${item.name}, ${locked ? 'bloqueada' : `${stars} de 3 estrellas`}`} className={`${styles.mission} rounded-2xl border border-amber-300/25 bg-slate-900/90 p-4 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-200 disabled:cursor-not-allowed disabled:opacity-50`}><span aria-hidden="true" className="text-3xl">{locked ? '🔒' : index < 3 ? '🧭' : index < 6 ? '🏔️' : '🌌'}</span><span className="mt-3 block text-xs font-bold uppercase tracking-wider text-amber-200">Misión {n}</span><span className="mt-1 block font-bold text-white">{item.name}</span><span aria-hidden="true" className="mt-2 block text-amber-200">{'★'.repeat(stars)}{'☆'.repeat(3 - stars)}</span></button>; })}</div></section>
      </> : <>
        <div className="flex flex-wrap items-center justify-between gap-3"><button type="button" className={secondaryButton} onClick={backToMap}>← Volver al mapa</button><h2 ref={heading} tabIndex={-1} className="font-bold text-amber-200">Misión {level}/{MISSIONS.length} · {mission.name}</h2></div>
        <section className={`${styles.panel} rounded-3xl border border-amber-300/30 p-4 sm:p-7`} aria-labelledby="rescue-title"><div className="flex flex-wrap items-center justify-between gap-2"><span className="text-xs font-bold uppercase tracking-widest text-amber-200">🧭 Equipo de rescate</span><span className="text-sm text-amber-200">★ {progress.stars[level!] ?? 0}/3</span></div><h3 id="rescue-title" className="mt-3 text-2xl font-black">{mission.name}</h3><p className="mt-2 text-sm text-slate-200">{mission.story} Recoge a todos y termina en la base. La flecha indica hacia dónde mira el vehículo.</p>
          <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]"><div><div role="img" aria-label={`Mapa de 5 por 5. Base en fila 5, columna 1. ${mission.rocks.length ? `Rocas: ${mission.rocks.map(([x,y]) => `fila ${y+1}, columna ${x+1}`).join('; ')}.` : 'Sin rocas.'} Exploradores: ${mission.explorers.map(([x,y],i) => `${i+1} en fila ${y+1}, columna ${x+1}`).join('; ')}. Vehículo en fila ${(frame?.y ?? 4)+1}, columna ${(frame?.x ?? 0)+1}, mirando al ${directions[frame?.direction ?? 1]}. Rescatados: ${frame?.rescued.length ?? 0} de ${mission.explorers.length}.`} className={styles.board}>{Array.from({ length: GRID_SIZE * GRID_SIZE }, (_, i) => { const x = i % GRID_SIZE, y = Math.floor(i / GRID_SIZE), base = x === BASE[0] && y === BASE[1], rock = mission.rocks.some(([rx,ry]) => x === rx && y === ry), explorer = mission.explorers.findIndex(([ex,ey]) => x === ex && y === ey), rescued = frame?.rescued.includes(explorer), vehicle = x === (frame?.x ?? BASE[0]) && y === (frame?.y ?? BASE[1]); return <div key={i} className={`${styles.cell} ${rock ? styles.rock : ''} ${base ? styles.base : ''}`}><span aria-hidden="true" className={styles.tile}>{rock ? '🪨' : base ? '🏠' : explorer >= 0 && !rescued ? `🧑‍🚀${explorer + 1}` : rescued ? '✓' : ''}</span>{vehicle && <span aria-hidden="true" className={styles.vehicle}>🚙<b>{arrows[frame?.direction ?? 1]}</b></span>}</div>; })}</div><div className="mt-3 grid grid-cols-2 gap-2 text-sm"><div className="rounded-xl bg-slate-950/70 p-3">⛽ Combustible: <strong>{mission.fuel - (frame?.fuelUsed ?? 0)} / {mission.fuel}</strong></div><div className="rounded-xl bg-slate-950/70 p-3">🧑‍🚀 Rescatados: <strong>{frame?.rescued.length ?? 0} / {mission.explorers.length}</strong></div></div><p className="mt-2 text-xs text-slate-300">🏠 Base · 🪨 Obstáculo · 🧑‍🚀 Explorador. Girar no consume combustible; cada casilla avanzada consume 1.</p></div>
          <div><h4 className="font-bold text-amber-100">1. Construye tu programa</h4><p className="mt-1 text-sm text-slate-300">Añade bloques en orden. Cada prueba comienza en la base. Los giros cambian la dirección; avanzar mueve el vehículo hacia donde apunta la flecha.{mission.repeat && ' Avanzar ×2 o ×3 repite el avance en un solo bloque.'}</p><div className="mt-3 flex flex-wrap gap-2">{commandTypes.map(command => <button type="button" key={command} className={secondaryButton} disabled={running || solved || program.length >= 24} onClick={() => add(command)}>{icons[command]} {LABELS[command]}</button>)}</div><div className="mt-4 rounded-2xl border border-slate-600 bg-slate-950/70 p-3"><div className="flex items-center justify-between gap-2"><h5 className="font-bold">Tu programa · {program.length}/24</h5><button type="button" className="text-sm font-bold text-cyan-200 underline disabled:opacity-40" disabled={!program.length || running || solved} onClick={() => { setProgram([]); setMessage(''); }}>Limpiar</button></div>{program.length ? <ol className={`${styles.program} mt-3 space-y-2`}>{program.map((command, index) => <li key={index} aria-current={running && frame?.commandIndex === index ? 'step' : undefined} className={`flex items-center gap-2 rounded-lg border px-2 py-2 text-sm ${running && frame?.commandIndex === index ? 'border-amber-300 bg-amber-300/20' : 'border-slate-700 bg-slate-900'}`}><span className="min-w-0 flex-1">{index + 1}. {icons[command]} {LABELS[command]}</span><button type="button" aria-label={`Subir paso ${index + 1}`} disabled={running || solved || index === 0} onClick={() => move(index,-1)} className={styles.edit}>↑</button><button type="button" aria-label={`Bajar paso ${index + 1}`} disabled={running || solved || index === program.length - 1} onClick={() => move(index,1)} className={styles.edit}>↓</button><button type="button" aria-label={`Eliminar paso ${index + 1}`} disabled={running || solved} onClick={() => setProgram(current => current.filter((_,i) => i !== index))} className={styles.edit}>×</button></li>)}</ol> : <p className="mt-2 text-sm text-slate-400">Añade tu primer bloque para empezar.</p>}</div><p className="mt-3 text-sm text-slate-300">⭐ Completar · ⭐ {mission.parCommands} bloques o menos · ⭐ {mission.parFuel} de combustible o menos.</p></div></div>
          <div className="mt-5 flex flex-wrap gap-2"><button type="button" className={primaryButton} disabled={!program.length || running || solved} onClick={execute}>▶ Probar ruta</button><button type="button" className={secondaryButton} disabled={running || solved || hint} onClick={() => { setHint(true); setProgress(current => ({ ...current, hintsUsed: (current.hintsUsed ?? 0) + 1 })); }}>Pista</button><button type="button" className={secondaryButton} onClick={() => begin(level!)}>Reiniciar misión</button></div><div aria-live="polite" className="mt-4 min-h-12 rounded-xl bg-slate-950/70 p-3 text-sm text-slate-100">{message || 'Añade instrucciones y prueba tu plan.'}{hint && <span className="mt-2 block text-amber-200">💡 {mission.hint}</span>}</div>
          {solved && <div className="mt-4 flex flex-wrap gap-2"><button ref={nextButton} type="button" className={primaryButton} onClick={() => level! < MISSIONS.length ? begin(level! + 1) : backToMap()}>{level! < MISSIONS.length ? 'Siguiente misión →' : 'Volver al mapa'}</button><button type="button" className={secondaryButton} onClick={backToMap}>Ver mapa</button></div>}
        </section><p className="text-sm text-slate-400">Puedes probar y cambiar la ruta tantas veces como quieras. Las pistas no reducen tus estrellas.</p>
      </>}
      <p className="text-sm text-slate-400">{!loaded ? 'Cargando progreso…' : syncStatus === 'sincronizado' ? 'Progreso sincronizado con tu perfil.' : syncStatus === 'conectando' ? 'Conectando tu progreso…' : syncStatus === 'pendiente' ? 'Sin conexión: guardado en este dispositivo; se sincronizará al reconectar.' : syncStatus === 'error' ? 'No se pudo sincronizar; tu progreso sigue en este dispositivo.' : 'Progreso guardado en este dispositivo.'} Este juego no modifica tus logros de clase.</p>
    </div>
  </LearningShell>;
}
