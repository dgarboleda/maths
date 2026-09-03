import type { Metadata } from "next";
import { getModule } from "@/lib/curriculum";

export async function generateMetadata({
  params,
}: LayoutProps<"/jugar/[childId]/[strand]/[moduleId]">): Promise<Metadata> {
  const { moduleId } = await params;
  const mod = getModule(moduleId);
  if (!mod) return { title: "Tema" };
  // El sufijo (hilo · Numerario) lo pone la plantilla del layout del hilo.
  return { title: mod.label };
}

export default function TopicLayout({
  children,
}: LayoutProps<"/jugar/[childId]/[strand]/[moduleId]">) {
  return children;
}
