// Generado por scripts/indice-lecciones.mjs a partir del catálogo. No editar a mano.
import type { LessonSummary } from "./types";

export const LESSON_INDEX: readonly LessonSummary[] = [
  {
    "id": "suma-resta-columnas",
    "unitId": "numeros",
    "title": "Sumar y restar en columnas",
    "prerequisites": []
  },
  {
    "id": "division-larga",
    "unitId": "numeros",
    "title": "La división larga",
    "prerequisites": []
  },
  {
    "id": "multiplicacion-grupos",
    "unitId": "numeros",
    "title": "Multiplicar con grupos iguales",
    "prerequisites": []
  },
  {
    "id": "enteros-recta",
    "unitId": "numeros",
    "title": "Números enteros en la recta",
    "prerequisites": []
  },
  {
    "id": "enteros-suma-resta",
    "unitId": "numeros",
    "title": "Sumar y restar enteros",
    "prerequisites": [
      "enteros-recta"
    ]
  },
  {
    "id": "enteros-producto-cociente",
    "unitId": "numeros",
    "title": "Multiplicar y dividir enteros",
    "prerequisites": [
      "enteros-suma-resta"
    ]
  },
  {
    "id": "jerarquia-operaciones",
    "unitId": "numeros",
    "title": "Orden de las operaciones",
    "prerequisites": [
      "enteros-producto-cociente"
    ]
  },
  {
    "id": "potencias-raices",
    "unitId": "numeros",
    "title": "Potencias y raíces",
    "prerequisites": [
      "jerarquia-operaciones"
    ]
  },
  {
    "id": "notacion-cientifica",
    "unitId": "numeros",
    "title": "Notación científica",
    "prerequisites": [
      "potencias-raices"
    ]
  },
  {
    "id": "mcd-mcm",
    "unitId": "numeros",
    "title": "Divisores y múltiplos comunes: MCD y MCM",
    "prerequisites": []
  },
  {
    "id": "fracciones-unidad",
    "unitId": "fracciones",
    "title": "Qué representa una fracción",
    "prerequisites": []
  },
  {
    "id": "fracciones-equivalentes",
    "unitId": "fracciones",
    "title": "Equivalencia y comparación",
    "prerequisites": [
      "fracciones-unidad"
    ]
  },
  {
    "id": "fraccion-decimal-porcentaje",
    "unitId": "fracciones",
    "title": "Una cantidad, tres representaciones",
    "prerequisites": [
      "fracciones-equivalentes"
    ]
  },
  {
    "id": "fraccion-cantidad",
    "unitId": "fracciones",
    "title": "Calcular una fracción de una cantidad",
    "prerequisites": [
      "fracciones-unidad",
      "fracciones-equivalentes"
    ]
  },
  {
    "id": "fracciones-suma-resta",
    "unitId": "fracciones",
    "title": "Sumar y restar fracciones",
    "prerequisites": [
      "fracciones-equivalentes"
    ]
  },
  {
    "id": "fracciones-producto-cociente",
    "unitId": "fracciones",
    "title": "Multiplicar y dividir fracciones",
    "prerequisites": [
      "fraccion-cantidad",
      "fracciones-suma-resta"
    ]
  },
  {
    "id": "operaciones-decimales",
    "unitId": "fracciones",
    "title": "Operar con decimales",
    "prerequisites": [
      "fraccion-decimal-porcentaje"
    ]
  },
  {
    "id": "razones",
    "unitId": "proporcionalidad",
    "title": "Comparar cantidades con razones",
    "prerequisites": [
      "fracciones-equivalentes",
      "fraccion-cantidad"
    ]
  },
  {
    "id": "tasa-unitaria",
    "unitId": "proporcionalidad",
    "title": "Encontrar el valor por unidad",
    "prerequisites": [
      "razones"
    ]
  },
  {
    "id": "proporcionalidad",
    "unitId": "proporcionalidad",
    "title": "Reconocer una relación proporcional",
    "prerequisites": [
      "tasa-unitaria"
    ]
  },
  {
    "id": "porcentajes-aplicados",
    "unitId": "proporcionalidad",
    "title": "Entender aumentos y descuentos",
    "prerequisites": [
      "fraccion-decimal-porcentaje",
      "fraccion-cantidad",
      "proporcionalidad"
    ]
  },
  {
    "id": "proporcionalidad-inversa",
    "unitId": "proporcionalidad",
    "title": "Proporcionalidad inversa",
    "prerequisites": [
      "proporcionalidad"
    ]
  },
  {
    "id": "interes-compuesto",
    "unitId": "proporcionalidad",
    "title": "Interés simple y compuesto",
    "prerequisites": [
      "porcentajes-aplicados",
      "potencias-raices"
    ]
  },
  {
    "id": "igualdad-incognita",
    "unitId": "algebra",
    "title": "La igualdad y el valor desconocido",
    "prerequisites": []
  },
  {
    "id": "ecuaciones-un-paso",
    "unitId": "algebra",
    "title": "Resolver ecuaciones de un paso",
    "prerequisites": [
      "igualdad-incognita"
    ]
  },
  {
    "id": "ecuaciones-dos-pasos",
    "unitId": "algebra",
    "title": "Resolver ecuaciones de dos pasos",
    "prerequisites": [
      "ecuaciones-un-paso"
    ]
  },
  {
    "id": "modelar-ecuaciones",
    "unitId": "algebra",
    "title": "Convertir una situación en una ecuación",
    "prerequisites": [
      "ecuaciones-dos-pasos",
      "tasa-unitaria"
    ]
  },
  {
    "id": "expresiones-algebraicas",
    "unitId": "expresiones",
    "title": "Expresiones algebraicas",
    "prerequisites": [
      "ecuaciones-dos-pasos",
      "enteros-suma-resta"
    ]
  },
  {
    "id": "propiedad-distributiva",
    "unitId": "expresiones",
    "title": "La propiedad distributiva",
    "prerequisites": [
      "expresiones-algebraicas"
    ]
  },
  {
    "id": "ecuaciones-ambos-lados",
    "unitId": "expresiones",
    "title": "Ecuaciones con la incógnita en ambos lados",
    "prerequisites": [
      "propiedad-distributiva"
    ]
  },
  {
    "id": "inecuaciones",
    "unitId": "expresiones",
    "title": "Inecuaciones lineales",
    "prerequisites": [
      "ecuaciones-ambos-lados"
    ]
  },
  {
    "id": "funciones-lineales",
    "unitId": "expresiones",
    "title": "Funciones lineales",
    "prerequisites": [
      "proporcionalidad",
      "expresiones-algebraicas"
    ]
  },
  {
    "id": "productos-notables",
    "unitId": "expresiones",
    "title": "Productos notables",
    "prerequisites": [
      "propiedad-distributiva",
      "potencias-raices"
    ]
  },
  {
    "id": "ruffini",
    "unitId": "expresiones",
    "title": "División de polinomios: regla de Ruffini",
    "prerequisites": [
      "expresiones-algebraicas"
    ]
  },
  {
    "id": "progresiones",
    "unitId": "expresiones",
    "title": "Progresiones aritméticas y geométricas",
    "prerequisites": [
      "expresiones-algebraicas",
      "potencias-raices"
    ]
  },
  {
    "id": "ecuaciones-cuadraticas",
    "unitId": "expresiones",
    "title": "Ecuaciones de segundo grado",
    "prerequisites": [
      "propiedad-distributiva",
      "potencias-raices"
    ]
  },
  {
    "id": "funcion-cuadratica",
    "unitId": "expresiones",
    "title": "Función cuadrática: vértice, máximos y mínimos",
    "prerequisites": [
      "ecuaciones-cuadraticas",
      "funciones-lineales"
    ]
  },
  {
    "id": "sistemas-ecuaciones",
    "unitId": "expresiones",
    "title": "Sistemas de dos ecuaciones",
    "prerequisites": [
      "ecuaciones-ambos-lados",
      "funciones-lineales"
    ]
  },
  {
    "id": "funciones-exponenciales",
    "unitId": "expresiones",
    "title": "Crecimiento exponencial",
    "prerequisites": [
      "potencias-raices",
      "porcentajes-aplicados",
      "funciones-lineales"
    ]
  },
  {
    "id": "angulos",
    "unitId": "geometria",
    "title": "Ángulos y polígonos",
    "prerequisites": [
      "jerarquia-operaciones"
    ]
  },
  {
    "id": "perimetro-area",
    "unitId": "geometria",
    "title": "Perímetro y área",
    "prerequisites": [
      "jerarquia-operaciones"
    ]
  },
  {
    "id": "circulo",
    "unitId": "geometria",
    "title": "Longitud y área del círculo",
    "prerequisites": [
      "perimetro-area"
    ]
  },
  {
    "id": "volumen",
    "unitId": "geometria",
    "title": "Volumen de prismas y cilindros",
    "prerequisites": [
      "circulo"
    ]
  },
  {
    "id": "pitagoras",
    "unitId": "geometria",
    "title": "Teorema de Pitágoras",
    "prerequisites": [
      "potencias-raices",
      "perimetro-area"
    ]
  },
  {
    "id": "semejanza",
    "unitId": "geometria",
    "title": "Semejanza y escalas",
    "prerequisites": [
      "razones",
      "perimetro-area"
    ]
  },
  {
    "id": "transformaciones",
    "unitId": "geometria",
    "title": "Transformaciones en el plano",
    "prerequisites": [
      "angulos",
      "perimetro-area"
    ]
  },
  {
    "id": "distancia-punto-medio",
    "unitId": "geometria",
    "title": "Distancia y punto medio en el plano",
    "prerequisites": [
      "pitagoras",
      "enteros-suma-resta"
    ]
  },
  {
    "id": "volumen-conos-esferas",
    "unitId": "geometria",
    "title": "Volumen de pirámides, conos y esferas",
    "prerequisites": [
      "volumen",
      "potencias-raices"
    ]
  },
  {
    "id": "trigonometria",
    "unitId": "geometria",
    "title": "Razones trigonométricas",
    "prerequisites": [
      "pitagoras",
      "semejanza"
    ]
  },
  {
    "id": "media-mediana-moda",
    "unitId": "datos",
    "title": "Media, mediana y moda",
    "prerequisites": [
      "jerarquia-operaciones"
    ]
  },
  {
    "id": "probabilidad-simple",
    "unitId": "datos",
    "title": "Probabilidad de un suceso",
    "prerequisites": [
      "fraccion-decimal-porcentaje"
    ]
  },
  {
    "id": "probabilidad-compuesta",
    "unitId": "datos",
    "title": "Experimentos compuestos",
    "prerequisites": [
      "probabilidad-simple",
      "fracciones-producto-cociente"
    ]
  },
  {
    "id": "estadistica-dispersion",
    "unitId": "datos",
    "title": "Dispersión y diagramas de caja",
    "prerequisites": [
      "media-mediana-moda"
    ]
  },
  {
    "id": "combinatoria",
    "unitId": "datos",
    "title": "Técnicas de conteo",
    "prerequisites": [
      "probabilidad-simple",
      "potencias-raices"
    ]
  },
  {
    "id": "probabilidad-condicional",
    "unitId": "datos",
    "title": "Probabilidad condicional y tablas de doble entrada",
    "prerequisites": [
      "probabilidad-compuesta",
      "fraccion-decimal-porcentaje"
    ]
  }
];
