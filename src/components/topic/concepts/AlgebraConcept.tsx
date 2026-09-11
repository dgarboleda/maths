"use client";

import { useState } from "react";
import { MiniSlider, SliderPair, Formula } from "./shared";
import { quadraticText } from "@/lib/algebra";

export type AlgebraVariant =
  | "simple"
  | "mult-sub"
  | "proportion"
  | "evaluate"
  | "two-step"
  | "inequality"
  | "function"
  | "quadratic";

function EquationSimple() {
  const [x, setX] = useState(5);
  const [b, setB] = useState(3);
  const c = x + b;
  return (
    <div className="space-y-6 text-center">
      <h2 className="text-2xl font-bold text-purple-800 sm:text-3xl">Ecuaciones simples 🧩</h2>
      <p className="text-slate-600">
        Una ecuación con x es un acertijo: x esconde un número y hay que encontrarlo. Si x + b = c, para despejar x
        hacemos lo contrario de sumar: restamos b de los dos lados.
      </p>
      <SliderPair labelA="x (el número escondido)" a={x} setA={setX} labelB="Lo que se le suma" b={b} setB={setB} maxA={20} maxB={15} />
      <Formula text={`x + ${b} = ${c}`} />
      <p className="text-slate-600">
        Para despejar x, resta {b} de los dos lados: {c} − {b} = <strong className="text-purple-800">{x}</strong>
      </p>
    </div>
  );
}

function EquationMultSub() {
  const [mode, setMode] = useState<"mult" | "resta">("mult");
  const [x, setX] = useState(4);
  const [m, setM] = useState(3);
  const [b, setB] = useState(5);
  const isMult = mode === "mult";
  const result = isMult ? m * x : x - b;

  return (
    <div className="space-y-6 text-center">
      <h2 className="text-2xl font-bold text-purple-800 sm:text-3xl">Ecuaciones (× y −) 🧩</h2>
      <p className="text-slate-600">
        Para despejar x hacemos siempre la operación contraria: si algo <strong>multiplica</strong> a x, se
        <strong> divide</strong> en los dos lados; si algo <strong>resta</strong>, se <strong>suma</strong> en los
        dos lados.
      </p>
      <div className="flex justify-center gap-3">
        {(["mult", "resta"] as const).map((m2) => (
          <button
            key={m2}
            type="button"
            aria-pressed={mode === m2}
            onClick={() => setMode(m2)}
            className={`rounded-xl border-2 px-5 py-2 font-bold transition-colors ${
              mode === m2 ? "border-purple-700 bg-purple-600 text-white" : "border-purple-200 bg-white text-purple-700 hover:bg-purple-100"
            }`}
          >
            {m2 === "mult" ? "mx = c" : "x − b = c"}
          </button>
        ))}
      </div>
      {isMult ? (
        <SliderPair labelA="x (el número escondido)" a={x} setA={setX} labelB="Multiplica por" b={m} setB={setM} maxA={12} maxB={9} />
      ) : (
        <SliderPair labelA="x (el número escondido)" a={x} setA={setX} labelB="Se le resta" b={b} setB={setB} maxA={20} maxB={15} />
      )}
      <Formula text={isMult ? `${m}x = ${result}` : `x − ${b} = ${result}`} />
      <p className="text-slate-600">
        {isMult ? (
          <>
            Para despejar x, divide los dos lados entre {m}: {result} ÷ {m} = <strong className="text-purple-800">{x}</strong>
          </>
        ) : (
          <>
            Para despejar x, suma {b} en los dos lados: {result} + {b} = <strong className="text-purple-800">{x}</strong>
          </>
        )}
      </p>
    </div>
  );
}

