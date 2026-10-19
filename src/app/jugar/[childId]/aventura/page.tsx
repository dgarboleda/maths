import { AdventureIndex } from "@/components/learning/AdventureIndex";

export default async function AdventuresPage({
  params,
}: {
  params: Promise<{ childId: string }>;
}) {
  const { childId } = await params;
  return <AdventureIndex key={childId} childId={childId} />;
}
