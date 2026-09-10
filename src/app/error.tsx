"use client";

import { useEffect } from "react";
import Link from "next/link";
import { reportError } from "@/lib/reportError";

/**
 * Error genérico de la app — Fase 23 (docs/plan-salto-producto.md §1.2).
 * Cubre cualquier ruta sin un `error.tsx` más específico (login, perfiles).
 * A diferencia de `global-error.tsx`, este SÍ vive dentro del `<body>` del
 * layout raíz, así que recibe `globals.css` y las fuentes normalmente.
 */
export default function ErrorScreen({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    reportError(error, "root");
  }, [error]);

  return (
    <main id="contenido" tabIndex={-1} className="flex min-h-screen w-full items-center justify-center bg-slate-950 px-6">
      <div className="w-full max-w-md space-y-4 rounded-2xl border border-rose-500/20 bg-slate-900/60 p-6 text-center">
        <h1 className="font-display text-xl font-bold text-white">Algo se rompió</h1>
        <p className="text-sm text-slate-400">Math Quest tuvo un problema inesperado. Podés intentar de nuevo.</p>
        <div className="flex flex-col gap-2 pt-2">
          <button
            type="button"
            onClick={() => retry()}
            className="flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 text-sm font-bold text-white hover:brightness-110"
          >
            Reintentar
          </button>
          <Link href="/" className="mt-1 text-xs text-slate-400 underline underline-offset-2">
            Volver al inicio
          </Link>
        </div>
      </div>
    </main>
  );
}
