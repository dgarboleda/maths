import type { Metadata } from "next";
import localFont from "next/font/local";
import { AuthProvider } from "@/lib/AuthProvider";
import "./globals.css";

// Archivos incluidos en el repositorio: el arranque y la compilación no
// dependen del descargador de Google Fonts de Turbopack (fallo e2e #83).
// Se conservan las familias y pesos de la interfaz. Licencias: ./fonts/.
const quicksand = localFont({
  src: "./fonts/quicksand-latin-variable.woff2",
  weight: "500 700",
  style: "normal",
  variable: "--font-quicksand",
  display: "swap",
});

const spaceGrotesk = localFont({
  src: "./fonts/space-grotesk-latin-variable.woff2",
  weight: "500 700",
  style: "normal",
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
