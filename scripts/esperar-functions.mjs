// Playwright gestiona el proceso principal de emuladores. Esta segunda
// condición de disponibilidad impide arrancar antes de cargar Functions.
import { createServer } from "node:http";
const url = "http://127.0.0.1:5001/demo-numerario/us-central1/listChildrenPublic";
const deadline = Date.now() + 175_000;
while (Date.now() < deadline) {
  try {
    const response = await fetch(url, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data: { parentId: "readiness-probe" } }),
    });
    if (response.ok) {
      if (!process.argv.includes("--once")) {
        createServer((_request, reply) => reply.end("ready")).listen(5002, "127.0.0.1");
      }
      break;
    }
  } catch { /* Emuladores todavía arrancando. */ }
  await new Promise((resolve) => setTimeout(resolve, 500));
}
if (Date.now() >= deadline) throw new Error("Functions no está disponible.");
