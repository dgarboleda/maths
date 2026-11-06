"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { makePreference } from "../preferences";
import { clipUrl } from "./content";

/** Voz del tutor activada o silenciada; se recuerda en este navegador. */
export const useTutorVoice = makePreference("maths:tutor-voz", ["on", "off"] as const, "on");

export type NarrationStatus = "idle" | "playing" | "paused" | "unavailable";

/**
 * Narración con audios pregrabados. Un único <audio>: cada clip nuevo
 * sustituye al anterior, así nunca se superponen dos voces. Nada suena hasta
 * que el alumno actúa (las políticas de reproducción automática lo exigen y
 * evita sorprender a quien no espera sonido). Si un clip no carga, el texto
 * en pantalla sigue siendo la referencia.
 */
export function useNarration() {
  const audio = useRef<HTMLAudioElement | null>(null);
  const [voice, setVoice] = useTutorVoice();
  const [status, setStatus] = useState<NarrationStatus>("idle");
  const [clip, setClip] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  const start = useCallback((player: HTMLAudioElement) => {
    try {
      const pending = player.play();
      if (pending && typeof pending.catch === "function")
        pending.catch((error: unknown) => {
          // Pausar antes de que empiece no es un fallo del audio.
          if (error instanceof DOMException && error.name === "AbortError") return;
          setStatus("unavailable");
        });
    } catch {
      setStatus("unavailable");
    }
  }, []);

  /** Reproduce un clip (si la voz está activada) y lo deja como el actual para «Repetir». */
  const say = useCallback(
    (next: string) => {
      setClip(next);
      setProgress(0);
      const player = audio.current;
      if (!player) return;
      player.pause();
      if (voice === "off") return;
      player.src = clipUrl(next);
      player.currentTime = 0;
      start(player);
    },
    [voice, start],
  );

  const toggle = useCallback(
    (fallbackClip: string) => {
      const player = audio.current;
      if (!player) return;
      if (status === "playing") return player.pause();
      if (status === "paused" && clip) return start(player);
      say(clip ?? fallbackClip);
    },
    [status, clip, say, start],
  );

  const repeat = useCallback(
    (fallbackClip: string) => say(clip ?? fallbackClip),
    [clip, say],
  );

  const stop = useCallback(() => {
    audio.current?.pause();
  }, []);

  const setVoiceOn = useCallback(
    (on: boolean) => {
      if (!on) audio.current?.pause();
      setVoice(on ? "on" : "off");
    },
    [setVoice],
  );

  // Al salir de la clase la voz se detiene.
  useEffect(() => {
    const player = audio.current;
    return () => player?.pause();
  }, []);

  const audioProps = {
    ref: audio,
    preload: "none" as const,
    onPlay: () => setStatus("playing"),
    onPause: () => setStatus((s) => (s === "unavailable" ? s : "paused")),
    onEnded: () => {
      setStatus("idle");
      setProgress(1);
    },
    onTimeUpdate: (event: { currentTarget: HTMLAudioElement }) => {
      const { currentTime, duration } = event.currentTarget;
      if (duration > 0 && Number.isFinite(duration)) setProgress(Math.min(1, currentTime / duration));
    },
    onError: () => setStatus("unavailable"),
  };

  return { audioProps, voiceOn: voice === "on", setVoiceOn, status, clip, progress, say, toggle, repeat, stop };
}
