import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Math Quest",
};

export default function JugarMapaLayout({ children }: LayoutProps<"/jugar/[childId]/mapa">) {
  return children;
}
