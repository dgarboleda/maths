import { LearningHome } from "@/components/learning/LearningHome";

export default async function LearnPage({
  params,
}: {
  params: Promise<{ childId: string }>;
}) {
  const { childId } = await params;
  return <LearningHome key={childId} childId={childId} view="learn" />;
}
