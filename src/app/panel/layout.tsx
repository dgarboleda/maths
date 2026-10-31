import type { Metadata } from "next";
import { PanelShell } from "@/components/family/PanelShell";
import { LegalConsentGate } from "@/components/legal/LegalConsentGate";

export const metadata: Metadata = {
  title: "Panel de padre",
};

export default function PanelLayout({ children }: LayoutProps<"/panel">) {
  return (
    <LegalConsentGate>
      <PanelShell>{children}</PanelShell>
    </LegalConsentGate>
  );
}
