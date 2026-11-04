import { act, render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import { StarBreakdown } from "./StarBreakdown";
import { starPlan } from "@/lib/learning/starPlan";

const total = { value: 10 as number | null };
vi.mock("@/lib/AuthProvider", () => ({ useAuth: () => ({ parentId: "padre" }) }));
vi.mock("@/lib/useTotalStars", () => ({ useTotalStars: () => total.value }));
import { StarCounter } from "./StarCounter";

test("el contador muestra las estrellas y anuncia las que se ganan", () => {
  vi.useFakeTimers();
  const view = render(<StarCounter childId="ana" />);
  expect(screen.getByRole("button", { name: "Mis estrellas: 10" })).toBeInTheDocument();
  total.value = 15;
  view.rerender(<StarCounter childId="ana" />);
  expect(screen.getByText("+5")).toBeInTheDocument();
  expect(screen.getByText("¡Ganaste 5 estrellas! Ahora tienes 15.")).toBeInTheDocument();
  act(() => { vi.advanceTimersByTime(4100); });
  expect(screen.queryByText("+5")).not.toBeInTheDocument();
  vi.useRealTimers();
});

test("el desglose explica cuánto aporta cada sección y cuánto queda", () => {
  const plan = starPlan({ progress: {}, reviews: {}, adventures: {}, ledger: { earned: 4, spent: 0 } });
  render(<StarBreakdown plan={plan} available={4} />);
  expect(screen.getByRole("rowheader", { name: /Clases.*5 por cada clase terminada/ })).toBeInTheDocument();
  expect(screen.getByText("sin tope")).toBeInTheDocument();
  expect(screen.getByText(new RegExp(`Todavía puedes ganar`))).toHaveTextContent(`${plan.possible} ⭐`);
});
