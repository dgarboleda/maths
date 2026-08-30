"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import {
  addDoc,
  collection,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
} from "firebase/firestore";
import { useAuth } from "@/lib/AuthProvider";
import { auth, db } from "@/lib/firebase";
import { hashPin } from "@/lib/pin";
import type { ChildProfile } from "@/lib/types";

interface ChildDoc extends ChildProfile {
  id: string;
}

export default function PerfilesPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [children, setChildren] = useState<ChildDoc[]>([]);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "parents", user.uid, "children"),
      orderBy("createdAt", "asc"),
    );
    return onSnapshot(q, (snap) => {
      setChildren(snap.docs.map((d) => ({ id: d.id, ...(d.data() as ChildProfile) })));
    });
  }, [user]);

  if (loading || !user) return null;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-8 bg-white px-6 py-14">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-neutral-900">¿Quién va a jugar?</h1>
        <div className="flex items-center gap-4 text-sm">
          <Link href="/panel" className="text-neutral-500 underline underline-offset-2">
            Panel de padre
          </Link>
          <button
            type="button"
            onClick={() => signOut(auth)}
            className="text-neutral-600 underline underline-offset-2"
          >
            Cerrar sesión
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {children.map((child) => (
          <ChildCard key={child.id} child={child} />
        ))}
        <button
          type="button"
          onClick={() => setShowForm(true)}
          aria-expanded={showForm}
          className="flex aspect-square flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-neutral-400 text-neutral-700 transition-colors hover:border-neutral-500 hover:text-neutral-900"
        >
          <span aria-hidden="true" className="text-3xl leading-none">
            +
          </span>
          <span className="text-sm">Agregar hijo</span>
        </button>
      </div>

      {showForm && (
        <NewChildForm parentId={user.uid} onDone={() => setShowForm(false)} />
      )}
    </main>
  );
}

function ChildCard({ child }: { child: ChildDoc }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);
  const [checking, setChecking] = useState(false);

  async function handleConfirm() {
    if (pin.length !== 4 || checking) return;
    setChecking(true);
    const hashed = await hashPin(pin);
    setChecking(false);
    if (hashed === child.pinHash) {
      router.push(`/jugar/${child.id}`);
    } else {
      setError(true);
      setPin("");
    }
  }

  if (open) {
    return (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleConfirm();
        }}
        className="flex aspect-square flex-col items-center justify-center gap-2 rounded-xl border border-neutral-300 p-3"
      >
        <label className="flex flex-col items-center gap-1 text-sm font-medium text-neutral-800">
          PIN de {child.name}
          <input
            type="password"
            inputMode="numeric"
            maxLength={4}
            autoFocus
            value={pin}
            onChange={(e) => {
              setError(false);
              setPin(e.target.value.replace(/\D/g, ""));
            }}
            placeholder="••••"
            className="w-16 rounded-md border border-neutral-400 px-2 py-1 text-center tracking-[0.3em] focus:border-neutral-600"
          />
        </label>
        <span role="alert" className="text-xs font-bold text-red-700">
          {error ? "PIN incorrecto" : ""}
        </span>
        <div className="flex gap-3 text-xs">
          <button
            type="submit"
            disabled={pin.length !== 4 || checking}
            className="text-neutral-900 underline underline-offset-2 disabled:opacity-40"
          >
            Entrar
          </button>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              setPin("");
              setError(false);
            }}
            className="text-neutral-700"
          >
            Cancelar
          </button>
        </div>
      </form>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      aria-label={`Entrar al perfil de ${child.name}`}
      className="flex aspect-square flex-col items-center justify-center gap-2 rounded-xl border border-neutral-300 bg-neutral-50 transition-colors hover:border-neutral-500"
    >
      <span
        aria-hidden="true"
        className="flex h-10 w-10 items-center justify-center rounded-full bg-neutral-200 text-lg font-semibold text-neutral-800"
      >
        {child.name.charAt(0).toUpperCase()}
      </span>
      <span className="text-sm font-medium text-neutral-800">{child.name}</span>
    </button>
  );
}

function NewChildForm({ parentId, onDone }: { parentId: string; onDone: () => void }) {
  const [name, setName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!/^\d{4}$/.test(pin)) {
      setError("El PIN debe tener 4 dígitos.");
      return;
    }
    if (pin !== confirmPin) {
      setError("Los dos PIN no coinciden.");
      return;
    }
    setSubmitting(true);
    try {
      const pinHash = await hashPin(pin);
      await addDoc(collection(db, "parents", parentId, "children"), {
        name,
        birthDate,
        pinHash,
        createdAt: serverTimestamp(),
      });
      onDone();
    } catch {
      setError("No se pudo guardar. Intenta de nuevo.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-4 rounded-xl border border-neutral-200 p-6"
    >
      <h2 className="font-medium text-neutral-900">Nuevo perfil</h2>
      <label className="flex flex-col gap-1 text-sm text-neutral-700">
        Nombre
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="rounded-md border border-neutral-300 px-3 py-2 focus:border-neutral-500"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm text-neutral-700">
        Fecha de nacimiento
        <input
          type="date"
          required
          value={birthDate}
          onChange={(e) => setBirthDate(e.target.value)}
          className="rounded-md border border-neutral-300 px-3 py-2 focus:border-neutral-500"
        />
      </label>
      <div className="grid grid-cols-2 gap-4">
        <label className="flex flex-col gap-1 text-sm text-neutral-700">
          PIN (4 dígitos)
          <input
            inputMode="numeric"
            maxLength={4}
            required
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
            className="rounded-md border border-neutral-300 px-3 py-2 focus:border-neutral-500"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-neutral-700">
          Confirmar PIN
          <input
            inputMode="numeric"
            maxLength={4}
            required
            value={confirmPin}
            onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ""))}
            className="rounded-md border border-neutral-300 px-3 py-2 focus:border-neutral-500"
          />
        </label>
      </div>
      {error && (
        <p role="alert" className="text-sm font-bold text-red-700">
          {error}
        </p>
      )}
      <div className="flex gap-4">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          Guardar
        </button>
        <button type="button" onClick={onDone} className="text-sm text-neutral-700">
          Cancelar
        </button>
      </div>
    </form>
  );
}
