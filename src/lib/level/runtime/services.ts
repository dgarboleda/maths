import { playSound, type SoundType } from "@/lib/gameSound";
import type { SideEffect } from "@/lib/level/events/bus";

/**
 * A dónde van los `side` de un `RuntimeEffect` (docs/level-editor-plan.md
 * §8.1) — la mitad "efecto lateral" del bus de eventos, inyectada para que
 * el Play Test (Fase 11) pueda darle una implementación de arena (sonido
 * silenciado, sin navegación real) sin que `LevelRuntime`/el bus sepan que
 * están en modo prueba. Los `patch` (la otra mitad) los aplica directamente
 * `useLevelRuntime` vía `applyRuntimePatch` — no pasan por acá.
 */
export interface RuntimeServices {
  openDialog(dialogId: string): void;
  banner(text: string, ms: number): void;
  axiaPulse(stars: number): void;
  openChallenge(challengeId: string): void;
  movePlayer(to: { x: number; y: number }, instant: boolean): void;
  playSound(sound: string): void;
}

const KNOWN_SOUNDS = new Set<SoundType>(["correct", "wrong", "click", "fanfare"]);

/** Aplica un único `SideEffect` contra `services` — el mismo `switch`
 *  sirve para la implementación real y para la de arena del Play Test,
 *  cada una decide qué hacer con cada caso. */
export function applySideEffect(effect: SideEffect, services: RuntimeServices): void {
  switch (effect.kind) {
    case "openDialog":
      services.openDialog(effect.dialogId);
      return;
    case "banner":
      services.banner(effect.text, effect.ms);
      return;
    case "axiaPulse":
      services.axiaPulse(effect.stars);
      return;
    case "openChallenge":
      services.openChallenge(effect.challengeId);
      return;
    case "movePlayer":
      services.movePlayer(effect.to, effect.instant);
      return;
    case "playSound":
      services.playSound(effect.sound);
      return;
  }
}

/**
 * Implementación real — Fase 9 solo la conecta parcialmente (todavía no hay
 * diálogos ni desafíos disparados por eventos, eso es Fase 10); las demás
 * ramas quedan listas para cuando `LevelRuntime` les pase callbacks reales
 * (banner/diálogo/desafío montados como overlay, como ya hace `QuestScene`).
 */
export function createLiveServices(opts: {
  soundOn: boolean;
  onBanner?: (text: string, ms: number) => void;
  onOpenDialog?: (dialogId: string) => void;
  onOpenChallenge?: (challengeId: string) => void;
  onAxiaPulse?: (stars: number) => void;
  onMovePlayer?: (to: { x: number; y: number }, instant: boolean) => void;
}): RuntimeServices {
  return {
    openDialog: (dialogId) => opts.onOpenDialog?.(dialogId),
    banner: (text, ms) => opts.onBanner?.(text, ms),
    axiaPulse: (stars) => opts.onAxiaPulse?.(stars),
    openChallenge: (challengeId) => opts.onOpenChallenge?.(challengeId),
    movePlayer: (to, instant) => opts.onMovePlayer?.(to, instant),
    playSound: (sound) => {
      if (KNOWN_SOUNDS.has(sound as SoundType)) playSound(sound as SoundType, opts.soundOn);
    },
  };
}
