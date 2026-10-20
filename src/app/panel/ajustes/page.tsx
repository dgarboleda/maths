"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { signOut } from "firebase/auth";
import { Check, Copy, DatabaseBackup, ImageIcon, KeyRound, Smartphone, Trash2, UserRound, Users } from "lucide-react";
import { useAuth } from "@/lib/AuthProvider";
import { useFamily, type ChildDoc } from "@/components/family/FamilyProvider";
import { getFirebase } from "@/lib/firebase";
import { deviceAccessLink, newAccessKey, setChildPin } from "@/lib/pin";
import { deleteChildProfile } from "@/lib/deleteChild";
import { ageFromBirthDate } from "@/lib/family/age";
import { Avatar } from "@/components/world/Avatar";
import { SectionCard } from "@/components/family/ui";
import { useDialogFocus } from "@/components/world/useDialogFocus";
import { AvatarPickerDialog } from "@/components/family/AvatarPickerDialog";
import { BackupPanel } from "@/components/family/BackupPanel";

export default function AjustesPage() {
  const { user } = useAuth();
  const { parentId, children, loadingChildren } = useFamily();
  const [resettingChild, setResettingChild] = useState<ChildDoc | null>(null);
  const [deletingChild, setDeletingChild] = useState<ChildDoc | null>(null);
  const [pickingAvatarChild, setPickingAvatarChild] = useState<ChildDoc | null>(null);

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
                    avatarId={c.avatarId}
                    title={c.name}
                    className="size-11 shrink-0 rounded-full border border-indigo-500/25"
                  />
                  <div className="min-w-[8rem] flex-1">
                    <p className="text-sm font-bold text-white">{c.name}</p>
                    {c.deleting && (
                      <p role="status" className="text-xs text-amber-300">Borrado pendiente. Reintenta para terminarlo.</p>
                    )}
                    {age !== null && <p className="text-xs text-slate-400">{age} años</p>}
                  </div>
                  <button
                    type="button"
                    onClick={() => setPickingAvatarChild(c)}
                    disabled={c.deleting}
                    className="flex min-h-11 items-center gap-1.5 rounded-full border border-indigo-500/25 bg-slate-800/60 px-3.5 text-sm font-bold text-slate-100 transition-colors hover:bg-slate-800"
                  >
                    <ImageIcon className="size-4" aria-hidden="true" />
                    Avatar
                  </button>
                  <button
                    type="button"
                    onClick={() => setResettingChild(c)}
                    disabled={c.deleting}
                    className="flex min-h-11 items-center gap-1.5 rounded-full border border-indigo-500/25 bg-slate-800/60 px-3.5 text-sm font-bold text-slate-100 transition-colors hover:bg-slate-800"
                  >
                    <KeyRound className="size-4" aria-hidden="true" />
                    Restablecer PIN
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeletingChild(c)}
                    className="flex min-h-11 items-center gap-1.5 rounded-full border border-red-500/25 bg-red-950/30 px-3.5 text-sm font-bold text-red-300 transition-colors hover:bg-red-950/50"
                  >
                    <Trash2 className="size-4" aria-hidden="true" />
                    {c.deleting ? "Reintentar borrado" : "Borrar perfil"}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        <p className="mt-3 text-xs text-slate-400">El PIN es la llave de cada explorador para entrar a su aventura.</p>
      </SectionCard>

      {parentId && (
        <SectionCard title="Entrar desde su propio dispositivo" icon={<Smartphone className="size-4" aria-hidden="true" />}>
          <ChildDeviceLink parentId={parentId} />
        </SectionCard>
      )}

      {parentId && (
        <SectionCard title="Respaldo" icon={<DatabaseBackup className="size-4" aria-hidden="true" />}>
          <BackupPanel parentId={parentId} />
        </SectionCard>
      )}

      {resettingChild && parentId && (
        <ResetPinDialog parentId={parentId} child={resettingChild} onClose={() => setResettingChild(null)} />
      )}
      {deletingChild && parentId && (
        <DeleteChildDialog parentId={parentId} child={deletingChild} onClose={() => setDeletingChild(null)} />
      )}
      {pickingAvatarChild && parentId && (
        <AvatarPickerDialog parentId={parentId} child={pickingAvatarChild} onClose={() => setPickingAvatarChild(null)} onSaved={() => setPickingAvatarChild(null)} />
      )}
    </div>
  );
}

/**
 * El enlace lleva el `parentId` y una clave aleatoria de la familia
 * (`parents/{parentId}.deviceAccessKey`, solo legible por ella). Sin la clave,
 * `/entrar` no muestra los nombres de los hijos ni admite intentos de PIN.
 * "Generar un enlace nuevo" la rota e invalida los enlaces compartidos antes;
 * las sesiones ya abiertas en otros dispositivos no se cierran.
 */
