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
import { lineExpression, reduce, type ManipulativeState, type TutorAction } from "./tutor/model";
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
  "reparto-1": [{ type: "share-ten" }, { type: "share-ten" }, { type: "share-unit" }],
  "reparto-2": [{ type: "share-ten" }, { type: "share-ten" }, { type: "break-ten" }, ...Array.from({ length: 4 }, () => ({ type: "share-unit" }) as const)],
  "reparto-3": [{ type: "share-ten" }, { type: "break-ten" }, { type: "share-unit" }, { type: "share-unit" }],
  "signos-1": Array.from({ length: 3 }, () => ({ type: "jump" }) as const),
  "signos-2": [...Array.from({ length: 3 }, () => ({ type: "jump" }) as const), { type: "flip" }],
  "signos-3": [...Array.from({ length: 3 }, () => ({ type: "jump" }) as const), { type: "flip" }],
  "dos-pasos-1": [...Array.from({ length: 5 }, () => ({ type: "remove-both" }) as const), { type: "share" }],
  "dos-pasos-2": [...Array.from({ length: 3 }, () => ({ type: "remove-both" }) as const), { type: "share" }],
  "dos-pasos-3": [...Array.from({ length: 2 }, () => ({ type: "remove-both" }) as const), { type: "share" }],
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
    expect(hasVisualTutor("mcd-mcm")).toBe(false);
  });

  it("cada texto narrado tiene su audio grabado", () => {
    const dir = join(process.cwd(), "public", "audio", "tutor");
    const clips = [
      ...Object.values(TUTORIALS).flatMap((t) =>
        t.scenes.flatMap((s) => [`${s.id}-intro`, `${s.id}-pista`, `${s.id}-logro`, ...s.moments.map((m) => `${s.id}-${m.key}`)]),
      ),
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

  it("en un reparto todos reciben lo mismo: si no alcanza, se explica y no se aplica", () => {
    const start = TUTORIALS["division-larga"].scenes[1].initial;
    let s = reduce(reduce(start, { type: "share-ten" }).state, { type: "share-ten" }).state;
    expect(reduce(s, { type: "share-ten" })).toEqual({ state: s, notice: "no-alcanza-para-todos" });
    s = reduce(s, { type: "break-ten" }).state;
    expect(s).toMatchObject({ tens: 0, units: 12 });
  });

  it("tras tomar el opuesto ya no se salta: la recta muestra (−1) × n × salto", () => {
    let s = TUTORIALS["enteros-producto-cociente"].scenes[1].initial;
    for (let i = 0; i < 3; i++) s = reduce(s, { type: "jump" }).state;
    s = reduce(s, { type: "flip" }).state;
    expect(reduce(s, { type: "jump" }).state).toBe(s);
    expect(s.kind === "line" && lineExpression(s)).toBe("(−1) × 3 × 4 = −12");
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
    expect(screen.getByText("1 decena y 3 unidades: 8 + 5 = 13.")).toBeInTheDocument();
    expect(lastClip()).toBe("/audio/tutor/unidades-1-logro.mp3");
    fireEvent.click(screen.getByRole("button", { name: "Continuar actividad" }));
    expect(screen.getByText("27 + 15: hay 12 unidades sueltas. Reagrúpalas.")).toBeInTheDocument();
    expect(lastClip()).toBe("/audio/tutor/unidades-2-intro.mp3");
  });

  it("no reproduce nada hasta que el alumno actúa, y la pista se lee y se escucha", () => {
    render(<VisualTutor lessonId="multiplicacion-grupos" />);
    expect(play).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Necesito una pista" }));
    expect(screen.getByText("Filas: 3. Paneles por fila: 4.")).toBeInTheDocument();
    expect(lastClip()).toBe("/audio/tutor/grupos-1-pista.mp3");
  });

  it("se resuelve solo con el teclado", async () => {
    const user = userEvent.setup();
    render(<VisualTutor lessonId="multiplicacion-grupos" />);
    screen.getByRole("button", { name: "Añadir: Filas" }).focus();
    await user.keyboard("{Enter}{Enter}");
    screen.getByRole("button", { name: "Añadir: Paneles por fila" }).focus();
    await user.keyboard("{Enter}{Enter}{Enter}");
    expect(screen.getByText("3 filas de 4: 4 + 4 + 4 = 3 × 4 = 12.")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "3 filas de 4 paneles" })).toBeInTheDocument();
  });

  it("la voz explica más que la pantalla y su texto completo queda en la transcripción", () => {
    render(<VisualTutor lessonId="multiplicacion-grupos" />);
    const transcript = screen.getByText("Lo que dice la voz").closest("details")!;
    expect(screen.getByText("Arma 3 filas con 4 paneles en cada una.")).toBeInTheDocument();
    expect(transcript).toHaveTextContent(/se cuentan rápido y sin errores/);
    fireEvent.click(screen.getByRole("button", { name: "Necesito una pista" }));
    expect(transcript).toHaveTextContent(/Hay dos controles/);
    // En pantalla, la pista es corta; la explicación completa no se repite fuera de la transcripción.
    expect(screen.getAllByText(/Hay dos controles/)).toHaveLength(1);
    for (const tutorial of Object.values(TUTORIALS))
      for (const scene of tutorial.scenes) {
        expect(scene.voice.intro.length, scene.id).toBeGreaterThan(scene.task.length * 2);
        expect(scene.voice.success, scene.id).not.toBe(scene.success);
      }
  });

  it("comenta momentos clave una sola vez: cruzar el cero y moverse al revés", () => {
    render(<VisualTutor lessonId="enteros-suma-resta" />);
    const left = screen.getByRole("button", { name: "← Retroceder 1" });
    const right = screen.getByRole("button", { name: "Avanzar 1 →" });
    fireEvent.click(left);
    expect(lastClip()).toBe("/audio/tutor/enteros-1-al-reves.mp3");
    fireEvent.click(right);
    for (let i = 0; i < 3; i++) fireEvent.click(right);
    expect(lastClip()).toBe("/audio/tutor/enteros-1-cero.mp3");
    const calls = play.mock.calls.length;
    fireEvent.click(left);
    fireEvent.click(right);
    expect(play.mock.calls.length).toBe(calls);
    expect(screen.getByText("Lo que dice la voz").closest("details")).toHaveTextContent(/Estás en el cero, la planta baja/);
  });

  it("en la recta, restar un negativo se resuelve avanzando con el teclado", async () => {
    const user = userEvent.setup();
    localStorage.setItem("maths:tutor:enteros-suma-resta", JSON.stringify({ scene: 2 }));
    render(<VisualTutor lessonId="enteros-suma-resta" />);
    screen.getByRole("button", { name: "Avanzar 1 →" }).focus();
    await user.keyboard("{Enter}{Enter}{Enter}");
    expect(screen.queryByText("3 − (−4) = 3 + 4 = 7.")).not.toBeInTheDocument();
    await user.keyboard("{Enter}");
    expect(screen.getByText("3 − (−4) = 3 + 4 = 7.")).toBeInTheDocument();
    expect(screen.getByText("3 + 4 = 7")).toBeInTheDocument();
  });

  it("la balanza explica con voz por qué no se quita de un solo lado", () => {
    render(<VisualTutor lessonId="ecuaciones-un-paso" />);
    fireEvent.click(screen.getByRole("button", { name: "Quitar 1 solo a la izquierda" }));
    expect(screen.getByText("Así la balanza se inclina: quita lo mismo de los dos lados.")).toBeInTheDocument();
    expect(lastClip()).toBe("/audio/tutor/balanza-desequilibrada.mp3");
    for (let i = 0; i < 3; i++) fireEvent.click(screen.getByRole("button", { name: "Quitar 1 de cada lado" }));
    expect(screen.getByText("x = 4. Comprobación: 4 + 3 = 7.")).toBeInTheDocument();
  });

  it("compara fracciones partiendo en dos y en tres", () => {
    localStorage.setItem("maths:tutor:fracciones-equivalentes", JSON.stringify({ scene: 1 }));
    render(<VisualTutor lessonId="fracciones-equivalentes" />);
    expect(screen.queryByRole("button", { name: "Juntar reservas" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Partir en dos (reserva de arriba)" }));
    fireEvent.click(screen.getByRole("button", { name: "Partir en tres (reserva de abajo)" }));
    expect(screen.getByText("4/6 > 3/6")).toBeInTheDocument();
    expect(screen.getByText("4/6 > 3/6, así que 2/3 > 1/2.")).toBeInTheDocument();
  });

  it("explica, con texto y voz, por qué todavía no se pueden juntar las reservas", () => {
    render(<VisualTutor lessonId="fracciones-suma-resta" />);
    fireEvent.click(screen.getByRole("button", { name: "Juntar reservas" }));
    expect(screen.getByText("Partes de distinto tamaño: pártelas primero.")).toBeInTheDocument();
    expect(lastClip()).toBe("/audio/tutor/no-se-puede-juntar.mp3");
    fireEvent.click(screen.getByRole("button", { name: /Partir en dos \(reserva de arriba\)/ }));
    expect(screen.getByText("1/2 = 2/4.")).toBeInTheDocument();
  });

  it("silenciar detiene la voz, se recuerda y el texto sigue disponible", () => {
    const { unmount } = render(<VisualTutor lessonId="multiplicacion-grupos" />);
    fireEvent.click(screen.getByRole("button", { name: "Silenciar voz" }));
    expect(screen.getByRole("button", { name: "Activar voz" })).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(screen.getByRole("button", { name: "Necesito una pista" }));
    expect(play).not.toHaveBeenCalled();
    expect(screen.getByText("Filas: 3. Paneles por fila: 4.")).toBeInTheDocument();
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
    expect(screen.getByText("1/2 + 1/4: haz que las partes sean del mismo tamaño.")).toBeInTheDocument();
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
