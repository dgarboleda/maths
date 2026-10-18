import { LessonPlayer } from "@/components/learning/LessonPlayer";

export default async function LessonPage({
  params,
  searchParams,
}: {
  params: Promise<{ childId: string; lessonId: string }>;
  searchParams: Promise<{ modo?: string }>;
}) {
  const [{ childId, lessonId }, { modo }] = await Promise.all([
    params,
    searchParams,
  ]);
  return (
    <LessonPlayer
      key={`${childId}/${lessonId}/${modo ?? ""}`}
      childId={childId}
      lessonId={lessonId}
      requestedStage={modo === "practice" || modo === "review" ? modo : null}
    />
  );
}
