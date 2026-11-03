/**
 * Formulario de referencia por clase, para la ayuda del foco.
 *
 * Solo reglas generales del tema (no ejemplos resueltos, que ya viven en las
 * secciones de cada clase). Las expresiones se escriben en línea con la
 * notación que dibuja `MathText`: «a/b» o «(…)/(…)» para fracciones apiladas,
 * «√(…)» para raíces y superíndices o subíndices Unicode.
 */
export interface LessonFormula {
  /** Nombre corto de la fórmula. */
  name: string;
  expression: string;
  /** Qué significa cada letra o cuándo se puede usar. */
  legend?: string;
}

const FORMULAS: Record<string, LessonFormula[]> = {
  // Números
  "enteros-suma-resta": [
    { name: "Restar es sumar el opuesto", expression: "a − b = a + (−b)", legend: "Por ejemplo, 3 − (−4) = 3 + 4." },
    { name: "Variación", expression: "variación = final − inicial", legend: "Positiva si aumenta; negativa si disminuye." },
  ],
  "enteros-producto-cociente": [
    { name: "Signos iguales", expression: "(+) · (+) = +   (−) · (−) = +", legend: "Vale igual para la división." },
    { name: "Signos distintos", expression: "(+) · (−) = −   (−) · (+) = −", legend: "Vale igual para la división." },
  ],
  "potencias-raices": [
    { name: "Producto de potencias de igual base", expression: "aᵐ × aⁿ = aᵐ⁺ⁿ" },
    { name: "Cociente de potencias de igual base", expression: "aᵐ ÷ aⁿ = aᵐ⁻ⁿ", legend: "Con a ≠ 0." },
    { name: "Raíz cuadrada", expression: "√a = b  ⇔  b² = a", legend: "Con a ≥ 0 y b ≥ 0." },
  ],
  "notacion-cientifica": [
    { name: "Forma de la notación científica", expression: "a × 10ⁿ", legend: "1 ≤ a < 10 y n es un número entero." },
    { name: "Producto", expression: "(a × 10ᵐ) × (b × 10ⁿ) = (a × b) × 10ᵐ⁺ⁿ", legend: "Si a × b ≥ 10, se reajusta la coma y el exponente." },
  ],

  // Fracciones
  "fracciones-suma-resta": [
    { name: "Igual denominador", expression: "a/c + b/c = (a + b)/c" },
    { name: "Distinto denominador", expression: "a/b + c/d = (a × d + b × c)/(b × d)", legend: "También sirve el mínimo común múltiplo de los denominadores." },
  ],
  "fracciones-producto-cociente": [
    { name: "Producto", expression: "a/b × c/d = (a × c)/(b × d)" },
    { name: "Cociente", expression: "a/b ÷ c/d = a/b × d/c", legend: "Dividir es multiplicar por la fracción inversa (c ≠ 0)." },
  ],

  // Proporcionalidad
  "tasa-unitaria": [
    { name: "Valor por unidad", expression: "valor unitario = (total)/(cantidad)" },
    { name: "Costo", expression: "costo = cantidad × valor unitario" },
  ],
  proporcionalidad: [
    { name: "Proporcionalidad directa", expression: "y = k · x", legend: "k es la constante de proporcionalidad." },
    { name: "Constante", expression: "k = y/x", legend: "Con x ≠ 0; es la misma para todas las parejas." },
  ],
  "porcentajes-aplicados": [
    { name: "Porcentaje de una cantidad", expression: "p % de base = base × p/100" },
    { name: "Aumento del p %", expression: "final = base × (1 + p/100)" },
    { name: "Descuento del p %", expression: "final = base × (1 − p/100)", legend: "Dos cambios sucesivos se multiplican, no se suman." },
  ],
  "proporcionalidad-inversa": [
    { name: "Producto constante", expression: "x · y = k" },
    { name: "Despejar y", expression: "y = k/x", legend: "Con x ≠ 0: si x se duplica, y se reduce a la mitad." },
  ],
  "interes-compuesto": [
    { name: "Interés simple", expression: "I = (C · r · t)/100", legend: "C: capital · r: tasa anual en % · t: años." },
    { name: "Monto", expression: "M = C + I" },
    { name: "Interés compuesto", expression: "M = C · (1 + r/100)ᵗ", legend: "Cada año el monto se multiplica por (1 + r/100)." },
  ],

  // Expresiones y funciones
  "propiedad-distributiva": [
    { name: "Distributiva de la suma", expression: "a(b + c) = ab + ac" },
    { name: "Distributiva de la resta", expression: "a(b − c) = ab − ac", legend: "Leída al revés, sirve para sacar factor común." },
  ],
  "productos-notables": [
    { name: "Cuadrado de una suma", expression: "(a + b)² = a² + 2ab + b²" },
    { name: "Cuadrado de una diferencia", expression: "(a − b)² = a² − 2ab + b²" },
    { name: "Suma por diferencia", expression: "(a + b)(a − b) = a² − b²" },
  ],
  progresiones: [
    { name: "Término general (aritmética)", expression: "aₙ = a₁ + (n − 1) · d", legend: "a₁: primer término · d: diferencia · n: posición." },
    { name: "Diferencia", expression: "d = aₙ₊₁ − aₙ", legend: "Lo que se suma de un término al siguiente." },
    { name: "Suma de n términos (aritmética)", expression: "Sₙ = (n · (a₁ + aₙ))/2" },
    { name: "Término general (geométrica)", expression: "aₙ = a₁ · rⁿ⁻¹", legend: "a₁: primer término · r: razón · n: posición." },
    { name: "Razón", expression: "r = a₂/a₁", legend: "Lo que multiplica a cada término para obtener el siguiente." },
    { name: "Suma de n términos (geométrica)", expression: "Sₙ = (a₁ · (rⁿ − 1))/(r − 1)", legend: "Con r ≠ 1." },
  ],
  "funciones-lineales": [
    { name: "Función lineal", expression: "y = mx + b", legend: "m: pendiente · b: valor de y cuando x = 0." },
    { name: "Pendiente", expression: "m = (y₂ − y₁)/(x₂ − x₁)", legend: "Con dos puntos (x₁, y₁) y (x₂, y₂) de la recta." },
  ],
  "ecuaciones-cuadraticas": [
    { name: "Ecuación x² = k", expression: "x = √k  o  x = −√k", legend: "Con k ≥ 0." },
    { name: "Factorizar un trinomio", expression: "x² + bx + c = (x − p)(x − q)", legend: "p + q = −b y p · q = c; las soluciones son p y q." },
    { name: "Producto nulo", expression: "A · B = 0  ⇒  A = 0  o  B = 0" },
    { name: "Fórmula general", expression: "x = (−b ± √(b² − 4ac))/(2a)", legend: "Para ax² + bx + c = 0 con a ≠ 0." },
  ],
  "funcion-cuadratica": [
    { name: "Forma general", expression: "y = ax² + bx + c" },
    { name: "Forma canónica", expression: "y = a(x − h)² + k", legend: "Vértice (h, k). Si a > 0 hay un mínimo; si a < 0, un máximo." },
    { name: "Abscisa del vértice", expression: "xᵥ = (−b)/(2a)" },
  ],
  "funciones-exponenciales": [
    { name: "Crecimiento exponencial", expression: "y = a · bⁿ", legend: "a: valor inicial · b: factor por paso · n: pasos." },
    { name: "Aumento del p %", expression: "b = 1 + p/100" },
    { name: "Disminución del p %", expression: "b = 1 − p/100" },
  ],

  // Geometría
  angulos: [
    { name: "Complementarios", expression: "α + β = 90°" },
    { name: "Suplementarios", expression: "α + β = 180°" },
    { name: "Ángulos de un triángulo", expression: "α + β + γ = 180°" },
    { name: "Ángulos interiores de un polígono", expression: "S = (n − 2) × 180°", legend: "n: número de lados." },
  ],
  "perimetro-area": [
    { name: "Perímetro del rectángulo", expression: "P = 2(b + h)" },
    { name: "Área del rectángulo", expression: "A = b × h" },
    { name: "Área del triángulo", expression: "A = (b × h)/2", legend: "b: base · h: altura perpendicular a esa base." },
  ],
  circulo: [
    { name: "Longitud de la circunferencia", expression: "L = 2πr = πd" },
    { name: "Área del círculo", expression: "A = πr²", legend: "π ≈ 3,14 · r: radio · d = 2r." },
  ],
  volumen: [
    { name: "Prisma", expression: "V = B × h", legend: "B: área de la base · h: altura." },
    { name: "Cilindro", expression: "V = πr²h" },
    { name: "Equivalencias", expression: "1 dm³ = 1 L   1 m³ = 1000 L" },
  ],
  pitagoras: [
    { name: "Teorema de Pitágoras", expression: "c² = a² + b²", legend: "c: hipotenusa (frente al ángulo recto) · a y b: catetos." },
    { name: "Hallar la hipotenusa", expression: "c = √(a² + b²)" },
    { name: "Hallar un cateto", expression: "a = √(c² − b²)" },
  ],
  semejanza: [
    { name: "Razón de semejanza", expression: "a′ = k × a", legend: "Todas las longitudes se multiplican por el mismo k." },
    { name: "Áreas semejantes", expression: "área′ = k² × área" },
    { name: "Escala", expression: "real = plano × escala" },
  ],
  transformaciones: [
    { name: "Traslación", expression: "(x, y) → (x + a, y + b)" },
    { name: "Reflexión en el eje x", expression: "(x, y) → (x, −y)" },
    { name: "Reflexión en el eje y", expression: "(x, y) → (−x, y)" },
    { name: "Giro de 90° (antihorario)", expression: "(x, y) → (−y, x)" },
    { name: "Giro de 180°", expression: "(x, y) → (−x, −y)" },
  ],
  "distancia-punto-medio": [
    { name: "Distancia entre dos puntos", expression: "d = √((x₂ − x₁)² + (y₂ − y₁)²)" },
    { name: "Punto medio", expression: "M = ((x₁ + x₂)/2, (y₁ + y₂)/2)" },
  ],
  "volumen-conos-esferas": [
    { name: "Pirámide", expression: "V = (B · h)/3", legend: "B: área de la base · h: altura." },
    { name: "Cono", expression: "V = (π · r² · h)/3" },
    { name: "Esfera", expression: "V = (4 · π · r³)/3" },
  ],
  trigonometria: [
    { name: "Seno", expression: "sen α = opuesto/hipotenusa" },
    { name: "Coseno", expression: "cos α = adyacente/hipotenusa" },
    { name: "Tangente", expression: "tan α = opuesto/adyacente", legend: "Catetos opuesto y adyacente respecto del ángulo α." },
  ],

  // Datos y probabilidad
  "media-mediana-moda": [
    { name: "Media", expression: "media = (suma de los valores)/(cantidad de valores)" },
    { name: "Posición de la mediana", expression: "posición = (n + 1)/2", legend: "Con los n datos ordenados. Si n es par, es la media de los dos centrales." },
    { name: "Rango", expression: "rango = mayor − menor" },
  ],
  "estadistica-dispersion": [
    { name: "Rango", expression: "rango = máximo − mínimo" },
    { name: "Rango intercuartílico", expression: "RIC = Q3 − Q1", legend: "Amplitud del 50 % central de los datos." },
  ],
  "probabilidad-simple": [
    { name: "Regla de Laplace", expression: "P(A) = (casos favorables)/(casos posibles)", legend: "Si todos los resultados son igual de probables." },
    { name: "Valores posibles", expression: "0 ≤ P(A) ≤ 1" },
    { name: "Complemento", expression: "P(no A) = 1 − P(A)" },
  ],
  "probabilidad-compuesta": [
    { name: "Principio multiplicativo", expression: "resultados = m × n", legend: "m resultados en el primer paso y n en el segundo." },
    { name: "Sucesos independientes", expression: "P(A y B) = P(A) × P(B)" },
    { name: "Al menos uno", expression: "P(al menos uno) = 1 − P(ninguno)" },
  ],
  combinatoria: [
    { name: "Principio multiplicativo", expression: "m opciones y n opciones → m · n casos" },
    { name: "Factorial", expression: "n! = n · (n − 1) · … · 1", legend: "Maneras de ordenar n objetos distintos." },
    { name: "Parejas sin orden", expression: "parejas = (n · (n − 1))/2" },
  ],
  "probabilidad-condicional": [
    { name: "Probabilidad condicional", expression: "P(A | B) = (casos con A y B)/(casos con B)", legend: "Se cuentan solo los casos en que ocurre B." },
    { name: "Independencia", expression: "independientes ⇔ P(A | B) = P(A)" },
  ],
};

/** Fórmulas de referencia de una clase (vacío si la clase no tiene). */
export function formulasFor(lessonId: string): LessonFormula[] {
  return FORMULAS[lessonId] ?? [];
}

/** Clases con formulario, para validar el catálogo. */
export const FORMULA_LESSON_IDS = Object.keys(FORMULAS);