function ProportionConcept() {
  const [unitQty, setUnitQty] = useState(3);
  const [unitPrice, setUnitPrice] = useState(2);
  const [scaleFactor, setScaleFactor] = useState(3);
  const unitCost = unitQty * unitPrice;
  const targetQty = unitQty * scaleFactor;
  const targetCost = unitCost * scaleFactor;

  return (
    <div className="space-y-6 text-center">
      <h2 className="text-2xl font-bold text-purple-800 sm:text-3xl">Proporciones 🔀</h2>
      <p className="text-slate-600">
        Dos razones son proporcionales cuando una es la otra multiplicada por el mismo número en los dos lados. Si
        sabes cuánto cuestan {unitQty} manzanas, para saber cuánto cuestan más manzanas multiplicas los dos lados por
        el mismo factor.
      </p>
      <div className="grid grid-cols-1 gap-6 rounded-2xl border-2 border-purple-100 bg-purple-50 p-6 text-left md:grid-cols-3">
        <MiniSlider label="Manzanas" value={unitQty} setValue={setUnitQty} min={1} max={8} />
        <MiniSlider label="Precio de cada una" value={unitPrice} setValue={setUnitPrice} min={1} max={9} />
        <MiniSlider label="Multiplicar por" value={scaleFactor} setValue={setScaleFactor} min={2} max={6} />
      </div>
      <Formula text={`${unitQty}/${unitCost} = ${targetQty}/${targetCost}`} />
      <p className="text-slate-600">
        {unitQty} × {scaleFactor} = {targetQty} manzanas cuestan {unitCost} × {scaleFactor} ={" "}
        <strong className="text-purple-800">{targetCost}</strong>
      </p>
    </div>
  );
}

function EvaluateExpression() {
  const [x, setX] = useState(4);
  const [m, setM] = useState(3);
  const [b, setB] = useState(2);
  const result = m * x + b;

  return (
    <div className="space-y-6 text-center">
      <h2 className="text-2xl font-bold text-purple-800 sm:text-3xl">Evaluar expresiones 🔡</h2>
      <p className="text-slate-600">
        Evaluar una expresión es reemplazar la letra por el número que te dan y luego resolver las operaciones en
        orden: primero multiplicar, después sumar.
      </p>
      <div className="grid grid-cols-1 gap-6 rounded-2xl border-2 border-purple-100 bg-purple-50 p-6 text-left md:grid-cols-3">
        <MiniSlider label="Valor de x" value={x} setValue={setX} min={0} max={10} />
        <MiniSlider label="Multiplica x por" value={m} setValue={setM} min={1} max={9} />
        <MiniSlider label="Le suma" value={b} setValue={setB} min={0} max={15} />
      </div>
      <Formula text={`${m}x + ${b}`} />
      <p className="text-slate-600">
        Si x = {x}: {m} × {x} + {b} = {m * x} + {b} = <strong className="text-purple-800">{result}</strong>
      </p>
    </div>
  );
}

function TwoStepEquation() {
  const [x, setX] = useState(4);
  const [m, setM] = useState(3);
  const [b, setB] = useState(5);
  const c = m * x + b;
  const afterStep1 = c - b;

  return (
    <div className="space-y-6 text-center">
      <h2 className="text-2xl font-bold text-purple-800 sm:text-3xl">Ecuaciones de dos pasos 🧮</h2>
      <p className="text-slate-600">
        Cuando la ecuación tiene una multiplicación y una suma, se despeja en dos pasos: primero deshaces la suma,
        después deshaces la multiplicación.
      </p>
      <SliderPair labelA="x (el número escondido)" a={x} setA={setX} labelB="Multiplica x por" b={m} setB={setM} maxA={15} maxB={9} />
      <MiniSlider label="Le suma" value={b} setValue={setB} min={0} max={15} />
      <Formula text={`${m}x + ${b} = ${c}`} />
      <div className="mx-auto max-w-sm space-y-2 rounded-xl border border-purple-200 bg-purple-50 p-4 text-left text-slate-700">
        <p>
          <strong>Paso 1</strong> — resta {b} de los dos lados: {c} − {b} = {afterStep1}, así que {m}x = {afterStep1}
        </p>
        <p>
          <strong>Paso 2</strong> — divide entre {m}: {afterStep1} ÷ {m} = <strong className="text-purple-800">{x}</strong>
        </p>
      </div>
    </div>
  );
}

