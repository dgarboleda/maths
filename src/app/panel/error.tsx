"use client";

import { useEffect } from "react";
import Link from "next/link";
import { reportError } from "@/lib/reportError";

/**
 * Error dentro de `/panel/**` — Fase 23 (docs/plan-salto-producto.md §1.2).
 * `PanelShell` (montado por `panel/layout.tsx`, fuera del alcance de este
 * boundary — `error.tsx` nunca envuelve el `layout.tsx` de su propio
 * segmento) ya puso un `<main id="contenido">` alrededor de `children`: acá
 * NO se repite ese landmark, solo se reemplaza el contenido de adentro.
 */
export default function PanelError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    reportError(error, "panel");
  }, [error]);

  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 rounded-2xl border border-rose-500/20 bg-slate-900/60 p-6 text-center">
      <h1 className="font-display text-lg font-bold text-white">Algo se rompió</h1>
      <p className="text-sm text-slate-400">Hubo un problema en el panel. Podés intentar de nuevo.</p>
      <div className="flex w-full flex-col gap-2">
        <button
          type="button"
          onClick={() => retry()}
          className="flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 text-sm font-bold text-white hover:brightness-110"
        >
          Reintentar
        </button>
        <Link
          href="/panel"
          className="flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-indigo-500/25 bg-slate-800/60 px-4 text-sm font-bold text-slate-100 hover:bg-slate-800"
        >
          Volver al resumen
        </Link>
      </div>
    </div>
  );
}
