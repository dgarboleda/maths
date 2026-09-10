"use client";

import { useId } from "react";
import { Plus, Trash2 } from "lucide-react";
import type {
  ChoiceDistractorSpec,
  ChoiceGeneratorSpec,
  GeneratorConstraint,
  GeneratorSpec,
  GeneratorVariable,
  NumberLineGeneratorSpec,
  TableGeneratorSpec,
  VariantGeneratorSpec,
} from "@/lib/curriculum/customSchema";
import { STRANDS } from "@/lib/strands";
import { GeneratorPreview } from "./GeneratorPreview";

const LABEL_CLASS = "mb-1 block text-[11px] font-bold text-slate-400";
const INPUT_CLASS = "w-full rounded-md border border-indigo-500/20 bg-slate-950/60 px-2 py-1.5 text-slate-100 outline-none focus:border-cyan-400/50";
const ROW_BTN = "rounded-md p-1 text-slate-500 hover:bg-rose-500/10 hover:text-rose-400";

const KIND_LABELS: Record<GeneratorSpec["kind"], string> = {
  arithmetic: "Fórmula (número)",
  choice: "Fórmula (opción múltiple)",
  numberLine: "Fórmula (recta numérica)",
  table: "Banco de preguntas escritas",
  variants: "Mezcla de variantes",
  builtin: "Reusar un generador de código",
};

interface CommonFields {
  variables: GeneratorVariable[];
  constraints: GeneratorConstraint[];
  promptTemplate: string;
  flavor: string;
  answerExpr: string;
  hintTemplates: [string, string, string];
  problemKind: string;
}

function newVariable(existing: GeneratorVariable[]): GeneratorVariable {
  const letters = "abcdefghijklmnopqrstuvwxyz";
  const used = new Set(existing.map((v) => v.name));
  const name = [...letters].find((l) => !used.has(l)) ?? `v${existing.length}`;
  return { name, min: 1, max: 10, step: 1 };
}

function VariablesEditor({ variables, onChange }: { variables: GeneratorVariable[]; onChange: (v: GeneratorVariable[]) => void }) {
  function update(i: number, patch: Partial<GeneratorVariable>) {
    onChange(variables.map((v, j) => (j === i ? { ...v, ...patch } : v)));
  }
  return (
    <div className="space-y-1.5">
      <span className={LABEL_CLASS}>Variables sorteadas</span>
      {variables.map((v, i) => (
        <div key={i} className="flex flex-wrap items-center gap-1.5 rounded-md border border-indigo-500/10 bg-slate-950/30 p-1.5">
          <input
            type="text"
            value={v.name}
            onChange={(e) => update(i, { name: e.target.value.toLowerCase() })}
            className="w-12 rounded border border-indigo-500/20 bg-slate-950/60 px-1.5 py-1 text-center font-mono text-slate-100"
          />
          {v.choices ? (
            <input
              type="text"
              placeholder="valores separados por coma"
              value={v.choices.join(",")}
              onChange={(e) => update(i, { choices: e.target.value.split(",").map(Number).filter((n) => !Number.isNaN(n)) })}
              className="min-w-0 flex-1 rounded border border-indigo-500/20 bg-slate-950/60 px-1.5 py-1 text-slate-100"
            />
          ) : (
            <>
              <span className="text-slate-500">de</span>
              <input type="number" value={v.min} onChange={(e) => update(i, { min: Number(e.target.value) })} className="w-16 rounded border border-indigo-500/20 bg-slate-950/60 px-1.5 py-1 text-slate-100" />
              <span className="text-slate-500">a</span>
              <input type="number" value={v.max} onChange={(e) => update(i, { max: Number(e.target.value) })} className="w-16 rounded border border-indigo-500/20 bg-slate-950/60 px-1.5 py-1 text-slate-100" />
              <span className="text-slate-500">paso</span>
              <input
                type="number"
                step="any"
                value={v.step}
                onChange={(e) => update(i, { step: Number(e.target.value) })}
                className="w-14 rounded border border-indigo-500/20 bg-slate-950/60 px-1.5 py-1 text-slate-100"
              />
            </>
          )}
          <button
            type="button"
            onClick={() => update(i, v.choices ? { choices: undefined } : { choices: [v.min, v.max] })}
            className="rounded px-1.5 py-1 text-[10px] font-bold text-slate-400 hover:bg-slate-800"
          >
            {v.choices ? "usar rango" : "usar lista"}
          </button>
          <button type="button" onClick={() => onChange(variables.filter((_, j) => j !== i))} className={ROW_BTN} aria-label={`Quitar variable ${v.name}`}>
            <Trash2 className="size-3.5" aria-hidden="true" />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...variables, newVariable(variables)])}
        className="flex items-center gap-1 rounded-md px-1.5 py-1 text-[11px] font-bold text-cyan-300 hover:bg-cyan-500/10"
      >
        <Plus className="size-3.5" aria-hidden="true" /> Añadir variable
      </button>
    </div>
  );
}

