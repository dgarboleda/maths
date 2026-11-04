import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { WeeklyChart, weekComparison } from "./ui";


describe("comparación semanal", () => {
  test("describe la diferencia con la semana anterior", () => {
    expect(weekComparison(12, 8, "respuestas")).toBe("▲ 4 más que la semana anterior (8; +50 %).");
    expect(weekComparison(6, 8, "respuestas")).toBe("▼ 2 menos que la semana anterior (8; −25 %).");
    expect(weekComparison(8, 8, "respuestas")).toBe("Igual que la semana anterior (8).");
    expect(weekComparison(3, 0, "respuestas")).toBe("La semana anterior no hubo respuestas.");
    expect(weekComparison(3, undefined, "respuestas")).toBeNull();
  });

  test("la gráfica semanal anuncia total, media y comparación", () => {
    render(<WeeklyChart noun="respuestas" previousTotal={10} week={[
      { day: "L", problems: 2 }, { day: "M", problems: 5 }, { day: "M", problems: 0 }, { day: "J", problems: 7 },
      { day: "V", problems: 0 }, { day: "S", problems: 0 }, { day: "D", problems: 0 },
    ]} />);
    expect(screen.getByRole("img", { name: /Total 14 respuestas; media 2 por día\. ▲ 4 más que la semana anterior/ })).toBeInTheDocument();
  });
});
