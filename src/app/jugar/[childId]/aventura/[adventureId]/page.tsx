import { notFound } from "next/navigation";
import { AdventurePlayer } from "@/components/learning/AdventurePlayer";
import { BlackoutAdventure } from "@/components/learning/BlackoutAdventure";
import { getAdventure } from "@/lib/learning/domain";

export default async function AdventurePage({
  params,
}: {
  params: Promise<{ childId: string; adventureId: string }>;
}) {
  const { childId, adventureId } = await params;
  if (!getAdventure(adventureId)) notFound();
  // El apagón conserva su mapa propio; el resto usa el reproductor genérico.
  if (adventureId === "apagon")
    return <BlackoutAdventure key={childId} childId={childId} />;
  return (
    <AdventurePlayer
      key={`${childId}/${adventureId}`}
      childId={childId}
      adventureId={adventureId}
    />
  );
}
