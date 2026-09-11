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
  moduleForTier,
  pickPersonalizedPlan,
  strandResultFrom,
  summarizePlacement,
  type StrandPlacementState,
} from "@/lib/placement";
import { moduleHref, recommendedModule } from "@/lib/curriculum";
import { formatAnswer, isCorrectAnswer, type Problem } from "@/lib/problem";
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
  const { user, loading, parentId } = useAuth();
  const router = useRouter();
  const params = useParams<{ childId: string }>();
  const totalStars = useTotalStars(parentId, params.childId);
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
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [user, loading, router]);

  useEffect(() => {
    if (!parentId) return;
    let cancelled = false;
    (async () => {
      const {
        db,
        firestore: { collection, doc, getDoc, getDocs, limit, orderBy, query },
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

      const placementsSnap = await getDocs(
        query(
          collection(db, "parents", parentId, "children", params.childId, "placements"),
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
  }, [parentId, params.childId]);

  /**
   * En una re-evaluación, arranca justo encima de la última franja aprobada
   * en ese hilo en vez de repetir el basal desde 0 — la primera vez de un
   * alumno (sin evaluación previa) sigue siendo basal puro.
   */
  function startTierFor(strandSlug: string): number {
    const previous = ultimaEvaluacion?.perStrand[strandSlug];
    return previous ? previous.highestTierPassed + 1 : 0;
  }

  function startPlacement() {
    startedAtRef.current = Date.now();
    const state = initStrandPlacement(STRANDS[0].slug, startTierFor(STRANDS[0].slug));
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
    const nextState = initStrandPlacement(STRANDS[nextIdx].slug, startTierFor(STRANDS[nextIdx].slug));
    setStrandOrderIdx(nextIdx);
    setStrandState(nextState);
    setProblem(currentPlacementModule(nextState)?.generateProblem() ?? null);
    setFeedback(null);
  }

  /**
   * Si esto falla (permisos, red, config de Firebase), NO hay que mostrar
   * igual la pantalla de resultados: `placementStatus` nunca quedaría en
   * "completo" y el niño volvería a caer en /evaluacion la próxima vez que
   * intente jugar — un bucle invisible, porque de cara al niño la evaluación
   * "funcionó" (sonó la fanfarria). El error queda visible y se puede
   * reintentar sin rehacer el cuestionario completo (`results` ya está
   * calculado).
   */
  async function finishPlacement(results: Record<string, PlacementStrandRecord>) {
    setSaving(true);
    setSaveError(null);
    try {
      if (!parentId) throw new Error("No hay sesión activa.");
      const summary = summarizePlacement(results);
      const grants = grantsFromPlacement(results, progressBySkill);
      const { db, firestore } = await getFirebase();
      const { collection, doc, writeBatch } = firestore;
      const batch = writeBatch(db);

      const placementRef = doc(
        collection(db, "parents", parentId, "children", params.childId, "placements"),
      );
      batch.set(placementRef, {
        startedAt: startedAtRef.current,
        completedAt: Date.now(),
        perStrand: results,
        overallScore: summary.overallScore,
        overallGradeBand: summary.overallGradeBand,
        grantedModuleIds: grants,
      });

      const mergedProgress = { ...progressBySkill };
      for (const moduleId of grants) {
        const existing = progressBySkill[moduleId];
        const granted: SkillProgress = {
          recentResults: existing?.recentResults ?? [],
          recentAccuracy: existing?.recentAccuracy ?? 1,
          masteredAt: Date.now(),
          masteredVia: "placement",
        };
        mergedProgress[moduleId] = granted;
        batch.set(
          doc(db, "parents", parentId, "children", params.childId, "skillsProgress", moduleId),
          granted,
        );
      }

      batch.update(doc(db, "parents", parentId, "children", params.childId), {
        placementStatus: "completo",
      });

      await batch.commit();
      // La insignia es un extra: si falla no debe impedir que el niño entre
      // a jugar con su evaluación ya guardada de verdad.
      await awardBadge(firestore, db, parentId, params.childId, "detective").catch((err) =>
        console.error("No se pudo otorgar la insignia de la evaluación", err),
      );
      // El plan de la pantalla de resultados (próximo módulo por hilo)
      // necesita ver los módulos recién otorgados, no el progreso de antes
      // de rendir la evaluación.
      setProgressBySkill(mergedProgress);
      playSound("fanfare", soundOn);
      setSavedSummary(summary);
      setPhase("results");
    } catch (err) {
      console.error("No se pudo guardar la evaluación", err);
      setSaveError(
        err instanceof Error && /permission|insufficient/i.test(err.message)
          ? "No se pudo guardar tu evaluación: la base de datos rechazó el permiso. Avisa a tu familia — puede ser un problema de configuración."
          : "No se pudo guardar tu evaluación. Revisa tu conexión a internet e intenta de nuevo.",
      );
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    if (feedback) nextButtonRef.current?.focus();
  }, [feedback]);

  if (loading || !user || !parentId || !child) {
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
      {saving && (
        <div role="status" className="mx-auto max-w-xl rounded-3xl border-2 border-indigo-300 bg-white p-8 text-center shadow-inner">
          <p className="font-bold text-purple-800">Guardando tu evaluación…</p>
        </div>
      )}

      {!saving && saveError && (
        <SaveErrorScreen message={saveError} onRetry={() => void finishPlacement(strandResults)} />
      )}

      {!saving && !saveError && phase === "intro" && (
        <IntroScreen
          childName={child.name}
          ultimaEvaluacion={ultimaEvaluacion}
          onStart={startPlacement}
          childHref={`/jugar/${params.childId}`}
        />
      )}

      {!saving && !saveError && phase === "asking" && strandState && (
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

      {!saving && !saveError && phase === "results" && savedSummary && (
        <ResultsScreen
          childId={params.childId}
          childName={child.name}
          results={strandResults}
          summary={savedSummary}
          previa={ultimaEvaluacion}
          progressBySkill={progressBySkill}
          childHref={`/jugar/${params.childId}`}
        />
      )}
    </GameShell>
  );
}

function SaveErrorScreen({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div role="alert" className="mx-auto max-w-xl space-y-4 rounded-3xl border-2 border-red-300 bg-red-50 p-6 text-center shadow-inner sm:p-8">
      <div aria-hidden="true" className="text-4xl">
        ⚠️
      </div>
      <h2 className="text-xl font-bold text-red-900">No se pudo guardar tu evaluación</h2>
      <p className="text-sm text-red-800">{message}</p>
      <p className="text-xs text-red-700">
        Tus respuestas no se perdieron: puedes reintentar sin volver a contestar todo el cuestionario.
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="rounded-2xl bg-red-600 px-6 py-2.5 font-bold text-white hover:bg-red-500"
      >
        Reintentar
      </button>
    </div>
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
  // El primer contacto con el juego es literalmente el arranque del guion
  // maestro (docs/guion-narrativa-math-quest.md §6-7): Alex llega a Ciudad
  // Central y encuentra una terminal dormida. La evaluación de ubicación YA
  // es, mecánicamente, "resolver los patrones que aparecen en la terminal" —
  // esto solo pone en palabras lo que ya iba a pasar, sin tocar la lógica de
  // `initStrandPlacement`/`answerPlacementItem`. Una reevaluación no repite
  // la escena de descubrimiento: ya se conoció la terminal la primera vez.
  return (
    <div className="mx-auto max-w-xl space-y-6 rounded-3xl border-2 border-indigo-300 bg-gradient-to-b from-purple-50 to-pink-50 p-6 text-center shadow-inner sm:p-8">
      {ultimaEvaluacion?.completedAt ? (
        <>
          <h2 className="text-2xl font-bold text-purple-900">De vuelta en la terminal, {childName}</h2>
          <p className="text-slate-700">
            Vuelves a la terminal de la plaza para ver cuánto ha crecido tu AXIA. Preguntas de aritmética, álgebra,
            geometría, medición y lógica — empezando justo por encima de donde llegaste la última vez.
          </p>
          <div className="rounded-2xl border-2 border-purple-100 bg-white p-4 text-left text-sm text-slate-600">
            <p className="font-bold text-purple-800">
              Tu evaluación anterior dio un nivel general aproximado de {ultimaEvaluacion.overallGradeBand}.
            </p>
            <p>No es examen — no hay una nota, solo nos ayuda a ubicarte.</p>
          </div>
          <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <button
              type="button"
              onClick={onStart}
              className="rounded-2xl bg-purple-600 px-8 py-3 text-lg font-bold text-white shadow-md hover:bg-purple-500"
            >
              Evaluar de nuevo
            </button>
            <Link href={childHref} className="text-sm font-bold text-slate-600 underline underline-offset-2">
              Omitir por ahora
            </Link>
          </div>
        </>
      ) : (
        <>
          <h2 className="text-2xl font-bold text-purple-900">Llegas a Ciudad Central</h2>
          <p className="italic text-slate-600">
            Una antigua ciudad tecnológica que lleva generaciones casi abandonada.
          </p>
          <p className="text-slate-700">
            En la plaza encuentras una terminal. Todavía conserva algo de energía. La tocas... y no sucede nada.
          </p>
          <p className="text-slate-700">Entonces, en la pantalla, aparece un patrón matemático.</p>
          <p className="text-sm text-slate-500">
            Resuelve los patrones que vayan apareciendo — de aritmética, álgebra, geometría, medición y lógica — para
            ver qué pasa. Dura entre 10 y 20 minutos. No es examen: no hay una nota.
          </p>
          <button
            type="button"
            onClick={onStart}
            className="rounded-2xl bg-purple-600 px-8 py-3 text-lg font-bold text-white shadow-md hover:bg-purple-500"
          >
            Activar la terminal ▸
          </button>
        </>
      )}
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

  // La terminal de la evaluación (docs/guion-narrativa-math-quest.md §6-7):
  // mismo lenguaje visual que PuzzleOverlay (world-terminal-panel,
  // world-screen-glass, scanlines, cursor parpadeante) para que se sienta
  // como la misma máquina, aunque aquí no hay un `Interactable` real detrás
  // — es la terminal de la plaza, antes de que exista ningún objeto del mundo.
  return (
    <div className="mx-auto max-w-xl">
      <div className="world-terminal-panel world-scanlines anim-rise overflow-hidden rounded-3xl border-2 border-cyan-400/40 p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-b-2 border-cyan-400/25 pb-3 font-mono text-[11px] uppercase tracking-[0.2em] text-cyan-400/90">
          <span>
            Hilo {strandOrderIdx + 1} de {STRANDS.length} · {strand.emoji} {strand.label}
          </span>
          <span>
            Pregunta {strandState.itemsAsked + 1}
            <span aria-hidden="true" className="anim-blink ml-1">
              ▮
            </span>
          </span>
        </div>

        <div className="world-screen-glass mt-4 rounded-2xl p-5 text-center">
          <p id={promptId} className="text-xl font-extrabold text-slate-50 sm:text-2xl">
            {problem.prompt}
          </p>

          {!feedback && (
            <div className="mt-4">
              <QuestionWidget problem={problem} onSubmit={onSubmit} promptId={promptId} />
            </div>
          )}
        </div>

        <div role="status" aria-live="polite" className="mt-4 text-center">
          {feedback && (
            <div className="anim-rise space-y-3">
              {feedback.correct ? (
                <p className="font-mono text-lg font-bold text-emerald-300">✓ ¡Correcto! 🎉</p>
              ) : (
                <p className="font-mono text-lg font-bold text-amber-200">
                  Casi — la respuesta era {formatAnswer(problem, feedback.answer)}
                </p>
              )}
              <button
                ref={nextButtonRef}
                type="button"
                onClick={onNext}
                className="rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-6 py-2 font-bold text-white"
              >
                Siguiente
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ResultsScreen({
  childId,
  childName,
  results,
  summary,
  previa,
  progressBySkill,
  childHref,
}: {
  childId: string;
  childName: string;
  results: Record<string, PlacementStrandRecord>;
  summary: ReturnType<typeof summarizePlacement>;
  previa: PlacementDoc | null;
  progressBySkill: Record<string, SkillProgress>;
  childHref: string;
}) {
  const plan = pickPersonalizedPlan(results, progressBySkill);
  const priorityStrand = plan?.strand;
  const priorityModule = plan?.module;

  return (
    <div role="status" className="mx-auto max-w-xl space-y-6 rounded-3xl border-2 border-emerald-300 bg-emerald-50 p-6 text-center shadow-inner sm:p-8">
      <div aria-hidden="true" className="text-5xl">
        🏆
      </div>
      <h2 className="text-2xl font-bold text-emerald-900">¡Evaluación completada, {childName}!</h2>

      {!previa && (
        // La activación de la terminal (docs/guion-narrativa-math-quest.md
        // §7-8): la Dra. Nia aparece por primera vez y revela qué es AXIA.
        // Solo la primera vez — en una reevaluación ya se conoce la escena.
        <div className="space-y-2 rounded-2xl border-2 border-cyan-200 bg-cyan-50 p-4 text-left text-sm text-slate-700">
          <p>La terminal empieza a emitir energía. Una luz recorre la estructura. La pantalla se enciende.</p>
          <p className="italic">—¿Qué hiciste? —pregunta una mujer con bata, sin poder creerlo.</p>
          <p className="italic">—Solo resolví los problemas.</p>
          <p className="italic">Ella mira la terminal. —No. No se activó sola. Tú la activaste. Soy la Dra. Nia.</p>
          <p>
            Eso que sientes tiene nombre: <strong>AXIA</strong>. Es la energía que construyó esta ciudad, dormida
            durante generaciones. Se genera resolviendo problemas matemáticos — nadie lo había conseguido en todo
            este tiempo. Hasta ti.
          </p>
        </div>
      )}

      <p className="text-lg font-bold text-emerald-800">
        Nivel general aproximado: {summary.overallGradeBand} ({summary.overallScore}/100)
      </p>

      {previa?.completedAt && (
        <p className="text-sm text-emerald-700">
          Tu evaluación anterior dio {previa.overallGradeBand} ({previa.overallScore}/100) — esto ya queda guardado
          para comparar el avance más adelante.
        </p>
      )}

      {priorityStrand && priorityModule && (
        <div className="rounded-2xl border-2 border-amber-300 bg-amber-50 p-4 text-left">
          <p className="font-bold text-amber-900">
            <span aria-hidden="true">🎯 </span>Tu plan: por dónde empezar
          </p>
          <p className="mt-1 text-sm text-amber-800">
            {priorityStrand.emoji} {priorityStrand.label} es donde tienes más para crecer ahora mismo.
          </p>
          <Link
            href={moduleHref(childId, priorityModule)}
            className="mt-2 inline-block rounded-xl bg-amber-600 px-4 py-1.5 text-sm font-bold text-white hover:bg-amber-500"
          >
            ▶ Practicar {priorityModule.label}
          </Link>
        </div>
      )}

      <ul className="flex flex-col gap-2 text-left">
        {STRANDS.map((s) => {
          const r = results[s.slug];
          if (!r) return null;
          const recommended = recommendedModule(progressBySkill, s.slug);
          const weakLabels = r.weakTiers
            .map((tier) => moduleForTier(s.slug, tier)?.label)
            .filter((label): label is string => Boolean(label));
          return (
            <li key={s.slug} className="rounded-xl border-2 border-emerald-100 bg-white px-4 py-2 text-sm">
              <div className="flex items-center justify-between gap-2">
                <span className="font-bold text-emerald-900">
                  {s.emoji} {s.label}
                </span>
                <span className="text-emerald-700">
                  {r.gradeBand} · {r.itemsCorrect}/{r.itemsAsked} correctas
                </span>
              </div>
              {weakLabels.length > 0 && (
                <p className="mt-1 text-xs text-amber-700">
                  <span aria-hidden="true">🎯 </span>Puntos de mejora: {weakLabels.join(", ")}
                </p>
              )}
              {recommended && (
                <Link
                  href={moduleHref(childId, recommended)}
                  className="mt-1 inline-block text-xs font-bold text-emerald-700 underline underline-offset-2"
                >
                  ▶ Practicar {recommended.label}
                </Link>
              )}
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
