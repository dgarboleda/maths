import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Mapa de aprendizaje · Maths",
};

export default function JugarMapaLayout({ children }: LayoutProps<"/jugar/[childId]/mapa">) {
  return children;
}
