"use client";

import { useState, type FormEvent } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { getFirebase } from "@/lib/firebase";
import { acceptLegalTerms } from "@/lib/legal";
import { ConsentCheckbox } from "@/components/legal/ConsentCheckbox";

export default function LoginPage() {
  const [mode, setMode] = useState<"login" | "signup" | "reset">("login");
  const [consent, setConsent] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    if (mode === "signup" && !consent) {
      setError("Para crear la cuenta debes aceptar los términos y la política de privacidad.");
      return;
    }
    setSubmitting(true);
    try {
      const {
        auth,
        db,
        firestore: { doc, serverTimestamp, setDoc },
      } = await getFirebase();
      if (mode === "reset") {
        // Mismo mensaje exista o no la cuenta: no revela qué correos están registrados.
        await sendPasswordResetEmail(auth, email).catch((err: { code?: string }) => {
          if (!err.code?.includes("user-not-found")) throw err;
        });
        setNotice("Si hay una cuenta con ese correo, te enviamos un enlace para crear una contraseña nueva. Revisa también la carpeta de spam.");
        return;
      }
      if (mode === "signup") {
        const credential = await createUserWithEmailAndPassword(auth, email, password);
        await setDoc(doc(db, "parents", credential.user.uid), {
          email: credential.user.email,
          createdAt: serverTimestamp(),
        });
        // Si esto falla, LegalConsentGate lo vuelve a pedir al entrar.
        await acceptLegalTerms().catch((err) => console.error("No se pudo registrar la aceptación", err));
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      router.replace("/perfiles");
    } catch (err) {
      setError(mensajeDeError(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main
      id="contenido"
      tabIndex={-1}
      className="min-h-screen bg-slate-950 lg:grid lg:grid-cols-[1.1fr_1fr]"
    >
      <h1 className="sr-only">Math Quest</h1>

      {/* Panel de mundo (desktop): la aventura asoma desde el login. */}
      <aside className="family-hero-vignette relative hidden overflow-hidden lg:block" aria-hidden="true">
        <Image src="/illustrations/city-central.webp" alt="" fill priority sizes="45vw" className="object-cover" />
        <div className="relative flex h-full flex-col justify-between p-10">
          <Brand />
          <div className="max-w-md space-y-4 pb-8">
            <h2 className="family-text-glow font-display text-3xl font-bold leading-tight text-white">
              La ciudad está a oscuras. La matemática es la llave.
            </h2>
            <p className="text-sm leading-relaxed text-indigo-200/80">
              Misiones de aventura donde cada problema resuelto enciende luces, abre puertas y
              desbloquea zonas nuevas. Cuando entres, tus hijos eligen su perfil y su PIN.
            </p>
            <ul className="flex flex-wrap gap-2">
              <FeatureChip icon="⚔️">Misiones jugables</FeatureChip>
              <FeatureChip icon="🗺️">Mundos por desbloquear</FeatureChip>
              <FeatureChip icon="🎁">Recompensas en familia</FeatureChip>
            </ul>
          </div>
        </div>
      </aside>

      {/* Columna de acceso */}
      <section className="flex min-h-screen flex-col px-4 py-6 sm:px-8">
        <div className="lg:hidden">
          <Brand />
        </div>
        <div className="flex flex-1 items-center justify-center py-8">
          <div className="w-full max-w-sm space-y-4">
            <header className="space-y-1">
              <h2 className="font-display text-2xl font-bold text-white">Panel familiar</h2>
              <p className="text-sm text-indigo-200/80">
                {mode === "login"
                  ? "Entra para ver el progreso y las recompensas de tus hijos."
                  : mode === "signup"
                    ? "Crea tu cuenta de padre o madre para empezar la aventura."
                    : "Escribe el correo de tu cuenta y te enviaremos un enlace para crear una contraseña nueva."}
              </p>
            </header>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="space-y-1.5">
                <label htmlFor="login-email" className="text-xs font-bold uppercase tracking-wide text-indigo-300">
                  Correo electrónico
                </label>
                <input
                  id="login-email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`family-input${error ? " has-error" : ""}`}
                />
              </div>
              {mode !== "reset" && <div className="space-y-1.5">
                <label htmlFor="login-pass" className="text-xs font-bold uppercase tracking-wide text-indigo-300">
                  Contraseña
                </label>
                <input
                  id="login-pass"
                  type="password"
                  required
                  minLength={6}
                  autoComplete={mode === "signup" ? "new-password" : "current-password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="········"
                  className={`family-input${error ? " has-error" : ""}`}
                />
              </div>}

              {mode === "signup" && <ConsentCheckbox checked={consent} onChange={setConsent} />}

              {notice && (
                <p role="status" className="rounded-xl bg-emerald-500/10 px-3.5 py-2.5 text-sm font-semibold text-emerald-200">
                  {notice}
                </p>
              )}

              {error && (
                <p
                  role="alert"
                  className="anim-shake rounded-xl bg-red-500/10 px-3.5 py-2.5 text-sm font-semibold text-red-300"
                >
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={submitting || (mode === "signup" && !consent)}
                className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 font-display text-sm font-bold uppercase tracking-wide text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {submitting
                  ? "Un momento…"
                  : mode === "login"
                    ? "Entrar al panel"
                    : mode === "signup"
                      ? "Crear cuenta"
                      : "Enviar enlace"}
              </button>
            </form>

            {mode === "login" && (
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setNotice(null);
                  setMode("reset");
                }}
                className="block min-h-11 w-full text-center text-sm font-semibold text-indigo-200 underline-offset-4 hover:underline"
              >
                ¿Olvidaste tu contraseña?
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setError(null);
                setNotice(null);
                setMode(mode === "login" ? "signup" : "login");
              }}
              className="block min-h-11 w-full text-center text-sm font-semibold text-cyan-300 underline-offset-4 hover:underline"
            >
              {mode === "login" ? "¿No tienes cuenta? Créala" : mode === "signup" ? "¿Ya tienes cuenta? Entra" : "Volver a entrar"}
            </button>

            <p className="rounded-xl border border-dashed border-indigo-500/30 px-3.5 py-2.5 text-center text-xs text-indigo-300/80">
              ¿Va a jugar un explorador o exploradora? Entra primero como madre o padre; después
              eligen su perfil y su PIN.
            </p>

            <nav aria-label="Información legal" className="flex justify-center gap-4 text-xs text-indigo-300/80">
              <Link href="/privacidad" className="underline-offset-4 hover:underline">Privacidad</Link>
              <Link href="/terminos" className="underline-offset-4 hover:underline">Términos</Link>
            </nav>
          </div>
        </div>
      </section>
    </main>
  );
}

function Brand() {
  return (
    <div className="flex items-center gap-2.5">
      <span className="grid size-10 place-items-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-lg">
        <span aria-hidden="true" className="text-lg">✨</span>
      </span>
      <span>
        <span className="block font-display text-lg font-bold leading-none tracking-wide text-white">
          MATH QUEST
        </span>
        <span className="block text-[11px] font-semibold uppercase tracking-[0.2em] text-indigo-300">
          Aventura matemática
        </span>
      </span>
    </div>
  );
}

function FeatureChip({ icon, children }: { icon: string; children: React.ReactNode }) {
  return (
    <li className="inline-flex items-center gap-1.5 rounded-full border border-indigo-400/30 bg-slate-900/50 px-3 py-1.5 text-xs font-bold text-indigo-100">
      <span aria-hidden="true">{icon}</span>
      {children}
    </li>
  );
}

function mensajeDeError(err: unknown): string {
  const code = (err as { code?: string })?.code ?? "";
  if (code.includes("email-already-in-use")) return "Ese correo ya tiene una cuenta.";
  if (
    code.includes("invalid-credential") ||
    code.includes("wrong-password") ||
    code.includes("user-not-found")
  ) {
    return "Correo o contraseña incorrectos.";
  }
  if (code.includes("weak-password")) return "La contraseña debe tener al menos 6 caracteres.";
  if (code.includes("invalid-email")) return "Ese correo no es válido.";
  if (code.includes("too-many-requests")) return "Demasiados intentos. Espera unos minutos y vuelve a probar.";
  // Sin código reconocido: se muestra el código crudo (p. ej.
  // "permission-denied" o "auth/operation-not-allowed") y, si lo hay, el
  // mensaje completo (getFirebase() añade ahí un diagnóstico de
  // NEXT_PUBLIC_FIREBASE_API_KEY) para poder diagnosticar sin depender de
  // la consola del navegador.
  const message = err instanceof Error ? err.message : "";
  if (code) return `Ocurrió un error (${code}). ${message}`.trim();
  return message || "Ocurrió un error. Intenta de nuevo.";
}
