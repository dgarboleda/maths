import type { ConditionExpr } from "@/lib/level/schema";

/**
 * Contexto mínimo contra el que se evalúa una `ConditionExpr` (§8.1-8.3) —
 * solo lo que el bus necesita, sin `LevelDefinition` completo: mantiene
 * `bus.ts`/`conditions.ts` en TypeScript puro, sin ninguna dependencia del
 * editor ni del runtime (que sí construyen este contexto a partir de su
 * propio estado).
 */
export interface ConditionContext {
  flags: Record<string, boolean>;
  entityStates: Record<string, string>;
}

export function evaluateCondition(expr: ConditionExpr, ctx: ConditionContext): boolean {
  switch (expr.kind) {
    case "always":
      return true;
    case "flag":
      return (ctx.flags[expr.flag] ?? false) === expr.value;
    case "entityState":
      return ctx.entityStates[expr.entityId] === expr.state;
    case "all":
      return expr.of.every((e) => evaluateCondition(e, ctx));
    case "any":
      return expr.of.some((e) => evaluateCondition(e, ctx));
    case "not":
      return !evaluateCondition(expr.of, ctx);
  }
}
