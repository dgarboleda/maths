"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthProvider";
import { getFirebase } from "@/lib/firebase";
import type { ChildProfile, Placement, PlacementStrandRecord, SkillProgress } from "@/lib/types";
import { STRANDS, getStrand } from "@/lib/strands";
import {
  answerPlacementItem,
  currentPlacementModule,
  grantsFromPlacement,
  initStrandPlacement,
  strandResultFrom,
  summarizePlacement,
  type StrandPlacementState,
} from "@/lib/placement";
import { isCorrectAnswer, type Problem } from "@/lib/problem";
import { awardBadge } from "@/lib/awardBadge";
import { GameShell } from "@/components/GameShell";
import { QuestionWidget } from "@/components/topic/QuestionWidget";
import { playSound } from "@/lib/gameSound";
import { useTotalStars } from "@/lib/useTotalStars";
import { useSoundPreference } from "@/lib/useSoundPreference";

type Phase = "intro" | "asking" | "results";

interface PlacementDoc extends Placement {
  id: string;
}

export default function EvaluacionPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const params = useParams<{ childId: string }>();
  const totalStars = useTotalStars(user?.uid, params.childId);
  const [soundOn, toggleSound] = useSoundPreference();
  const promptId = useId();
  const nextButtonRef = useRef<HTMLButtonElement>(null);
  const startedAtRef = useRef<number>(0);

  const [child, setChild] = useState<ChildProfile | null>(null);
  const [progressBySkill, setProgressBySkill] = useState<Record<string, SkillProgress>>({});
  const [ultimaEvaluacion, setUltimaEvaluacion] = useState<PlacementDoc | null>(null);

  const [phase, setPhase] = useState<Phase>("intro");
  const [strandOrderIdx, setStrandOrderIdx] = useState(0);
  const [strandState, setStrandState] = useState<StrandPlacementState | null>(null);
  const [problem, setProblem] = useState<Problem | null>(null);
  const [feedback, setFeedback] = useState<{ correct: boolean; answer: number } | null>(null);
  const [strandResults, setStrandResults] = useState<Record<string, PlacementStrandRecord>>({});
  const [savedSummary, setSavedSummary] = useState<ReturnType<typeof summarizePlacement> | null>(null);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const {
        db,
        firestore: { collection, doc, getDoc, getDocs, limit, orderBy, query },
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

      const placementsSnap = await getDocs(
        query(
          collection(db, "parents", user.uid, "children", params.childId, "placements"),
          orderBy("completedAt", "desc"),
          limit(1),
        ),
      );
      if (cancelled) return;
      const latest = placementsSnap.docs[0];
      if (latest) setUltimaEvaluacion({ id: latest.id, ...(latest.data() as Placement) });
    })().catch((err) => console.error("No se pudo cargar el estado de la evaluación", err));
    return () => {
      cancelled = true;
    };
  }, [user, params.childId]);

  function startPlacement() {
    startedAtRef.current = Date.now();
    const state = initStrandPlacement(STRANDS[0].slug);
    setStrandOrderIdx(0);
    setStrandResults({});
    setStrandState(state);
    setProblem(currentPlacementModule(state)?.generateProblem() ?? null);
    setFeedback(null);
    setSavedSummary(null);
    setPhase("asking");
  }

  function submit(given: number) {
    if (!strandState || !problem) return;
    const correct = isCorrectAnswer(problem, given);
    playSound(correct ? "correct" : "wrong", soundOn);
    setFeedback({ correct, answer: problem.answer });
    setStrandState(answerPlacementItem(strandState, correct));
  }

  function next() {
    if (!strandState) return;
    playSound("click", soundOn);

    if (!strandState.done) {
      const mod = currentPlacementModule(strandState);
      setProblem(mod?.generateProblem() ?? null);
      setFeedback(null);
      return;
    }

    const updatedResults = { ...strandResults, [strandState.strandSlug]: strandResultFrom(strandState) };
    setStrandResults(updatedResults);

    const nextIdx = strandOrderIdx + 1;
    if (nextIdx >= STRANDS.length) {
      void finishPlacement(updatedResults);
      return;
    }
    const nextState = initStrandPlacement(STRANDS[nextIdx].slug);
    setStrandOrderIdx(nextIdx);
    setStrandState(nextState);
    setProblem(currentPlacementModule(nextState)?.generateProblem() ?? null);
    setFeedback(null);
  }

  async function finishPlacement(results: Record<string, PlacementStrandRecord>) {
    const summary = summarizePlacement(results);
    const grants = grantsFromPlacement(results, progressBySkill);
    try {
      if (user) {
        const { db, firestore } = await getFirebase();
        const { collection, doc, writeBatch } = firestore;
        const batch = writeBatch(db);

        const placementRef = doc(
          collection(db, "parents", user.uid, "children", params.childId, "placements"),
        );
        batch.set(placementRef, {
          startedAt: startedAtRef.current,
          completedAt: Date.now(),
          perStrand: results,
          overallScore: summary.overallScore,
          overallGradeBand: summary.overallGradeBand,
          grantedModuleIds: grants,
        });

        for (const moduleId of grants) {
          const existing = progressBySkill[moduleId];
          batch.set(
            doc(db, "parents", user.uid, "children", params.childId, "skillsProgress", moduleId),
            {
              recentResults: existing?.recentResults ?? [],
              recentAccuracy: existing?.recentAccuracy ?? 1,
              masteredAt: Date.now(),
              masteredVia: "placement",
            },
          );
        }

        batch.update(doc(db, "parents", user.uid, "children", params.childId), {
          placementStatus: "completo",
        });

        await batch.commit();
        await awardBadge(firestore, db, user.uid, params.childId, "detective");
      }
    } catch (err) {
      console.error("No se pudo guardar la evaluación", err);
    }
    playSound("fanfare", soundOn);
    setSavedSummary(summary);
    setPhase("results");
  }

  useEffect(() => {
    if (feedback) nextButtonRef.current?.focus();
  }, [feedback]);

  if (loading || !user || !child) {
    return (
      <main id="contenido" tabIndex={-1} className="flex min-h-screen w-full items-center justify-center bg-slate-950">
        <p role="status" className="text-slate-300">
          Cargando…
        </p>
      </main>
    );
  }

  return (
    <GameShell
      icon="🎯"
      title="Evaluación inicial"
      subtitle={
        <Link href={`/jugar/${params.childId}`} className="underline">
          ← {child.name}
        </Link>
      }
      stars={totalStars}
      soundOn={soundOn}
      onToggleSound={toggleSound}
    >
      {phase === "intro" && (
        <IntroScreen
          childName={child.name}
          ultimaEvaluacion={ultimaEvaluacion}
          onStart={startPlacement}
          childHref={`/jugar/${params.childId}`}
        />
      )}

      {phase === "asking" && strandState && (
        <AskingScreen
          strandState={strandState}
          strandOrderIdx={strandOrderIdx}
          problem={problem}
          feedback={feedback}
          promptId={promptId}
          nextButtonRef={nextButtonRef}
          onSubmit={submit}
          onNext={next}
        />
      )}

      {phase === "results" && savedSummary && (
        <ResultsScreen
          childName={child.name}
          results={strandResults}
          summary={savedSummary}
          previa={ultimaEvaluacion}
          childHref={`/jugar/${params.childId}`}
        />
      )}
    </GameShell>
  );
}

