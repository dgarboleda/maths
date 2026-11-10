import Link from "next/link";
import { getLessonSummary } from "@/lib/learning/core";
import { secondaryButton } from "./LearningShell";

/** Acceso directo a las clases pendientes desde cualquier aventura. */
export function AdventureRequirements({ childId, missing, previouslyCompleted }: {
  childId: string;
  missing: string[];
  previouslyCompleted: boolean;
}) {
  return (
    <section aria-labelledby="adventure-requirements" className="space-y-4 rounded-2xl border border-amber-300/40 bg-slate-900 p-5">
      <h2 id="adventure-requirements" className="text-xl font-bold text-amber-100">Completa estas clases para jugar</h2>
      <p className="text-slate-200">En cada clase termina la explicación, los ejemplos y la aplicación. Puedes aprender con ayuda.</p>
      {previouslyCompleted && <p className="text-sm text-slate-300">Tu aventura completada y tus estrellas siguen guardadas.</p>}
      <ul className="flex flex-wrap gap-3">
        {missing.map((id) => <li key={id}>
          <Link href={`/jugar/${childId}/aprende/${id}`} className={secondaryButton}>
            {getLessonSummary(id)?.title ?? id}
          </Link>
        </li>)}
      </ul>
    </section>
  );
}
