"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { reportError } from "@/lib/reportError";

/**
 * Error dentro de `/jugar/{childId}/**` — Fase 23
 * (docs/plan-salto-producto.md §1.2). Tono de juego, no de panel: quien lo ve
 * es el hijo, no el padre. `jugar/[childId]/layout.tsx` es un passthrough
 * sin chrome propio, así que este es todo lo que se ve mientras el error
 * está activo.
 */
export default function JugarError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  const params = useParams<{ childId: string }>();

  useEffect(() => {
    reportError(error, "jugar", { childId: params.childId });
  }, [error, params.childId]);

  return (
    <main id="contenido" tabIndex={-1} className="flex min-h-screen w-full items-center justify-center bg-slate-950 px-6">
      <div className="w-full max-w-md space-y-4 rounded-2xl border border-indigo-500/20 bg-slate-900/60 p-6 text-center">
        <h1 className="font-display text-xl font-bold text-white">¡Uy! Algo salió mal</h1>
        <p className="text-sm text-slate-400">La aventura tuvo un tropiezo. Probá de nuevo o volvé al mapa.</p>
        <div className="flex flex-col gap-2 pt-2">
          <button
            type="button"
            onClick={() => retry()}
            className="flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 text-sm font-bold text-white hover:brightness-110"
          >
            Intentar de nuevo
          </button>
          {params.childId && (
            <Link
              href={`/jugar/${params.childId}/mapa`}
              className="flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-indigo-500/25 bg-slate-800/60 px-4 text-sm font-bold text-slate-100 hover:bg-slate-800"
            >
              Volver al mapa
            </Link>
          )}
          <Link href="/perfiles" className="mt-1 text-xs text-slate-400 underline underline-offset-2">
            Volver a perfiles
          </Link>
        </div>
      </div>
    </main>
  );
}
