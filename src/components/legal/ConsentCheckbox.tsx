import Link from "next/link";

/** Casilla de consentimiento parental. El texto es parte de lo aceptado: si
 * cambia en sustancia, sube `LEGAL_VERSION` para pedirlo de nuevo. */
export function ConsentCheckbox({ checked, onChange }: { checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label className="flex items-start gap-3 text-sm leading-relaxed text-indigo-100">
      <input
        type="checkbox"
        required
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1 size-5 shrink-0 accent-violet-500"
      />
      <span>
        Soy madre, padre o tutor legal. Acepto los{" "}
        <Link href="/terminos" target="_blank" className="font-bold text-cyan-300 underline">términos de uso</Link>{" "}
        y la{" "}
        <Link href="/privacidad" target="_blank" className="font-bold text-cyan-300 underline">política de privacidad</Link>, y
        autorizo el tratamiento de los datos de los menores a mi cargo que registre.
      </span>
    </label>
  );
}
