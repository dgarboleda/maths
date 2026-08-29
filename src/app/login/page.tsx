"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

export default function LoginPage() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (mode === "signup") {
        const credential = await createUserWithEmailAndPassword(auth, email, password);
        await setDoc(doc(db, "parents", credential.user.uid), {
          email: credential.user.email,
          createdAt: serverTimestamp(),
        });
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
    <main className="mx-auto flex min-h-screen w-full max-w-sm flex-col justify-center gap-8 bg-white px-6">
      <div>
        <h1 className="text-2xl font-semibold text-neutral-900">Numerario</h1>
        <p className="mt-1 text-sm text-neutral-500">
          {mode === "login" ? "Entra a tu cuenta de padre o madre" : "Crea tu cuenta de padre o madre"}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm text-neutral-700">
          Correo
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-md border border-neutral-300 px-3 py-2 text-neutral-900 outline-none focus:border-neutral-500"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-neutral-700">
          Contraseña
          <input
            type="password"
            required
            minLength={6}
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-md border border-neutral-300 px-3 py-2 text-neutral-900 outline-none focus:border-neutral-500"
          />
        </label>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-neutral-900 px-4 py-2 font-medium text-white transition-opacity disabled:opacity-50"
        >
          {mode === "login" ? "Entrar" : "Crear cuenta"}
        </button>
      </form>

      <button
        type="button"
        onClick={() => {
          setError(null);
          setMode(mode === "login" ? "signup" : "login");
        }}
        className="text-sm text-neutral-500 underline underline-offset-2"
      >
        {mode === "login" ? "¿No tienes cuenta? Créala" : "¿Ya tienes cuenta? Entra"}
      </button>
    </main>
  );
}

function mensajeDeError(err: unknown): string {
  const code = (err as { code?: string })?.code ?? "";
  if (code.includes("email-already-in-use")) return "Ese correo ya tiene una cuenta.";
  if (code.includes("invalid-credential") || code.includes("wrong-password")) {
    return "Correo o contraseña incorrectos.";
  }
  if (code.includes("weak-password")) return "La contraseña debe tener al menos 6 caracteres.";
  if (code.includes("invalid-email")) return "Ese correo no es válido.";
  return "Ocurrió un error. Intenta de nuevo.";
}
