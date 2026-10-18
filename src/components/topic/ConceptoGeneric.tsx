"use client";

import { getModule } from "@/lib/curriculum";
import Link from "next/link";
import { useParams } from "next/navigation";
import { lessonForModule } from "@/lib/learning/domain";

export function ConceptoGeneric({ moduleId }: { moduleId: string }) {
  const childId = useParams<{ childId: string }>()?.childId;
  const mod = getModule(moduleId);
  if (!mod) return null;
  const Concept = mod.ConceptComponent;
  const lesson = lessonForModule(moduleId);
  return (
    <>
      {lesson && childId && (
        <div className="mx-auto mb-6 max-w-xl rounded-2xl border border-cyan-400/30 bg-slate-900 p-5 text-slate-100">
          <h2 className="font-bold">Recibe la clase completa</h2>
          <p className="mt-2 text-sm text-slate-300">{lesson.objective}</p>
          <Link
            className="mt-3 inline-flex min-h-11 items-center font-bold text-cyan-200 underline"
            href={`/jugar/${childId}/aprende/${lesson.id}`}
          >
            Explicación, ejemplos guiados y práctica →
          </Link>
        </div>
      )}
      <Concept />
    </>
  );
}
