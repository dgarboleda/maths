let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    const Ctor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    audioCtx = new Ctor();
  }
  return audioCtx;
}

export type SoundType =
  | "correct" | "wrong" | "click" | "fanfare" | "mastery" | "fail"
  // Efectos arcade de los minijuegos: cortos y suaves para poder repetirse.
  | "coin" | "combo" | "crash" | "pop" | "whoosh";

/** Notas breves para los efectos arcade: [frecuencia, inicio, duración]. */
const ARCADE: Partial<Record<SoundType, { wave: OscillatorType; gain: number; notes: [number, number][]; length: number; slide?: number }>> = {
  coin: { wave: "square", gain: 0.12, notes: [[987.77, 0], [1318.51, 0.06]], length: 0.2 },
  combo: { wave: "square", gain: 0.12, notes: [[659.25, 0], [880, 0.05], [1174.66, 0.1], [1567.98, 0.15]], length: 0.3 },
  crash: { wave: "sawtooth", gain: 0.18, notes: [[120, 0]], length: 0.32, slide: 45 },
  pop: { wave: "triangle", gain: 0.16, notes: [[330, 0]], length: 0.12, slide: 880 },
  whoosh: { wave: "sine", gain: 0.1, notes: [[220, 0]], length: 0.35, slide: 660 },
};

export function playSound(type: SoundType, enabled: boolean) {
  if (!enabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    const now = ctx.currentTime;

    const arcade = ARCADE[type];
    if (arcade) {
      osc.type = arcade.wave;
      for (const [freq, at] of arcade.notes) osc.frequency.setValueAtTime(freq, now + at);
      if (arcade.slide) osc.frequency.exponentialRampToValueAtTime(arcade.slide, now + arcade.length);
      gain.gain.setValueAtTime(arcade.gain, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + arcade.length);
      osc.start(now);
      osc.stop(now + arcade.length);
    } else if (type === "correct") {
      osc.type = "triangle";
      osc.frequency.setValueAtTime(523.25, now);
      osc.frequency.setValueAtTime(659.25, now + 0.08);
      osc.frequency.setValueAtTime(783.99, now + 0.16);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
      osc.start(now);
      osc.stop(now + 0.35);
    } else if (type === "wrong") {
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(180, now);
      osc.frequency.setValueAtTime(140, now + 0.1);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
      osc.start(now);
      osc.stop(now + 0.25);
    } else if (type === "click") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(400, now);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
      osc.start(now);
      osc.stop(now + 0.05);
    } else if (type === "mastery") {
      // Fase 31 (docs/plan-jugabilidad.md §5): un escalón más grande que
      // "fanfare" — dominar un módulo por primera vez, cerrar una misión,
      // vencer un boss (Fase 34). Mismo motivo ascendente de "fanfare", una
      // quinta nota y el doble de sostenido.
      osc.type = "square";
      osc.frequency.setValueAtTime(523.25, now);
      osc.frequency.setValueAtTime(659.25, now + 0.1);
      osc.frequency.setValueAtTime(783.99, now + 0.2);
      osc.frequency.setValueAtTime(1046.5, now + 0.3);
      osc.frequency.setValueAtTime(1318.51, now + 0.42);
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.85);
      osc.start(now);
      osc.stop(now + 0.85);
    } else if (type === "fail") {
      // Descendente y más largo que "wrong" (un solo fallo): para un cierre
      // real, no una respuesta equivocada más — hoy sin llamador propio,
      // reservado para la derrota del boss (Fase 34).
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.setValueAtTime(164.81, now + 0.15);
      osc.frequency.setValueAtTime(110, now + 0.35);
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.6);
      osc.start(now);
      osc.stop(now + 0.6);
    } else {
      osc.type = "square";
      osc.frequency.setValueAtTime(523.25, now);
      osc.frequency.setValueAtTime(659.25, now + 0.12);
      osc.frequency.setValueAtTime(783.99, now + 0.24);
      osc.frequency.setValueAtTime(1046.5, now + 0.36);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.6);
      osc.start(now);
      osc.stop(now + 0.6);
    }
  } catch {
    // El navegador puede bloquear audio hasta el primer gesto del usuario; se ignora.
  }
}
