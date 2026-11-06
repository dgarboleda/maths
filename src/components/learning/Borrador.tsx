"use client";

import { lazy, Suspense, useState } from "react";
import { Calculator, ChevronDown } from "lucide-react";

const BorradorContent = lazy(() => import("./BorradorContent").then((module) => ({ default: module.Borrador })));

type Props = {
  targets?: string[];
  onUse?: (value: string, target: number) => void;
  disabled?: boolean;
};

export function Borrador(props: Props) {
  const [requested, setRequested] = useState(false);
  const button = (
    <section className="rounded-xl border border-slate-700 bg-slate-950/60">
      <h3 className="m-0">
        <button type="button" aria-expanded={false} disabled={props.disabled || requested}
          onClick={() => setRequested(true)}
          className="flex min-h-11 w-full items-center gap-2 px-4 text-left text-sm font-bold text-cyan-200">
          <Calculator size={16} aria-hidden="true" />
          Borrador de cálculo
          <span className="ml-auto"><ChevronDown size={16} aria-hidden="true" /></span>
        </button>
      </h3>
    </section>
  );
  return requested ? <Suspense fallback={button}><BorradorContent {...props} initialOpen /></Suspense> : button;
}
