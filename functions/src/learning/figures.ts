/**
 * Figuras de apoyo de una pregunta: solo datos (sin React), compartidos por
 * Functions y Next. Se generan con los mismos parámetros que el enunciado y
 * las dibuja `src/components/learning/QuestionFigure.tsx`.
 *
 * Reglas (ver `figures.test.ts`):
 * - La incógnita se rotula «?»: la figura nunca muestra la respuesta.
 * - Las figuras geométricas no están a escala (lo dice la propia figura),
 *   para que no se pueda medir la respuesta en la pantalla.
 * - Cada figura lleva una descripción para lectores de pantalla
 *   (`describeFigure`), escrita a partir de los mismos datos.
 */
import type { Question } from "./types";

/** Texto rotulado en la figura («65°», «8 cm»). «?» marca la incógnita. */
export type FigureLabel = string;

/** Posición de un ángulo en el cruce de una paralela con la secante. */
export type CrossingPosition = "tl" | "tr" | "bl" | "br";
export type BagColor = "rojo" | "azul" | "verde" | "amarillo" | "negro" | "blanco";

export type Figure =
  /** Tabla de datos. `rowHeads`: la primera celda de cada fila es su título. */
  | { kind: "table"; caption?: string; head: string[]; rows: (string | number)[][]; rowHeads?: boolean }
  /** Triángulo. Vértices A (abajo izquierda), B (abajo derecha), C (arriba).
   *  Lados: 0 = AB (base), 1 = BC, 2 = CA. Ángulos: 0 = A, 1 = B, 2 = C.
   *  En `right`, el ángulo recto está en A: catetos AB y CA, hipotenusa BC. */
  | {
      kind: "triangle";
      shape: "scalene" | "isosceles" | "equilateral" | "right" | "obtuse";
      sides?: (FigureLabel | null)[];
      angles?: (FigureLabel | null)[];
      /** Lados con la marca de lados iguales. */
      ticks?: number[];
      /** Altura desde C hasta la base, rotulada. */
      height?: FigureLabel;
    }
  /** Cuadrilátero o triángulo con medidas de área (altura discontinua). */
  | {
      kind: "polygon";
      shape: "rectangle" | "square" | "parallelogram" | "trapezoid" | "rhombus" | "triangle" | "kite" | "l-shape";
      base?: FigureLabel;
      top?: FigureLabel;
      side?: FigureLabel;
      height?: FigureLabel;
      diagonals?: [FigureLabel, FigureLabel];
      /** Forma de L: medidas de la esquina que falta (ancho, alto). */
      notch?: [FigureLabel, FigureLabel];
      /** Ángulos interiores desde abajo a la izquierda, en sentido antihorario. */
      angles?: (FigureLabel | null)[];
    }
  /** Polígono regular de `sides` lados con la apotema dibujada. */
  | { kind: "regular"; sides: number; side?: FigureLabel; apothem?: FigureLabel }
  /** Teorema de Tales: tres paralelas cortan dos rectas; segmentos de arriba
   *  abajo en la recta izquierda (`left`) y en la derecha (`right`). */
  | { kind: "thales"; left: [FigureLabel, FigureLabel]; right: [FigureLabel, FigureLabel] }
  /** Dos triángulos semejantes (pequeño y grande), con los lados
   *  correspondientes del mismo color. Lados como en `triangle`. */
  | {
      kind: "similar";
      shape: "scalene" | "right";
      small: (FigureLabel | null)[];
      big: (FigureLabel | null)[];
      names?: [string, string];
    }
  /** Dos rectas (paralelas salvo `parallel: false`) cortadas por una secante.
   *  `line` 0 es la de arriba. */
  | {
      kind: "parallels";
      parallel?: boolean;
      marks: { line: 0 | 1; pos: CrossingPosition; label: FigureLabel }[];
    }
  /** Ángulos alrededor de un punto: sobre una recta (180), en un ángulo
   *  recto (90) o una vuelta completa (360). `deg` solo coloca los rayos. */
  | { kind: "angles"; around: 90 | 180 | 360; parts: { deg: number; label: FigureLabel }[] }
  | {
      kind: "circle";
      radius?: FigureLabel;
      diameter?: FigureLabel;
      sector?: { deg: number; label?: FigureLabel };
      /** Radio de un círculo interior (corona circular). */
      inner?: FigureLabel;
    }
  | {
      kind: "solid";
      shape: "prism" | "cube" | "cylinder" | "cone" | "pyramid" | "sphere" | "triangular-prism";
      length?: FigureLabel;
      width?: FigureLabel;
      height?: FigureLabel;
      radius?: FigureLabel;
      /** Generatriz del cono o apotema de la pirámide. */
      slant?: FigureLabel;
    }
  /** Plano cartesiano con puntos (los que se piden no se dibujan). */
  | {
      kind: "plane";
      points: { name: string; x: number; y: number }[];
      segments?: [string, string][];
      /** Vectores; sin `from`, se dibujan desde el origen. */
      vectors?: { from?: string; dx: number; dy: number }[];
      /** Eje de reflexión resaltado. */
      axis?: "x" | "y";
      /** Medidas rotuladas sobre los catetos de un segmento (Δx, Δy). */
      legs?: { from: string; to: string };
    }
  | {
      kind: "chart";
      type: "bar" | "pie" | "picto";
      title?: string;
      data: { label: string; value: number; text?: FigureLabel }[];
      /** Barras: valor donde empieza el eje vertical (0 por defecto). */
      axisFrom?: number;
      /** Pictograma: qué representa cada ícono. */
      unit?: string;
    }
  /** Diagrama de puntos de una lista de datos. */
  | { kind: "dots"; data: number[]; label?: string }
  | { kind: "number-line"; min: number; max: number; points: { value: number; label: FigureLabel }[] }
  /** Barras divididas en `parts` partes iguales con `shaded` sombreadas. */
  | { kind: "fraction-bar"; bars: { parts: number; shaded: number; label?: string }[] }
  | { kind: "bag"; items: { color: BagColor; count: number }[] }
  /** Las 36 parejas de dos dados. */
  | { kind: "dice-grid" }
  /** Árbol de dos etapas. `second[i]` cuelga de `first[i]`. */
  | {
      kind: "tree";
      first: { label: string; p: FigureLabel }[];
      second: { label: string; p: FigureLabel }[][];
    }
  /** Gráfica de una función en una cuadrícula. */
  | {
      kind: "graph";
      fn: { type: "linear"; m: number; b: number } | { type: "quadratic"; a: number; h: number; k: number };
      x: [number, number];
      y: [number, number];
      label?: string;
    };

