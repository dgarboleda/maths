import type { ConceptSlide } from "@/components/topic/concepts/SlidesConcept";

/**
 * Láminas de concepto para los temas que no tienen una visualización
 * propia (docs/curricula-pisa.md): cada tema explica la idea y cierra con
 * un ejemplo resuelto, con la misma plantilla `SlidesConcept` que usan los
 * módulos personalizados. Indexadas por id de módulo.
 */
export const CONCEPT_SLIDES: Record<string, ConceptSlide[]> = {
  // ── Cantidad ────────────────────────────────────────────────────────
  "aritmetica-valor-posicional": [
    {
      title: "El lugar cambia el valor",
      text: "En un número, cada cifra vale distinto según el lugar que ocupa: unidades, decenas o centenas.",
    },
    {
      title: "Unidades, decenas, centenas",
      text: "Una decena son 10 unidades. Una centena son 10 decenas, o sea 100.",
    },
    {
      title: "Ejemplo",
      text: "En 347: el 3 vale 300 (3 centenas), el 4 vale 40 (4 decenas) y el 7 vale 7.\n347 = 300 + 40 + 7.",
    },
  ],
  "aritmetica-division-resto": [
    {
      title: "Repartir y que sobre",
      text: "No todos los repartos son exactos. Cuando no alcanza para darle uno más a cada uno, lo que queda es el resto.",
    },
    {
      title: "Cómo se calcula",
      text: "Busca el múltiplo más grande del divisor que no se pase del número. Ese múltiplo te da el cociente; lo que falta, el resto.",
    },
    {
      title: "Ejemplo",
      text: "38 caramelos entre 5 niños: 5 × 7 = 35 y 5 × 8 = 40 ya se pasa.\nA cada uno le tocan 7 y sobran 38 − 35 = 3.",
    },
  ],
  "aritmetica-mult-varias-cifras": [
    {
      title: "Descomponer para multiplicar",
      text: "Para multiplicar números grandes, se separa uno de ellos en decenas y unidades y se multiplica cada parte.",
    },
    {
      title: "Ejemplo",
      text: "47 × 6 = (40 + 7) × 6 = 40 × 6 + 7 × 6 = 240 + 42 = 282.",
    },
    {
      title: "Con dos cifras",
      text: "23 × 14 = 23 × 10 + 23 × 4 = 230 + 92 = 322.",
    },
  ],
  "aritmetica-fracciones-equivalentes": [
    {
      title: "Fracciones que valen lo mismo",
      text: "1/2, 2/4 y 4/8 representan la misma cantidad: son fracciones equivalentes.",
    },
    {
      title: "Ampliar y simplificar",
      text: "Si multiplicas (o divides) el numerador y el denominador por el mismo número, obtienes una fracción equivalente.\n2/3 = 8/12 (× 4).   12/18 = 2/3 (÷ 6).",
    },
    {
      title: "Comparar",
      text: "Para saber cuál es mayor, pásalas al mismo denominador.\n2/3 = 10/15 y 3/5 = 9/15, así que 2/3 es mayor.",
    },
  ],
  "aritmetica-division-larga": [
    {
      title: "Dividir por partes",
      text: "Una división grande se resuelve por partes: primero se reparte lo que se puede de a decenas y después lo que queda.",
    },
    {
      title: "Ejemplo",
      text: "672 ÷ 6: 6 × 100 = 600, faltan 72. 6 × 12 = 72.\n100 + 12 = 112, así que 672 ÷ 6 = 112.",
    },
    {
      title: "Comprueba",
      text: "Multiplica el resultado por el divisor: tiene que dar el número del principio. 112 × 6 = 672 ✓.",
    },
  ],
  "aritmetica-jerarquia": [
    {
      title: "¿Qué se hace primero?",
      text: "Cuando hay varias operaciones, se sigue un orden: primero los paréntesis, después multiplicaciones y divisiones, y al final sumas y restas.",
    },
    {
      title: "Ejemplo",
      text: "3 + 4 × 5 = 3 + 20 = 23 (no 35: la multiplicación va antes).",
    },
    {
      title: "Con paréntesis",
      text: "(3 + 4) × 5 = 7 × 5 = 35: el paréntesis obliga a sumar primero.",
    },
  ],
  "aritmetica-fraccion-de-cantidad": [
    {
      title: "Una parte de un total",
      text: "Calcular 3/4 de 20 es repartir 20 en 4 partes iguales y tomar 3 de ellas.",
    },
    {
      title: "Dos pasos",
      text: "Primero divide entre el denominador (cuánto es cada parte) y después multiplica por el numerador (cuántas partes tomas).",
    },
    {
      title: "Ejemplo",
      text: "3/8 de 24 alumnos: 24 ÷ 8 = 3 alumnos por parte; 3 × 3 = 9 alumnos.",
    },
  ],
  "aritmetica-potencias": [
    {
      title: "Multiplicación repetida",
      text: "Una potencia abrevia una multiplicación de un número por sí mismo. En 2⁵, la base es 2 y el exponente 5.",
    },
    {
      title: "Ejemplo",
      text: "2⁵ = 2 × 2 × 2 × 2 × 2 = 32.   10³ = 10 × 10 × 10 = 1000.",
    },
    {
      title: "Crecer multiplicando",
      text: "Algo que se duplica cada hora se multiplica por 2 cada vez: 3 bacterias, después de 4 horas, son 3 × 2⁴ = 48.",
    },
  ],
  "aritmetica-fracciones-mult-div": [
    {
      title: "Multiplicar fracciones",
      text: "Numerador por numerador y denominador por denominador.\n2/3 × 4/5 = 8/15.",
    },
    {
      title: "Dividir entre una fracción",
      text: "Dividir es preguntar cuántas veces cabe. ¿Cuántos vasos de 1/4 de litro salen de 3 litros? 3 ÷ 1/4 = 3 × 4 = 12.",
    },
    {
      title: "Regla general",
      text: "Dividir entre una fracción es multiplicar por esa fracción dada vuelta: 6 ÷ 2/3 = 6 × 3/2 = 9.",
    },
  ],
  "aritmetica-decimales-mult-div": [
    {
      title: "Multiplicar con coma",
      text: "Multiplica como si no hubiera coma y al final separa tantas cifras decimales como tienen los dos factores juntos.\n1.3 × 4: 13 × 4 = 52 → 5.2.",
    },
    {
      title: "Décimos por décimos",
      text: "0.3 × 0.7: 3 × 7 = 21, y se separan dos cifras decimales → 0.21.",
    },
    {
      title: "Dividir con coma",
      text: "7.2 ÷ 4: son 72 décimos ÷ 4 = 18 décimos = 1.8.",
    },
  ],
  "aritmetica-porcentaje-aplicado": [
    {
      title: "Descuentos",
      text: "Con un 25% de descuento pagas el resto: calcula el descuento y réstalo.\n$80 con 25%: 25% de 80 = 20; pagas 80 − 20 = $60.",
    },
    {
      title: "Aumentos",
      text: "Un aumento se calcula igual, pero se suma.\n$600 que sube 15%: 15% de 600 = 90; ahora cuesta $690.",
    },
    {
      title: "¿Cuánto cambió, en porcentaje?",
      text: "Compara el cambio con el valor inicial. De $50 a $60 cambió 10 sobre 50 = 10/50 = 20%.",
    },
  ],
  "aritmetica-raices": [
    {
      title: "La operación inversa del cuadrado",
      text: "La raíz cuadrada de un número es el número que, multiplicado por sí mismo, lo da. √49 = 7 porque 7 × 7 = 49.",
    },
    {
      title: "El lado de un cuadrado",
      text: "Si un cuadrado tiene 144 m² de área, su lado es √144 = 12 m.",
    },
    {
      title: "Estimar",
      text: "√50 no es exacta, pero 7² = 49 y 8² = 64: √50 está entre 7 y 8 (muy cerca de 7).",
    },
  ],
  "aritmetica-notacion-cientifica": [
    {
      title: "Números muy grandes, cortos",
      text: "La notación científica escribe un número como un factor entre 1 y 10 multiplicado por una potencia de 10.",
    },
    {
      title: "Ejemplo",
      text: "45 000 000 = 4.5 × 10⁷: la coma se corrió 7 lugares.\n3.2 × 10⁴ = 32 000.",
    },
    {
      title: "Multiplicar",
      text: "(2 × 10³) × (3 × 10²) = 6 × 10⁵: se multiplican los factores y se suman los exponentes.",
    },
  ],

  // ── Espacio y forma ─────────────────────────────────────────────────
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
