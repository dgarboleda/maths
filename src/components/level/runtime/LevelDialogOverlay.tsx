"use client";

import { useState } from "react";
import { WorldDialog } from "@/components/world/WorldDialog";
import type { LevelDialog, LevelEntity } from "@/lib/level/schema";

/**
 * Diálogo de un `LevelDialog` — reutiliza el marco genérico `WorldDialog`
 * (ya compartido con `ShopPanel`, no algo cerrado sobre Ciudad Central).
 * El padre lo monta con `key={dialog.id}` para que el índice de línea
 * arranque de cero cada vez que cambia el diálogo activo.
 */
export function LevelDialogOverlay({
  dialog,
  entities,
  onClose,
}: {
  dialog: LevelDialog;
  entities: LevelEntity[];
  onClose: () => void;
}) {
  const [lineIndex, setLineIndex] = useState(0);
  const line = dialog.lines[lineIndex];
  if (!line) return null;

  const speaker = line.speakerEntityId ? entities.find((e) => e.id === line.speakerEntityId) : null;
  const isLast = lineIndex === dialog.lines.length - 1;

  function next() {
    if (isLast) {
      onClose();
      return;
    }
    setLineIndex((i) => i + 1);
  }

  return (
    <WorldDialog icon={speaker ? "🗨️" : "📖"} title={speaker?.name ?? "Narrador"} onClose={onClose}>
      <p className="text-slate-200">{line.text}</p>
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
