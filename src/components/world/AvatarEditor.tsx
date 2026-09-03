"use client";

import { useState } from "react";
import { getFirebase } from "@/lib/firebase";
import {
  ACCESSORIES,
  ACCESSORY_LABEL,
  HAIR_COLORS,
  OUTFIT_COLORS,
  SKIN_TONES,
  type AvatarLook,
} from "@/lib/world/avatar";
import { Avatar } from "./Avatar";
import { WorldDialog } from "./WorldDialog";

/**
 * Personalización del personaje. Se guarda en el doc del hijo en Firestore
 * (nunca en localStorage), junto al resto del perfil.
 */
export function AvatarEditor({
  parentId,
  childId,
  look,
  onChange,
  onClose,
}: {
  parentId: string;
  childId: string;
  look: AvatarLook;
  onChange: (look: AvatarLook) => void;
  onClose: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const {
        db,
        firestore: { doc, updateDoc },
      } = await getFirebase();
      await updateDoc(doc(db, "parents", parentId, "children", childId), { avatar: look });
      onClose();
    } catch (err) {
      console.error("No se pudo guardar el personaje", err);
      setError("No se pudo guardar. Intenta de nuevo.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <WorldDialog icon="🧑‍🚀" title="Tu personaje" subtitle="Elige cómo te ves en la ciudad" onClose={onClose}>
      <div className="space-y-4">
        <div className="flex justify-center rounded-2xl border border-indigo-500/25 bg-slate-950/60 py-4">
          <Avatar look={look} className="h-28 w-20" />
        </div>

        <Swatches
          label="Piel"
          colors={SKIN_TONES}
          value={look.skin}
          onPick={(skin) => onChange({ ...look, skin })}
        />
        <Swatches
          label="Pelo"
          colors={HAIR_COLORS}
          value={look.hair}
          onPick={(hair) => onChange({ ...look, hair })}
        />
        <Swatches
          label="Ropa"
          colors={OUTFIT_COLORS}
          value={look.outfit}
          onPick={(outfit) => onChange({ ...look, outfit })}
        />

        <fieldset>
          <legend className="mb-1.5 text-xs font-bold uppercase tracking-wide text-indigo-300">Accesorio</legend>
          <div className="flex flex-wrap gap-2">
            {ACCESSORIES.map((accessory) => (
              <button
                key={accessory}
                type="button"
                onClick={() => onChange({ ...look, accessory })}
                aria-pressed={look.accessory === accessory}
                className={`rounded-xl border px-3 py-1.5 text-xs font-bold ${
                  look.accessory === accessory
                    ? "border-violet-300 bg-violet-600 text-white"
                    : "border-white/15 bg-slate-800 text-slate-200 hover:border-white/40"
                }`}
              >
                {ACCESSORY_LABEL[accessory]}
              </button>
            ))}
          </div>
        </fieldset>

        {error && (
          <p role="alert" className="text-sm font-bold text-red-400">
            {error}
          </p>
        )}

        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="w-full rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
        >
          Guardar personaje
        </button>
      </div>
    </WorldDialog>
  );
}

function Swatches({
  label,
  colors,
  value,
  onPick,
}: {
  label: string;
  colors: string[];
  value: string;
  onPick: (color: string) => void;
}) {
  return (
    <fieldset>
      <legend className="mb-1.5 text-xs font-bold uppercase tracking-wide text-indigo-300">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {colors.map((color, i) => (
          <button
            key={color}
            type="button"
            onClick={() => onPick(color)}
            aria-pressed={value === color}
            aria-label={`${label} ${i + 1}`}
            className={`h-9 w-9 rounded-full border-2 ${
              value === color ? "border-white ring-2 ring-violet-400" : "border-white/20"
            }`}
            style={{ backgroundColor: color }}
          />
        ))}
      </div>
    </fieldset>
  );
}
