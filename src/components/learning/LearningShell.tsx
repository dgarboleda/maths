"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { ArrowLeft, BookOpen, Compass, Home, PenLine } from "lucide-react";

export const primaryButton =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-cyan-300 px-5 py-3 text-sm font-bold text-slate-950 transition-colors hover:bg-cyan-200 disabled:cursor-wait disabled:opacity-50";
export const secondaryButton =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-600 bg-slate-900 px-4 py-2 text-sm font-semibold text-slate-100 hover:bg-slate-800 disabled:cursor-wait disabled:opacity-50";

export function LearningShell({
  childId,
  title,
  eyebrow,
  children,
}: {
  childId: string;
  title: string;
  eyebrow?: string;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const base = `/jugar/${childId}`;
  const items = [
    { href: base, text: "Inicio", icon: Home },
    { href: `${base}/aprende`, text: "Aprender", icon: BookOpen },
    { href: `${base}/practicar`, text: "Practicar", icon: PenLine },
    { href: `${base}/aventura`, text: "Aventura", icon: Compass },
  ];
  return (
    <main
      id="contenido"
      tabIndex={-1}
      className="min-h-screen bg-slate-950 px-4 pb-16 text-slate-100 sm:px-8"
    >
      <div className="mx-auto max-w-6xl">
        <header className="border-b border-slate-800 py-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link
              href={base}
              className="font-display text-lg font-bold tracking-wide text-white"
            >
              MATHS <span className="text-cyan-300">/</span> Tu próxima idea
            </Link>
            <Link
              href="/perfiles"
              className="inline-flex min-h-11 items-center gap-1 text-sm text-slate-300 underline underline-offset-4"
            >
              <ArrowLeft size={16} aria-hidden="true" />
              Perfiles
            </Link>
          </div>
          <nav aria-label="Tu espacio" className="mt-4 flex flex-wrap gap-2">
            {items.map(({ href, text, icon: Icon }) => {
              const active =
                href === base ? pathname === base : pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={`inline-flex min-h-11 items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold ${active ? "bg-cyan-300 text-slate-950" : "bg-slate-900 text-slate-300 hover:bg-slate-800"}`}
                >
                  <Icon size={16} aria-hidden="true" />
                  {text}
                </Link>
              );
            })}
          </nav>
        </header>
        <div className="py-7 sm:py-10">
          {eyebrow && (
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-cyan-300">
              {eyebrow}
            </p>
          )}
          <h1 className="font-display text-3xl font-bold leading-tight text-white sm:text-4xl">
            {title}
          </h1>
          <div className="mt-6">{children}</div>
        </div>
      </div>
    </main>
  );
}

export function LearningLoading() {
  return (
    <main
      id="contenido"
      tabIndex={-1}
      className="grid min-h-screen place-items-center bg-slate-950 p-6 text-slate-200"
    >
      <p role="status">Preparando tu espacio…</p>
    </main>
  );
}
export function LearningLoadError({ message }: { message: string }) {
  return (
    <main
      id="contenido"
      tabIndex={-1}
      className="grid min-h-screen place-items-center bg-slate-950 p-6 text-slate-100"
    >
      <div className="max-w-lg space-y-4">
        <p role="alert">{message}</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className={primaryButton}
        >
          Volver a cargar
        </button>
        <Link href="/perfiles" className="ml-4 underline">
          Volver a perfiles
        </Link>
      </div>
    </main>
  );
}
export function SaveNotice({
  busy,
  error,
  retry,
}: {
  busy: boolean;
  error: string | null;
  retry: () => Promise<boolean>;
}) {
  return (
    <div className="mb-4" aria-live="polite" aria-atomic="true">
      {busy && (
        <p role="status" className="text-sm text-cyan-200">
          Guardando tu avance…
        </p>
      )}
      {error && (
        <div
          role="alert"
          className="space-y-3 rounded-xl border border-amber-400/50 bg-amber-950/40 p-4"
        >
          <p className="text-sm text-amber-100">{error}</p>
          <div className="flex flex-wrap gap-2">
            <button
              disabled={busy}
              type="button"
              onClick={() => void retry()}
              className={secondaryButton}
            >
              Reintentar guardado
            </button>
            <button
              disabled={busy}
              type="button"
              onClick={() => window.location.reload()}
              className={secondaryButton}
            >
              Cargar el último avance
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
