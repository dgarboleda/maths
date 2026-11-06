"use client";

import { Pause, Play, RotateCcw, Volume2, VolumeX } from "lucide-react";
import type { useNarration } from "./useNarration";
import styles from "./tutor.module.css";

/**
 * Mini reproductor de la voz del tutor: play/pausa circular, repetir,
 * silenciar y una barra de progreso fina. Los iconos llevan nombre accesible
 * (el texto visible sería ruido); el estado se anuncia en el propio nombre.
 * Botones de 36–40 px: por encima del mínimo de 24 px de WCAG 2.5.8.
 */
export function VoicePlayer({ narration, fallbackClip }: { narration: ReturnType<typeof useNarration>; fallbackClip: string }) {
  const { status, voiceOn, progress } = narration;
  const playing = status === "playing";
  const label = playing ? "Pausar voz" : status === "paused" ? "Continuar voz" : "Escuchar";
  const caption = !voiceOn ? "Silenciada" : playing ? "Sonando" : status === "paused" ? "En pausa" : "Voz";
  const icon =
    "grid place-items-center rounded-full transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300 disabled:cursor-not-allowed disabled:opacity-40";

  return (
    <div role="group" aria-label="Voz del tutor" className="flex w-full max-w-xs items-center gap-2 rounded-full border border-slate-700 bg-slate-900/80 py-1 pl-1 pr-2 shadow-inner">
      <button
        type="button"
        aria-label={label}
        title={label}
        disabled={!voiceOn}
        onClick={() => narration.toggle(fallbackClip)}
        className={`${icon} h-10 w-10 shrink-0 bg-cyan-300 text-slate-950 hover:bg-cyan-200`}
      >
        {playing ? <Pause aria-hidden="true" size={18} fill="currentColor" /> : <Play aria-hidden="true" size={18} fill="currentColor" className="translate-x-px" />}
      </button>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
          {playing && (
            <span aria-hidden="true" className={`flex h-3 items-end gap-0.5 ${styles.bars}`}>
              <span />
              <span />
              <span />
            </span>
          )}
          <span className="hidden truncate sm:inline">{caption}</span>
        </div>
        <div aria-hidden="true" className="mt-1 h-1 overflow-hidden rounded-full bg-slate-700">
          <div className="h-full rounded-full bg-cyan-300 transition-[width] duration-200 ease-linear" style={{ width: `${Math.round(progress * 100)}%` }} />
        </div>
      </div>

      <button
        type="button"
        aria-label="Repetir"
        title="Repetir"
        disabled={!voiceOn}
        onClick={() => narration.repeat(fallbackClip)}
        className={`${icon} h-9 w-9 shrink-0 text-slate-200 hover:bg-slate-800 hover:text-white`}
      >
        <RotateCcw aria-hidden="true" size={17} />
      </button>
      <button
        type="button"
        aria-label={voiceOn ? "Silenciar voz" : "Activar voz"}
        title={voiceOn ? "Silenciar voz" : "Activar voz"}
        aria-pressed={!voiceOn}
        onClick={() => narration.setVoiceOn(!voiceOn)}
        className={`${icon} h-9 w-9 shrink-0 hover:bg-slate-800 ${voiceOn ? "text-slate-200 hover:text-white" : "text-amber-300"}`}
      >
        {voiceOn ? <Volume2 aria-hidden="true" size={17} /> : <VolumeX aria-hidden="true" size={17} />}
      </button>
    </div>
  );
}
