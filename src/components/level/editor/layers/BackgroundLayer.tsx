import type { LevelBackground } from "@/lib/level/schema";

/** Fondo del nivel — llena el "stage" 1:1 (igual que `QuestScene.tsx:410-416`,
 *  sin el filtro condicional de flags: eso lo interpreta el runtime, Fase 9). */
export function BackgroundLayer({ background }: { background: LevelBackground }) {
  if (!background.src) return <div className="absolute inset-0 bg-slate-900" aria-hidden="true" />;
  return (
    // eslint-disable-next-line @next/next/no-img-element -- tamaño nativo variable por nivel, no vale la pena next/image acá
    <img src={background.src} alt={background.alt} className="absolute inset-0 block size-full object-cover" />
  );
}
