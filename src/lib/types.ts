export type Strand = "aritmetica" | "algebra" | "geometria" | "medicion" | "logica";

export type AgeBand = "3-5" | "6-7" | "8-9" | "10-11" | "12-13" | "14-17";

/** /parents/{parentId} */
export interface Parent {
  email: string;
  createdAt: number;
}

/** /parents/{parentId}/children/{childId} */
export interface ChildProfile {
  name: string;
  birthDate: string;
  pinHash: string;
  createdAt: number;
}

/** /curriculum/{skillId} — catálogo de solo lectura, sembrado aparte */
export interface CurriculumSkill {
  strand: Strand;
  band: AgeBand;
  title: string;
  difficulty: number; // 1-10, fija el valor en estrellas del problema
  order: number;
}

/** /parents/{parentId}/children/{childId}/skillsProgress/{strand}-d{difficulty} */
export interface SkillProgress {
  recentResults: Array<{ correct: boolean; day: string }>; // ventana móvil, más reciente al final
  recentAccuracy: number; // 0-1, derivado de recentResults
  masteredAt: number | null;
}

/** /parents/{parentId}/children/{childId}/attempts/{attemptId} */
export interface Attempt {
  skillId: string;
  itemId: string;
  correct: boolean;
  createdAt: number;
}

export type StarReason =
  | "problem_solved"
  | "streak_bonus"
  | "boss_level"
  | "redemption";

/** /parents/{parentId}/children/{childId}/starLedger/{entryId} — solo agregar, nunca sobrescribir */
export interface StarLedgerEntry {
  delta: number; // negativo en canjes
  reason: StarReason;
  attemptId: string | null;
  createdAt: number;
}

export type RedemptionStatus = "pendiente" | "aprobado" | "rechazado";

/** /parents/{parentId}/children/{childId}/redemptionRequests/{requestId} */
export interface RedemptionRequest {
  starsSpent: number;
  rewardLabel: string;
  status: RedemptionStatus;
  createdAt: number;
  resolvedAt: number | null;
}
