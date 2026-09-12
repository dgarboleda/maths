"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { signInWithCustomToken } from "firebase/auth";
import { useParams, useRouter } from "next/navigation";
import { getFirebase, getFirebaseFunctions } from "@/lib/firebase";
import { Avatar } from "@/components/world/Avatar";
import { useDialogFocus } from "@/components/world/useDialogFocus";

interface PublicChild {
  id: string;
  name: string;
}

const KEYPAD = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];

/**
 * Puerta de entrada del hijo SIN la sesión del padre en el mismo
 * dispositivo (docs/plan-salto-producto.md §8, confirmado como escenario
 * real): el padre comparte este enlace (Ajustes → "Entrar desde su propio
 * dispositivo") y el niño elige su perfil y escribe su PIN acá, sin haber
 * iniciado sesión nunca en este navegador.
 *
 * A diferencia de `/perfiles` (que lee `parents/{uid}/children` ya
 * autenticado como el padre), esta pantalla no tiene ninguna sesión previa:
 * la lista de nombres sale de la Cloud Function `listChildrenPublic` (nunca
 * expone `pinHash`) y la verificación del PIN, de `verifyChildPin` — ambas
 * corren con el Admin SDK, del lado del servidor, y la segunda es la que de
 * verdad decide: `firestore.rules`/`storage.rules` solo confían en los
 * claims { role: "child", parentId, childId } del custom token que esa
 * función emite, nunca en nada que mande el cliente.
 */
