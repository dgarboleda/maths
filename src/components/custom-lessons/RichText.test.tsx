import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { InlineText, RichText, isLessonImageUrl, parseBlocks, parseInline } from "./RichText";

describe("parseInline", () => {
  it("reconoce negrita y cursiva", () => {
    expect(parseInline("a **b** *c* _d_")).toEqual([
      { kind: "text", text: "a " }, { kind: "strong", text: "b" }, { kind: "text", text: " " },
      { kind: "em", text: "c" }, { kind: "text", text: " " }, { kind: "em", text: "d" },
    ]);
  });
  it("deja como texto las multiplicaciones y los asteriscos sueltos", () => {
    for (const text of ["2 * 3 * 4", "2*3*4", "un * suelto", "snake_case_x", "** nada **"]) expect(parseInline(text)).toEqual([{ kind: "text", text }]);
  });
  it("no devuelve nada con un texto vacío", () => expect(parseInline("")).toEqual([]));
});

describe("parseBlocks", () => {
  it("agrupa títulos, listas y párrafos", () => {
    expect(parseBlocks("# Fracciones\nUna fracción\ntiene dos partes.\n\n- numerador\n- denominador\n1. uno\n2) dos\n\nFin")).toEqual([
      { kind: "heading", level: 1, text: "Fracciones" },
      { kind: "paragraph", lines: ["Una fracción", "tiene dos partes."] },
      { kind: "ul", items: ["numerador", "denominador"] },
      { kind: "ol", items: ["uno", "dos"] },
      { kind: "paragraph", lines: ["Fin"] },
    ]);
  });
  it("separa en párrafos con líneas vacías y acepta \\r\\n", () => {
    expect(parseBlocks("a\r\n\r\n\r\nb")).toEqual([{ kind: "paragraph", lines: ["a"] }, { kind: "paragraph", lines: ["b"] }]);
  });
});

describe("RichText", () => {
  it("pinta títulos, listas y formato", () => {
    const { container } = render(<RichText text={"## Partes\n- el **numerador**\n- el *denominador*"} />);
    expect(screen.getByRole("heading", { level: 3, name: "Partes" })).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
    expect(container.querySelector("strong")).toHaveTextContent("numerador");
    expect(container.querySelector("em")).toHaveTextContent("denominador");
  });
  it("dibuja fórmulas dentro del formato", () => {
    const { container } = render(<RichText text={"Mitad: **1/2**"} />);
    expect(container.querySelector("strong .math-frac")).not.toBeNull();
  });
  it("mantiene los saltos de línea de un párrafo", () => {
    const { container } = render(<RichText text={"uno\ndos"} />);
    expect(container.querySelectorAll("p br")).toHaveLength(1);
  });
  it("muestra el HTML como texto", () => {
    const { container } = render(<RichText text={'<script>alert(1)</script> <b onclick="x">hola</b>'} />);
    expect(container.querySelector("script, b")).toBeNull();
    expect(container).toHaveTextContent("<script>alert(1)</script>");
  });
});

describe("InlineText", () => {
  it("deja igual un texto sin marcas", () => {
    const { container } = render(<p><InlineText text="¿Cuánto es 7 + 5?" /></p>);
    expect(container.querySelector("p")?.innerHTML).toBe("¿Cuánto es 7 + 5?");
  });
  it("dibuja raíces y potencias", () => {
    const { container } = render(<p><InlineText text="√(16) y 2^3" /></p>);
    expect(container.querySelector(".math-sqrt")).not.toBeNull();
    expect(container.querySelector(".math-sup")).not.toBeNull();
  });
});

describe("imágenes", () => {
  const ok = "https://firebasestorage.googleapis.com/v0/b/demo.appspot.com/o/parents%2Fp1%2Flevel-assets%2Fa1.webp?alt=media&token=t";
  it("solo admite imágenes de la biblioteca de la familia", () => {
    expect(isLessonImageUrl(ok)).toBe(true);
    expect(isLessonImageUrl("http://127.0.0.1:9199/v0/b/demo/o/parents%2Fp1%2Flevel-assets%2Fa1.png?alt=media")).toBe(true);
    for (const bad of ["https://evil.example/x.png", "http://firebasestorage.googleapis.com/v0/b/demo/o/parents%2Fp1%2Flevel-assets%2Fa1.webp", "https://firebasestorage.googleapis.com/v0/b/demo/o/otra%2Fa1.webp", "javascript:alert(1)"]) expect(isLessonImageUrl(bad)).toBe(false);
  });
  it("pinta la imagen con su texto alternativo y deja como texto las demás", () => {
    expect(parseBlocks(`Mira:\n![Una pizza en 4 trozos](${ok})\n![x](https://evil.example/x.png)`)).toEqual([
      { kind: "paragraph", lines: ["Mira:"] },
      { kind: "image", alt: "Una pizza en 4 trozos", src: ok },
      { kind: "paragraph", lines: ["![x](https://evil.example/x.png)"] },
    ]);
    render(<RichText text={`![Una pizza en 4 trozos](${ok})`} />);
    expect(screen.getByRole("img", { name: "Una pizza en 4 trozos" })).toHaveAttribute("src", ok);
  });
});
