import { getLesson, LESSONS, recommendedLesson, type LearningProgress, type PlacementState } from "./domain";

/** Una preferencia familiar, nunca una acreditación ni un candado. */
export function plannedLessonIds(value: unknown): string[] {
  if (!value || typeof value !== "object") return [];
  const ids = (value as { lessonIds?: unknown }).lessonIds;
  if (!Array.isArray(ids)) return [];
  const chosen = new Set(ids.filter((id): id is string => typeof id === "string"));
  return LESSONS.filter((lesson) => chosen.has(lesson.id)).map((lesson) => lesson.id);
}

export function nextStudyLesson(progress: Record<string, LearningProgress>, placement: PlacementState | null, plan: unknown) {
  const active = Object.values(progress).filter((p) => getLesson(p.lessonId) && p.stage !== "summary")
    .sort((a, b) => b.updatedAt - a.updatedAt)[0];
  if (active) return getLesson(active.lessonId)!;
  const completed = new Set(LESSONS.filter((lesson) => progress[lesson.id]?.completedAt).map((lesson) => lesson.id));
  const known = new Set([...completed, ...(placement?.result?.mastered ?? [])]);
  function withBases(id: string, visited = new Set<string>()): ReturnType<typeof getLesson> {
    if (known.has(id) || visited.has(id)) return;
    visited.add(id);
    const lesson = getLesson(id);
    if (!lesson) return;
    for (const base of lesson.prerequisites) {
      const needed = withBases(base, visited);
      if (needed) return needed;
    }
    return lesson;
  }
  for (const id of plannedLessonIds(plan)) {
    const next = withBases(id);
    if (next) return next;
  }
  return recommendedLesson(completed, placement?.result ?? null) ?? LESSONS[0];
}