function ConstraintsEditor({ constraints, onChange }: { constraints: GeneratorConstraint[]; onChange: (c: GeneratorConstraint[]) => void }) {
  function update(i: number, patch: Partial<GeneratorConstraint>) {
    onChange(constraints.map((c, j) => (j === i ? { ...c, ...patch } : c)));
  }
  return (
    <div className="space-y-1.5">
      <span className={LABEL_CLASS}>Restricciones (opcional) — p. ej. &quot;a &gt;= b&quot;, &quot;b != 0&quot;</span>
      {constraints.map((c, i) => (
        <div key={i} className="flex items-center gap-1.5">
          <input type="text" value={c.expr} onChange={(e) => update(i, { expr: e.target.value })} placeholder="a >= b" className={`${INPUT_CLASS} font-mono`} />
          <input type="text" value={c.message} onChange={(e) => update(i, { message: e.target.value })} placeholder="mensaje si no se cumple" className={INPUT_CLASS} />
          <button type="button" onClick={() => onChange(constraints.filter((_, j) => j !== i))} className={ROW_BTN} aria-label="Quitar restricción">
            <Trash2 className="size-3.5" aria-hidden="true" />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...constraints, { expr: "", message: "" }])}
        className="flex items-center gap-1 rounded-md px-1.5 py-1 text-[11px] font-bold text-cyan-300 hover:bg-cyan-500/10"
      >
        <Plus className="size-3.5" aria-hidden="true" /> Añadir restricción
      </button>
    </div>
  );
}

function CommonGeneratorFields({ value, onChange }: { value: CommonFields; onChange: (patch: Partial<CommonFields>) => void }) {
  return (
    <div className="space-y-3">
      <VariablesEditor variables={value.variables} onChange={(variables) => onChange({ variables })} />
      <ConstraintsEditor constraints={value.constraints} onChange={(constraints) => onChange({ constraints })} />
      <label className="block">
        <span className={LABEL_CLASS}>Enunciado — usa {"{a}"}, {"{b}"}, {"{a+b}"}…</span>
        <input type="text" className={`${INPUT_CLASS} font-mono`} value={value.promptTemplate} onChange={(e) => onChange({ promptTemplate: e.target.value })} />
      </label>
      <label className="block">
        <span className={LABEL_CLASS}>Fórmula de la respuesta</span>
        <input type="text" className={`${INPUT_CLASS} font-mono`} value={value.answerExpr} onChange={(e) => onChange({ answerExpr: e.target.value })} />
      </label>
      <label className="block">
        <span className={LABEL_CLASS}>Frase de ambientación (opcional, decorativa)</span>
        <input type="text" className={INPUT_CLASS} value={value.flavor} onChange={(e) => onChange({ flavor: e.target.value })} />
      </label>
      <div className="space-y-1.5">
        <span className={LABEL_CLASS}>Pistas — conceptual → primer paso → casi completa</span>
        {([0, 1, 2] as const).map((i) => (
          <input
            key={i}
            type="text"
            className={`${INPUT_CLASS} mb-1.5`}
            value={value.hintTemplates[i]}
            onChange={(e) => {
              const next = [...value.hintTemplates] as [string, string, string];
              next[i] = e.target.value;
              onChange({ hintTemplates: next });
            }}
          />
        ))}
      </div>
    </div>
  );
}