function IntroScreen({
  childName,
  ultimaEvaluacion,
  onStart,
  childHref,
}: {
  childName: string;
  ultimaEvaluacion: PlacementDoc | null;
  onStart: () => void;
  childHref: string;
}) {
  return (
    <div className="mx-auto max-w-xl space-y-6 rounded-3xl border-2 border-indigo-300 bg-gradient-to-b from-purple-50 to-pink-50 p-6 text-center shadow-inner sm:p-8">
      <h2 className="text-2xl font-bold text-purple-900">¡Hola, {childName}! 👋</h2>
      <p className="text-slate-700">
        Antes de empezar a practicar, hagamos una evaluación rápida para saber por dónde conviene arrancar. Vamos a
        preguntarte cosas de aritmética, álgebra, geometría, medición y lógica — empezando fácil y subiendo de nivel
        mientras vayas acertando. Cuando falles dos seguidas en un tema, pasamos al siguiente.
      </p>
      <p className="text-sm text-slate-500">Dura entre 10 y 20 minutos. No es examen — no hay una nota, solo nos ayuda a ubicarte.</p>

      {ultimaEvaluacion?.completedAt && (
        <div className="rounded-2xl border-2 border-purple-100 bg-white p-4 text-left text-sm text-slate-600">
          <p className="font-bold text-purple-800">
            Ya hiciste esta evaluación antes: nivel general aproximado {ultimaEvaluacion.overallGradeBand}.
          </p>
          <p>Puedes volver a hacerla para ver cuánto has avanzado.</p>
        </div>
      )}

      <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
        <button
          type="button"
          onClick={onStart}
          className="rounded-2xl bg-purple-600 px-8 py-3 text-lg font-bold text-white shadow-md hover:bg-purple-500"
        >
          {ultimaEvaluacion ? "Evaluar de nuevo" : "Comenzar evaluación"}
        </button>
        <Link href={childHref} className="text-sm font-bold text-slate-600 underline underline-offset-2">
          Omitir por ahora
        </Link>
      </div>
    </div>
  );
}

