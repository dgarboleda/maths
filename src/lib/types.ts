export type Strand = "aritmetica" | "algebra" | "geometria" | "medicion" | "logica";

export type AgeBand = "3-5" | "6-7" | "8-9" | "10-11" | "12-13" | "14-17";

/** /parents/{parentId} */
export interface Parent {
  email: string;
  createdAt: number;
}

export type PlacementStatus = "pendiente" | "completo";

/** /parents/{parentId}/children/{childId} */
export interface ChildProfile {
  name: string;
  birthDate: string;
  pinHash: string;
  createdAt: number;
  /** Estado de la evaluación diagnóstica inicial. Ausente en perfiles
   * creados antes de esta función: se trata como "pendiente" pero sin
   * forzar nada — ver /jugar/[childId]/page.tsx. */
  placementStatus?: PlacementStatus;
  /** `AvatarDef.id` elegido del catálogo del Mundo (Fase 19,
   *  docs/level-editor-plan-v2.md §6.3) — preferencia de perfil, no progreso
   *  académico ni estado de mundo, por eso vive acá y no en una colección
   *  nueva. `useResolvedAvatar` decide si sigue vigente (puede haberse
   *  vuelto a bloquear, o haberse borrado del catálogo). */
  avatarId?: string;
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
  /** Cómo se llegó a dominarlo: práctica normal, o "testeado fuera" en la
   * evaluación diagnóstica inicial. Ausente en progreso previo a esta
   * distinción — se trata como "practice". */
  masteredVia?: "practice" | "placement";
}

/** /parents/{parentId}/children/{childId}/placements/{placementId} — cada
 * evaluación diagnóstica queda guardada como línea base para medir
 * evolución en evaluaciones posteriores. */
export interface PlacementStrandRecord {
  itemsAsked: number;
  itemsCorrect: number;
  highestTierPassed: number; // -1 = ni la franja más fácil se pasó
  gradeBand: string;
  /** Franjas donde falló pero luego siguió acertando más arriba — "puntos de
   * mejora" dentro de lo ya alcanzado, para el plan de la pantalla de
   * resultados. No incluye las franjas del techo (las que cerraron el hilo). */
  weakTiers: number[];
}

/** /parents/{parentId}/children/{childId}/badges/{badgeId} — se otorgan una
 * sola vez; ver src/lib/badges.ts para el catálogo y awardBadge.ts para el
 * otorgamiento. */
export interface Badge {
  earnedAt: number;
}

export interface Placement {
  startedAt: number;
  completedAt: number | null;
  perStrand: Record<string, PlacementStrandRecord>;
  overallScore: number; // 0-100
  overallGradeBand: string;
  grantedModuleIds: string[];
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
