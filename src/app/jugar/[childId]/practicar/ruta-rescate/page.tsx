import { RutaRescate } from '@/components/ruta-rescate/RutaRescate';
export default async function Page({ params }: { params: Promise<{ childId: string }> }) {
  const { childId } = await params;
  return <RutaRescate key={childId} childId={childId} />;
}
