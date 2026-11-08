"use client";

/**
 * Dibuja la figura de apoyo de una pregunta (`Question.figure`). Es estática:
 * no tiene controles que permitan llegar a la respuesta probando, y la
 * incógnita aparece como «?». Las figuras geométricas no están a escala.
 * Se carga bajo demanda (ver `QuestionFigureSlot.tsx`).
 */
import type { BagColor, CrossingPosition, Figure } from "@/lib/learning/core";
import { describeFigure } from "@/lib/learning/core";

type P = [number, number];
const pts = (list: P[]) => list.map(([x, y]) => `${x},${y}`).join(" ");
const mid = (a: P, b: P): P => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
const ASK = "fill-amber-200";
const TEXT = "fill-slate-100";
const labelClass = (label: string) => `${label === "?" ? ASK : TEXT} text-[13px] font-bold`;

/** Rótulo de un lado, desplazado hacia fuera de la figura. */
function SideLabel({ a, b, center, label, gap = 14 }: { a: P; b: P; center: P; label: string; gap?: number }) {
  const m = mid(a, b);
  const dx = b[0] - a[0],
    dy = b[1] - a[1];
  const len = Math.hypot(dx, dy) || 1;
  let [nx, ny] = [-dy / len, dx / len];
  if ((m[0] - center[0]) * nx + (m[1] - center[1]) * ny < 0) [nx, ny] = [-nx, -ny];
  return (
    <text x={m[0] + nx * gap} y={m[1] + ny * gap + 4} textAnchor="middle" className={labelClass(label)}>
      {label}
    </text>
  );
}

/** Rótulo de un ángulo, desplazado hacia el interior. */
function AngleLabel({ at, center, label, gap = 24 }: { at: P; center: P; label: string; gap?: number }) {
  const dx = center[0] - at[0],
    dy = center[1] - at[1];
  const len = Math.hypot(dx, dy) || 1;
  return (
    <text x={at[0] + (dx / len) * gap} y={at[1] + (dy / len) * gap + 4} textAnchor="middle" className={labelClass(label)}>
      {label}
    </text>
  );
}

function Tick({ a, b }: { a: P; b: P }) {
  const m = mid(a, b);
  const dx = b[0] - a[0],
    dy = b[1] - a[1];
  const len = Math.hypot(dx, dy) || 1;
  const [nx, ny] = [(-dy / len) * 6, (dx / len) * 6];
  return <line x1={m[0] - nx} y1={m[1] - ny} x2={m[0] + nx} y2={m[1] + ny} className="stroke-amber-300" strokeWidth={2} />;
}

function NotToScale({ x = 6, y = 14 }: { x?: number; y?: number }) {
  return (
    <text x={x} y={y} className="fill-slate-400 text-[10px]">
      no está a escala
    </text>
  );
}

function Frame({ figure, viewBox, children, wide }: { figure: Figure; viewBox: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <svg
      role="img"
      aria-label={describeFigure(figure)}
      viewBox={viewBox}
      className={`w-full ${wide ? "max-w-lg" : "max-w-sm"} rounded-xl bg-slate-950`}
      data-figure={figure.kind}
    >
      {children}
    </svg>
  );
}

function TriangleFigure({ figure }: { figure: Extract<Figure, { kind: "triangle" }> }) {
  const shapes: Record<typeof figure.shape, P[]> = {
    scalene: [[40, 170], [250, 170], [95, 40]],
    isosceles: [[50, 170], [230, 170], [140, 40]],
    equilateral: [[60, 170], [220, 170], [140, 31]],
    right: [[60, 170], [250, 170], [60, 40]],
    obtuse: [[30, 170], [190, 170], [260, 70]],
  };
  const v = shapes[figure.shape];
  const center: P = [(v[0][0] + v[1][0] + v[2][0]) / 3, (v[0][1] + v[1][1] + v[2][1]) / 3];
  const sides: [P, P][] = [[v[0], v[1]], [v[1], v[2]], [v[2], v[0]]];
  const foot: P = [v[2][0], v[0][1]];
  return (
    <Frame figure={figure} viewBox="0 0 290 200">
      <NotToScale />
      <polygon points={pts(v)} className="fill-cyan-300/10 stroke-cyan-300" strokeWidth={2} />
      {figure.shape === "right" && (
        <polyline points={pts([[v[0][0] + 14, v[0][1]], [v[0][0] + 14, v[0][1] - 14], [v[0][0], v[0][1] - 14]])} className="fill-none stroke-cyan-200" />
      )}
      {figure.height && (
        <>
          <line x1={v[2][0]} y1={v[2][1]} x2={foot[0]} y2={foot[1]} className="stroke-slate-300" strokeDasharray="5 4" />
          <text x={v[2][0] + 8} y={(v[2][1] + foot[1]) / 2} className={labelClass(figure.height)}>
            {figure.height}
          </text>
        </>
      )}
      {(figure.ticks ?? []).map((i) => (
        <Tick key={i} a={sides[i][0]} b={sides[i][1]} />
      ))}
      {(figure.sides ?? []).map((label, i) =>
        label ? <SideLabel key={`s${i}`} a={sides[i][0]} b={sides[i][1]} center={center} label={label} /> : null,
      )}
      {(figure.angles ?? []).map((label, i) => (label ? <AngleLabel key={`a${i}`} at={v[i]} center={center} label={label} gap={i === 2 ? 30 : 34} /> : null))}
      {["A", "B", "C"].map((name, i) => (
        <AngleLabel key={name} at={v[i]} center={center} label={name} gap={-12} />
      ))}
    </Frame>
  );
}

