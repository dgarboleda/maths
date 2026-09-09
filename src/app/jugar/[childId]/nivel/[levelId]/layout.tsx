import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Math Quest",
};

export default function JugarNivelLayout({ children }: LayoutProps<"/jugar/[childId]/nivel/[levelId]">) {
  return children;
}
