"use client";

import { useEffect } from "react";
import { reportError } from "@/lib/reportError";

/**
 * Última red de seguridad — Fase 23 (docs/plan-salto-producto.md §1.2):
 * captura un fallo en el layout raíz mismo (algo que ni `error.tsx` puede
 * atrapar, porque `error.tsx` no envuelve el `layout.tsx` de su propio
 * segmento). Reemplaza el documento entero mientras está activo, así que
 * NO recibe `globals.css` ni las fuentes de `layout.tsx` — de ahí los
 * estilos inline y la tipografía del sistema en vez de Quicksand/Space
 * Grotesk.
 */
export default function GlobalError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    reportError(error, "root");
  }, [error]);

  return (
    <html lang="es">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
          background: "#020617",
          color: "#f1f5f9",
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        <div style={{ maxWidth: 420, textAlign: "center" }}>
          <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Algo se rompió</h1>
          <p style={{ fontSize: 14, color: "#94a3b8", marginBottom: 20 }}>
            Math Quest tuvo un problema inesperado. Podés intentar de nuevo.
          </p>
          <button
            type="button"
            onClick={() => retry()}
            style={{
              minHeight: 44,
              padding: "0 20px",
              borderRadius: 12,
              border: "none",
              background: "linear-gradient(to right, #7c3aed, #d946ef)",
              color: "#fff",
              fontSize: 14,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Reintentar
          </button>
        </div>
      </body>
    </html>
  );
}
