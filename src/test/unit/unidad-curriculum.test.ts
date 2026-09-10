import { afterEach, describe, expect, test } from "vitest";
import { evalExpr, fillTemplate, parseExpr, ExprEvalError } from "@/lib/curriculum/expr";
import { compileGenerator } from "@/lib/curriculum/generatorTemplates";
import { compileModule } from "@/lib/curriculum/compileModule";
import { createEmptyCustomModule, slugForLabel } from "@/lib/curriculum/defaults";
import { validateCustomModule } from "@/lib/curriculum/validateCustomModule";
import { allModules, clearCustomModules, registerCustomModules } from "@/lib/curriculum/customRegistry";
import { getModule, isUnlocked, modulesForStrand } from "@/lib/curriculum";
import type { ArithmeticGeneratorSpec, CustomModuleDoc } from "@/lib/curriculum/customSchema";
import { problemSignature } from "@/lib/problem";

/**
 * Pruebas puras de lógica (sin DOM real, sin red, sin Firestore) para el
 * núcleo de la Currícula personalizada — Fase 20
 * (docs/level-editor-plan-v2.md §7.8, entregable verificable). Corren con
 * `npm run test` (Vitest) — ver `src/test/unit/unidad-nivel.test.ts` para el
 * mismo criterio aplicado al resto del Level Editor.
 */

describe("expr.ts — parser y evaluador", () => {
  function evalSrc(src: string, vars: Record<string, number> = {}): number {
    const result = parseExpr(src);
    if ("error" in result) throw new Error(`No parseó "${src}": ${result.error}`);
    return evalExpr(result.ast, vars);
  }

  test("precedencia aritmética estándar", () => {
    expect(evalSrc("2 + 3 * 4")).toBe(14);
    expect(evalSrc("(2 + 3) * 4")).toBe(20);
    expect(evalSrc("10 - 2 - 3")).toBe(5);
    expect(evalSrc("10 % 3")).toBe(1);
  });

  test("potencia asociativa a la derecha, unario más débil que la potencia", () => {
    expect(evalSrc("2 ^ 3 ^ 2")).toBe(512); // 2^(3^2), no (2^3)^2
    expect(evalSrc("-2^2")).toBe(-4); // -(2^2), no (-2)^2
    expect(evalSrc("2^-1")).toBe(0.5);
  });

  test("comparadores y lógicos devuelven 1/0", () => {
    expect(evalSrc("3 < 5")).toBe(1);
    expect(evalSrc("5 <= 5")).toBe(1);
    expect(evalSrc("3 == 3")).toBe(1);
    expect(evalSrc("3 != 4")).toBe(1);
    expect(evalSrc("1 && 0")).toBe(0);
    expect(evalSrc("0 || 1")).toBe(1);
    expect(evalSrc("!0")).toBe(1);
    expect(evalSrc("!5")).toBe(0);
  });

  test("funciones: abs min max round floor ceil gcd lcm sqrt pow", () => {
    expect(evalSrc("abs(-5)")).toBe(5);
    expect(evalSrc("min(3,1,2)")).toBe(1);
    expect(evalSrc("max(3,1,2)")).toBe(3);
    expect(evalSrc("round(2.6)")).toBe(3);
    expect(evalSrc("floor(2.9)")).toBe(2);
    expect(evalSrc("ceil(2.1)")).toBe(3);
    expect(evalSrc("gcd(12,18)")).toBe(6);
    expect(evalSrc("lcm(4,6)")).toBe(12);
    expect(evalSrc("sqrt(9)")).toBe(3);
    expect(evalSrc("pow(2,10)")).toBe(1024);
  });

  test("variables", () => {
    expect(evalSrc("a + b", { a: 4, b: 5 })).toBe(9);
  });

  test("errores de sintaxis reportan posición, sin lanzar", () => {
    const result = parseExpr("2 +");
    expect("error" in result).toBe(true);
    if ("error" in result) expect(typeof result.position).toBe("number");

    const result2 = parseExpr("(2 + 3");
    expect("error" in result2).toBe(true);

    const result3 = parseExpr("2 $ 3");
    expect("error" in result3).toBe(true);
  });

  test("división por cero da Infinity/NaN, no lanza", () => {
    const v = evalSrc("1 / 0");
    expect(Number.isFinite(v)).toBe(false);
  });

  test("variable no definida lanza ExprEvalError", () => {
    const result = parseExpr("a + 1");
    if ("error" in result) throw new Error("no debería fallar el parseo");
    expect(() => evalExpr(result.ast, {})).toThrow(ExprEvalError);
  });

  test("fillTemplate reemplaza {expr} con el resultado formateado", () => {
    expect(fillTemplate("{a} + {b} = {a+b}", { a: 2, b: 3 })).toBe("2 + 3 = 5");
    expect(fillTemplate("Mitad de 7 es {7/2}", {})).toBe("Mitad de 7 es 3.5");
  });
});

