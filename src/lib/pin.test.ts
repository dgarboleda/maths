import { describe, expect, test } from "vitest";
import { accessKeyFromHash, deviceAccessLink, newAccessKey } from "./pin";

describe("enlace de acceso desde otro dispositivo", () => {
  test("la clave es aleatoria, base64url y de 43 caracteres", () => {
    const a = newAccessKey();
    expect(a).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(newAccessKey()).not.toBe(a);
  });

  test("la clave viaja en el fragmento y se recupera intacta", () => {
    const key = newAccessKey();
    const url = new URL(deviceAccessLink("https://maths.test", "padre-1", key));
    expect(url.pathname).toBe("/entrar/padre-1");
    expect(url.search).toBe("");
    expect(accessKeyFromHash(url.hash)).toBe(key);
  });

  test("un fragmento ausente o malformado no produce clave", () => {
    expect(accessKeyFromHash("")).toBeNull();
    expect(accessKeyFromHash("#k=corta")).toBeNull();
    expect(accessKeyFromHash("#otra=1")).toBeNull();
  });
});
