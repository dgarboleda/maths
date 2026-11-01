import Link from "next/link";
import type { ReactNode } from "react";
import { LEGAL_VERSION } from "@/lib/legal";

/** Marca visible de lo que falta completar o revisar antes de publicar. */
export function Pendiente({ children }: { children: ReactNode }) {
  return <mark className="rounded bg-amber-300/20 px-1 text-amber-200">[Completar: {children}]</mark>;
}

export function LegalPage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <main id="contenido" tabIndex={-1} className="min-h-screen bg-slate-950 px-4 py-10 text-slate-200">
      <article className="mx-auto max-w-2xl space-y-6 text-sm leading-relaxed [&_h2]:mt-8 [&_h2]:font-display [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-white [&_li]:ml-5 [&_li]:list-disc">
        <header className="space-y-2">
          <Link href="/login" className="text-xs font-bold text-cyan-300 underline-offset-4 hover:underline">← Volver</Link>
          <h1 className="font-display text-3xl font-bold text-white">{title}</h1>
          <p className="text-xs text-slate-400">Versión {LEGAL_VERSION}</p>
          <p role="note" className="rounded-xl border border-amber-400/30 bg-amber-400/10 px-3.5 py-2.5 text-amber-100">
            Borrador pendiente de revisión legal. Los campos marcados deben completarse antes de abrir el servicio al público.
          </p>
        </header>
        {children}
      </article>
    </main>
  );
}
