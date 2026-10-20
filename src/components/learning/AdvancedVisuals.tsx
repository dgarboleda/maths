"use client";

import { useState } from "react";
import { curve, Handle, num, Plane, Slider, snap, Toggle } from "./GraphVisuals";

const rad = (deg: number) => (deg * Math.PI) / 180;
const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b),
    m = s.length / 2;
  return s.length % 2 ? s[Math.floor(m)] : (s[m - 1] + s[m]) / 2;
};

/** Sistema x + y = s con x − y = d (se cortan) o con x + y = k (paralelas). */
export function SystemVisual({ id }: { id: string }) {
  const [s, setS] = useState(10);
  const [d, setD] = useState(2);
  const [mode, setMode] = useState("corte");
  const [k, setK] = useState(4);
  const cross = mode === "corte";
  const x = (s + d) / 2,
    y = (s - d) / 2;
  return (
    <>
      <Toggle label="Segunda ecuación" value={mode} onChange={setMode}
        options={[["corte", "x − y = d"], ["paralela", "x + y = k"]]} />
      <Slider id={`${id}-s`} label="s en x + y = s" value={s} min={2} max={14} onChange={setS} />
      {cross ? (
        <Slider id={`${id}-d`} label="d en x − y = d" value={d} min={-6} max={6} onChange={setD} />
      ) : (
        <Slider id={`${id}-k`} label="k en x + y = k" value={k} min={2} max={14} onChange={setK} />
      )}
      <p className="font-mono text-lg">
        x + y = {s} · {cross ? `x − y = ${num(d)}` : `x + y = ${k}`}
      </p>
      <Plane x={[-2, 14]} y={[-6, 12]} xStep={2} yStep={2}
        label={cross
          ? `Las rectas x + y = ${s} y x − y = ${num(d)} se cortan en (${num(x)}, ${num(y)}): esa es la solución.`
          : k === s
            ? `Las dos ecuaciones son la misma recta: infinitas soluciones.`
            : `Las rectas x + y = ${s} y x + y = ${k} son paralelas: no se cortan, no hay solución.`}>
        {(sc) => (
          <>
            <path d={curve((t) => s - t, [-2, 14], sc, 2)} className="fill-none stroke-cyan-300" strokeWidth={2.5} />
            <path d={curve((t) => (cross ? t - d : k - t), [-2, 14], sc, 2)} className="fill-none stroke-amber-300" strokeWidth={2.5} strokeDasharray={!cross && k === s ? "6 4" : undefined} />
            {cross && (
              <Handle x={sc.sx(x)} y={sc.sy(y)} className="fill-rose-300"
                onDrag={(px, py) => {
                  const nx = sc.ix(px),
                    ny = sc.iy(py);
                  setS(snap(nx + ny, 2, 14));
                  setD(snap(nx - ny, -6, 6));
                }} />
            )}
          </>
        )}
      </Plane>
      <p className="text-sm">
        {cross
          ? <>Solución: x = ({s} + {num(d)}) ÷ 2 = <strong>{num(x)}</strong>, y = ({s} − {num(d)}) ÷ 2 = <strong>{num(y)}</strong>. Arrastra el punto de corte: las dos ecuaciones cambian para seguir cumpliéndose.</>
          : k === s
            ? "Las dos ecuaciones dicen lo mismo: cualquier punto de la recta es solución."
            : "Las rectas tienen la misma inclinación y nunca se cortan: ningún par cumple las dos ecuaciones."}
      </p>
    </>
  );
}

