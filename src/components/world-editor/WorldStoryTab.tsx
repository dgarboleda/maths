"use client";

import { Plus, Trash2 } from "lucide-react";
import { newChapterId } from "@/lib/gameworld/ids";
import type { GameWorld, WorldChapter } from "@/lib/gameworld/schema";
import { IconButton } from "@/components/ui/IconButton";
import { Tooltip } from "@/components/ui/Tooltip";
import { StoryBeatEditor, STORY_LABEL_CLASS as LABEL_CLASS, STORY_INPUT_CLASS as INPUT_CLASS } from "./StoryBeatEditor";

/**
 * Historia del mundo — Fase 17 (docs/level-editor-plan-v2.md §4.2). Los
 * nombres propios que hoy están hardcodeados en el código (Alex, Dra. Nia,
 * Khaos, AXIA, NEXUS — `WorldHud.tsx`, `questScene.ts`) pasan a ser dato
 * editable acá; el HUD del juego sigue leyendo sus propias constantes por
 * ahora (rewirearlo queda fuera de esta fase, ver docs/level-editor-plan-v2.md).
 */
export function WorldStoryTab({ world, onChange }: { world: GameWorld; onChange: (world: GameWorld) => void }) {
  function setStory(patch: Partial<GameWorld["story"]>) {
    onChange({ ...world, story: { ...world.story, ...patch } });
  }

  function addChapter() {
    const chapter: WorldChapter = {
      id: newChapterId(),
      order: world.chapters.length,
      title: `Capítulo ${world.chapters.length + 1}`,
      synopsis: "",
      regionSlug: "",
      intro: [],
      outro: [],
    };
    onChange({ ...world, chapters: [...world.chapters, chapter] });
  }

  function updateChapter(id: string, patch: Partial<WorldChapter>) {
    onChange({ ...world, chapters: world.chapters.map((c) => (c.id === id ? { ...c, ...patch } : c)) });
  }

  function removeChapter(id: string) {
    onChange({ ...world, chapters: world.chapters.filter((c) => c.id !== id) });
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-4 text-xs sm:p-6">
      <section className="space-y-3">
        <h2 className="text-sm font-bold text-white">Historia</h2>

        <label className="block">
          <span className={LABEL_CLASS}>Título del mundo</span>
          <input type="text" className={INPUT_CLASS} value={world.story.title} onChange={(e) => setStory({ title: e.target.value })} />
        </label>

        <label className="block">
          <span className={LABEL_CLASS}>Logline (se muestra en el mapa del jugador, hasta 240 caracteres)</span>
          <textarea rows={2} maxLength={240} className={`${INPUT_CLASS} resize-none`} value={world.story.logline} onChange={(e) => setStory({ logline: e.target.value })} />
        </label>

        <div className="grid grid-cols-2 gap-2">
          <label className="block">
            <span className={LABEL_CLASS}>Protagonista</span>
            <input type="text" className={INPUT_CLASS} value={world.story.protagonistName} onChange={(e) => setStory({ protagonistName: e.target.value })} />
          </label>
          <label className="block">
            <span className={LABEL_CLASS}>Mentor/a</span>
            <input type="text" className={INPUT_CLASS} value={world.story.mentorName} onChange={(e) => setStory({ mentorName: e.target.value })} />
          </label>
          <label className="block">
            <span className={LABEL_CLASS}>Antagonista</span>
            <input type="text" className={INPUT_CLASS} value={world.story.antagonistName} onChange={(e) => setStory({ antagonistName: e.target.value })} />
          </label>
          <label className="block">
            <span className={LABEL_CLASS}>Energía</span>
            <input type="text" className={INPUT_CLASS} value={world.story.energyName} onChange={(e) => setStory({ energyName: e.target.value })} />
          </label>
          <label className="block">
            <span className={LABEL_CLASS}>Contra-energía</span>
            <input type="text" className={INPUT_CLASS} value={world.story.counterEnergyName} onChange={(e) => setStory({ counterEnergyName: e.target.value })} />
          </label>
        </div>
      </section>

      <section className="space-y-2 border-t border-indigo-500/10 pt-4">
        <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Cinemática de apertura</h3>
        <StoryBeatEditor beats={world.story.intro} onChange={(intro) => setStory({ intro })} />
      </section>

      <section className="space-y-2 border-t border-indigo-500/10 pt-4">
        <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Cinemática de cierre</h3>
        <StoryBeatEditor beats={world.story.outro} onChange={(outro) => setStory({ outro })} />
      </section>

      <section className="space-y-3 border-t border-indigo-500/10 pt-4">
        <div className="flex items-center justify-between">
          <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Capítulos</h3>
          <IconButton icon={Plus} label="Añadir capítulo" tooltip="Agrupa niveles del mapa bajo un capítulo de la historia." side="left" tone="accent" onClick={addChapter} />
        </div>
        {world.chapters.length === 0 && <p className="text-[11px] text-slate-500">Sin capítulos todavía — opcional, solo agrupa niveles del mapa.</p>}
        {world.chapters
          .slice()
          .sort((a, b) => a.order - b.order)
          .map((chapter) => (
            <div key={chapter.id} className="space-y-1.5 rounded-lg border border-indigo-500/15 bg-slate-900/40 p-2">
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  placeholder="Título del capítulo"
                  className={`${INPUT_CLASS} flex-1`}
                  value={chapter.title}
                  onChange={(e) => updateChapter(chapter.id, { title: e.target.value })}
                />
                <Tooltip content="Eliminar capítulo." side="left">
                  <button type="button" onClick={() => removeChapter(chapter.id)} className="shrink-0 rounded-md p-1.5 text-rose-400 hover:bg-rose-500/10">
                    <Trash2 className="size-3.5" aria-hidden="true" />
                  </button>
                </Tooltip>
              </div>
              <textarea
                rows={2}
                placeholder="Sinopsis…"
                className={`${INPUT_CLASS} resize-none`}
                value={chapter.synopsis}
                onChange={(e) => updateChapter(chapter.id, { synopsis: e.target.value })}
              />
            </div>
          ))}
      </section>
    </div>
  );
}
