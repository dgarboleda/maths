"use client";

import { useState } from "react";
import Image from "next/image";
import { WorldDialog } from "./WorldDialog";
import type { StoryBeat } from "@/lib/gameworld/schema";

/**
 * Secuencia de `StoryBeat`, línea a línea — Fase 30 (docs/plan-jugabilidad.md
 * §4). Mismo patrón de "Seguir ▸" que `LevelDialogOverlay` (nivel/runtime),
 * pero sobre el `speaker`/`portrait` libres de un `StoryBeat` — a nivel de
 * mundo no hay entidades de un nivel a las que referenciar — y mostrando el
 * retrato, que `LevelDialogOverlay` declara en su tipo pero nunca pinta.
 */
export function StoryBeatOverlay({ beats, onClose }: { beats: StoryBeat[]; onClose: () => void }) {
  const [index, setIndex] = useState(0);
  const beat = beats[index];
  if (!beat) return null;
  const isLast = index === beats.length - 1;

  function next() {
    if (isLast) {
      onClose();
      return;
    }
    setIndex((i) => i + 1);
  }

  return (
    <WorldDialog icon={beat.speaker ? "🗨️" : "📖"} title={beat.speaker ?? "Narrador"} onClose={onClose}>
      {beat.portrait && (
        <Image
          src={beat.portrait}
          alt=""
          aria-hidden="true"
          width={56}
          height={56}
          className="mb-3 size-14 rounded-2xl border border-white/15 object-cover"
        />
      )}
      <p className="text-slate-200">{beat.text}</p>
      <button
        type="button"
        onClick={next}
        className="mt-4 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 py-2 text-sm font-bold text-white"
      >
        {isLast ? "Entendido" : "Seguir ▸"}
      </button>
    </WorldDialog>
  );
}
