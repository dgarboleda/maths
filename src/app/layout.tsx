import type { Metadata } from "next";
import { Fredoka, Quicksand } from "next/font/google";
import { AuthProvider } from "@/lib/AuthProvider";
import "./globals.css";

/*
 * Solo se cargan las dos familias que la interfaz usa de verdad. Antes se
 * cargaban Geist y Geist Mono aquí y, además, Fredoka y Quicksand desde
 * GameShell: cuatro familias descargadas para renderizar dos, porque el
 * `body` de globals.css pisaba la fuente con Arial.
 */
const quicksand = Quicksand({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-quicksand",
  display: "swap",
});

const fredoka = Fredoka({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-fredoka",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Numerario",
    template: "%s · Numerario",
  },
  description: "Matemáticas en espiral, de 3 a 17 años, con recompensas por estrellas.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${quicksand.variable} ${fredoka.variable} h-full antialiased`}
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
