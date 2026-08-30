import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pirámide numérica",
};

export default function PiramideLayout({
  children,
}: LayoutProps<"/jugar/[childId]/piramide">) {
  return children;
}
