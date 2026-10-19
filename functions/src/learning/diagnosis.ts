import { isAnswerCorrect, parseNumber } from "./questions";
import type { Lesson, Question, ResponseEvidence } from "./types";

/** Lo que se guarda junto a cada respuesta (`learningEvidence/{op}.outcome`):
 *  suficiente para diagnosticar errores y calibrar preguntas sin volver a
 *  reconstruir el estado de la sesión. */
export interface AnswerOutcome {
  /** Clase de la que proviene la pregunta (también en repaso y ubicación). */
  lessonId: string;
  /** Identificador de la pregunta dentro de los bancos de la clase. */
  questionId: string;
  task: number | null;
  stage: string;
  correct: boolean;
  /** Número de intento (1 = primera respuesta). */
  attempt: number;
  hintsUsed: number;
  revealed: boolean;
  /** Error previsto que coincide con la respuesta: `e:<valor>` para un valor
   *  numérico de `errors`, `c:<opción>` para una opción incorrecta. */
  error: string | null;
}

const STAGE_BY_PREFIX: Record<string, string> = {
  d: "diagnostic",
  g: "guided",
  p: "practice",
  a: "check",
  b: "check",
  r: "review",
  x: "mixed",
  y: "mixed",
  m: "application",
};

/** Busca una pregunta por su identificador en todos los bancos de la clase
 *  (los prefijos `d-`, `g-`, `p-`… no se repiten entre bancos). */
export function findQuestion(
  lesson: Lesson,
  questionId: string,
): { question: Question; stage: string } | undefined {
  const banks = [
    lesson.diagnostic,
    lesson.guided,
    lesson.practice,
    ...lesson.checks,
    lesson.review,
    lesson.mixed,
    [lesson.application],
  ];
  for (const bank of banks) {
    const question = bank.find((q) => q.id === questionId);
    if (question)
      return { question, stage: STAGE_BY_PREFIX[questionId[0]] ?? "practice" };
  }
  return undefined;
}

/** Error previsto que explica una respuesta incorrecta, o null si la
 *  respuesta es correcta o el error no estaba anticipado. */
export function matchError(question: Question, response: string): string | null {
  if (isAnswerCorrect(question, response)) return null;
  if (question.format === "choice")
    return question.choices?.some((c) => c.id === response) ? `c:${response}` : null;
  const value = parseNumber(response);
  if (value === null) return null;
  const error = question.errors?.find(
    (item) => typeof item.value === "number" && Math.abs(item.value - value) < 1e-8,
  );
  return error ? `e:${error.value}` : null;
}

/** Explicación del error previsto, tal como la vio el estudiante. Las
 *  alternativas genéricas del diagnóstico inicial no cuentan como error
 *  conceptual. */
export function errorText(question: Question, key: string | null): string | null {
  if (!key) return null;
  const text = key.startsWith("c:")
    ? question.choices?.find((c) => `c:${c.id}` === key)?.feedback
    : question.errors?.find((e) => `e:${e.value}` === key)?.feedback;
  return text && !text.startsWith("Revisa esa afirmación") ? text : null;
}

/** Agrupa el mismo error entre formas paralelas: las explicaciones solo
 *  cambian en los números. */
export function errorGroup(text: string): string {
  return text.replace(/[−-]?\d+(?:[.,]\d+)?/g, "#").replace(/\s+/g, " ").trim();
}

export function answerOutcome(
  lessonId: string,
  question: Question,
  stage: string,
  evidence: ResponseEvidence | undefined,
  response: string,
): AnswerOutcome {
  return {
    lessonId,
    questionId: question.id,
    task: question.task ?? null,
    stage,
    correct: isAnswerCorrect(question, response),
    attempt: evidence?.attempts ?? 1,
    hintsUsed: evidence?.hintsUsed ?? 0,
    revealed: evidence?.revealed ?? false,
    error: matchError(question, response),
  };
}

/** Evento de `learningEvidence` normalizado para el análisis. */
export interface EvidenceEvent {
  lessonId: string;
  action: { kind: string; questionId?: string; response?: string };
  outcome?: AnswerOutcome;
  /** Milisegundos desde la época. */
  at: number;
}

export interface Misconception {
  lessonId: string;
  /** Explicación más reciente que vio el estudiante. */
  text: string;
  /** Enunciado y respuesta de la última vez, para dar contexto. */
  prompt: string;
  response: string;
  count: number;
  firstAt: number;
  lastAt: number;
  /** Después del último error, respondió bien al primer intento la misma
   *  tarea (en cualquiera de sus formas). */
  resolved: boolean;
}

/** Diagnóstico de un evento: el guardado por el servidor o, en eventos
 *  anteriores a ese registro, reconstruido desde la pregunta de la clase. */
export function eventOutcome(
  event: EvidenceEvent,
  getLesson: (id: string) => Lesson | undefined,
): AnswerOutcome | null {
  if (event.outcome) return event.outcome;
  const { action } = event;
  if (action.kind !== "answer" || !action.questionId || !action.response) return null;
  const lesson = getLesson(event.lessonId);
  const found = lesson && findQuestion(lesson, action.questionId);
  return found ? answerOutcome(lesson.id, found.question, found.stage, undefined, action.response) : null;
}

/** Errores previstos que se repiten, agrupados entre formas paralelas. */
export function summarizeMisconceptions(
  events: EvidenceEvent[],
  getLesson: (id: string) => Lesson | undefined,
): { misconceptions: Misconception[]; unexpected: Record<string, number> } {
  const sorted = [...events].sort((a, b) => a.at - b.at);
  const groups = new Map<string, Misconception & { task: number | null }>();
  const solvedAt = new Map<string, number>();
  const unexpected: Record<string, number> = {};
  for (const event of sorted) {
    const outcome = eventOutcome(event, getLesson);
    if (!outcome) continue;
    const taskKey = `${outcome.lessonId}#${outcome.task}`;
    if (outcome.correct) {
      if (outcome.attempt <= 1 && outcome.hintsUsed === 0) solvedAt.set(taskKey, event.at);
      continue;
    }
    const lesson = getLesson(outcome.lessonId);
    const question = lesson && findQuestion(lesson, outcome.questionId)?.question;
    const text = question ? errorText(question, outcome.error) : null;
    if (!question || !text) {
      unexpected[outcome.lessonId] = (unexpected[outcome.lessonId] ?? 0) + 1;
      continue;
    }
    const key = `${outcome.lessonId}|${errorGroup(text)}`;
    const group = groups.get(key);
    const raw = event.action.response ?? "";
    const response = question.choices?.find((c) => c.id === raw)?.label ?? raw;
    if (group) {
      group.count++;
      group.lastAt = event.at;
      group.text = text;
      group.task = outcome.task;
      group.prompt = question.prompt;
      group.response = response;
    } else
      groups.set(key, {
        lessonId: outcome.lessonId,
        text,
        prompt: question.prompt,
        response,
        count: 1,
        firstAt: event.at,
        lastAt: event.at,
        resolved: false,
        task: outcome.task,
      });
  }
  const misconceptions = [...groups.values()]
    .map(({ task, ...m }) => ({
      ...m,
      resolved: (solvedAt.get(`${m.lessonId}#${task}`) ?? 0) > m.lastAt,
    }))
    .sort((a, b) => Number(a.resolved) - Number(b.resolved) || b.count - a.count || b.lastAt - a.lastAt);
  return { misconceptions, unexpected };
}
