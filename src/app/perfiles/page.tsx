"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { useAuth } from "@/lib/AuthProvider";
import { getFirebase } from "@/lib/firebase";
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
  const [listError, setListError] = useState<string | null>(null);
  const [banner, setBanner] = useState<string | null>(null);
  const [projectId, setProjectId] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [user, loading, router]);

  useEffect(() => {
    // Diagnóstico: el projectId de Firebase no es secreto (viaja en cada
    // petición al backend) y mostrarlo aquí permite comparar, en segundos,
    // que el proyecto al que habla ESTE build sea el mismo que se está
    // mirando en la consola de Firebase — las NEXT_PUBLIC_FIREBASE_* se
    // incrustan en el build (ver README) y un build viejo servido desde
    // caché puede seguir apuntando a un proyecto distinto.
    getFirebase()
      .then(({ app }) => setProjectId(app.options.projectId ?? null))
      .catch(() => setProjectId(null));
  }, []);

  useEffect(() => {
    if (!user) return;
    let unsubscribe: (() => void) | undefined;
    let cancelled = false;
    getFirebase()
      .then(({ db, firestore: { collection, onSnapshot, orderBy, query } }) => {
        if (cancelled) return;
        const q = query(collection(db, "parents", user.uid, "children"), orderBy("createdAt", "asc"));
        unsubscribe = onSnapshot(
          q,
          (snap) => {
            setListError(null);
            setChildren(snap.docs.map((d) => ({ id: d.id, ...(d.data() as ChildProfile) })));
          },
          (err) => {
            console.error("No se pudo cargar la lista de hijos", err);
            setListError(`No se pudo cargar la lista (${err.code}). ${err.message}`);
          },
        );
      })
      .catch((err) => {
        console.error("No se pudo cargar la lista de hijos", err);
        setListError(err instanceof Error ? err.message : "No se pudo cargar la lista de hijos.");
      });
    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [user]);

  if (loading || !user) {
    return (
      <main id="contenido"
        tabIndex={-1} className="flex min-h-screen w-full items-center justify-center bg-white">
        <p role="status" className="text-neutral-700">
          Cargando…
        </p>
      </main>
    );
  }

  return (
    <main
      id="contenido"
      tabIndex={-1}
      className="mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-8 bg-white px-6 py-14"
    >
      <p className="text-[10px] text-neutral-600">
        build: diag-v4 · proyecto Firebase: {projectId ?? "cargando…"}
      </p>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-neutral-900">¿Quién va a jugar?</h1>
        <div className="flex items-center gap-4 text-sm">
          <Link href="/panel" className="text-neutral-500 underline underline-offset-2">
            Panel de padre
          </Link>
          <button
            type="button"
            onClick={() => getFirebase().then(({ auth }) => signOut(auth)).catch(console.error)}
            className="text-neutral-600 underline underline-offset-2"
          >
            Cerrar sesión
          </button>
        </div>
      </div>

      {listError && (
        <p role="alert" className="text-sm font-bold text-red-700">
          {listError}
        </p>
      )}
      {banner && (
        <p role="status" className="text-sm font-bold text-green-700">
          {banner}
        </p>
      )}

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
        <NewChildForm
          parentId={user.uid}
          onDone={(message) => {
            setShowForm(false);
            setBanner(message ?? null);
          }}
        />
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

function NewChildForm({
  parentId,
  onDone,
}: {
  parentId: string;
  onDone: (message?: string) => void;
}) {
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
      const {
        app,
        db,
        firestore: { addDoc, collection, getDocsFromServer, serverTimestamp },
      } = await getFirebase();
      const childrenCollection = collection(db, "parents", parentId, "children");
      const ref = await addDoc(childrenCollection, {
        name,
        birthDate,
        pinHash,
        createdAt: serverTimestamp(),
      });
      // Diagnóstico: addDoc() ya garantiza que el documento fue confirmado
      // por el backend antes de resolver (así lo documenta el SDK: la
      // promesa no se resuelve hasta que el servidor confirma la
      // escritura). Igual se fuerza una relectura con getDocsFromServer
      // —ignora la caché local— para descartar además un problema de
      // reglas de lectura, y se muestra a qué proyecto de Firebase se
      // escribió: NEXT_PUBLIC_FIREBASE_* se incrusta en el build (ver
      // README), así que un build viejo servido desde caché puede seguir
      // hablando con un proyecto distinto al que se mira en la consola.
      const projectId = app.options.projectId ?? "desconocido";
      const consoleUrl = `https://console.firebase.google.com/project/${projectId}/firestore/data/parents/${parentId}/children/${ref.id}`;
      const snap = await getDocsFromServer(childrenCollection);
      const found = snap.docs.some((d) => d.id === ref.id);
      const message = found
        ? `"${name}" guardado en el proyecto "${projectId}" (id ${ref.id}). La colección tiene ${snap.size} perfil(es) en el servidor. Verifícalo en: ${consoleUrl}`
        : `"${name}" se guardó (id ${ref.id}) en el proyecto "${projectId}" pero al releer desde el servidor no aparece (${snap.size} documento(s) encontrados). Revisa las reglas de lectura o si hay más de una base de datos de Firestore en ese proyecto.`;
      // Diagnóstico temporal: alert() nativo además del banner en pantalla,
      // para descartar que el mensaje no se vea por caché/CSS — un alert()
      // es imposible de pasar por alto y bloquea hasta que se cierre.
      window.alert(message);
      onDone(message);
    } catch (err) {
      console.error("No se pudo guardar el hijo", err);
      const code = (err as { code?: string })?.code;
      const rawMessage = err instanceof Error ? err.message : String(err);
      const message = code
        ? `No se pudo guardar (${code}). ${rawMessage}`
        : `No se pudo guardar. ${rawMessage}`;
      window.alert(message);
      setError(message);
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
        <button type="button" onClick={() => onDone()} className="text-sm text-neutral-700">
          Cancelar
        </button>
      </div>
    </form>
  );
}
