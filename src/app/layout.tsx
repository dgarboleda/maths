import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { AuthProvider } from "@/lib/AuthProvider";
import { PwaRegister } from "@/components/PwaRegister";
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
  description: "Clases de matemáticas para adolescentes: comprende las ideas, practica con ayuda y aplica lo aprendido en una aventura.",
  applicationName: "Math Quest",
  appleWebApp: { capable: true, title: "Math Quest", statusBarStyle: "black-translucent" },
  icons: { apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }] },
};

export const viewport: Viewport = { themeColor: "#0f172a" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${quicksand.variable} ${spaceGrotesk.variable} h-dvh antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <a className="skip-link" href="#contenido">
          Saltar al contenido
        </a>
        <PwaRegister />
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
