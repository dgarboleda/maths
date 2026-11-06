import guion from "./guion.json";
import { shareDone, type ManipulativeState } from "./model";

/**
 * Escenas del tutor visual. El texto sale de `guion.json`: la pantalla
 * muestra la consigna, la pista y el logro en corto; la voz explica más
 * (contexto, por qué, errores comunes) y su texto completo se puede leer en
 * la transcripción. Aquí se añade el material de partida, la meta y cuándo
 * suena cada comentario a mitad de la actividad («momentos»).
 * Añadir un tema = escenas en el guion + su entrada en `SETUP`.
 */
type Check = (state: ManipulativeState) => boolean;

export interface Moment {
  /** Clip `<escena>-<clave>`. */
  key: string;
  voice: string;
  when: Check;
}
export interface Scene {
  id: string;
  /** En pantalla: corto y operativo. */
  task: string;
  hint: string;
  success: string;
  /** Lo que dice la voz, más completo que la pantalla. */
  voice: { intro: string; hint: string; success: string };
  moments: Moment[];
  initial: ManipulativeState;
  goal: Check;
}
export interface Tutorial {
  title: string;
  scenes: Scene[];
}

const xAlone: Check = (s) => s.kind === "balance" && s.left === 0 && s.xs > 1;
const trayFull: Check = (s) => s.kind === "place-value" && s.tray.length === 10;

const units = (a: number, b: number) => [...Array<"a">(a).fill("a"), ...Array<"b">(b).fill("b")];

