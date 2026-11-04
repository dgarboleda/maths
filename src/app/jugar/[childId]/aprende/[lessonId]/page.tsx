import { LessonPlayer } from "@/components/learning/LessonPlayer";
import { SessionPlayer } from "@/components/learning/SessionPlayer";
import { getLesson } from "@/lib/learning/domain";

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
  if (lessonId === "diario" || lessonId === "ubicacion" || lessonId.startsWith("repaso-"))
    return <SessionPlayer key={`${childId}/${lessonId}`} childId={childId} sessionId={lessonId} />;
  return (
    <LessonPlayer
      key={`${childId}/${lessonId}/${modo ?? ""}`}
      childId={childId}
      lessonId={lessonId}
      // Solo esta clase viaja al navegador, como dato serializado.
      lesson={getLesson(lessonId)}
      requestedStage={modo === "practice" || modo === "review" ? modo : null}
    />
  );
}
