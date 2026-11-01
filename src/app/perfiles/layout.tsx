import type { Metadata } from "next";
import { LegalConsentGate } from "@/components/legal/LegalConsentGate";

export const metadata: Metadata = {
  title: "¿Quién va a jugar?",
};

export default function PerfilesLayout({ children }: LayoutProps<"/perfiles">) {
  return <LegalConsentGate>{children}</LegalConsentGate>;
}
