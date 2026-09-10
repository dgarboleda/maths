"use client";

import type { ReactNode } from "react";
import { useAuth } from "@/lib/AuthProvider";
import { useCustomCurriculum } from "@/lib/curriculum/useCustomCurriculum";

/**
 * Hidrata el registro de módulos personalizados (Fase 20,
 * docs/level-editor-plan-v2.md §7.1) antes de renderizar cualquier pantalla
 * de `/jugar/{childId}/**` — mismo gate que `FamilyProvider` para
 * `/panel/**`. `getModule("cst-x")` es síncrono: sin este gate, el primer
 * render de un nivel con un desafío personalizado vería `undefined` y
 * rompería (`ConceptoGeneric`, `EjemplosTab`, el runtime de niveles…).
 *
 * `useAuth` alcanza para el `parentId`: la sesión del dispositivo siempre es
 * la del padre (ver la nota en `firestore.rules`), así que `user.uid` ES el
 * dueño de los módulos personalizados de esta familia.
 */
export default function JugarChildLayout({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const { ready } = useCustomCurriculum(user?.uid);

  // Mientras no se sabe si hay sesión (o no la hay), se deja pasar a
  // `children` sin tocar nada: cada pantalla ya tiene su propio efecto de
  // redirección a /login (ver p. ej. `page.tsx`), y bloquear acá lo
  // rompería (el efecto nunca llegaría a montarse). Solo una vez que HAY
  // sesión tiene sentido esperar a que la currícula personalizada esté
  // hidratada.
  if (!loading && user && !ready) {
    return (
      <main id="contenido" tabIndex={-1} className="flex min-h-screen w-full items-center justify-center bg-slate-950">
        <p role="status" className="text-slate-300">
          Cargando…
        </p>
      </main>
    );
  }

  return children;
}
