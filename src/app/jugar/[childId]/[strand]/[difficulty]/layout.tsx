import type { Metadata } from "next";
import { getStrand } from "@/lib/strands";
import { getTopicLabel } from "@/lib/topics";

export async function generateMetadata({
  params,
}: LayoutProps<"/jugar/[childId]/[strand]/[difficulty]">): Promise<Metadata> {
  const { strand, difficulty } = await params;
  const strandDef = getStrand(strand);
  if (!strandDef) return { title: "Tema" };
  const topic = getTopicLabel(strandDef.slug, Number(difficulty));
  return { title: `${topic.title} · ${strandDef.label}` };
}

export default function TopicLayout({
  children,
}: LayoutProps<"/jugar/[childId]/[strand]/[difficulty]">) {
  return children;
}
