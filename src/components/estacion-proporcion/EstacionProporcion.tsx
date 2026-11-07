'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Volume2, VolumeX } from 'lucide-react';
import { LearningShell, primaryButton, secondaryButton } from '@/components/learning/LearningShell';
import { useTargetProgress } from '@/lib/minigames/useTargetProgress';
import { useSoundPreference } from '@/lib/useSoundPreference';
import { playSound } from '@/lib/gameSound';
import { answerFor, formatNumber, MISSIONS } from '@/lib/minigames/estacionProporcion';
import styles from './estacion.module.css';

const kinds = { supply: '📦 Preparar carga', machine: '⚙️ Reparar máquina', offer: '🪙 Comparar ofertas', audit: '🔍 Inspeccionar carga' };
const modules = ['Paneles solares', 'Invernadero', 'Mercado orbital', 'Torre de control'];

export function EstacionProporcion({ childId }: { childId: string }) {
  const { visible: progress, setProgress, loaded, syncStatus } = useTargetProgress(childId, 'estacion-proporcion');
  const [soundOn, toggleSound] = useSoundPreference();
  const [level, setLevel] = useState<number | null>(null);
  const [choice, setChoice] = useState<number | null>(null);
  const [cargo, setCargo] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [hintUsed, setHintUsed] = useState(false);
  const [message, setMessage] = useState('');
  const [solved, setSolved] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const mapHeading = useRef<HTMLHeadingElement>(null);
  const nextButton = useRef<HTMLButtonElement>(null);
  const hasStarted = useRef(false);
  const mission = level === null ? null : MISSIONS[level - 1];
  const completed = MISSIONS.filter((_, index) => (progress.stars[index + 1] ?? 0) > 0).length;
  useEffect(() => { if (level !== null) heading.current?.focus(); else if (hasStarted.current) mapHeading.current?.focus(); }, [level]);
  useEffect(() => { if (solved) nextButton.current?.focus(); }, [solved]);

  function begin(next: number) {
    hasStarted.current = true; setLevel(next); setChoice(null); setCargo(0); setMistakes(0); setHintUsed(false); setMessage(''); setSolved(false);
  }
  function askHint() {
    if (hintUsed || solved) return;
    setHintUsed(true); setMessage('');
    setProgress(current => ({ ...current, hintsUsed: (current.hintsUsed ?? 0) + 1 }));
  }
  function submit() {
    if (!mission || level === null || solved) return;
    const answer = mission.kind === 'supply' ? cargo : choice;
    if (answer === null) return;
    setProgress(current => ({ ...current, attempts: (current.attempts ?? 0) + 1 }));
    if (answer !== answerFor(mission)) {
      setMistakes(current => current + 1); setMessage('La estación aún no está lista. Revisa la relación y prueba otra vez.'); playSound('wrong', soundOn); return;
    }
    const stars = 1 + Number(!hintUsed) + Number(mistakes === 0);
    setProgress(current => ({ ...current, unlocked: Math.max(current.unlocked, Math.min(MISSIONS.length, level + 1)), stars: { ...current.stars, [level]: Math.max(current.stars[level] ?? 0, stars) }, completed: (current.completed ?? 0) + 1 }));
    setSolved(true); setMessage(`¡Misión completada! Ganaste ${stars} de 3 estrellas.`); playSound('fanfare', soundOn);
  }
  return <LearningShell childId={childId} title="Estación Proporción" eyebrow="Minijuegos · proporciones y estrategia">
    <div className="mx-auto max-w-5xl space-y-5 pb-8">
      <div className="flex flex-wrap items-center justify-between gap-3"><Link href={`/jugar/${childId}/practicar`} className="text-sm font-bold text-cyan-200 hover:underline">← Volver a practicar</Link><button type="button" className={secondaryButton} onClick={toggleSound} aria-pressed={soundOn} aria-label="Sonido del juego">{soundOn ? <Volume2 size={18} /> : <VolumeX size={18} />} Sonido {soundOn ? 'activado' : 'desactivado'}</button></div>
      {!mission ? <>
        <section className={`${styles.hero} overflow-hidden rounded-3xl border border-fuchsia-200/30 p-6 sm:p-9`}><div className="relative max-w-lg"><span className="text-xs font-bold uppercase tracking-widest text-fuchsia-200">Centro de mando · misión espacial</span><h2 className="mt-3 text-3xl font-black text-white sm:text-5xl">¡La estación te necesita!</h2><p className="mt-3 max-w-md text-sm leading-relaxed text-white">Usa las proporciones para preparar cargas, reparar sistemas y devolver la energía a la estación.</p><p className="mt-4 inline-block rounded-full bg-slate-950/85 px-4 py-2 text-sm font-bold text-cyan-100">🚀 {completed} de {MISSIONS.length} misiones completadas</p></div></section>
        <section aria-labelledby="station-map"><h2 ref={mapHeading} id="station-map" tabIndex={-1} className="text-xl font-bold">Centro de mando</h2><p className="mt-1 text-sm text-slate-300">Cada tres misiones completadas activa un módulo. Sin reloj: piensa y prueba a tu ritmo.</p><div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">{modules.map((name, i) => <div key={name} className={`rounded-xl border p-3 text-sm font-bold ${completed >= (i + 1) * 3 ? 'border-cyan-300/50 bg-cyan-400/15 text-cyan-100' : 'border-slate-700 bg-slate-900 text-slate-400'}`}><span aria-hidden="true">{completed >= (i + 1) * 3 ? '✨' : '○'}</span> {name}<span className="mt-1 block text-xs font-normal">{completed >= (i + 1) * 3 ? 'Activado' : `Se activa con ${(i + 1) * 3} misiones`}</span></div>)}</div><div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{MISSIONS.map((item, i) => { const n = i + 1, locked = !loaded || n > progress.unlocked, stars = progress.stars[n] ?? 0; return <button key={item.name} type="button" disabled={locked} onClick={() => begin(n)} aria-label={`Misión ${n}, ${item.name}, ${locked ? 'bloqueada' : `${stars} de 3 estrellas`}`} className={`${styles.mission} rounded-2xl border border-violet-300/25 bg-slate-900/90 p-4 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300 disabled:cursor-not-allowed disabled:opacity-50`}><span className="text-xs font-bold uppercase tracking-wider text-fuchsia-200">{locked ? '🔒 Bloqueada' : kinds[item.kind]}</span><span className="mt-2 block font-bold text-white">{n}. {item.name}</span><span aria-hidden="true" className="mt-2 block text-amber-200">{'★'.repeat(stars)}{'☆'.repeat(3 - stars)}</span></button>; })}</div></section>
      </> : <>
        <div className="flex flex-wrap items-center justify-between gap-3"><button type="button" className={secondaryButton} onClick={() => setLevel(null)}>← Centro de mando</button><h2 ref={heading} tabIndex={-1} className="font-bold text-cyan-200">Misión {level}/{MISSIONS.length} · {mission.name}</h2></div>
        <section className={`${styles.panel} rounded-3xl border border-violet-300/30 p-5 sm:p-8`} aria-labelledby="station-title"><div className="flex flex-wrap items-center justify-between gap-2"><span className="text-xs font-bold uppercase tracking-widest text-fuchsia-200">{kinds[mission.kind]}</span><span className="text-sm text-amber-200">★ {progress.stars[level!] ?? 0}/3</span></div><h3 id="station-title" className="mt-3 text-2xl font-black">{mission.name}</h3><p className="mt-2 text-sm leading-relaxed text-slate-200">{mission.prompt}</p>
          {mission.kind === 'supply' && <div className="mt-5 space-y-4"><div className="grid gap-3 sm:grid-cols-2"><div className={styles.metric}><span className="text-sm text-cyan-200">Carga de referencia</span><strong className="mt-1 block text-lg">👩‍🚀 {mission.basePeople} exploradores → 📦 {mission.baseAmount} {mission.unit}</strong></div><div className={styles.metric}><span className="text-sm text-fuchsia-200">Nueva tripulación</span><strong className="mt-1 block text-lg">👩‍🚀 {mission.targetPeople} exploradores → 📦 ¿cuánto? ({mission.unit})</strong></div></div><div className="rounded-2xl border border-cyan-300/25 bg-slate-950/70 p-4"><label htmlFor="cargo" className="font-bold">Ajusta la carga · {mission.unit}</label><div className="mt-3 flex flex-wrap items-center gap-3"><button type="button" className={secondaryButton} aria-label="Quitar una unidad" disabled={solved || cargo <= 0} onClick={() => { setCargo(n => n - 1); setMessage(''); }}>−</button><input id="cargo" type="number" min="0" max="100" step="1" value={cargo} disabled={solved} onChange={e => { const next = e.target.valueAsNumber; setCargo(Number.isFinite(next) ? Math.max(0, Math.min(100, Math.floor(next))) : 0); setMessage(''); }} className="w-24 rounded-xl border border-cyan-300 bg-slate-900 px-3 py-3 text-center text-xl font-black text-white"/><button type="button" className={secondaryButton} aria-label="Añadir una unidad" disabled={solved || cargo >= 100} onClick={() => { setCargo(n => n + 1); setMessage(''); }}>＋</button><span className="text-sm text-slate-300">{cargo} {mission.unit} a bordo</span></div><div aria-hidden="true" className="mt-4 flex min-h-10 flex-wrap gap-1 text-2xl">{Array.from({ length: Math.min(cargo, 18) }, (_, i) => <span className={styles.crate} key={i}>📦</span>)}{cargo > 18 && <span className="self-center text-sm font-bold text-cyan-100">+{cargo - 18}</span>}</div></div></div>}
          {mission.kind === 'machine' && <div className="mt-5"><div className={`${styles.machine} rounded-2xl border border-cyan-300/30 p-5 text-center`}><p className="text-sm text-cyan-200">Relación de referencia</p><p className="mt-2 text-lg font-bold">{formatNumber(mission.baseInput)} {mission.inputUnit} → ⚙️ → {formatNumber(mission.baseOutput)} {mission.outputUnit}</p><p className="mt-4 text-lg font-bold">{formatNumber(mission.targetInput)} {mission.inputUnit} → ⚙️ → <span className="text-amber-200">?</span> {mission.outputUnit}</p></div><p className="mt-4 font-bold">Elige la salida:</p><div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">{mission.choices.map(value => <button key={value} type="button" disabled={solved} aria-pressed={choice === value} onClick={() => { setChoice(value); setMessage(''); }} className={`${styles.choice} ${choice === value ? styles.chosen : ''}`}>{formatNumber(value)}</button>)}</div></div>}
          {mission.kind === 'offer' && <div className="mt-5 grid gap-3 sm:grid-cols-2">{mission.offers.map((offer, i) => <button key={offer.label} type="button" disabled={solved} aria-pressed={choice === i} onClick={() => { setChoice(i); setMessage(''); }} className={`${styles.choice} ${choice === i ? styles.chosen : ''} text-left`}><span className="block text-2xl">🛸 {offer.label}</span><span className="mt-2 block text-lg">{offer.quantity} litros por {offer.price} créditos</span><span className="mt-2 block text-sm font-normal">Seleccionar oferta</span></button>)}</div>}
          {mission.kind === 'audit' && <div className="mt-5"><p className="rounded-xl bg-slate-950/70 p-4 font-bold">Referencia: {mission.basePeople} {mission.peopleUnit} → {mission.baseAmount} {mission.amountUnit}</p><p className="mt-4 font-bold">Selecciona la carga incorrecta:</p><div className="mt-2 grid gap-2 sm:grid-cols-3">{mission.rows.map((row, i) => <button key={i} type="button" disabled={solved} aria-pressed={choice === i} onClick={() => { setChoice(i); setMessage(''); }} className={`${styles.choice} ${choice === i ? styles.chosen : ''}`}><span className="block text-2xl">📦</span><span className="mt-2 block">{row.people} {mission.peopleUnit} → {row.amount} {mission.amountUnit}</span></button>)}</div></div>}
          <div className="mt-6 flex flex-wrap gap-2"><button type="button" className={primaryButton} disabled={solved || (mission.kind !== 'supply' && choice === null)} onClick={submit}>{mission.kind === 'supply' ? 'Enviar carga' : mission.kind === 'machine' ? 'Activar máquina' : mission.kind === 'offer' ? 'Elegir oferta' : 'Revisar carga'}</button><button type="button" className={secondaryButton} disabled={solved || hintUsed} onClick={askHint}>Pedir pista</button><button type="button" className={secondaryButton} onClick={() => begin(level!)}>Reiniciar misión</button></div>
          <div aria-live="polite" className="mt-4 min-h-12 rounded-xl bg-slate-950/80 p-3 text-sm text-slate-100">{message || (hintUsed ? `💡 ${mission.hint}` : 'Explora la relación y prepara tu respuesta.')}{message && hintUsed && !solved && <span className="mt-2 block text-cyan-200">💡 {mission.hint}</span>}{solved && <span className="mt-2 block text-cyan-100">{mission.explanation}</span>}</div>
          {solved && <div className="mt-4 flex flex-wrap gap-2"><button ref={nextButton} type="button" className={primaryButton} onClick={() => level! < MISSIONS.length ? begin(level! + 1) : setLevel(null)}>{level! < MISSIONS.length ? 'Siguiente misión →' : 'Centro de mando'}</button><button type="button" className={secondaryButton} onClick={() => setLevel(null)}>Ver misiones</button></div>}
        </section><p className="text-sm text-slate-400">★ Completar · ★ Sin pistas · ★ Sin comprobaciones incorrectas. Puedes repetir una misión para mejorar tus estrellas.</p>
      </>}
      <p className="text-sm text-slate-400">{!loaded ? 'Cargando progreso…' : syncStatus === 'sincronizado' ? 'Progreso sincronizado con tu perfil.' : syncStatus === 'conectando' ? 'Conectando tu progreso…' : syncStatus === 'pendiente' ? 'Sin conexión: guardado en este dispositivo; se sincronizará al reconectar.' : syncStatus === 'error' ? 'No se pudo sincronizar; tu progreso sigue en este dispositivo.' : 'Progreso guardado en este dispositivo.'} Este juego no modifica tus logros de clase.</p>
    </div>
  </LearningShell>;
}
