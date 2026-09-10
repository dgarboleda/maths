import Link from "next/link";

/**
 * 404 de toda la app — Fase 23 (docs/plan-salto-producto.md §1.2). Server
 * Component simple (no hay estado ni efectos que justifiquen "use client"),
 * a diferencia de los `error.tsx` de al lado.
 */
export default function NotFound() {
  return (
    <main id="contenido" tabIndex={-1} className="flex min-h-screen w-full items-center justify-center bg-slate-950 px-6">
      <div className="w-full max-w-md space-y-4 rounded-2xl border border-indigo-500/20 bg-slate-900/60 p-6 text-center">
        <h1 className="font-display text-xl font-bold text-white">Esta página no existe</h1>
        <p className="text-sm text-slate-400">Revisá el enlace, o volvé al inicio.</p>
        <Link
          href="/"
          className="flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 text-sm font-bold text-white hover:brightness-110"
        >
          Volver al inicio
        </Link>
      </div>
    </main>
  );
}
