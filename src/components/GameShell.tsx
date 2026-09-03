"use client";

import { useRef, type KeyboardEvent, type ReactNode } from "react";

export function GameShell({
  icon,
  title,
  subtitle,
  stars,
  streak,
  soundOn,
  onToggleSound,
  nav,
  children,
}: {
  icon: string;
  title: string;
  subtitle?: ReactNode;
  stars: number | null;
  streak?: number;
  soundOn: boolean;
  onToggleSound: () => void;
  nav?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div
      className="min-h-screen bg-slate-950"
      style={{
        backgroundImage:
          "radial-gradient(#818cf833 1.5px, transparent 1.5px), radial-gradient(#e879f933 1.5px, transparent 1.5px)",
        backgroundSize: "60px 60px",
        backgroundPosition: "0 0, 30px 30px",
      }}
    >
      <header className="sticky top-0 z-40 border-b-2 border-indigo-500/30 bg-slate-900/90 px-4 py-3 shadow-lg backdrop-blur-md">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              aria-hidden="true"
              className="flex h-11 w-11 rotate-3 items-center justify-center rounded-2xl bg-gradient-to-tr from-violet-600 to-fuchsia-600 text-xl text-white shadow-[0_0_16px_rgba(168,85,247,0.55)]"
            >
              {icon}
            </div>
            <div>
              <h1 className="bg-gradient-to-r from-violet-300 to-fuchsia-300 bg-clip-text font-display text-xl font-bold text-transparent">
                {title}
              </h1>
              {subtitle && <div className="text-xs font-semibold text-indigo-300">{subtitle}</div>}
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-2xl border-2 border-indigo-500/40 bg-slate-800/80 px-4 py-1.5">
            <span aria-hidden="true" className="text-xl">
              ⭐
            </span>
            <span className="text-lg font-bold text-amber-300">
              <span className="sr-only">Estrellas: </span>
              {stars ?? "…"}
            </span>
            {!!streak && streak > 0 && (
              <>
                <div aria-hidden="true" className="h-5 w-0.5 bg-indigo-500/40" />
                <span aria-hidden="true" className="text-xl">
                  🔥
                </span>
                <span className="text-lg font-bold text-orange-300">
                  <span className="sr-only">Racha: </span>
                  {streak}
                </span>
              </>
            )}
          </div>

          <button
            type="button"
            onClick={onToggleSound}
            aria-pressed={soundOn}
            aria-label="Efectos de sonido"
            className="rounded-xl bg-slate-800 p-2.5 text-indigo-200 transition-colors hover:bg-slate-700"
            title="Efectos de sonido"
          >
            <span aria-hidden="true">{soundOn ? "🔊" : "🔇"}</span>
          </button>
        </div>
      </header>

      {nav}

      <main id="contenido" tabIndex={-1} className="mx-auto my-6 w-full max-w-4xl px-4">
        {children}
      </main>
    </div>
  );
}

/**
 * Pestañas con el patrón ARIA completo: `tablist`/`tab`, `aria-selected`,
 * tabulador único (roving tabindex) y navegación con flechas / Inicio / Fin.
 * Cada pestaña apunta con `aria-controls` al panel que la página renderiza
 * con `id={panelId(...)}`.
 */
export function tabId(id: string): string {
  return `tab-${id}`;
}

export function tabPanelId(id: string): string {
  return `panel-${id}`;
}

export function TabNav<T extends string>({
  tabs,
  active,
  onSelect,
  label = "Secciones del tema",
}: {
  tabs: Array<{ id: T; label: string }>;
  active: T;
  onSelect: (id: T) => void;
  label?: string;
}) {
  const listRef = useRef<HTMLDivElement>(null);

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const current = tabs.findIndex((tab) => tab.id === active);
    let nextIndex: number | null = null;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") nextIndex = (current + 1) % tabs.length;
    else if (event.key === "ArrowLeft" || event.key === "ArrowUp")
      nextIndex = (current - 1 + tabs.length) % tabs.length;
    else if (event.key === "Home") nextIndex = 0;
    else if (event.key === "End") nextIndex = tabs.length - 1;
    if (nextIndex === null) return;

    event.preventDefault();
    onSelect(tabs[nextIndex].id);
    const buttons = listRef.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]');
    buttons?.[nextIndex]?.focus();
  }

  return (
    <nav className="mx-auto mt-6 w-full max-w-3xl px-4">
      <div
        ref={listRef}
        role="tablist"
        aria-label={label}
        onKeyDown={handleKeyDown}
        className="grid grid-cols-2 gap-2 rounded-2xl border-2 border-indigo-500/30 bg-slate-900/80 p-1.5 shadow-inner sm:grid-cols-4"
      >
        {tabs.map((tab) => {
          const selected = active === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              id={tabId(tab.id)}
              aria-selected={selected}
              aria-controls={tabPanelId(tab.id)}
              tabIndex={selected ? 0 : -1}
              onClick={() => onSelect(tab.id)}
              className={`rounded-xl px-3 py-2.5 text-center text-sm font-bold transition-all sm:text-base ${
                selected
                  ? "bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-md"
                  : "text-indigo-200 hover:bg-slate-800/60"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
