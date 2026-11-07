import { CodeBreaker } from '@/components/codebreaker/CodeBreaker';
export default async function Page({ params }: { params: Promise<{ childId: string }> }) {
  const { childId } = await params;
  return <CodeBreaker key={childId} childId={childId} />;
}
