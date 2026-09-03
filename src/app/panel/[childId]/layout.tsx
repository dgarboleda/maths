import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Currícula",
};

export default function CurriculaLayout({ children }: LayoutProps<"/panel/[childId]">) {
  return children;
}
