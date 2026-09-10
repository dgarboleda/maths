"use client";

import { useEffect, useState } from "react";
import { useFamily } from "@/components/family/FamilyProvider";
import { getFirebase } from "@/lib/firebase";
import { getModule } from "@/lib/curriculum";
import { challengeStats, type ChallengeStatsRow } from "@/lib/level/analytics";
import { useLevelEditor } from "./LevelEditorProvider";

/**
 * "Cómo les va" — Fase 26 (docs/plan-salto-producto.md §4.2). Cierra el
 * bucle diseñar → observar → ajustar: por cada desafío del nivel, cuántos
 * intentos hizo cada hijo, qué % acertó, cuándo fue el último y cuántas
 * pistas usó en promedio. Vive detrás de un `<details>` en `ScenePanel.tsx`
 * que solo monta este componente la primera vez que se abre — "bajo
 * demanda" (§4.4), no al montar el editor (que ya es la pantalla más
 * pesada de la app).
 */
export function StatsPanel() {
  const { parentId, children } = useFamily();
  const { state } = useLevelEditor();
  const [stats, setStats] = useState<ChallengeStatsRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const challengeIds = state.level.challenges.map((c) => c.id).join(",");
  const childIds = children.map((c) => c.id).join(",");

  useEffect(() => {
    if (!parentId || children.length === 0 || state.level.challenges.length === 0) return;
    let cancelled = false;
    getFirebase()
      .then(({ db, firestore }) =>
        challengeStats(
          firestore,
          db,
          parentId,
          children.map((c) => c.id),
          state.level.challenges,
        ),
      )
      .then((rows) => {
        if (!cancelled) setStats(rows);
      })
      .catch((err) => {
        console.error("No se pudo cargar 'Cómo les va'", err);
        if (!cancelled) setError("No se pudieron cargar las estadísticas.");
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parentId, childIds, challengeIds]);

  if (state.level.challenges.length === 0) {
    return <p className="text-[11px] text-slate-500">Este nivel todavía no tiene ningún desafío.</p>;
  }
  if (children.length === 0) {
    return <p className="text-[11px] text-slate-500">Todavía no hay ningún hijo para mostrar progreso.</p>;
  }
  if (error) {
    return (
      <p role="alert" className="text-[11px] text-rose-300">
        {error}
      </p>
    );
  }
  if (!stats) {
    return (
      <p role="status" className="text-[11px] text-slate-500">
        Cargando…
      </p>
    );
  }

  const childById = new Map(children.map((c) => [c.id, c]));

  return (
    <div className="space-y-2.5">
      {state.level.challenges.map((challenge) => {
        const mod = getModule(challenge.moduleId);
        const rows = stats.filter((r) => r.challengeId === challenge.id);
        return (
          <div key={challenge.id} className="rounded-lg border border-indigo-500/15 bg-slate-900/30 p-2">
            <p className="mb-1.5 truncate text-[11px] font-bold text-slate-100">
              {mod ? `${mod.emoji} ${mod.label}` : "Sin módulo asignado todavía"}
            </p>
            <ul className="space-y-1.5">
              {rows.map((row) => (
                <li key={row.childId} className="text-[10px] leading-snug text-slate-300">
                  <span className="font-bold text-slate-200">{childById.get(row.childId)?.name ?? row.childId}</span>
                  {row.attempts === 0 ? (
                    <span className="text-slate-500"> — sin intentos</span>
                  ) : (
                    <span className="text-slate-400">
                      {" — "}
                      {row.attempts} intento{row.attempts === 1 ? "" : "s"} · {Math.round((row.accuracy ?? 0) * 100)}% acierto
                      {row.avgHintsUsed !== null && ` · ${row.avgHintsUsed.toFixed(1)} pistas prom.`}
                      {row.lastAttemptAt && ` · últ. ${new Date(row.lastAttemptAt).toLocaleDateString("es", { day: "numeric", month: "short" })}`}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
