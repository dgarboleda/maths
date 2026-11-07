import { GeoCraft } from '@/components/geocraft/GeoCraft';

export default async function Page({ params }: { params: Promise<{ childId: string }> }) {
  const { childId } = await params;
  return <GeoCraft key={childId} childId={childId} />;
}
