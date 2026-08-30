"use client";

import { useState } from "react";
import { MiniSlider, SliderPair, Formula } from "./shared";

export type ShapeVariant =
  | "sides"
  | "perimeter"
  | "area-rect"
  | "area-triangle"
  | "angle"
  | "volume"
  | "coords"
  | "pythagoras"
  | "scale";

function RegularPolygonSvg({ sides }: { sides: number }) {
  const points = Array.from({ length: sides }, (_, i) => {
    const angle = (Math.PI * 2 * i) / sides - Math.PI / 2;
    return `${100 + 80 * Math.cos(angle)},${100 + 80 * Math.sin(angle)}`;
  }).join(" ");
  return (
    <svg aria-hidden="true" viewBox="0 0 200 200" className="mx-auto h-40 w-40">
      <polygon points={points} fill="#EDE9FE" stroke="#7C3AED" strokeWidth="4" />
    </svg>
  );
}

function ShapeSides() {
  const shapes = [
    { name: "Triángulo", sides: 3 },
    { name: "Cuadrado", sides: 4 },
    { name: "Pentágono", sides: 5 },
    { name: "Hexágono", sides: 6 },
  ];
  const [idx, setIdx] = useState(0);
  const shape = shapes[idx];
  return (
    <div className="space-y-6 text-center">
      <h2 className="text-2xl font-bold text-purple-800 sm:text-3xl">Lados y vértices 🔺</h2>
      <p className="text-slate-600">
        Un polígono es una figura cerrada hecha solo de líneas rectas. Cada esquina donde se juntan dos lados se
        llama <strong>vértice</strong> — por eso siempre tiene el mismo número de lados que de vértices.
      </p>
      <div className="flex justify-center gap-2">
        {shapes.map((s, i) => (
          <button
            key={s.name}
            type="button"
            aria-pressed={i === idx}
            onClick={() => setIdx(i)}
            className={`rounded-xl border-2 px-4 py-2 font-bold ${
              i === idx ? "border-purple-700 bg-purple-600 text-white" : "border-purple-200 bg-white text-purple-700 hover:bg-purple-100"
            }`}
          >
            {s.name}
          </button>
        ))}
      </div>
      <RegularPolygonSvg sides={shape.sides} />
      <Formula text={`${shape.name}: ${shape.sides} lados y ${shape.sides} vértices`} />
    </div>
  );
}

function ShapeRect({ mode }: { mode: "perimeter" | "area" }) {
  const [w, setW] = useState(4);
  const [h, setH] = useState(3);
  const value = mode === "perimeter" ? 2 * (w + h) : w * h;
  return (
    <div className="space-y-6 text-center">
      <h2 className="text-2xl font-bold text-purple-800 sm:text-3xl">
        {mode === "perimeter" ? "Perímetro de un rectángulo 📏" : "Área de un rectángulo 📐"}
      </h2>
      <p className="text-slate-600">
        {mode === "perimeter"
          ? "El perímetro es la distancia total alrededor de una figura: se suma la longitud de todos sus lados."
          : "El área es el espacio que cubre una figura por dentro: en un rectángulo es como contar cuántos cuadritos de 1×1 caben adentro."}
      </p>
      <SliderPair labelA="Ancho" a={w} setA={setW} labelB="Alto" b={h} setB={setH} maxA={10} maxB={10} />
      <div className="flex justify-center">
        <svg aria-hidden="true" viewBox="0 0 220 160" className="h-40 w-56">
          <rect x={30} y={20} width={w * 16} height={h * 16} fill="#FBCFE8" stroke="#DB2777" strokeWidth="3" />
        </svg>
      </div>
      <Formula text={mode === "perimeter" ? `Perímetro = 2 × (${w} + ${h}) = ${value}` : `Área = ${w} × ${h} = ${value}`} />
    </div>
  );
}

