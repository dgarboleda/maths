import { LessonPlayer } from "@/components/learning/LessonPlayer";
import { MixedReviewPlayer } from "@/components/learning/MixedReviewPlayer";

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
  if (lessonId.startsWith("repaso-"))
    return <MixedReviewPlayer key={`${childId}/${lessonId}`} childId={childId} reviewId={lessonId} />;
  return (
    <LessonPlayer
      key={`${childId}/${lessonId}/${modo ?? ""}`}
      childId={childId}
      lessonId={lessonId}
      requestedStage={modo === "practice" || modo === "review" ? modo : null}
    />
  );
}
