import type { Metadata } from "next";
import { PanelShell } from "@/components/family/PanelShell";

export const metadata: Metadata = {
  title: "Panel de padre",
};

export default function PanelLayout({ children }: LayoutProps<"/panel">) {
  return <PanelShell>{children}</PanelShell>;
}
