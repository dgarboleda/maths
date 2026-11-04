import { expect, test } from "vitest";
import { speakable } from "./speak";

test("lee las fórmulas en palabras: subíndices, exponentes, fracciones y raíces", () => {
  expect(speakable("aₙ = a₁ · rⁿ⁻¹")).toBe("a sub n es igual a a sub 1 por r elevado a n menos 1");
  expect(speakable("c² = a² + b²")).toBe("c al cuadrado es igual a a al cuadrado más b al cuadrado");
  expect(speakable("Sₙ = (n · (a₁ + aₙ))/2")).toContain("dividido entre 2");
  expect(speakable("c = √(a² + b²)")).toBe("c es igual a raíz cuadrada de a al cuadrado más b al cuadrado");
  expect(speakable("P(A | B) = P(A)")).toBe("P de A dado que B es igual a P de A");
  expect(speakable("sen α = opuesto/hipotenusa")).toBe("seno de alfa es igual a opuesto, dividido entre hipotenusa");
});
