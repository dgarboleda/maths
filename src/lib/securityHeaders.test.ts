import { describe, expect, test } from "vitest";
import { contentSecurityPolicy, securityHeaders } from "./securityHeaders";

const directive = (policy: string, name: string) => policy.split("; ").find((d) => d.startsWith(`${name} `));

describe("cabeceras de seguridad", () => {
  test("producción: sin eval, sin incrustarse, solo orígenes de Firebase y https forzado", () => {
    const csp = contentSecurityPolicy();
    expect(directive(csp, "script-src")).not.toContain("unsafe-eval");
    expect(directive(csp, "frame-ancestors")).toBe("frame-ancestors 'none'");
    expect(directive(csp, "object-src")).toBe("object-src 'none'");
    expect(directive(csp, "connect-src")).not.toContain("127.0.0.1");
    expect(csp).toContain("upgrade-insecure-requests");
    const keys = securityHeaders().map((h) => h.key);
    expect(keys).toEqual(expect.arrayContaining(["Content-Security-Policy", "Strict-Transport-Security", "X-Content-Type-Options", "Referrer-Policy", "Permissions-Policy"]));
  });
  test("desarrollo con emuladores: admite 127.0.0.1 y eval, sin HSTS ni upgrade", () => {
    const csp = contentSecurityPolicy({ dev: true, emulators: true });
    expect(directive(csp, "connect-src")).toContain("http://127.0.0.1:*");
    expect(directive(csp, "script-src")).toContain("'unsafe-eval'");
    expect(csp).not.toContain("upgrade-insecure-requests");
    expect(securityHeaders({ dev: true, emulators: true }).map((h) => h.key)).not.toContain("Strict-Transport-Security");
  });
});
