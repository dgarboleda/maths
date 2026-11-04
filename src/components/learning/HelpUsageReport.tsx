"use client";

import Link from "next/link";
import { useAuth } from "@/lib/AuthProvider";
import { getLesson } from "@/lib/learning/domain";
import { formulaByKey } from "@/lib/learning/formulas";
import { topCounts, useHelpUsageReport, type HelpUsage } from "@/lib/learning/helpUsage";
import { EmptyState, SectionCard } from "@/components/family/ui";

const title = (lessonId: string) => getLesson(lessonId)?.title ?? lessonId;

/** Resumen legible del uso del foco (separado para poder probarlo sin red). */
export function HelpUsageSummary({ usage, childName, childId }: { usage: HelpUsage; childName: string; childId: string }) {
  const opens = topCounts(usage.opens);
  const topics = topCounts(usage.topics);
  const favorites = usage.favorites.flatMap((key) => formulaByKey(key) ?? []);
  if (!opens.length && !topics.length && !favorites.length)
    return <EmptyState icon="💡" title="Todavía no consulta el foco" text={`Cuando ${childName} abra las fórmulas o busque un tema, lo verás aquí.`} />;
  return (
    <div className="grid gap-5 sm:grid-cols-3">
      <div>
        <h3 className="text-sm font-bold text-white">Fórmulas que más consulta</h3>
        {opens.length ? <ol className="mt-2 space-y-1 text-sm text-slate-300">
          {opens.map(([lessonId, count]) => <li key={lessonId}>{title(lessonId)} <span className="text-amber-200">· {count} {count === 1 ? "vez" : "veces"}</span></li>)}
        </ol> : <p className="mt-2 text-sm text-slate-400">Sin consultas.</p>}
      </div>
      <div>
        <h3 className="text-sm font-bold text-white">Temas que buscó para repasar</h3>
        {topics.length ? <ol className="mt-2 space-y-1 text-sm text-slate-300">
          {topics.map(([lessonId, count]) => <li key={lessonId}>{title(lessonId)} <span className="text-amber-200">· {count}</span></li>)}
        </ol> : <p className="mt-2 text-sm text-slate-400">Sin búsquedas.</p>}
      </div>
      <div>
        <h3 className="text-sm font-bold text-white">Su formulario guardado</h3>
        {favorites.length ? <ul className="mt-2 space-y-1 text-sm text-slate-300">
          {favorites.slice(0, 8).map(({ lessonId, formula }) => <li key={formula.key}>{formula.name} <span className="text-slate-400">· {title(lessonId)}</span></li>)}
          {favorites.length > 8 && <li className="text-slate-400">y {favorites.length - 8} más</li>}
        </ul> : <p className="mt-2 text-sm text-slate-400">Aún no guardó fórmulas.</p>}
      </div>
      <p className="text-xs leading-relaxed text-slate-400 sm:col-span-3">
        Consultar a menudo las mismas fórmulas puede indicar que esa idea todavía no está firme: es un buen tema para repasar juntos.{" "}
        <Link href={`/jugar/${childId}/formulario`} className="text-cyan-200 underline">Ver el formulario imprimible</Link>
      </p>
    </div>
  );
}

export function HelpUsageReport({ childId, childName }: { childId: string; childName: string }) {
  const { parentId } = useAuth();
  const { usage, error } = useHelpUsageReport(parentId ?? undefined, childId);
  return (
    <SectionCard title="Uso del foco de ayuda">
      {error ? <p role="alert" className="text-amber-200">{error}</p>
        : usage ? <HelpUsageSummary usage={usage} childName={childName} childId={childId} />
          : <p role="status" className="text-sm text-slate-400">Cargando…</p>}
    </SectionCard>
  );
}
