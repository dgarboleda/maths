"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthProvider";

export default function Home() {
  const { user, loading, role, childId } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) router.replace("/login");
    else if (role === "child" && childId) router.replace(`/jugar/${encodeURIComponent(childId)}`);
    else if (role === "parent") router.replace("/perfiles");
  }, [user, loading, role, childId, router]);

  return (
    <main id="contenido"
        tabIndex={-1} className="flex h-dvh w-full items-center justify-center bg-white">
      <p role="status" className="text-neutral-700">
        Cargando…
      </p>
    </main>
  );
}
