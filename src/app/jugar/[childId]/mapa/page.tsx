import { LearningMap } from "@/components/learning/LearningMap";

export default async function MapPage({ params }: { params: Promise<{ childId: string }> }) {
  const { childId } = await params;
  return <LearningMap key={childId} childId={childId} />;
}
