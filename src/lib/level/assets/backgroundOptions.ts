import type { BackgroundOption } from "../backgroundCatalog";
import type { AssetKind } from "./imageRules";

/**
 * Fusiona `BACKGROUND_CATALOG` (de fábrica) con la biblioteca de imágenes
 * del padre en una sola lista para `BackgroundPicker` —
 * docs/asset-management-plan.md §D/§E.5. Función pura: no toca Firestore ni
 * Storage, recibe los datos ya cargados.
 */
export interface MergedBackgroundOption {
  src: string;
  thumbSrc: string;
  label: string;
  alt: string;
  source: "factory" | "parent";
  /** true si esta opción es del tipo que se pidió con `opts.for` — decide
   *  qué va primero, no oculta nada (§E.5: "nunca un bloqueo"). */
  matchesKind: boolean;
  /** Solo relevante para `source: "factory"` — las 6 miniaturas de §A.2. */
  lowResolution: boolean;
  /** `false` únicamente en la opción sintética que representa un `src` ya
   *  seleccionado que no aparece en ninguna lista (asset borrado) — así un
   *  nivel existente nunca "pierde" su selección visualmente. */
  available: boolean;
}

type AssetLike = { url: string; thumbUrl: string; label: string; alt: string; kind: AssetKind };

export function mergeBackgroundOptions(
  factory: BackgroundOption[],
  assets: AssetLike[],
  opts: { for: AssetKind; selectedSrc?: string },
): MergedBackgroundOption[] {
  // Los assets del padre van primero cuando existen (§E.5) — es lo que va a
  // buscar quien ya subió algo — y entre ellos, los del `kind` pedido antes
  // que los del otro (nunca ocultos: "ver todas" es responsabilidad de la UI,
  // no de esta función, que ya entrega el orden correcto para eso).
  const parentOptions: MergedBackgroundOption[] = assets
    .map((a) => ({
      src: a.url,
      thumbSrc: a.thumbUrl,
      label: a.label,
      alt: a.alt,
      source: "parent" as const,
      matchesKind: a.kind === opts.for,
      lowResolution: false,
      available: true,
    }))
    .sort((a, b) => Number(b.matchesKind) - Number(a.matchesKind));

  const factoryOptions: MergedBackgroundOption[] = factory.map((f) => ({
    src: f.src,
    thumbSrc: f.src,
    label: f.label,
    alt: f.alt,
    source: "factory" as const,
    // El catálogo de fábrica no tiene noción de "capa" — solo sus entradas
    // `usage: "scene"` cuentan como coincidencia cuando se pide un fondo de
    // escena; para `for: "layer"` ninguna de fábrica es la opción primaria.
    matchesKind: opts.for === "scene" && f.usage === "scene",
    lowResolution: f.usage === "thumbnail",
    available: true,
  }));

  const merged = [...parentOptions, ...factoryOptions];

  if (opts.selectedSrc && !merged.some((o) => o.src === opts.selectedSrc)) {
    merged.unshift({
      src: opts.selectedSrc,
      thumbSrc: opts.selectedSrc,
      label: "Imagen no disponible",
      alt: "",
      source: "parent",
      matchesKind: false,
      lowResolution: false,
      available: false,
    });
  }

  return merged;
}
