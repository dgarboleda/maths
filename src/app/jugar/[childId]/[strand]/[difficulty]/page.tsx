"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { addDoc, collection, doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { useAuth } from "@/lib/AuthProvider";
import { db } from "@/lib/firebase";
import type { ChildProfile, SkillProgress } from "@/lib/types";
import { recordAttempt, todayKey } from "@/lib/mastery";
import { starsForAnswer } from "@/lib/economy";
import { getStrand } from "@/lib/strands";
import { getTopicLabel } from "@/lib/topics";
import { GameShell, TabNav, tabId, tabPanelId } from "@/components/GameShell";
import { useTotalStars } from "@/lib/useTotalStars";
import { useSoundPreference } from "@/lib/useSoundPreference";
import { ConceptoGeneric } from "@/components/topic/ConceptoGeneric";
import { PracticeRoundGeneric } from "@/components/topic/PracticeRoundGeneric";
import { CoheteGeneric } from "@/components/topic/CoheteGeneric";
import { EjemplosTab } from "@/components/topic/EjemplosTab";

type TabId = "concepto" | "practica" | "cohete" | "ejemplos";

const TABS: Array<{ id: TabId; label: string }> = [
  { id: "concepto", label: "🎨 Concepto" },
  { id: "practica", label: "📝 Práctica" },
  { id: "cohete", label: "🚀 Cohete" },
  { id: "ejemplos", label: "📚 Ejemplos" },
];

/** Props ARIA del panel de la pestaña activa (ver TabNav en GameShell). */
function panelProps(id: TabId) {
  return {
    id: tabPanelId(id),
    role: "tabpanel" as const,
    "aria-labelledby": tabId(id),
    tabIndex: 0,
  };
}

export default function TopicPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const params = useParams<{ childId: string; strand: string; difficulty: string }>();
  const strand = getStrand(params.strand);
  const difficulty = Number(params.difficulty);

  const [child, setChild] = useState<ChildProfile | null>(null);
  const [progress, setProgress] = useState<SkillProgress | undefined>(undefined);
  const totalStars = useTotalStars(user?.uid, params.childId);
  const [streak, setStreak] = useState(0);
  const [repeatsToday, setRepeatsToday] = useState(0);
  const [soundOn, toggleSound] = useSoundPreference();
  const [activeTab, setActiveTab] = useState<TabId>("concepto");

  const skillKey = strand ? `${strand.slug}-d${difficulty}` : "";

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [user, loading, router]);

  useEffect(() => {
    if (!user || !strand) return;
    let cancelled = false;
    (async () => {
      const childSnap = await getDoc(doc(db, "parents", user.uid, "children", params.childId));
      if (cancelled || !childSnap.exists()) return;
      setChild(childSnap.data() as ChildProfile);

      const progressSnap = await getDoc(
        doc(db, "parents", user.uid, "children", params.childId, "skillsProgress", skillKey),
      );
      if (cancelled) return;
      setProgress(progressSnap.exists() ? (progressSnap.data() as SkillProgress) : undefined);
    })();
    return () => {
      cancelled = true;
    };
  }, [user, params.childId, strand, skillKey]);

  async function submitAnswer(correct: boolean): Promise<number> {
    if (!user || !strand) return 0;

    await addDoc(collection(db, "parents", user.uid, "children", params.childId, "attempts"), {
      skillId: `${strand.slug}-topico-d${difficulty}`,
      itemId: crypto.randomUUID(),
      correct,
      createdAt: serverTimestamp(),
    });

    const updated = recordAttempt(progress, correct, todayKey());
    await setDoc(
      doc(db, "parents", user.uid, "children", params.childId, "skillsProgress", skillKey),
      updated,
    );
    setProgress(updated);

    if (!correct) {
      setStreak(0);
      return 0;
    }

    const stars = starsForAnswer({ difficulty, streak, repeatsToday });
    await addDoc(collection(db, "parents", user.uid, "children", params.childId, "starLedger"), {
      delta: stars,
      reason: "problem_solved",
      attemptId: null,
      createdAt: serverTimestamp(),
    });
    setStreak((s) => s + 1);
    setRepeatsToday((n) => n + 1);
    return stars;
  }

  if (loading || !user) return null;

  if (!strand || Number.isNaN(difficulty) || difficulty < 1 || difficulty > 10) {
    return (
      <main
        id="contenido"
        tabIndex={-1}
        className="flex min-h-screen w-full flex-col items-center justify-center gap-4 bg-white text-center"
      >
        <p className="text-neutral-500">Ese tema todavía no existe.</p>
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

  const topic = getTopicLabel(strand.slug, difficulty);

  return (
    <GameShell
      icon={topic.emoji}
      title={topic.title}
      subtitle={
        <Link href={`/jugar/${params.childId}/${strand.slug}`} className="underline">
          ← {strand.label} de {child.name}
        </Link>
      }
      stars={totalStars}
      streak={streak}
      soundOn={soundOn}
      onToggleSound={toggleSound}
      nav={<TabNav tabs={TABS} active={activeTab} onSelect={setActiveTab} />}
    >
      {activeTab === "concepto" && (
        <div {...panelProps("concepto")} className="rounded-3xl border-4 border-purple-200 bg-white p-6 shadow-xl">
          <ConceptoGeneric strandSlug={strand.slug} difficulty={difficulty} />
        </div>
      )}
      {activeTab === "practica" && (
        <div {...panelProps("practica")} className="rounded-3xl border-4 border-purple-200 bg-white p-6 shadow-xl">
          <PracticeRoundGeneric
            strandSlug={strand.slug}
            difficulty={difficulty}
            soundOn={soundOn}
            onAnswer={(correct) => void submitAnswer(correct)}
          />
        </div>
      )}
      {activeTab === "cohete" && (
        <div {...panelProps("cohete")}>
          <CoheteGeneric strandSlug={strand.slug} difficulty={difficulty} soundOn={soundOn} onAnswer={submitAnswer} />
        </div>
      )}
      {activeTab === "ejemplos" && (
        <div {...panelProps("ejemplos")} className="rounded-3xl border-4 border-purple-200 bg-white p-6 shadow-xl">
          <EjemplosTab strandSlug={strand.slug} difficulty={difficulty} soundOn={soundOn} />
        </div>
      )}
    </GameShell>
  );
}
