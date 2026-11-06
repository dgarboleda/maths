"use client";

import { useEffect, useRef, useState } from "react";

type Scene = { text: string; question: string; options: string[]; answer: number; hint: string; success: string; audio: string; visual: "units" | "groups" | "fractions" };
type Tutorial = { title: string; scenes: Scene[] };

const tutorials: Record<string, Tutorial> = {
  "suma-resta-columnas": { title: "Reagrupa las piezas", scenes: [
    { visual: "units", text: "En el almacén hay ocho piezas y llegan cinco más. Vamos a agruparlas para contar mejor.", question: "¿Cuántas piezas hay en total?", options: ["12", "13", "15"], answer: 1, hint: "Cuenta desde ocho: agrega cinco unidades.", success: "Son 13 unidades: una decena y tres unidades.", audio: "/audio/tutor/unidades-1.mp3" },
    { visual: "units", text: "Una decena representa diez unidades. Podemos cambiar diez piezas por una decena sin cambiar la cantidad.", question: "¿Cómo representamos 13 unidades?", options: ["1 decena y 3 unidades", "3 decenas y 1 unidad", "1 decena y 13 unidades"], answer: 0, hint: "Separa diez de las trece piezas y cuenta las que sobran.", success: "Exacto: 10 + 3 = 13. Reagrupar conserva la cantidad.", audio: "/audio/tutor/unidades-2.mp3" },
  ] },
  "multiplicacion-grupos": { title: "Organiza los paneles", scenes: [
    { visual: "groups", text: "La ciudad instala tres filas de cuatro paneles. Cada fila tiene la misma cantidad.", question: "¿Cuántos paneles hay?", options: ["7", "12", "16"], answer: 1, hint: "Suma cuatro tres veces: 4 + 4 + 4.", success: "Hay 12 paneles: 3 grupos de 4 son 3 × 4 = 12.", audio: "/audio/tutor/grupos-1.mp3" },
    { visual: "groups", text: "Podemos contar los mismos paneles por filas o por columnas sin cambiar el total.", question: "¿Qué otra multiplicación cuenta los mismos paneles?", options: ["4 × 3", "3 + 4", "4 × 4"], answer: 0, hint: "Cuenta las columnas y cuántos paneles hay en cada una.", success: "Cuatro columnas de tres también forman 12: 4 × 3 = 3 × 4.", audio: "/audio/tutor/grupos-2.mp3" },
  ] },
  "fracciones-suma-resta": { title: "Combina reservas de energía", scenes: [
    { visual: "fractions", text: "Dos reservas del mismo tamaño contienen un medio y un cuarto. Para juntarlas necesitamos partes del mismo tamaño.", question: "¿A cuántos cuartos equivale un medio?", options: ["1 cuarto", "2 cuartos", "4 cuartos"], answer: 1, hint: "Divide la mitad en dos partes iguales: cada una es un cuarto de la reserva completa.", success: "Una mitad equivale a dos cuartos de la misma unidad.", audio: "/audio/tutor/fracciones-1.mp3" },
    { visual: "fractions", text: "Ahora las dos cantidades están expresadas en cuartos: dos cuartos y un cuarto.", question: "¿Cuánto suman?", options: ["2/8", "3/4", "3/8"], answer: 1, hint: "Cuenta partes del mismo tamaño; el tamaño de cada parte sigue siendo un cuarto.", success: "Dos cuartos más un cuarto son tres cuartos: 1/2 + 1/4 = 3/4.", audio: "/audio/tutor/fracciones-2.mp3" },
  ] },
};

export function hasVisualTutor(lessonId: string): boolean { return lessonId in tutorials; }

