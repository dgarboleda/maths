import { describe, expect, test } from "vitest";
import { render } from "@testing-library/react";
import { MathText } from "./MathText";

describe("MathText", () => {
  test("un texto sin fórmulas no cambia", () => {
    const { container } = render(<p><MathText text="Viaja a 60 km/h." /></p>);
    expect(container.innerHTML).toBe("<p>Viaja a 60 km/h.</p>");
  });

  test("apila la fracción y conserva el texto original para leerlo y buscarlo", () => {
    const { container } = render(<p><MathText text="Calcula 1/5 del total." /></p>);
    expect(container.querySelector("p")?.textContent).toBe("Calcula 1/5 del total.");
    expect(container.querySelector(".math-num [data-t]")).toHaveAttribute("data-t", "1");
    expect(container.querySelector(".math-den [data-t]")).toHaveAttribute("data-t", "5");
    expect(container.querySelector(".math-visual")).toHaveAttribute("aria-hidden", "true");
    expect(container.querySelector(".sr-only")).toHaveTextContent("1/5");
  });

  test("la fórmula general: raíz dentro de la fracción, leída como se escribió", () => {
    const { container } = render(<MathText text="x = (−b ± √(b² − 4ac))/(2a)" />);
    expect(container.querySelector(".math-frac .math-num .math-sqrt .math-radicand [data-t]")).toHaveAttribute("data-t", "b² − 4ac");
    expect(container.querySelector(".sr-only")).toHaveTextContent("(−b ± √(b² − 4ac))/2a");
  });

  test("exponentes", () => {
    const { container } = render(<MathText text="8 × 10^?" />);
    expect(container.querySelector(".math-sup [data-t]")).toHaveAttribute("data-t", "?");
  });
});
