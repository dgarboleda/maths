"use client";

import { useEffect, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { ChartLine, Gift, LayoutDashboard, LogOut, Settings, Sparkles, Users } from "lucide-react";
import { useAuth } from "@/lib/AuthProvider";
import { getFirebase } from "@/lib/firebase";
import { FamilyProvider } from "./FamilyProvider";

const NAV = [
  { href: "/panel", label: "Resumen", icon: LayoutDashboard, exact: true },
  { href: "/panel/hijos", label: "Hijos", icon: Users, exact: false },
  { href: "/panel/progreso", label: "Progreso", icon: ChartLine, exact: false },
  { href: "/panel/recompensas", label: "Recompensas", icon: Gift, exact: false },
  { href: "/panel/ajustes", label: "Ajustes", icon: Settings, exact: false },
] as const;

/**
 * Shell de navegación del panel familiar: sidebar en desktop, pestañas
 * inferiores en móvil — puerto de `familia.tsx` del prototipo, con
 * `usePathname()` de Next en vez de `activeProps` de TanStack Router.
 * Monta `FamilyProvider` una sola vez para toda la sección `/panel/*`.
 */
export function PanelShell({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [user, loading, router]);

  function isActive(item: (typeof NAV)[number]): boolean {
    return item.exact ? pathname === item.href : pathname.startsWith(item.href);
  }

  if (loading || !user) {
    return (
      <main id="contenido" tabIndex={-1} className="flex min-h-screen w-full items-center justify-center bg-slate-950">
        <p role="status" className="text-indigo-200">
          Cargando…
        </p>
      </main>
    );
  }

  return (
    <FamilyProvider>
      <div className="min-h-dvh bg-slate-950 lg:flex">
        <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-indigo-500/20 bg-slate-900/40 p-4 lg:flex">
          <Link href="/panel" className="mb-6 flex items-center gap-2.5 px-1.5">
            <span className="grid size-9 place-items-center rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white">
              <Sparkles className="size-4.5" aria-hidden="true" />
            </span>
            <span>
              <span className="block font-display text-sm font-bold leading-none tracking-wide text-white">
                MATH QUEST
              </span>
              <span className="mt-1 block text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                Panel familiar
              </span>
            </span>
          </Link>

          <nav aria-label="Secciones del panel familiar" className="flex-1">
            <ul className="space-y-1">
              {NAV.map((item) => {
                const active = isActive(item);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={`flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-bold transition-colors ${
                        active
                          ? "bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white"
                          : "text-slate-400 hover:bg-slate-800/60 hover:text-white"
                      }`}
                    >
                      <item.icon className="size-4.5" aria-hidden="true" />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="border-t border-indigo-500/20 pt-3">
            {user && <p className="truncate px-3 text-xs text-slate-400">{user.email}</p>}
            <button
              type="button"
              onClick={() => getFirebase().then(({ auth }) => signOut(auth)).catch(console.error)}
              className="mt-2 flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-sm font-bold text-slate-400 transition-colors hover:bg-slate-800/60 hover:text-white"
            >
              <LogOut className="size-4.5" aria-hidden="true" />
              Cerrar sesión
            </button>
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <header className="sticky top-0 z-20 flex items-center justify-between border-b border-indigo-500/20 bg-slate-950/85 px-4 py-2.5 backdrop-blur-md lg:hidden">
            <Link href="/panel" className="flex items-center gap-2">
              <span className="grid size-8 place-items-center rounded-lg bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white">
                <Sparkles className="size-4" aria-hidden="true" />
              </span>
              <span className="font-display text-sm font-bold tracking-wide text-white">
                MATH QUEST · Familia
              </span>
            </Link>
            <button
              type="button"
              onClick={() => getFirebase().then(({ auth }) => signOut(auth)).catch(console.error)}
              aria-label="Cerrar sesión"
              className="grid min-h-11 min-w-11 place-items-center rounded-full text-slate-400 transition-colors hover:bg-slate-800/60 hover:text-white"
            >
              <LogOut className="size-5" aria-hidden="true" />
            </button>
          </header>

          <main id="contenido" tabIndex={-1} className="mx-auto w-full max-w-5xl px-4 pb-28 pt-5 sm:px-6 lg:px-8 lg:pb-12 lg:pt-8">
            {children}
          </main>
        </div>

        <nav
          aria-label="Secciones del panel familiar"
          className="fixed inset-x-0 bottom-0 z-20 border-t border-indigo-500/20 bg-slate-950/92 backdrop-blur-md lg:hidden"
        >
          <ul className="flex">
            {NAV.map((item) => {
              const active = isActive(item);
              return (
                <li key={item.href} className="min-w-0 flex-1">
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={`flex min-h-14 flex-col items-center justify-center gap-0.5 text-[10px] font-bold ${
                      active ? "text-cyan-300" : "text-slate-400"
                    }`}
                  >
                    <item.icon className="size-5" aria-hidden="true" />
                    <span className="truncate">{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </FamilyProvider>
  );
}
