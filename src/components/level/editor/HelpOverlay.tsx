"use client";

import { useEffect, useSyncExternalStore } from "react";
import { X } from "lucide-react";
import { SHORTCUTS, type ShortcutDef } from "./useEditorHotkeys";
import { getHelpOverlayOpen, setHelpOverlayOpen, subscribeHelpOverlay, toggleHelpOverlay } from "./helpOverlayStore";

const GROUP_LABEL: Record<ShortcutDef["group"], string> = {
  herramientas: "Herramientas",
  edición: "Edición",
  vista: "Vista",
  archivo: "Archivo",
};

const GROUP_ORDER: ShortcutDef["group"][] = ["herramientas", "edición", "vista", "archivo"];

/**
 * Panel de ayuda global — Fase 15 (docs/level-editor-plan-v2.md §2.4). Se
 * abre con `?` y lista todos los atajos de `SHORTCUTS`. Es la respuesta al
 * caso táctil/sin teclado físico: en el celular no hay hover para ver
 * tooltips, así que este panel es la única fuente de ayuda completa ahí.
 */
export function HelpOverlay() {
  const open = useSyncExternalStore(subscribeHelpOverlay, getHelpOverlayOpen, () => false);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      const inField = target?.tagName === "INPUT" || target?.tagName === "TEXTAREA" || target?.isContentEditable;
      if (inField) return;
      if (e.key === "?") {
        e.preventDefault();
        toggleHelpOverlay();
      } else if (e.key === "Escape") {
        setHelpOverlayOpen(false);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/80 p-4" role="dialog" aria-modal="true" aria-labelledby="help-overlay-title">
      <div className="max-h-[80vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-indigo-500/30 bg-slate-900 p-5">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 id="help-overlay-title" className="text-sm font-bold text-white">
            Atajos de teclado
          </h2>
          <button type="button" aria-label="Cerrar ayuda" onClick={() => setHelpOverlayOpen(false)} className="rounded-md p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200">
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>
        <div className="space-y-4">
          {GROUP_ORDER.map((group) => {
            const items = SHORTCUTS.filter((s) => s.group === group);
            if (items.length === 0) return null;
            return (
              <section key={group}>
                <h3 className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">{GROUP_LABEL[group]}</h3>
                <ul className="space-y-1 text-xs">
                  {items.map((s) => (
                    <li key={s.id} className="flex items-center justify-between gap-3">
                      <span className="text-slate-300">{s.label}</span>
                      <kbd className="shrink-0 rounded bg-slate-800 px-1.5 py-0.5 text-[10px] font-bold text-slate-300">{s.keys}</kbd>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
        <p className="mt-4 text-[11px] text-slate-500">Presioná <kbd className="rounded bg-slate-800 px-1 text-[10px]">?</kbd> de nuevo para cerrar.</p>
      </div>
    </div>
  );
}
