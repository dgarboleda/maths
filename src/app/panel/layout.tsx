import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Panel de padre",
};

export default function PanelLayout({ children }: LayoutProps<"/panel">) {
  return children;
}
