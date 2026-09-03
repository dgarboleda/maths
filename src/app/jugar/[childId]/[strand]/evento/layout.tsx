import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Código secreto",
};

export default function EventoLayout({ children }: LayoutProps<"/jugar/[childId]/[strand]/evento">) {
  return children;
}
