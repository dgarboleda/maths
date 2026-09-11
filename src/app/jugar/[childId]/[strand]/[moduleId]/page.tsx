"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthProvider";
import { getFirebase } from "@/lib/firebase";
import type { ChildProfile, SkillProgress } from "@/lib/types";
import { recordAttempt, todayKey } from "@/lib/mastery";
import { starsForAnswer } from "@/lib/economy";
import { awardStars } from "@/lib/starLedger";
import { getStrand } from "@/lib/strands";
import { getModule, isUnlocked, missingPrerequisites } from "@/lib/curriculum";
import { getStrandNarrative } from "@/lib/narrative";
import { triggerConfetti } from "@/lib/confetti";
import { playSound } from "@/lib/gameSound";
import { awardBadge } from "@/lib/awardBadge";
import { awardMasteryBadges } from "@/lib/masteryRewards";
import { GameShell, TabNav, tabId, tabPanelId } from "@/components/GameShell";
import { useTotalStars } from "@/lib/useTotalStars";
import { useSoundPreference } from "@/lib/useSoundPreference";
import { useRequirePlacement } from "@/lib/useRequirePlacement";
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
  const { user, loading, parentId } = useAuth();
  const router = useRouter();
  const params = useParams<{ childId: string; strand: string; moduleId: string }>();
  const strand = getStrand(params.strand);
  const mod = getModule(params.moduleId);

  const [child, setChild] = useState<ChildProfile | null>(null);
  const [progress, setProgress] = useState<SkillProgress | undefined>(undefined);
  const [progressBySkill, setProgressBySkill] = useState<Record<string, SkillProgress>>({});
  const totalStars = useTotalStars(parentId, params.childId);
  const [streak, setStreak] = useState(0);
  const [repeatsToday, setRepeatsToday] = useState(0);
  const [soundOn, toggleSound] = useSoundPreference();
  const [activeTab, setActiveTab] = useState<TabId>("concepto");
  const [celebration, setCelebration] = useState<{ label: string; zoneName: string } | null>(null);
  const placementPending = useRequirePlacement(params.childId, child, router);

  const skillKey = mod?.id ?? "";

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [user, loading, router]);

  useEffect(() => {
    if (!parentId || !mod) return;
    let cancelled = false;
    (async () => {
      const {
        db,
        firestore: { collection, doc, getDoc, getDocs },
      } = await getFirebase();
      if (cancelled) return;
      const childSnap = await getDoc(doc(db, "parents", parentId, "children", params.childId));
      if (cancelled || !childSnap.exists()) return;
      setChild(childSnap.data() as ChildProfile);

      const progressSnap = await getDocs(
        collection(db, "parents", parentId, "children", params.childId, "skillsProgress"),
      );
      if (cancelled) return;
      const map: Record<string, SkillProgress> = {};
      progressSnap.forEach((d) => (map[d.id] = d.data() as SkillProgress));
      setProgressBySkill(map);
      setProgress(map[skillKey]);
    })().catch((err) => console.error("No se pudo cargar el progreso", err));
    return () => {
      cancelled = true;
    };
  }, [parentId, params.childId, mod, skillKey]);

  async function submitAnswer(correct: boolean, hintsUsed = 0): Promise<number> {
    if (!parentId || !mod) return 0;

    // El progreso/racha/estrellas se calculan de una función pura sobre
    // estado que ya tenemos en el cliente: no hace falta esperar a que
    // Firestore confirme nada para saber el resultado. Antes cada intento
    // esperaba 2-3 escrituras seguidas antes de avisar al llamador (el modo
    // Cohete usa ese valor para dar feedback inmediato y avanzar a la
    // siguiente pregunta) — en una red lenta eso se sentía como que el
    // juego se congelaba hasta el siguiente tick del cronómetro. Ahora se
    // actualiza el estado local y se responde de inmediato; el guardado en
    // Firestore corre en segundo plano.
    const { db, firestore } = await getFirebase();
    const { addDoc, collection, doc, serverTimestamp, setDoc } = firestore;

    const wasMastered = Boolean(progress?.masteredAt);
    const updated = recordAttempt(progress, correct, todayKey());
    setProgress(updated);

    const persistAttempt = async () => {
      await addDoc(collection(db, "parents", parentId, "children", params.childId, "attempts"), {
        skillId: `${mod.strandSlug}-topico-${mod.id}`,
        itemId: crypto.randomUUID(),
        correct,
        createdAt: serverTimestamp(),
      });
      await setDoc(
        doc(db, "parents", parentId, "children", params.childId, "skillsProgress", skillKey),
        updated,
      );
    };
    persistAttempt().catch((err) => console.error("No se pudo guardar el intento", err));

    if (!wasMastered && updated.masteredAt) {
      const mergedProgress = { ...progressBySkill, [mod.id]: updated };
      awardMasteryBadges(firestore, db, parentId, params.childId, mod, mergedProgress).catch((err) =>
        console.error("No se pudo otorgar la insignia", err),
      );
      // Fase 31 (docs/plan-jugabilidad.md §5): dominar un módulo es un
      // "big" — mismo peso que cerrar una misión o vencer un boss (Fase
      // 34) — antes idéntico a acertar cualquier respuesta suelta.
      triggerConfetti("big");
      playSound("mastery", soundOn);
      setCelebration({ label: mod.label, zoneName: getStrandNarrative(mod.strandSlug).zoneName });
    }

    if (!correct) {
      setStreak(0);
      return 0;
    }

    const stars = starsForAnswer({ difficulty: mod.difficulty, streak, repeatsToday, hintsUsed });
    setStreak((s) => s + 1);
    setRepeatsToday((n) => n + 1);
    awardStars(firestore, db, parentId, params.childId, stars, "problem_solved").catch((err) =>
      console.error("No se pudo guardar la estrella", err),
    );
    return stars;
  }

  function handleCoheteWin() {
    if (!parentId) return;
    const BOSS_BONUS = 15;
    getFirebase()
      .then(async ({ db, firestore }) => {
        await awardStars(firestore, db, parentId, params.childId, BOSS_BONUS, "boss_level");
        await awardBadge(firestore, db, parentId, params.childId, "rapido");
      })
      .catch((err) => console.error("No se pudo otorgar el bono del Cohete", err));
  }

  function handleNoHintStreak() {
    if (!parentId) return;
    getFirebase()
      .then(({ db, firestore }) => awardBadge(firestore, db, parentId, params.childId, "estratega"))
      .catch((err) => console.error("No se pudo otorgar la insignia", err));
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

  if (!strand || !mod || mod.strandSlug !== strand.slug) {
    return (
      <main
        id="contenido"
        tabIndex={-1}
        className="flex min-h-screen w-full flex-col items-center justify-center gap-4 bg-slate-950 text-center"
      >
        <p className="text-slate-400">Ese tema todavía no existe.</p>
        <Link href={`/jugar/${params.childId}`} className="text-sm text-slate-400 underline underline-offset-2">
          Volver
        </Link>
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

  // Defensa contra entrar por URL directa saltándose el candado de la lista
  // de temas, que es la puerta principal.
  if (!isUnlocked(progressBySkill, mod.id)) {
    const missing = missingPrerequisites(progressBySkill, mod.id);
    return (
      <main
        id="contenido"
        tabIndex={-1}
        className="mx-auto flex min-h-screen w-full max-w-md flex-col items-center justify-center gap-4 bg-slate-950 px-6 text-center"
      >
        <span aria-hidden="true" className="text-4xl">
          🔒
        </span>
        <p className="text-lg font-bold text-slate-200">Todavía no puedes entrar aquí</p>
        <p className="text-slate-400">
          Primero dominá: {missing.map((m) => m.label).join(", ")}
        </p>
        <Link
          href={`/jugar/${params.childId}/${strand.slug}`}
          className="text-sm text-violet-300 underline underline-offset-2"
        >
          Volver a {strand.label}
        </Link>
      </main>
    );
  }

  return (
    <GameShell
      icon={mod.emoji}
      title={mod.label}
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
      {celebration && (
        <div
          role="status"
          aria-live="polite"
          className="mx-auto mb-4 flex max-w-md flex-col items-center gap-2 rounded-3xl border-2 border-emerald-400/60 bg-emerald-950/60 px-6 py-5 text-center shadow-[0_0_20px_rgba(52,211,153,0.3)]"
        >
          <p className="text-xs font-bold uppercase tracking-wide text-emerald-300">
            <span aria-hidden="true">✓ </span>Habilidad dominada
          </p>
          <p className="text-lg font-bold text-emerald-100">{celebration.label}</p>
          <p className="text-sm text-emerald-300">
            <span aria-hidden="true">⚡ </span>
            {celebration.zoneName} avanza
          </p>
          <button
            type="button"
            onClick={() => setCelebration(null)}
            className="mt-2 rounded-xl bg-emerald-600 px-4 py-1.5 text-sm font-bold text-white hover:bg-emerald-500"
          >
            Continuar
          </button>
        </div>
      )}

      {activeTab === "concepto" && (
        <div {...panelProps("concepto")} className="rounded-3xl border-4 border-indigo-300 bg-white p-6 shadow-xl">
          <ConceptoGeneric moduleId={mod.id} />
        </div>
      )}
      {activeTab === "practica" && (
        <div {...panelProps("practica")} className="rounded-3xl border-4 border-indigo-300 bg-white p-6 shadow-xl">
          <PracticeRoundGeneric
            moduleId={mod.id}
            soundOn={soundOn}
            onAnswer={(correct, hintsUsed) => void submitAnswer(correct, hintsUsed)}
            onNoHintStreak={handleNoHintStreak}
          />
        </div>
      )}
      {activeTab === "cohete" && (
        <div {...panelProps("cohete")}>
          <CoheteGeneric moduleId={mod.id} soundOn={soundOn} onAnswer={submitAnswer} onWin={handleCoheteWin} />
        </div>
      )}
      {activeTab === "ejemplos" && (
        <div {...panelProps("ejemplos")} className="rounded-3xl border-4 border-indigo-300 bg-white p-6 shadow-xl">
          <EjemplosTab moduleId={mod.id} soundOn={soundOn} />
        </div>
      )}
    </GameShell>
  );
}
