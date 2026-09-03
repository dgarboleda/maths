import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Evaluación inicial",
};

export default function EvaluacionLayout({
  children,
}: LayoutProps<"/jugar/[childId]/evaluacion">) {
  return children;
}
