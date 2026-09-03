import type { Metadata } from "next";
import { Space_Grotesk, Quicksand } from "next/font/google";
import { AuthProvider } from "@/lib/AuthProvider";
import "./globals.css";

/*
 * Solo se cargan las dos familias que la interfaz usa de verdad. Antes se
 * cargaban Geist y Geist Mono aquí y, además, Fredoka y Quicksand desde
 * GameShell: cuatro familias descargadas para renderizar dos, porque el
 * `body` de globals.css pisaba la fuente con Arial.
 *
 * Fredoka (muy redonda, propia de apps para niños pequeños) se reemplazó
 * por Space Grotesk para los títulos: geométrica y directa, más acorde a
 * un público preadolescente sin perder cercanía.
 */
const quicksand = Quicksand({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-quicksand",
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-space-grotesk",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Math Quest",
    template: "%s · Math Quest",
  },
  description: "Matemáticas en espiral, de 3 a 17 años, con recompensas por estrellas.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${quicksand.variable} ${spaceGrotesk.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <a className="skip-link" href="#contenido">
          Saltar al contenido
        </a>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
