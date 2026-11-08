import type { AdventureDef } from "@/lib/learning/core";

/** El diagrama sigue el plan que el alumno está editando, sin evaluarlo. */
export function AdventureVisual({ adventure, values }: { adventure: AdventureDef; values: string[] }) {
  const numbers = values.map((value) => value.trim() === "" ? NaN : Number(value.replace("−", "-")));
  if (numbers.some((n, i) => !Number.isInteger(n) || n < adventure.inputs[i].min || n > adventure.inputs[i].max))
    return <p className="text-sm text-slate-300">Escribe números enteros dentro de los límites para actualizar el esquema.</p>;
  const [a, b, c] = numbers;
  const models: Record<string, string[]> = {
    "camara-fria": [`Nevera − helados: ${c} − (${a}) = ${c-a} °C`, `Helados respecto al congelador: ${a} − (${b}) = ${a-b} °C`],
    "receta-festival": [`Harina comprada: ${numbers[3]} × 250 = ${numbers[3]*250} g`, `Harina necesaria según tu plan: ${a} g`],
    "ascensor-carga": [`Peso por viaje: 105 + 45 × ${a} = ${105+45*a} kg`, `Cajas transportadas: ${a} × ${b} = ${a*b}`],
    "jardin-baldosas": [`Césped: ${a}² = ${a*a} m²`, `Borde: 4 × ${a} + 4 = ${4*a+4} baldosas`],
    "huerto-escolar": [`Perímetro: 2 × (${a} + ${b}) = ${2*(a+b)} m`, `Área: ${a} × ${b} = ${a*b} m²`],
    "torneo-lanzamientos": [`Suma de los siete: 4 + 4 + 8 + 8 + ${a} + ${b} + ${c} = ${24+a+b+c}`, `Ordenados: ${[4,4,8,8,a,b,c].sort((x,y)=>x-y).join(", ")}`],
    "convoy-suministros": [`Primer vehículo: 0 → 12 → 24 → 36 → 48`, `Segundo vehículo: 0 → 18 → 36 → 54`, `Tu encuentro: minuto ${a} → entrega: minuto ${b}`],
    "mezcla-emergencia": [`3/4 = 9/12   +   2/3 = 8/12`, `Tu total: ${a}/12 L → ${b} equipos de 1/12 L`],
    "mercado-barrio": [`200 soles → descuento del 20 % → descuento del 10 %`, `Tu compra: ${b} × ${a} = ${a*b} soles; presupuesto: 450 soles`],
    "rescate-montana": [`Trabajo total: 8 × 15 = 120 horas-persona`, `Tu equipo: ${a} × ${b} = ${a*b} horas-persona`],
    "feria-energia": [`Generadores: ${a} + ${b} = ${a+b}`, `Producción: 2 × ${a} + 5 × ${b} = ${2*a+5*b} kW`],
    "ruta-dron": [`Extremos: A (0, 0) y B (12, 8) · Estación propuesta: (${a}, ${b})`, `Horizontal: 0 → ${a} → 12   ·   Vertical: 0 → ${b} → 8`],
    "deposito-agua": [`Depósito: 3 m × 2 m × 2 m`, `Tu capacidad: ${a} m³ = ${a*1000} L`, `4.000 L existentes + ${b} L por añadir = ${4000+b} L`],
    "puente-valle": [`Catetos: 6 m y 8 m → diagonal de tu plan: ${a} m`, `Piezas: ${b} × 2 = ${b*2} m`],
    "tombola-solidaria": [`Bolsa: ${a} premiados + ${b} sin premio = ${a+b} boletos`, `Probabilidad: ${a+b ? `${a}/${a+b}` : "sin boletos"}   ·   Coste: ${a} × 4 = ${a*4} soles`],
    "alerta-meteorologica": [`Tu reparto de días lluviosos: 15 con alerta + ${a} sin alerta = ${15+a}; el total real es 20`, `Tu porcentaje: ${b}% de los 20 días lluviosos`],
    "ahorro-observatorio": [`1.000 soles → ${a} soles → ${b} soles`, `Cada flecha representa un año con 10 % de interés`],
    "trayectoria-cohete": [`Altura en t = ${a}: −${a}² + 8 × ${a} = ${-a*a+8*a} m`, `Altura propuesta: ${b} m   ·   Despegue: 0 s   ·   Aterrizaje: 8 s`],
  };
  const diagram = adventure.id === "ruta-dron" ? (
    <svg viewBox="0 0 280 165" role="img" aria-label={`Plano de A a B y estación propuesta en ${a}, ${b}`} className="h-40 w-full">
      <path d="M30 140 H260 M30 140 V15" stroke="#94a3b8" fill="none"/><path d="M30 140 L246 20" stroke="#67e8f9" strokeDasharray="5 4"/><circle cx="30" cy="140" r="5" fill="#fff"/><circle cx="246" cy="20" r="5" fill="#fff"/><circle cx={30+a*18} cy={140-b*15} r="6" fill="#fbbf24"/><text x="32" y="158" fill="white">A (0,0)</text><text x="198" y="14" fill="white">B (12,8)</text><text x={Math.min(30+a*18,190)} y={Math.max(140-b*15-10,14)} fill="#fde68a">Estación</text>
    </svg>
  ) : adventure.id === "puente-valle" ? (
    <svg viewBox="0 0 260 155" role="img" aria-label={`Triángulo con catetos de 6 y 8 metros, valor propuesto para la diagonal: ${a} metros`} className="h-40 w-full"><path d="M35 125 H210 V25 Z" fill="#164e63" stroke="#67e8f9" strokeWidth="3"/><path d="M195 125 V110 H210" fill="none" stroke="white"/><text x="105" y="147" fill="white">8 m</text><text x="216" y="80" fill="white">6 m</text><text x="75" y="67" fill="#fde68a">Tu valor: {a} m</text></svg>
  ) : adventure.id === "mezcla-emergencia" ? (
    <div role="img" aria-label="Tres cuartos son nueve doceavos y dos tercios son ocho doceavos" className="space-y-2">{[9,8].map((count, row) => <div key={count} className="flex items-center gap-2"><span className="w-10 text-sm">{row === 0 ? "3/4" : "2/3"}</span><span className="grid flex-1 grid-cols-12 gap-1">{Array.from({ length: 12 }, (_, i) => <span key={i} className={`h-5 rounded-sm ${i < count ? "bg-cyan-400" : "bg-slate-700"}`} />)}</span><span className="text-xs">{count}/12</span></div>)}</div>
  ) : adventure.id === "tombola-solidaria" ? (
    <div role="img" aria-label={`${a} boletos premiados y ${b} sin premio`} className="grid grid-cols-10 gap-1">{Array.from({ length: a+b }, (_, i) => <span key={i} className={`h-5 rounded-sm ${i < a ? "bg-amber-400" : "bg-slate-500"}`} />)}</div>
  ) : adventure.id === "convoy-suministros" ? (
    <svg viewBox="0 0 280 100" role="img" aria-label="Líneas de tiempo de los vehículos, con salidas cada 12 y 18 minutos" className="h-28 w-full"><path d="M25 30 H260 M25 75 H260" stroke="#94a3b8" strokeWidth="2"/>{[0,12,24,36,48].map(n => <g key={n}><circle cx={25+n*4.2} cy="30" r="4" fill="#67e8f9"/><text x={20+n*4.2} y="20" fill="white" fontSize="11">{n}</text></g>)}{[0,18,36,54].map(n => <g key={n}><circle cx={25+n*4.2} cy="75" r="4" fill="#fbbf24"/><text x={20+n*4.2} y="96" fill="white" fontSize="11">{n}</text></g>)}</svg>
  ) : adventure.id === "deposito-agua" ? (
    <svg viewBox="0 0 240 130" role="img" aria-label="Depósito rectangular con dimensiones 3, 2 y 2 metros" className="h-32 w-full"><path d="M45 35 L80 15 H195 L160 35 Z M160 35 L195 15 V85 L160 105 M45 35 H160 V105 H45 Z" fill="#164e63" stroke="#67e8f9" strokeWidth="2"/><text x="85" y="125" fill="white">3 m</text><text x="25" y="75" fill="white">2 m</text><text x="180" y="105" fill="white">2 m</text></svg>
  ) : adventure.id === "trayectoria-cohete" ? (
    <svg viewBox="0 0 260 150" role="img" aria-label={`Trayectoria parabólica y tiempo propuesto de ${a} segundos`} className="h-40 w-full"><path d="M25 125 H240 M25 125 V15" fill="none" stroke="#94a3b8"/><path d="M25 125 Q125 -75 225 125" fill="none" stroke="#67e8f9" strokeWidth="3"/><circle cx={25+a*25} cy={125-(-a*a+8*a)*6.25} r="5" fill="#fbbf24"/><text x="24" y="145" fill="white">0 s</text><text x="205" y="145" fill="white">8 s</text><text x="30" y="20" fill="white">altura</text></svg>
  ) : null;
  return <figure aria-label="Esquema visual del plan" className="space-y-3 rounded-2xl border border-cyan-400/30 bg-slate-950 p-4">
    <figcaption className="font-bold text-cyan-200">Esquema de tu plan</figcaption>
    {diagram}
    <div className="flex flex-wrap items-center gap-2" aria-label="Valores del plan">
      {adventure.inputs.map((item, i) => <div key={item.id} className="min-w-24 flex-1 rounded-lg border border-cyan-700 bg-cyan-950/40 p-2 text-center"><span className="block text-xs text-slate-300">{item.label}</span><span className="font-mono font-bold text-cyan-100">{numbers[i]}{item.unit ? ` ${item.unit}` : ""}</span></div>)}
    </div>
    <div className="space-y-1 border-t border-slate-700 pt-3 text-sm text-slate-200">{(models[adventure.id] ?? []).map((line) => <p key={line}>{line}</p>)}</div>
    <p className="text-xs text-slate-400">El esquema cambia al editar el plan; los objetivos se comprueban al probarlo.</p>
  </figure>;
}
