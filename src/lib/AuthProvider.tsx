"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { onIdTokenChanged, type User } from "firebase/auth";
import { getFirebase } from "@/lib/firebase";

/**
 * Claims del token de un hijo (Fase "sesión propia del niño"): las emite
 * `verifyChildPin` (Cloud Function, `functions/src/index.ts`) al crear el
 * custom token, nunca el cliente. `parentId` es la familia dueña de los
 * datos — el `uid` real de la sesión es sintético
 * (`child:{parentId}:{childId}`), así que TODO lo que hoy asume
 * `user.uid === parentId` tiene que leer `parentId` de acá en vez de
 * `user.uid` para seguir funcionando quien juegue desde su propio
 * dispositivo, sin la sesión del padre.
 */
interface AuthContextValue {
  user: User | null;
  loading: boolean;
  /** "parent" cuando `user.uid` es la cuenta real del padre; "child" cuando
   *  es una sesión propia de un hijo (custom token); null sin sesión. */
  role: "parent" | "child" | null;
  /** Dueño real de los datos en Firestore/Storage — `user.uid` para una
   *  sesión de padre, el `parentId` del claim para una sesión de hijo. Todo
   *  código bajo `/jugar/**` debe usar ESTO, nunca `user.uid` a secas. */
  parentId: string | undefined;
  /** Solo presente en una sesión de hijo. */
  childId: string | undefined;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  role: null,
  parentId: undefined,
  childId: undefined,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [claims, setClaims] = useState<{ role: "parent" | "child" | null; parentId?: string; childId?: string }>({
    role: null,
  });

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    let cancelled = false;
    getFirebase()
      .then(({ auth }) => {
        if (cancelled) return;
        // `onIdTokenChanged` (no `onAuthStateChanged`): los claims del rol
        // ("child" + parentId/childId) solo están disponibles en el ID
        // token, y este evento es el que se dispara también justo después
        // de `signInWithCustomToken`.
        unsubscribe = onIdTokenChanged(auth, (u) => {
          setUser(u);
          if (!u) {
            setClaims({ role: null });
            setLoading(false);
            return;
          }
          u.getIdTokenResult()
            .then((result) => {
              const role = result.claims.role === "child" ? "child" : "parent";
              setClaims({
                role,
                parentId: role === "child" ? (result.claims.parentId as string | undefined) : u.uid,
                childId: role === "child" ? (result.claims.childId as string | undefined) : undefined,
              });
            })
            .catch((err) => {
              console.error("No se pudieron leer los claims de la sesión", err);
              setClaims({ role: "parent", parentId: u.uid });
            })
            .finally(() => setLoading(false));
        });
      })
      .catch((err) => {
        // Si Firebase no carga (p. ej. configuración inválida en el
        // despliegue), no dejar la app cargando para siempre.
        console.error("No se pudo inicializar Firebase", err);
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, loading, role: claims.role, parentId: claims.parentId, childId: claims.childId }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
