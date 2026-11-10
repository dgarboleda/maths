import { evidenceKey, independent, type CheckResult, type LearningProgress, type Question, type ResponseEvidence } from "./core";

/**
 * Plan de refuerzo tras una comprobación o un repaso no superados: convierte
 * las respuestas que no fueron autónomas en pasos concretos (qué parte de la
 * clase conviene rehacer y por qué), en lugar de un «sigue practicando».
 *
 * Solo orienta: no cambia el avance, no acredita nada y no bloquea.
 */
export interface ReinforcementStep {
  id: "pace" | "base" | "class" | "examples" | "practice";
  title: string;
  detail: string;
  /** Parte de la clase que abre el paso. */
  stage?: "class" | "examples" | "guided" | "practice";
  /** Clase base que conviene afianzar antes. */
  lessonId?: string;
}

/** Una base está firme si se resolvió su comprobación sin apoyo o la
 *  ubicación la dio por sabida. */
function solid(id: string, progress: Record<string, LearningProgress>, mastered: ReadonlySet<string>): boolean {
  const base = progress[id];
  return mastered.has(id) || Boolean(base?.checkPassedAt && !base.needsSupport);
}

export function reinforcementPlan({
  stage,
  questions,
  responses,
  result,
  prerequisites,
  progress,
  mastered = [],
}: {
  stage: "check" | "review";
  questions: Question[];
  responses: Record<string, ResponseEvidence>;
  result: CheckResult | null;
  /** Bases de la clase, con su título. */
  prerequisites: { id: string; title: string }[];
  progress: Record<string, LearningProgress>;
  mastered?: readonly string[];
}): ReinforcementStep[] {
  if (!result || result.passed) return [];
  const missed = questions
    .map((question) => ({ question, evidence: responses[evidenceKey(stage, question)] }))
    .filter((item) => !independent(item.evidence));
  if (!missed.length) return [];
  const steps: ReinforcementStep[] = [];
  const wrong = missed.filter((item) => !item.evidence?.firstCorrect);
  const hurried = missed.filter((item) => item.evidence?.rushed && item.evidence.firstCorrect && !item.evidence.hintsUsed);
  if (hurried.length)
    steps.push({
      id: "pace",
      title: "Date tiempo para leer",
      detail: `${hurried.length === 1 ? "Una respuesta correcta llegó" : `${hurried.length} respuestas correctas llegaron`} antes de poder leer el problema completo, y por eso no ${hurried.length === 1 ? "cuenta" : "cuentan"} como hecha${hurried.length === 1 ? "" : "s"} sin ayuda. Lee todo el enunciado y estima el resultado antes de responder.`,
    });
  // Con varias respuestas incorrectas, una base sin afianzar suele ser la causa.
  const known = new Set(mastered);
  const weakBase = wrong.length >= 2 ? prerequisites.find((base) => !solid(base.id, progress, known)) : undefined;
  if (weakBase)
    steps.push({
      id: "base",
      title: `Afianza antes la base: ${weakBase.title}`,
      detail: "Esta clase se apoya en esa idea y todavía no la has resuelto sin ayuda. Reforzarla primero hará más fácil lo demás.",
      lessonId: weakBase.id,
    });
  const failed = (intent: Question["intent"]) => wrong.some((item) => item.question.intent === intent);
  if (failed("concept"))
    steps.push({
      id: "class",
      title: "Vuelve a la idea central",
      detail: "Fallaste una pregunta de comprensión: relee la explicación y mueve el modelo visual hasta poder decir con tus palabras qué cambia y qué se conserva.",
      stage: "class",
    });
  if (failed("procedure"))
    steps.push({
      id: "examples",
      title: "Explica cada paso de un ejemplo",
      detail: "Fallaste un cálculo: recorre los ejemplos resueltos y justifica cada paso antes de leer su explicación. Después resuelve con ayuda.",
      stage: "examples",
    });
  if (failed("transfer"))
    steps.push({
      id: "practice",
      title: "Practica con situaciones distintas",
      detail: "La idea te cuesta cuando el problema cambia de forma. En la práctica, antes de calcular, anota qué te dan y qué te piden.",
      stage: "practice",
    });
  // Todo correcto pero con pistas: falta soltar la ayuda, no volver a empezar.
  const helped = missed.some((item) => item.evidence?.firstCorrect && (item.evidence.hintsUsed > 0 || item.evidence.revealed));
  if (helped && !steps.some((step) => step.stage || step.lessonId))
    steps.push({
      id: "practice",
      title: "Resuelve sin pistas",
      detail: "Llegaste a las respuestas con apoyo. Practica de nuevo intentando cada actividad sin pedir pistas; úsalas solo después de un primer intento.",
      stage: "practice",
    });
  return steps;
}
