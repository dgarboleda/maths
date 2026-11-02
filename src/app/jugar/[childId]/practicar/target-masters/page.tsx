import { TargetMasters } from '@/components/target/TargetMasters';

export default async function Page({ params }: { params: Promise<{ childId: string }> }) {
  const { childId } = await params;
  return <TargetMasters key={childId} childId={childId} />;
}
