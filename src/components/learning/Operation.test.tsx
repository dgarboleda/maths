import { describe, expect, test, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import { getLesson } from "@/lib/learning/domain";
import { OperationReasoning, OperationWorkspace, operationMistake } from "./Operation";

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


describe("Coma en ejercicios", () => {
  test("permite quitar y recolocar la coma en una hoja de práctica sin perder cifras", () => {
    const onChange = vi.fn();
    render(<OperationWorkspace questionId="decimales" spec={{ op: "add", a: 3.5, b: 1.25 }} mode="free" response="" onChange={onChange} onComplete={() => {}} hintLevel={0} failedResponse={null} />);
    const input = (place: string) => screen.getByLabelText(`Resultado: ${place}`);
    fireEvent.change(input("centésimas"), { target: { value: "5" } });
    fireEvent.change(input("décimas"), { target: { value: "7" } });
    fireEvent.change(input("unidades"), { target: { value: "4" } });
    fireEvent.keyDown(input("centésimas"), { key: "," });
    expect(onChange).toHaveBeenLastCalledWith("47,5");
    fireEvent.keyDown(input("décimas"), { key: "," });
    expect(onChange).toHaveBeenLastCalledWith("475");
    fireEvent.keyDown(input("décimas"), { key: "," });
    expect(onChange).toHaveBeenLastCalledWith("4,75");
    expect(input("unidades")).toHaveValue("4");
    expect(input("décimas")).toHaveValue("7");
    expect(input("centésimas")).toHaveValue("5");
  });
});
