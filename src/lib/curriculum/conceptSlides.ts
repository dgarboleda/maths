import type { ConceptSlide } from "@/components/topic/concepts/SlidesConcept";

/**
 * Láminas de concepto para los temas que no tienen una visualización
 * propia (docs/curricula-pisa.md): cada tema explica la idea y cierra con
 * un ejemplo resuelto, con la misma plantilla `SlidesConcept` que usan los
 * módulos personalizados. Indexadas por id de módulo.
 */
export const CONCEPT_SLIDES: Record<string, ConceptSlide[]> = {
  "geometria-d2": [
    {
      title: "Cuerpos geométricos",
      text: "Un cuerpo geométrico ocupa lugar en el espacio: tiene largo, ancho y alto. Una caja, un dado o un techo en punta son ejemplos.",
    },
    {
      title: "Caras",
      text: "Las caras son sus superficies planas. Un cubo —como un dado— tiene 6 caras: arriba, abajo y 4 alrededor.",
    },
    {
      title: "Aristas y vértices",
      text: "Las aristas son los bordes donde se juntan dos caras. Los vértices son las esquinas donde se juntan las aristas.\nUn cubo tiene 12 aristas y 8 vértices.",
    },
    {
      title: "Prismas y pirámides",
      text: "Un prisma tiene dos bases iguales unidas por rectángulos. Una pirámide tiene una sola base y caras triangulares que se juntan en un vértice arriba.\nEjemplo: una pirámide de base cuadrada tiene 5 caras, 5 vértices y 8 aristas.",
    },
  ],
};