function AskingScreen({
  strandState,
  strandOrderIdx,
  problem,
  feedback,
  promptId,
  nextButtonRef,
  onSubmit,
  onNext,
}: {
  strandState: StrandPlacementState;
  strandOrderIdx: number;
  problem: Problem | null;
  feedback: { correct: boolean; answer: number } | null;
  promptId: string;
  nextButtonRef: React.RefObject<HTMLButtonElement | null>;
  onSubmit: (given: number) => void;
  onNext: () => void;
}) {
  const strand = getStrand(strandState.strandSlug);
  if (!problem || !strand) return null;

  return (
    <div className="mx-auto max-w-xl space-y-6 rounded-3xl border-2 border-indigo-300 bg-gradient-to-b from-purple-50 to-pink-50 p-6 text-center shadow-inner sm:p-8">
      <div className="flex items-center justify-between text-sm font-bold text-purple-700">
        <span>
          Hilo {strandOrderIdx + 1} de {STRANDS.length}: {strand.emoji} {strand.label}
        </span>
        <span>Pregunta {strandState.itemsAsked + 1}</span>
      </div>

      <p id={promptId} className="text-2xl font-extrabold text-purple-900 sm:text-3xl">
        {problem.prompt}
      </p>

      {!feedback && <QuestionWidget problem={problem} onSubmit={onSubmit} promptId={promptId} />}

      <div role="status" aria-live="polite">
        {feedback && (
          <div className="space-y-3">
            {feedback.correct ? (
              <p className="text-lg font-bold text-emerald-700">¡Correcto! 🎉</p>
            ) : (
              <p className="text-lg font-bold text-slate-700">Casi — la respuesta era {feedback.answer}</p>
            )}
            <button
              ref={nextButtonRef}
              type="button"
              onClick={onNext}
              className="rounded-2xl bg-purple-600 px-6 py-2 font-bold text-white"
            >
              Siguiente
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function ResultsScreen({
  childName,
  results,
  summary,
  previa,
  childHref,
}: {
  childName: string;
  results: Record<string, PlacementStrandRecord>;
  summary: ReturnType<typeof summarizePlacement>;
  previa: PlacementDoc | null;
  childHref: string;
}) {
  return (
    <div role="status" className="mx-auto max-w-xl space-y-6 rounded-3xl border-2 border-emerald-300 bg-emerald-50 p-6 text-center shadow-inner sm:p-8">
      <div aria-hidden="true" className="text-5xl">
        🏆
      </div>
      <h2 className="text-2xl font-bold text-emerald-900">¡Evaluación completada, {childName}!</h2>
      <p className="text-lg font-bold text-emerald-800">
        Nivel general aproximado: {summary.overallGradeBand} ({summary.overallScore}/100)
      </p>

      {previa?.completedAt && (
        <p className="text-sm text-emerald-700">
          Tu evaluación anterior dio {previa.overallGradeBand} ({previa.overallScore}/100) — esto ya queda guardado
          para comparar el avance más adelante.
        </p>
      )}

      <ul className="flex flex-col gap-2 text-left">
        {STRANDS.map((s) => {
          const r = results[s.slug];
          if (!r) return null;
          return (
            <li
              key={s.slug}
              className="flex items-center justify-between rounded-xl border-2 border-emerald-100 bg-white px-4 py-2 text-sm"
            >
              <span className="font-bold text-emerald-900">
                {s.emoji} {s.label}
              </span>
              <span className="text-emerald-700">
                {r.gradeBand} · {r.itemsCorrect}/{r.itemsAsked} correctas
              </span>
            </li>
          );
        })}
      </ul>

      <p className="text-xs text-slate-500">
        Esta evaluación es una estimación informal de ubicación curricular, inspirada en la progresión de Common
        Core State Standards for Mathematics (CCSS-M) y en los marcos de TIMSS — no es una prueba estandarizada ni
        un diagnóstico clínico. Sirve para arrancar en el punto correcto y como referencia para comparar con
        evaluaciones futuras.
      </p>

      <Link
        href={childHref}
        className="inline-block rounded-2xl bg-emerald-600 px-8 py-3 text-lg font-bold text-white shadow-md hover:bg-emerald-500"
      >
        Empezar a practicar
      </Link>
    </div>
  );
}
