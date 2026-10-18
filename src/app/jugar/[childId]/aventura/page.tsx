import { BlackoutAdventure } from "@/components/learning/BlackoutAdventure";

export default async function AdventurePage({
  params,
}: {
  params: Promise<{ childId: string }>;
}) {
  const { childId } = await params;
  return <BlackoutAdventure key={childId} childId={childId} />;
}
