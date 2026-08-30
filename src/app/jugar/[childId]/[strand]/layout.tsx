import type { Metadata } from "next";
import { getStrand } from "@/lib/strands";

/*
 * Cada pantalla necesita un título propio: el anunciador de rutas de Next lee
 * document.title en cada navegación del cliente, y antes todas las pantallas
 * se anunciaban igual ("Numerario").
 *
 * La plantilla se redefine aquí porque un título de tipo cadena corta la
 * plantilla del layout padre para sus hijos: sin esto, el tema de dentro
 * ("Perímetro") se quedaba sin el sufijo del hilo y de la app.
 */
export async function generateMetadata({
  params,
}: LayoutProps<"/jugar/[childId]/[strand]">): Promise<Metadata> {
  const { strand } = await params;
  const label = getStrand(strand)?.label ?? "Practicar";
  return {
    title: { default: label, template: `%s · ${label} · Numerario` },
  };
}

export default function StrandLayout({ children }: LayoutProps<"/jugar/[childId]/[strand]">) {
  return children;
}
