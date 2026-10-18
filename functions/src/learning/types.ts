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
  | "proportion"
  | "change"
  | "balance"
  | "equation";
export interface Lesson {
  id: string;
  version: number;
  unitId: "fracciones" | "proporcionalidad" | "algebra";
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
  allocation: [number, number, number];
  feedback: string;
  updatedAt: number;
}
export type AdventureAction =
  | { kind: "inspect" }
  | { kind: "dispatch"; allocation: [number, number, number] };
