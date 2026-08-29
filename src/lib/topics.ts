export interface TopicLabel {
  title: string;
  emoji: string;
}

const LABELS: Record<string, Record<number, TopicLabel>> = {
  aritmetica: {
    1: { title: "Sumas hasta 5", emoji: "➕" },
    2: { title: "Sumas y restas hasta 10", emoji: "➖" },
    3: { title: "Sumas y restas hasta 100", emoji: "🔢" },
    4: { title: "Sumas y restas hasta 1000", emoji: "🧮" },
    5: { title: "Multiplicación", emoji: "✖️" },
    6: { title: "División", emoji: "➗" },
    7: { title: "Fracciones", emoji: "🍕" },
    8: { title: "Decimales", emoji: "🔟" },
    9: { title: "Porcentajes", emoji: "💯" },
    10: { title: "Números enteros", emoji: "🌡️" },
  },
  algebra: {
    1: { title: "Patrones", emoji: "🔁" },
    2: { title: "Balanza (igualdad)", emoji: "⚖️" },
    3: { title: "Ecuaciones simples", emoji: "🧩" },
    4: { title: "Ecuaciones (× y −)", emoji: "🧩" },
    5: { title: "Proporciones", emoji: "🔀" },
    6: { title: "Evaluar expresiones", emoji: "🔡" },
    7: { title: "Ecuaciones de dos pasos", emoji: "🧮" },
    8: { title: "Desigualdades", emoji: "📏" },
    9: { title: "Funciones", emoji: "🎛️" },
    10: { title: "Ecuaciones cuadráticas", emoji: "🌀" },
  },
  geometria: {
    1: { title: "Lados de figuras", emoji: "🔺" },
    2: { title: "Vértices", emoji: "🔹" },
    3: { title: "Perímetro", emoji: "📏" },
    4: { title: "Área de rectángulos", emoji: "📐" },
    5: { title: "Área de triángulos", emoji: "🔻" },
    6: { title: "Ángulos", emoji: "📐" },
    7: { title: "Volumen", emoji: "📦" },
    8: { title: "Coordenadas", emoji: "📍" },
    9: { title: "Teorema de Pitágoras", emoji: "📐" },
    10: { title: "Figuras semejantes", emoji: "🔍" },
  },
  medicion: {
    1: { title: "Comparar números", emoji: "⚖️" },
    2: { title: "Dinero", emoji: "💰" },
    3: { title: "Tiempo", emoji: "⏰" },
    4: { title: "Conversión de unidades", emoji: "📏" },
    5: { title: "Media (promedio)", emoji: "📊" },
    6: { title: "Mediana", emoji: "📊" },
    7: { title: "Moda", emoji: "📊" },
    8: { title: "Rango", emoji: "📊" },
    9: { title: "Probabilidad", emoji: "🎲" },
    10: { title: "Conteo", emoji: "🧮" },
  },
  logica: {
    1: { title: "Problemas de suma", emoji: "🍎" },
    2: { title: "Problemas de resta", emoji: "🎈" },
    3: { title: "Problemas de división", emoji: "🍪" },
    4: { title: "Problemas de dos pasos", emoji: "👫" },
    5: { title: "Problemas combinados", emoji: "✏️" },
    6: { title: "Datos que sobran", emoji: "🔍" },
    7: { title: "Presupuesto", emoji: "💵" },
    8: { title: "Redondeo", emoji: "🎯" },
    9: { title: "Deducción", emoji: "🤔" },
    10: { title: "Optimización", emoji: "🎈" },
  },
};

export function getTopicLabel(strandSlug: string, difficulty: number): TopicLabel {
  return LABELS[strandSlug]?.[difficulty] ?? { title: `Nivel ${difficulty}`, emoji: "🔢" };
}
