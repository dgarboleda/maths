"use client";

import { WorldEditorScreen } from "@/components/world-editor/WorldEditorScreen";

/** Editor de Mundo — Fase 17 (docs/level-editor-plan-v2.md §4.2). Ruta
 *  fullscreen (mismo criterio que `/panel/editor/{levelId}`, ver el regex
 *  de `PanelShell.tsx`): sin sidebar del panel familiar, con su propio
 *  encabezado y navegación de pestañas. */
export default function EditorMundoPage() {
  return <WorldEditorScreen />;
}
