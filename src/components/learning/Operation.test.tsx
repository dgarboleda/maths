import { describe, expect, test } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import { getLesson } from "@/lib/learning/domain";
import { OperationReasoning, operationMistake } from "./Operation";

describe("Razonamiento de los repasos", () => {
  test("nombra dónde se separa la respuesta en columnas y en la galera", () => {
    expect(operationMistake({ op: "subtract", a: 325, b: 148 }, "223")).toBe("Tu resultado fue 223: la primera cifra distinta está en las unidades.");
    expect(operationMistake({ op: "divide", a: 612, b: 6 }, "12")).toBe("Tu cociente fue 12: la primera cifra distinta es la 2.ª del cociente.");
    expect(operationMistake({ op: "add", a: 958, b: 76 }, "1034")).toBeNull();
    expect(operationMistake({ op: "add", a: 958, b: 76 }, "3/4")).toBeNull();
  });

  test("una pregunta en hoja muestra la operación completa, el error y el desarrollo con el estilo elegido", async () => {
    const question = getLesson("division-larga")!.practice.find((q) => q.column?.op === "divide")!;
    const { container } = render(<OperationReasoning question={question} response="1" />);
    fireEvent.click(screen.getByText("Ver el razonamiento"));
    expect(screen.getByRole("group", { name: /^División/ })).toBeInTheDocument();
    expect(screen.getByText(/la primera cifra distinta/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("radio", { name: "Restar de memoria" }));
    expect(screen.getAllByText(/de memoria/).length).toBeGreaterThan(1);
    expect(await axe(container)).toHaveNoViolations();
  });

  test("una pregunta sin hoja conserva el desarrollo escrito", () => {
    const question = getLesson("enteros-recta")!.review[0];
    render(<OperationReasoning question={question} response={null} />);
    expect(screen.queryByRole("group", { name: /^División|en columnas$/ })).toBeNull();
    expect(screen.getByText(question.solution[0].replace(/\s+/g, " ").slice(0, 20), { exact: false })).toBeInTheDocument();
  });
});
