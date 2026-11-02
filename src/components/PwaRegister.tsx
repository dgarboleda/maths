"use client";

import { useEffect } from "react";

export function PwaRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    const release = process.env.NEXT_PUBLIC_RELEASE ?? "unversioned";
    navigator.serviceWorker.register(`/sw.js?v=${encodeURIComponent(release)}`, {
      scope: "/",
      updateViaCache: "none",
    }).catch((error) => console.error("No se pudo registrar la aplicación sin conexión", error));
  }, []);

  return null;
}
