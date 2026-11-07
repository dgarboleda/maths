"use client";

import { createContext, useContext, useRef, useSyncExternalStore } from "react";
import { ArrowLeft, ArrowRight, Delete } from "lucide-react";
import { makePreference } from "./preferences";

/* Teclado numérico propio para las hojas (columnas, galera, tabla de
 * factores y Ruffini) en pantallas táctiles. El teclado del sistema tapa
 * media pantalla justo sobre la cuenta; este ocupa poco, queda fijo encima
 * de la navegación y escribe en la casilla enfocada como si se tecleara.
 * Se puede volver al teclado del teléfono (también para lectores de
 * pantalla), y la elección se recuerda en este navegador. */

const COARSE = "(pointer: coarse)";
function subscribeCoarse(onChange: () => void) {
  if (typeof window === "undefined" || !window.matchMedia) return () => {};
  const media = window.matchMedia(COARSE);
  media.addEventListener?.("change", onChange);
  return () => media.removeEventListener?.("change", onChange);
}
const readCoarse = () => typeof window !== "undefined" && !!window.matchMedia?.(COARSE).matches;

/** Pantalla táctil (dedo como puntero principal). */
export function useCoarsePointer(): boolean {
  return useSyncExternalStore(subscribeCoarse, readCoarse, () => false);
}

const useKeyboardChoice = makePreference<"propio" | "telefono">("maths:teclado", ["propio", "telefono"], "propio");

const KeypadContext = createContext(false);

/** inputMode de una casilla de hoja: «none» si el teclado propio está activo. */
export function useSheetInputMode(fallback: "numeric" | "text" = "numeric"): "none" | "numeric" | "text" {
  return useContext(KeypadContext) ? "none" : fallback;
}

/** Escribe en un input controlado por React como lo haría el teclado. */
function typeInto(input: HTMLInputElement, next: string, caret: number) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
  setter?.call(input, next);
  input.dispatchEvent(new Event("input", { bubbles: true }));
  try {
    input.setSelectionRange(caret, caret);
  } catch {
    /* algunos tipos de input no admiten selección */
  }
}

/** Envía una tecla a la hoja (para que ella mueva el foco) y, si no la
 *  atendió, pasa a la casilla anterior o siguiente en el orden de la página. */
function navigate(container: HTMLElement, input: HTMLInputElement, key: "ArrowLeft" | "ArrowRight" | "Backspace") {
  const event = new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true });
  input.dispatchEvent(event);
  // Las hojas que ya se mueven con las flechas (columnas, galera por pasos)
  // no saltan a otras casillas al llegar al borde.
  if (event.defaultPrevented || key === "Backspace" || input.closest("[data-arrow-nav]")) return;
  const inputs = [...container.querySelectorAll<HTMLInputElement>("input:not([disabled])")];
  const next = inputs[inputs.indexOf(input) + (key === "ArrowRight" ? 1 : -1)];
  next?.focus();
}

export function NumericKeypadArea({
  sign = false,
  comma = false,
  bottom = "calc(5rem + env(safe-area-inset-bottom))",
  children,
}: {
  sign?: boolean;
  /** Tecla «,» para poner la coma desde la casilla (operaciones con decimales). */
  comma?: boolean;
  /** Distancia del teclado al borde inferior de lo que se desplaza: por
   *  defecto deja sitio a la navegación inferior de la página. */
  bottom?: string;
  children: React.ReactNode;
}) {
  const coarse = useCoarsePointer();
  const [choice, setChoice] = useKeyboardChoice();
  const active = coarse && choice === "propio";
  const area = useRef<HTMLDivElement>(null);
  const last = useRef<HTMLInputElement | null>(null);

  const target = () => {
    const focused = document.activeElement;
    if (focused instanceof HTMLInputElement && area.current?.contains(focused)) return focused;
    if (last.current && area.current?.contains(last.current) && !last.current.disabled) return last.current;
    return area.current?.querySelector<HTMLInputElement>("input:not([disabled])") ?? null;
  };
  const press = (key: string) => {
    const input = target();
    if (!input || !area.current) return;
    input.focus();
    const value = input.value;
    const start = input.selectionStart ?? value.length;
    const end = input.selectionEnd ?? value.length;
    if (key === "ArrowLeft" || key === "ArrowRight") return navigate(area.current, input, key);
    if (key === "Backspace") {
      if (start === end && start === 0) return navigate(area.current, input, "Backspace");
      const from = start === end ? start - 1 : start;
      return typeInto(input, value.slice(0, from) + value.slice(end), from);
    }
    // Casillas de una cifra: la tecla reemplaza lo escrito.
    const single = input.maxLength === 1;
    const next = single ? key : value.slice(0, start) + key + value.slice(end);
    typeInto(input, next, single ? 1 : start + key.length);
  };

  const keyClass =
    "flex min-h-12 items-center justify-center rounded-xl border border-slate-600 bg-slate-800 text-xl font-bold text-white active:bg-cyan-900 disabled:opacity-40";
  return (
    <KeypadContext.Provider value={active}>
      <div
        ref={area}
        onFocusCapture={(e) => {
          if (e.target instanceof HTMLInputElement) last.current = e.target;
        }}
      >
        {children}
        {active && (
          <div
            role="group"
            aria-label="Teclado numérico"
            className="sticky z-30 mt-3 rounded-2xl border border-slate-700 bg-slate-950/95 p-2 shadow-lg backdrop-blur"
            style={{ bottom }}
          >
            <div className="grid grid-cols-6 gap-1.5">
              {["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"].map((d) => (
                <button key={d} type="button" aria-label={`Escribir ${d}`} className={keyClass}
                  onPointerDown={(e) => e.preventDefault()} onClick={() => press(d)}>
                  {d}
                </button>
              ))}
              {sign ? (
                <button type="button" aria-label="Escribir signo menos" className={keyClass}
                  onPointerDown={(e) => e.preventDefault()} onClick={() => press("−")}>
                  −
                </button>
              ) : comma ? (
                <button type="button" aria-label="Escribir coma" className={keyClass}
                  onPointerDown={(e) => e.preventDefault()} onClick={() => press(",")}>
                  ,
                </button>
              ) : (
                <span aria-hidden="true" />
              )}
              <button type="button" aria-label="Borrar" className={keyClass}
                onPointerDown={(e) => e.preventDefault()} onClick={() => press("Backspace")}>
                <Delete size={20} aria-hidden="true" />
              </button>
            </div>
            <div className="mt-1.5 grid grid-cols-2 gap-1.5">
              <button type="button" aria-label="Mover a la izquierda" className={keyClass}
                onPointerDown={(e) => e.preventDefault()} onClick={() => press("ArrowLeft")}>
                <ArrowLeft size={20} aria-hidden="true" />
              </button>
              <button type="button" aria-label="Mover a la derecha" className={keyClass}
                onPointerDown={(e) => e.preventDefault()} onClick={() => press("ArrowRight")}>
                <ArrowRight size={20} aria-hidden="true" />
              </button>
            </div>
            <button type="button" className="mt-1 min-h-11 w-full text-xs font-semibold text-cyan-200 underline"
              onClick={() => setChoice("telefono")}>
              Usar el teclado del teléfono
            </button>
          </div>
        )}
        {coarse && !active && (
          <button type="button" className="mt-2 min-h-11 text-xs font-semibold text-cyan-200 underline"
            onClick={() => setChoice("propio")}>
            Usar el teclado de la hoja
          </button>
        )}
      </div>
    </KeypadContext.Provider>
  );
}
