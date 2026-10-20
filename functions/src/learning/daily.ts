import { CONTENT_VERSION } from "./defineLesson";
import { getLesson, LESSONS } from "./catalog";
import { independent, LearningError } from "./engine";
import { dailyTarget, pickCalibrated, type CalibrationData } from "./calibration";
import { CALIBRATION } from "./calibrationData";
import { summarizeMisconceptions, type EvidenceEvent } from "./diagnosis";
import { isAnswerCorrect } from "./questions";
import type { DailyReviewState, DailyStreak, LearningAction, Lesson, Question, ResponseEvidence } from "./types";

export const DAILY_ID = "diario";
export const DAILY_SIZE = 6;
/** Días hasta el próximo repaso según la caja: acertar sin ayuda sube una caja. */
export const DAILY_INTERVALS = [1, 3, 7, 14, 30];
const DAY = 86_400_000;

/** Fecha del día en Perú (UTC−5, sin horario de verano). */
export function limaDay(now: number): string {
  return new Date(now - 5 * 3_600_000).toISOString().slice(0, 10);
}

/** Días de racha que dan un premio extra (una vez cada vez que se alcanzan). */
export const STREAK_MILESTONES = [7, 14, 30];
/** Repeticiones del mismo error, sin resolver, para que la clase vuelva antes. */
export const FOCUS_MIN_ERRORS = 2;

const dayNumber = (day: string) => Math.round(Date.parse(`${day}T00:00:00Z`) / DAY);
/** Lunes de la semana del día dado (AAAA-MM-DD). */
export function weekOf(day: string): string {
  const n = dayNumber(day);
  // El 1970-01-01 fue jueves: (n + 3) % 7 cuenta los días desde el lunes.
  return new Date((n - ((n + 3) % 7)) * DAY).toISOString().slice(0, 10);
}

const NO_STREAK: DailyStreak = { current: 0, best: 0, lastDay: null, freezeWeek: null };

/** Racha tras terminar una sesión el día `day`. Saltarse un solo día se
 *  perdona una vez por semana (comodín); dos o más días la reinician. */
export function advanceStreak(previous: DailyStreak | undefined, day: string): DailyStreak {
  const s = previous ?? NO_STREAK;
  if (s.lastDay === day) return s;
  const gap = s.lastDay ? dayNumber(day) - dayNumber(s.lastDay) : Infinity;
  const week = weekOf(day);
  const freeze = gap === 2 && s.freezeWeek !== week;
  const current = gap === 1 || freeze ? s.current + 1 : 1;
  return {
    current,
    best: Math.max(s.best, current),
    lastDay: day,
    freezeWeek: freeze ? week : s.freezeWeek,
  };
}

/** Racha vista hoy: sigue viva si se repasó hoy o ayer, o anteayer con el
 *  comodín de la semana disponible. */
export function streakToday(state: DailyReviewState | null | undefined, now: number) {
  const s = state?.streak ?? NO_STREAK;
  const today = limaDay(now);
  const gap = s.lastDay ? dayNumber(today) - dayNumber(s.lastDay) : Infinity;
  const freezeAvailable = s.freezeWeek !== weekOf(today);
  const alive = gap <= 1 || (gap === 2 && freezeAvailable);
  return {
    current: alive ? s.current : 0,
    best: s.best,
    doneToday: gap === 0,
    /** Hay que repasar hoy para no perderla. */
    atRisk: alive && gap > 0 && s.current > 0,
    usesFreeze: gap === 2 && alive,
    freezeAvailable,
    nextMilestone: STREAK_MILESTONES.find((m) => m > (alive ? s.current : 0)) ?? null,
  };
}

/**
 * Errores previstos que se repiten sin resolver (en clases, repasos y
 * ubicación): esas clases vuelven antes al repaso, con una pregunta de la
 * misma tarea. Devuelve clase → tarea.
 */
export function dailyFocus(events: EvidenceEvent[], eligible: string[]): Map<string, number | null> {
  const allowed = new Set(eligible);
  const focus = new Map<string, number | null>();
  for (const m of summarizeMisconceptions(events, getLesson).misconceptions)
    if (!m.resolved && m.count >= FOCUS_MIN_ERRORS && allowed.has(m.lessonId) && !focus.has(m.lessonId))
      focus.set(m.lessonId, m.task);
  return focus;
}

export function initialDaily(): DailyReviewState {
  return {
    contentVersion: CONTENT_VERSION,
    revision: 0,
    schedule: {},
    stage: "idle",
    items: [],
    index: 0,
    responses: {},
    sessions: 0,
    lastResult: null,
    rewardDay: null,
    startedAt: 0,
    updatedAt: 0,
  };
}

