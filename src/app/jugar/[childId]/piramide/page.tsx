"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthProvider";
import { getFirebase } from "@/lib/firebase";
import type { ChildProfile } from "@/lib/types";
import { starsForAnswer } from "@/lib/economy";
import { awardStars } from "@/lib/starLedger";
import { GameShell } from "@/components/GameShell";
import { PyramidGame } from "@/components/pyramid/PyramidGame";
import { useTotalStars } from "@/lib/useTotalStars";
import { useSoundPreference } from "@/lib/useSoundPreference";
import { useRequirePlacement } from "@/lib/useRequirePlacement";

export default function PiramidePage() {
  const { user, loading, parentId } = useAuth();
  const router = useRouter();
  const params = useParams<{ childId: string }>();

  const [child, setChild] = useState<ChildProfile | null>(null);
  const totalStars = useTotalStars(parentId, params.childId);
  const [streak, setStreak] = useState(0);
  const [repeatsToday, setRepeatsToday] = useState(0);
  const [soundOn, toggleSound] = useSoundPreference();
  const placementPending = useRequirePlacement(params.childId, child, router);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [user, loading, router]);

  useEffect(() => {
    if (!parentId) return;
    let cancelled = false;
    getFirebase()
      .then(({ db, firestore: { doc, getDoc } }) => {
        if (cancelled) return;
        return getDoc(doc(db, "parents", parentId, "children", params.childId)).then((snap) => {
          if (cancelled) return;
          if (snap.exists()) setChild(snap.data() as ChildProfile);
        });
      })
      .catch((err) => console.error("No se pudo cargar el perfil", err));
    return () => {
      cancelled = true;
    };
  }, [parentId, params.childId]);

  async function submitAnswer(difficulty: number, correct: boolean): Promise<number> {
    if (!parentId) return 0;

    const { db, firestore } = await getFirebase();
    const { addDoc, collection, serverTimestamp } = firestore;

    await addDoc(collection(db, "parents", parentId, "children", params.childId, "attempts"), {
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
    await awardStars(firestore, db, parentId, params.childId, stars, "problem_solved");
    setStreak((s) => s + 1);
    setRepeatsToday((n) => n + 1);
    return stars;
  }

  if (loading || !user || !parentId) {
    return (
      <main id="contenido"
        tabIndex={-1} className="flex min-h-screen w-full items-center justify-center bg-slate-950">
        <p role="status" className="text-slate-300">
          Cargando…
        </p>
      </main>
    );
  }

  if (!child || placementPending) {
    return (
      <main id="contenido"
        tabIndex={-1} className="flex min-h-screen w-full items-center justify-center bg-slate-950">
        <p role="status" className="text-slate-300">
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
      <div className="rounded-3xl border-4 border-indigo-300 bg-white p-6 shadow-xl">
        <PyramidGame soundOn={soundOn} onAnswer={submitAnswer} />
      </div>
    </GameShell>
  );
}
