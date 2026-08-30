"use client";

import { useState } from "react";
import type { Problem } from "@/lib/problem";
import { NumberLineInput } from "@/components/NumberLineInput";
import { GroupTensInput } from "@/components/GroupTensInput";
import { BalanceWeightInput } from "@/components/BalanceWeightInput";

/** Renderiza el control correcto según problem.inputType y responde una sola vez. */
export function QuestionWidget({
  problem,
  disabled,
  onSubmit,
  promptId,
}: {
  problem: Problem;
  disabled?: boolean;
  onSubmit: (given: number) => void;
  /** id del texto del enunciado, para etiquetar el control con él. */
  promptId?: string;
}) {
  const [inputValue, setInputValue] = useState("");
  const [choiceValue, setChoiceValue] = useState<number | null>(null);

  if (problem.inputType === "numberLine") {
    return (
      <NumberLineInput
        key={problem.id}
        min={problem.lineMin ?? 0}
        max={problem.lineMax ?? 10}
        start={problem.startValue ?? 0}
        disabled={disabled}
        onAnswer={onSubmit}
        labelledBy={promptId}
      />
    );
  }

  if (problem.inputType === "groupTens") {
    return <GroupTensInput key={problem.id} total={problem.groupTotal ?? 0} onAnswer={onSubmit} />;
  }

  if (problem.inputType === "balanceWeight") {
    return (
      <BalanceWeightInput
        key={problem.id}
        leftFixed={problem.balanceLeftFixed ?? 0}
        rightFixed={problem.balanceRightFixed ?? 0}
        weights={problem.balanceWeights ?? []}
        onAnswer={onSubmit}
      />
    );
  }

  if (problem.inputType === "choice") {
    return (
      <div className="flex flex-wrap justify-center gap-4">
        {problem.choices?.map((choice, i) => (
          <button
            key={choice}
            disabled={disabled || choiceValue !== null}
            onClick={() => {
              setChoiceValue(choice);
              onSubmit(choice);
            }}
            className={`flex h-16 min-w-16 items-center justify-center rounded-2xl border-2 px-3 text-xl font-extrabold shadow-md transition-colors ${
              choiceValue === choice
                ? "border-purple-700 bg-purple-600 text-white"
                : "border-purple-300 bg-white text-purple-900 hover:bg-purple-100"
            }`}
          >
            {problem.choiceLabels ? problem.choiceLabels[i] : choice}
          </button>
        ))}
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const v = parseFloat(inputValue.replace(",", "."));
        if (!Number.isNaN(v)) onSubmit(v);
      }}
      className="flex flex-col items-center gap-4"
    >
      <input
        type="text"
        inputMode={problem.inputType === "decimal" ? "decimal" : "numeric"}
        autoFocus
        disabled={disabled}
        aria-label="Tu respuesta"
        aria-labelledby={promptId}
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        className="w-32 rounded-xl border-2 border-purple-300 px-3 py-2 text-center text-xl focus:border-purple-500"
      />
      <button
        type="submit"
        disabled={disabled || inputValue.trim() === ""}
        className="rounded-2xl bg-purple-600 px-6 py-2 font-bold text-white shadow-md disabled:opacity-40"
      >
        Comprobar
      </button>
    </form>
  );
}
