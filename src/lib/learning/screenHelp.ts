import type { Lesson, LearningProgress, Question } from "./domain";

export interface HelpIdea {
  id: string;
  title: string;
  meaning: string;
  example?: string;
  symbol?: string;
}
export interface ScreenHelp {
  id: string;
  title: string;
  description: string;
  ideas: HelpIdea[];
}

// Ejemplos propios del glosario: nunca se usa la respuesta, las pistas ni
// el desarrollo de la pregunta que el alumno está resolviendo.
const SYMBOLS: (HelpIdea & { matches: RegExp })[] = [
  { id: "absolute", symbol: "|x|", title: "Valor absoluto", matches: /(?:^|[\s=(])\|[^|\n]+\||valor absoluto/i,
    meaning: "Las dos barras se leen «valor absoluto». Indican la distancia de un número al cero en la recta numérica. Una distancia nunca es negativa.", example: "|−4| = 4 y |4| = 4: ambos están a cuatro pasos del cero." },
  { id: "root", symbol: "√", title: "Raíz cuadrada", matches: /√|raíz cuadrada/i,
    meaning: "Se lee «raíz cuadrada». Busca el número no negativo que, multiplicado por sí mismo, da el número que está dentro.", example: "√9 = 3 porque 3 × 3 = 9." },
  { id: "powers", symbol: "a²", title: "Exponente", matches: /[²³⁴⁵⁶⁷⁸⁹⁰¹]|\^|exponente/i,
    meaning: "El número pequeño de arriba indica cuántas veces se multiplica la base por sí misma. No significa multiplicar la base por el exponente.", example: "2³ = 2 × 2 × 2 = 8." },
  { id: "inequality", symbol: "< >", title: "Comparar números", matches: /[<>≤≥]|menor que|mayor que/i,
    meaning: "< significa «menor que» y >, «mayor que». La abertura mira al número mayor. ≤ y ≥ también permiten que sean iguales.", example: "2 < 5 se lee «dos es menor que cinco»." },
  { id: "pi", symbol: "π", title: "Pi", matches: /π/,
    meaning: "Esta letra se lee «pi». Es la razón entre la longitud de una circunferencia y su diámetro. Vale aproximadamente 3,14.", example: "Una circunferencia de diámetro 1 mide aproximadamente 3,14 de largo." },
  { id: "percent", symbol: "%", title: "Porcentaje", matches: /%|porcentaje/i,
    meaning: "Se lee «por ciento»: indica cuántas partes se toman de cada cien partes iguales.", example: "25 % significa 25 de cada 100, lo mismo que una cuarta parte." },
  { id: "fraction", symbol: "a/b", title: "Fracción", matches: /\d\s*\/\s*\d|numerador|denominador/i,
    meaning: "La barra separa el numerador (arriba o a la izquierda) del denominador (abajo o a la derecha). El denominador dice en cuántas partes iguales se divide la unidad; el numerador, cuántas se toman.", example: "3/4 son tres de cuatro partes iguales. El denominador no puede ser cero." },
  { id: "conditional", symbol: "P(A|B)", title: "Probabilidad condicional", matches: /P\([^)]*\|[^)]*\)|probabilidad condicional/i,
    meaning: "La barra dentro de P(A|B) se lee «dado que». Pregunta por la probabilidad de A contando solo los casos en que ocurre B; aquí la barra no es valor absoluto.", example: "Para saber la probabilidad de sacar una ficha roja dado que es redonda, mira solo las fichas redondas." },
  { id: "not-equal", symbol: "≠", title: "Distinto de", matches: /≠/,
    meaning: "El signo igual tachado significa que los dos valores son diferentes.", example: "3 ≠ 5 se lee «tres es distinto de cinco»." },
  { id: "approx", symbol: "≈", title: "Aproximadamente igual", matches: /≈/,
    meaning: "Estas dos ondas indican que un valor está cerca de otro, pero no tiene por qué ser exactamente igual.", example: "1/3 ≈ 0,33: el decimal completo sigue con más treses." },
  { id: "multiply", symbol: "× ·", title: "Multiplicación", matches: /×|\d\s*·\s*\d/,
    meaning: "La cruz × y el punto centrado · pueden indicar multiplicación. En una expresión con varias operaciones, las multiplicaciones se resuelven antes que las sumas, salvo que los paréntesis indiquen otra cosa.", example: "3 × 4 significa sumar tres grupos de cuatro." },
  { id: "negative", symbol: "−", title: "Signo negativo", matches: /(?:^|[\s(=])[-−]\d/,
    meaning: "Delante de un número, el signo menos indica que está por debajo de cero. En la recta numérica los negativos quedan a la izquierda del cero.", example: "−2 °C son dos grados por debajo de cero." },
];
const normalize = (text: string) => text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

