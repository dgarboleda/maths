import type { LevelZone } from "@/lib/level/schema";
import type { Selection } from "../editorReducer";

/**
 * Pinta las zonas de interacción/disparo (§7, docs/level-editor-plan.md) —
 * poligonales o circulares, según `LevelZoneShape`. Solo lectura: el clic
 * para seleccionar/dibujar vive en `PolygonEditor.tsx` (mismo criterio que
 * `NavigationLayer`/`PolygonEditor` para la navegación).
 */
export function ZoneLayer({ zones, selection }: { zones: LevelZone[]; selection: Selection }) {
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 size-full">
      {zones.map((zone) => {
        const selected = selection.kind === "zone" && selection.id === zone.id;
        const stroke = "#a78bfa";
        const fill = "rgba(167,139,250,0.15)";
        const strokeWidth = selected ? "0.6" : "0.3";
        const strokeDasharray = selected ? "1.2 0.8" : "0.6 0.6";
        if (zone.shape.kind === "circle") {
          return (
            <circle
              key={zone.id}
              cx={zone.shape.center.x}
              cy={zone.shape.center.y}
              r={zone.shape.radius}
              fill={fill}
              stroke={stroke}
              strokeWidth={strokeWidth}
              strokeDasharray={strokeDasharray}
            />
          );
        }
        return (
          <polygon
            key={zone.id}
            points={zone.shape.points.map((p) => `${p.x},${p.y}`).join(" ")}
            fill={fill}
            stroke={stroke}
            strokeWidth={strokeWidth}
            strokeDasharray={strokeDasharray}
          />
        );
      })}
    </svg>
  );
}
