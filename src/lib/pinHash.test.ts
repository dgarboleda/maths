// @vitest-environment node
import { createHash } from "node:crypto";
import { describe, expect, test } from "vitest";
import { checkPin, PIN_HASH_VERSION, pinHmac, safeEqual } from "../../functions/src/pin";

const PEPPER = "x".repeat(32);

describe("hash del PIN en Functions", () => {
  test("el HMAC depende del secreto, la familia y el perfil", () => {
    const base = pinHmac(PEPPER, "p", "c", "1234");
    expect(pinHmac("y".repeat(32), "p", "c", "1234")).not.toBe(base);
    expect(pinHmac(PEPPER, "p", "otro", "1234")).not.toBe(base);
    expect(pinHmac(PEPPER, "p", "c", "1234")).toBe(base);
  });

  test("un hash v2 se acepta solo con el PIN correcto y no pide migrar", () => {
    const stored = { pinHash: pinHmac(PEPPER, "p", "c", "1234"), pinHashVersion: PIN_HASH_VERSION };
    expect(checkPin(stored, PEPPER, "p", "c", "1234")).toEqual({ ok: true, upgrade: false });
    expect(checkPin(stored, PEPPER, "p", "c", "0000")).toEqual({ ok: false, upgrade: false });
    expect(checkPin(stored, PEPPER, "p", "otro", "1234").ok).toBe(false);
  });

  test("el SHA-256 anterior sigue valiendo y pide migrar solo si acierta", () => {
    const stored = { pinHash: createHash("sha256").update("1234").digest("hex") };
    expect(checkPin(stored, PEPPER, "p", "c", "1234")).toEqual({ ok: true, upgrade: true });
    expect(checkPin(stored, PEPPER, "p", "c", "0000")).toEqual({ ok: false, upgrade: false });
  });

  test("sin hash guardado ningún PIN es válido", () => {
    expect(checkPin({}, PEPPER, "p", "c", "1234").ok).toBe(false);
    expect(checkPin({ pinHash: "" }, PEPPER, "p", "c", "1234").ok).toBe(false);
  });

  test("la comparación admite longitudes distintas sin lanzar", () => {
    expect(safeEqual("abc", "abcd")).toBe(false);
    expect(safeEqual("abc", "abc")).toBe(true);
  });
});
