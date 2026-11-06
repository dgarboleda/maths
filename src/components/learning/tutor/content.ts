import guion from "./guion.json";
import type { ManipulativeState } from "./model";

/**
 * Escenas del tutor visual. El texto (y su audio) sale de `guion.json`; aquí
 * solo se añade el material de partida y la meta que se comprueba sola.
 * Añadir un tema = escenas en el guion + su entrada en `SETUP`.
 */
export interface Scene {
  id: string;
  intro: string;
  hint: string;
  success: string;
  initial: ManipulativeState;
  goal: (state: ManipulativeState) => boolean;
}
export interface Tutorial {
  title: string;
  scenes: Scene[];
}

const units = (a: number, b: number) => [...Array<"a">(a).fill("a"), ...Array<"b">(b).fill("b")];

const SETUP: Record<string, Pick<Scene, "initial" | "goal">> = {
  "unidades-1": {
    initial: { kind: "place-value", tens: 0, loose: units(8, 5), tray: [] },
    goal: (s) => s.kind === "place-value" && s.tens === 1 && s.loose.length + s.tray.length === 3,
  },
  "unidades-2": {
    initial: { kind: "place-value", tens: 3, loose: units(7, 5), tray: [] },
    goal: (s) => s.kind === "place-value" && s.tens === 4 && s.loose.length + s.tray.length === 2,
  },
  "grupos-1": {
    initial: { kind: "array", rows: 1, cols: 1, turns: 0 },
    goal: (s) => s.kind === "array" && s.rows === 3 && s.cols === 4,
  },
  "grupos-2": {
    initial: { kind: "array", rows: 3, cols: 4, turns: 0 },
    goal: (s) => s.kind === "array" && s.rows === 4 && s.cols === 3,
  },
  "grupos-3": {
    initial: { kind: "array", rows: 1, cols: 1, turns: 0 },
    goal: (s) => s.kind === "array" && s.rows === 5 && s.cols === 6,
  },
  "fracciones-1": {
    initial: { kind: "fractions", top: { num: 1, den: 2 }, bottom: { num: 1, den: 4 }, joined: false },
    // Partes del mismo tamaño en las dos reservas, sin juntarlas todavía.
    goal: (s) => s.kind === "fractions" && !s.joined && s.top.den === s.bottom.den,
  },
  "fracciones-2": {
    initial: { kind: "fractions", top: { num: 2, den: 4 }, bottom: { num: 1, den: 4 }, joined: false },
    goal: (s) => s.kind === "fractions" && s.joined && s.top.num * 4 === s.top.den * 3,
  },
  "fracciones-3": {
    initial: { kind: "fractions", top: { num: 1, den: 3 }, bottom: { num: 1, den: 6 }, joined: false },
    goal: (s) => s.kind === "fractions" && s.joined && s.top.num * 2 === s.top.den,
  },
};

export const TUTORIALS: Record<string, Tutorial> = Object.fromEntries(
  Object.entries(guion.tutoriales).map(([lessonId, t]) => [
    lessonId,
    {
      title: t.titulo,
      scenes: t.escenas.map((e) => {
        const setup = SETUP[e.id];
        if (!setup) throw new Error(`Escena del guion sin material: ${e.id}`);
        return { id: e.id, intro: e.intro, hint: e.pista, success: e.logro, ...setup };
      }),
    },
  ]),
);

export const NOTICES: Record<string, string> = guion.avisos;

export function clipUrl(clip: string): string {
  return `/audio/tutor/${clip}.mp3`;
}
