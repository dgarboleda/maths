"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { collection, doc, getDoc, getDocs } from "firebase/firestore";
import { useAuth } from "@/lib/AuthProvider";
import { db } from "@/lib/firebase";
import type { ChildProfile, SkillProgress } from "@/lib/types";
import { getStrand } from "@/lib/strands";
import { getTopicLabel } from "@/lib/topics";
import { frontierDifficulty, masteredCount } from "@/lib/mastery";
import { suggestedDifficulty } from "@/lib/problem";
import { GameShell } from "@/components/GameShell";
import { playSound } from "@/lib/gameSound";
import { useTotalStars } from "@/lib/useTotalStars";
import { useSoundPreference } from "@/lib/useSoundPreference";

export default function StrandTopicListPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const params = useParams<{ childId: string; strand: string }>();
  const strand = getStrand(params.strand);

  const [child, setChild] = useState<ChildProfile | null>(null);
  const [progressBySkill, setProgressBySkill] = useState<Record<string, SkillProgress>>({});
  const totalStars = useTotalStars(user?.uid, params.childId);
  const [soundOn, toggleSound] = useSoundPreference();

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const childSnap = await getDoc(doc(db, "parents", user.uid, "children", params.childId));
      if (cancelled || !childSnap.exists()) return;
      setChild(childSnap.data() as ChildProfile);

      const progressSnap = await getDocs(
        collection(db, "parents", user.uid, "children", params.childId, "skillsProgress"),
      );
      if (cancelled) return;
      const map: Record<string, SkillProgress> = {};
      progressSnap.forEach((d) => (map[d.id] = d.data() as SkillProgress));
      setProgressBySkill(map);
    })();
    return () => {
      cancelled = true;
    };
  }, [user, params.childId]);

  if (loading || !user) return null;

  if (!strand) {
    return (
      <main
        id="contenido"
        tabIndex={-1}
        className="mx-auto flex min-h-screen w-full max-w-md flex-col items-center justify-center gap-4 bg-white px-6 text-center"
      >
        <p className="text-neutral-500">Ese hilo todavía no existe.</p>
        <Link href={`/jugar/${params.childId}`} className="text-sm text-neutral-500 underline underline-offset-2">
          Volver
        </Link>
      </main>
    );
  }

  if (!child) {
    return (
      <main id="contenido"
        tabIndex={-1} className="flex min-h-screen w-full items-center justify-center bg-white">
        <p role="status" className="text-neutral-700">
          Cargando…
        </p>
      </main>
    );
  }

  const floor = suggestedDifficulty(child.birthDate);
  const frontier = frontierDifficulty(progressBySkill, strand.slug, floor);
  const dominados = masteredCount(progressBySkill, strand.slug);

  return (
    <GameShell
      icon={strand.emoji}
      title={strand.label}
      subtitle={
        <Link href={`/jugar/${params.childId}`} className="underline">
          ← {child.name}
        </Link>
      }
      stars={totalStars}
      soundOn={soundOn}
      onToggleSound={toggleSound}
    >
      <div className="space-y-4">
        <p className="text-center text-sm font-bold text-purple-700">{dominados}/10 temas dominados</p>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {Array.from({ length: 10 }, (_, i) => i + 1).map((difficulty) => {
            const topic = getTopicLabel(strand.slug, difficulty);
            const mastered = Boolean(progressBySkill[`${strand.slug}-d${difficulty}`]?.masteredAt);
            const recommended = difficulty === frontier && !mastered;
            const href =
              strand.slug === "aritmetica" && difficulty === 5
                ? `/jugar/${params.childId}/aritmetica/multiplicacion`
                : `/jugar/${params.childId}/${strand.slug}/${difficulty}`;

            return (
              <Link
                key={difficulty}
                href={href}
                onClick={() => playSound("click", soundOn)}
                className={`flex items-center justify-between gap-3 rounded-2xl border-2 bg-white px-4 py-3 shadow-sm transition-all hover:scale-[1.02] ${
                  mastered ? "border-emerald-300" : recommended ? "border-purple-400 bg-purple-50" : "border-purple-100"
                }`}
              >
                <span className="flex items-center gap-3">
                  <span aria-hidden="true" className="text-2xl">
                  {topic.emoji}
                </span>
                  <span className="font-bold text-purple-900">{topic.title}</span>
                </span>
                {mastered ? (
                  <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-bold text-emerald-800">
                    <span aria-hidden="true">✓ </span>Dominado
                  </span>
                ) : recommended ? (
                  <span className="rounded-full bg-purple-100 px-2 py-1 text-xs font-bold text-purple-700">Recomendado</span>
                ) : null}
              </Link>
            );
          })}
        </div>

        {strand.slug === "logica" && (
          <Link
            href={`/jugar/${params.childId}/piramide`}
            onClick={() => playSound("click", soundOn)}
            className="flex items-center justify-between gap-3 rounded-2xl border-2 border-orange-300 bg-gradient-to-r from-red-500 to-orange-500 px-4 py-3 text-white shadow-sm transition-all hover:scale-[1.02]"
          >
            <span className="flex items-center gap-3">
              <span aria-hidden="true" className="text-2xl">
                🔺
              </span>
              <span className="font-bold">Pirámide numérica</span>
            </span>
            <span className="rounded-full bg-white/20 px-2 py-1 text-xs font-bold">Especial</span>
          </Link>
        )}
      </div>
    </GameShell>
  );
}