function PolygonFigure({ figure }: { figure: Extract<Figure, { kind: "polygon" }> }) {
  const shapes: Record<typeof figure.shape, P[]> = {
    rectangle: [[40, 160], [250, 160], [250, 50], [40, 50]],
    square: [[80, 170], [210, 170], [210, 40], [80, 40]],
    parallelogram: [[30, 160], [210, 160], [260, 50], [80, 50]],
    trapezoid: [[30, 160], [260, 160], [200, 50], [90, 50]],
    rhombus: [[145, 175], [255, 105], [145, 35], [35, 105]],
    kite: [[145, 180], [235, 80], [145, 35], [55, 80]],
    triangle: [[40, 160], [250, 160], [110, 40]],
    "l-shape": [[40, 170], [250, 170], [250, 100], [170, 100], [170, 40], [40, 40]],
  };
  const v = shapes[figure.shape];
  const center: P = [v.reduce((s, p) => s + p[0], 0) / v.length, v.reduce((s, p) => s + p[1], 0) / v.length];
  const top = v[v.length - 1];
  const showHeight = figure.height && ["parallelogram", "trapezoid", "triangle"].includes(figure.shape);
  const heightX = figure.shape === "triangle" ? v[2][0] : v[v.length - 1][0];
  return (
    <Frame figure={figure} viewBox="0 0 290 200">
      <NotToScale />
      <polygon points={pts(v)} className="fill-cyan-300/10 stroke-cyan-300" strokeWidth={2} />
      {figure.base && <SideLabel a={v[0]} b={v[1]} center={center} label={figure.base} />}
      {figure.top && figure.shape === "trapezoid" && <SideLabel a={v[2]} b={v[3]} center={center} label={figure.top} />}
      {figure.side && <SideLabel a={v[1]} b={v[2]} center={center} label={figure.side} />}
      {figure.height && !showHeight && (
        <SideLabel a={figure.shape === "l-shape" ? v[5] : v[1]} b={figure.shape === "l-shape" ? v[0] : v[2]} center={center} label={figure.height} />
      )}
      {showHeight && (
        <>
          <line x1={heightX} y1={figure.shape === "triangle" ? v[2][1] : top[1]} x2={heightX} y2={v[0][1]} className="stroke-slate-300" strokeDasharray="5 4" />
          <polyline points={pts([[heightX + 10, v[0][1]], [heightX + 10, v[0][1] - 10], [heightX, v[0][1] - 10]])} className="fill-none stroke-slate-300" />
          <text x={heightX + 8} y={(top[1] + v[0][1]) / 2} className={labelClass(figure.height!)}>
            {figure.height}
          </text>
        </>
      )}
      {figure.notch && figure.shape === "l-shape" && (
        <>
          <polyline points={pts([[170, 40], [250, 40], [250, 100]])} className="fill-none stroke-slate-500" strokeDasharray="4 4" />
          <text x={210} y={34} textAnchor="middle" className={labelClass(figure.notch[0])}>{figure.notch[0]}</text>
          <text x={256} y={74} className={labelClass(figure.notch[1])}>{figure.notch[1]}</text>
        </>
      )}
      {figure.diagonals && (
        <>
          <line x1={v[0][0]} y1={v[0][1]} x2={v[2][0]} y2={v[2][1]} className="stroke-slate-300" strokeDasharray="5 4" />
          <line x1={v[1][0]} y1={v[1][1]} x2={v[3][0]} y2={v[3][1]} className="stroke-slate-300" strokeDasharray="5 4" />
          <text x={v[0][0] + 10} y={(v[0][1] + v[2][1]) / 2 + 26} className={labelClass(figure.diagonals[0])}>
            {figure.diagonals[0]}
          </text>
          <text x={(v[1][0] + v[3][0]) / 2 + 40} y={v[1][1] - 6} textAnchor="middle" className={labelClass(figure.diagonals[1])}>
            {figure.diagonals[1]}
          </text>
        </>
      )}
      {(figure.angles ?? []).map((label, i) => (label ? <AngleLabel key={i} at={v[i]} center={center} label={label} gap={30} /> : null))}
    </Frame>
  );
}

function RegularFigure({ figure }: { figure: Extract<Figure, { kind: "regular" }> }) {
  const C: P = [150, 105], R = 80, n = figure.sides;
  const v: P[] = Array.from({ length: n }, (_, i) => {
    const t = Math.PI / 2 + Math.PI / n + (2 * Math.PI * i) / n;
    return [C[0] + R * Math.cos(t), C[1] + R * Math.sin(t)];
  });
  // Lado de abajo: entre los vértices 0 y n − 1 está el más bajo.
  const bottom = v.reduce((best, p, i) => (p[1] + v[(i + 1) % n][1] > best.y ? { i, y: p[1] + v[(i + 1) % n][1] } : best), { i: 0, y: -Infinity }).i;
  const a = v[bottom], b = v[(bottom + 1) % n];
  const m = mid(a, b);
  return (
    <Frame figure={figure} viewBox="0 0 300 210">
      <NotToScale />
      <polygon points={pts(v)} className="fill-cyan-300/10 stroke-cyan-300" strokeWidth={2} />
      <circle cx={C[0]} cy={C[1]} r={3} className="fill-slate-100" />
      {figure.apothem && (
        <>
          <line x1={C[0]} y1={C[1]} x2={m[0]} y2={m[1]} className="stroke-slate-300" strokeDasharray="5 4" />
          <text x={C[0] + 6} y={(C[1] + m[1]) / 2 + 4} className={labelClass(figure.apothem)}>{figure.apothem}</text>
        </>
      )}
      {figure.side && <SideLabel a={a} b={b} center={C} label={figure.side} />}
    </Frame>
  );
}

function ThalesFigure({ figure }: { figure: Extract<Figure, { kind: "thales" }> }) {
  const ys = [40, 95, 175];
  const left = (y: number) => 70 + (y - 20) * 0.25;
  const right = (y: number) => 170 + (y - 20) * 0.6;
  return (
    <Frame figure={figure} viewBox="0 0 300 200" wide>
      <NotToScale />
      <line x1={left(20)} y1={20} x2={left(195)} y2={195} className="stroke-rose-300" strokeWidth={2} />
      <line x1={right(20)} y1={20} x2={right(195)} y2={195} className="stroke-rose-300" strokeWidth={2} />
      {ys.map((y) => (
        <line key={y} x1={20} y1={y} x2={295} y2={y} className="stroke-cyan-300" strokeWidth={2} />
      ))}
      {[0, 1].map((i) => (
        <g key={i}>
          <text x={left((ys[i] + ys[i + 1]) / 2) - 10} y={(ys[i] + ys[i + 1]) / 2 + 4} textAnchor="end" className={labelClass(figure.left[i])}>
            {figure.left[i]}
          </text>
          <text x={right((ys[i] + ys[i + 1]) / 2) + 10} y={(ys[i] + ys[i + 1]) / 2 + 4} className={labelClass(figure.right[i])}>
            {figure.right[i]}
          </text>
        </g>
      ))}
    </Frame>
  );
}

const SIDE_COLORS = ["fill-cyan-200", "fill-amber-200", "fill-rose-200"];

