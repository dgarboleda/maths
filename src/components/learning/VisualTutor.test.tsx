import { existsSync } from "node:fs";
import { join } from "node:path";
import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "jest-axe";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getLesson } from "@/lib/learning/domain";
import guion from "./tutor/guion.json";
import { NOTICES, TUTORIALS } from "./tutor/content";
import { hasVisualTutor, TUTOR_LESSONS } from "./tutor/lessons";
import { reduce, type ManipulativeState, type TutorAction } from "./tutor/model";
import { VisualTutor } from "./VisualTutor";

/** Una forma de resolver cada escena con las acciones del alumno. */
const SOLUTIONS: Record<string, TutorAction[]> = {
  "unidades-1": [...Array.from({ length: 10 }, () => ({ type: "to-tray", index: 0 }) as const), { type: "bundle" }],
  "unidades-2": [...Array.from({ length: 10 }, () => ({ type: "to-tray", index: 0 }) as const), { type: "bundle" }],
  "grupos-1": [{ type: "rows", delta: 1 }, { type: "rows", delta: 1 }, { type: "cols", delta: 1 }, { type: "cols", delta: 1 }, { type: "cols", delta: 1 }],
  "grupos-2": [{ type: "turn" }],
  "grupos-3": [...Array.from({ length: 4 }, () => ({ type: "rows", delta: 1 }) as const), ...Array.from({ length: 5 }, () => ({ type: "cols", delta: 1 }) as const)],
  "fracciones-1": [{ type: "split", bar: "top" }],
  "fracciones-2": [{ type: "join" }],
  "fracciones-3": [{ type: "split", bar: "top" }, { type: "join" }],
  "equivalentes-1": [{ type: "split", bar: "top" }, { type: "split", bar: "top" }],
  "equivalentes-2": [{ type: "split", bar: "top" }, { type: "split", bar: "bottom", factor: 3 }],
  "equivalentes-3": [{ type: "split", bar: "top" }],
  "enteros-1": Array.from({ length: 5 }, () => ({ type: "step", delta: 1 }) as const),
  "enteros-2": Array.from({ length: 6 }, () => ({ type: "step", delta: -1 }) as const),
  "enteros-3": Array.from({ length: 4 }, () => ({ type: "step", delta: 1 }) as const),
  "ecuaciones-1": Array.from({ length: 3 }, () => ({ type: "remove-both" }) as const),
  "ecuaciones-2": [{ type: "share" }],
  "ecuaciones-3": [{ type: "remove-both" }, { type: "share" }],
};

let play: ReturnType<typeof vi.fn<() => Promise<void>>>;
beforeEach(() => {
  localStorage.clear();
  play = vi.fn<() => Promise<void>>(() => Promise.resolve());
  vi.spyOn(HTMLMediaElement.prototype, "play").mockImplementation(play);
  vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => {});
});
afterEach(() => vi.restoreAllMocks());

const lastClip = () => (play.mock.contexts.at(-1) as HTMLAudioElement | undefined)?.getAttribute("src");

describe("contenido del tutor visual", () => {
  it("la lista ligera coincide con el guion y cada tutor corresponde a una clase del catálogo", () => {
    expect([...TUTOR_LESSONS].sort()).toEqual(Object.keys(guion.tutoriales).sort());
    for (const id of TUTOR_LESSONS) expect(getLesson(id), id).toBeDefined();
    expect(hasVisualTutor("division-larga")).toBe(false);
  });

  it("cada texto narrado tiene su audio grabado", () => {
    const dir = join(process.cwd(), "public", "audio", "tutor");
    const clips = [
      ...Object.values(TUTORIALS).flatMap((t) => t.scenes.flatMap((s) => [`${s.id}-intro`, `${s.id}-pista`, `${s.id}-logro`])),
      ...Object.keys(NOTICES),
    ];
    for (const clip of clips) expect(existsSync(join(dir, `${clip}.mp3`)), clip).toBe(true);
  });

  it("ninguna escena empieza resuelta y todas se pueden resolver manipulando", () => {
    for (const tutorial of Object.values(TUTORIALS))
      for (const scene of tutorial.scenes) {
        expect(scene.goal(scene.initial), scene.id).toBe(false);
        const end = SOLUTIONS[scene.id].reduce<ManipulativeState>((s, a) => reduce(s, a).state, scene.initial);
        expect(scene.goal(end), scene.id).toBe(true);
      }
  });

  it("no deja juntar partes de distinto tamaño y lo explica", () => {
    const start = TUTORIALS["fracciones-suma-resta"].scenes[0].initial;
    const { state, notice } = reduce(start, { type: "join" });
    expect(state).toBe(start);
    expect(notice).toBe("no-se-puede-juntar");
  });

  it("la balanza nunca se desequilibra: quitar de un lado o repartir antes de tiempo se explica y no se aplica", () => {
    const start = TUTORIALS["ecuaciones-un-paso"].scenes[2].initial;
    expect(reduce(start, { type: "remove-left" })).toEqual({ state: start, notice: "balanza-desequilibrada" });
    expect(reduce(start, { type: "share" })).toEqual({ state: start, notice: "no-se-puede-repartir" });
    const after = reduce(reduce(start, { type: "remove-both" }).state, { type: "share" }).state;
    expect(after).toMatchObject({ xs: 1, left: 0, right: 4 });
  });

  it("en las escenas de comparación las reservas no se juntan", () => {
    const start = TUTORIALS["fracciones-equivalentes"].scenes[1].initial;
    expect(reduce(start, { type: "join" }).state).toBe(start);
  });

  it("la bandeja admite diez unidades como máximo y solo entonces forma una decena", () => {
    let s = TUTORIALS["suma-resta-columnas"].scenes[0].initial;
    s = reduce(s, { type: "bundle" }).state;
    expect(s.kind === "place-value" && s.tens).toBe(0);
    for (let i = 0; i < 12; i++) s = reduce(s, { type: "to-tray", index: 0 }).state;
    expect(s.kind === "place-value" && [s.tray.length, s.loose.length]).toEqual([10, 3]);
  });
});

