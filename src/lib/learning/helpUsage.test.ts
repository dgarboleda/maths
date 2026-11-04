import { expect, test } from "vitest";
import { parseHelpUsage, topCounts } from "./helpUsage";

test("lee el documento de uso con tolerancia a datos ajenos", () => {
  expect(parseHelpUsage(undefined)).toEqual({ favorites: [], opens: {}, topics: {} });
  expect(parseHelpUsage({ favorites: ["a#b", 3], opens: { progresiones: 4, x: "no", y: 0 }, topics: null })).toEqual({
    favorites: ["a#b"], opens: { progresiones: 4 }, topics: {},
  });
});

test("ordena las clases más consultadas", () => {
  expect(topCounts({ a: 1, b: 5, c: 5, d: 2 }, 3)).toEqual([["b", 5], ["c", 5], ["d", 2]]);
});
