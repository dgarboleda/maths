import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "¿Quién va a jugar?",
};

export default function PerfilesLayout({ children }: LayoutProps<"/perfiles">) {
  return children;
}
