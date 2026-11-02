import { describe, expect, test } from "vitest";
import { LEGAL_VERSION, acceptLegalTermsErrorMessage, hasCurrentConsent } from "./legal";
import { LEGAL_VERSION as SERVER_VERSION } from "../../functions/src/legalVersion";

describe("versión legal", () => {
  test("el navegador y Functions piden la misma versión", () => {
    expect(LEGAL_VERSION).toBe(SERVER_VERSION);
  });
  test("solo vale el consentimiento de la versión vigente", () => {
    expect(hasCurrentConsent(undefined)).toBe(false);
    expect(hasCurrentConsent({})).toBe(false);
    expect(hasCurrentConsent({ legalConsent: { version: "2020-01-01" } })).toBe(false);
    expect(hasCurrentConsent({ legalConsent: { version: LEGAL_VERSION } })).toBe(true);
  });
});

describe("errores al aceptar", () => {
  const err = (code: string, message = "") => Object.assign(new Error(message), { code });
  test("cada causa tiene su mensaje", () => {
    expect(acceptLegalTermsErrorMessage(err("functions/failed-precondition", "Recarga."))).toBe("Recarga.");
    expect(acceptLegalTermsErrorMessage(err("functions/unauthenticated"))).toMatch(/Cierra sesión/);
    expect(acceptLegalTermsErrorMessage(err("functions/unavailable"))).toMatch(/conexión/);
  });
  test("un callable sin desplegar muestra su código", () => {
    expect(acceptLegalTermsErrorMessage(err("functions/internal", "internal"))).toMatch(/\(internal\)/);
    expect(acceptLegalTermsErrorMessage(new Error("x"))).not.toMatch(/\(/);
  });
});
