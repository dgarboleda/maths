"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { signOut } from "firebase/auth";
import { useAuth } from "@/lib/AuthProvider";
import { getFirebase } from "@/lib/firebase";
import { acceptLegalTerms, acceptLegalTermsErrorMessage, hasCurrentConsent } from "@/lib/legal";
import { ConsentCheckbox } from "./ConsentCheckbox";

type Status = "checking" | "ok" | "needed";

/**
 * Errores que indican que el servidor no puede registrar la aceptación (la
 * función aún no existe, otra versión de los textos, Functions caído), no que
 * la persona no tenga permiso. Un callable inexistente responde 404 sin CORS,
 * que el SDK reporta como `functions/internal`.
 */
const BACKEND_BEHIND = new Set([
  "functions/not-found",
  "functions/internal",
  "functions/unavailable",
  "functions/unimplemented",
  "functions/deadline-exceeded",
]);

export function backendBehind(err: unknown): boolean {
  return BACKEND_BEHIND.has((err as { code?: string })?.code ?? "");
}

/**
 * Las cuentas familiares sin la aceptación de la versión vigente (anteriores a
 * los textos legales o a un cambio de versión) no ven el panel ni los perfiles
 * hasta aceptarla. Las sesiones propias de un hijo no pasan por aquí.
 */
export function LegalConsentGate({ children }: { children: ReactNode }) {
  const { user, role, loading } = useAuth();
  const uid = user && role === "parent" ? user.uid : null;
  const [checked, setChecked] = useState<{ uid: string; ok: boolean } | null>(null);
  const [accept, setAccept] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!uid) return;
    let cancelled = false;
    getFirebase()
      .then(async ({ db, firestore: { doc, getDoc } }) => hasCurrentConsent((await getDoc(doc(db, "parents", uid))).data()))
      .then((ok) => { if (!cancelled) setChecked({ uid, ok }); })
      .catch((err) => {
        // Sin conexión no se bloquea a la familia: se vuelve a comprobar al recargar.
        console.error("No se pudo comprobar la aceptación de los términos", err);
        if (!cancelled) setChecked({ uid, ok: true });
      });
    return () => { cancelled = true; };
  }, [uid]);

  const status: Status = loading || (uid && checked?.uid !== uid) ? "checking" : !uid || checked?.ok ? "ok" : "needed";
  if (status === "ok") return children;
  if (status === "checking") {
    return (
      <main id="contenido" tabIndex={-1} className="flex min-h-screen w-full items-center justify-center bg-slate-950">
        <p role="status" className="text-indigo-200">Cargando…</p>
      </main>
    );
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!accept || !uid) return;
    setSubmitting(true);
    setError(null);
    try {
      await acceptLegalTerms();
      setChecked({ uid, ok: true });
    } catch (err) {
      console.error("No se pudo registrar la aceptación", err);
      if (backendBehind(err)) {
        // La web puede publicarse antes que Functions (Workers despliega al
        // fusionar; Firebase, con `npm run deploy`). La familia ya marcó la
        // casilla: entra en esta visita y la próxima vez se vuelve a pedir,
        // hasta que el servidor pueda registrarla.
        setChecked({ uid, ok: true });
        return;
      }
      setError(acceptLegalTermsErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main id="contenido" tabIndex={-1} className="flex min-h-screen w-full items-center justify-center bg-slate-950 p-4">
      <form onSubmit={handleSubmit} className="family-panel w-full max-w-md space-y-4 rounded-3xl border border-indigo-500/25 p-6">
        <h1 className="font-display text-xl font-bold text-white">Antes de continuar</h1>
        <p className="text-sm text-slate-300">
          Actualizamos los términos de uso y la política de privacidad. Para seguir usando la cuenta familiar, léelos y acéptalos.
        </p>
        <ConsentCheckbox checked={accept} onChange={setAccept} />
        {error && <p role="alert" className="text-sm font-bold text-red-400">{error}</p>}
        <div className="flex flex-wrap items-center gap-4">
          <button
            type="submit"
            disabled={!accept || submitting}
            className="min-h-11 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-5 text-sm font-bold text-white disabled:opacity-50"
          >
            {submitting ? "Guardando…" : "Aceptar y continuar"}
          </button>
          <button
            type="button"
            onClick={() => getFirebase().then(({ auth }) => signOut(auth)).catch(console.error)}
            className="min-h-11 text-sm font-bold text-slate-400"
          >
            Cerrar sesión
          </button>
        </div>
      </form>
    </main>
  );
}