function ShapeTriangleArea() {
  const [base, setBase] = useState(6);
  const [height, setHeight] = useState(4);
  const area = (base * height) / 2;
  return (
    <div className="space-y-6 text-center">
      <h2 className="text-2xl font-bold text-purple-800 sm:text-3xl">Área de un triángulo 🔺</h2>
      <p className="text-slate-600">
        Un triángulo es exactamente la mitad de un rectángulo con la misma base y altura — por eso su área es
        (base × altura) ÷ 2.
      </p>
      <SliderPair labelA="Base" a={base} setA={setBase} labelB="Altura" b={height} setB={setHeight} maxA={12} maxB={12} />
      <svg aria-hidden="true" viewBox="0 0 220 160" className="mx-auto h-40 w-56">
        <polygon
          points={`30,140 ${30 + base * 14},140 ${30 + (base * 14) / 2},${140 - height * 10}`}
          fill="#DDD6FE"
          stroke="#7C3AED"
          strokeWidth="3"
        />
      </svg>
      <Formula text={`Área = (${base} × ${height}) ÷ 2 = ${area}`} />
    </div>
  );
}

function ShapeAngle() {
  const [deg, setDeg] = useState(50);
  return (
    <div className="space-y-6 text-center">
      <h2 className="text-2xl font-bold text-purple-800 sm:text-3xl">Ángulos complementarios y suplementarios 📐</h2>
      <p className="text-slate-600">
        Un ángulo recto mide 90°. Dos ángulos son <strong>complementarios</strong> si juntos suman 90°, y{" "}
        <strong>suplementarios</strong> si juntos suman 180° (una línea recta).
      </p>
      <div className="rounded-2xl border-2 border-purple-100 bg-purple-50 p-6">
        <MiniSlider label="Ángulo" value={deg} setValue={setDeg} min={1} max={179} />
      </div>
      <svg aria-hidden="true" viewBox="0 0 200 120" className="mx-auto h-28 w-48">
        <line x1="20" y1="100" x2="180" y2="100" stroke="#94a3b8" strokeWidth="3" />
        <line
          x1="20"
          y1="100"
          x2={20 + 140 * Math.cos((deg * Math.PI) / 180)}
          y2={100 - 140 * Math.sin((deg * Math.PI) / 180)}
          stroke="#DB2777"
          strokeWidth="3"
        />
      </svg>
      <Formula text={`Complementario: ${Math.max(0, 90 - deg)}° · Suplementario: ${180 - deg}°`} />
    </div>
  );
}

function ShapeVolume() {
  const [l, setL] = useState(3);
  const [w, setW] = useState(2);
  const [h, setH] = useState(2);
  const vol = l * w * h;
  return (
    <div className="space-y-6 text-center">
      <h2 className="text-2xl font-bold text-purple-800 sm:text-3xl">Volumen de un prisma 📦</h2>
      <p className="text-slate-600">
        El volumen mide cuánto espacio ocupa un objeto en sus tres dimensiones: largo, ancho y alto. Por eso se
        multiplican los tres.
      </p>
      <div className="grid grid-cols-1 gap-4 rounded-2xl border-2 border-purple-100 bg-purple-50 p-6 text-left md:grid-cols-3">
        <MiniSlider label="Largo" value={l} setValue={setL} max={8} />
        <MiniSlider label="Ancho" value={w} setValue={setW} max={8} />
        <MiniSlider label="Alto" value={h} setValue={setH} max={8} />
      </div>
      <div className="text-6xl">📦</div>
      <Formula text={`Volumen = ${l} × ${w} × ${h} = ${vol}`} />
    </div>
  );
}

