"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { useAuth } from "@/lib/AuthProvider";
import { db } from "@/lib/firebase";
import type { ChildProfile, SkillProgress } from "@/lib/types";
import { recordAttempt, todayKey } from "@/lib/mastery";
import { starsForAnswer } from "@/lib/economy";
import { playSound } from "@/lib/gameSound";
import { GameShell, TabNav } from "@/components/GameShell";
import { ConceptoTab } from "@/components/multiplicacion/ConceptoTab";
import { PracticaTab } from "@/components/multiplicacion/PracticaTab";
import { CoheteTab } from "@/components/multiplicacion/CoheteTab";
import { TablaTab } from "@/components/multiplicacion/TablaTab";

const SKILL_KEY = "aritmetica-d5";
const KIND = "multiplicacion";

type TabId = "concepto" | "practica" | "cohete" | "tabla";

const TABS: Array<{ id: TabId; label: string }> = [
  { id: "concepto", label: "🎨 Concepto" },
  { id: "practica", label: "📝 Práctica" },
  { id: "cohete", label: "🚀 Cohete" },
  { id: "tabla", label: "📊 Tabla 10×10" },
];

export default function MultiplicacionPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const params = useParams<{ childId: string }>();

  const [child, setChild] = useState<ChildProfile | null>(null);
  const [progress, setProgress] = useState<SkillProgress | undefined>(undefined);
  const [totalStars, setTotalStars] = useState<number | null>(null);
  const [streak, setStreak] = useState(0);
  const [repeatsToday, setRepeatsToday] = useState(0);
  const [soundOn, setSoundOn] = useState(true);
  const [activeTab, setActiveTab] = useState<TabId>("concepto");

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

      const progressSnap = await getDoc(
        doc(db, "parents", user.uid, "children", params.childId, "skillsProgress", SKILL_KEY),
      );
      if (cancelled) return;
      setProgress(progressSnap.exists() ? (progressSnap.data() as SkillProgress) : undefined);
    })();
    return () => {
      cancelled = true;
    };
  }, [user, params.childId]);

  useEffect(() => {
    if (!user) return;
    return onSnapshot(
      collection(db, "parents", user.uid, "children", params.childId, "starLedger"),
      (snap) => {
        let total = 0;
        snap.forEach((d) => (total += (d.data().delta as number) ?? 0));
        setTotalStars(total);
      },
    );
  }, [user, params.childId]);

  async function submitAnswer(correct: boolean): Promise<number> {
    if (!user) return 0;

    await addDoc(collection(db, "parents", user.uid, "children", params.childId, "attempts"), {
      skillId: `aritmetica-${KIND}-d5`,
      itemId: crypto.randomUUID(),
      correct,
      createdAt: serverTimestamp(),
    });

    const updated = recordAttempt(progress, correct, todayKey());
    await setDoc(
      doc(db, "parents", user.uid, "children", params.childId, "skillsProgress", SKILL_KEY),
      updated,
    );
    setProgress(updated);

    if (!correct) {
      setStreak(0);
      return 0;
    }

    const stars = starsForAnswer({ difficulty: 5, streak, repeatsToday });
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

  if (!child) {
    return (
      <main className="flex min-h-screen w-full items-center justify-center bg-white">
        <p className="text-neutral-400">Cargando…</p>
      </main>
    );
  }

  return (
    <GameShell
      icon="✖️"
      title="Matemágico"
      subtitle={
        <Link href={`/jugar/${params.childId}`} className="underline">
          ← Volver con {child.name}
        </Link>
      }
      stars={totalStars}
      streak={streak}
      soundOn={soundOn}
      onToggleSound={() => {
        setSoundOn((v) => !v);
        playSound("click", true);
      }}
      nav={<TabNav tabs={TABS} active={activeTab} onSelect={setActiveTab} />}
    >
      {activeTab === "concepto" && (
        <div className="rounded-3xl border-4 border-purple-200 bg-white p-6 shadow-xl">
          <ConceptoTab />
        </div>
      )}
      {activeTab === "practica" && (
        <div className="rounded-3xl border-4 border-purple-200 bg-white p-6 shadow-xl">
          <PracticaTab soundOn={soundOn} onAnswer={(correct) => void submitAnswer(correct)} />
        </div>
      )}
      {activeTab === "cohete" && <CoheteTab soundOn={soundOn} onAnswer={submitAnswer} />}
      {activeTab === "tabla" && (
        <div className="rounded-3xl border-4 border-purple-200 bg-white p-6 shadow-xl">
          <TablaTab soundOn={soundOn} />
        </div>
      )}
    </GameShell>
  );
}
