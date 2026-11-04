import type { StarPlan } from "@/lib/learning/starPlan";

/** Desglose de estrellas por sección: ganadas, tope y qué aporta cada actividad. */
export function StarBreakdown({ plan, available, who = "tú" }: { plan: StarPlan; available: number | null; who?: string }) {
  const you = who === "tú";
  const stat = (label: string, value: number | null, tone: string) => (
    <div className="rounded-xl bg-slate-900/80 p-3 text-center">
      <p className={`font-display text-2xl font-bold tabular-nums ${tone}`}>{value ?? "…"}</p>
      <p className="text-xs text-slate-300">{label}</p>
    </div>
  );
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2">
        {stat(you ? "tienes ahora" : "disponibles", available, "text-amber-300")}
        {stat(you ? "ganaste en total" : "ganadas", plan.earned, "text-emerald-300")}
        {stat(you ? "canjeaste" : "canjeadas", plan.spent, "text-violet-300")}
      </div>
      <table className="w-full text-left text-sm">
        <caption className="sr-only">Estrellas por sección</caption>
        <thead>
          <tr className="text-xs text-slate-400">
            <th scope="col" className="py-1">Sección</th>
            <th scope="col" className="py-1 text-right">Ganadas</th>
            <th scope="col" className="py-1 text-right">Posibles</th>
          </tr>
        </thead>
        <tbody>
          {plan.sections.map((s) => (
            <tr key={s.id} className="border-t border-slate-700/70 align-top">
              <th scope="row" className="py-2 pr-2 font-semibold text-slate-100">
                {s.label}
                <span className="block text-xs font-normal text-slate-400">{s.rule}{s.total !== null ? ` · ${s.done} de ${s.total}` : ""}</span>
                {s.possible !== null && (
                  <span aria-hidden="true" className="mt-1 block h-1.5 overflow-hidden rounded-full bg-slate-800">
                    <span className="block h-full rounded-full bg-amber-300" style={{ width: `${Math.round((s.earned / s.possible) * 100)}%` }} />
                  </span>
                )}
              </th>
              <td className="py-2 text-right font-bold tabular-nums text-amber-200">{s.earned}</td>
              <td className="py-2 text-right tabular-nums text-slate-300">{s.possible ?? "sin tope"}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-sm text-slate-200">
        {plan.remaining > 0
          ? <>{you ? "Todavía puedes ganar" : "Todavía puede ganar"} <strong className="text-amber-300">{plan.remaining} ⭐</strong> en clases, repasos y aventuras (de {plan.possible}), y 2 más cada día con el repaso diario.</>
          : <>{you ? "Ya ganaste" : "Ya ganó"} todas las estrellas de clases, repasos y aventuras. El repaso diario sigue dando 2 al día.</>}
      </p>
    </div>
  );
}
