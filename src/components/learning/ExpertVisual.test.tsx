import { render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import { expect, test } from "vitest";
import { ADVENTURES, expertInputs, getExpertChallenge } from "@/lib/learning/domain";
import { ExpertVisual } from "./ExpertVisual";

const clean = (text: string) => !/undefined|NaN|null|Infinity/.test(text);

test("cada partida de cada reto dibuja el esquema de su plan, accesible y sin valores rotos", async () => {
  for (const adventure of ADVENTURES) {
    const challenge = getExpertChallenge(adventure.id)!;
    const inputs = expertInputs(adventure, challenge);
    for (let variant = 0; variant < challenge.variants; variant++) {
      const round = challenge.round(variant);
      // La solución, el plan inicial y el máximo de cada entrada.
      const plans = [challenge.solution(variant), inputs.map((i) => i.start), inputs.map((i) => i.max)];
      for (const [index, plan] of plans.entries()) {
        const { container, unmount } = render(
          <ExpertVisual adventureId={adventure.id} params={round.params} inputs={inputs} values={plan.map(String)} />,
        );
        const figure = screen.getByRole("figure", { name: "Esquema del plan experto" });
        expect(clean(figure.textContent ?? ""), `${adventure.id} #${variant} ${plan}`).toBe(true);
        container.querySelectorAll("[aria-label]").forEach((node) => expect(clean(node.getAttribute("aria-label")!), adventure.id).toBe(true));
        container.querySelectorAll("svg *").forEach((node) =>
          ["x", "y", "width", "height", "cx", "cy", "d"].forEach((attr) => {
            const value = node.getAttribute(attr);
            if (value !== null) expect(clean(value), `${adventure.id} #${variant} ${attr}=${value}`).toBe(true);
          }),
        );
        // Auditoría de accesibilidad: la solución de la partida original de cada reto.
        if (variant === 0 && index === 0) expect(await axe(container), adventure.id).toHaveNoViolations();
        unmount();
      }
    }
  }
}, 120_000);

test("el esquema no aparece con un plan incompleto o fuera de rango", () => {
  const adventure = ADVENTURES.find((a) => a.id === "huerto-escolar")!;
  const challenge = getExpertChallenge(adventure.id)!;
  const inputs = expertInputs(adventure, challenge);
  render(<ExpertVisual adventureId={adventure.id} params={challenge.round(0).params} inputs={inputs} values={["", "11"]} />);
  expect(screen.getByText(/Escribe números enteros dentro de los límites/)).toBeInTheDocument();
  expect(screen.queryByRole("figure")).toBeNull();
});

test("el esquema muestra el plan sin calcular lo que pide el reto", async () => {
  // Jardín de dos anillos (partida original): dibuja el borde, pero no
  // cuenta sus baldosas; solo repite las que escribió el estudiante.
  const adventure = ADVENTURES.find((a) => a.id === "jardin-baldosas")!;
  const challenge = getExpertChallenge(adventure.id)!;
  const { container } = render(
    <ExpertVisual adventureId={adventure.id} params={challenge.round(0).params} inputs={expertInputs(adventure, challenge)} values={["13", "50"]} />,
  );
  expect(screen.getByText("Césped: 13 × 13 = 169 m²")).toBeInTheDocument();
  expect(screen.getByText("Baldosas de tu plan: 50")).toBeInTheDocument();
  expect(container.textContent).not.toMatch(/120/);
  expect(container.querySelectorAll("rect")).toHaveLength(17 * 17);
  expect(await axe(container)).toHaveNoViolations();
});
