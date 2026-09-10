"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Sparkles, Wand2 } from "lucide-react";
import { getFirebase } from "@/lib/firebase";
import { seedExampleWorld } from "@/lib/level/seedExampleWorld";

/**
 * Pantalla de "no hay ninguna aventura todavía" — Fase 18
 * (docs/level-editor-plan-v2.md §5.1). Respuesta directa al pedido de
 * eliminar cualquier nivel/misión por defecto: si el padre no creó ningún
 * nivel, `/jugar/[childId]` nunca cae en un contenido mágico — muestra esto
 * y pide crear el primero, en vez de un fallback silencioso.
 *
 * Nota de UX (documentada, no silenciosa): hoy la sesión autenticada de
 * `/jugar/{childId}` es siempre la del padre (`firestore.rules` lo señala
 * como pendiente) — por eso tiene sentido ofrecer acá mismo "crear un
 * nivel"/"cargar el ejemplo". Cuando exista sesión propia del niño, estos
 * botones deben condicionarse a quién está autenticado.
 */
export function NoLevelsYet({ childId, childName, parentId }: { childId: string; childName: string; parentId: string }) {
  const router = useRouter();
  const [seeding, setSeeding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSeedExample() {
    setSeeding(true);
    setError(null);
    try {
      const { db, firestore } = await getFirebase();
      const { level } = await seedExampleWorld(firestore, db, parentId, parentId);
      router.replace(`/jugar/${childId}/nivel/${level.id}`);
    } catch (err) {
      console.error("No se pudo cargar el mundo de ejemplo", err);
      setError("No se pudo cargar el mundo de ejemplo.");
      setSeeding(false);
    }
  }

  return (
    <main id="contenido" tabIndex={-1} className="flex min-h-screen w-full items-center justify-center bg-slate-950 px-6">
      <div className="w-full max-w-md space-y-4 rounded-2xl border border-indigo-500/20 bg-slate-900/60 p-6 text-center">
        <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-indigo-500/15 text-indigo-300">
          <Wand2 className="size-6" aria-hidden="true" />
        </div>
        <h1 className="font-display text-xl font-bold text-white">Todavía no hay ninguna aventura</h1>
        <p className="text-sm text-slate-400">Este mundo está vacío. Creá el primer nivel para que {childName} pueda jugar.</p>

        {error && (
          <p role="alert" className="rounded-lg border border-rose-500/30 bg-rose-950/30 px-3 py-2 text-xs text-rose-200">
            {error}
          </p>
        )}

        <div className="flex flex-col gap-2 pt-2">
          <Link
            href="/panel/editor?crear=1"
            className="flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 text-sm font-bold text-white hover:brightness-110"
          >
            Crear el primer nivel
          </Link>
          <button
            type="button"
            onClick={() => void handleSeedExample()}
            disabled={seeding}
            className="flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-indigo-500/25 bg-slate-800/60 px-4 text-sm font-bold text-slate-100 hover:bg-slate-800 disabled:opacity-40"
          >
            <Sparkles className="size-4" aria-hidden="true" />
            {seeding ? "Cargando…" : "Cargar el mundo de ejemplo"}
          </button>
          <Link href="/perfiles" className="mt-1 text-xs text-slate-400 underline underline-offset-2">
            Volver a perfiles
          </Link>
        </div>
      </div>
    </main>
  );
}