function SimilarFigure({ figure }: { figure: Extract<Figure, { kind: "similar" }> }) {
  const base: P[] = figure.shape === "right" ? [[0, 1], [1.4, 1], [0, 0]] : [[0, 1], [1.5, 1], [0.45, 0]];
  const draw = (scale: number, ox: number, oy: number) => base.map(([x, y]) => [ox + x * scale, oy + y * scale] as P);
  const small = draw(55, 20, 120), big = draw(95, 120, 70);
  const tri = (v: P[], labels: (string | null)[], name: string) => {
    const center: P = [(v[0][0] + v[1][0] + v[2][0]) / 3, (v[0][1] + v[1][1] + v[2][1]) / 3];
    const sides: [P, P][] = [[v[0], v[1]], [v[1], v[2]], [v[2], v[0]]];
    return (
      <g>
        <polygon points={pts(v)} className="fill-cyan-300/10 stroke-cyan-300" strokeWidth={2} />
        {figure.shape === "right" && (
          <polyline points={pts([[v[0][0] + 10, v[0][1]], [v[0][0] + 10, v[0][1] - 10], [v[0][0], v[0][1] - 10]])} className="fill-none stroke-cyan-200" />
        )}
        {labels.map((label, i) => {
          if (!label) return null;
          const m = mid(sides[i][0], sides[i][1]);
          const dx = sides[i][1][0] - sides[i][0][0], dy = sides[i][1][1] - sides[i][0][1];
          const len = Math.hypot(dx, dy) || 1;
          let [nx, ny] = [-dy / len, dx / len];
          if ((m[0] - center[0]) * nx + (m[1] - center[1]) * ny < 0) [nx, ny] = [-nx, -ny];
          return (
            <text key={i} x={m[0] + nx * 14} y={m[1] + ny * 14 + 4} textAnchor="middle" className={`${label === "?" ? ASK : SIDE_COLORS[i]} text-[12px] font-bold`}>
              {label}
            </text>
          );
        })}
        <text x={v[0][0]} y={v[0][1] + 30} className="fill-slate-400 text-[10px]">{name}</text>
      </g>
    );
  };
  const [a, b] = figure.names ?? ["pequeño", "grande"];
  return (
    <Frame figure={figure} viewBox="0 0 300 210" wide>
      <NotToScale />
      {tri(small, figure.small, a)}
      {tri(big, figure.big, b)}
    </Frame>
  );
}

function ParallelsFigure({ figure }: { figure: Extract<Figure, { kind: "parallels" }> }) {
  const ys = [65, 145];
  // Secante: de abajo a la izquierda hacia arriba a la derecha.
  const at = (y: number) => 80 + (185 - y) * 0.7;
  const tilt = figure.parallel === false ? 10 : 0;
  const offset: Record<CrossingPosition, P> = { tl: [-30, -10], tr: [26, -10], bl: [-26, 20], br: [30, 20] };
  return (
    <Frame figure={figure} viewBox="0 0 300 200" wide>
      <NotToScale />
      <line x1={10} y1={ys[0] - tilt} x2={290} y2={ys[0] + tilt} className="stroke-cyan-300" strokeWidth={2} />
      <line x1={10} y1={ys[1]} x2={290} y2={ys[1]} className="stroke-cyan-300" strokeWidth={2} />
      {figure.parallel !== false && (
        <>
          <text x={278} y={ys[0] - 6} className="fill-cyan-200 text-[11px]">r</text>
          <text x={278} y={ys[1] - 6} className="fill-cyan-200 text-[11px]">s</text>
          <text x={150} y={196} textAnchor="middle" className="fill-slate-400 text-[10px]">r ∥ s</text>
        </>
      )}
      <line x1={at(195)} y1={195} x2={at(15)} y2={15} className="stroke-rose-300" strokeWidth={2} />
      {figure.marks.map((m, i) => {
        const y = ys[m.line];
        const [dx, dy] = offset[m.pos];
        return (
          <text key={i} x={at(y) + dx} y={y + dy} textAnchor="middle" className={labelClass(m.label)}>
            {m.label}
          </text>
        );
      })}
    </Frame>
  );
}

function AnglesFigure({ figure }: { figure: Extract<Figure, { kind: "angles" }> }) {
  const O: P = [150, figure.around === 360 ? 100 : 160];
  const R = 110;
  const ray = (deg: number): P => [O[0] + R * Math.cos((deg * Math.PI) / 180), O[1] - R * Math.sin((deg * Math.PI) / 180)];
  const total = figure.parts.reduce((s, p) => s + p.deg, 0) || 1;
  const scale = figure.around / total;
  let acc = 0;
  const bounds = [0];
  for (const p of figure.parts) bounds.push((acc += p.deg * scale));
  return (
    <Frame figure={figure} viewBox="0 0 300 200">
      <NotToScale />
      {figure.around === 180 && <line x1={20} y1={O[1]} x2={280} y2={O[1]} className="stroke-cyan-300" strokeWidth={2} />}
      {bounds.map((deg, i) => {
        const end = ray(deg);
        return <line key={i} x1={O[0]} y1={O[1]} x2={end[0]} y2={end[1]} className="stroke-cyan-300" strokeWidth={2} />;
      })}
      {figure.around === 90 && (
        <polyline points={pts([[O[0] + 12, O[1]], [O[0] + 12, O[1] - 12], [O[0], O[1] - 12]])} className="fill-none stroke-cyan-200" />
      )}
      {figure.parts.map((p, i) => {
        const m = (bounds[i] + bounds[i + 1]) / 2;
        const r = 52;
        return (
          <text
            key={i}
            x={O[0] + r * Math.cos((m * Math.PI) / 180)}
            y={O[1] - r * Math.sin((m * Math.PI) / 180) + 4}
            textAnchor="middle"
            className={labelClass(p.label)}
          >
            {p.label}
          </text>
        );
      })}
    </Frame>
  );
}

