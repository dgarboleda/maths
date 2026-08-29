"use client";

import type { ReactNode } from "react";
import { Fredoka, Quicksand } from "next/font/google";

export const fredoka = Fredoka({ subsets: ["latin"], weight: ["500", "600", "700"] });
export const quicksand = Quicksand({ subsets: ["latin"], weight: ["500", "600", "700"] });

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
      className={`${quicksand.className} min-h-screen bg-gray-100`}
      style={{
        backgroundImage:
          "radial-gradient(#8b5cf622 1.5px, transparent 1.5px), radial-gradient(#ec489922 1.5px, transparent 1.5px)",
        backgroundSize: "60px 60px",
        backgroundPosition: "0 0, 30px 30px",
      }}
    >
      <header className="sticky top-0 z-40 border-b-4 border-purple-200 bg-white/90 px-4 py-3 shadow-md backdrop-blur-md">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 rotate-3 items-center justify-center rounded-2xl bg-gradient-to-tr from-purple-600 to-pink-500 text-xl text-white shadow-lg">
              {icon}
            </div>
            <div>
              <h1
                className={`${fredoka.className} bg-gradient-to-r from-purple-600 to-pink-500 bg-clip-text text-xl font-bold text-transparent`}
              >
                {title}
              </h1>
              {subtitle && <div className="text-xs font-semibold text-purple-600">{subtitle}</div>}
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-2xl border-2 border-purple-200 bg-purple-50 px-4 py-1.5">
            <span className="text-xl">⭐</span>
            <span className="text-lg font-bold text-amber-500">{stars ?? "…"}</span>
            {!!streak && streak > 0 && (
              <>
                <div className="h-5 w-0.5 bg-purple-200" />
                <span className="text-xl">🔥</span>
                <span className="text-lg font-bold text-orange-500">{streak}</span>
              </>
            )}
          </div>

          <button
            onClick={onToggleSound}
            className="rounded-xl bg-purple-100 p-2.5 text-purple-700 transition-colors hover:bg-purple-200"
            title="Efectos de sonido"
          >
            {soundOn ? "🔊" : "🔇"}
          </button>
        </div>
      </header>

      {nav}

      <main className="mx-auto my-6 w-full max-w-4xl px-4">{children}</main>
    </div>
  );
}

export function TabNav<T extends string>({
  tabs,
  active,
  onSelect,
}: {
  tabs: Array<{ id: T; label: string }>;
  active: T;
  onSelect: (id: T) => void;
}) {
  return (
    <nav className="mx-auto mt-6 w-full max-w-3xl px-4">
      <div className="grid grid-cols-2 gap-2 rounded-2xl border-2 border-purple-200 bg-purple-100/80 p-1.5 shadow-inner sm:grid-cols-4">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onSelect(tab.id)}
            className={`rounded-xl px-3 py-2.5 text-center text-sm font-bold transition-all sm:text-base ${
              active === tab.id ? "bg-purple-600 text-white shadow-md" : "text-purple-700 hover:bg-purple-200/60"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </nav>
  );
}