export default function EntrarPage() {
  const params = useParams<{ parentId: string }>();
  const [children, setChildren] = useState<PublicChild[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selected, setSelected] = useState<PublicChild | null>(null);

  useEffect(() => {
    let cancelled = false;
    getFirebaseFunctions()
      .then(({ functions, functionsFns: { httpsCallable } }) =>
        httpsCallable<{ parentId: string }, { children: PublicChild[] }>(functions, "listChildrenPublic")({
          parentId: params.parentId,
        }),
      )
      .then((res) => {
        if (cancelled) return;
        setChildren(res.data.children);
      })
      .catch((err) => {
        console.error("No se pudo cargar la lista de perfiles", err);
        if (!cancelled) setLoadError("No se pudo cargar este enlace. Pídele a tu familia que te comparta uno nuevo.");
      });
    return () => {
      cancelled = true;
    };
  }, [params.parentId]);

  if (selected) {
    return <PinDialog parentId={params.parentId} child={selected} onClose={() => setSelected(null)} />;
  }

  return (
    <main id="contenido" tabIndex={-1} className="min-h-screen w-full bg-slate-950 px-6 py-10 md:py-14">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-8 md:max-w-4xl md:gap-10">
        <header className="text-center">
          <h1 className="family-text-glow font-display text-2xl font-bold text-white sm:text-3xl md:text-4xl">
            ¿Quién va a jugar?
          </h1>
          <p className="mt-1 text-sm text-indigo-200/80 md:text-base">
            Elige tu personaje y escribe tu PIN para continuar.
          </p>
        </header>

        {loadError && (
          <p role="alert" className="rounded-xl bg-red-500/10 px-3.5 py-2.5 text-center text-sm font-bold text-red-300">
            {loadError}
          </p>
        )}

        {!children && !loadError && (
          <p role="status" className="text-center text-indigo-200">
            Cargando…
          </p>
        )}

        {children && children.length === 0 && !loadError && (
          <p className="text-center text-sm text-indigo-200/80">Todavía no hay perfiles en esta familia.</p>
        )}

        {children && children.length > 0 && (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 md:gap-5">
            {children.map((child) => (
              <button
                key={child.id}
                type="button"
                onClick={() => setSelected(child)}
                aria-label={`Entrar al perfil de ${child.name}`}
                className="family-tile flex aspect-square flex-col items-center justify-center gap-2 rounded-2xl p-3 md:gap-3 md:p-4"
              >
                <span className="grid size-16 place-items-center rounded-full bg-gradient-to-br from-violet-600/40 to-fuchsia-600/30 md:size-20">
                  <Avatar className="h-11 md:h-14" title={child.name} />
                </span>
                <span className="font-display text-sm font-bold text-white md:text-base">{child.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

function PinDialog({
  parentId,
  child,
  onClose,
}: {
  parentId: string;
  child: PublicChild;
  onClose: () => void;
}) {
  const router = useRouter();
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [shakes, setShakes] = useState(0);
  const pinId = `pin-${child.id}`;
  const pinInputRef = useRef<HTMLInputElement>(null);

  function handleClose() {
    onClose();
  }

  const { dialogRef, handleKeyDown } = useDialogFocus(handleClose, pinInputRef);

  useEffect(() => {
    if (shakes > 0) pinInputRef.current?.focus();
  }, [shakes]);

  async function handleConfirm(e?: FormEvent) {
    e?.preventDefault();
    if (pin.length !== 4 || checking) return;
    setChecking(true);
    setError(null);
    try {
      const { functions, functionsFns: { httpsCallable } } = await getFirebaseFunctions();
      const verify = httpsCallable<{ parentId: string; childId: string; pin: string }, { token: string }>(
        functions,
        "verifyChildPin",
      );
      const { data } = await verify({ parentId, childId: child.id, pin });
      const { auth } = await getFirebase();
      const { user } = await signInWithCustomToken(auth, data.token);
      // Bug real: navegar apenas resuelve `signInWithCustomToken` no
      // alcanza a esperar los claims { role: "child", ... } del ID token —
      // `AuthProvider` los lee con su propio `getIdTokenResult()` (async),
      // y el listener interno de Firestore (que también depende de ese
      // mismo token) podía terminar de refrescarse recién después de que
      // `/jugar/{childId}` ya hubiera intentado leer/escribir, mostrando
      // "permission-denied" en consola en el primer intento. Forzar la
      // lectura acá, antes de navegar, deja el token con los claims listo
      // en la misma caché de Auth que usan tanto `AuthProvider` como
      // Firestore, sin agregar un `setTimeout` a ciegas.
      await user.getIdTokenResult();
      router.push(`/jugar/${child.id}`);
    } catch (err) {
      const code = (err as { code?: string })?.code ?? "";
      setChecking(false);
      if (code.includes("resource-exhausted")) {
        setError("Demasiados intentos. Espera un momento e intenta de nuevo.");
      } else if (code.includes("permission-denied")) {
        setError("PIN incorrecto");
      } else {
        console.error("No se pudo verificar el PIN", err);
        setError("Error del servidor. Intenta de nuevo en un momento.");
      }
      setShakes((s) => s + 1);
      setPin("");
    }
  }

  function press(d: string) {
    if (checking) return;
    setError(null);
    if (d === "borrar") {
      setPin((p) => p.slice(0, -1));
    } else if (pin.length < 4) {
      setPin((p) => p + d);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-3 backdrop-blur-sm sm:p-6">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={pinId}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
        className="family-panel anim-rise flex w-64 flex-col items-center gap-3 rounded-2xl p-5 focus:outline-none"
      >
        <form onSubmit={handleConfirm} className="flex w-full flex-col items-center gap-3">
          <Avatar className="h-16" title={child.name} />

          <label htmlFor={pinId} className="text-center text-sm font-bold text-white">
            PIN de {child.name}
            <input
              key={shakes}
              ref={pinInputRef}
              id={pinId}
              type="password"
              inputMode="numeric"
              maxLength={4}
              value={pin}
              onChange={(e) => {
                setError(null);
                setPin(e.target.value.replace(/\D/g, ""));
              }}
              className={`family-input mt-1.5 h-10 w-24 text-center text-lg tracking-[0.6em]${
                error ? " anim-shake has-error" : ""
              }`}
            />
          </label>

          <span role="alert" className="min-h-4 text-center text-xs font-semibold text-red-300">
            {error ?? ""}
          </span>

          <div
            role="group"
            aria-label={`Teclado numérico para ${child.name}`}
            className="grid grid-cols-3 gap-1.5"
          >
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
              onClick={handleClose}
              className="font-semibold text-indigo-300 underline-offset-2 hover:underline"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
