import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Editor de niveles",
};

export default function LevelEditorLayout({ children }: LayoutProps<"/panel/editor/[levelId]">) {
  return children;
}