function CircleFigure({ figure }: { figure: Extract<Figure, { kind: "circle" }> }) {
  const C: P = [150, 100];
  const R = 75;
  const s = figure.sector;
  const end: P = s ? [C[0] + R * Math.cos((-s.deg * Math.PI) / 180), C[1] + R * Math.sin((-s.deg * Math.PI) / 180)] : C;
  return (
    <Frame figure={figure} viewBox="0 0 300 200">
      <NotToScale />
      <circle cx={C[0]} cy={C[1]} r={R} className="fill-cyan-300/10 stroke-cyan-300" strokeWidth={2} />
      {s && (
        <path
          d={`M ${C[0]} ${C[1]} L ${C[0] + R} ${C[1]} A ${R} ${R} 0 ${s.deg > 180 ? 1 : 0} 0 ${end[0]} ${end[1]} Z`}
          className="fill-amber-300/30 stroke-amber-300"
        />
      )}
      {figure.inner && (
        <>
          <circle cx={C[0]} cy={C[1]} r={R * 0.4} className="fill-emerald-300/30 stroke-emerald-300" strokeWidth={2} />
          <line x1={C[0]} y1={C[1]} x2={C[0] - R * 0.4} y2={C[1]} className="stroke-emerald-200" strokeWidth={2} />
          <text x={C[0] - R * 0.2} y={C[1] - 6} textAnchor="middle" className={labelClass(figure.inner)}>{figure.inner}</text>
        </>
      )}
      <circle cx={C[0]} cy={C[1]} r={3} className="fill-slate-100" />
      {figure.radius && (
        <>
          <line x1={C[0]} y1={C[1]} x2={C[0] + R * 0.71} y2={C[1] + R * 0.71} className="stroke-rose-300" strokeWidth={2} />
          <text x={C[0] + 44} y={C[1] + 30} className={labelClass(figure.radius)}>
            {figure.radius}
          </text>
        </>
      )}
      {figure.diameter && (
        <>
          <line x1={C[0] - R} y1={C[1] - 2} x2={C[0] + R} y2={C[1] - 2} className="stroke-rose-300" strokeWidth={2} />
          <text x={C[0] - 30} y={C[1] - 10} textAnchor="middle" className={labelClass(figure.diameter)}>
            {figure.diameter}
          </text>
        </>
      )}
      {s?.label && (
        <text x={C[0] + 30} y={C[1] - 12} className={labelClass(s.label)}>
          {s.label}
        </text>
      )}
    </Frame>
  );
}

function SolidFigure({ figure }: { figure: Extract<Figure, { kind: "solid" }> }) {
  const L = (label: string | undefined, x: number, y: number, anchor: "start" | "middle" | "end" = "middle") =>
    label ? (
      <text x={x} y={y} textAnchor={anchor} className={labelClass(label)}>
        {label}
      </text>
    ) : null;
  const edge = "fill-cyan-300/10 stroke-cyan-300";
  const hidden = "stroke-cyan-300/60";
  let body: React.ReactNode;
  switch (figure.shape) {
    case "prism":
    case "cube": {
      const [w, h, d] = figure.shape === "cube" ? [110, 110, 40] : [150, 90, 50];
      const x = 50,
        y = 180;
      body = (
        <>
          <polygon points={pts([[x, y], [x + w, y], [x + w, y - h], [x, y - h]])} className={edge} strokeWidth={2} />
          <polygon points={pts([[x, y - h], [x + d, y - h - d * 0.6], [x + w + d, y - h - d * 0.6], [x + w, y - h]])} className={edge} strokeWidth={2} />
          <polygon points={pts([[x + w, y], [x + w + d, y - d * 0.6], [x + w + d, y - h - d * 0.6], [x + w, y - h]])} className={edge} strokeWidth={2} />
          {L(figure.length ?? (figure.shape === "cube" ? figure.width : undefined), x + w / 2, y + 16)}
          {L(figure.width, x + w + d / 2 + 14, y - d * 0.3 + 6, "start")}
          {L(figure.height, x - 8, y - h / 2 + 4, "end")}
        </>
      );
      break;
    }
    case "triangular-prism": {
      const A: P = [40, 175], B: P = [140, 175], C: P = [80, 105];
      const d: P = [110, -45];
      const sh = (p: P): P => [p[0] + d[0], p[1] + d[1]];
      body = (
        <>
          <line x1={A[0]} y1={A[1]} x2={sh(A)[0]} y2={sh(A)[1]} className={hidden} strokeDasharray="4 4" />
          <polygon points={pts([B, sh(B), sh(C), C])} className={edge} strokeWidth={2} />
          <polygon points={pts([sh(A), sh(B), sh(C)])} className={edge} strokeWidth={2} />
          <polygon points={pts([A, B, C])} className={edge} strokeWidth={2} />
          {L(figure.length, (A[0] + B[0]) / 2, A[1] + 16)}
          {L(figure.height, (B[0] + sh(B)[0]) / 2 + 22, (B[1] + sh(B)[1]) / 2 + 10, "start")}
        </>
      );
      break;
    }
    case "cylinder":
    case "cone": {
      const cx = 150, top = 35, base = 165, rx = 70, ry = 18;
      body = (
        <>
          {figure.shape === "cylinder" ? (
            <>
              <path d={`M ${cx - rx} ${top} L ${cx - rx} ${base} A ${rx} ${ry} 0 0 0 ${cx + rx} ${base} L ${cx + rx} ${top}`} className={edge} strokeWidth={2} />
              <ellipse cx={cx} cy={top} rx={rx} ry={ry} className={edge} strokeWidth={2} />
            </>
          ) : (
            <path d={`M ${cx - rx} ${base} L ${cx} ${top} L ${cx + rx} ${base} A ${rx} ${ry} 0 0 1 ${cx - rx} ${base}`} className={edge} strokeWidth={2} />
          )}
          <path d={`M ${cx - rx} ${base} A ${rx} ${ry} 0 0 1 ${cx + rx} ${base}`} className={`fill-none ${hidden}`} strokeDasharray="4 4" />
          <line x1={cx} y1={base} x2={cx + rx} y2={base} className="stroke-rose-300" strokeWidth={2} />
          <line x1={cx} y1={base} x2={cx} y2={top} className="stroke-slate-300" strokeDasharray="5 4" />
          {L(figure.radius, cx + rx / 2, base + 30)}
          {L(figure.height, cx - 8, (top + base) / 2, "end")}
          {figure.shape === "cone" && L(figure.slant, cx + rx / 2 + 14, (top + base) / 2, "start")}
        </>
      );
      break;
    }
    case "pyramid": {
      const A: P = [50, 170], B: P = [190, 170], Cc: P = [250, 125], D: P = [110, 125], T: P = [150, 25];
      const foot: P = [150, 147];
      body = (
        <>
          <polyline points={pts([A, D, Cc])} className={`fill-none ${hidden}`} strokeDasharray="4 4" />
          <line x1={D[0]} y1={D[1]} x2={T[0]} y2={T[1]} className={hidden} strokeDasharray="4 4" />
          <polygon points={pts([A, B, T])} className={edge} strokeWidth={2} />
          <polygon points={pts([B, Cc, T])} className={edge} strokeWidth={2} />
          <line x1={T[0]} y1={T[1]} x2={foot[0]} y2={foot[1]} className="stroke-slate-300" strokeDasharray="5 4" />
          {L(figure.length ?? figure.width, (A[0] + B[0]) / 2, A[1] + 18)}
          {figure.length && figure.width && L(figure.width, (B[0] + Cc[0]) / 2 + 14, (B[1] + Cc[1]) / 2 + 12, "start")}
          {L(figure.height, foot[0] + 8, (T[1] + foot[1]) / 2 + 10, "start")}
          {L(figure.slant, (A[0] + T[0]) / 2 - 10, (A[1] + T[1]) / 2, "end")}
        </>
      );
      break;
    }
    case "sphere": {
      body = (
        <>
          <circle cx={150} cy={100} r={78} className={edge} strokeWidth={2} />
          <ellipse cx={150} cy={100} rx={78} ry={20} className={`fill-none ${hidden}`} strokeDasharray="4 4" />
          <line x1={150} y1={100} x2={228} y2={100} className="stroke-rose-300" strokeWidth={2} />
          <circle cx={150} cy={100} r={3} className="fill-slate-100" />
          {L(figure.radius, 189, 92)}
        </>
      );
      break;
    }
  }
  return (
    <Frame figure={figure} viewBox="0 0 300 200">
      <NotToScale />
      {body}
    </Frame>
  );
}

