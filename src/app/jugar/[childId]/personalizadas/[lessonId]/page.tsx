import { CustomLessonPlayer } from "@/components/custom-lessons/CustomLessonPlayer";
export default async function Page({ params }: { params: Promise<{ childId: string; lessonId: string }> }) {
  const { childId, lessonId } = await params;
  return <CustomLessonPlayer childId={childId} lessonId={lessonId} />;
}
