import { EstacionProporcion } from '@/components/estacion-proporcion/EstacionProporcion';

export default async function Page({ params }: { params: Promise<{ childId: string }> }) {
  const { childId } = await params;
  return <EstacionProporcion key={childId} childId={childId} />;
}
