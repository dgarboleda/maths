import type { Metadata } from "next";
import { FormularioSheet } from "@/components/learning/FormularioSheet";

export const metadata: Metadata = {
  title: "Formulario",
};

export default async function FormularioPage({
  params,
  searchParams,
}: {
  params: Promise<{ childId: string }>;
  searchParams: Promise<{ unidad?: string | string[] }>;
}) {
  const [{ childId }, { unidad }] = await Promise.all([params, searchParams]);
  return <FormularioSheet childId={childId} unitId={typeof unidad === "string" ? unidad : undefined} />;
}