function PlaneFigure({ figure }: { figure: Extract<Figure, { kind: "plane" }> }) {
  const byName = (name: string) => figure.points.find((p) => p.name === name)!;
  const xs = [0, ...figure.points.map((p) => p.x), ...(figure.vectors ?? []).map((v) => (v.from ? byName(v.from).x : 0) + v.dx)];
  const ys = [0, ...figure.points.map((p) => p.y), ...(figure.vectors ?? []).map((v) => (v.from ? byName(v.from).y : 0) + v.dy)];
  const lo = Math.min(-1, ...xs, ...ys) - 1;
  const hi = Math.max(1, ...xs, ...ys) + 1;
  const [x0, x1, y0, y1] = [Math.min(lo, -2), Math.max(hi, 2), Math.min(lo, -2), Math.max(hi, 2)];
  const size = 220;
  const u = size / Math.max(x1 - x0, y1 - y0);
  const X = (x: number) => 20 + (x - x0) * u;
  const Y = (y: number) => 20 + (y1 - y) * u;
  const legs = figure.legs && { a: byName(figure.legs.from), b: byName(figure.legs.to) };
  const step = x1 - x0 > 16 ? 2 : 1;
  return (
    <Frame figure={figure} viewBox={`0 0 ${size + 40} ${size + 40}`}>
      <defs>
        <marker id="figure-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" className="fill-rose-300" />
        </marker>
      </defs>
      {Array.from({ length: x1 - x0 + 1 }, (_, i) => x0 + i).map((x) => (
        <line key={`gx${x}`} x1={X(x)} x2={X(x)} y1={Y(y0)} y2={Y(y1)} className="stroke-slate-800" />
      ))}
      {Array.from({ length: y1 - y0 + 1 }, (_, i) => y0 + i).map((y) => (
        <line key={`gy${y}`} y1={Y(y)} y2={Y(y)} x1={X(x0)} x2={X(x1)} className="stroke-slate-800" />
      ))}
      <line x1={X(x0)} x2={X(x1)} y1={Y(0)} y2={Y(0)} className={figure.axis === "x" ? "stroke-amber-300" : "stroke-slate-400"} strokeWidth={figure.axis === "x" ? 3 : 1.5} />
      <line y1={Y(y0)} y2={Y(y1)} x1={X(0)} x2={X(0)} className={figure.axis === "y" ? "stroke-amber-300" : "stroke-slate-400"} strokeWidth={figure.axis === "y" ? 3 : 1.5} />
      {Array.from({ length: x1 - x0 + 1 }, (_, i) => x0 + i)
        .filter((x) => x !== 0 && x % step === 0)
        .map((x) => (
          <text key={`lx${x}`} x={X(x)} y={Y(0) + 12} textAnchor="middle" className="fill-slate-400 text-[9px]">
            {x < 0 ? `−${-x}` : x}
          </text>
        ))}
      {Array.from({ length: y1 - y0 + 1 }, (_, i) => y0 + i)
        .filter((y) => y !== 0 && y % step === 0)
        .map((y) => (
          <text key={`ly${y}`} x={X(0) - 4} y={Y(y) + 3} textAnchor="end" className="fill-slate-400 text-[9px]">
            {y < 0 ? `−${-y}` : y}
          </text>
        ))}
      <text x={X(x1) - 2} y={Y(0) - 4} textAnchor="end" className="fill-slate-300 text-[10px]">x</text>
      <text x={X(0) + 4} y={Y(y1) + 10} className="fill-slate-300 text-[10px]">y</text>
      {(figure.segments ?? []).map(([a, b]) => (
        <line key={`${a}${b}`} x1={X(byName(a).x)} y1={Y(byName(a).y)} x2={X(byName(b).x)} y2={Y(byName(b).y)} className="stroke-cyan-300" strokeWidth={2} />
      ))}
      {legs && (
        <>
          <polyline
            points={pts([[X(legs.a.x), Y(legs.a.y)], [X(legs.b.x), Y(legs.a.y)], [X(legs.b.x), Y(legs.b.y)]])}
            className="fill-none stroke-amber-300"
            strokeDasharray="5 4"
          />
          <text x={(X(legs.a.x) + X(legs.b.x)) / 2} y={Y(legs.a.y) + (legs.b.y > legs.a.y ? 14 : -6)} textAnchor="middle" className="fill-amber-200 text-[11px] font-bold">
            Δx
          </text>
          <text x={X(legs.b.x) + 6} y={(Y(legs.a.y) + Y(legs.b.y)) / 2} className="fill-amber-200 text-[11px] font-bold">
            Δy
          </text>
        </>
      )}
      {(figure.vectors ?? []).map((v, i) => {
        const p = v.from ? byName(v.from) : { x: 0, y: 0 };
        return (
          <line
            key={i}
            x1={X(p.x)}
            y1={Y(p.y)}
            x2={X(p.x + v.dx)}
            y2={Y(p.y + v.dy)}
            className="stroke-rose-300"
            strokeWidth={2}
            strokeDasharray="6 4"
            markerEnd="url(#figure-arrow)"
          />
        );
      })}
      {figure.points.map((p) => (
        <g key={p.name}>
          <circle cx={X(p.x)} cy={Y(p.y)} r={4.5} className="fill-cyan-300" />
          <text x={X(p.x) + 7} y={Y(p.y) - 7} className="fill-slate-100 text-[12px] font-bold">
            {p.name}
          </text>
        </g>
      ))}
    </Frame>
  );
}

const PALETTE = ["fill-cyan-300", "fill-amber-300", "fill-rose-300", "fill-emerald-300", "fill-violet-300", "fill-sky-300"];