function InequalityConcept() {
  const [m, setM] = useState(3);
  const [b, setB] = useState(4);
  const [c, setC] = useState(20);
  const restante = c - b;
  const limite = restante / m;
  const menorEntero = Math.floor(limite) + 1;
  const limiteTexto = Number.isInteger(limite) ? `${limite}` : `${restante}/${m} ≈ ${limite.toFixed(1)}`;
  const desde = Math.max(0, Math.floor(limite) - 5);
  const ticks = Array.from({ length: 12 }, (_, i) => desde + i);

  return (
    <div className="space-y-6 text-center">
      <h2 className="text-2xl font-bold text-purple-800 sm:text-3xl">Inecuaciones 📏</h2>
      <p className="text-slate-600">
        Una inecuación no tiene una única solución: la cumplen <strong>todos</strong> los números que hacen que el
        lado izquierdo quede más grande que el derecho. Se despeja igual que una ecuación de dos pasos: primero se
        deshace la suma, después la multiplicación.
      </p>
      <div className="grid grid-cols-1 gap-6 rounded-2xl border-2 border-purple-100 bg-purple-50 p-6 text-left md:grid-cols-3">
        <MiniSlider label="Multiplica x por" value={m} setValue={setM} min={1} max={5} />
        <MiniSlider label="Le suma" value={b} setValue={setB} min={0} max={10} />
        <MiniSlider label="Tiene que superar a" value={c} setValue={setC} min={11} max={40} />
      </div>
      <Formula text={`${m}x + ${b} > ${c}`} />
      <div className="mx-auto max-w-sm space-y-2 rounded-xl border border-purple-200 bg-purple-50 p-4 text-left text-slate-700">
        <p>
          <strong>Paso 1</strong> — resta {b} de los dos lados: {m}x &gt; {restante}
        </p>
        <p>
          <strong>Paso 2</strong> — divide entre {m}: x &gt; {limiteTexto}
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-1 rounded-2xl border-2 border-slate-200 bg-slate-50 p-4">
        {ticks.map((n) => (
          <span
            key={n}
            className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
              n > limite ? "bg-purple-600 text-white" : "bg-slate-200 text-slate-700"
            }`}
          >
            {n}
          </span>
        ))}
      </div>
      <p className="text-slate-600">
        El menor número entero que la cumple es <strong className="text-purple-800">{menorEntero}</strong>. Con ≤ se
        busca al revés: el mayor entero que no pasa del límite.
      </p>
    </div>
  );
}

function FunctionConcept() {
  const [m, setM] = useState(2);
  const [b, setB] = useState(1);
  const xs = [1, 2, 3, 4];

  return (
    <div className="space-y-6 text-center">
      <h2 className="text-2xl font-bold text-purple-800 sm:text-3xl">Funciones y tablas 🎛️</h2>
      <p className="text-slate-600">
        Una función es una máquina: le das un número (x) y siempre te devuelve el mismo resultado (f(x)), calculado
        con la misma regla. Si solo tienes la tabla, mira cuánto aumenta el resultado cada vez que x aumenta 1: ese
        es el número que multiplica a x. Lo que falta para llegar al primer valor es lo que se suma.
      </p>
      <SliderPair labelA="Multiplica x por" a={m} setA={setM} labelB="Le suma" b={b} setB={setB} maxA={6} maxB={10} />
      <Formula text={`f(x) = ${m}x ${b >= 0 ? "+" : "−"} ${Math.abs(b)}`} />
      <div className="mx-auto grid max-w-sm grid-cols-2 gap-2">
        {xs.map((x) => (
          <div key={x} className="rounded-xl border border-purple-200 bg-purple-50 p-2 text-sm font-bold text-purple-800">
            f({x}) = {m * x + b}
          </div>
        ))}
      </div>
      <p className="text-slate-600">
        Cada vez que x aumenta 1, f(x) aumenta {m}: por eso la regla multiplica x por {m}.
      </p>
    </div>
  );
}

function QuadraticConcept() {
  const [mode, setMode] = useState<"cuadrado" | "trinomio">("cuadrado");

  return (
    <div className="space-y-6 text-center">
      <h2 className="text-2xl font-bold text-purple-800 sm:text-3xl">Ecuaciones cuadráticas 🌀</h2>
      <div className="flex justify-center gap-3">
        {(["cuadrado", "trinomio"] as const).map((m) => (
          <button
            key={m}
            type="button"
            aria-pressed={mode === m}
            onClick={() => setMode(m)}
            className={`rounded-xl border-2 px-5 py-2 font-bold transition-colors ${
              mode === m ? "border-purple-700 bg-purple-600 text-white" : "border-purple-200 bg-white text-purple-700 hover:bg-purple-100"
            }`}
          >
            {m === "cuadrado" ? "x² = c" : "x² + bx + c = 0"}
          </button>
        ))}
      </div>
      {mode === "cuadrado" ? <SquareRootPart /> : <FactoringPart />}
    </div>
  );
}

function FactoringPart() {
  const [r1, setR1] = useState(3);
  const [r2, setR2] = useState(2);
  const b = -(r1 + r2);
  const c = r1 * r2;
  const factor = (r: number) => (r === 0 ? "x" : `x − ${r}`);

  return (
    <>
      <p className="text-slate-600">
        Cuando también hay un término con x, se buscan dos números que multiplicados den c y sumados den b. Con ellos
        la ecuación se escribe como un producto igual a 0 — y un producto vale 0 solo si alguno de sus factores vale 0.
      </p>
      <SliderPair labelA="Una solución" a={r1} setA={setR1} labelB="La otra solución" b={r2} setB={setR2} maxA={9} maxB={9} />
      <Formula text={`${quadraticText(b, c)} = 0`} />
      <p className="text-slate-600">
        Se factoriza como ({factor(r1)})({factor(r2)}) = 0, así que x = <strong className="text-purple-800">{r1}</strong> o
        x = <strong className="text-purple-800">{r2}</strong>.
      </p>
    </>
  );
}

function SquareRootPart() {
  const [root, setRoot] = useState(4);
  const square = root * root;
  const px = Math.min(140, root * 20);

  return (
    <>
      <p className="text-slate-600">
        x² significa x × x. Si x² = c, para despejar x hacemos lo contrario de elevar al cuadrado: sacamos la raíz
        cuadrada. Geométricamente, x² es el área de un cuadrado de lado x.
      </p>
      <div className="rounded-2xl border-2 border-purple-100 bg-purple-50 p-6">
        <MiniSlider label="x (el lado del cuadrado)" value={root} setValue={setRoot} min={1} max={12} />
      </div>
      <div className="flex justify-center">
        <div
          style={{ width: px, height: px }}
          className="flex items-center justify-center border-2 border-purple-600 bg-purple-200 text-sm font-bold text-purple-900"
        >
          {root} × {root}
        </div>
      </div>
      <Formula text={`x² = ${square}`} />
      <p className="text-slate-600">
        Para despejar x, saca la raíz cuadrada de {square}: √{square} = <strong className="text-purple-800">{root}</strong>
      </p>
    </>
  );
}

export function AlgebraConcept({ variant }: { variant: AlgebraVariant }) {
  switch (variant) {
    case "simple":
      return <EquationSimple />;
    case "mult-sub":
      return <EquationMultSub />;
    case "proportion":
      return <ProportionConcept />;
    case "evaluate":
      return <EvaluateExpression />;
    case "two-step":
      return <TwoStepEquation />;
    case "inequality":
      return <InequalityConcept />;
    case "function":
      return <FunctionConcept />;
    case "quadratic":
      return <QuadraticConcept />;
  }
}