export function ideasForText(text: string, vocabulary: Lesson["vocabulary"] = []): HelpIdea[] {
  const symbols = SYMBOLS.filter((idea) => idea.matches.test(text));
  const normalized = normalize(text);
  const words = vocabulary.filter(({ term }) => normalized.includes(normalize(term)) &&
    !symbols.some((symbol) => normalize(symbol.title) === normalize(term)));
  return [
    ...symbols.map(({ matches: _matches, ...idea }) => { void _matches; return idea; }),
    ...words.map(({ term, meaning }) => ({ id: `word:${normalize(term)}`, title: term, meaning })),
  ];
}

export function questionHelp(lesson: Lesson, question: Question): ScreenHelp {
  return {
    id: `${lesson.id}:${question.id}`,
    title: "Lee el lenguaje del problema",
    description: "Primero identifica qué te preguntan y qué significa cada símbolo. Después decide qué operación o idea necesitas. Puedes responder con calma.",
    ideas: ideasForText([question.prompt, ...(question.choices?.map((choice) => choice.label) ?? [])].join(" "), lesson.vocabulary),
  };
}

export function lessonScreenHelp(lesson: Lesson, progress: LearningProgress, question?: Question): ScreenHelp {
  if (question) return questionHelp(lesson, question);
  const section = progress.stage === "class" ? lesson.sections[progress.index] : undefined;
  const example = progress.stage === "examples" ? lesson.examples[progress.index] : undefined;
  const text = section ? [section.title, ...section.paragraphs, section.formula].join(" ") :
    example ? [example.prompt, ...example.steps.flatMap((step) => [step.math, step.why]), example.conclusion].join(" ") : "";
  return {
    id: `${lesson.id}:${progress.stage}:${progress.index}`,
    title: section ? "Una idea, paso a paso" : example ? "Entiende el ejemplo" : "Tu recorrido en esta clase",
    description: section ? "Lee la explicación y prueba los controles del gráfico: observa qué cambia y qué se mantiene. Estos son los símbolos y las palabras que aparecen en esta parte." :
      example ? "Cada paso muestra una operación y explica por qué se hace. Intenta anticipar el siguiente antes de continuar." :
        "Primero comprende la idea, después practica y al final comprueba qué puedes resolver por tu cuenta. Puedes volver a la explicación cuando lo necesites.",
    ideas: ideasForText(text, lesson.vocabulary),
  };
}

export function navigationHelp(pathname: string): ScreenHelp {
  const page = pathname.split("/")[3] ?? "inicio";
  const activity = pathname.split("/")[4];
  if (activity === "ubicacion") return { id: pathname, title: "Encuentra dónde empezar", description: "Resuelve lo que recuerdes sin pistas. Si algo todavía es nuevo para ti, elige «Todavía no lo sé»: así podremos recomendarte una clase adecuada. Esta evaluación no da estrellas ni marca clases como terminadas.", ideas: [] };
  if (activity === "diario" || activity?.startsWith("repaso-")) return { id: pathname, title: "Recordar también se practica", description: "Aquí vuelven ideas que ya estudiaste. Intenta recordarlas antes de pedir ayuda. Si te cuesta, puedes consultar una pista: el repaso se adaptará a lo que necesitas reforzar.", ideas: [] };
  const descriptions: Record<string, [string, string]> = {
    inicio: ["Tu siguiente paso", "Empieza por la clase recomendada o vuelve a una que ya comenzaste. «Repasar hoy» te ayuda a recordar ideas de días anteriores; no hace falta aprenderlo todo de una vez."],
    aprende: ["Aprende antes de practicar", "Elige una clase: recibirás una explicación, verás ejemplos razonados y practicarás con ayuda antes de resolver por tu cuenta. Puedes volver a cualquier parte de la clase."],
    practicar: ["Practica a tu ritmo", "Elige una idea que quieras reforzar. Puedes pedir pistas y consultar la explicación. Los minijuegos sirven para practicar la matemática: un fallo de reflejos no cuenta como una respuesta matemática."],
    aventura: ["Usa lo que sabes", "Explora la situación, identifica los datos y decide qué matemáticas necesitas. Prueba tu plan y revisa lo que sucede para mejorarlo."],
  };
  const [title, description] = descriptions[page] ?? ["Mira, piensa y prueba", "Lee el objetivo de esta pantalla antes de empezar. Identifica los datos y los controles disponibles; puedes avanzar a tu ritmo y volver a las clases para repasar una idea."];
  return { id: pathname, title, description, ideas: [] };
}
