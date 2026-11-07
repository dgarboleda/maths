'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Volume2, VolumeX } from 'lucide-react';
import { LearningShell, primaryButton, secondaryButton } from '@/components/learning/LearningShell';
import { useTargetProgress } from '@/lib/minigames/useTargetProgress';
import { useSoundPreference } from '@/lib/useSoundPreference';
import { playSound } from '@/lib/gameSound';
import { circuitValue, makeMission, solveCircuit, type CircuitBlock } from '@/lib/minigames/codebreaker';
import styles from './codebreaker.module.css';

const sectors = ['Acceso inicial', 'Red de patrones', 'Núcleo de señales', 'Circuitos ocultos', 'La bóveda'];

export function CodeBreaker({ childId }: { childId: string }) {
  const { visible: progress, setProgress, loaded, syncStatus } = useTargetProgress(childId, 'codebreaker');
  const [soundOn, toggleSound] = useSoundPreference();
  const [level, setLevel] = useState<number | null>(null);
  const [choice, setChoice] = useState<number | null>(null);
  const [order, setOrder] = useState<CircuitBlock['id'][]>([]);
  const [mistakes, setMistakes] = useState(0);
  const [hints, setHints] = useState(0);
  const [hintText, setHintText] = useState('');
  const [message, setMessage] = useState('');
  const [solved, setSolved] = useState(false);
  const mission = level === null ? null : makeMission(level);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const mapHeadingRef = useRef<HTMLHeadingElement>(null);
  const nextButtonRef = useRef<HTMLButtonElement>(null);
  const hasStarted = useRef(false);
  useEffect(() => {
    if (level !== null) headingRef.current?.focus();
    else if (hasStarted.current) mapHeadingRef.current?.focus();
  }, [level]);
  useEffect(() => { if (solved) nextButtonRef.current?.focus(); }, [solved]);

  function begin(next: number) {
    hasStarted.current = true; setLevel(next); setChoice(null); setOrder([]); setMistakes(0); setHints(0); setHintText(''); setMessage(''); setSolved(false);
  }
  function submit() {
    if (!mission || solved) return;
    const correct = mission.kind === 'sequence' ? choice === mission.answer : order.length === mission.blocks.length && circuitValue(mission, order) === mission.target;
    setProgress(current => ({ ...current, attempts: (current.attempts ?? 0) + 1 }));
    if (!correct) {
      setMistakes(current => current + 1); setMessage(mission.kind === 'sequence' ? 'Esa clave no abre el sistema. Revisa el patrón y vuelve a intentarlo.' : 'El circuito no llega al objetivo. Deshaz conexiones y prueba otro orden.');
      playSound('wrong', soundOn); return;
    }
    const stars = 1 + (hints === 0 ? 1 : 0) + (mistakes === 0 ? 1 : 0);
    setProgress(current => ({ ...current, unlocked: Math.max(current.unlocked, Math.min(50, mission.level + 1)), stars: { ...current.stars, [mission.level]: Math.max(current.stars[mission.level] ?? 0, stars) }, completed: (current.completed ?? 0) + 1 }));
    setSolved(true); setMessage(`¡Sistema desbloqueado! Ganaste ${stars} de 3 estrellas.`); playSound('fanfare', soundOn);
  }
  function giveHint() {
    if (!mission || solved) return;
    const next = Math.min(3, hints + 1); setHints(next); setMessage('');
    setProgress(current => ({ ...current, hintsUsed: (current.hintsUsed ?? 0) + 1 }));
    if (mission.kind === 'sequence') { setHintText(mission.hints[next - 1]); return; }
    const solution = solveCircuit(mission, order);
    if (!solution) { setHintText('Con estas conexiones no se alcanza el objetivo. Deshaz alguna y vuelve a pedir una pista.'); return; }
    if (next === 1) { setHintText('Piensa cómo cambia el valor al duplicarlo y qué ajustes necesitas antes y después.'); return; }
    const remaining = solution.slice(order.length).map(id => mission.blocks.find(block => block.id === id)!.label);
    setHintText(remaining.length === 0 ? 'El circuito ya está completo. Comprueba la clave.' : next === 2 ? `Una siguiente conexión posible es ${remaining[0]}.` : `Un orden posible para terminar es: ${remaining.join(' → ')}.`);
  }
  const count = Math.min(50, progress.unlocked);
  return <LearningShell childId={childId} title="CodeBreaker" eyebrow="Minijuegos · patrones y lógica">
    <div className="mx-auto max-w-4xl space-y-5 pb-8">
      <div className="flex flex-wrap items-center justify-between gap-3"><Link href={`/jugar/${childId}/practicar`} className="text-sm font-bold text-cyan-200 hover:underline">← Volver a practicar</Link><button type="button" className={secondaryButton} onClick={toggleSound} aria-pressed={soundOn} aria-label="Sonido del juego">{soundOn ? <Volume2 size={18} /> : <VolumeX size={18} />} Sonido {soundOn ? 'activado' : 'desactivado'}</button></div>
      {!mission ? <>
        <section className={`${styles.hero} overflow-hidden rounded-3xl border border-cyan-300/30 p-6 sm:p-9`}><span className="text-xs font-bold uppercase tracking-widest text-cyan-200">Agencia de patrones · acceso autorizado</span><h2 className="mt-3 text-3xl font-black text-white sm:text-4xl">Descifra la red</h2><p className="mt-3 max-w-md text-sm leading-relaxed text-slate-200">Detecta reglas ocultas y conecta operaciones para recuperar los sistemas. Piensa a tu ritmo: no hay reloj.</p></section>
        <section aria-labelledby="code-sectors" className="space-y-4"><div><h2 ref={mapHeadingRef} id="code-sectors" tabIndex={-1} className="text-xl font-bold">Selecciona una misión</h2><p className="mt-1 text-sm text-slate-300">Completa misiones para abrir los cinco sectores. Cada estrella celebra tu estrategia.</p></div>{sectors.map((sector, sectorIndex) => <div key={sector} className="rounded-2xl border border-slate-700 bg-slate-900/80 p-4"><h3 className="font-bold text-cyan-200">{String(sectorIndex + 1).padStart(2, '0')} · {sector}</h3><div className="mt-3 grid grid-cols-5 gap-2 sm:grid-cols-10">{Array.from({ length: 10 }, (_, i) => sectorIndex * 10 + i + 1).map(n => <button type="button" key={n} disabled={!loaded || n > count} onClick={() => begin(n)} aria-label={`Misión ${n}, ${n > count ? 'bloqueada' : `${progress.stars[n] ?? 0} de 3 estrellas`}`} className="min-h-12 rounded-xl border border-cyan-300/25 bg-cyan-400/10 font-bold text-cyan-100 hover:bg-cyan-400/25 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300 disabled:cursor-not-allowed disabled:border-slate-700 disabled:bg-slate-800 disabled:text-slate-500">{n > count ? '🔒' : n}</button>)}</div></div>)}</section>
      </> : <>
        <div className="flex flex-wrap items-center justify-between gap-3"><button type="button" className={secondaryButton} onClick={() => setLevel(null)}>← Volver al mapa</button><h2 ref={headingRef} tabIndex={-1} className="font-bold text-cyan-200">Misión {mission.level}/50 · {sectors[Math.floor((mission.level - 1) / 10)]}</h2></div>
        <section className={`${styles.panel} ${solved ? styles.unlock : ''} rounded-3xl border border-cyan-300/30 p-5 sm:p-8`} aria-labelledby="mission-title"><div className="flex flex-wrap items-center justify-between gap-2"><span className="text-xs font-bold uppercase tracking-widest text-cyan-200">{mission.kind === 'sequence' ? 'Interceptar secuencia' : 'Conectar circuito'}</span><span className="text-sm text-amber-200">★ {progress.stars[mission.level] ?? 0}/3</span></div>
        {mission.kind === 'sequence' ? <><h3 id="mission-title" className="mt-4 text-xl font-bold">¿Qué número completa la señal?</h3><p className="mt-2 text-sm text-slate-300">{mission.rule}</p><div role="img" className="mt-5 flex flex-wrap items-center justify-center gap-2" aria-label={`Secuencia: ${mission.terms.join(', ')}, número desconocido`}>{mission.terms.map((value, i) => <span key={i} className={`${styles.node} grid min-h-14 min-w-14 place-items-center rounded-xl border border-cyan-300/30 bg-slate-950 px-3 text-xl font-black text-cyan-100`}>{value}</span>)}<span aria-hidden="true" className="grid min-h-14 min-w-14 place-items-center rounded-xl border border-dashed border-amber-200 bg-amber-300/10 px-3 text-xl font-black text-amber-100">?</span></div><p className="mt-5 text-sm font-semibold text-slate-200">Elige la clave:</p><div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">{mission.choices.map(value => <button key={value} type="button" disabled={solved} aria-pressed={choice === value} onClick={() => { setChoice(value); setMessage(''); }} className={`min-h-14 rounded-xl border text-xl font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300 ${choice === value ? 'border-cyan-200 bg-cyan-300 text-slate-950' : 'border-slate-600 bg-slate-800 text-white hover:border-cyan-300'}`}>{value}</button>)}</div></> : <><h3 id="mission-title" className="mt-4 text-xl font-bold">Reconstruye el circuito</h3><p className="mt-2 text-sm text-slate-300">Empieza en <strong>{mission.start}</strong> y alcanza <strong>{mission.target}</strong>. Usa cada conexión una vez, en el orden que elijas.</p><div role="group" aria-live="polite" className="mt-5 flex flex-wrap items-center justify-center gap-2" aria-label={`Circuito: inicio ${mission.start}, resultado actual ${circuitValue(mission, order)}, objetivo ${mission.target}`}><span className="grid min-h-14 min-w-14 place-items-center rounded-xl border border-cyan-300/30 bg-slate-950 px-3 text-xl font-black text-cyan-100">{mission.start}</span>{order.map((id, i) => <span key={id} className="rounded-xl border border-violet-300/30 bg-violet-400/10 px-3 py-3 font-bold text-violet-100"><span className="sr-only">Paso {i + 1}: </span>{mission.blocks.find(block => block.id === id)!.label}</span>)}<span aria-hidden="true" className="text-cyan-200">→</span><span className={`${styles.node} grid min-h-14 min-w-14 place-items-center rounded-xl border border-cyan-300/30 bg-slate-950 px-3 text-xl font-black text-cyan-100`}>{circuitValue(mission, order)}</span></div><p className="mt-5 text-sm font-semibold text-slate-200">Conexiones disponibles:</p><div className="mt-2 flex flex-wrap gap-2">{mission.blocks.map(block => <button key={block.id} type="button" disabled={solved || order.includes(block.id)} onClick={() => { setOrder(current => [...current, block.id]); setHintText(''); setMessage(''); }} className={`${secondaryButton} disabled:opacity-40`}>{block.label}</button>)}<button type="button" className={secondaryButton} disabled={solved || !order.length} onClick={() => { setOrder(current => current.slice(0, -1)); setHintText(''); setMessage(''); }}>Deshacer</button></div></>}
        <div className="mt-6 flex flex-wrap gap-2"><button type="button" className={primaryButton} disabled={solved || (mission.kind === 'sequence' ? choice === null : order.length !== mission.blocks.length)} onClick={submit}>Descifrar</button><button type="button" className={secondaryButton} disabled={solved} onClick={giveHint}>Pista</button><button type="button" className={secondaryButton} onClick={() => begin(mission.level)}>Reiniciar misión</button></div>
        <div aria-live="polite" className="mt-4 min-h-12 rounded-xl bg-slate-950/70 p-3 text-sm text-slate-100">{message || hintText || 'Analiza el sistema y elige tu estrategia.'}{message && hintText && <span className="mt-2 block text-cyan-200">{hintText}</span>}</div>
        {solved && <div className="mt-4 flex flex-wrap gap-2"><button ref={nextButtonRef} type="button" className={primaryButton} onClick={() => mission.level < 50 ? begin(mission.level + 1) : setLevel(null)}>{mission.level < 50 ? 'Siguiente misión →' : 'Volver al mapa'}</button><button type="button" className={secondaryButton} onClick={() => setLevel(null)}>Ver mapa</button></div>}
        </section><p className="text-sm text-slate-400">★ Completar · ★ Sin pistas · ★ Sin intentos incorrectos. Un error no bloquea la misión.</p>
      </>}
      <p className="text-sm text-slate-400">{!loaded ? 'Cargando progreso…' : syncStatus === 'sincronizado' ? 'Progreso sincronizado con tu perfil.' : syncStatus === 'conectando' ? 'Conectando tu progreso…' : syncStatus === 'pendiente' ? 'Sin conexión: guardado en este dispositivo; se sincronizará al reconectar.' : syncStatus === 'error' ? 'No se pudo sincronizar; tu progreso sigue en este dispositivo.' : 'Progreso guardado en este dispositivo.'} Este juego no modifica tus logros de clase.</p>
    </div>
  </LearningShell>;
}
