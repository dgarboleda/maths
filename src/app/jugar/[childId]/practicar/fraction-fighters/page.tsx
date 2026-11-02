import { FractionFighters } from '@/components/fraction-fighters/FractionFighters';
export default async function Page({ params }: { params: Promise<{ childId: string }> }) {
  const { childId } = await params;
  return <FractionFighters key={childId} childId={childId} />;
}