export type FigureKind = Figure["kind"];

/** Añade la figura a una pregunta ya construida. */
export function fig(question: Question, figure: Figure): Question {
  return { ...question, figure };
}

const list = (items: string[]) =>
  items.length <= 1 ? items.join("") : `${items.slice(0, -1).join(", ")} y ${items[items.length - 1]}`;
const said = (label: FigureLabel) => (label === "?" ? "la incógnita (?)" : label);
const named = (labels: (FigureLabel | null)[] | undefined, names: string[]) =>
  (labels ?? []).flatMap((label, i) => (label ? [`${names[i]} ${said(label)}`] : []));

const SHAPE_NAMES: Record<string, string> = {
  scalene: "escaleno",
  isosceles: "isósceles",
  equilateral: "equilátero",
  right: "rectángulo",
  obtuse: "obtusángulo",
  rectangle: "Rectángulo",
  square: "Cuadrado",
  parallelogram: "Paralelogramo",
  trapezoid: "Trapecio",
  rhombus: "Rombo",
  triangle: "Triángulo",
  kite: "Cometa (deltoide)",
  "l-shape": "Figura en forma de L (rectángulo sin una esquina)",
  prism: "Prisma rectangular",
  cube: "Cubo",
  cylinder: "Cilindro",
  cone: "Cono",
  pyramid: "Pirámide de base cuadrada",
  sphere: "Esfera",
  "triangular-prism": "Prisma de base triangular",
};
const POSITION_NAMES: Record<CrossingPosition, string> = {
  tl: "arriba a la izquierda",
  tr: "arriba a la derecha",
  bl: "abajo a la izquierda",
  br: "abajo a la derecha",
};

