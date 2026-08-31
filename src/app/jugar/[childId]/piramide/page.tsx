"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthProvider";
import { getFirebase } from "@/lib/firebase";
import type { ChildProfile } from "@/lib/types";
import { starsForAnswer } from "@/lib/economy";
import { GameShell } from "@/components/GameShell";
import { PyramidGame } from "@/components/pyramid/PyramidGame";
import { useTotalStars } from "@/lib/useTotalStars";
import { useSoundPreference } from "@/lib/useSoundPreference";

export default function PiramidePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const params = useParams<{ childId: string }>();

  const [child, setChild] = useState<ChildProfile | null>(null);
  const totalStars = useTotalStars(user?.uid, params.childId);
  const [streak, setStreak] = useState(0);
  const [repeatsToday, setRepeatsToday] = useState(0);
  const [soundOn, toggleSound] = useSoundPreference();

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    getFirebase().then(({ db, firestore: { doc, getDoc } }) => {
      if (cancelled) return;
      getDoc(doc(db, "parents", user.uid, "children", params.childId)).then((snap) => {
        if (cancelled) return;
        if (snap.exists()) setChild(snap.data() as ChildProfile);
      });
    });
    return () => {
      cancelled = true;
    };
  }, [user, params.childId]);

  async function submitAnswer(difficulty: number, correct: boolean): Promise<number> {
    if (!user) return 0;

    const {
      db,
      firestore: { addDoc, collection, serverTimestamp },
    } = await getFirebase();

    await addDoc(collection(db, "parents", user.uid, "children", params.childId, "attempts"), {
      skillId: "piramide",
      itemId: crypto.randomUUID(),
      correct,
      createdAt: serverTimestamp(),
    });

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

  return (
    <GameShell
      icon="🔺"
      title="Pirámide numérica"
      subtitle={
        <Link href={`/jugar/${params.childId}/logica`} className="underline">
          ← Lógica de {child.name}
        </Link>
      }
      stars={totalStars}
      streak={streak}
      soundOn={soundOn}
      onToggleSound={toggleSound}
    >
      <div className="rounded-3xl border-4 border-purple-200 bg-white p-6 shadow-xl">
        <PyramidGame soundOn={soundOn} onAnswer={submitAnswer} />
      </div>
    </GameShell>
  );
}
