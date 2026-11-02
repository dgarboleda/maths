"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useAuth } from "@/lib/AuthProvider";

/**
 * Enlace a `/perfiles` solo para la sesión familiar. Una sesión infantil no
 * puede elegir otro perfil (`/perfiles` la devuelve a su juego), así que ahí
 * el enlace no se muestra o, con `childFallback`, lleva a su inicio para que
 * las pantallas de error no queden sin salida.
 */
export function ProfilesLink({
  className,
  children,
  childFallback,
}: {
  className?: string;
  children: ReactNode;
  childFallback?: ReactNode;
}) {
  const { role } = useAuth();
  if (role === "child") {
    return childFallback ? (
      <Link href="/" className={className}>
        {childFallback}
      </Link>
    ) : null;
  }
  return (
    <Link href="/perfiles" className={className}>
      {children}
    </Link>
  );
}
