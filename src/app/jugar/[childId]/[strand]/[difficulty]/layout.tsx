import type { Metadata } from "next";
import { getStrand } from "@/lib/strands";
import { getTopicLabel } from "@/lib/topics";

export async function generateMetadata({
  params,
}: LayoutProps<"/jugar/[childId]/[strand]/[difficulty]">): Promise<Metadata> {
  const { strand, difficulty } = await params;
  const strandDef = getStrand(strand);
  if (!strandDef) return { title: "Tema" };
  // El sufijo (hilo · Numerario) lo pone la plantilla del layout del hilo.
  return { title: getTopicLabel(strandDef.slug, Number(difficulty)).title };
}

export default function TopicLayout({
  children,
}: LayoutProps<"/jugar/[childId]/[strand]/[difficulty]">) {
  return children;
}
