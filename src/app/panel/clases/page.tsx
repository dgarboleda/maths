"use client";

import { useEffect, useState } from "react";
import { useFamily } from "@/components/family/FamilyProvider";
import { getFirebase } from "@/lib/firebase";
import { CUSTOM_GAMES, validateCustomLesson, type CustomLesson, type CustomQuestion } from "../../../../functions/src/customLessons/schema";

type Entry = CustomLesson & { id: string };
const blank = (): CustomLesson => ({ title: "", topic: "", content: "", game: "write", questions: [], published: false, updatedAt: Date.now() });
const input = "w-full rounded-lg border border-slate-600 bg-slate-950 p-2 text-white";
export default function CustomLessonsEditor() {
  const { parentId } = useFamily();
  const [items, setItems] = useState<Entry[]>([]);
  const [id, setId] = useState<string | null>(null);
  const [draft, setDraft] = useState<CustomLesson>(blank);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!parentId) return;
    let off: (() => void) | undefined, cancelled = false;
    getFirebase().then(({ db, firestore }) => { if (!cancelled) off = firestore.onSnapshot(firestore.collection(db, "parents", parentId, "customLessons"), snap => setItems(snap.docs.map(d => ({ ...d.data() as CustomLesson, id: d.id }))), () => setMessage("No se pudieron cargar las clases.")); }).catch(() => setMessage("No se pudieron cargar las clases."));
    return () => { cancelled = true; off?.(); };
  }, [parentId]);
  function updateQuestion(index: number, patch: Partial<CustomQuestion>) { setDraft(d => ({ ...d, questions: d.questions.map((q, i) => i === index ? { ...q, ...patch } : q) })); }
  async function save(published: boolean) {
    if (!parentId || busy) return;
    const next = { ...draft, published, updatedAt: Date.now() };
    if (!next.title.trim() || (published && !validateCustomLesson(next))) { setMessage(published ? "Completa tema, título, clase y preguntas. Cada pregunta necesita respuestas distintas y selecciona la correcta; los minijuegos necesitan cinco opciones." : "Escribe al menos el título para guardar el borrador."); return; }
    setBusy(true); setMessage("");
    try { const { db, firestore } = await getFirebase(); const ref = id ? firestore.doc(db, "parents", parentId, "customLessons", id) : firestore.doc(firestore.collection(db, "parents", parentId, "customLessons")); await firestore.setDoc(ref, next); setId(ref.id); setDraft(next); setMessage(published ? "Clase publicada para tus alumnos." : "Borrador guardado."); } catch { setMessage("No se pudo guardar. Comprueba la conexión y vuelve a intentarlo."); } finally { setBusy(false); }
  }
  return <div className="space-y-6 text-white"><header><h1 className="text-2xl font-bold">Crear clases</h1><p className="text-slate-300">Escribe una clase y prepara preguntas para tus alumnos.</p></header>
    <div className="flex flex-wrap gap-2"><button className="rounded-lg bg-violet-700 px-3 py-2" onClick={() => { setId(null); setDraft(blank()); setMessage(""); }}>Nueva clase</button>{items.map(item => <button className="rounded-lg border border-slate-500 px-3 py-2" key={item.id} onClick={() => { const { id: key, ...lesson } = item; setId(key); setDraft(lesson); setMessage(""); }}>{item.title || "Sin título"} {item.published ? "· Publicada" : "· Borrador"}</button>)}</div>
    <div className="space-y-4 rounded-xl border border-slate-700 p-4">
      <label className="block">Tema<input className={input} value={draft.topic} maxLength={120} onChange={e => setDraft({ ...draft, topic: e.target.value })} /></label>
      <label className="block">Título de la clase<input className={input} value={draft.title} maxLength={120} onChange={e => setDraft({ ...draft, title: e.target.value })} /></label>
      <label className="block">Contenido de la clase<textarea className={input} rows={8} maxLength={10000} value={draft.content} onChange={e => setDraft({ ...draft, content: e.target.value })} /></label>
      <label className="block">Minijuego<select className={input} value={draft.game} onChange={e => setDraft({ ...draft, game: e.target.value as CustomLesson["game"] })}>{CUSTOM_GAMES.map(g => <option key={g} value={g}>{({ write: "Sin minijuego", frogger: "Estanque", cohete: "Cohete", snake: "Serpiente", runner: "Carrera", numberpac: "Laberinto", invaders: "Invasión", breakout: "Bloques numéricos", topos: "Topos", cajas: "Cajas" })[g]}</option>)}</select></label>
      <h2 className="text-xl font-bold">Preguntas</h2><p className="text-sm text-slate-300">Escribe cada respuesta en una línea e indica cuál es correcta. Para minijuegos añade cinco opciones distintas.</p>
      {draft.questions.map((q, i) => <fieldset key={q.id} className="space-y-2 rounded-lg border border-slate-600 p-3"><legend>Pregunta {i + 1}</legend><label className="block">Enunciado<input className={input} value={q.prompt} onChange={e => updateQuestion(i, { prompt: e.target.value })} /></label><label className="block">Respuestas (una por línea)<textarea className={input} rows={5} defaultValue={q.options.join("\n")} onBlur={e => { const options = e.target.value.split("\n").map(x => x.trim()).filter(Boolean); updateQuestion(i, { options, answer: JSON.stringify(options) === JSON.stringify(q.options) ? q.answer : -1 }); }} /></label><label className="block">Respuesta correcta<select className={input} value={q.answer} onChange={e => updateQuestion(i, { answer: Number(e.target.value) })}><option value={-1}>Selecciona la respuesta correcta</option>{q.options.map((option, index) => <option key={index} value={index}>{option}</option>)}</select></label><label className="block">Explicación<textarea className={input} value={q.explanation} onChange={e => updateQuestion(i, { explanation: e.target.value })} /></label><button className="underline" onClick={() => setDraft({ ...draft, questions: draft.questions.filter((_, n) => n !== i) })}>Quitar pregunta {i + 1}</button></fieldset>)}
      <button className="rounded-lg border border-cyan-300 px-3 py-2" onClick={() => setDraft({ ...draft, questions: [...draft.questions, { id: crypto.randomUUID(), prompt: "", answer: -1, options: [], explanation: "" }] })}>Añadir pregunta</button>
      <div className="flex flex-wrap gap-3"><button disabled={busy} className="rounded-lg bg-slate-700 px-4 py-2" onClick={() => void save(false)}>Guardar borrador</button><button disabled={busy} className="rounded-lg bg-violet-700 px-4 py-2" onClick={() => void save(true)}>Publicar para alumnos</button></div><p role="status">{message}</p>
    </div></div>;
}