function ChoiceDistractorsEditor({ value, onChange }: { value: ChoiceDistractorSpec; onChange: (v: ChoiceDistractorSpec) => void }) {
  return (
    <div className="space-y-2 rounded-md border border-indigo-500/10 bg-slate-950/30 p-2">
      <label className="block">
        <span className={LABEL_CLASS}>Distractores (opciones incorrectas)</span>
        <select
          className={INPUT_CLASS}
          value={value.mode}
          onChange={(e) => {
            const mode = e.target.value as ChoiceDistractorSpec["mode"];
            onChange(mode === "near" ? { mode, spread: 3 } : mode === "expr" ? { mode, exprs: ["a - b"] } : { mode, options: [{ label: "", valueExpr: "0" }] });
          }}
        >
          <option value="near">Números cercanos a la respuesta</option>
          <option value="expr">Fórmulas (p. ej. &quot;a - b&quot;, &quot;a * b&quot;)</option>
          <option value="labels">Opciones con etiqueta propia (no numéricas)</option>
        </select>
      </label>

      {value.mode === "near" && (
        <label className="block">
          <span className={LABEL_CLASS}>Distancia máxima a la respuesta correcta</span>
          <input type="number" min={1} className={INPUT_CLASS} value={value.spread} onChange={(e) => onChange({ mode: "near", spread: Number(e.target.value) })} />
        </label>
      )}

      {value.mode === "expr" && (
        <div className="space-y-1.5">
          {value.exprs.map((expr, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <input
                type="text"
                className={`${INPUT_CLASS} font-mono`}
                value={expr}
                onChange={(e) => onChange({ mode: "expr", exprs: value.exprs.map((x, j) => (j === i ? e.target.value : x)) })}
              />
              <button type="button" onClick={() => onChange({ mode: "expr", exprs: value.exprs.filter((_, j) => j !== i) })} className={ROW_BTN} aria-label="Quitar distractor">
                <Trash2 className="size-3.5" aria-hidden="true" />
              </button>
            </div>
          ))}
          <button type="button" onClick={() => onChange({ mode: "expr", exprs: [...value.exprs, ""] })} className="flex items-center gap-1 text-[11px] font-bold text-cyan-300">
            <Plus className="size-3.5" aria-hidden="true" /> Añadir fórmula
          </button>
        </div>
      )}

      {value.mode === "labels" && (
        <div className="space-y-1.5">
          {value.options.map((opt, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <input
                type="text"
                placeholder="Etiqueta"
                className={INPUT_CLASS}
                value={opt.label}
                onChange={(e) => onChange({ mode: "labels", options: value.options.map((o, j) => (j === i ? { ...o, label: e.target.value } : o)) })}
              />
              <input
                type="text"
                placeholder="Valor (fórmula)"
                className={`${INPUT_CLASS} font-mono`}
                value={opt.valueExpr}
                onChange={(e) => onChange({ mode: "labels", options: value.options.map((o, j) => (j === i ? { ...o, valueExpr: e.target.value } : o)) })}
              />
              <button
                type="button"
                onClick={() => onChange({ mode: "labels", options: value.options.filter((_, j) => j !== i) })}
                className={ROW_BTN}
                aria-label="Quitar opción"
              >
                <Trash2 className="size-3.5" aria-hidden="true" />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => onChange({ mode: "labels", options: [...value.options, { label: "", valueExpr: "0" }] })}
            className="flex items-center gap-1 text-[11px] font-bold text-cyan-300"
          >
            <Plus className="size-3.5" aria-hidden="true" /> Añadir opción
          </button>
        </div>
      )}
    </div>
  );
}

function TableEditor({ spec, onChange }: { spec: TableGeneratorSpec; onChange: (s: TableGeneratorSpec) => void }) {
  function updateRow(i: number, patch: Partial<TableGeneratorSpec["rows"][number]>) {
    onChange({ ...spec, rows: spec.rows.map((r, j) => (j === i ? { ...r, ...patch } : r)) });
  }
  return (
    <div className="space-y-3">
      {spec.rows.map((row, i) => (
        <div key={row.id} className="space-y-1.5 rounded-md border border-indigo-500/15 bg-slate-950/30 p-2">
          <div className="flex items-center gap-1.5">
            <input type="text" placeholder="Enunciado" className={INPUT_CLASS} value={row.prompt} onChange={(e) => updateRow(i, { prompt: e.target.value })} />
            <button type="button" onClick={() => onChange({ ...spec, rows: spec.rows.filter((_, j) => j !== i) })} className={ROW_BTN} aria-label="Quitar pregunta">
              <Trash2 className="size-3.5" aria-hidden="true" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            <select className={INPUT_CLASS} value={row.inputType} onChange={(e) => updateRow(i, { inputType: e.target.value as "integer" | "decimal" | "choice" })}>
              <option value="integer">Entero</option>
              <option value="decimal">Decimal</option>
              <option value="choice">Opción múltiple</option>
            </select>
            <input type="number" placeholder="Respuesta" className={INPUT_CLASS} value={row.answer} onChange={(e) => updateRow(i, { answer: Number(e.target.value) })} />
          </div>
          {row.inputType === "choice" && (
            <div className="grid grid-cols-2 gap-1.5">
              <input
                type="text"
                placeholder="Opciones (1,2,3)"
                className={INPUT_CLASS}
                value={row.choices?.join(",") ?? ""}
                onChange={(e) => updateRow(i, { choices: e.target.value.split(",").map(Number).filter((n) => !Number.isNaN(n)) })}
              />
              <input
                type="text"
                placeholder="Etiquetas (opcional)"
                className={INPUT_CLASS}
                value={row.choiceLabels?.join(",") ?? ""}
                onChange={(e) => updateRow(i, { choiceLabels: e.target.value.split(",") })}
              />
            </div>
          )}
          {([0, 1, 2] as const).map((h) => (
            <input
              key={h}
              type="text"
              placeholder={`Pista ${h + 1}`}
              className={INPUT_CLASS}
              value={row.hints[h]}
              onChange={(e) => {
                const next = [...row.hints] as [string, string, string];
                next[h] = e.target.value;
                updateRow(i, { hints: next });
              }}
            />
          ))}
        </div>
      ))}
      <button
        type="button"
        onClick={() =>
          onChange({ ...spec, rows: [...spec.rows, { id: crypto.randomUUID(), prompt: "", answer: 0, inputType: "integer", hints: ["", "", ""] }] })
        }
        className="flex items-center gap-1 rounded-md px-1.5 py-1 text-[11px] font-bold text-cyan-300 hover:bg-cyan-500/10"
      >
        <Plus className="size-3.5" aria-hidden="true" /> Añadir pregunta
      </button>
    </div>
  );
}

function BuiltinEditor({ spec, onChange }: { spec: { strandSlug: string; difficulty: number }; onChange: (v: { strandSlug: string; difficulty: number }) => void }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <label className="block">
        <span className={LABEL_CLASS}>Hilo de código</span>
        <select className={INPUT_CLASS} value={spec.strandSlug} onChange={(e) => onChange({ ...spec, strandSlug: e.target.value })}>
          {STRANDS.map((s) => (
            <option key={s.slug} value={s.slug}>
              {s.emoji} {s.label}
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className={LABEL_CLASS}>Dificultad del generador base (1-10)</span>
        <input type="number" min={1} max={10} className={INPUT_CLASS} value={spec.difficulty} onChange={(e) => onChange({ ...spec, difficulty: Number(e.target.value) })} />
      </label>
    </div>
  );
}

function defaultCommon(problemKind: string): CommonFields {
  return {
    variables: [
      { name: "a", min: 1, max: 10, step: 1 },
      { name: "b", min: 1, max: 10, step: 1 },
    ],
    constraints: [],
    promptTemplate: "¿Cuánto es {a} + {b}?",
    flavor: "",
    answerExpr: "a + b",
    hintTemplates: ["", "", ""],
    problemKind,
  };
}

function defaultForKind(kind: GeneratorSpec["kind"], problemKindSeed: string): GeneratorSpec {
  switch (kind) {
    case "arithmetic":
      return { kind, ...defaultCommon(problemKindSeed), inputType: "integer" };
    case "choice":
      return { kind, ...defaultCommon(problemKindSeed), distractors: { mode: "near", spread: 3 } };
    case "numberLine":
      return { kind, ...defaultCommon(problemKindSeed), lineMinExpr: "0", lineMaxExpr: "10", startExpr: "a" };
    case "table":
      return { kind, rows: [], problemKind: problemKindSeed };
    case "variants":
      return { kind, variants: [{ weight: 1, spec: defaultForKind("arithmetic", problemKindSeed) as Exclude<GeneratorSpec, VariantGeneratorSpec> }] };
    case "builtin":
      return { kind, strandSlug: STRANDS[0].slug, difficulty: 1 };
  }
}

/** Editor de un `GeneratorSpec` — reusado tal cual dentro de cada variante
 *  de un `VariantGeneratorSpec` (Fase 21, docs/level-editor-plan-v2.md
 *  §8.3-2). `allowVariants=false` cuando ya se está DENTRO de una variante:
 *  el propio tipo (`Exclude<GeneratorSpec, VariantGeneratorSpec>`) prohíbe
 *  anidar mezclas dentro de mezclas, así que no hace falta más que un nivel
 *  de recursión. */
export function GeneratorSpecEditor({
  spec,
  onChange,
  allowVariants,
  problemKindSeed,
}: {
  spec: GeneratorSpec;
  onChange: (spec: GeneratorSpec) => void;
  allowVariants: boolean;
  problemKindSeed: string;
}) {
  const kinds = (Object.keys(KIND_LABELS) as GeneratorSpec["kind"][]).filter((k) => allowVariants || k !== "variants");

  return (
    <div className="space-y-3">
      <label className="block">
        <span className={LABEL_CLASS}>Tipo de generador</span>
        <select className={INPUT_CLASS} value={spec.kind} onChange={(e) => onChange(defaultForKind(e.target.value as GeneratorSpec["kind"], problemKindSeed))}>
          {kinds.map((k) => (
            <option key={k} value={k}>
              {KIND_LABELS[k]}
            </option>
          ))}
        </select>
      </label>

      {(spec.kind === "arithmetic" || spec.kind === "choice" || spec.kind === "numberLine") && (
        <>
          <CommonGeneratorFields value={spec} onChange={(patch) => onChange({ ...spec, ...patch } as GeneratorSpec)} />
          {spec.kind === "arithmetic" && (
            <label className="block">
              <span className={LABEL_CLASS}>Tipo de respuesta</span>
              <select className={INPUT_CLASS} value={spec.inputType} onChange={(e) => onChange({ ...spec, inputType: e.target.value as "integer" | "decimal" })}>
                <option value="integer">Entero</option>
                <option value="decimal">Decimal</option>
              </select>
            </label>
          )}
          {spec.kind === "choice" && (
            <>
              <ChoiceDistractorsEditor value={spec.distractors} onChange={(distractors) => onChange({ ...(spec as ChoiceGeneratorSpec), distractors })} />
              <label className="block">
                <span className={LABEL_CLASS}>Formato de cada opción (opcional) — p. ej. &quot;{"{c}"} cm&quot;</span>
                <input
                  type="text"
                  className={`${INPUT_CLASS} font-mono`}
                  value={spec.choiceLabelTemplate ?? ""}
                  onChange={(e) => onChange({ ...(spec as ChoiceGeneratorSpec), choiceLabelTemplate: e.target.value || undefined })}
                />
              </label>
            </>
          )}
          {spec.kind === "numberLine" && (
            <div className="grid grid-cols-3 gap-2">
              <label className="block">
                <span className={LABEL_CLASS}>Mínimo de la recta</span>
                <input type="text" className={`${INPUT_CLASS} font-mono`} value={spec.lineMinExpr} onChange={(e) => onChange({ ...(spec as NumberLineGeneratorSpec), lineMinExpr: e.target.value })} />
              </label>
              <label className="block">
                <span className={LABEL_CLASS}>Máximo de la recta</span>
                <input type="text" className={`${INPUT_CLASS} font-mono`} value={spec.lineMaxExpr} onChange={(e) => onChange({ ...(spec as NumberLineGeneratorSpec), lineMaxExpr: e.target.value })} />
              </label>
              <label className="block">
                <span className={LABEL_CLASS}>Valor inicial</span>
                <input type="text" className={`${INPUT_CLASS} font-mono`} value={spec.startExpr} onChange={(e) => onChange({ ...(spec as NumberLineGeneratorSpec), startExpr: e.target.value })} />
              </label>
            </div>
          )}
        </>
      )}

      {spec.kind === "table" && <TableEditor spec={spec} onChange={onChange} />}

      {spec.kind === "builtin" && <BuiltinEditor spec={spec} onChange={(v) => onChange({ kind: "builtin", ...v })} />}

      {spec.kind === "variants" && <VariantsEditor spec={spec} onChange={onChange} problemKindSeed={problemKindSeed} />}
    </div>
  );
}

function VariantsEditor({ spec, onChange, problemKindSeed }: { spec: VariantGeneratorSpec; onChange: (s: GeneratorSpec) => void; problemKindSeed: string }) {
  function updateVariant(i: number, patch: Partial<VariantGeneratorSpec["variants"][number]>) {
    onChange({ ...spec, variants: spec.variants.map((v, j) => (j === i ? { ...v, ...patch } : v)) });
  }
  return (
    <div className="space-y-3">
      {spec.variants.map((v, i) => (
        <div key={i} className="space-y-2 rounded-lg border border-indigo-500/20 bg-slate-950/40 p-2">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-slate-400">Peso</span>
            <input
              type="number"
              min={0}
              className="w-20 rounded border border-indigo-500/20 bg-slate-950/60 px-1.5 py-1 text-slate-100"
              value={v.weight}
              onChange={(e) => updateVariant(i, { weight: Number(e.target.value) })}
            />
            <button
              type="button"
              onClick={() => onChange({ ...spec, variants: spec.variants.filter((_, j) => j !== i) })}
              className={`${ROW_BTN} ml-auto`}
              aria-label="Quitar variante"
            >
              <Trash2 className="size-3.5" aria-hidden="true" />
            </button>
          </div>
          <GeneratorSpecEditor
            spec={v.spec}
            allowVariants={false}
            problemKindSeed={problemKindSeed}
            onChange={(next) => updateVariant(i, { spec: next as Exclude<GeneratorSpec, VariantGeneratorSpec> })}
          />
        </div>
      ))}
      <button
        type="button"
        onClick={() =>
          onChange({ ...spec, variants: [...spec.variants, { weight: 1, spec: defaultForKind("arithmetic", problemKindSeed) as Exclude<GeneratorSpec, VariantGeneratorSpec> }] })
        }
        className="flex items-center gap-1 rounded-md px-1.5 py-1 text-[11px] font-bold text-cyan-300 hover:bg-cyan-500/10"
      >
        <Plus className="size-3.5" aria-hidden="true" /> Añadir variante
      </button>
    </div>
  );
}

export function GeneratorTab({ generator, moduleId, onChange }: { generator: GeneratorSpec; moduleId: string; onChange: (g: GeneratorSpec) => void }) {
  const headingId = useId();
  return (
    <div className="mx-auto max-w-2xl space-y-4 p-4 text-xs sm:p-6" aria-labelledby={headingId}>
      <h2 id={headingId} className="text-sm font-bold text-white">
        Generador
      </h2>
      <GeneratorSpecEditor spec={generator} onChange={onChange} allowVariants problemKindSeed={moduleId} />
      <GeneratorPreview spec={generator} />
    </div>
  );
}
