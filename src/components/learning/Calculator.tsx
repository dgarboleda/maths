"use client";

import { createContext, lazy, Suspense, useCallback, useContext, useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import { Calculator as CalculatorIcon } from "lucide-react";
import { secondaryButton } from "./LearningShell";
import styles from "./calculator.module.css";

/* Calculadora en columnas: una herramienta de todo el espacio del alumno.
 * Un botón flotante abre un panel lateral donde se escriben cuentas con su
 * desarrollo (columnas, multiplicación y galera), se encadenan resultados y
 * se copia el resultado final. También calcula fracciones y divisibilidad
 * con sus pasos. Una pantalla que espera un número (una respuesta, los valores
 * de un plan) lo anuncia con `useCalculatorTarget` y el panel ofrece pasarle
 * el resultado. */

const CalculatorPanel = lazy(() => import("./CalculatorPanel").then((module) => ({ default: module.CalculatorPanel })));

/** Dónde se puede pasar el resultado en la pantalla actual. */
export interface CalculatorTarget {
  /** Nombre de cada destino («tu respuesta», «Baldosas»…). */
  labels: string[];
  /** Algunos destinos, como las decisiones de aventuras, solo admiten enteros. */
  integerOnly?: boolean;
  onUse: (value: string, index: number) => void;
}

interface CalculatorContext {
  open: () => void;
  register: (target: CalculatorTarget) => () => void;
}

const Context = createContext<CalculatorContext | null>(null);

export function CalculatorProvider({ childId, children }: { childId: string; children: ReactNode }) {
  const [isOpen, setOpen] = useState(false);
  // El panel (y las hojas) se cargan al abrirlo por primera vez; después se
  // conserva montado para no perder la cuenta a medias.
  const [requested, setRequested] = useState(false);
  const [target, setTarget] = useState<CalculatorTarget | null>(null);
  const fab = useRef<HTMLButtonElement>(null);
  const panelId = useId();

  const open = useCallback(() => {
    setRequested(true);
    setOpen(true);
  }, []);
  const close = useCallback(() => {
    setOpen(false);
    requestAnimationFrame(() => fab.current?.focus());
  }, []);
  const register = useCallback((next: CalculatorTarget) => {
    setTarget(next);
    return () => setTarget((current) => (current === next ? null : current));
  }, []);
  const value = useMemo(() => ({ open, register }), [open, register]);

  return (
    <Context.Provider value={value}>
      {children}
      <button
        ref={fab}
        type="button"
        className={styles.fab}
        aria-label="Calculadora"
        aria-expanded={isOpen}
        aria-controls={requested ? panelId : undefined}
        onClick={() => (isOpen ? close() : open())}
      >
        <CalculatorIcon size={24} aria-hidden="true" />
      </button>
      {requested && (
        <Suspense fallback={null}>
          <CalculatorPanel id={panelId} open={isOpen} onClose={close} target={target} storageKey={`maths:calculadora:${childId}`} />
        </Suspense>
      )}
    </Context.Provider>
  );
}

/**
 * La pantalla espera un número: mientras `enabled`, el panel ofrece pasarle
 * el resultado final. `onUse` puede cambiar en cada render sin volver a
 * registrar el destino.
 */
export function useCalculatorTarget(labels: string[], onUse: (value: string, index: number) => void, enabled = true, integerOnly = false) {
  const context = useContext(Context);
  const latest = useRef(onUse);
  useEffect(() => {
    latest.current = onUse;
  });
  const key = labels.join("\u0000");
  useEffect(() => {
    if (!context || !enabled) return;
    return context.register({ labels: key.split("\u0000"), integerOnly, onUse: (value, index) => latest.current(value, index) });
  }, [context, enabled, integerOnly, key]);
}

/** Acceso a la calculadora junto a una pregunta (además del botón flotante). */
export function OpenCalculatorButton({ disabled }: { disabled?: boolean }) {
  const context = useContext(Context);
  if (!context) return null;
  return (
    <button type="button" className={secondaryButton} disabled={disabled} onClick={context.open}>
      <CalculatorIcon size={16} aria-hidden="true" />
      Hacer cuentas en la calculadora
    </button>
  );
}
