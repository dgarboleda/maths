'use client';

import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import Link from 'next/link';
import { Volume2, VolumeX } from 'lucide-react';
import { LearningShell, primaryButton, secondaryButton } from '@/components/learning/LearningShell';
import { useTargetProgress } from '@/lib/minigames/useTargetProgress';
import { useSoundPreference } from '@/lib/useSoundPreference';
import { playSound } from '@/lib/gameSound';
import { analyzeShape, checkMission, GRID_SIZE, MISSIONS } from '@/lib/minigames/geocraft';
import styles from './geocraft.module.css';

export function GeoCraft({ childId }: { childId: string }) {
  const { visible: progress, setProgress, loaded, syncStatus } = useTargetProgress(childId, 'geocraft');
  const [soundOn, toggleSound] = useSoundPreference();
  const [level, setLevel] = useState<number | null>(null);
  const [cells, setCells] = useState<number[]>([]);
  const [focusCell, setFocusCell] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [hints, setHints] = useState(0);
  const [message, setMessage] = useState('');
  const [solved, setSolved] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const mapHeading = useRef<HTMLHeadingElement>(null);
  const nextButton = useRef<HTMLButtonElement>(null);
  const cellRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const started = useRef(false);
  const mission = level === null ? null : MISSIONS[level - 1];
  const shape = analyzeShape(cells);
  const completed = Object.keys(progress.stars).filter(key => Number(key) <= MISSIONS.length && progress.stars[key] > 0).length;
  useEffect(() => { if (level !== null) heading.current?.focus(); else if (started.current) mapHeading.current?.focus(); }, [level]);
  useEffect(() => { if (solved) nextButton.current?.focus(); }, [solved]);

  function begin(n: number) {
    started.current = true; setLevel(n); setCells([]); setFocusCell(0); setMistakes(0); setHints(0); setMessage(''); setSolved(false);
  }
  function toggleCell(n: number) {
    if (solved) return;
    setCells(current => current.includes(n) ? current.filter(cell => cell !== n) : [...current, n]); setMessage('');
  }
  function move(event: KeyboardEvent<HTMLButtonElement>, n: number) {
    const row = Math.floor(n / GRID_SIZE), col = n % GRID_SIZE;
    const destination = event.key === 'ArrowRight' && col < GRID_SIZE - 1 ? n + 1 : event.key === 'ArrowLeft' && col > 0 ? n - 1 : event.key === 'ArrowDown' && row < GRID_SIZE - 1 ? n + GRID_SIZE : event.key === 'ArrowUp' && row > 0 ? n - GRID_SIZE : null;
    if (event.key.startsWith('Arrow')) event.preventDefault();
    if (destination !== null) { setFocusCell(destination); cellRefs.current[destination]?.focus(); }
  }
  function hint() {
    if (!mission || hints >= 3 || solved) return;
    setHints(hints + 1); setMessage('');
    setProgress(current => ({ ...current, hintsUsed: (current.hintsUsed ?? 0) + 1 }));
  }
  function submit() {
    if (!mission || solved || level === null) return;
    const error = checkMission(mission, cells);
    setProgress(current => ({ ...current, attempts: (current.attempts ?? 0) + 1 }));
    if (error) { setMistakes(current => current + 1); setMessage(error); playSound('wrong', soundOn); return; }
    const stars = 1 + Number(hints === 0) + Number(mistakes === 0);
    setProgress(current => ({ ...current, unlocked: Math.max(current.unlocked, Math.min(MISSIONS.length, level + 1)), stars: { ...current.stars, [level]: Math.max(current.stars[level] ?? 0, stars) }, completed: (current.completed ?? 0) + 1 }));
    setSolved(true); setMessage(`¡Construcción terminada! Ganaste ${stars} de 3 estrellas.`); playSound('fanfare', soundOn);
  }
  const hintText = mission && hints > 0 ? [
    'Cuenta las casillas para el área y solo los lados que quedan al descubierto para el perímetro. Los lados compartidos no cuentan.',
    `Busca dos números cuyo producto sea ${mission.area}. Prueba a organizar las casillas en filas iguales.`,
    `Una solución posible es un rectángulo de ${mission.height} filas por ${mission.width} columnas. También pueden existir otras formas.`,
  ][hints - 1] : '';
  return <LearningShell childId={childId} title="GeoCraft" eyebrow="Minijuegos · geometría y creatividad">
    <div className="mx-auto max-w-5xl space-y-5 pb-8">
      <div className="flex flex-wrap items-center justify-between gap-3"><Link href={`/jugar/${childId}/practicar`} className="text-sm font-bold text-emerald-200 hover:underline">← Volver a practicar</Link><button type="button" className={secondaryButton} onClick={toggleSound} aria-pressed={soundOn} aria-label="Sonido del juego">{soundOn ? <Volume2 size={18} /> : <VolumeX size={18} />} Sonido {soundOn ? 'activado' : 'desactivado'}</button></div>
      {!mission ? <>
        <section className={`${styles.hero} overflow-hidden rounded-3xl border border-emerald-200/30 p-6 sm:p-9`}><div className={styles.heroContent}><span className="text-xs font-bold uppercase tracking-widest text-emerald-200">Tu isla de las formas</span><h2 className="mt-3 text-3xl font-black text-white sm:text-5xl">Construye tu mundo</h2><p className="mt-3 max-w-md text-sm leading-relaxed text-white">Diseña jardines, plazas y reservas. Cada construcción revela cómo el área y el perímetro cuentan historias distintas.</p><p className="mt-4 inline-block rounded-full bg-slate-950/80 px-4 py-2 text-sm font-bold text-emerald-100">🏝️ {completed} de {MISSIONS.length} construcciones completadas</p></div></section>
        <section aria-labelledby="geo-map" className="space-y-4"><div><h2 ref={mapHeading} id="geo-map" tabIndex={-1} className="text-xl font-bold">Explora la isla</h2><p className="mt-1 text-sm text-slate-300">Completa cada construcción para descubrir la siguiente. Juega a tu ritmo, sin reloj.</p></div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{MISSIONS.map((item, i) => { const n = i + 1, locked = !loaded || n > progress.unlocked, stars = progress.stars[n] ?? 0; return <button type="button" key={item.name} disabled={locked} onClick={() => begin(n)} aria-label={`Misión ${n}, ${item.name}, ${locked ? 'bloqueada' : `${stars} de 3 estrellas`}`} className={`${styles.mission} rounded-2xl border border-emerald-300/25 bg-slate-900/90 p-4 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300 disabled:cursor-not-allowed disabled:opacity-50`}><span aria-hidden="true" className="text-3xl">{locked ? '🔒' : item.icon}</span><span className="mt-3 block text-xs font-bold uppercase tracking-wider text-emerald-200">Construcción {n}</span><span className="mt-1 block font-bold text-white">{item.name}</span><span aria-hidden="true" className="mt-2 block text-amber-200">{'★'.repeat(stars)}{'☆'.repeat(3 - stars)}</span></button>; })}</div></section>
      </> : <>
        <div className="flex flex-wrap items-center justify-between gap-3"><button type="button" className={secondaryButton} onClick={() => setLevel(null)}>← Volver al mapa</button><h2 ref={heading} tabIndex={-1} className="font-bold text-emerald-200">Construcción {level}/{MISSIONS.length} · {mission.name}</h2></div>
        <section className={`${styles.panel} rounded-3xl border border-emerald-300/30 p-4 sm:p-7`} aria-labelledby="geo-title"><div className="flex flex-wrap items-center justify-between gap-2"><span className="text-xs font-bold uppercase tracking-widest text-emerald-200">{mission.icon} Misión de construcción</span><span className="text-sm text-amber-200">★ {progress.stars[level!] ?? 0}/3</span></div><h3 id="geo-title" className="mt-3 text-2xl font-black">{mission.name}</h3><p className="mt-2 text-sm text-slate-200">{mission.story}</p><p className="mt-2 text-sm text-slate-200">Selecciona casillas unidas por sus lados. Área = casillas; perímetro = lados expuestos, incluidos los de los huecos.</p>
          <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_270px]"><div className={styles.boardWrap}><div role="grid" aria-label="Tablero de construcción, usa las flechas para moverte y espacio o intro para cambiar una casilla" className={styles.board}>{Array.from({ length: GRID_SIZE }, (_, row) => <div role="row" key={row} className={styles.row}>{Array.from({ length: GRID_SIZE }, (_, col) => { const n = row * GRID_SIZE + col, selected = cells.includes(n); return <button key={n} ref={element => { cellRefs.current[n] = element; }} role="gridcell" type="button" aria-label={`Fila ${row + 1}, columna ${col + 1}, ${selected ? 'ocupada' : 'libre'}`} aria-selected={selected} aria-disabled={solved} tabIndex={focusCell === n ? 0 : -1} onFocus={() => setFocusCell(n)} onKeyDown={event => move(event, n)} onClick={() => toggleCell(n)} className={`${styles.cell} ${selected ? styles.selected : ''}`}><span aria-hidden="true">{selected ? '✦' : ''}</span></button>; })}</div>)}</div></div>
          <div className="space-y-3"><div className="rounded-2xl border border-emerald-200/20 bg-slate-950/80 p-4"><h4 className="font-bold text-emerald-100">📐 Plano de la misión</h4><div className="mt-3 flex justify-between gap-3 text-sm"><span>Área</span><strong>{shape.area} / {mission.area} casillas</strong></div><div className="mt-2 flex justify-between gap-3 text-sm"><span>Perímetro</span><strong>{shape.perimeter} / {mission.minimum ? '≤ ' : ''}{mission.perimeter} lados</strong></div><p className="mt-3 text-xs leading-relaxed text-slate-300">{mission.minimum ? 'Usa como máximo 20 lados de valla.' : 'Cumple los dos objetivos con una sola figura conectada.'}</p></div><div className="rounded-2xl bg-slate-950/60 p-4 text-sm text-slate-200">💡 Puedes dibujar formas libres y cambiar las casillas tantas veces como quieras.</div></div></div>
          <div className="mt-5 flex flex-wrap gap-2"><button type="button" className={primaryButton} disabled={solved} onClick={submit}>Comprobar construcción</button><button type="button" className={secondaryButton} disabled={solved || hints >= 3} onClick={hint}>Pista ({hints}/3)</button><button type="button" className={secondaryButton} disabled={solved || cells.length === 0} onClick={() => { setCells([]); setMessage(''); }}>Limpiar tablero</button><button type="button" className={secondaryButton} onClick={() => begin(level!)}>Reiniciar misión</button></div>
          <div aria-live="polite" className="mt-4 min-h-12 rounded-xl bg-slate-950/70 p-3 text-sm text-slate-100">{message || hintText || '¡Tu isla empieza con una casilla!'}{message && hintText && <span className="mt-2 block text-emerald-200">{hintText}</span>}</div>
          {solved && <div className="mt-4 flex flex-wrap gap-2"><button ref={nextButton} type="button" className={primaryButton} onClick={() => level! < MISSIONS.length ? begin(level! + 1) : setLevel(null)}>{level! < MISSIONS.length ? 'Siguiente construcción →' : 'Volver al mapa'}</button><button type="button" className={secondaryButton} onClick={() => setLevel(null)}>Ver mapa</button></div>}
        </section><p className="text-sm text-slate-400">★ Completar · ★ Sin pistas · ★ Sin comprobaciones incorrectas. Puedes volver a intentarlo y mejorar tus estrellas.</p>
      </>}
      <p className="text-sm text-slate-400">{!loaded ? 'Cargando progreso…' : syncStatus === 'sincronizado' ? 'Progreso sincronizado con tu perfil.' : syncStatus === 'conectando' ? 'Conectando tu progreso…' : syncStatus === 'pendiente' ? 'Sin conexión: guardado en este dispositivo; se sincronizará al reconectar.' : syncStatus === 'error' ? 'No se pudo sincronizar; tu progreso sigue en este dispositivo.' : 'Progreso guardado en este dispositivo.'} Este juego no modifica tus logros de clase.</p>
    </div>
  </LearningShell>;
}
