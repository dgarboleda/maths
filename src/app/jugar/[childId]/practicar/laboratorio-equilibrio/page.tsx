import { LaboratorioEquilibrio } from '@/components/laboratorio-equilibrio/LaboratorioEquilibrio';
export default async function Page({ params }: { params: Promise<{ childId: string }> }) {
  const { childId } = await params;
  return <LaboratorioEquilibrio key={childId} childId={childId} />;
}
