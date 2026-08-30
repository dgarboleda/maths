import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Multiplicación",
};

export default function MultiplicacionLayout({
  children,
}: LayoutProps<"/jugar/[childId]/aritmetica/multiplicacion">) {
  return children;
}