function ChartFigure({ figure }: { figure: Extract<Figure, { kind: "chart" }> }) {
  if (figure.type === "pie") {
    const total = figure.data.reduce((s, d) => s + d.value, 0) || 1;
    const starts = figure.data.map((_, i) => figure.data.slice(0, i).reduce((sum, d) => sum + d.value, 0));
    const C: P = [100, 105], R = 80;
    const at = (t: number): P => [C[0] + R * Math.cos(2 * Math.PI * t - Math.PI / 2), C[1] + R * Math.sin(2 * Math.PI * t - Math.PI / 2)];
    return (
      <Frame figure={figure} viewBox="0 0 320 210" wide>
        {figure.data.map((d, i) => {
          const a = starts[i] / total;
          const b = (starts[i] + d.value) / total;
          const [p, q] = [at(a), at(b)];
          return (
            <path
              key={d.label}
              d={b - a >= 0.9999 ? `M ${C[0]} ${C[1] - R} A ${R} ${R} 0 1 1 ${C[0] - 0.01} ${C[1] - R} Z` : `M ${C[0]} ${C[1]} L ${p[0]} ${p[1]} A ${R} ${R} 0 ${b - a > 0.5 ? 1 : 0} 1 ${q[0]} ${q[1]} Z`}
              className={`${PALETTE[i % PALETTE.length]} stroke-slate-950`}
              strokeWidth={2}
              opacity={0.85}
            />
          );
        })}
        {figure.data.map((d, i) => (
          <g key={`l${d.label}`}>
            <rect x={200} y={30 + i * 24} width={12} height={12} className={PALETTE[i % PALETTE.length]} />
            <text x={218} y={41 + i * 24} className={labelClass(d.text ?? "")}>
              {d.label}
              {d.text ? `: ${d.text}` : ""}
            </text>
          </g>
        ))}
      </Frame>
    );
  }
  if (figure.type === "picto") {
    return (
      <Frame figure={figure} viewBox={`0 0 320 ${50 + figure.data.length * 34}`} wide>
        {figure.title && <text x={10} y={18} className="fill-slate-300 text-[11px]">{figure.title}</text>}
        {figure.data.map((d, row) => (
          <g key={d.label}>
            <text x={10} y={50 + row * 34} className="fill-slate-100 text-[12px] font-bold">{d.label}</text>
            {Array.from({ length: Math.ceil(d.value) }, (_, i) => {
              const part = Math.min(1, d.value - i);
              return (
                <g key={i}>
                  <clipPath id={`picto-${row}-${i}`}>
                    <rect x={80 + i * 26} y={34 + row * 34} width={22 * part} height={22} />
                  </clipPath>
                  <rect x={80 + i * 26} y={34 + row * 34} width={22} height={22} rx={5} className="fill-cyan-300" clipPath={`url(#picto-${row}-${i})`} />
                  <rect x={80 + i * 26} y={34 + row * 34} width={22} height={22} rx={5} className="fill-none stroke-cyan-300/50" />
                </g>
              );
            })}
          </g>
        ))}
        {figure.unit && <text x={10} y={40 + figure.data.length * 34} className="fill-slate-300 text-[11px]">Cada ■ = {figure.unit}</text>}
      </Frame>
    );
  }
  const from = figure.axisFrom ?? 0;
  const max = Math.max(...figure.data.map((d) => d.value), from + 1);
  const top = Math.ceil(max / 10) * 10 || max;
  const H = 140, base = 170;
  const Y = (v: number) => base - ((v - from) / (top - from)) * H;
  const w = Math.min(50, 220 / figure.data.length - 10);
  const ticks = [from, from + (top - from) / 2, top];
  return (
    <Frame figure={figure} viewBox="0 0 320 210" wide>
      {figure.title && <text x={10} y={16} className="fill-slate-300 text-[11px]">{figure.title}</text>}
      <line x1={50} y1={base} x2={300} y2={base} className="stroke-slate-400" />
      <line x1={50} y1={base} x2={50} y2={base - H - 6} className="stroke-slate-400" />
      {ticks.map((t) => (
        <g key={t}>
          <line x1={46} x2={300} y1={Y(t)} y2={Y(t)} className="stroke-slate-800" />
          <text x={44} y={Y(t) + 4} textAnchor="end" className="fill-slate-400 text-[10px]">{t}</text>
        </g>
      ))}
      {figure.data.map((d, i) => {
        const x = 64 + i * (w + 14);
        return (
          <g key={d.label}>
            <rect x={x} y={Y(d.value)} width={w} height={base - Y(d.value)} className={PALETTE[i % PALETTE.length]} opacity={0.85} />
            <text x={x + w / 2} y={base + 14} textAnchor="middle" className="fill-slate-100 text-[11px]">{d.label}</text>
            {d.text && (
              <text x={x + w / 2} y={Y(d.value) - 5} textAnchor="middle" className={labelClass(d.text)}>
                {d.text}
              </text>
            )}
          </g>
        );
      })}
    </Frame>
  );
}

function DotsFigure({ figure }: { figure: Extract<Figure, { kind: "dots" }> }) {
  const lo = Math.min(...figure.data), hi = Math.max(...figure.data);
  const span = hi - lo || 1;
  const step = span > 40 ? 10 : span > 16 ? 5 : span > 8 ? 2 : 1;
  const a = Math.floor(lo / step) * step, b = Math.ceil(hi / step) * step;
  const X = (v: number) => 20 + ((v - a) / (b - a || 1)) * 280;
  const counts = new Map<number, number>();
  return (
    <Frame figure={figure} viewBox="0 0 320 130" wide>
      {figure.label && <text x={10} y={16} className="fill-slate-300 text-[11px]">{figure.label}</text>}
      <line x1={14} x2={306} y1={100} y2={100} className="stroke-slate-400" />
      {Array.from({ length: Math.round((b - a) / step) + 1 }, (_, i) => a + i * step).map((t) => (
        <g key={t}>
          <line x1={X(t)} x2={X(t)} y1={96} y2={104} className="stroke-slate-400" />
          <text x={X(t)} y={118} textAnchor="middle" className="fill-slate-300 text-[10px]">{t}</text>
        </g>
      ))}
      {figure.data.map((v, i) => {
        const n = counts.get(v) ?? 0;
        counts.set(v, n + 1);
        return <circle key={i} cx={X(v)} cy={90 - n * 11} r={4.5} className="fill-cyan-300" />;
      })}
    </Frame>
  );
}

