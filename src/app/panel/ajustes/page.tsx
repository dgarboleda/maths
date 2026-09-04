"use client";

import { useId, useState, type FormEvent } from "react";
import { signOut } from "firebase/auth";
import { KeyRound, UserRound, Users } from "lucide-react";
import { useAuth } from "@/lib/AuthProvider";
import { useFamily, type ChildDoc } from "@/components/family/FamilyProvider";
import { getFirebase } from "@/lib/firebase";
import { hashPin } from "@/lib/pin";
import { ageFromBirthDate } from "@/lib/family/age";
import { Avatar } from "@/components/world/Avatar";
import { SectionCard } from "@/components/family/ui";
import { useDialogFocus } from "@/components/world/useDialogFocus";

export default function AjustesPage() {
  const { user } = useAuth();
  const { parentId, children, loadingChildren } = useFamily();
  const [resettingChild, setResettingChild] = useState<ChildDoc | null>(null);

  return (
    <div className="space-y-5">
      <header>
        <h1 className="font-display text-2xl font-bold text-white sm:text-3xl">Ajustes</h1>
        <p className="mt-1 text-sm text-slate-400">Cuenta y perfiles de juego.</p>
      </header>

      <SectionCard title="Cuenta" icon={<UserRound className="size-4" aria-hidden="true" />}>
        <div className="flex flex-wrap items-center gap-4">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-white">{user?.email}</p>
          </div>
          <button
            type="button"
            onClick={() => getFirebase().then(({ auth }) => signOut(auth)).catch(console.error)}
            className="flex min-h-11 items-center gap-2 rounded-xl border border-indigo-500/25 bg-slate-800/60 px-4 text-sm font-bold text-slate-100 transition-colors hover:bg-slate-800"
          >
            Cerrar sesión
          </button>
        </div>
      </SectionCard>

      <SectionCard title="Perfiles de juego" icon={<Users className="size-4" aria-hidden="true" />}>
        {loadingChildren ? (
          <p role="status" className="text-sm text-slate-400">
            Cargando…
          </p>
        ) : children.length === 0 ? (
          <p className="text-sm text-slate-400">Todavía no hay perfiles de hijos creados.</p>
        ) : (
          <ul className="divide-y divide-indigo-500/15">
            {children.map((c) => {
              const age = ageFromBirthDate(c.birthDate);
              return (
                <li key={c.id} className="flex flex-wrap items-center gap-3 py-3">
                  <Avatar
                    variant="headshot"
                    title={c.name}
                    className="size-11 shrink-0 rounded-full border border-indigo-500/25"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-white">{c.name}</p>
                    {age !== null && <p className="text-xs text-slate-400">{age} años</p>}
                  </div>
                  <button
                    type="button"
                    onClick={() => setResettingChild(c)}
                    className="flex min-h-11 items-center gap-1.5 rounded-full border border-indigo-500/25 bg-slate-800/60 px-3.5 text-sm font-bold text-slate-100 transition-colors hover:bg-slate-800"
                  >
                    <KeyRound className="size-4" aria-hidden="true" />
                    Restablecer PIN
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        <p className="mt-3 text-xs text-slate-400">El PIN es la llave de cada explorador para entrar a su aventura.</p>
      </SectionCard>

      {resettingChild && parentId && (
        <ResetPinDialog parentId={parentId} child={resettingChild} onClose={() => setResettingChild(null)} />
      )}
    </div>
  );
}

function ResetPinDialog({
  parentId,
  child,
  onClose,
}: {
  parentId: string;
  child: ChildDoc;
  onClose: () => void;
}) {
  const titleId = useId();
  const { dialogRef, handleKeyDown } = useDialogFocus(onClose);
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
        db,
        firestore: { doc, updateDoc },
      } = await getFirebase();
      await updateDoc(doc(db, "parents", parentId, "children", child.id), { pinHash });
      onClose();
    } catch (err) {
      console.error("No se pudo restablecer el PIN", err);
      setError("No se pudo guardar el nuevo PIN. Intenta de nuevo.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/80 p-3 backdrop-blur-sm sm:items-center sm:p-6">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
        className="family-panel anim-rise w-full max-w-sm rounded-3xl p-5 focus:outline-none"
      >
        <h2 id={titleId} className="font-display text-lg font-bold text-white">
          Restablecer PIN de {child.name}
        </h2>
        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-sm font-bold text-slate-200">
            PIN nuevo (4 dígitos)
            <input
              inputMode="numeric"
              maxLength={4}
              autoFocus
              required
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
              className="family-input text-center text-lg tracking-[0.6em]"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-bold text-slate-200">
            Confirmar PIN
            <input
              inputMode="numeric"
              maxLength={4}
              required
              value={confirmPin}
              onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ""))}
              className="family-input text-center text-lg tracking-[0.6em]"
            />
          </label>
          {error && (
            <p role="alert" className="text-sm font-bold text-red-400">
              {error}
            </p>
          )}
          <div className="mt-1 flex gap-4">
            <button
              type="submit"
              disabled={submitting}
              className="rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
            >
              Guardar
            </button>
            <button type="button" onClick={onClose} className="text-sm font-bold text-slate-400">
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
