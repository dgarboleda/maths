"use client";

import { createContext, useContext, useId, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { useDialogFocus } from "@/components/world/useDialogFocus";
import type { ScreenHelp } from "@/lib/learning/screenHelp";
import styles from "./help.module.css";

const HelpOpenContext = createContext(false);
export const useLearningHelpOpen = () => useContext(HelpOpenContext);
const storageKey = (childId: string) => `maths:help:v1:${childId}`;
function subscribeSeen(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener("maths-help-seen", callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener("maths-help-seen", callback);
  };
}
function readSeen(childId: string) {
  try { return localStorage.getItem(storageKey(childId)) ?? "[]"; } catch { return "[]"; }
}
function parseSeen(raw: string): string[] {
  try {
    const value: unknown = JSON.parse(raw);
    return Array.isArray(value) ? value.filter((id): id is string => typeof id === "string").slice(-100) : [];
  } catch { return []; }
}

/** La ayuda pausa la práctica sin modificar la pausa elegida por el alumno. */
export function LearningHelpProvider({ childId, help, onOpen, disabled, children }: {
  childId: string;
  help: ScreenHelp;
  onOpen?: () => Promise<boolean>;
  disabled?: boolean;
  children: ReactNode;
}) {
  const [panel, setPanel] = useState({ scope: help.id, open: false });
  // Cambiar de actividad cierra la ficha, conservando el estado de la clase.
  if (panel.scope !== help.id) setPanel({ scope: help.id, open: false });
  const open = panel.scope === help.id && panel.open;
  return (
    <HelpOpenContext value={open}>
      {children}
      <FloatingHelp key={childId} childId={childId} help={help} open={open}
        onOpen={onOpen} disabled={disabled} onChange={(next) => setPanel({ scope: help.id, open: next })} />
    </HelpOpenContext>
  );
}

function Bulb() {
  return (
    <svg viewBox="0 0 48 56" width="32" height="38" fill="none" aria-hidden="true">
      <path d="M24 3C13 3 7 11 7 20c0 7 4 11 8 15l2 7h14l2-7c4-4 8-8 8-15C41 11 35 3 24 3Z" fill="#fef3c7" stroke="#92400e" strokeWidth="2" />
      <path d="m18 23 4 4 2-5 2 5 4-4M22 27v15m4-15v15" stroke="#d97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M17 42h14v6l-4 5h-6l-4-5v-6Z" fill="#94a3b8" stroke="#334155" strokeWidth="2" />
      <path d="M18 45h12m-10 4h8M14 15c1-3 3-5 6-6" stroke="white" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function FloatingHelp({ childId, help, open, onChange, onOpen, disabled }: {
  childId: string;
  help: ScreenHelp;
  open: boolean;
  onChange: (open: boolean) => void;
  onOpen?: () => Promise<boolean>;
  disabled?: boolean;
}) {
  const trigger = useRef<HTMLButtonElement>(null);
  const pending = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [sessionSeen, setSessionSeen] = useState<string[]>([]);
  const [preferredIdea, setPreferredIdea] = useState<string>();
  const raw = useSyncExternalStore(subscribeSeen, () => readSeen(childId), () => "[]");
  const seen = new Set([...parseSeen(raw), ...sessionSeen]);
  const novel = help.ideas.find((idea) => idea.symbol && !seen.has(idea.id));
  const id = useId();
  async function show() {
    if (pending.current || disabled) return;
    pending.current = true;
    setBusy(true);
    setError(false);
    try {
      if (onOpen && !(await onOpen())) { setError(true); return; }
      setPreferredIdea(novel?.id);
      const next = [...new Set([...seen, ...help.ideas.map((idea) => idea.id)])].slice(-100);
      setSessionSeen(next);
      try {
        localStorage.setItem(storageKey(childId), JSON.stringify(next));
        window.dispatchEvent(new Event("maths-help-seen"));
      } catch { /* El modo privado o el almacenamiento lleno no bloquean la ayuda. */ }
      onChange(true);
    } catch { setError(true); } finally { pending.current = false; setBusy(false); }
  }
  function close() {
    onChange(false);
    trigger.current?.focus({ preventScroll: true });
  }
  return (
    <>
      <div className={styles.dock}>
        {error && <p role="alert" className={styles.notice}>No se pudo abrir la ayuda. Reintenta cuando se guarde tu avance.</p>}
        {!open && novel && <button type="button" className={styles.notice} onClick={() => void show()} disabled={disabled || busy}>
          <span className={styles.newLabel}>Nuevo símbolo</span>
          ¿Qué significa {novel.symbol}?
          {onOpen && <span className={styles.helpWarning}>Consultar cuenta como ayuda</span>}
        </button>}
        <button ref={trigger} type="button" className={styles.bulb} aria-label="Entender esta pantalla"
          aria-haspopup="dialog" aria-expanded={open} aria-controls={open ? id : undefined}
          aria-describedby={onOpen ? `${id}-warning` : undefined}
          aria-busy={busy} disabled={disabled || busy} onClick={() => void show()}>
          <span className={styles.filament}><Bulb /></span>
        </button>
        {onOpen && <span id={`${id}-warning`} className="sr-only">Consultar cuenta como ayuda en esta comprobación.</span>}
      </div>
      {open && createPortal(<HelpPanel id={id} help={help} preferredIdea={preferredIdea} onClose={close} assisted={Boolean(onOpen)} />, document.body)}
    </>
  );
}

function HelpPanel({ id, help, preferredIdea, onClose, assisted }: {
  id: string; help: ScreenHelp; preferredIdea?: string; onClose: () => void; assisted: boolean;
}) {
  const { dialogRef, handleKeyDown } = useDialogFocus(onClose);
  const ideas = [...help.ideas.filter((idea) => idea.id === preferredIdea), ...help.ideas.filter((idea) => idea.id !== preferredIdea)];
  return (
    <div className={styles.backdrop} onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div ref={dialogRef} id={id} role="dialog" aria-modal="true" aria-labelledby={`${id}-title`}
        aria-describedby={`${id}-description`} tabIndex={-1} className={styles.panel}
        onKeyDown={(event) => { handleKeyDown(event); event.stopPropagation(); }}>
        <header className={styles.header}>
          <div><p className={styles.kicker}>Enciende una idea</p><h2 id={`${id}-title`}>{help.title}</h2></div>
          <button type="button" aria-label="Cerrar explicación" className={styles.close} onClick={onClose}><X size={20} aria-hidden="true" /></button>
        </header>
        <p id={`${id}-description`} className={styles.description}>{help.description}</p>
        {ideas.map((idea, index) => <details key={idea.id} className={styles.idea} open={index === 0 ? true : undefined}>
          <summary>{idea.symbol && <span className={styles.symbol} aria-hidden="true">{idea.symbol}</span>}{idea.title}</summary>
          <p>{idea.meaning}</p>
          {idea.example && <p className={styles.example}><strong>Por ejemplo:</strong> {idea.example}</p>}
        </details>)}
        {assisted && <p className={styles.assisted}>Esta consulta cuenta como ayuda en la comprobación. Puedes seguir aprendiendo a tu ritmo.</p>}
        <button type="button" className={styles.done} onClick={onClose}>Entendido, seguir</button>
      </div>
    </div>
  );
}
