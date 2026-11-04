import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import { HelpUsageSummary } from "./HelpUsageReport";

test("resume para la familia qué consulta, busca y guarda", () => {
  render(<HelpUsageSummary childId="ana" childName="Ana" usage={{
    favorites: ["pitagoras#Teorema de Pitágoras", "clave#inexistente"],
    opens: { progresiones: 5, pitagoras: 1 },
    topics: { "tasa-unitaria": 2 },
  }} />);
  expect(screen.getByText("Progresiones aritméticas y geométricas")).toBeInTheDocument();
  expect(screen.getByText("· 5 veces")).toBeInTheDocument();
  expect(screen.getByText("Encontrar el valor por unidad")).toBeInTheDocument();
  expect(screen.getByText("· Teorema de Pitágoras")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Ver el formulario imprimible" })).toHaveAttribute("href", "/jugar/ana/formulario");
});

test("sin uso, explica qué aparecerá", () => {
  render(<HelpUsageSummary childId="ana" childName="Ana" usage={{ favorites: [], opens: {}, topics: {} }} />);
  expect(screen.getByText("Todavía no consulta el foco")).toBeInTheDocument();
});
