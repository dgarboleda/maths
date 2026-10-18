// @vitest-environment node
import { afterEach, expect, test, vi } from "vitest";
import { POST } from "./route";

afterEach(() => vi.restoreAllMocks());
const request = (body: string, origin = "https://maths.example") => new Request("https://maths.example/api/telemetry", {
  method: "POST", headers: { origin, "Content-Type": "application/json" }, body,
});

test("registra un evento permitido sin texto libre ni datos de familia", async () => {
  const log = vi.spyOn(console, "error").mockImplementation(() => {});
  expect((await POST(request(JSON.stringify({ context: "editor", name: "Error", code: "permission-denied" })))).status).toBe(204);
  expect(JSON.parse(log.mock.calls[0][0])).toMatchObject({ event: "client_error", context: "editor" });
});

test("rechaza otro origen, datos personales, saltos de línea y cuerpos grandes", async () => {
  const log = vi.spyOn(console, "error").mockImplementation(() => {});
  expect((await POST(request('{"context":"root"}', "https://other.example"))).status).toBe(403);
  expect((await POST(request('{"context":"root","childId":"private"}'))).status).toBe(400);
  expect((await POST(request(JSON.stringify({ context: "root", code: "forged\nlog" })))).status).toBe(400);
  expect((await POST(request(" ".repeat(2049)))).status).toBe(413);
  expect(log).not.toHaveBeenCalled();
});
