import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Diario de misiones",
};

export default function MisionesLayout({ children }: LayoutProps<"/jugar/[childId]/misiones">) {
  return children;
}