function NumberLineFigure({ figure }: { figure: Extract<Figure, { kind: "number-line" }> }) {
  const X = (v: number) => 20 + ((v - figure.min) / (figure.max - figure.min)) * 280;
  const ticks = Array.from({ length: figure.max - figure.min + 1 }, (_, i) => figure.min + i);
  const every = ticks.length > 21 ? 5 : ticks.length > 11 ? 2 : 1;
  return (
    <Frame figure={figure} viewBox="0 0 320 90" wide>
      <line x1={10} x2={310} y1={50} y2={50} className="stroke-slate-300" strokeWidth={1.5} />
      {ticks.map((t) => (
        <g key={t}>
          <line x1={X(t)} x2={X(t)} y1={t === 0 ? 42 : 45} y2={t === 0 ? 58 : 55} className={t === 0 ? "stroke-slate-100" : "stroke-slate-500"} />
          {t % every === 0 && (
            <text x={X(t)} y={72} textAnchor="middle" className="fill-slate-400 text-[10px]">
              {t < 0 ? `−${-t}` : t}
            </text>
          )}
        </g>
      ))}
      {figure.points.map((p) => (
        <g key={`${p.value}${p.label}`}>
          <circle cx={X(p.value)} cy={50} r={5} className={p.label === "?" ? "fill-amber-300" : "fill-cyan-300"} />
          <text x={X(p.value)} y={34} textAnchor="middle" className={labelClass(p.label)}>
            {p.label}
          </text>
        </g>
      ))}
    </Frame>
  );
}

function FractionBarFigure({ figure }: { figure: Extract<Figure, { kind: "fraction-bar" }> }) {
  const H = 34;
  return (
    <Frame figure={figure} viewBox={`0 0 320 ${20 + figure.bars.length * (H + 22)}`} wide>
      {figure.bars.map((bar, row) => {
        const y = 20 + row * (H + 22);
        const w = 280 / bar.parts;
        return (
          <g key={row}>
            {bar.label && <text x={20} y={y - 4} className="fill-slate-300 text-[11px]">{bar.label}</text>}
            {Array.from({ length: bar.parts }, (_, i) => (
              <rect key={i} x={20 + i * w} y={y} width={w} height={H} className={`${i < bar.shaded ? "fill-cyan-300" : "fill-slate-800"} stroke-slate-950`} strokeWidth={2} />
            ))}
          </g>
        );
      })}
    </Frame>
  );
}

const BAG_FILL: Record<BagColor, string> = {
  rojo: "fill-rose-400",
  azul: "fill-sky-400",
  verde: "fill-emerald-400",
  amarillo: "fill-amber-300",
  negro: "fill-slate-600",
  blanco: "fill-slate-100",
};

function BagFigure({ figure }: { figure: Extract<Figure, { kind: "bag" }> }) {
  const chips = figure.items.flatMap((item) => Array.from({ length: item.count }, () => item.color));
  const perRow = Math.min(8, Math.max(4, Math.ceil(Math.sqrt(chips.length * 2))));
  const rows = Math.ceil(chips.length / perRow);
  return (
    <Frame figure={figure} viewBox={`0 0 320 ${Math.max(120, 50 + rows * 30)}`} wide>
      <path d={`M 30 20 Q 20 ${40 + rows * 30} 60 ${40 + rows * 30} L 260 ${40 + rows * 30} Q 300 ${40 + rows * 30} 290 20`} className="fill-slate-800/60 stroke-slate-500" strokeWidth={2} />
      {chips.map((color, i) => (
        <circle key={i} cx={70 + (i % perRow) * 26} cy={36 + Math.floor(i / perRow) * 30} r={10} className={`${BAG_FILL[color]} stroke-slate-950`} strokeWidth={1.5} />
      ))}
    </Frame>
  );
}

function DiceGridFigure({ figure }: { figure: Extract<Figure, { kind: "dice-grid" }> }) {
  const s = 38;
  return (
    <Frame figure={figure} viewBox="0 0 280 270">
      <text x={40 + 3 * s} y={14} textAnchor="middle" className="fill-slate-300 text-[10px]">segundo dado</text>
      <text x={12} y={40 + 3 * s} transform={`rotate(-90 12 ${40 + 3 * s})`} textAnchor="middle" className="fill-slate-300 text-[10px]">primer dado</text>
      {[1, 2, 3, 4, 5, 6].map((d) => (
        <g key={d}>
          <text x={40 + (d - 0.5) * s} y={32} textAnchor="middle" className="fill-cyan-200 text-[12px] font-bold">{d}</text>
          <text x={30} y={40 + (d - 0.5) * s + 4} textAnchor="middle" className="fill-cyan-200 text-[12px] font-bold">{d}</text>
        </g>
      ))}
      {[1, 2, 3, 4, 5, 6].flatMap((a) =>
        [1, 2, 3, 4, 5, 6].map((b) => (
          <g key={`${a}${b}`}>
            <rect x={40 + (b - 1) * s} y={40 + (a - 1) * s} width={s} height={s} className="fill-slate-900 stroke-slate-700" />
            <text x={40 + (b - 0.5) * s} y={40 + (a - 0.5) * s + 4} textAnchor="middle" className="fill-slate-300 text-[10px]">
              {a},{b}
            </text>
          </g>
        )),
      )}
    </Frame>
  );
}

function TreeFigure({ figure }: { figure: Extract<Figure, { kind: "tree" }> }) {
  const leaves = figure.second.reduce((s, b) => s + b.length, 0);
  const H = Math.max(160, leaves * 34 + 20);
  const root: P = [20, H / 2];
  // Hojas anteriores a cada rama: posición vertical de sus hijos.
  const before = figure.second.map((_, i) => figure.second.slice(0, i).reduce((sum, kids) => sum + kids.length, 0));
  return (
    <Frame figure={figure} viewBox={`0 0 320 ${H}`} wide>
      {figure.first.map((b, i) => {
        const kids = figure.second[i];
        const leaf = before[i];
        const y0 = 10 + (leaf + kids.length / 2) * 34;
        const node: P = [140, y0];
        return (
          <g key={i}>
            <line x1={root[0]} y1={root[1]} x2={node[0]} y2={node[1]} className="stroke-cyan-300" strokeWidth={2} />
            <text x={(root[0] + node[0]) / 2} y={(root[1] + node[1]) / 2 - 6} textAnchor="middle" className={labelClass(b.p)}>{b.p}</text>
            <circle cx={node[0]} cy={node[1]} r={3} className="fill-slate-100" />
            <text x={node[0]} y={node[1] + (node[1] < root[1] ? -10 : 20)} textAnchor="middle" className="fill-slate-100 text-[12px] font-bold">{b.label}</text>
            {kids.map((k, j) => {
              const y = 10 + (leaf + j + 0.5) * 34;
              return (
                <g key={j}>
                  <line x1={node[0]} y1={node[1]} x2={260} y2={y} className="stroke-cyan-300/70" strokeWidth={2} />
                  <text x={node[0] + (260 - node[0]) * 0.62} y={node[1] + (y - node[1]) * 0.62 - 5} textAnchor="middle" className={labelClass(k.p)}>{k.p}</text>
                  <text x={266} y={y + 4} className="fill-slate-100 text-[12px] font-bold">{k.label}</text>
                </g>
              );
            })}
          </g>
        );
      })}
      <circle cx={root[0]} cy={root[1]} r={4} className="fill-slate-100" />
    </Frame>
  );
}

