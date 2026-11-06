// Generado por scripts/indice-lecciones.mjs a partir del catálogo. No editar a mano.
import type { LessonSummary } from "./types";

export const LESSON_INDEX: readonly LessonSummary[] = [
  {
    "id": "suma-resta-columnas",
    "unitId": "numeros",
    "title": "Sumar y restar en columnas",
    "objective": "Sumar y restar números de varias cifras en columnas, llevando y reagrupando con sentido del valor posicional.",
    "prerequisites": [],
    "legacyModuleIds": [
      "aritmetica-d3"
    ]
  },
  {
    "id": "division-larga",
    "unitId": "numeros",
    "title": "La división larga",
    "objective": "Dividir números de varias cifras entre divisores de una y dos cifras con la división larga, sin olvidar los ceros del cociente y comprobando con el resto.",
    "prerequisites": [],
    "legacyModuleIds": [
      "aritmetica-division-larga"
    ]
  },
  {
    "id": "enteros-recta",
    "unitId": "numeros",
    "title": "Números enteros en la recta",
    "objective": "Ubicar, comparar y ordenar números enteros usando la recta numérica, el opuesto y el valor absoluto.",
    "prerequisites": [],
    "legacyModuleIds": [
      "aritmetica-d10",
      "medicion-d1"
    ]
  },
  {
    "id": "enteros-suma-resta",
    "unitId": "numeros",
    "title": "Sumar y restar enteros",
    "objective": "Sumar y restar números enteros interpretando cada operación como un desplazamiento en la recta.",
    "prerequisites": [
      "enteros-recta"
    ],
    "legacyModuleIds": [
      "aritmetica-d10"
    ]
  },
  {
    "id": "enteros-producto-cociente",
    "unitId": "numeros",
    "title": "Multiplicar y dividir enteros",
    "objective": "Multiplicar y dividir números enteros justificando la regla de los signos.",
    "prerequisites": [
      "enteros-suma-resta"
    ],
    "legacyModuleIds": [
      "aritmetica-d10",
      "aritmetica-d5",
      "aritmetica-d6"
    ]
  },
  {
    "id": "jerarquia-operaciones",
    "unitId": "numeros",
    "title": "Orden de las operaciones",
    "objective": "Calcular expresiones con varias operaciones respetando paréntesis, potencias, productos y sumas, y escribir expresiones que modelen una situación.",
    "prerequisites": [
      "enteros-producto-cociente"
    ],
    "legacyModuleIds": [
      "aritmetica-jerarquia",
      "logica-d5"
    ]
  },
  {
    "id": "potencias-raices",
    "unitId": "numeros",
    "title": "Potencias y raíces",
    "objective": "Calcular potencias y raíces cuadradas, usar las propiedades de las potencias de igual base y estimar raíces no exactas.",
    "prerequisites": [
      "jerarquia-operaciones"
    ],
    "legacyModuleIds": [
      "aritmetica-potencias",
      "aritmetica-raices"
    ]
  },
  {
    "id": "notacion-cientifica",
    "unitId": "numeros",
    "title": "Notación científica",
    "objective": "Escribir, comparar y multiplicar números muy grandes o muy pequeños en notación científica.",
    "prerequisites": [
      "potencias-raices"
    ],
    "legacyModuleIds": [
      "aritmetica-notacion-cientifica",
      "aritmetica-potencias"
    ]
  },
  {
    "id": "fracciones-unidad",
    "unitId": "fracciones",
    "title": "Qué representa una fracción",
    "objective": "Representar una fracción respecto de una unidad y explicar el papel de sus dos números.",
    "prerequisites": [],
    "legacyModuleIds": [
      "aritmetica-fraccion-concepto"
    ]
  },
  {
    "id": "fracciones-equivalentes",
    "unitId": "fracciones",
    "title": "Equivalencia y comparación",
    "objective": "Construir fracciones equivalentes y comparar cantidades usando una unidad común.",
    "prerequisites": [
      "fracciones-unidad"
    ],
    "legacyModuleIds": [
      "aritmetica-fracciones-equivalentes"
    ]
  },
  {
    "id": "fraccion-decimal-porcentaje",
    "unitId": "fracciones",
    "title": "Una cantidad, tres representaciones",
    "objective": "Relacionar fracciones, decimales y porcentajes conservando la unidad de referencia.",
    "prerequisites": [
      "fracciones-equivalentes"
    ],
    "legacyModuleIds": [
      "aritmetica-fraccion-decimal-porcentaje",
      "aritmetica-d8",
      "aritmetica-d9"
    ]
  },
  {
    "id": "fraccion-cantidad",
    "unitId": "fracciones",
    "title": "Calcular una fracción de una cantidad",
    "objective": "Calcular una fracción de una cantidad y justificar el reparto en partes iguales.",
    "prerequisites": [
      "fracciones-unidad",
      "fracciones-equivalentes"
    ],
    "legacyModuleIds": [
      "aritmetica-fraccion-de-cantidad"
    ]
  },
  {
    "id": "fracciones-suma-resta",
    "unitId": "fracciones",
    "title": "Sumar y restar fracciones",
    "objective": "Sumar y restar fracciones con distinto denominador usando un denominador común y justificar por qué es necesario.",
    "prerequisites": [
      "fracciones-equivalentes"
    ],
    "legacyModuleIds": [
      "aritmetica-fracciones-2",
      "aritmetica-mcd-mcm"
    ]
  },
  {
    "id": "fracciones-producto-cociente",
    "unitId": "fracciones",
    "title": "Multiplicar y dividir fracciones",
    "objective": "Multiplicar y dividir fracciones interpretando el producto como «fracción de» y el cociente como «cuántas veces cabe».",
    "prerequisites": [
      "fraccion-cantidad",
      "fracciones-suma-resta"
    ],
    "legacyModuleIds": [
      "aritmetica-fracciones-mult-div"
    ]
  },
  {
    "id": "operaciones-decimales",
    "unitId": "fracciones",
    "title": "Operar con decimales",
    "objective": "Comparar, multiplicar y dividir números decimales, justificar la posición de la coma y estimar el resultado.",
    "prerequisites": [
      "fraccion-decimal-porcentaje"
    ],
    "legacyModuleIds": [
      "aritmetica-d8",
      "aritmetica-decimales-mult-div"
    ]
  },
  {
    "id": "razones",
    "unitId": "proporcionalidad",
    "title": "Comparar cantidades con razones",
    "objective": "Interpretar una razón entre dos cantidades y distinguirla de una parte del total.",
    "prerequisites": [
      "fracciones-equivalentes",
      "fraccion-cantidad"
    ],
    "legacyModuleIds": [
      "algebra-d5"
    ]
  },
  {
    "id": "tasa-unitaria",
    "unitId": "proporcionalidad",
    "title": "Encontrar el valor por unidad",
    "objective": "Calcular e interpretar una tasa unitaria para comparar alternativas con distintas cantidades.",
    "prerequisites": [
      "razones"
    ],
    "legacyModuleIds": [
      "algebra-d5",
      "medicion-d4"
    ]
  },
  {
    "id": "proporcionalidad",
    "unitId": "proporcionalidad",
    "title": "Reconocer una relación proporcional",
    "objective": "Reconocer proporcionalidad directa y usar su constante para completar una tabla o resolver un problema.",
    "prerequisites": [
      "tasa-unitaria"
    ],
    "legacyModuleIds": [
      "algebra-d5",
      "algebra-d9"
    ]
  },
  {
    "id": "porcentajes-aplicados",
    "unitId": "proporcionalidad",
    "title": "Entender aumentos y descuentos",
    "objective": "Calcular cambios porcentuales identificando la cantidad de referencia y comprobar el resultado.",
    "prerequisites": [
      "fraccion-decimal-porcentaje",
      "fraccion-cantidad",
      "proporcionalidad"
    ],
    "legacyModuleIds": [
      "aritmetica-porcentaje-aplicado"
    ]
  },
  {
    "id": "proporcionalidad-inversa",
    "unitId": "proporcionalidad",
    "title": "Proporcionalidad inversa",
    "objective": "Reconocer relaciones de proporcionalidad inversa, usar su producto constante y distinguirlas de la proporcionalidad directa.",
    "prerequisites": [
      "proporcionalidad"
    ],
    "legacyModuleIds": [
      "algebra-d5",
      "algebra-d9"
    ]
  },
  {
    "id": "interes-compuesto",
    "unitId": "proporcionalidad",
    "title": "Interés simple y compuesto",
    "objective": "Calcular el interés y el monto con interés simple y compuesto, explicar por qué el compuesto crece más con el tiempo y aplicar aumentos y descuentos porcentuales repetidos.",
    "prerequisites": [
      "porcentajes-aplicados",
      "potencias-raices"
    ],
    "legacyModuleIds": [
      "aritmetica-d9"
    ]
  },
  {
    "id": "igualdad-incognita",
    "unitId": "algebra",
    "title": "La igualdad y el valor desconocido",
    "objective": "Interpretar una igualdad como dos cantidades equivalentes y comprobar un valor desconocido.",
    "prerequisites": [],
    "legacyModuleIds": [
      "algebra-d2",
      "algebra-d3"
    ]
  },
  {
    "id": "ecuaciones-un-paso",
    "unitId": "algebra",
    "title": "Resolver ecuaciones de un paso",
    "objective": "Aislar una incógnita mediante una operación inversa aplicada a ambos lados y verificar la solución.",
    "prerequisites": [
      "igualdad-incognita"
    ],
    "legacyModuleIds": [
      "algebra-d3",
      "algebra-d4"
    ]
  },
  {
    "id": "ecuaciones-dos-pasos",
    "unitId": "algebra",
    "title": "Resolver ecuaciones de dos pasos",
    "objective": "Resolver ecuaciones mx + b = c deshaciendo las operaciones en orden y comprobando el resultado.",
    "prerequisites": [
      "ecuaciones-un-paso"
    ],
    "legacyModuleIds": [
      "algebra-d7"
    ]
  },
  {
    "id": "modelar-ecuaciones",
    "unitId": "algebra",
    "title": "Convertir una situación en una ecuación",
    "objective": "Definir una incógnita, construir una ecuación de dos pasos e interpretar y verificar su solución en el contexto.",
    "prerequisites": [
      "ecuaciones-dos-pasos",
      "tasa-unitaria"
    ],
    "legacyModuleIds": [
      "algebra-d7",
      "logica-d7",
      "logica-d9"
    ]
  },
  {
    "id": "expresiones-algebraicas",
    "unitId": "expresiones",
    "title": "Expresiones algebraicas",
    "objective": "Evaluar expresiones algebraicas, reconocer términos semejantes y reducirlos.",
    "prerequisites": [
      "ecuaciones-dos-pasos",
      "enteros-suma-resta"
    ],
    "legacyModuleIds": [
      "algebra-d6",
      "algebra-d1"
    ]
  },
  {
    "id": "propiedad-distributiva",
    "unitId": "expresiones",
    "title": "La propiedad distributiva",
    "objective": "Desarrollar productos de la forma a(x + b), sacar factor común y usar ambas transformaciones para resolver ecuaciones.",
    "prerequisites": [
      "expresiones-algebraicas"
    ],
    "legacyModuleIds": [
      "algebra-d6",
      "algebra-d7"
    ]
  },
  {
    "id": "ecuaciones-ambos-lados",
    "unitId": "expresiones",
    "title": "Ecuaciones con la incógnita en ambos lados",
    "objective": "Resolver ecuaciones con la incógnita en ambos lados, incluidas las que tienen paréntesis, y reconocer ecuaciones sin solución.",
    "prerequisites": [
      "propiedad-distributiva"
    ],
    "legacyModuleIds": [
      "algebra-d7"
    ]
  },
  {
    "id": "inecuaciones",
    "unitId": "expresiones",
    "title": "Inecuaciones lineales",
    "objective": "Resolver inecuaciones lineales, interpretar su conjunto de soluciones y usar el cambio de sentido al multiplicar o dividir por un negativo.",
    "prerequisites": [
      "ecuaciones-ambos-lados"
    ],
    "legacyModuleIds": [
      "algebra-d8"
    ]
  },
  {
    "id": "funciones-lineales",
    "unitId": "expresiones",
    "title": "Funciones lineales",
    "objective": "Describir relaciones lineales y = mx + b a partir de tablas, interpretar la pendiente y el valor inicial y usarlos para predecir.",
    "prerequisites": [
      "proporcionalidad",
      "expresiones-algebraicas"
    ],
    "legacyModuleIds": [
      "algebra-d9",
      "geometria-d8"
    ]
  },
  {
    "id": "productos-notables",
    "unitId": "expresiones",
    "title": "Productos notables",
    "objective": "Desarrollar cuadrados de binomios y productos de binomios conjugados usando la propiedad distributiva.",
    "prerequisites": [
      "propiedad-distributiva",
      "potencias-raices"
    ],
    "legacyModuleIds": []
  },
  {
    "id": "progresiones",
    "unitId": "expresiones",
    "title": "Progresiones aritméticas y geométricas",
    "objective": "Reconocer progresiones aritméticas y geométricas, hallar cualquier término con su regla general, sumar términos de una progresión aritmética y resolver problemas inversos.",
    "prerequisites": [
      "expresiones-algebraicas",
      "potencias-raices"
    ],
    "legacyModuleIds": [
      "algebra-d9"
    ]
  },
  {
    "id": "ecuaciones-cuadraticas",
    "unitId": "expresiones",
    "title": "Ecuaciones de segundo grado",
    "objective": "Resolver ecuaciones cuadráticas sencillas (x² = c y por factorización), usar la propiedad del producto nulo e interpretar las soluciones en un contexto.",
    "prerequisites": [
      "propiedad-distributiva",
      "potencias-raices"
    ],
    "legacyModuleIds": [
      "algebra-d10",
      "aritmetica-raices"
    ]
  },
  {
    "id": "funcion-cuadratica",
    "unitId": "expresiones",
    "title": "Función cuadrática: vértice, máximos y mínimos",
    "objective": "Interpretar la forma y = a(x − h)² + k, ubicar el vértice de una parábola, decidir si es un máximo o un mínimo y usarlo para optimizar áreas, ingresos y alturas.",
    "prerequisites": [
      "ecuaciones-cuadraticas",
      "funciones-lineales"
    ],
    "legacyModuleIds": [
      "algebra-d10"
    ]
  },
  {
    "id": "sistemas-ecuaciones",
    "unitId": "expresiones",
    "title": "Sistemas de dos ecuaciones",
    "objective": "Resolver sistemas de dos ecuaciones lineales por reducción y por sustitución, interpretar la solución como el punto donde se cortan dos rectas y plantear sistemas a partir de una situación.",
    "prerequisites": [
      "ecuaciones-ambos-lados",
      "funciones-lineales"
    ],
    "legacyModuleIds": [
      "algebra-d7",
      "logica-d9"
    ]
  },
  {
    "id": "funciones-exponenciales",
    "unitId": "expresiones",
    "title": "Crecimiento exponencial",
    "objective": "Distinguir el crecimiento lineal (sumar una cantidad fija) del exponencial (multiplicar por un factor fijo), calcular valores de y = a · bⁿ y modelar aumentos y descuentos porcentuales repetidos.",
    "prerequisites": [
      "potencias-raices",
      "porcentajes-aplicados",
      "funciones-lineales"
    ],
    "legacyModuleIds": [
      "algebra-d9",
      "aritmetica-potencias"
    ]
  },
  {
    "id": "angulos",
    "unitId": "geometria",
    "title": "Ángulos y polígonos",
    "objective": "Usar ángulos complementarios, suplementarios y opuestos por el vértice, y la suma de los ángulos de triángulos y polígonos.",
    "prerequisites": [
      "jerarquia-operaciones"
    ],
    "legacyModuleIds": [
      "geometria-d6",
      "geometria-d1"
    ]
  },
  {
    "id": "perimetro-area",
    "unitId": "geometria",
    "title": "Perímetro y área",
    "objective": "Distinguir perímetro y área, calcularlos en rectángulos, triángulos y figuras compuestas, y elegir la magnitud adecuada en un contexto.",
    "prerequisites": [
      "jerarquia-operaciones"
    ],
    "legacyModuleIds": [
      "geometria-d3",
      "geometria-d4",
      "geometria-d5"
    ]
  },
  {
    "id": "circulo",
    "unitId": "geometria",
    "title": "Longitud y área del círculo",
    "objective": "Calcular la longitud de la circunferencia y el área del círculo, e interpretar π como la razón entre la longitud y el diámetro.",
    "prerequisites": [
      "perimetro-area"
    ],
    "legacyModuleIds": [
      "geometria-d4",
      "geometria-d6"
    ]
  },
  {
    "id": "volumen",
    "unitId": "geometria",
    "title": "Volumen de prismas y cilindros",
    "objective": "Calcular volúmenes como área de la base por altura, convertir entre m³ y litros y resolver problemas de capacidad.",
    "prerequisites": [
      "circulo"
    ],
    "legacyModuleIds": [
      "geometria-d7",
      "geometria-d2",
      "medicion-d4"
    ]
  },
  {
    "id": "pitagoras",
    "unitId": "geometria",
    "title": "Teorema de Pitágoras",
    "objective": "Usar el teorema de Pitágoras para calcular lados de triángulos rectángulos y distancias, y comprobar si un triángulo es rectángulo.",
    "prerequisites": [
      "potencias-raices",
      "perimetro-area"
    ],
    "legacyModuleIds": [
      "geometria-d9",
      "geometria-d8"
    ]
  },
  {
    "id": "semejanza",
    "unitId": "geometria",
    "title": "Semejanza y escalas",
    "objective": "Reconocer figuras semejantes, calcular longitudes con la razón de semejanza, usar escalas y relacionar la escala con el área.",
    "prerequisites": [
      "razones",
      "perimetro-area"
    ],
    "legacyModuleIds": [
      "geometria-d10",
      "algebra-d5"
    ]
  },
  {
    "id": "transformaciones",
    "unitId": "geometria",
    "title": "Transformaciones en el plano",
    "objective": "Aplicar traslaciones, reflexiones y rotaciones de 90° y 180° a figuras en el plano cartesiano, describir la regla de coordenadas de cada una y reconocer qué propiedades conservan.",
    "prerequisites": [
      "angulos",
      "perimetro-area"
    ],
    "legacyModuleIds": [
      "geometria-d8",
      "geometria-d1"
    ]
  },
  {
    "id": "distancia-punto-medio",
    "unitId": "geometria",
    "title": "Distancia y punto medio en el plano",
    "objective": "Calcular la distancia entre dos puntos con el teorema de Pitágoras, hallar el punto medio de un segmento y resolver problemas inversos con coordenadas.",
    "prerequisites": [
      "pitagoras",
      "enteros-suma-resta"
    ],
    "legacyModuleIds": [
      "geometria-d9"
    ]
  },
  {
    "id": "volumen-conos-esferas",
    "unitId": "geometria",
    "title": "Volumen de pirámides, conos y esferas",
    "objective": "Calcular volúmenes de pirámides, conos y esferas, explicar por qué una pirámide o un cono ocupan un tercio del prisma o cilindro de igual base y altura, y resolver problemas inversos.",
    "prerequisites": [
      "volumen",
      "potencias-raices"
    ],
    "legacyModuleIds": [
      "geometria-d7"
    ]
  },
  {
    "id": "trigonometria",
    "unitId": "geometria",
    "title": "Razones trigonométricas",
    "objective": "Definir seno, coseno y tangente de un ángulo agudo como razones entre los lados de un triángulo rectángulo y usarlas para calcular alturas, distancias e inclinaciones.",
    "prerequisites": [
      "pitagoras",
      "semejanza"
    ],
    "legacyModuleIds": [
      "geometria-d9",
      "geometria-d10"
    ]
  },
  {
    "id": "media-mediana-moda",
    "unitId": "datos",
    "title": "Media, mediana y moda",
    "objective": "Calcular e interpretar la media, la mediana, la moda y el rango, y elegir la medida adecuada cuando hay valores extremos.",
    "prerequisites": [
      "jerarquia-operaciones"
    ],
    "legacyModuleIds": [
      "medicion-d5",
      "medicion-d6",
      "medicion-d7",
      "medicion-d8"
    ]
  },
  {
    "id": "probabilidad-simple",
    "unitId": "datos",
    "title": "Probabilidad de un suceso",
    "objective": "Calcular la probabilidad de un suceso con resultados equiprobables, expresarla como fracción, decimal y porcentaje, y usar el complemento.",
    "prerequisites": [
      "fraccion-decimal-porcentaje"
    ],
    "legacyModuleIds": [
      "medicion-d9",
      "medicion-d10"
    ]
  },
  {
    "id": "probabilidad-compuesta",
    "unitId": "datos",
    "title": "Experimentos compuestos",
    "objective": "Contar los resultados de experimentos de dos etapas con tablas o diagramas y calcular probabilidades de sucesos compuestos.",
    "prerequisites": [
      "probabilidad-simple",
      "fracciones-producto-cociente"
    ],
    "legacyModuleIds": [
      "medicion-d10",
      "medicion-d9"
    ]
  },
  {
    "id": "estadistica-dispersion",
    "unitId": "datos",
    "title": "Dispersión y diagramas de caja",
    "objective": "Calcular el rango, los cuartiles y el rango intercuartílico (RIC), interpretar un diagrama de caja y comparar dos grupos de datos por su centro y su dispersión.",
    "prerequisites": [
      "media-mediana-moda"
    ],
    "legacyModuleIds": [
      "medicion-d8",
      "medicion-d6"
    ]
  },
  {
    "id": "combinatoria",
    "unitId": "datos",
    "title": "Técnicas de conteo",
    "objective": "Contar casos con el principio multiplicativo, distinguir cuándo importa el orden y calcular ordenaciones y elecciones sencillas para hallar probabilidades.",
    "prerequisites": [
      "probabilidad-simple",
      "potencias-raices"
    ],
    "legacyModuleIds": [
      "medicion-d10",
      "medicion-d9"
    ]
  },
  {
    "id": "probabilidad-condicional",
    "unitId": "datos",
    "title": "Probabilidad condicional y tablas de doble entrada",
    "objective": "Organizar datos en tablas de doble entrada, calcular probabilidades condicionadas, distinguir P(A | B) de P(B | A) e interpretar resultados de pruebas y encuestas.",
    "prerequisites": [
      "probabilidad-compuesta",
      "fraccion-decimal-porcentaje"
    ],
    "legacyModuleIds": [
      "medicion-d10"
    ]
  }
];