/** y = a · bⁿ frente a la recta que empieza igual y suma el primer cambio. */
export function ExponentialVisual({ id }: { id: string }) {
  const [a, setA] = useState(10);
  const [b, setB] = useState(1.5);
  const step = a * (b - 1);
  const exp = (n: number) => a * b ** n,
    lin = (n: number) => a + step * n;
  const ns = [0, 1, 2, 3, 4, 5, 6, 7, 8];
  const overtakes = ns.find((n) => n > 1 && exp(n) > lin(n) + 1e-9);
  return (
    <>
      <Slider id={`${id}-a`} label="Valor inicial a" value={a} min={2} max={20} onChange={setA} />
      <Slider id={`${id}-b`} label="Factor de cambio b" value={b} min={0.5} max={2} step={0.1} onChange={setB} />
      <p className="font-mono text-lg">
        y = {a} · {num(b)}ⁿ <span className="text-slate-400">frente a</span> y = {a} {step < 0 ? "−" : "+"} {num(Math.abs(step))} · n
      </p>
      <Plane x={[0, 8]} y={[0, 100]} yStep={20}
        label={`Exponencial con factor ${num(b)} (cian) y lineal que suma ${num(step)} por paso (ámbar). ${b > 1 && overtakes ? `Desde n = ${overtakes} la exponencial queda por encima.` : b < 1 ? "Con factor menor que 1, la exponencial disminuye cada vez menos." : ""}`}>
        {(s) => (
          <>
            <path d={curve(lin, [0, 8], s, 2)} className="fill-none stroke-amber-300" strokeWidth={2} strokeDasharray="5 4" />
            <path d={curve(exp, [0, 8], s)} className="fill-none stroke-cyan-300" strokeWidth={2.5} />
            {ns.map((n) => <circle key={n} cx={s.sx(n)} cy={s.sy(Math.min(exp(n), 1e4))} r={3.5} className="fill-cyan-300" />)}
          </>
        )}
      </Plane>
      <table className="w-full text-left text-sm">
        <caption className="sr-only">Valores de la exponencial y de la lineal</caption>
        <thead><tr><th className="p-2">n</th><th className="p-2">Exponencial</th><th className="p-2">Lineal</th></tr></thead>
        <tbody>
          {[0, 1, 2, 3, 4, 5].map((n) => (
            <tr key={n} className="border-t border-slate-700">
              <td className="p-2">{n}</td>
              <td className="p-2">{num(exp(n))}</td>
              <td className="p-2">{num(lin(n))}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-sm text-slate-300">
        Las dos empiezan en {a} y dan el mismo primer paso. La lineal suma siempre {num(step)}; la exponencial multiplica por {num(b)}, así que
        {b > 1 ? " cada paso es mayor que el anterior." : b < 1 ? " cada paso es menor que el anterior." : " con b = 1 no cambia."}
      </p>
    </>
  );
}

/** Triángulo rectángulo: el ángulo fija las razones; el tamaño no las cambia. */
export function TrigVisual({ id }: { id: string }) {
  const [angle, setAngle] = useState(37);
  const [hyp, setHyp] = useState(10);
  const opp = hyp * Math.sin(rad(angle)),
    adj = hyp * Math.cos(rad(angle));
  const u = 22,
    O = [24, 236] as const,
    B = [O[0] + adj * u, O[1]] as const,
    C = [O[0] + adj * u, O[1] - opp * u] as const;
  return (
    <>
      <Slider id={`${id}-a`} label="Ángulo α (grados)" value={angle} min={10} max={80} onChange={setAngle} />
      <Slider id={`${id}-h`} label="Hipotenusa (tamaño)" value={hyp} min={4} max={10} onChange={setHyp} />
      <svg role="img" viewBox="0 0 280 260" className="w-full max-w-md rounded-xl bg-slate-950"
        aria-label={`Triángulo rectángulo con α = ${angle}°, hipotenusa ${hyp}, opuesto ${num(opp)} y adyacente ${num(adj)}. sen α ≈ ${num(Math.sin(rad(angle)))}.`}>
        <polygon points={[O, B, C].map((p) => p.join(",")).join(" ")} className="fill-cyan-300/15 stroke-slate-200" strokeWidth={2} />
        <line x1={B[0]} y1={B[1]} x2={C[0]} y2={C[1]} className="stroke-rose-300" strokeWidth={4} />
        <line x1={O[0]} y1={O[1]} x2={B[0]} y2={B[1]} className="stroke-amber-300" strokeWidth={4} />
        <path d={`M${B[0] - 12},${B[1]} v-12 h12`} className="fill-none stroke-slate-400" />
        <path d={`M${O[0] + 30},${O[1]} A30,30 0 0 0 ${O[0] + 30 * Math.cos(rad(angle))},${O[1] - 30 * Math.sin(rad(angle))}`} className="fill-none stroke-cyan-300" strokeWidth={2} />
        <text x={O[0] + 38} y={O[1] - 8} className="fill-cyan-200 text-[11px] font-bold">α</text>
        {/* Si el triángulo es ancho, la etiqueta va por dentro para no salirse. */}
        <text x={B[0] > 190 ? B[0] - 6 : B[0] + 6} y={(B[1] + C[1]) / 2} textAnchor={B[0] > 190 ? "end" : "start"} className="fill-rose-200 text-[11px]">opuesto {num(opp)}</text>
        <text x={(O[0] + B[0]) / 2} y={O[1] + 16} textAnchor="middle" className="fill-amber-200 text-[11px]">adyacente {num(adj)}</text>
        <Handle x={C[0]} y={C[1]} className="fill-cyan-300"
          onDrag={(px, py) => {
            const deg = (Math.atan2(O[1] - py, px - O[0]) * 180) / Math.PI;
            setAngle(snap(deg, 10, 80));
          }} />
      </svg>
      <p className="font-mono text-sm">
        sen α = {num(opp)} ÷ {hyp} = <strong>{num(Math.sin(rad(angle)))}</strong> · cos α = {num(adj)} ÷ {hyp} = <strong>{num(Math.cos(rad(angle)))}</strong> · tan α = <strong>{num(Math.tan(rad(angle)))}</strong>
      </p>
      <p className="text-sm text-slate-300">
        Cambia el tamaño: los lados crecen, pero los cocientes no cambian. Mueve el vértice para cambiar el ángulo: ahí sí cambian. Con α = 37° el triángulo es casi un 3-4-5.
      </p>
    </>
  );
}

/** Puntos y diagrama de caja: el dato extremo mueve el rango, no el RIC. */
export function BoxplotVisual({ id }: { id: string }) {
  const [extreme, setExtreme] = useState(20);
  const data = [4, 7, 8, 10, 12, 13, 15, extreme].sort((a, b) => a - b);
  const q1 = median(data.slice(0, 4)),
    q3 = median(data.slice(4)),
    med = median(data),
    lo = 0,
    hi = 40;
  const sx = (v: number) => 16 + ((v - lo) / (hi - lo)) * 288;
  const outlier = extreme > q3 + 1.5 * (q3 - q1);
  return (
    <>
      <Slider id={`${id}-x`} label="Dato extremo" value={extreme} min={0} max={40} onChange={setExtreme} />
      <svg role="img" viewBox="0 0 320 130" className="w-full max-w-md rounded-xl bg-slate-950"
        aria-label={`Datos ${data.join(", ")}. Q1 = ${num(q1)}, mediana ${num(med)}, Q3 = ${num(q3)}. Rango ${data[7] - data[0]}, RIC ${num(q3 - q1)}.`}>
        {data.map((v, i) => (
          <circle key={i} cx={sx(v)} cy={30 - 8 * data.slice(0, i).filter((w) => w === v).length} r={5}
            className={v === extreme && outlier ? "fill-rose-300" : "fill-cyan-300"} />
        ))}
        <line x1={sx(data[0])} x2={sx(q1)} y1={80} y2={80} className="stroke-slate-300" strokeWidth={2} />
        <line x1={sx(q3)} x2={sx(data[7])} y1={80} y2={80} className="stroke-slate-300" strokeWidth={2} />
        <rect x={sx(q1)} y={64} width={Math.max(1, sx(q3) - sx(q1))} height={32} className="fill-amber-300/25 stroke-amber-300" strokeWidth={2} />
        <line x1={sx(med)} x2={sx(med)} y1={64} y2={96} className="stroke-white" strokeWidth={3} />
        {[0, 10, 20, 30, 40].map((t) => (
          <text key={t} x={sx(t)} y={122} textAnchor="middle" className="fill-slate-400 text-[11px]">{t}</text>
        ))}
        <Handle x={sx(extreme)} y={30} r={3} className="fill-transparent"
          onDrag={(px) => setExtreme(snap(((px - 16) / 288) * (hi - lo) + lo, 0, 40))} />
      </svg>
      <p className="font-mono text-sm">
        Q1 = {num(q1)} · mediana = {num(med)} · Q3 = {num(q3)} · RIC = <strong>{num(q3 - q1)}</strong> · rango = <strong>{data[7] - data[0]}</strong>
      </p>
      <p className="text-sm text-slate-300">
        Arrastra el punto extremo o usa el control. El rango cambia con cada movimiento; la caja (el 50% central) apenas se mueve.
        {outlier ? " Ahora el dato supera Q3 + 1,5 · RIC: es atípico." : ""}
      </p>
    </>
  );
}

/** Principio multiplicativo y parejas con y sin orden. */
export function CountingVisual({ id }: { id: string }) {
  const [a, setA] = useState(3);
  const [b, setB] = useState(2);
  const [n, setN] = useState(5);
  const [ordered, setOrdered] = useState("sin");
  const names = "ABCDEFGH".slice(0, n).split("");
  const pairs = ordered === "con" ? n * (n - 1) : (n * (n - 1)) / 2;
  return (
    <>
      <Slider id={`${id}-a`} label="Polos" value={a} min={1} max={5} onChange={setA} />
      <Slider id={`${id}-b`} label="Pantalones" value={b} min={1} max={4} onChange={setB} />
      <div role="img" aria-label={`Cuadrícula de ${a} polos por ${b} pantalones: ${a * b} atuendos.`}
        className="grid w-fit gap-1" style={{ gridTemplateColumns: `repeat(${a}, 2.5rem)` }}>
        {Array.from({ length: a * b }, (_, i) => (
          <span key={i} aria-hidden="true" className="grid h-10 place-items-center rounded-lg bg-cyan-900 font-mono text-xs text-cyan-100">
            P{(i % a) + 1}·N{Math.floor(i / a) + 1}
          </span>
        ))}
      </div>
      <p className="font-mono text-sm">{a} polos · {b} pantalones = <strong>{a * b} atuendos</strong> (cada polo con cada pantalón)</p>
      <Slider id={`${id}-n`} label="Personas para elegir 2" value={n} min={3} max={8} onChange={setN} />
      <Toggle label="¿Importa el orden?" value={ordered} onChange={setOrdered}
        options={[["sin", "Sin orden (delegados)"], ["con", "Con orden (presidente y secretario)"]]} />
      <div role="img" aria-label={`Tabla de ${n} por ${n}: ${pairs} elecciones ${ordered === "con" ? "con orden" : "sin orden"}.`}
        className="grid w-fit gap-px rounded bg-slate-700 p-px" style={{ gridTemplateColumns: `repeat(${n}, 1.75rem)` }}>
        {names.flatMap((r, i) => names.map((c, j) => {
          const counted = i !== j && (ordered === "con" || i < j);
          return (
            <span key={`${r}${c}`} aria-hidden="true"
              className={`grid size-7 place-items-center text-[10px] ${i === j ? "bg-slate-900 text-slate-400" : counted ? "bg-amber-300 font-bold text-slate-950" : "bg-slate-800 text-slate-400"}`}>
              {r}{c}
            </span>
          );
        }))}
      </div>
      <p className="font-mono text-sm">
        {ordered === "con"
          ? <>{n} · {n - 1} = <strong>{pairs}</strong>: AB y BA cuentan por separado.</>
          : <>{n} · {n - 1} ÷ 2 = <strong>{pairs}</strong>: AB y BA son la misma pareja.</>}
      </p>
    </>
  );
}

/** Triángulo en la cuadrícula: traslación, reflexión o rotación. */
export function TransformVisual({ id }: { id: string }) {
  const [kind, setKind] = useState("traslacion");
  const [a, setA] = useState(3);
  const [b, setB] = useState(-2);
  const [axis, setAxis] = useState("y");
  const [turn, setTurn] = useState("90");
  const base: [number, number][] = [[1, 1], [4, 1], [1, 3]];
  const map = ([x, y]: [number, number]): [number, number] =>
    kind === "traslacion"
      ? [x + a, y + b]
      : kind === "reflexion"
        ? axis === "y" ? [-x, y] : [x, -y]
        : turn === "90" ? [-y, x] : [-x, -y];
  const image = base.map(map);
  const rule =
    kind === "traslacion"
      ? `(x, y) → (x ${a < 0 ? "−" : "+"} ${Math.abs(a)}, y ${b < 0 ? "−" : "+"} ${Math.abs(b)})`
      : kind === "reflexion"
        ? axis === "y" ? "(x, y) → (−x, y)" : "(x, y) → (x, −y)"
        : turn === "90" ? "(x, y) → (−y, x)" : "(x, y) → (−x, −y)";
  const fmtP = ([x, y]: [number, number]) => `(${num(x)}, ${num(y)})`;
  return (
    <>
      <Toggle label="Transformación" value={kind} onChange={setKind}
        options={[["traslacion", "Traslación"], ["reflexion", "Reflexión"], ["rotacion", "Rotación"]]} />
      {kind === "traslacion" && (
        <>
          <Slider id={`${id}-a`} label="Vector: a (horizontal)" value={a} min={-5} max={4} onChange={setA} />
          <Slider id={`${id}-b`} label="Vector: b (vertical)" value={b} min={-5} max={4} onChange={setB} />
        </>
      )}
      {kind === "reflexion" && (
        <Toggle label="Eje de reflexión" value={axis} onChange={setAxis} options={[["y", "Eje y"], ["x", "Eje x"]]} />
      )}
      {kind === "rotacion" && (
        <Toggle label="Giro alrededor del origen" value={turn} onChange={setTurn} options={[["90", "90° antihorario"], ["180", "180°"]]} />
      )}
      <p className="font-mono text-lg">{rule}</p>
      <Plane x={[-8, 8]} y={[-8, 8]} xStep={2} yStep={2}
        label={`Triángulo ${base.map(fmtP).join(", ")} y su imagen ${image.map(fmtP).join(", ")} por ${rule}. Las longitudes y los ángulos se conservan.`}>
        {(s) => (
          <>
            <polygon points={base.map(([x, y]) => `${s.sx(x)},${s.sy(y)}`).join(" ")} className="fill-cyan-300/30 stroke-cyan-300" strokeWidth={2} />
            <polygon points={image.map(([x, y]) => `${s.sx(x)},${s.sy(y)}`).join(" ")} className="fill-amber-300/30 stroke-amber-300" strokeWidth={2} />
            {kind === "traslacion" && (
              <Handle x={s.sx(image[0][0])} y={s.sy(image[0][1])}
                onDrag={(px, py) => {
                  setA(snap(s.ix(px) - 1, -5, 4));
                  setB(snap(s.iy(py) - 1, -5, 4));
                }} />
            )}
          </>
        )}
      </Plane>
      <table className="w-full text-left text-sm">
        <caption className="sr-only">Coordenadas antes y después</caption>
        <thead><tr><th className="p-2">Vértice</th><th className="p-2">Original</th><th className="p-2">Imagen</th></tr></thead>
        <tbody>
          {base.map((p, i) => (
            <tr key={i} className="border-t border-slate-700">
              <th scope="row" className="p-2">{"ABC"[i]}</th>
              <td className="p-2">{fmtP(p)}</td>
              <td className="p-2">{fmtP(image[i])}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-sm text-slate-300">
        La figura cian es la original y la ámbar, su imagen. {kind === "traslacion" ? "Arrastra el vértice A′ para cambiar el vector." : "Compara los signos de cada coordenada con la regla."} El tamaño y los ángulos no cambian.
      </p>
    </>
  );
}

/** Mismo capital y tasa: interés simple (suma lo mismo) frente a compuesto
 *  (multiplica por el mismo factor). */
export function InterestVisual({ id }: { id: string }) {
  const [capital, setCapital] = useState(1000);
  const [rate, setRate] = useState(10);
  const [years, setYears] = useState(10);
  const simple = (t: number) => capital * (1 + (rate * t) / 100),
    compound = (t: number) => capital * (1 + rate / 100) ** t;
  const top = Math.max(compound(years), simple(years)) * 1.1;
  const gap = compound(years) - simple(years);
  return (
    <>
      <Slider id={`${id}-c`} label="Capital (soles)" value={capital} min={500} max={5000} step={500} onChange={setCapital} />
      <Slider id={`${id}-r`} label="Tasa anual (%)" value={rate} min={1} max={25} onChange={setRate} />
      <Slider id={`${id}-t`} label="Años" value={years} min={1} max={20} onChange={setYears} />
      <p className="font-mono text-sm">
        Simple: {num(capital)} · (1 + {rate} · {years} ÷ 100) = {num(simple(years))}
        <br />
        Compuesto: {num(capital)} · {num(1 + rate / 100)}<sup>{years}</sup> = {num(compound(years))}
      </p>
      <Plane x={[0, years]} y={[0, top]} xStep={years > 10 ? 2 : 1} yStep={Math.max(500, Math.ceil(top / 5 / 500) * 500)}
        label={`Monto con interés simple (ámbar, recta) y compuesto (cian, curva) durante ${years} años al ${rate}%: al final el compuesto da ${num(gap)} soles más.`}>
        {(s) => (
          <>
            <path d={curve(simple, [0, years], s, 2)} className="fill-none stroke-amber-300" strokeWidth={2} strokeDasharray="5 4" />
            <path d={curve(compound, [0, years], s)} className="fill-none stroke-cyan-300" strokeWidth={2.5} />
            <Handle x={s.sx(years)} y={s.sy(compound(years))} className="fill-cyan-300"
              onDrag={(px) => setYears(snap(s.ix(px), 1, 20))} />
          </>
        )}
      </Plane>
      <p className="text-sm text-slate-300">
        Diferencia al final: <strong>{num(gap)} soles</strong>. El simple gana {num((capital * rate) / 100)} cada año; el compuesto gana
        cada año un poco más, porque el {rate}% se aplica a un monto que ya incluye intereses.
      </p>
    </>
  );
}

/** Progresión aritmética (suma d) o geométrica (multiplica por r). */
export function SequenceVisual({ id }: { id: string }) {
  const [mode, setMode] = useState("aritmetica");
  const [first, setFirst] = useState(2);
  const [d, setD] = useState(3);
  const [r, setR] = useState(2);
  const arith = mode === "aritmetica";
  const term = (n: number) => (arith ? first + (n - 1) * d : first * r ** (n - 1));
  const ns = [1, 2, 3, 4, 5, 6, 7, 8];
  const values = ns.map(term);
  const lo = Math.min(0, ...values),
    hi = Math.max(1, ...values) * 1.1;
  return (
    <>
      <Toggle label="Tipo de progresión" value={mode} onChange={setMode}
        options={[["aritmetica", "Aritmética (+ d)"], ["geometrica", "Geométrica (× r)"]]} />
      <Slider id={`${id}-a`} label="Primer término a₁" value={first} min={1} max={10} onChange={setFirst} />
      {arith ? (
        <Slider id={`${id}-d`} label="Diferencia d" value={d} min={-4} max={8} onChange={setD} />
      ) : (
        <Slider id={`${id}-r`} label="Razón r" value={r} min={0.5} max={3} step={0.5} onChange={setR} />
      )}
      <p className="font-mono text-lg">
        {arith ? `aₙ = ${first} + (n − 1) · ${num(d)}` : `aₙ = ${first} · ${num(r)}ⁿ⁻¹`}
      </p>
      <Plane x={[0, 9]} y={[lo, hi]} yStep={Math.max(1, Math.ceil((hi - lo) / 6))}
        label={`Primeros 8 términos: ${values.map(num).join(", ")}. ${arith ? "Los puntos quedan alineados: crece lo mismo en cada paso." : "Los saltos cambian de tamaño: cada término es " + num(r) + " veces el anterior."}`}>
        {(s) => (
          <>
            {ns.map((n) => <circle key={n} cx={s.sx(n)} cy={s.sy(term(n))} r={4} className="fill-cyan-300" />)}
            <Handle x={s.sx(2)} y={s.sy(term(2))} className="fill-amber-300"
              onDrag={(_, py) => {
                const v = s.iy(py);
                if (arith) setD(snap(v - first, -4, 8));
                else setR(snap(v / first, 0.5, 3, 0.5));
              }} />
          </>
        )}
      </Plane>
      <p className="text-sm text-slate-300">
        {arith
          ? `Suma de los 8 términos: 8 · (${first} + ${num(term(8))}) ÷ 2 = ${num((8 * (first + term(8))) / 2)}. Arrastra el segundo punto para cambiar la diferencia.`
          : `De un término al siguiente se multiplica por ${num(r)}: ${r > 1 ? "los saltos crecen" : r < 1 ? "los saltos se achican" : "no cambia"}. Arrastra el segundo punto para cambiar la razón.`}
      </p>
    </>
  );
}

/** Dos puntos: catetos Δx y Δy, distancia (hipotenusa) y punto medio. */
export function DistanceVisual({ id }: { id: string }) {
  const [ax, setAx] = useState(-3);
  const [ay, setAy] = useState(-2);
  const [bx, setBx] = useState(3);
  const [by, setBy] = useState(6);
  const dx = bx - ax,
    dy = by - ay,
    dist = Math.hypot(dx, dy),
    mx = (ax + bx) / 2,
    my = (ay + by) / 2;
  return (
    <>
      <div className="grid gap-2 sm:grid-cols-2">
        <div>
          <Slider id={`${id}-ax`} label="A: x" value={ax} min={-6} max={6} onChange={setAx} />
          <Slider id={`${id}-ay`} label="A: y" value={ay} min={-6} max={8} onChange={setAy} />
        </div>
        <div>
          <Slider id={`${id}-bx`} label="B: x" value={bx} min={-6} max={6} onChange={setBx} />
          <Slider id={`${id}-by`} label="B: y" value={by} min={-6} max={8} onChange={setBy} />
        </div>
      </div>
      <p className="font-mono text-sm">
        Δx = {num(dx)} · Δy = {num(dy)} · d = √({num(dx * dx)} + {num(dy * dy)}) {Number.isInteger(dist) ? "=" : "≈"} {num(dist)}
        <br />M = ({num(mx)}, {num(my)})
      </p>
      <Plane x={[-6, 6]} y={[-6, 8]} xStep={2} yStep={2}
        label={`A(${num(ax)}, ${num(ay)}) y B(${num(bx)}, ${num(by)}): catetos ${num(Math.abs(dx))} y ${num(Math.abs(dy))}, distancia ${num(dist)}, punto medio (${num(mx)}, ${num(my)}).`}>
        {(s) => (
          <>
            <path d={`M${s.sx(ax)},${s.sy(ay)} L${s.sx(bx)},${s.sy(ay)} L${s.sx(bx)},${s.sy(by)}`} className="fill-none stroke-amber-300" strokeWidth={2} strokeDasharray="5 4" />
            <line x1={s.sx(ax)} y1={s.sy(ay)} x2={s.sx(bx)} y2={s.sy(by)} className="stroke-cyan-300" strokeWidth={2.5} />
            <circle cx={s.sx(mx)} cy={s.sy(my)} r={5} className="fill-rose-300" />
            <Handle x={s.sx(ax)} y={s.sy(ay)} className="fill-emerald-300"
              onDrag={(px, py) => { setAx(snap(s.ix(px), -6, 6)); setAy(snap(s.iy(py), -6, 8)); }} />
            <Handle x={s.sx(bx)} y={s.sy(by)} className="fill-amber-300"
              onDrag={(px, py) => { setBx(snap(s.ix(px), -6, 6)); setBy(snap(s.iy(py), -6, 8)); }} />
          </>
        )}
      </Plane>
      <p className="text-sm text-slate-300">
        Los tramos ámbar son los catetos; el segmento cian es la hipotenusa: siempre más corto que |Δx| + |Δy| = {num(Math.abs(dx) + Math.abs(dy))},
        salvo que los puntos estén en la misma fila o columna. El punto rosa promedia las coordenadas.
      </p>
    </>
  );
}

/** y = a(x − h)² + k: el vértice se arrastra y a decide si es máximo o mínimo. */
export function VertexVisual({ id }: { id: string }) {
  const [a, setA] = useState(1);
  const [h, setH] = useState(2);
  const [k, setK] = useState(-3);
  const f = (x: number) => a * (x - h) ** 2 + k;
  const kind = a > 0 ? "mínimo" : a < 0 ? "máximo" : null;
  const form = `y = ${a === 1 ? "" : a === -1 ? "−" : num(a)}(x ${h < 0 ? "+" : "−"} ${num(Math.abs(h))})² ${k < 0 ? "−" : "+"} ${num(Math.abs(k))}`;
  return (
    <>
      <Slider id={`${id}-a`} label="Coeficiente a" value={a} min={-2} max={2} step={0.5} onChange={setA} />
      <Slider id={`${id}-h`} label="h (corrimiento horizontal)" value={h} min={-4} max={4} onChange={setH} />
      <Slider id={`${id}-k`} label="k (corrimiento vertical)" value={k} min={-6} max={6} onChange={setK} />
      <p className="font-mono text-lg">{a === 0 ? `y = ${num(k)}` : form}</p>
      <Plane x={[-6, 6]} y={[-8, 8]} xStep={2} yStep={2}
        label={a === 0
          ? `Con a = 0 no hay parábola: es la recta horizontal y = ${num(k)}.`
          : `Parábola ${form}, abre hacia ${a > 0 ? "arriba" : "abajo"} con vértice (${num(h)}, ${num(k)}): es un ${kind}, y = ${num(k)}.`}>
        {(s) => (
          <>
            <line x1={s.sx(h)} x2={s.sx(h)} y1={s.sy(-8)} y2={s.sy(8)} className="stroke-slate-600" strokeDasharray="3 3" />
            <path d={curve(f, [-6, 6], s)} className="fill-none stroke-cyan-300" strokeWidth={2.5} />
            <Handle x={s.sx(h)} y={s.sy(k)} className="fill-rose-300"
              onDrag={(px, py) => { setH(snap(s.ix(px), -4, 4)); setK(snap(s.iy(py), -6, 6)); }} />
          </>
        )}
      </Plane>
      <p className="text-sm text-slate-300">
        {a === 0
          ? "Sin el término al cuadrado, la función no cambia con x."
          : `El vértice (${num(h)}, ${num(k)}) es el ${kind}: (x − ${num(h)})² vale 0 en x = ${num(h)} y es positivo en el resto, así que y ${a > 0 ? "solo puede crecer" : "solo puede bajar"} desde ${num(k)}. Cuanto mayor es |a|, más estrecha es la parábola.`}
      </p>
    </>
  );
}

/** Cilindro, cono y esfera del mismo radio: el cono es 1/3 del cilindro. */
export function SolidsVisual({ id }: { id: string }) {
  const [r, setR] = useState(3);
  const [h, setH] = useState(6);
  const PI = 3.14;
  const cylinder = PI * r * r * h,
    cone = cylinder / 3,
    sphere = (4 * PI * r ** 3) / 3;
  const max = Math.max(cylinder, sphere);
  const bars: [string, number, string][] = [
    ["Cilindro π·r²·h", cylinder, "fill-amber-300"],
    ["Cono π·r²·h ÷ 3", cone, "fill-cyan-300"],
    ["Esfera 4·π·r³ ÷ 3", sphere, "fill-rose-300"],
  ];
  const scale = 44 / 8;
  return (
    <>
      <Slider id={`${id}-r`} label="Radio r (cm)" value={r} min={1} max={8} onChange={setR} />
      <Slider id={`${id}-h`} label="Altura h del cilindro y del cono (cm)" value={h} min={1} max={16} onChange={setH} />
      <svg role="img" viewBox="0 0 320 150" className="w-full max-w-md rounded-xl bg-slate-950"
        aria-label={`Radio ${r} cm y altura ${h} cm: cilindro ${num(cylinder)} cm³, cono ${num(cone)} cm³ (un tercio), esfera ${num(sphere)} cm³.`}>
        {(() => {
          const rw = r * scale,
            hh = Math.min(110, h * 6.5);
          return (
            <>
              <rect x={60 - rw} y={130 - hh} width={2 * rw} height={hh} className="fill-amber-300/30 stroke-amber-300" />
              <ellipse cx={60} cy={130 - hh} rx={rw} ry={5} className="fill-amber-300/40 stroke-amber-300" />
              <path d={`M${160 - rw},130 L160,${130 - hh} L${160 + rw},130 Z`} className="fill-cyan-300/30 stroke-cyan-300" />
              <ellipse cx={160} cy={130} rx={rw} ry={5} className="fill-none stroke-cyan-300" />
              <circle cx={262} cy={130 - rw} r={rw} className="fill-rose-300/30 stroke-rose-300" />
              <ellipse cx={262} cy={130 - rw} rx={rw} ry={4} className="fill-none stroke-rose-300" strokeDasharray="3 3" />
            </>
          );
        })()}
      </svg>
      <div className="space-y-2" aria-hidden="true">
        {bars.map(([label, value, color]) => (
          <div key={label} className="flex items-center gap-2 text-xs">
            <span className="w-32 shrink-0 text-slate-300">{label}</span>
            <svg viewBox="0 0 200 12" className="h-3 w-full max-w-xs"><rect width={(value / max) * 200} height={12} rx={3} className={color} /></svg>
          </div>
        ))}
      </div>
      <p className="font-mono text-sm">
        Cilindro: {num(cylinder)} cm³ · Cono: {num(cone)} cm³ · Esfera: {num(sphere)} cm³
      </p>
      <p className="text-sm text-slate-300">
        Con la misma base y altura, tres conos llenan el cilindro. Duplica el radio y observa: el cono y el cilindro se multiplican por 4 (r²), la esfera por 8 (r³).
        {h === 2 * r && " Ahora h = 2r: la esfera ocupa exactamente 2/3 del cilindro que la envuelve."}
      </p>
    </>
  );
}

/** Tabla de doble entrada: probabilidades condicionadas en cada sentido. */
export function TwoWayVisual({ id }: { id: string }) {
  const [f4, setF4] = useState(12);
  const [v4, setV4] = useState(8);
  const [f5, setF5] = useState(6);
  const [v5, setV5] = useState(14);
  const total = f4 + v4 + f5 + v5;
  const frac = (a: number, b: number) => (b ? `${a}/${b} = ${num(a / b)}` : "sin casos");
  const pV = total ? (v4 + v5) / total : 0,
    pV5 = f5 + v5 ? v5 / (f5 + v5) : 0;
  const independent = total > 0 && f5 + v5 > 0 && Math.abs(pV - pV5) < 1e-9;
  return (
    <>
      <div className="grid gap-2 sm:grid-cols-2">
        <div>
          <Slider id={`${id}-f4`} label="4.° · fútbol" value={f4} min={0} max={20} onChange={setF4} />
          <Slider id={`${id}-v4`} label="4.° · vóley" value={v4} min={0} max={20} onChange={setV4} />
        </div>
        <div>
          <Slider id={`${id}-f5`} label="5.° · fútbol" value={f5} min={0} max={20} onChange={setF5} />
          <Slider id={`${id}-v5`} label="5.° · vóley" value={v5} min={0} max={20} onChange={setV5} />
        </div>
      </div>
      <table className="w-full max-w-md text-left text-sm">
        <caption className="sr-only">Estudiantes por grado y deporte preferido</caption>
        <thead>
          <tr className="border-b border-slate-600"><th className="p-2" scope="col">Grado</th><th className="p-2" scope="col">Fútbol</th><th className="p-2" scope="col">Vóley</th><th className="p-2" scope="col">Total</th></tr>
        </thead>
        <tbody>
          <tr className="border-b border-slate-800"><th className="p-2" scope="row">4.°</th><td className="p-2">{f4}</td><td className="p-2">{v4}</td><td className="p-2">{f4 + v4}</td></tr>
          <tr className="border-b border-slate-800"><th className="p-2" scope="row">5.°</th><td className="p-2">{f5}</td><td className="bg-cyan-950/60 p-2 font-bold text-cyan-200">{v5}</td><td className="bg-amber-950/40 p-2">{f5 + v5}</td></tr>
          <tr><th className="p-2" scope="row">Total</th><td className="p-2">{f4 + f5}</td><td className="bg-rose-950/40 p-2">{v4 + v5}</td><td className="p-2">{total}</td></tr>
        </tbody>
      </table>
      <p className="font-mono text-sm">
        P(vóley | 5.°) = {frac(v5, f5 + v5)}
        <br />P(5.° | vóley) = {frac(v5, v4 + v5)}
        <br />P(vóley) = {frac(v4 + v5, total)}
      </p>
      <p className="text-sm text-slate-300">
        El numerador es el mismo ({v5}, celda cian); cambia el grupo: los de 5.° (ámbar) o los de vóley (rosa).
        {independent
          ? " Ahora P(vóley | 5.°) = P(vóley): el grado no cambia la preferencia (independientes)."
          : " Prueba a que P(vóley | 5.°) sea igual a P(vóley): entonces grado y deporte serían independientes."}
      </p>
    </>
  );
}