describe("tutor visual en la clase", () => {
  it("guía la reagrupación pieza a pieza, narra el logro y avanza de escena", () => {
    render(<VisualTutor lessonId="suma-resta-columnas" />);
    expect(screen.getByText(/Práctica guiada: no cuenta como comprobación ni suma estrellas/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Formar decena" })).toBeDisabled();
    for (let i = 0; i < 10; i++) fireEvent.click(screen.getAllByRole("button", { name: /llevar a la bandeja/ })[0]);
    fireEvent.click(screen.getByRole("button", { name: "Formar decena" }));
    expect(screen.getByText(/Diez unidades forman una decena/)).toBeInTheDocument();
    expect(lastClip()).toBe("/audio/tutor/unidades-1-logro.mp3");
    fireEvent.click(screen.getByRole("button", { name: "Continuar actividad" }));
    expect(screen.getByText(/veintisiete más quince/)).toBeInTheDocument();
    expect(lastClip()).toBe("/audio/tutor/unidades-2-intro.mp3");
  });

  it("no reproduce nada hasta que el alumno actúa, y la pista se lee y se escucha", () => {
    render(<VisualTutor lessonId="multiplicacion-grupos" />);
    expect(play).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Necesito una pista" }));
    expect(screen.getByText(/Usa los botones de filas/)).toBeInTheDocument();
    expect(lastClip()).toBe("/audio/tutor/grupos-1-pista.mp3");
  });

  it("se resuelve solo con el teclado", async () => {
    const user = userEvent.setup();
    render(<VisualTutor lessonId="multiplicacion-grupos" />);
    screen.getByRole("button", { name: "Añadir: Filas" }).focus();
    await user.keyboard("{Enter}{Enter}");
    screen.getByRole("button", { name: "Añadir: Paneles por fila" }).focus();
    await user.keyboard("{Enter}{Enter}{Enter}");
    expect(screen.getByText(/tres por cuatro es doce/)).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "3 filas de 4 paneles" })).toBeInTheDocument();
  });

  it("en la recta, restar un negativo se resuelve avanzando con el teclado", async () => {
    const user = userEvent.setup();
    localStorage.setItem("maths:tutor:enteros-suma-resta", JSON.stringify({ scene: 2 }));
    render(<VisualTutor lessonId="enteros-suma-resta" />);
    screen.getByRole("button", { name: "Avanzar 1 →" }).focus();
    await user.keyboard("{Enter}{Enter}{Enter}");
    expect(screen.queryByText(/Llegaste a siete/)).not.toBeInTheDocument();
    await user.keyboard("{Enter}");
    expect(screen.getByText(/Llegaste a siete/)).toBeInTheDocument();
    expect(screen.getByText("3 + 4 = 7")).toBeInTheDocument();
  });

  it("la balanza explica con voz por qué no se quita de un solo lado", () => {
    render(<VisualTutor lessonId="ecuaciones-un-paso" />);
    fireEvent.click(screen.getByRole("button", { name: "Quitar 1 solo a la izquierda" }));
    expect(screen.getByText(/la balanza se inclina/)).toBeInTheDocument();
    expect(lastClip()).toBe("/audio/tutor/balanza-desequilibrada.mp3");
    for (let i = 0; i < 3; i++) fireEvent.click(screen.getByRole("button", { name: "Quitar 1 de cada lado" }));
    expect(screen.getByText(/x vale cuatro/)).toBeInTheDocument();
  });

  it("compara fracciones partiendo en dos y en tres", () => {
    localStorage.setItem("maths:tutor:fracciones-equivalentes", JSON.stringify({ scene: 1 }));
    render(<VisualTutor lessonId="fracciones-equivalentes" />);
    expect(screen.queryByRole("button", { name: "Juntar reservas" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Partir en dos (reserva de arriba)" }));
    fireEvent.click(screen.getByRole("button", { name: "Partir en tres (reserva de abajo)" }));
    expect(screen.getByText("4/6 > 3/6")).toBeInTheDocument();
    expect(screen.getByText(/Dos tercios es más que un medio/)).toBeInTheDocument();
  });

  it("explica, con texto y voz, por qué todavía no se pueden juntar las reservas", () => {
    render(<VisualTutor lessonId="fracciones-suma-resta" />);
    fireEvent.click(screen.getByRole("button", { name: "Juntar reservas" }));
    expect(screen.getByText(/las partes tienen tamaños distintos. Pártelas primero/)).toBeInTheDocument();
    expect(lastClip()).toBe("/audio/tutor/no-se-puede-juntar.mp3");
    fireEvent.click(screen.getByRole("button", { name: /Partir en dos \(reserva de arriba\)/ }));
    expect(screen.getByText(/Un medio es lo mismo que dos cuartos/)).toBeInTheDocument();
  });

  it("silenciar detiene la voz, se recuerda y el texto sigue disponible", () => {
    const { unmount } = render(<VisualTutor lessonId="multiplicacion-grupos" />);
    fireEvent.click(screen.getByRole("button", { name: "Silenciar voz" }));
    expect(screen.getByRole("button", { name: "Activar voz" })).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(screen.getByRole("button", { name: "Necesito una pista" }));
    expect(play).not.toHaveBeenCalled();
    expect(screen.getByText(/Usa los botones de filas/)).toBeInTheDocument();
    unmount();
    render(<VisualTutor lessonId="multiplicacion-grupos" />);
    expect(screen.getByRole("button", { name: "Activar voz" })).toBeInTheDocument();
  });

  it("escuchar, pausar y repetir controlan el clip actual", () => {
    const { container } = render(<VisualTutor lessonId="multiplicacion-grupos" />);
    const audio = container.querySelector("audio")!;
    fireEvent.click(screen.getByRole("button", { name: "Escuchar" }));
    expect(lastClip()).toBe("/audio/tutor/grupos-1-intro.mp3");
    fireEvent.play(audio);
    fireEvent.click(screen.getByRole("button", { name: "Pausar voz" }));
    fireEvent.pause(audio);
    expect(screen.getByRole("button", { name: "Continuar voz" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Repetir" }));
    expect(play).toHaveBeenCalledTimes(2);
  });

  it("conserva la alternativa de texto cuando falla el audio", async () => {
    play.mockImplementation(() => Promise.reject(new DOMException("sin red", "NotSupportedError")));
    const { container } = render(<VisualTutor lessonId="fracciones-suma-resta" />);
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Escuchar" })));
    expect(screen.getByRole("status")).toHaveTextContent("La voz no está disponible");
    fireEvent.error(container.querySelector("audio")!);
    expect(screen.getByText(/Dos reservas del mismo tamaño/)).toBeInTheDocument();
  });

  it("al volver a la clase retoma la escena y permite empezar de nuevo", () => {
    const first = render(<VisualTutor lessonId="multiplicacion-grupos" />);
    fireEvent.click(screen.getByRole("button", { name: "Añadir: Filas" }));
    fireEvent.click(screen.getByRole("button", { name: "Añadir: Filas" }));
    for (let i = 0; i < 3; i++) fireEvent.click(screen.getByRole("button", { name: "Añadir: Paneles por fila" }));
    fireEvent.click(screen.getByRole("button", { name: "Continuar actividad" }));
    first.unmount();
    render(<VisualTutor lessonId="multiplicacion-grupos" />);
    expect(screen.getByText(/escena 2 de 3/)).toBeInTheDocument();
    expect(screen.getByText("Retomas donde lo dejaste.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Empezar desde el principio" }));
    expect(screen.getByText(/escena 1 de 3/)).toBeInTheDocument();
  });

  it("funciona sin almacenamiento local", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("bloqueado");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("bloqueado");
    });
    render(<VisualTutor lessonId="multiplicacion-grupos" />);
    fireEvent.click(screen.getByRole("button", { name: "Girar instalación ↻" }));
    expect(screen.getByText(/escena 1 de 3/)).toBeInTheDocument();
  });

  it.each(TUTOR_LESSONS)("%s es accesible", async (lessonId) => {
    const { container } = render(<VisualTutor lessonId={lessonId} />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
