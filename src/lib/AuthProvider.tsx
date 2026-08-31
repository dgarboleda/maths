"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { getFirebase } from "@/lib/firebase";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextValue>({ user: null, loading: true });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    let cancelled = false;
    getFirebase()
      .then(({ auth }) => {
        if (cancelled) return;
        unsubscribe = onAuthStateChanged(auth, (u) => {
          setUser(u);
          setLoading(false);
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

  return <AuthContext.Provider value={{ user, loading }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
