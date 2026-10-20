/** Dominio educativo compartido por Functions y Next. Sin Firebase ni React. */
export type Stage =
  | "diagnostic"
  | "class"
  | "examples"
  | "guided"
  | "practice"
  | "check"
  | "application"
  | "summary"
  | "review";
export type QuestionStage =
  | "diagnostic"
  | "guided"
  | "practice"
  | "check"
  | "application"
  | "review";
export type Intent = "procedure" | "concept" | "transfer";
export interface Choice {
  id: string;
  label: string;
  feedback?: string;
}
export interface Question {
  id: string;
  format: "number" | "choice" | "step";
  intent: Intent;
  prompt: string;
  answer: number | string;
  choices?: Choice[];
  unit?: string;
  hints: [string, string, string];
  explanation: string;
  solution: string[];
  errors?: { value: number | string; feedback: string }[];
  /** Tarea de la plantilla (q0…q6; 7 = aplicación). Las formas paralelas de
   *  una misma tarea comparten número: permite comparar su dificultad. */
  task?: number;
}
export interface Example {
  prompt: string;
  steps: { math: string; why: string }[];
  conclusion: string;
}
export type Visual =
  | "fraction"
  | "equivalence"
  | "percent"
  | "quantity"
  | "ratio"
  | "rate"
  | "change"
  | "balance"
  | "equation"
  | "integers"
  | "area"
  | "data"
  | "probability"
  | "linear"
  | "direct"
  | "inverse"
  | "parabola"
  | "inequality"
  | "angles"
  | "pythagoras"
  | "circle"
  | "similarity"
  | "volume"
  | "tree"
  | "powers"
  | "decimal-grid"
  | "system"
  | "exponential"
  | "trig"
  | "boxplot"
  | "counting"
  | "transform"
  | "interest"
  | "sequence"
  | "distance";
export type UnitId =
  | "numeros"
  | "fracciones"
  | "proporcionalidad"
  | "algebra"
  | "expresiones"
  | "geometria"
  | "datos";
export interface Lesson {
  id: string;
  version: number;
  unitId: UnitId;
  title: string;
  objective: string;
  purpose: string;
  prerequisites: string[];
  legacyModuleIds: string[];
  vocabulary: { term: string; meaning: string }[];
  sections: { title: string; paragraphs: string[]; formula: string }[];
  visual: Visual;
  examples: Example[];
  diagnostic: Question[];
  guided: Question[];
  practice: Question[];
  checks: [Question[], Question[]];
  review: Question[];
  /** Banco propio del repaso mixto de la unidad (forma 5, nunca vista). */
  mixed: Question[];
  application: Question;
  outcome: string;
  commonErrors: string[];
  editorial: {
    status: "pending-teacher-review" | "teacher-reviewed";
    author: string;
    source: string;
    revisionDate: string;
    review?: { reviewer: string; date: string; version: number; notes: string };
  };
}
export interface ResponseEvidence {
  firstCorrect: boolean;
  correct: boolean;
  attempts: number;
  hintsUsed: number;
  revealed: boolean;
  response: string | null;
  updatedAt: number;
}
export interface CheckResult {
  correct: number;
  total: number;
  conceptual: boolean;
  transfer: boolean;
  passed: boolean;
  at: number;
}
export interface LearningProgress {
  lessonId: string;
  contentVersion: number;
  revision: number;
  stage: Stage;
  index: number;
  checkForm: 0 | 1;
  responses: Record<string, ResponseEvidence>;
  classCompleted: boolean;
  examplesCompleted: boolean;
  completedAt: number | null;
  checkPassedAt: number | null;
  lastCheck: CheckResult | null;
  bestCheck: CheckResult | null;
  lastReview: CheckResult | null;
  reviewDueAt: number | null;
  retainedAt: number | null;
  needsSupport: boolean;
  updatedAt: number;
}
export type LearningAction =
  | {
      kind: "begin";
      stage:
        | "diagnostic"
        | "class"
        | "examples"
        | "guided"
        | "practice"
        | "check"
        | "application"
        | "review";
    }
  | { kind: "answer"; questionId: string; response: string }
  | { kind: "hint" | "reveal"; questionId: string }
  | { kind: "next" };
export interface AdventureState {
  revision: number;
  completedAt: number | null;
  attempts: number;
  inspected: boolean;
  /** Último plan probado: un valor por entrada de la aventura. */
  allocation: number[];
  feedback: string;
  updatedAt: number;
}
export type AdventureAction =
  | { kind: "inspect" }
  | { kind: "dispatch"; allocation: number[] };

/** Repaso intercalado de una unidad: mezcla problemas de las clases ya
 *  terminadas para que el estudiante tenga que elegir la estrategia. */
export interface MixedReviewState {
  unitId: UnitId;
  contentVersion: number;
  revision: number;
  /** Sesiones empezadas; decide qué problemas y en qué orden. */
  round: number;
  stage: "idle" | "active" | "summary";
  items: { lessonId: string; questionId: string }[];
  index: number;
  responses: Record<string, ResponseEvidence>;
  lastResult: CheckResult | null;
  bestResult: CheckResult | null;
  /** Primera sesión superada (premio único). */
  completedAt: number | null;
  updatedAt: number;
}

/** Evaluación de ubicación sobre el programa: una pregunta por clase, en
 *  orden, unidad por unidad; el primer fallo de una unidad marca dónde
 *  empezar en ella. No da estrellas ni marca clases como terminadas. */
export interface PlacementState {
  contentVersion: number;
  revision: number;
  stage: "idle" | "active" | "done";
  /** Preguntas planteadas en esta sesión; la última sin respuesta es la actual. */
  items: { lessonId: string; questionId: string; correct: boolean | null }[];
  /** Sesiones empezadas. */
  attempts: number;
  result: PlacementResult | null;
  updatedAt: number;
}
export interface PlacementResult {
  /** Clases respondidas bien sin ayuda: se pueden saltar. */
  mastered: string[];
  /** Por unidad, la clase donde conviene empezar (null = unidad dominada). */
  start: Partial<Record<UnitId, string | null>>;
  answered: number;
  at: number;
}
export type PlacementAction =
  | { kind: "begin" }
  | { kind: "answer"; questionId: string; response: string }
  | { kind: "skip"; questionId: string };

/** Repaso espaciado global: cola diaria que mezcla clases de todas las
 *  unidades según cuándo toca volver a cada una (cajas de Leitner). */
export interface DailyReviewState {
  contentVersion: number;
  revision: number;
  /** Por clase: caja (0–4), próxima fecha, último repaso y repasos hechos. */
  schedule: Record<string, { box: number; dueAt: number; lastAt: number; seen: number }>;
  stage: "idle" | "active" | "summary";
  /** `focus`: la clase entra por un error que se repite y la pregunta es de
   *  la misma tarea. */
  items: { lessonId: string; questionId: string; focus?: boolean }[];
  index: number;
  responses: Record<string, ResponseEvidence>;
  sessions: number;
  lastResult: { correct: number; total: number; at: number } | null;
  /** Día (America/Lima, AAAA-MM-DD) de la última sesión premiada. */
  rewardDay: string | null;
  /** Inicio de la sesión actual: una clase sube como mucho una caja por sesión. */
  startedAt: number;
  /** Días seguidos con una sesión terminada; ausente en agendas anteriores. */
  streak?: DailyStreak;
  updatedAt: number;
}

export interface DailyStreak {
  current: number;
  best: number;
  /** Último día (Lima) con sesión terminada. */
  lastDay: string | null;
  /** Semana (lunes, AAAA-MM-DD) en la que se usó el comodín. */
  freezeWeek: string | null;
}
