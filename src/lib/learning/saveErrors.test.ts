import { describe, expect, test } from "vitest";
import { isRetryable } from "./saveErrors";

describe("isRetryable", () => {
  test("los rechazos por estado guardado no se reintentan", () => {
    for (const code of ["functions/failed-precondition", "functions/aborted", "already-exists"])
      expect(isRetryable({ code, message: "x" })).toBe(false);
  });
  test("los fallos de red o del servidor sí se reintentan", () => {
    for (const code of ["functions/unavailable", "functions/deadline-exceeded", "functions/internal"])
      expect(isRetryable({ code })).toBe(true);
    expect(isRetryable(new TypeError("Failed to fetch"))).toBe(true);
  });
});
