'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Volume2, VolumeX } from 'lucide-react';
import { LearningShell, primaryButton, secondaryButton } from '@/components/learning/LearningShell';
import { useTargetProgress } from '@/lib/minigames/useTargetProgress';
import { useSoundPreference } from '@/lib/useSoundPreference';
import { playSound } from '@/lib/gameSound';
import { ACTIONS, ENCOUNTERS, canUse, describeIntent, intentFor, fraction, isCorrectFraction, newBattle, playTurn, type Action, type Battle } from '@/lib/minigames/fractionFighters';
import styles from './fraction.module.css';

const encounterArt = ['brote', 'brote', 'bosque', 'tortuga', 'mariposa', 'bosque', 'guardian'];
const enemySprites = ['brote', 'brote', 'zorro', 'tortuga', 'mariposa', 'zorro', 'guardian'];

function EnergyBar({ energy, cost = 0 }: { energy: number; cost?: number }) {
  return <div role="img" aria-label={`Energía ${fraction(energy)}${cost ? `, gastarás ${fraction(cost)}; las partes verdes muestran lo que queda` : ''}`} className="flex h-7 gap-0.5 overflow-hidden rounded-xl border border-emerald-200/30 bg-slate-950 p-1">{Array.from({ length: 12 }, (_, i) => <span key={i} aria-hidden="true" className={`flex-1 rounded-sm ${i < energy - cost ? 'bg-emerald-300' : i < energy ? 'bg-amber-300' : 'bg-slate-700'}`} />)}</div>;
}