describe("generatorTemplates.ts — compileGenerator", () => {
  const spec: ArithmeticGeneratorSpec = {
    kind: "arithmetic",
    variables: [
      { name: "a", min: 1, max: 10, step: 1 },
      { name: "b", min: 1, max: 10, step: 1 },
    ],
    constraints: [],
    promptTemplate: "¿Cuánto es {a} + {b}?",
    flavor: "",
    answerExpr: "a + b",
    inputType: "integer",
    hintTemplates: ["Junta dos grupos.", "Empieza en {a}.", "{a} + {b} = {answer}"],
    problemKind: "prueba-suma",
  };

  function seededRng(seed: number): () => number {
    let state = seed;
    return () => {
      state = (state * 1103515245 + 12345) & 0x7fffffff;
      return state / 0x7fffffff;
    };
  }

  test("con rng fijo produce la misma secuencia de 20 problemas entre corridas", () => {
    const generateRun1 = compileGenerator(spec, seededRng(42));
    const generateRun2 = compileGenerator(spec, seededRng(42));
    const batch1 = Array.from({ length: 20 }, generateRun1).map((p) => p.prompt);
    const batch2 = Array.from({ length: 20 }, generateRun2).map((p) => p.prompt);
    expect(batch1).toEqual(batch2);
  });

  test("respeta restricciones al resortear", () => {
    const withConstraint: ArithmeticGeneratorSpec = {
      ...spec,
      constraints: [{ expr: "a >= b", message: "a debe ser mayor o igual a b" }],
      answerExpr: "a - b",
    };
    const generate = compileGenerator(withConstraint, seededRng(7));
    for (const p of Array.from({ length: 30 }, generate)) {
      expect(p.answer).toBeGreaterThanOrEqual(0);
    }
  });

  test("cada problema tiene una firma válida (kind + prompt)", () => {
    const generate = compileGenerator(spec);
    const p = generate();
    expect(problemSignature(p)).toBe(`${p.kind}|${p.prompt}`);
  });
});

describe("Currícula personalizada — registro e integración con curriculum.ts", () => {
  afterEach(() => {
    clearCustomModules();
  });

  function customDoc(id: string, overrides: Partial<CustomModuleDoc> = {}): CustomModuleDoc {
    return { ...createEmptyCustomModule("padre-de-prueba", id), published: true, ...overrides };
  }

  test("getModule cae al registro personalizado cuando el id no es de código", () => {
    const doc = customDoc("cst-sumas-20");
    registerCustomModules([compileModule(doc)]);

    const mod = getModule("cst-sumas-20");
    expect(mod).toBeDefined();
    expect(mod!.id).toBe("cst-sumas-20");
    expect(mod!.strandSlug).toBe(doc.strandSlug);

    expect(getModule("no-existe-ni-de-codigo-ni-personalizado")).toBeUndefined();
  });

  test("allModules()/modulesForStrand() incluyen los módulos personalizados registrados", () => {
    const doc = customDoc("cst-mi-modulo");
    registerCustomModules([compileModule(doc)]);

    expect(allModules().some((m) => m.id === "cst-mi-modulo")).toBe(true);
    expect(modulesForStrand(doc.strandSlug).some((m) => m.id === "cst-mi-modulo")).toBe(true);
  });

  test("isUnlocked respeta un prerrequisito personalizado, y uno de código", () => {
    const base = customDoc("cst-base");
    const advanced = customDoc("cst-avanzado", { prerequisites: ["cst-base", "aritmetica-d1"] });
    registerCustomModules([compileModule(base), compileModule(advanced)]);

    expect(isUnlocked({}, "cst-avanzado")).toBe(false);

    const progress = {
      "cst-base": { recentResults: [], recentAccuracy: 1, masteredAt: Date.now() },
      "aritmetica-d1": { recentResults: [], recentAccuracy: 1, masteredAt: Date.now() },
    };
    expect(isUnlocked(progress, "cst-avanzado")).toBe(true);
  });

  test("un cst-* nunca pisa un módulo de código con el mismo comportamiento de getModule", () => {
    // No existe colisión real posible (el namespace cst- está reservado),
    // pero getModule debe seguir devolviendo el módulo de código intacto.
    const mod = getModule("aritmetica-d1");
    expect(mod).toBeDefined();
    expect(mod!.id).toBe("aritmetica-d1");
  });
});

describe("validateCustomModule / slugForLabel", () => {
  test("slugForLabel genera un id estable con prefijo cst-", () => {
    expect(slugForLabel("Restas hasta 20")).toBe("cst-restas-hasta-20");
    expect(slugForLabel("¡Fracciones!")).toMatch(/^cst-/);
  });

  test("rechaza un id sin el prefijo cst-", () => {
    const doc = { ...createEmptyCustomModule("padre", "sin-prefijo"), label: "X" };
    const issues = validateCustomModule(doc, [doc.id]);
    expect(issues.some((i) => i.severity === "error" && i.field === "id")).toBe(true);
  });

  test("rechaza una fórmula de respuesta con error de sintaxis", () => {
    const doc = createEmptyCustomModule("padre", "cst-roto");
    doc.label = "Roto";
    doc.generator = { ...(doc.generator as ArithmeticGeneratorSpec), answerExpr: "a +" };
    const issues = validateCustomModule(doc, [doc.id]);
    expect(issues.some((i) => i.severity === "error" && i.field === "generator")).toBe(true);
  });

  test("un módulo por defecto válido no reporta errores", () => {
    const doc = createEmptyCustomModule("padre", "cst-valido");
    doc.label = "Válido";
    const issues = validateCustomModule(doc, [doc.id]);
    expect(issues.filter((i) => i.severity === "error")).toHaveLength(0);
  });
});
