"use client";

import type { GameWorld } from "@/lib/gameworld/schema";
import type { PropertyValue } from "@/lib/level/schema";
import { PropertyField } from "@/components/level/editor/fields/PropertyFields";
import { WORLD_RULE_FIELDS } from "./worldRuleFields";

/** Reglas generales del mundo — Fase 16 (docs/level-editor-plan-v2.md §3.3).
 *  Se pintan con el mismo `PropertyField` de siempre: cero componentes de
 *  campo nuevos. */
export function WorldRulesTab({ world, onChange }: { world: GameWorld; onChange: (world: GameWorld) => void }) {
  function setRule(key: string, value: PropertyValue) {
    onChange({ ...world, rules: { ...world.rules, [key]: value } });
  }

  return (
    <div className="mx-auto max-w-xl space-y-3 p-4 text-xs sm:p-6">
      <h2 className="text-sm font-bold text-white">Reglas generales</h2>
      {WORLD_RULE_FIELDS.map((field) => (
        <PropertyField
          key={field.key}
          field={field}
          value={(world.rules as unknown as Record<string, PropertyValue>)[field.key] ?? field.default}
          onChange={(value) => setRule(field.key, value)}
        />
      ))}
    </div>
  );
}
