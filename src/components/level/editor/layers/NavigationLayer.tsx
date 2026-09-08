import { polygonIsSimple } from "@/lib/world/navmesh";
import type { LevelNavigation, NavPolygon, Vec2 } from "@/lib/level/schema";
import type { Selection } from "../editorReducer";

function toPointsAttr(points: Vec2[]): string {
  return points.map((p) => `${p.x},${p.y}`).join(" ");
}

function isSelectedPolygon(selection: Selection, role: "walkable" | "blocked", id: string): boolean {
  return selection.kind === "polygon" && selection.role === role && selection.id === id;
}

/**
 * Capa de solo lectura de la navegación — docs/level-editor-plan.md §6.3.
 * Pinta los polígonos transitables/bloqueados y el punto de inicio con los
 * mismos colores que ya usaba `WalkDebugOverlay`; la interacción (arrastrar
 * vértices, dibujar, borrar) vive en `PolygonEditor`, que se monta encima.
 * Un polígono autointersecante se resalta en ámbar en vivo — sin bloquear
 * el dibujo, `validateLevel` ya lo reporta como error en `IssuesPanel`.
 */
export function NavigationLayer({ navigation, selection }: { navigation: LevelNavigation; selection: Selection }) {
  function renderPolygon(p: NavPolygon, role: "walkable" | "blocked") {
    const selected = isSelectedPolygon(selection, role, p.id);
    const simple = polygonIsSimple(p.points);
    const stroke = !simple ? "#f59e0b" : role === "walkable" ? "#22c55e" : "#f43f5e";
    const fill = role === "walkable" ? "rgba(34,197,94,0.18)" : "rgba(244,63,94,0.25)";
    return (
      <polygon
        key={p.id}
        points={toPointsAttr(p.points)}
        fill={fill}
        stroke={stroke}
        strokeWidth={selected ? "0.6" : "0.3"}
        strokeDasharray={selected ? "1.2 0.8" : undefined}
      />
    );
  }

  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 size-full">
      {navigation.walkablePolygons.map((p) => renderPolygon(p, "walkable"))}
      {navigation.blockedPolygons.map((p) => renderPolygon(p, "blocked"))}
      <circle
        cx={navigation.spawn.x}
        cy={navigation.spawn.y}
        r="1.3"
        fill="#38bdf8"
        stroke="#0f172a"
        strokeWidth="0.2"
        opacity={selection.kind === "spawn" ? 1 : 0.85}
      />
    </svg>
  );
}