function ShapeCoords() {
  const [x, setX] = useState(2);
  const [y, setY] = useState(3);
  const [dx, setDx] = useState(3);
  const px = 100 + x * 8;
  const py = 100 - y * 8;
  const npx = 100 + (x + dx) * 8;
  return (
    <div className="space-y-6 text-center">
      <h2 className="text-2xl font-bold text-purple-800 sm:text-3xl">Coordenadas y traslaciones 📍</h2>
      <p className="text-slate-600">
        Cada punto del plano se ubica con dos números (x, y): x dice cuánto moverte a los lados, y dice cuánto
        moverte hacia arriba o abajo. <strong>Trasladar</strong> es mover un punto sin cambiar su forma.
      </p>
      <div className="grid grid-cols-1 gap-4 rounded-2xl border-2 border-purple-100 bg-purple-50 p-6 text-left md:grid-cols-3">
        <MiniSlider label="x" value={x} setValue={setX} min={-9} max={9} />
        <MiniSlider label="y" value={y} setValue={setY} min={-9} max={9} />
        <MiniSlider label="Mover en x" value={dx} setValue={setDx} min={-9} max={9} />
      </div>
      <svg aria-hidden="true" viewBox="0 0 200 200" className="mx-auto h-48 w-48 bg-slate-50">
        <line x1="0" y1="100" x2="200" y2="100" stroke="#cbd5e1" />
        <line x1="100" y1="0" x2="100" y2="200" stroke="#cbd5e1" />
        <circle cx={px} cy={py} r="5" fill="#7C3AED" />
        <circle cx={npx} cy={py} r="5" fill="#DB2777" />
      </svg>
      <Formula text={`(${x}, ${y}) se mueve a (${x + dx}, ${y})`} />
    </div>
  );
}

function ShapePythagoras() {
  const [a, setA] = useState(3);
  const [b, setB] = useState(4);
  const c = Math.sqrt(a * a + b * b);
  return (
    <div className="space-y-6 text-center">
      <h2 className="text-2xl font-bold text-purple-800 sm:text-3xl">Teorema de Pitágoras 📐</h2>
      <p className="text-slate-600">
        En todo triángulo rectángulo, el cuadrado del lado más largo (la <strong>hipotenusa</strong>) es igual a
        la suma de los cuadrados de los otros dos lados: a² + b² = c².
      </p>
      <SliderPair labelA="Cateto a" a={a} setA={setA} labelB="Cateto b" b={b} setB={setB} maxA={15} maxB={15} />
      <svg aria-hidden="true" viewBox="0 0 200 160" className="mx-auto h-40 w-56">
        <polygon points={`30,140 ${30 + a * 8},140 30,${140 - b * 8}`} fill="#DDD6FE" stroke="#7C3AED" strokeWidth="3" />
      </svg>
      <Formula text={`c = √(${a}² + ${b}²) = ${c.toFixed(1)}`} />
    </div>
  );
}

function ShapeScale() {
  const [side, setSide] = useState(3);
  const [scale, setScale] = useState(2);
  return (
    <div className="space-y-6 text-center">
      <h2 className="text-2xl font-bold text-purple-800 sm:text-3xl">Figuras semejantes 🔍</h2>
      <p className="text-slate-600">
        Dos figuras son semejantes cuando tienen la misma forma pero distinto tamaño: todos los lados de una son
        el mismo múltiplo (la <strong>escala</strong>) de los lados de la otra.
      </p>
      <div className="grid grid-cols-1 gap-4 rounded-2xl border-2 border-purple-100 bg-purple-50 p-6 text-left md:grid-cols-2">
        <MiniSlider label="Lado pequeño" value={side} setValue={setSide} max={8} />
        <MiniSlider label="Escala" value={scale} setValue={setScale} min={1} max={4} />
      </div>
      <div className="flex items-end justify-center gap-6">
        <div style={{ width: side * 10, height: side * 10 }} className="border-2 border-pink-600 bg-pink-300" />
        <div style={{ width: side * scale * 10, height: side * scale * 10 }} className="border-2 border-purple-600 bg-purple-300" />
      </div>
      <Formula text={`Lado grande = ${side} × ${scale} = ${side * scale}`} />
    </div>
  );
}

export function ShapeConcept({ variant }: { variant: ShapeVariant }) {
  switch (variant) {
    case "sides":
      return <ShapeSides />;
    case "perimeter":
      return <ShapeRect mode="perimeter" />;
    case "area-rect":
      return <ShapeRect mode="area" />;
    case "area-triangle":
      return <ShapeTriangleArea />;
    case "angle":
      return <ShapeAngle />;
    case "volume":
      return <ShapeVolume />;
    case "coords":
      return <ShapeCoords />;
    case "pythagoras":
      return <ShapePythagoras />;
    case "scale":
      return <ShapeScale />;
  }
}