function GraphFigure({ figure }: { figure: Extract<Figure, { kind: "graph" }> }) {
  const [x0, x1] = figure.x, [y0, y1] = figure.y;
  const W = 260, H = 200;
  const X = (x: number) => 20 + ((x - x0) / (x1 - x0)) * W;
  const Y = (y: number) => 10 + ((y1 - y) / (y1 - y0)) * H;
  const f = (x: number) => (figure.fn.type === "linear" ? figure.fn.m * x + figure.fn.b : figure.fn.a * (x - figure.fn.h) ** 2 + figure.fn.k);
  const samples = Array.from({ length: 81 }, (_, i) => x0 + ((x1 - x0) * i) / 80)
    .map((x) => [x, f(x)] as P)
    .filter(([, y]) => y >= y0 - 1 && y <= y1 + 1);
  const xStep = x1 - x0 > 12 ? 2 : 1, yStep = y1 - y0 > 24 ? 5 : y1 - y0 > 12 ? 2 : 1;
  return (
    <Frame figure={figure} viewBox={`0 0 ${W + 40} ${H + 30}`}>
      <clipPath id="graph-clip">
        <rect x={20} y={10} width={W} height={H} />
      </clipPath>
      {Array.from({ length: Math.floor((x1 - x0) / xStep) + 1 }, (_, i) => Math.ceil(x0 / xStep) * xStep + i * xStep).filter((x) => x <= x1).map((x) => (
        <g key={`x${x}`}>
          <line x1={X(x)} x2={X(x)} y1={Y(y0)} y2={Y(y1)} className="stroke-slate-800" />
          {x !== 0 && <text x={X(x)} y={Math.min(Math.max(Y(0) + 12, 22), H + 22)} textAnchor="middle" className="fill-slate-400 text-[9px]">{x < 0 ? `−${-x}` : x}</text>}
        </g>
      ))}
      {Array.from({ length: Math.floor((y1 - y0) / yStep) + 1 }, (_, i) => Math.ceil(y0 / yStep) * yStep + i * yStep).filter((y) => y <= y1).map((y) => (
        <g key={`y${y}`}>
          <line y1={Y(y)} y2={Y(y)} x1={X(x0)} x2={X(x1)} className="stroke-slate-800" />
          {y !== 0 && <text x={Math.max(X(0) - 4, 18)} y={Y(y) + 3} textAnchor="end" className="fill-slate-400 text-[9px]">{y < 0 ? `−${-y}` : y}</text>}
        </g>
      ))}
      {y0 <= 0 && y1 >= 0 && <line x1={X(x0)} x2={X(x1)} y1={Y(0)} y2={Y(0)} className="stroke-slate-400" strokeWidth={1.5} />}
      {x0 <= 0 && x1 >= 0 && <line y1={Y(y0)} y2={Y(y1)} x1={X(0)} x2={X(0)} className="stroke-slate-400" strokeWidth={1.5} />}
      <polyline points={pts(samples.map(([x, y]) => [X(x), Y(y)]))} clipPath="url(#graph-clip)" className="fill-none stroke-cyan-300" strokeWidth={2.5} />
      {figure.label && <text x={W + 14} y={22} textAnchor="end" className="fill-cyan-100 text-[12px] font-bold">{figure.label}</text>}
    </Frame>
  );
}

function TableFigure({ figure }: { figure: Extract<Figure, { kind: "table" }> }) {
  return (
    <div className="overflow-x-auto" data-figure="table">
      <table className="min-w-full max-w-lg border-collapse overflow-hidden rounded-xl bg-slate-950 text-sm tabular-nums">
        {figure.caption && <caption className="pb-2 text-left text-sm text-slate-300">{figure.caption}</caption>}
        <thead>
          <tr>
            {figure.head.map((h, i) => (
              <th key={i} scope="col" className="border border-slate-700 bg-slate-900 px-3 py-2 text-left font-bold text-cyan-100">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {figure.rows.map((row, r) => (
            <tr key={r}>
              {row.map((cell, i) =>
                i === 0 && figure.rowHeads ? (
                  <th key={i} scope="row" className="border border-slate-700 bg-slate-900 px-3 py-2 text-left font-bold text-cyan-100">
                    {cell}
                  </th>
                ) : (
                  <td key={i} className={`border border-slate-700 px-3 py-2 ${cell === "?" ? "font-bold text-amber-200" : "text-slate-100"}`}>
                    {cell}
                  </td>
                ),
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function QuestionFigure({ figure }: { figure: Figure }) {
  switch (figure.kind) {
    case "table":
      return <TableFigure figure={figure} />;
    case "triangle":
      return <TriangleFigure figure={figure} />;
    case "polygon":
      return <PolygonFigure figure={figure} />;
    case "regular":
      return <RegularFigure figure={figure} />;
    case "thales":
      return <ThalesFigure figure={figure} />;
    case "similar":
      return <SimilarFigure figure={figure} />;
    case "parallels":
      return <ParallelsFigure figure={figure} />;
    case "angles":
      return <AnglesFigure figure={figure} />;
    case "circle":
      return <CircleFigure figure={figure} />;
    case "solid":
      return <SolidFigure figure={figure} />;
    case "plane":
      return <PlaneFigure figure={figure} />;
    case "chart":
      return <ChartFigure figure={figure} />;
    case "dots":
      return <DotsFigure figure={figure} />;
    case "number-line":
      return <NumberLineFigure figure={figure} />;
    case "fraction-bar":
      return <FractionBarFigure figure={figure} />;
    case "bag":
      return <BagFigure figure={figure} />;
    case "dice-grid":
      return <DiceGridFigure figure={figure} />;
    case "tree":
      return <TreeFigure figure={figure} />;
    case "graph":
      return <GraphFigure figure={figure} />;
  }
}