function ChildDeviceLink({ parentId }: { parentId: string }) {
  const [copied, setCopied] = useState(false);
  const [accessKey, setAccessKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rotating, setRotating] = useState(false);
  const link = accessKey && typeof window !== "undefined" ? deviceAccessLink(window.location.origin, parentId, accessKey) : "";

  async function saveKey(key: string) {
    const {
      db,
      firestore: { doc, setDoc },
    } = await getFirebase();
    await setDoc(doc(db, "parents", parentId), { deviceAccessKey: key }, { merge: true });
    setAccessKey(key);
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const {
        db,
        firestore: { doc, getDoc },
      } = await getFirebase();
      const stored = (await getDoc(doc(db, "parents", parentId))).data()?.deviceAccessKey;
      if (cancelled) return;
      if (typeof stored === "string" && stored) setAccessKey(stored);
      else await saveKey(newAccessKey());
    })().catch((err) => {
      console.error("No se pudo preparar el enlace", err);
      if (!cancelled) setError("No se pudo preparar el enlace. Recarga la página.");
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo al montar o cambiar de familia
  }, [parentId]);

  async function rotateKey() {
    setRotating(true);
    setError(null);
    try {
      await saveKey(newAccessKey());
    } catch (err) {
      console.error("No se pudo generar un enlace nuevo", err);
      setError("No se pudo generar un enlace nuevo. Intenta de nuevo.");
    } finally {
      setRotating(false);
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("No se pudo copiar el enlace", err);
    }
  }

  return (
    <div className="flex flex-col gap-2.5">
      <p className="text-sm text-slate-400">
        Comparte este enlace con el dispositivo de tu hijo para que entre directo a elegir su perfil, sin que abras
        tu sesión ahí. Trátalo como una llave: quien lo tenga verá los nombres de los perfiles.
      </p>
      {error && (
        <p role="alert" className="text-sm font-semibold text-red-300">
          {error}
        </p>
      )}
      {!link && !error && (
        <p role="status" className="text-sm text-slate-400">
          Preparando el enlace…
        </p>
      )}
      {link && (
        <div className="flex flex-wrap items-center gap-2">
          <input
            readOnly
            value={link}
            onFocus={(e) => e.currentTarget.select()}
            aria-label="Enlace para entrar desde otro dispositivo"
            className="family-input min-h-11 w-full min-w-0 text-xs sm:w-auto sm:flex-1"
          />
          <button
            type="button"
            onClick={copyLink}
            className="flex min-h-11 items-center gap-1.5 rounded-xl border border-indigo-500/25 bg-slate-800/60 px-3.5 text-sm font-bold text-slate-100 transition-colors hover:bg-slate-800"
          >
            {copied ? <Check className="size-4" aria-hidden="true" /> : <Copy className="size-4" aria-hidden="true" />}
            {copied ? "¡Copiado!" : "Copiar"}
          </button>
          <button
            type="button"
            onClick={rotateKey}
            disabled={rotating}
            className="flex min-h-11 items-center gap-1.5 rounded-xl px-3.5 text-sm font-semibold text-cyan-300 underline disabled:opacity-60"
          >
            {rotating ? "Generando…" : "Generar un enlace nuevo"}
          </button>
        </div>
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
  const firstInputRef = useRef<HTMLInputElement>(null);
  const { dialogRef, handleKeyDown } = useDialogFocus(onClose, firstInputRef);
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
      // Functions guarda el hash y desbloquea el perfil en la misma operación.
      await setChildPin(parentId, child.id, pin);
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
              ref={firstInputRef}
              inputMode="numeric"
              maxLength={4}
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

/**
 * Borra el perfil completo del hijo (progreso, intentos, estrellas, canjes,
 * evaluaciones e insignias) — irreversible, así que exige escribir el nombre
 * exacto para habilitar el botón, igual que cualquier confirmación de borrado
 * real. `deleteChildProfile` hace el trabajo; aquí solo se confirma y se
 * cierra — la lista de "Perfiles de juego" se actualiza sola porque
 * `FamilyProvider` la mantiene suscrita en vivo a Firestore.
 */
function DeleteChildDialog({
  parentId,
  child,
  onClose,
}: {
  parentId: string;
  child: ChildDoc;
  onClose: () => void;
}) {
  const titleId = useId();
  const confirmId = useId();
  const confirmInputRef = useRef<HTMLInputElement>(null);
  const { dialogRef, handleKeyDown } = useDialogFocus(onClose, confirmInputRef);
  const [confirmName, setConfirmName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const confirmed = confirmName.trim().length > 0
    && confirmName.trim().normalize("NFC") === child.name.trim().normalize("NFC");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!confirmed || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const { db, firestore } = await getFirebase();
      await deleteChildProfile(firestore, db, parentId, child.id);
      onClose();
    } catch (err) {
      console.error("No se pudo borrar el perfil", err);
      const code = (err as { code?: string })?.code;
      setError(
        code === "permission-denied"
          ? "No hay permiso para borrar todos los datos del perfil. Entra con la cuenta familiar que lo creó; si el error continúa, es necesario actualizar los permisos del servicio."
          : "No se pudo completar el borrado. Puedes volver a intentarlo desde Ajustes.",
      );
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
        className="family-panel anim-rise w-full max-w-sm rounded-3xl border border-red-500/25 p-5 focus:outline-none"
      >
        <h2 id={titleId} className="font-display text-lg font-bold text-white">
          Borrar perfil de {child.name}
        </h2>
        <p className="mt-2 text-sm text-slate-300">
          Esto borra para siempre todo su progreso, estrellas, insignias y evaluaciones. No se puede deshacer.
        </p>
        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3">
          <label htmlFor={confirmId} className="flex flex-col gap-1 text-sm font-bold text-slate-200">
            Escribe &quot;{child.name}&quot; para confirmar
            <input
              ref={confirmInputRef}
              id={confirmId}
              autoComplete="off"
              value={confirmName}
              onChange={(e) => setConfirmName(e.target.value)}
              className="family-input"
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
              disabled={!confirmed || submitting}
              className="rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-40"
            >
              {submitting ? "Borrando…" : "Borrar perfil"}
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
