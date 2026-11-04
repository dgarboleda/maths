import { describe, expect, test } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import { LESSONS, type Visual } from "@/lib/learning/domain";
import { LearningVisual } from "./LearningVisual";
import { expandScientific } from "./ShapeVisuals";

const KINDS = [...new Set(LESSONS.map((l) => l.visual))] as Visual[];

describe("Modelos visuales de las clases", () => {
  test.each(KINDS)("%s se dibuja, es accesible y responde a sus controles", async (kind) => {
    const { container } = render(<LearningVisual kind={kind} />);
    const sliders = await screen.findAllByRole("slider");
    expect(sliders.length).toBeGreaterThan(0);
    const before = container.textContent;
    const slider = sliders[0] as HTMLInputElement;
    const next = Number(slider.value) === Number(slider.min) ? slider.max : slider.min;
    fireEvent.change(slider, { target: { value: next } });
    // Mover el primer control cambia lo que se lee: no es una imagen fija.
    expect(container.textContent).not.toBe(before);
    expect(await axe(container)).toHaveNoViolations();
  });

  test.each(KINDS)("%s: tiene al menos un reto y no empieza ya conseguido", async (kind) => {
    render(<LearningVisual kind={kind} />);
    await screen.findAllByRole("slider");
    const label = screen.getByText(/^Reto 1 de \d$/);
    expect(label.parentElement).not.toHaveTextContent("¡Conseguido!");
    // El contenedor pide predecir antes de mover y explicar después.
    expect(screen.getByText(/predice qué sucederá/i)).toBeInTheDocument();
  });

  test.each(KINDS)("%s: en los extremos de los controles no aparecen números rotos ni signos dobles", async (kind) => {
    const { container } = render(<LearningVisual kind={kind} />);
    await screen.findAllByRole("slider");
    const problems: string[] = [];
    const check = (where: string) => {
      const text = container.textContent ?? "";
      for (const bad of [/NaN|Infinity|undefined/, /[+−×÷·] [−-]\d/]) {
        const m = bad.exec(text);
        if (m) problems.push(`${where}: «${text.slice(Math.max(0, m.index - 25), m.index + 15)}»`);
      }
    };
    for (const edge of ["min", "max"] as const) {
      for (const slider of screen.getAllByRole("slider") as HTMLInputElement[]) {
        fireEvent.change(slider, { target: { value: slider[edge] } });
        check(`${slider.id || slider.getAttribute("aria-label")} = ${edge}`);
      }
    }
    expect(problems).toEqual([]);
  });

  test("cada tema con gráfico propio usa su modelo, no uno prestado", () => {
    const expected: Record<string, Visual> = {
      "funciones-lineales": "linear",
      proporcionalidad: "direct",
      "proporcionalidad-inversa": "inverse",
      "ecuaciones-cuadraticas": "parabola",
      inecuaciones: "inequality",
      angulos: "angles",
      pitagoras: "pythagoras",
      circulo: "circle",
      semejanza: "similarity",
      volumen: "volume",
      "probabilidad-compuesta": "tree",
      "notacion-cientifica": "powers",
      "operaciones-decimales": "decimal-grid",
      "sistemas-ecuaciones": "system",
      "interes-compuesto": "interest",
      progresiones: "sequence",
      "distancia-punto-medio": "distance",
      "funcion-cuadratica": "vertex",
      "fracciones-suma-resta": "fraction-sum",
      "fracciones-producto-cociente": "fraction-product",
      "enteros-producto-cociente": "integer-product",
      "jerarquia-operaciones": "order",
      "potencias-raices": "square-root",
      "productos-notables": "binomial-square",
      "propiedad-distributiva": "distributive",
      "expresiones-algebraicas": "expression",
      "volumen-conos-esferas": "solids",
      "probabilidad-condicional": "two-way",
      "funciones-exponenciales": "exponential",
      trigonometria: "trig",
      "estadistica-dispersion": "boxplot",
      combinatoria: "counting",
      transformaciones: "transform",
    };
    for (const [id, visual] of Object.entries(expected))
      expect(LESSONS.find((l) => l.id === id)?.visual, id).toBe(visual);
  });

  test("la función lineal se dibuja en un plano y la etiqueta sigue a la pendiente", async () => {
    render(<LearningVisual kind="linear" />);
    fireEvent.change(await screen.findByLabelText(/pendiente/), { target: { value: -2 } });
    expect(screen.getByRole("img", { name: /sube −2 por cada unidad/ })).toBeInTheDocument();
  });

  test("directa e inversa conservan cociente y producto", async () => {
    render(<LearningVisual kind="inverse" />);
    expect(await screen.findByRole("img", { name: /Hipérbola x por y = 24/ })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Directa" }));
    expect(screen.getByRole("img", { name: /Recta que pasa por el origen/ })).toBeInTheDocument();
  });

  test("la parábola marca sus raíces y el árbol suma 1", async () => {
    render(<LearningVisual kind="parabola" />);
    expect(await screen.findByRole("img", { name: /corta el eje x en −1 y en 3/ })).toBeInTheDocument();
    render(<LearningVisual kind="tree" />);
    await screen.findByRole("button", { name: "Sin reemplazo" });
    // 3 rojas y 2 azules con reemplazo: RR 9/25, RB 6/25, BR 6/25, BB 4/25.
    expect(screen.getByRole("img", { name: /RR: 9\/25, RB: 6\/25, BR: 6\/25, BB: 4\/25/ })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Sin reemplazo" }));
    expect(screen.getByRole("img", { name: /RR: 6\/20, RB: 6\/20, BR: 6\/20, BB: 2\/20/ })).toBeInTheDocument();
  });

  test("la notación científica se expande sin errores de coma flotante", () => {
    expect(expandScientific(3.8, 5)).toBe("380 000");
    expect(expandScientific(3.8, -1)).toBe("0,38");
    expect(expandScientific(1, -6)).toBe("0,000001");
    expect(expandScientific(4.7, 0)).toBe("4,7");
    expect(expandScientific(9.9, 8)).toBe("990 000 000");
  });
});