/** Descripción en texto de la figura, para lectores de pantalla. */
export function describeFigure(figure: Figure): string {
  switch (figure.kind) {
    case "table":
      return `${figure.caption ? `${figure.caption}. ` : ""}Tabla con columnas ${list(figure.head)}; ${figure.rows
        .map((row) => row.join(", "))
        .join("; ")}.`;
    case "triangle": {
      const parts = [
        ...named(figure.sides, ["lado AB", "lado BC", "lado CA"]),
        ...named(figure.angles, ["ángulo A", "ángulo B", "ángulo C"]),
        ...(figure.height ? [`altura ${said(figure.height)}`] : []),
      ];
      return `Triángulo ${SHAPE_NAMES[figure.shape]}${figure.shape === "right" ? " con el ángulo recto en A" : ""}${parts.length ? `: ${list(parts)}` : ""}. No está a escala.`;
    }
    case "polygon": {
      const parts = [
        ...(figure.base ? [`base ${said(figure.base)}`] : []),
        ...(figure.top ? [`base menor ${said(figure.top)}`] : []),
        ...(figure.side ? [`lado ${said(figure.side)}`] : []),
        ...(figure.height ? [`altura ${said(figure.height)}`] : []),
        ...(figure.notch ? [`esquina que falta de ${said(figure.notch[0])} por ${said(figure.notch[1])}`] : []),
        ...(figure.diagonals ? [`diagonales ${said(figure.diagonals[0])} y ${said(figure.diagonals[1])}`] : []),
        ...named(figure.angles, ["ángulo 1", "ángulo 2", "ángulo 3", "ángulo 4"]),
      ];
      return `${SHAPE_NAMES[figure.shape]}${parts.length ? `: ${list(parts)}` : ""}. No está a escala.`;
    }
    case "regular":
      return `Polígono regular de ${figure.sides} lados${figure.side ? `, lado ${said(figure.side)}` : ""}${figure.apothem ? `, apotema ${said(figure.apothem)}` : ""}. No está a escala.`;
    case "thales":
      return `Tres rectas paralelas cortan dos rectas. En la izquierda forman segmentos de ${said(figure.left[0])} y ${said(figure.left[1])}; en la derecha, ${said(figure.right[0])} y ${said(figure.right[1])}. No está a escala.`;
    case "similar": {
      const sides = ["base", "lado derecho", "lado izquierdo"];
      const part = (labels: (FigureLabel | null)[]) => list(named(labels, sides)) || "sin medidas";
      const [a, b] = figure.names ?? ["Triángulo pequeño", "triángulo grande"];
      return `${a}: ${part(figure.small)}. ${b}: ${part(figure.big)}. Son semejantes. No está a escala.`;
    }
    case "parallels":
      return `${figure.parallel === false ? "Dos rectas que no se sabe si son paralelas" : "Dos rectas paralelas"} cortadas por una secante. ${figure.marks
        .map((m) => `En la recta de ${m.line === 0 ? "arriba" : "abajo"}, ${POSITION_NAMES[m.pos]}: ${said(m.label)}`)
        .join(". ")}. No está a escala.`;
    case "angles":
      return `Ángulos ${figure.around === 180 ? "sobre una recta" : figure.around === 90 ? "que forman un ángulo recto" : "alrededor de un punto"}: ${list(
        figure.parts.map((p) => said(p.label)),
      )}. No está a escala.`;
    case "circle": {
      const parts = [
        ...(figure.radius ? [`radio ${said(figure.radius)}`] : []),
        ...(figure.diameter ? [`diámetro ${said(figure.diameter)}`] : []),
        ...(figure.sector?.label ? [`sector de ${said(figure.sector.label)}`] : []),
        ...(figure.inner ? [`círculo interior de radio ${said(figure.inner)}`] : []),
      ];
      return `Círculo${parts.length ? `: ${list(parts)}` : ""}. No está a escala.`;
    }
    case "solid": {
      const parts = [
        ...(figure.length ? [`largo ${said(figure.length)}`] : []),
        ...(figure.width ? [`ancho ${said(figure.width)}`] : []),
        ...(figure.height ? [`altura ${said(figure.height)}`] : []),
        ...(figure.radius ? [`radio ${said(figure.radius)}`] : []),
        ...(figure.slant ? [`generatriz ${said(figure.slant)}`] : []),
      ];
      return `${SHAPE_NAMES[figure.shape]}${parts.length ? `: ${list(parts)}` : ""}. No está a escala.`;
    }
    case "plane":
      return `Plano cartesiano con ${list(figure.points.map((p) => `${p.name}(${p.x}, ${p.y})`))}${
        figure.vectors?.length ? `; vector ${list(figure.vectors.map((v) => `(${v.dx}, ${v.dy}) desde ${v.from ?? "el origen"}`))}` : ""
      }${figure.axis ? `; eje ${figure.axis} resaltado` : ""}.`;
    case "chart":
      return `${figure.type === "pie" ? "Gráfico circular" : figure.type === "bar" ? "Gráfico de barras" : "Pictograma"}${
        figure.title ? ` «${figure.title}»` : ""
      }: ${list(figure.data.map((d) => `${d.label} ${said(d.text ?? String(d.value))}`))}${
        figure.unit ? `. Cada ícono representa ${figure.unit}` : ""
      }${figure.axisFrom ? `. El eje vertical empieza en ${figure.axisFrom}` : ""}.`;
    case "dots":
      return `Diagrama de puntos${figure.label ? ` de ${figure.label}` : ""} con los datos ${figure.data.join("; ")}.`;
    case "number-line":
      return `Recta numérica de ${figure.min} a ${figure.max} con ${list(figure.points.map((p) => `${said(p.label)} en ${p.value}`))}.`;
    case "fraction-bar":
      return list(figure.bars.map((b) => `${b.label ? `${b.label}: ` : ""}barra de ${b.parts} partes iguales con ${b.shaded} sombreadas`)) + ".";
    case "bag":
      return `Bolsa con ${list(figure.items.map((i) => `${i.count} ${i.count === 1 ? "ficha" : "fichas"} de color ${i.color}`))}.`;
    case "dice-grid":
      return "Cuadrícula con las 36 parejas posibles al lanzar dos dados: el primer dado en las filas y el segundo en las columnas.";
    case "tree":
      return `Diagrama de árbol: ${figure.first
        .map((b, i) => `${b.label} (${said(b.p)}), y después ${list(figure.second[i].map((s) => `${s.label} (${said(s.p)})`))}`)
        .join("; ")}.`;
    case "graph":
      return `Gráfica de ${figure.label ?? "la función"} entre x = ${figure.x[0]} y x = ${figure.x[1]}.`;
  }
}

/** Rótulos de la figura que podrían contener la respuesta (ver tests). */
export function figureLabels(figure: Figure): string[] {
  switch (figure.kind) {
    case "triangle":
      return [...(figure.sides ?? []), ...(figure.angles ?? []), figure.height ?? null].filter((l): l is string => !!l);
    case "polygon":
      return [figure.base, figure.top, figure.side, figure.height, ...(figure.notch ?? []), ...(figure.diagonals ?? []), ...(figure.angles ?? [])].filter(
        (l): l is string => !!l,
      );
    case "parallels":
      return figure.marks.map((m) => m.label);
    case "regular":
      return [figure.side, figure.apothem].filter((l): l is string => !!l);
    case "thales":
      return [...figure.left, ...figure.right];
    case "similar":
      return [...figure.small, ...figure.big].filter((l): l is string => !!l);
    case "angles":
      return figure.parts.map((p) => p.label);
    case "circle":
      return [figure.radius, figure.diameter, figure.sector?.label, figure.inner].filter((l): l is string => !!l);
    case "solid":
      return [figure.length, figure.width, figure.height, figure.radius, figure.slant].filter((l): l is string => !!l);
    case "number-line":
      return figure.points.map((p) => p.label);
    default:
      return [];
  }
}
