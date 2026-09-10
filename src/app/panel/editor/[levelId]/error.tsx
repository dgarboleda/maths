"use client";

import { useEffect } from "react";
import Link from "next/link";
import { reportError } from "@/lib/reportError";

/**
 * Error dentro del Editor de Nivel — Fase 23 (docs/plan-salto-producto.md
 * §1.2). Esta ruta no tiene chrome del panel ni un `id="contenido"` propio
 * (`LevelEditorScreen` no lo usa hoy — fuera del alcance de esta fase), así
 * que este boundary sí es dueño de la pantalla completa.
 *
 * El mensaje es deliberadamente distinto al resto: `LevelEditorProvider`
 * guarda un borrador en `localStorage` en cada cambio
 * (`src/lib/level/persistence/draftCache.ts`) independiente de este error, y
 * lo recupera solo con volver a montar el editor — es lo único que "Reintentar"
 * hace acá. Decirle al padre que no perdió su trabajo es la diferencia real
 * con un error genérico.
 */
export default function LevelEditorError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    reportError(error, "editor");
  }, [error]);

  return (
    <main id="contenido" tabIndex={-1} className="flex min-h-screen w-full items-center justify-center bg-slate-950 px-6">
      <div className="w-full max-w-md space-y-4 rounded-2xl border border-rose-500/20 bg-slate-900/60 p-6 text-center">
        <h1 className="font-display text-xl font-bold text-white">El editor tuvo un problema</h1>
        <p className="text-sm text-slate-400">
          Tu último cambio sigue guardado en este navegador. &ldquo;Reintentar&rdquo; vuelve a abrir el nivel y lo recupera.
        </p>
        <div className="flex flex-col gap-2 pt-2">
          <button
            type="button"
            onClick={() => retry()}
            className="flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 text-sm font-bold text-white hover:brightness-110"
          >
            Reintentar
          </button>
          <Link
            href="/panel/editor"
            className="flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-indigo-500/25 bg-slate-800/60 px-4 text-sm font-bold text-slate-100 hover:bg-slate-800"
          >
            Volver a la lista de niveles
          </Link>
        </div>
      </div>
    </main>
  );
}