/** Lo que el repaso necesita saber de cada clase (calculado en el servidor). */
export interface DailyLessonInfo {
  completedAt: number | null;
  needsSupport: boolean;
}

/** Clases que se pueden repasar: terminadas o dominadas en la ubicación. */
export function dailyEligible(
  progress: Record<string, DailyLessonInfo>,
  placementMastered: string[],
): string[] {
  const mastered = new Set(placementMastered);
  return LESSONS.filter((l) => progress[l.id]?.completedAt || mastered.has(l.id)).map((l) => l.id);
}

/** Clases que hoy tocan repasar (vencidas o nunca repasadas). */
export function dailyDue(state: DailyReviewState, eligible: string[], now: number): string[] {
  return eligible.filter((id) => (state.schedule[id]?.dueAt ?? 0) <= now);
}

/** Banco para el repaso diario: formas que no son la práctica guiada, rotadas
 *  según cuántas veces se repasó la clase. */
function pool(lesson: Lesson): Question[] {
  return [...lesson.review, ...lesson.mixed, ...lesson.checks[1]];
}

/**
 * Prioridad: 0) clases con un error que se repite; 1) vencidas, de la caja
 * más baja a la más alta; 2) clases que necesitan apoyo; 3) las que hace más
 * tiempo no se repasan. Intercala
 * unidades para que dos problemas seguidos no sean del mismo tema, y como
 * mucho dos por clase.
 */
export function planDaily(
  state: DailyReviewState,
  eligible: string[],
  support: Set<string>,
  now: number,
  focus: Map<string, number | null> = new Map(),
  calibration: CalibrationData["items"] = CALIBRATION.items,
): DailyReviewState["items"] {
  const entry = (id: string) => state.schedule[id];
  const focused = eligible.filter((id) => focus.has(id));
  const due = dailyDue(state, eligible, now).filter((id) => !focus.has(id)).sort(
    (a, b) => (entry(a)?.box ?? 0) - (entry(b)?.box ?? 0) || (entry(a)?.dueAt ?? 0) - (entry(b)?.dueAt ?? 0),
  );
  const rest = eligible
    .filter((id) => !due.includes(id) && !focus.has(id))
    .sort((a, b) => Number(support.has(b)) - Number(support.has(a)) || (entry(a)?.lastAt ?? 0) - (entry(b)?.lastAt ?? 0));
  const ordered = [...focused, ...due, ...rest];
  const picks = [...ordered, ...ordered].slice(0, DAILY_SIZE);
  // Intercalar unidades: de los pendientes, toma el primero de otra unidad.
  const lessons: Lesson[] = [];
  const queue = picks.map((id) => getLesson(id)!);
  while (queue.length) {
    const last = lessons.at(-1);
    const i = queue.findIndex((l) => l.unitId !== last?.unitId);
    lessons.push(queue.splice(i < 0 ? 0 : i, 1)[0]);
  }
  const used = new Map<string, number>();
  const chosen = new Map<string, string[]>();
  return lessons.map((lesson) => {
    const bank = pool(lesson),
      k = used.get(lesson.id) ?? 0;
    used.set(lesson.id, k + 1);
    const seen = entry(lesson.id)?.seen ?? 0;
    const turn = seen * 2 + k + state.sessions;
    // Con un error que se repite, una forma de la misma tarea para atacarlo.
    const task = focus.get(lesson.id);
    const targeted = task === undefined || task === null ? [] : bank.filter((q) => q.task === task);
    if (targeted.length && k === 0) {
      const question = targeted[turn % targeted.length];
      chosen.set(lesson.id, [question.id]);
      return { lessonId: lesson.id, questionId: question.id, focus: true };
    }
    // Entre los próximos tres de la rotación, el de dificultad observada más
    // cercana al objetivo de su caja (sin datos: el primero, como siempre).
    const taken = new Set(chosen.get(lesson.id) ?? []);
    const options = [0, 1, 2].map((i) => bank[(turn + i) % bank.length]).filter((q) => !taken.has(q.id));
    const question = pickCalibrated(options.length ? options : [bank[turn % bank.length]], lesson.id,
      dailyTarget(entry(lesson.id)?.box ?? 0), calibration);
    chosen.set(lesson.id, [...taken, question.id]);
    return { lessonId: lesson.id, questionId: question.id };
  });
}

