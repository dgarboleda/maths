import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Boss Challenge",
};

export default function BossLayout({ children }: LayoutProps<"/jugar/[childId]/boss">) {
  return children;
}
