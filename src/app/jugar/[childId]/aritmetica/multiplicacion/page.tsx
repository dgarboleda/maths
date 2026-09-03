"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthProvider";
import { getFirebase } from "@/lib/firebase";
import type { ChildProfile, SkillProgress } from "@/lib/types";
import { recordAttempt, todayKey } from "@/lib/mastery";
import { starsForAnswer } from "@/lib/economy";
import { isUnlocked, missingPrerequisites } from "@/lib/curriculum";
import { GameShell, TabNav, tabId, tabPanelId } from "@/components/GameShell";
import { useTotalStars } from "@/lib/useTotalStars";
import { useSoundPreference } from "@/lib/useSoundPreference";
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

/** Props ARIA del panel de la pestaña activa (ver TabNav en GameShell). */
function panelProps(id: TabId) {
  return {
    id: tabPanelId(id),
    role: "tabpanel" as const,
    "aria-labelledby": tabId(id),
    tabIndex: 0,
  };
}

export default function MultiplicacionPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const params = useParams<{ childId: string }>();

  const [child, setChild] = useState<ChildProfile | null>(null);
  const [progress, setProgress] = useState<SkillProgress | undefined>(undefined);
  const [progressBySkill, setProgressBySkill] = useState<Record<string, SkillProgress>>({});
  const totalStars = useTotalStars(user?.uid, params.childId);
  const [streak, setStreak] = useState(0);
  const [repeatsToday, setRepeatsToday] = useState(0);
  const [soundOn, toggleSound] = useSoundPreference();
  const [activeTab, setActiveTab] = useState<TabId>("concepto");

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const {
        db,
        firestore: { collection, doc, getDoc, getDocs },
      } = await getFirebase();
      if (cancelled) return;
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
      setProgress(map[SKILL_KEY]);
    })().catch((err) => console.error("No se pudo cargar el progreso", err));
    return () => {
      cancelled = true;
    };
  }, [user, params.childId]);

  async function submitAnswer(correct: boolean): Promise<number> {
    if (!user) return 0;

    // El progreso/racha/estrellas se calculan de una función pura sobre
    // estado que ya tenemos en el cliente: no hace falta esperar a que
    // Firestore confirme nada para saber el resultado. Antes cada intento
    // esperaba 2-3 escrituras seguidas antes de avisar al llamador (el modo
    // Cohete usa ese valor para dar feedback inmediato y avanzar a la
    // siguiente pregunta) — en una red lenta eso se sentía como que el
    // juego se congelaba hasta el siguiente tick del cronómetro. Ahora se
    // actualiza el estado local y se responde de inmediato; el guardado en
    // Firestore corre en segundo plano.
    const { db, firestore: { addDoc, collection, doc, serverTimestamp, setDoc } } =
      await getFirebase();

    const updated = recordAttempt(progress, correct, todayKey());
    setProgress(updated);

    const persistAttempt = async () => {
      await addDoc(collection(db, "parents", user.uid, "children", params.childId, "attempts"), {
        skillId: `aritmetica-${KIND}-d5`,
        itemId: crypto.randomUUID(),
        correct,
        createdAt: serverTimestamp(),
      });
      await setDoc(
        doc(db, "parents", user.uid, "children", params.childId, "skillsProgress", SKILL_KEY),
        updated,
      );
    };
    persistAttempt().catch((err) => console.error("No se pudo guardar el intento", err));

    if (!correct) {
      setStreak(0);
      return 0;
    }

    const stars = starsForAnswer({ difficulty: 5, streak, repeatsToday });
    setStreak((s) => s + 1);
    setRepeatsToday((n) => n + 1);
    addDoc(collection(db, "parents", user.uid, "children", params.childId, "starLedger"), {
      delta: stars,
      reason: "problem_solved",
      attemptId: null,
      createdAt: serverTimestamp(),
    }).catch((err) => console.error("No se pudo guardar la estrella", err));
    return stars;
  }

  if (loading || !user) {
    return (
      <main id="contenido"
        tabIndex={-1} className="flex min-h-screen w-full items-center justify-center bg-white">
        <p role="status" className="text-neutral-700">
          Cargando…
        </p>
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

  // Defensa contra entrar por URL directa saltándose el candado de la lista
  // de temas, que es la puerta principal.
  if (!isUnlocked(progressBySkill, SKILL_KEY)) {
    const missing = missingPrerequisites(progressBySkill, SKILL_KEY);
    return (
      <main
        id="contenido"
        tabIndex={-1}
        className="mx-auto flex min-h-screen w-full max-w-md flex-col items-center justify-center gap-4 bg-white px-6 text-center"
      >
        <span aria-hidden="true" className="text-4xl">
          🔒
        </span>
        <p className="text-lg font-bold text-slate-700">Todavía no puedes entrar aquí</p>
        <p className="text-slate-500">
          Primero dominá: {missing.map((m) => m.label).join(", ")}
        </p>
        <Link
          href={`/jugar/${params.childId}/aritmetica`}
          className="text-sm text-purple-700 underline underline-offset-2"
        >
          Volver a Aritmética
        </Link>
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
      onToggleSound={toggleSound}
      nav={<TabNav tabs={TABS} active={activeTab} onSelect={setActiveTab} />}
    >
      {activeTab === "concepto" && (
        <div {...panelProps("concepto")} className="rounded-3xl border-4 border-purple-200 bg-white p-6 shadow-xl">
          <ConceptoTab />
        </div>
      )}
      {activeTab === "practica" && (
        <div {...panelProps("practica")} className="rounded-3xl border-4 border-purple-200 bg-white p-6 shadow-xl">
          <PracticaTab soundOn={soundOn} onAnswer={(correct) => void submitAnswer(correct)} />
        </div>
      )}
      {activeTab === "cohete" && (
        <div {...panelProps("cohete")}>
          <CoheteTab soundOn={soundOn} onAnswer={submitAnswer} />
        </div>
      )}
      {activeTab === "tabla" && (
        <div {...panelProps("tabla")} className="rounded-3xl border-4 border-purple-200 bg-white p-6 shadow-xl">
          <TablaTab soundOn={soundOn} />
        </div>
      )}
    </GameShell>
  );
}
