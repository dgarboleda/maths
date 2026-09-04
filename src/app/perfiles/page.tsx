"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { useAuth } from "@/lib/AuthProvider";
import { getFirebase } from "@/lib/firebase";
import { hashPin } from "@/lib/pin";
import { normalizeAvatar } from "@/lib/world/avatar";
import { Avatar } from "@/components/world/Avatar";
import type { ChildProfile } from "@/lib/types";

interface ChildDoc extends ChildProfile {
  id: string;
}

const KEYPAD = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];

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
      <main id="contenido" tabIndex={-1} className="flex min-h-screen w-full items-center justify-center bg-slate-950">
        <p role="status" className="text-indigo-200">
          Cargando…
        </p>
      </main>
    );
  }

  return (
    <main
      id="contenido"
      tabIndex={-1}
      className="mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-8 bg-slate-950 px-6 py-10"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="grid size-10 place-items-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-lg">
            <span aria-hidden="true" className="text-lg">✨</span>
          </span>
          <span>
            <span className="block font-display text-lg font-bold leading-none tracking-wide text-white">
              MATH QUEST
            </span>
            <span className="block text-[10px] font-semibold uppercase tracking-[0.2em] text-indigo-300">
              ¿Quién va a jugar?
            </span>
          </span>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <Link href="/panel" className="font-semibold text-indigo-300 underline-offset-2 hover:underline">
            Panel de padre
          </Link>
          <button
            type="button"
            onClick={() => getFirebase().then(({ auth }) => signOut(auth)).catch(console.error)}
            className="font-semibold text-slate-400 underline-offset-2 hover:underline"
          >
            Cerrar sesión
          </button>
        </div>
      </div>

      <header className="text-center">
        <h1 className="family-text-glow font-display text-2xl font-bold text-white sm:text-3xl">
          ¿Quién va a jugar?
        </h1>
        <p className="mt-1 text-sm text-indigo-200/80">Elige tu personaje y escribe tu PIN para continuar.</p>
      </header>

      {listError && (
        <p role="alert" className="rounded-xl bg-red-500/10 px-3.5 py-2.5 text-sm font-bold text-red-300">
          {listError}
        </p>
      )}
      {banner && (
        <p role="status" className="rounded-xl bg-emerald-500/10 px-3.5 py-2.5 text-sm font-bold text-emerald-300">
          {banner}
        </p>
      )}

      {children.length === 0 && !showForm && (
        <div className="family-panel flex flex-col items-center gap-3 rounded-2xl px-6 py-8 text-center sm:flex-row sm:text-left">
          <img
            src="/illustrations/explorer.webp"
            alt=""
            className="h-28 w-auto shrink-0 drop-shadow-[0_0_18px_rgba(167,139,250,0.35)]"
          />
          <div>
            <p className="font-display font-bold text-white">Todavía no hay exploradores por aquí.</p>
            <p className="mt-1 text-sm text-indigo-200/80">
              Crea el primer perfil para que empiece su aventura en Ciudad Central.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {children.map((child) => (
          <ChildCard key={child.id} child={child} />
        ))}
        <button
          type="button"
          onClick={() => setShowForm(true)}
          aria-expanded={showForm}
          className="flex aspect-square flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-indigo-500/30 text-indigo-300 transition-colors hover:border-indigo-400/60 hover:text-white"
        >
          <span aria-hidden="true" className="text-3xl leading-none">
            +
          </span>
          <span className="text-sm font-semibold">Agregar hijo</span>
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

      <p className="text-center text-[10px] text-indigo-300/80">
        build: diag-v4 · proyecto Firebase: {projectId ?? "cargando…"}
      </p>
    </main>
  );
}

function ChildCard({ child }: { child: ChildDoc }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);
  const [checking, setChecking] = useState(false);
  const [shakes, setShakes] = useState(0);
  const look = normalizeAvatar(child.avatar);
  const pinId = `pin-${child.id}`;

  async function handleConfirm(e?: FormEvent) {
    e?.preventDefault();
    if (pin.length !== 4 || checking) return;
    setChecking(true);
    const hashed = await hashPin(pin);
    setChecking(false);
    if (hashed === child.pinHash) {
      router.push(`/jugar/${child.id}`);
    } else {
      setError(true);
      setShakes((s) => s + 1);
      setPin("");
    }
  }

  function press(d: string) {
    if (checking) return;
    setError(false);
    if (d === "borrar") {
      setPin((p) => p.slice(0, -1));
    } else if (pin.length < 4) {
      setPin((p) => p + d);
    }
  }

  if (open) {
    return (
      <form
        onSubmit={handleConfirm}
        className="family-tile col-span-2 flex flex-col items-center gap-3 rounded-2xl p-4 sm:col-span-1"
      >
        <Avatar look={look} className="h-16 w-11" title={child.name} />

        <label htmlFor={pinId} className="text-center text-sm font-bold text-white">
          PIN de {child.name}
          <input
            key={shakes}
            id={pinId}
            type="password"
            inputMode="numeric"
            maxLength={4}
            autoFocus
            value={pin}
            onChange={(e) => {
              setError(false);
              setPin(e.target.value.replace(/\D/g, ""));
            }}
            className={`family-input mt-1.5 h-10 w-24 text-center text-lg tracking-[0.6em]${
              error ? " anim-shake has-error" : ""
            }`}
          />
        </label>

        <span role="alert" className="min-h-4 text-xs font-semibold text-red-300">
          {error ? "PIN incorrecto" : ""}
        </span>

        <div role="group" aria-label={`Teclado numérico para ${child.name}`} className="grid grid-cols-3 gap-1.5">
          {KEYPAD.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => press(d)}
              className="family-keycap min-h-9 min-w-9 rounded-lg font-display text-sm font-bold"
            >
              {d}
            </button>
          ))}
          <span aria-hidden="true" />
          <button
            type="button"
            onClick={() => press("0")}
            className="family-keycap min-h-9 min-w-9 rounded-lg font-display text-sm font-bold"
          >
            0
          </button>
          <button
            type="button"
            onClick={() => press("borrar")}
            aria-label="Borrar último dígito"
            className="family-keycap grid min-h-9 min-w-9 place-items-center rounded-lg text-xs"
          >
            ⌫
          </button>
        </div>

        <div className="flex gap-4 text-xs">
          <button
            type="submit"
            disabled={pin.length !== 4 || checking}
            className="font-bold text-cyan-300 underline-offset-2 hover:underline disabled:opacity-40"
          >
            {checking ? "Comprobando…" : "Entrar"}
          </button>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              setPin("");
              setError(false);
            }}
            className="font-semibold text-indigo-300 underline-offset-2 hover:underline"
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
      className="family-tile flex aspect-square flex-col items-center justify-center gap-2 rounded-2xl p-3"
    >
      <span className="grid size-16 place-items-center rounded-full bg-gradient-to-br from-violet-600/40 to-fuchsia-600/30">
        <Avatar look={look} className="h-11 w-8" title={child.name} />
      </span>
      <span className="font-display text-sm font-bold text-white">{child.name}</span>
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
    <form onSubmit={handleSubmit} className="family-panel flex flex-col gap-4 rounded-2xl p-6">
      <h2 className="font-display text-base font-bold text-white">Nuevo perfil</h2>
      <label className="flex flex-col gap-1 text-sm text-indigo-200">
        Nombre
        <input required value={name} onChange={(e) => setName(e.target.value)} className="family-input" />
      </label>
      <label className="flex flex-col gap-1 text-sm text-indigo-200">
        Fecha de nacimiento
        <input
          type="date"
          required
          value={birthDate}
          onChange={(e) => setBirthDate(e.target.value)}
          className="family-input"
        />
      </label>
      <div className="grid grid-cols-2 gap-4">
        <label className="flex flex-col gap-1 text-sm text-indigo-200">
          PIN (4 dígitos)
          <input
            inputMode="numeric"
            maxLength={4}
            required
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
            className="family-input"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-indigo-200">
          Confirmar PIN
          <input
            inputMode="numeric"
            maxLength={4}
            required
            value={confirmPin}
            onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ""))}
            className="family-input"
          />
        </label>
      </div>
      {error && (
        <p role="alert" className="text-sm font-bold text-red-300">
          {error}
        </p>
      )}
      <div className="flex gap-4">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
        >
          Guardar
        </button>
        <button type="button" onClick={() => onDone()} className="text-sm font-semibold text-indigo-300 hover:underline">
          Cancelar
        </button>
      </div>
    </form>
  );
}