export function FractionFighters({ childId }: { childId: string }) {
  const { setProgress, visible: progress, loaded, syncStatus } = useTargetProgress(childId, 'fraction-fighters');
  const [soundOn, toggleSound] = useSoundPreference();
  const [battle, setBattle] = useState<Battle | null>(null);
  const [selected, setSelected] = useState<Action | null>(null);
  const [question, setQuestion] = useState(false);
  const [answer, setAnswer] = useState('');
  const [feedback, setFeedback] = useState('');
  const [hint, setHint] = useState(0);
  const [effect, setEffect] = useState<{ icon: string; key: number; action: Action['id']; enemyAttack: boolean } | null>(null);

  function begin(index: number) { setEffect(null); setBattle(newBattle(index)); setSelected(null); setQuestion(false); setAnswer(''); setFeedback(''); setHint(0); }
  function resolve(action: Action) {
    if (!battle) return;
    const next = playTurn(battle, action);
    setEffect({ icon: action.icon, key: battle.turn, action: action.id, enemyAttack: next.result !== 'won' && intentFor(battle).type === 'attack' });
    setBattle(next); setSelected(null); setQuestion(false); setAnswer(''); setFeedback(''); setHint(0);
    playSound(next.result === 'won' ? 'fanfare' : next.result === 'lost' ? 'fail' : 'pop', soundOn);
    if (next.result === 'won') {
      const stars = 1 + (next.revealed ? 0 : 1) + (next.heroHp >= 3 ? 1 : 0);
      setProgress(current => ({ ...current, unlocked: Math.max(current.unlocked, Math.min(7, next.encounter + 2)), stars: { ...current.stars, [next.encounter + 1]: Math.max(current.stars[next.encounter + 1] ?? 0, stars) }, completed: (current.completed ?? 0) + 1 }));
    }
  }
  function useSelected() {
    if (!battle || !selected || !canUse(battle, selected)) return;
    if (battle.turn % 2 === 0) { setAnswer(''); setHint(0); setFeedback(''); setQuestion(true); }
    else resolve(selected);
  }
  function checkAnswer(event: React.FormEvent) {
    event.preventDefault(); if (!battle || !selected) return;
    if (!isCorrectFraction(answer, battle.energy - selected.cost)) { setFeedback('Aún no coincide. Compara las partes de la barra e inténtalo de nuevo.'); playSound('wrong', soundOn); return; }
    playSound('correct', soundOn); resolve(selected);
  }
  const enemy = battle ? ENCOUNTERS[battle.encounter] : null;
  return <LearningShell childId={childId} title="Fraction Fighters" eyebrow="Minijuegos · aventura de fracciones">
    <div className="mx-auto max-w-4xl space-y-5 pb-8">
      <div className="flex flex-wrap items-center justify-between gap-3"><Link href={`/jugar/${childId}/practicar`} className="text-sm font-bold text-emerald-200 hover:underline">← Volver a practicar</Link><button type="button" className={secondaryButton} onClick={toggleSound} aria-label="Sonido del juego" aria-pressed={soundOn}>{soundOn ? <Volume2 size={18} /> : <VolumeX size={18} />} Sonido {soundOn ? 'activado' : 'desactivado'}</button></div>
      {!battle ? <>
        <section className={`${styles.scene} overflow-hidden rounded-3xl border border-emerald-200/30 px-6 pb-7 pt-40 sm:pt-56`}><div className="max-w-lg rounded-2xl bg-slate-950/80 p-5"><p className="text-xs font-bold uppercase tracking-widest text-emerald-300">Una aventura por turnos</p><h2 className="mt-2 text-3xl font-black text-white">El bosque de las fracciones</h2><p className="mt-2 text-sm leading-relaxed text-slate-200">La guardiana y las criaturas necesitan tu ayuda. Elige tus poderes, reparte tu energía y devuelve la luz al bosque.</p></div></section>
        <section aria-labelledby="encounters" className="space-y-3"><div><h2 id="encounters" className="text-xl font-bold">Elige un encuentro</h2><p className="mt-1 text-sm text-slate-300">Empieza con energía completa. Cada turno recuperas hasta ¼. Sin reloj: piensa a tu ritmo.</p></div><div className="grid gap-3 sm:grid-cols-2">{ENCOUNTERS.map((encounter, index) => { const unlocked = index + 1 <= Math.min(7, progress.unlocked); return <button type="button" key={encounter.name + index} disabled={!loaded || !unlocked} onClick={() => begin(index)} className="flex min-h-24 items-center gap-4 rounded-2xl border border-emerald-300/25 bg-slate-900 p-4 text-left transition hover:border-emerald-300 hover:bg-emerald-950/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300 disabled:opacity-50"><span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-cover bg-center text-3xl" style={{ backgroundImage: `linear-gradient(#001c18aa,#001c18aa),url(/games/fraction-fighters/${encounterArt[index]}.webp)` }} aria-hidden="true">{unlocked ? encounter.color : '🔒'}</span><span><strong className="block text-white">{index + 1}. {encounter.title}</strong><span className="mt-1 block text-sm text-slate-300">{unlocked ? encounter.lesson : 'Completa el encuentro anterior.'}</span><span className="mt-1 block text-xs text-amber-200">{'★'.repeat(progress.stars[index + 1] ?? 0)}{'☆'.repeat(3 - (progress.stars[index + 1] ?? 0))}</span></span></button>; })}</div></section>
      </> : enemy && <>
        <div className="flex flex-wrap items-center justify-between gap-2"><button type="button" onClick={() => { setBattle(null); setQuestion(false); }} className={secondaryButton}>← Volver al mapa</button><span className="text-sm font-bold text-emerald-200">{enemy.title} · Turno {battle.turn}/15</span></div>
        <section className={`${styles.scene} relative overflow-hidden rounded-3xl border border-emerald-300/30`} style={{ backgroundImage: "linear-gradient(180deg,rgba(2,16,23,.14),rgba(1,13,20,.08) 48%,rgba(1,12,20,.9)), url(/games/fraction-fighters/arena.webp)" }} aria-label="Arena del bosque mágico"><div className="relative flex min-h-80 flex-col justify-between p-4 sm:min-h-96 sm:p-6">
          <Image unoptimized src="/games/fraction-fighters/sprite-hero.webp" width={480} height={720} alt="" aria-hidden="true" data-testid="guardiana-animada" data-motion={effect ? effect.action === 'escudo' ? 'defensa' : effect.action === 'curar' ? 'curacion' : effect.action === 'descansar' ? 'reposo' : 'ataque' : 'reposo'} key={`hero-${effect?.key ?? 0}`} className={`${styles.actor} ${styles.hero} ${effect ? effect.action === 'escudo' ? styles.defend : effect.action === 'curar' ? styles.heal : effect.action === 'descansar' ? styles.idle : styles.attack : styles.idle}`} />
          <Image unoptimized src={`/games/fraction-fighters/sprite-${enemySprites[battle.encounter]}.webp`} width={480} height={480} alt="" aria-hidden="true" data-testid="criatura-animada" data-motion={effect ? effect.enemyAttack ? 'ataque' : ['chispa', 'rayo', 'lazo'].includes(effect.action) ? 'reaccion' : 'reposo' : 'reposo'} key={`enemy-${effect?.key ?? 0}`} className={`${styles.actor} ${styles.enemy} ${effect ? effect.enemyAttack ? styles.enemyAttack : ['chispa', 'rayo', 'lazo'].includes(effect.action) ? styles.enemyReact : styles.idle : styles.idle}`} />
          {effect && <span key={effect.key} aria-hidden="true" className={styles.effect}>{effect.icon}</span>}<div className="relative z-10 grid grid-cols-2 gap-3"><div className="rounded-2xl bg-slate-950/85 p-3 text-sm"><p className="font-bold text-emerald-200">🌿 Guardiana</p><p>Vida: {battle.heroHp}/8 {battle.heroShield > 0 && '· Escudo: 2'}</p><progress value={battle.heroHp} max={8} aria-label="Vida de la guardiana" className="mt-1 h-2 w-full accent-emerald-300" /></div><div className="rounded-2xl bg-slate-950/85 p-3 text-sm"><p className="font-bold text-violet-200">{enemy.color} {enemy.name}</p><p>Vida: {battle.enemyHp}/{enemy.hp} {battle.enemyShield > 0 && '· Escudo: 2'}</p><progress value={battle.enemyHp} max={enemy.hp} aria-label={`Vida de ${enemy.name}`} className="mt-1 h-2 w-full accent-violet-300" /></div></div><div className="relative z-10 self-center rounded-full border border-violet-200/35 bg-slate-950/90 px-4 py-2 text-center text-sm font-bold text-violet-100">🔮 {battle.result === 'playing' ? describeIntent(battle) : 'El encuentro ha terminado'}</div></div></section>
        <section className={`${styles.glow} rounded-3xl border border-emerald-300/25 bg-slate-900 p-5 sm:p-6`} aria-label="Poderes y energía"><div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-lg font-bold">Tu energía: {fraction(battle.energy)}</h2><span className="text-xs text-slate-300">12 partes iguales · recuperas ¼ por turno</span></div><div className="mt-3"><EnergyBar energy={battle.energy} cost={selected && canUse(battle, selected) ? selected.cost : 0} /></div>{selected && <p className="mt-2 text-sm text-amber-200">En amarillo: gastarás {fraction(selected.cost)}. Las partes verdes muestran lo que quedará.</p>}
        <p aria-live="polite" className="mt-4 rounded-xl bg-slate-950/70 p-3 text-sm text-slate-100">{battle.log}</p>
        {battle.result === 'playing' && !question && <><h3 className="mt-5 font-bold">Elige tu poder</h3><div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{ACTIONS.filter(action => action.id !== 'lazo' || battle.encounter >= 4).map(action => <button type="button" key={action.id} disabled={!canUse(battle, action)} aria-pressed={selected?.id === action.id} onClick={() => setSelected(action)} className={`min-h-20 rounded-2xl border p-3 text-left transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300 disabled:cursor-not-allowed disabled:opacity-45 ${selected?.id === action.id ? 'border-emerald-200 bg-emerald-500/20' : 'border-slate-600 bg-slate-800 hover:border-emerald-300'}`}><span className="block font-bold">{action.icon} {action.name} · {fraction(action.cost)}</span><span className="mt-1 block text-sm text-slate-300">{!canUse(battle, action) ? battle.energy < action.cost ? 'Necesitas más energía' : 'Tu vida está completa' : action.description}</span></button>)}</div><button type="button" className={`${primaryButton} mt-4`} disabled={!selected} onClick={useSelected}>Usar poder →</button></>}
        {question && selected && battle.result === 'playing' && <form onSubmit={checkAnswer} className="mt-5 rounded-2xl border border-amber-300/30 bg-amber-400/10 p-4"><h3 className="font-bold text-amber-100">¡Piensa antes de actuar!</h3><p className="mt-2">Tienes <strong>{fraction(battle.energy)}</strong> y {selected.name} cuesta <strong>{fraction(selected.cost)}</strong>. ¿Cuánta energía quedará?</p><label htmlFor="fraction-answer" className="mt-3 block text-sm font-semibold">Escribe una fracción o un número entero</label><div className="mt-2 flex flex-wrap gap-2"><input id="fraction-answer" value={answer} onChange={event => setAnswer(event.target.value)} placeholder="Ej. 1/4" inputMode="text" autoComplete="off" className="min-h-11 w-32 rounded-xl border border-slate-500 bg-slate-950 px-3 text-white" /><button className={primaryButton} type="submit">Comprobar</button><button type="button" className={secondaryButton} onClick={() => { setQuestion(false); setFeedback(''); }}>Cambiar acción</button><button type="button" className={secondaryButton} onClick={() => { const next = Math.min(3, hint + 1); setHint(next); if (next === 3) setBattle({ ...battle, revealed: true }); }}>Pista</button></div>{hint > 0 && <p className="mt-3 text-sm text-amber-100">{hint === 1 ? 'Compara partes del mismo tamaño: utiliza los doceavos de la barra.' : hint === 2 ? `${fraction(battle.energy)} son ${battle.energy}/12 y ${fraction(selected.cost)} son ${selected.cost}/12. Resta los numeradores.` : `Quedan ${battle.energy - selected.cost}/12, es decir ${fraction(battle.energy - selected.cost)}.`}</p>}{feedback && <p role="alert" className="mt-3 font-semibold text-rose-200">{feedback}</p>}</form>}
        {battle.result !== 'playing' && <div className="mt-5 rounded-2xl border border-emerald-300/30 bg-emerald-400/10 p-4"><h3 className="text-xl font-bold">{battle.result === 'won' ? '✨ ¡Encuentro completado!' : battle.result === 'lost' ? 'La guardiana descansará' : 'La criatura se retiró'}</h3><p className="mt-2 text-sm text-slate-200">{battle.result === 'won' ? `Estrellas: ${1 + (battle.revealed ? 0 : 1) + (battle.heroHp >= 3 ? 1 : 0)}/3 · Completar, sin revelar la solución y terminar con al menos 3 de vida.` : 'Prueba anticipar el siguiente ataque y conserva energía para defenderte.'}</p><div className="mt-4 flex flex-wrap gap-2"><button type="button" className={primaryButton} onClick={() => begin(battle.result === 'won' && battle.encounter < 6 ? battle.encounter + 1 : battle.encounter)}>{battle.result === 'won' && battle.encounter < 6 ? 'Siguiente encuentro →' : 'Volver a intentar'}</button><button type="button" className={secondaryButton} onClick={() => setBattle(null)}>Ver mapa</button></div></div>}
        </section>
      </>}
      <p className="text-sm text-slate-400">{!loaded ? 'Cargando progreso…' : syncStatus === 'sincronizado' ? 'Progreso sincronizado con tu perfil.' : syncStatus === 'conectando' ? 'Conectando tu progreso…' : syncStatus === 'pendiente' ? 'Sin conexión: guardado en este dispositivo; se sincronizará al reconectar.' : syncStatus === 'error' ? 'No se pudo sincronizar; tu progreso sigue en este dispositivo.' : 'Progreso guardado en este dispositivo.'} Este juego no modifica tus logros de clase.</p>
    </div>
  </LearningShell>;
}
