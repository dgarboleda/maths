import type { Metadata } from "next";
import { getStrand } from "@/lib/strands";

/*
 * Cada pantalla necesita un título propio: el anunciador de rutas de Next lee
 * document.title en cada navegación del cliente, y antes todas las pantallas
 * se anunciaban igual ("Numerario").
 */
export async function generateMetadata({
  params,
}: LayoutProps<"/jugar/[childId]/[strand]">): Promise<Metadata> {
  const { strand } = await params;
  return { title: getStrand(strand)?.label ?? "Practicar" };
}

export default function StrandLayout({ children }: LayoutProps<"/jugar/[childId]/[strand]">) {
  return children;
}