/** Preguntas de la sesión con identificadores propios (q1…q6). */
export function dailyQuestions(state: DailyReviewState): { question: Question; lesson: Lesson }[] {
  return state.items.flatMap((item, i) => {
    const lesson = getLesson(item.lessonId);
    const question = lesson && pool(lesson).find((q) => q.id === item.questionId);
    return lesson && question ? [{ lesson, question: { ...question, id: `q${i + 1}` } }] : [];
  });
}

export function applyDailyAction(
  previous: DailyReviewState | undefined,
  action: LearningAction,
  eligible: string[],
  support: Set<string>,
  now: number,
  focus: Map<string, number | null> = new Map(),
): DailyReviewState {
  let base = previous ?? initialDaily();
  if (base.contentVersion !== CONTENT_VERSION)
    base = { ...base, contentVersion: CONTENT_VERSION, stage: "idle", items: [], index: 0, responses: {} };
  const state: DailyReviewState = {
    ...base,
    schedule: { ...base.schedule },
    responses: { ...base.responses },
    revision: base.revision + 1,
    updatedAt: now,
  };
  if (action.kind === "begin") {
    if (eligible.length === 0)
      throw new LearningError("Termina una clase para empezar a repasar.");
    state.items = planDaily(base, eligible, support, now, focus);
    state.stage = "active";
    state.index = 0;
    state.responses = {};
    state.startedAt = now;
    return state;
  }
  if (state.stage !== "active") throw new LearningError("Empieza el repaso de hoy para responder.");
  const questions = dailyQuestions(state);
  const current = questions[state.index];
  if (!current) throw new LearningError("La sesión cambió. Vuelve a empezarla.");
  if (action.kind === "next") {
    if (!state.responses[current.question.id]?.attempts)
      throw new LearningError("Responde la actividad antes de continuar.");
    if (state.index + 1 < questions.length) {
      state.index++;
      return state;
    }
    const correct = questions.filter(({ question }) => independent(state.responses[question.id])).length;
    state.lastResult = { correct, total: questions.length, at: now };
    state.sessions = base.sessions + 1;
    state.stage = "summary";
    state.index = 0;
    // Una sesión terminada por día cuenta para el premio y la racha.
    state.rewardDay = limaDay(now);
    state.streak = advanceStreak(base.streak, state.rewardDay);
    return state;
  }
  if (action.questionId !== current.question.id)
    throw new LearningError("La actividad cambió. Actualiza la página para continuar.");
  if (action.kind === "reveal")
    throw new LearningError("En el repaso el desarrollo se muestra al terminar. Puedes pedir una pista.");
  const evidence: ResponseEvidence = {
    ...(state.responses[current.question.id] ?? {
      firstCorrect: false,
      correct: false,
      attempts: 0,
      hintsUsed: 0,
      revealed: false,
      response: null,
    }),
    updatedAt: now,
  };
  if (action.kind === "hint") evidence.hintsUsed = Math.min(3, evidence.hintsUsed + 1);
  else if (action.kind === "answer") {
    if (evidence.attempts > 0) throw new LearningError("Esta respuesta ya se registró.");
    if (!action.response.trim() || action.response.length > 64)
      throw new LearningError("Escribe o selecciona una respuesta.");
    evidence.correct = isAnswerCorrect(current.question, action.response);
    evidence.firstCorrect = evidence.correct;
    evidence.attempts = 1;
    evidence.response = action.response;
    // Acertar sin ayuda sube de caja; fallar o necesitar pistas vuelve a empezar.
    const old = state.schedule[current.lesson.id] ?? { box: 0, dueAt: 0, lastAt: 0, seen: 0 };
    const already = old.lastAt >= state.startedAt && state.startedAt > 0;
    const box = !independent(evidence)
      ? 0
      : already
        ? old.box
        : Math.min(DAILY_INTERVALS.length - 1, old.box + 1);
    state.schedule[current.lesson.id] = {
      box,
      dueAt: now + DAILY_INTERVALS[box] * DAY,
      lastAt: now,
      seen: old.seen + 1,
    };
  }
  state.responses[current.question.id] = evidence;
  return state;
}

/** Resumen para la familia: clases afianzadas (caja ≥ 3: vuelven en 14 días o
 *  más), en proceso y por reforzar. */
export function dailyStrength(state: DailyReviewState | null | undefined) {
  const boxes = Object.values(state?.schedule ?? {}).map((s) => s.box);
  return {
    strong: boxes.filter((b) => b >= 3).length,
    growing: boxes.filter((b) => b === 1 || b === 2).length,
    weak: boxes.filter((b) => b === 0).length,
  };
}