export function VisualTutor({ lessonId }: { lessonId: string }) {
  const tutorial = tutorials[lessonId];
  const [index, setIndex] = useState(0);
  const [feedback, setFeedback] = useState<"correct" | "retry" | null>(null);
  const [muted, setMuted] = useState(false);
  const [audioError, setAudioError] = useState(false);
  const audio = useRef<HTMLAudioElement>(null);
  const scene = tutorial.scenes[index];
  useEffect(() => { const player = audio.current; return () => { player?.pause(); }; }, []);
  const next = () => { audio.current?.pause(); setIndex((i) => i + 1); setFeedback(null); setAudioError(false); };
  return <section aria-label={`Tutor visual: ${tutorial.title}`} className="space-y-4 rounded-2xl border border-cyan-400/40 bg-slate-950 p-4 sm:p-6">
    <div><p className="text-xs font-bold uppercase tracking-wide text-cyan-300">Tutor visual · {index + 1} de {tutorial.scenes.length}</p><h4 className="mt-1 text-xl font-bold text-white">{tutorial.title}</h4></div>
    <div aria-label={scene.visual === "units" ? "Trece piezas: ocho iniciales y cinco nuevas" : scene.visual === "groups" ? "Tres filas de cuatro paneles" : "Una mitad y un cuarto de reservas del mismo tamaño"} role="img" className="rounded-xl bg-slate-800 p-5">
      {scene.visual === "units" && <div className="flex max-w-xs flex-wrap gap-2">{Array.from({ length: 13 }, (_, i) => <span aria-hidden="true" key={i} className={`h-7 w-7 rounded-md ${i < 8 ? "bg-cyan-400" : "bg-amber-300"}`} />)}</div>}
      {scene.visual === "groups" && <div className="grid w-fit grid-cols-4 gap-2">{Array.from({ length: 12 }, (_, i) => <span aria-hidden="true" key={i} className="h-9 w-9 rounded-md border border-cyan-200 bg-cyan-500" />)}</div>}
      {scene.visual === "fractions" && <div className="space-y-2">{[2, 1].map((filled, row) => <div key={row} className="flex max-w-xs gap-1">{Array.from({ length: 4 }, (_, i) => <span aria-hidden="true" key={i} className={`h-10 flex-1 rounded ${i < filled ? "bg-emerald-400" : "bg-slate-600"}`} />)}</div>)}</div>}
    </div>
    <p className="leading-relaxed text-slate-100">{scene.text}</p>
    <audio ref={audio} src={scene.audio} muted={muted} onError={() => setAudioError(true)} preload="none" />
    <div className="flex flex-wrap gap-2"><button type="button" className="min-h-11 rounded-lg border border-cyan-300 px-3 text-cyan-100" onClick={() => { const player = audio.current; if (!player) return; if (player.paused) void player.play().catch(() => setAudioError(true)); else player.pause(); }}>Reproducir / pausar voz</button><button type="button" className="min-h-11 rounded-lg border border-slate-500 px-3" onClick={() => { if (audio.current) { audio.current.currentTime = 0; void audio.current.play().catch(() => setAudioError(true)); } }}>Repetir</button><button type="button" className="min-h-11 rounded-lg border border-slate-500 px-3" onClick={() => setMuted(!muted)}>{muted ? "Activar sonido" : "Silenciar"}</button></div>
    {audioError && <p role="status" className="text-sm text-amber-200">La voz no está disponible. Puedes seguir leyendo y completar la actividad.</p>}
    <fieldset><legend className="mb-2 font-semibold">{scene.question}</legend><div className="flex flex-wrap gap-2">{scene.options.map((option, i) => <button type="button" key={option} disabled={feedback === "correct"} onClick={() => setFeedback(i === scene.answer ? "correct" : "retry")} className="min-h-11 rounded-lg border border-slate-500 px-4 text-left hover:border-cyan-300 disabled:opacity-70">{option}</button>)}</div></fieldset>
    <div aria-live="polite">{feedback === "retry" && <p className="text-amber-200">{scene.hint}</p>}{feedback === "correct" && <p className="text-emerald-200">{scene.success}</p>}</div>
    {feedback === "correct" && index + 1 < tutorial.scenes.length && <button type="button" onClick={next} className="min-h-11 rounded-lg bg-cyan-300 px-4 font-bold text-slate-950">Continuar actividad</button>}
    {feedback === "correct" && index + 1 === tutorial.scenes.length && <p className="font-semibold text-cyan-200">Actividad terminada. Continúa con la clase cuando quieras.</p>}
  </section>;
}
