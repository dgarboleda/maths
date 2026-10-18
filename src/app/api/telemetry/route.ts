const CONTEXTS = new Set(["root", "panel", "editor", "jugar"]);
const SAFE_FIELD = /^[a-zA-Z0-9_./-]{1,80}$/;
const MAX_BYTES = 2048;

/** Logs estructurados que persisten en Workers Logs. El evento no contiene
 * mensajes ni identificadores de familia. Este endpoint no acepta destinos
 * externos ni texto libre para impedir inyección de logs y datos personales. */
export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin || origin !== new URL(request.url).origin) return new Response(null, { status: 403 });
  if (!request.headers.get("content-type")?.startsWith("application/json")) return new Response(null, { status: 415 });
  const reader = request.body?.getReader();
  if (!reader) return new Response(null, { status: 400 });
  let bytes = 0;
  let text = "";
  const decoder = new TextDecoder();
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      bytes += chunk.value.length;
      if (bytes > MAX_BYTES) {
        await reader.cancel();
        return new Response(null, { status: 413 });
      }
      text += decoder.decode(chunk.value, { stream: true });
    }
    const event: unknown = JSON.parse(text + decoder.decode());
    if (!event || typeof event !== "object" || Array.isArray(event)) return new Response(null, { status: 400 });
    const fields = event as Record<string, unknown>;
    if (!CONTEXTS.has(fields.context as string)
      || Object.keys(fields).some((key) => !["context", "name", "code", "digest"].includes(key))
      || [fields.name, fields.code, fields.digest].some((value) => value !== undefined && (typeof value !== "string" || !SAFE_FIELD.test(value)))) {
      return new Response(null, { status: 400 });
    }
    console.error(JSON.stringify({ event: "client_error", context: fields.context, name: fields.name ?? "Error", code: fields.code, digest: fields.digest, release: process.env.NEXT_PUBLIC_RELEASE }));
    return new Response(null, { status: 204 });
  } catch {
    return new Response(null, { status: 400 });
  }
}