const SETUP: Record<string, { initial: ManipulativeState; goal: Check; moments?: Record<string, Check> }> = {
  "unidades-1": {
    initial: { kind: "place-value", tens: 0, loose: units(8, 5), tray: [] },
    goal: (s) => s.kind === "place-value" && s.tens === 1 && s.loose.length + s.tray.length === 3,
    moments: { "bandeja-llena": trayFull },
  },
  "unidades-2": {
    initial: { kind: "place-value", tens: 3, loose: units(7, 5), tray: [] },
    goal: (s) => s.kind === "place-value" && s.tens === 4 && s.loose.length + s.tray.length === 2,
    moments: { "bandeja-llena": trayFull },
  },
  "grupos-1": {
    initial: { kind: "array", rows: 1, cols: 1, turns: 0 },
    goal: (s) => s.kind === "array" && s.rows === 3 && s.cols === 4,
    moments: { "filas-listas": (s) => s.kind === "array" && s.rows === 3 && s.cols !== 4 },
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
  "equivalentes-1": {
    initial: { kind: "fractions", top: { num: 1, den: 2 }, bottom: { num: 1, den: 2 }, joined: false, joinable: false },
    goal: (s) => s.kind === "fractions" && s.top.num === 4 && s.top.den === 8,
    moments: { cuartos: (s) => s.kind === "fractions" && s.top.den === 4 },
  },
  "equivalentes-2": {
    initial: { kind: "fractions", top: { num: 2, den: 3 }, bottom: { num: 1, den: 2 }, joined: false, joinable: false },
    goal: (s) => s.kind === "fractions" && s.top.den === s.bottom.den,
  },
  "equivalentes-3": {
    initial: { kind: "fractions", top: { num: 3, den: 4 }, bottom: { num: 5, den: 8 }, joined: false, joinable: false },
    goal: (s) => s.kind === "fractions" && s.top.den === s.bottom.den,
  },
  "enteros-1": {
    initial: { kind: "line", start: -3, pos: -3, min: -5, max: 5 },
    goal: (s) => s.kind === "line" && s.pos === 2,
    moments: { cero: (s) => s.kind === "line" && s.pos === 0, "al-reves": (s) => s.kind === "line" && s.pos < s.start },
  },
  "enteros-2": {
    initial: { kind: "line", start: 4, pos: 4, min: -5, max: 5 },
    goal: (s) => s.kind === "line" && s.pos === -2,
    moments: { cero: (s) => s.kind === "line" && s.pos === 0, "al-reves": (s) => s.kind === "line" && s.pos > s.start },
  },
  "enteros-3": {
    initial: { kind: "line", start: 3, pos: 3, min: -1, max: 9 },
    goal: (s) => s.kind === "line" && s.pos === 7,
    moments: { "al-reves": (s) => s.kind === "line" && s.pos < s.start },
  },
  "ecuaciones-1": {
    initial: { kind: "balance", xs: 1, left: 3, right: 7 },
    goal: (s) => s.kind === "balance" && s.xs === 1 && s.left === 0,
    moments: { primera: (s) => s.kind === "balance" && s.left === 2 },
  },
  "ecuaciones-2": {
    initial: { kind: "balance", xs: 3, left: 0, right: 12 },
    goal: (s) => s.kind === "balance" && s.xs === 1 && s.left === 0,
  },
  "ecuaciones-3": {
    initial: { kind: "balance", xs: 2, left: 1, right: 9 },
    goal: (s) => s.kind === "balance" && s.xs === 1 && s.left === 0,
  },
  "reparto-1": {
    initial: { kind: "share", groups: 3, tens: 6, units: 3, eachTens: 0, eachUnits: 0 },
    goal: (s) => s.kind === "share" && shareDone(s) && s.eachTens * 10 + s.eachUnits === 21,
    moments: { "decenas-listas": (s) => s.kind === "share" && s.tens === 0 && s.eachTens > 0 && s.eachUnits === 0 && s.units > 0 },
  },
  "reparto-2": {
    initial: { kind: "share", groups: 3, tens: 7, units: 2, eachTens: 0, eachUnits: 0 },
    goal: (s) => s.kind === "share" && shareDone(s) && s.eachTens * 10 + s.eachUnits === 24,
    moments: { "sobra-decena": (s) => s.kind === "share" && s.tens === 1 && s.eachTens === 2 },
  },
  "reparto-3": {
    initial: { kind: "share", groups: 6, tens: 7, units: 5, eachTens: 0, eachUnits: 0 },
    goal: (s) => s.kind === "share" && shareDone(s) && s.eachTens * 10 + s.eachUnits === 12,
  },
  "signos-1": {
    initial: { kind: "line", start: 0, pos: 0, min: -12, max: 12, jump: -4 },
    goal: (s) => s.kind === "line" && s.pos === -12,
  },
  "signos-2": {
    initial: { kind: "line", start: 0, pos: 0, min: -12, max: 12, jump: 4, canFlip: true },
    goal: (s) => s.kind === "line" && s.pos === -12 && (s.flips ?? 0) % 2 === 1,
    moments: { doce: (s) => s.kind === "line" && s.pos === 12 && (s.flips ?? 0) % 2 === 0 },
  },
  "signos-3": {
    initial: { kind: "line", start: 0, pos: 0, min: -12, max: 12, jump: -4, canFlip: true },
    goal: (s) => s.kind === "line" && s.pos === 12 && (s.flips ?? 0) % 2 === 1,
    moments: { "menos-doce": (s) => s.kind === "line" && s.pos === -12 && (s.flips ?? 0) % 2 === 0 },
  },
  "dos-pasos-1": {
    initial: { kind: "balance", xs: 3, left: 5, right: 20 },
    goal: (s) => s.kind === "balance" && s.xs === 1 && s.left === 0,
    moments: { "x-solas": xAlone },
  },
  "dos-pasos-2": {
    initial: { kind: "balance", xs: 2, left: 3, right: 11 },
    goal: (s) => s.kind === "balance" && s.xs === 1 && s.left === 0,
    moments: { "x-solas": xAlone },
  },
  "dos-pasos-3": {
    initial: { kind: "balance", xs: 4, left: 2, right: 14 },
    goal: (s) => s.kind === "balance" && s.xs === 1 && s.left === 0,
    moments: { "x-solas": xAlone },
  },
};

export const TUTORIALS: Record<string, Tutorial> = Object.fromEntries(
  Object.entries(guion.tutoriales).map(([lessonId, t]) => [
    lessonId,
    {
      title: t.titulo,
      scenes: t.escenas.map((e): Scene => {
        const setup = SETUP[e.id];
        if (!setup) throw new Error(`Escena del guion sin material: ${e.id}`);
        const said = (("momentos" in e ? e.momentos : undefined) ?? {}) as Record<string, string>;
        const moments = Object.entries(setup.moments ?? {}).map(([key, when]) => {
          if (!said[key]) throw new Error(`Momento sin texto en el guion: ${e.id}-${key}`);
          return { key, voice: said[key], when };
        });
        return {
          id: e.id,
          task: e.consigna,
          hint: e.pista,
          success: e.logro,
          voice: { intro: e.voz.intro, hint: e.voz.pista, success: e.voz.logro },
          moments,
          initial: setup.initial,
          goal: setup.goal,
        };
      }),
    },
  ]),
);

/** Avisos cuando una acción no se puede hacer: texto corto y explicación en voz. */
export const NOTICES: Record<string, { text: string; voice: string }> = Object.fromEntries(
  Object.entries(guion.avisos).map(([key, aviso]) => [key, { text: aviso.texto, voice: aviso.voz }]),
);

export function clipUrl(clip: string): string {
  return `/audio/tutor/${clip}.mp3`;
}
