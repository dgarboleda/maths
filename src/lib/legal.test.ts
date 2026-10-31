import { describe, expect, test } from "vitest";
import { LEGAL_VERSION, hasCurrentConsent } from "./legal";
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
