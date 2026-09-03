/**
 * Constructores de pistas de 3 niveles (conceptual → primer paso → casi
 * completo), uno por cada `kind` de problema de los generadores en
 * arithmetic.ts/algebra.ts/geometria.ts/medicion.ts/logica.ts/
 * aritmeticaMcdMcm.ts. Cada generador ya tiene, en el momento de construir
 * el `Problem`, todas las variables que necesita su pista — solo hace falta
 * llamar a la función correspondiente con esas mismas variables.
 */

type Hints = [string, string, string];

// ── Aritmética ──────────────────────────────────────────────────────────

export function sumaHints(a: number, b: number, answer: number): Hints {
  return [
    `Piensa en juntar ${a} y ${b} en un solo grupo.`,
    `Empieza en ${a} y avanza ${b} más.`,
    `${a} + ${b} = ${answer}.`,
  ];
}

export function restaHints(a: number, b: number, answer: number): Hints {
  return [
    `Piensa en quitarle ${b} a ${a}.`,
    `Empieza en ${a} y retrocede ${b}.`,
    `${a} − ${b} = ${answer}.`,
  ];
}

export function decenasHints(total: number): Hints {
  return [
    `Agrupa de a 10: ¿cuántos grupos completos de 10 caben en ${total}?`,
    `${total} tiene una decena completa (10) y el resto son sueltas.`,
    `${total} = 1 decena (10) + ${total - 10} sueltas.`,
  ];
}

export function multiplicacionHints(a: number, b: number, answer: number): Hints {
  return [
    `Multiplicar es sumar ${a} repetido ${b} veces.`,
    `Suma ${a} un total de ${b} veces.`,
    `${a} × ${b} = ${answer}.`,
  ];
}

export function divisionHints(a: number, b: number, answer: number): Hints {
  return [
    `Piensa: ¿por cuánto hay que multiplicar ${b} para llegar a ${a}?`,
    `Reparte ${a} en ${b} grupos iguales.`,
    `${a} ÷ ${b} = ${answer}, porque ${b} × ${answer} = ${a}.`,
  ];
}

export function fraccionMismoDenominadorHints(num1: number, num2: number, denom: number, answer: number): Hints {
  return [
    `Cuando el denominador es el mismo, solo se suman los numeradores.`,
    `Suma ${num1} y ${num2}; el denominador sigue siendo ${denom}.`,
    `${num1}/${denom} + ${num2}/${denom} = ${answer}/${denom}.`,
  ];
}

export function sumaRestaDecimalHints(a: number, b: number, isAdd: boolean, answer: number): Hints {
  const verbo = isAdd ? "sumar" : "restar";
  const signo = isAdd ? "+" : "−";
  return [
    `Alinea el punto decimal antes de ${verbo}.`,
    `${verbo === "sumar" ? "Suma" : "Resta"} como números enteros y después vuelve a poner el punto.`,
    `${a} ${signo} ${b} = ${answer}.`,
  ];
}

export function porcentajeHints(pct: number, base: number, answer: number): Hints {
  return [
    `Recuerda: X% significa X de cada 100.`,
    `${pct}% de ${base} es ${base} × ${pct}/100.`,
    `${base} × ${pct}/100 = ${answer}.`,
  ];
}

export function enterosHints(a: number, op: "+" | "−" | "×", b: number, answer: number): Hints {
  return [
    `Con negativos, primero fíjate en los signos.`,
    op === "×"
      ? `Multiplica los valores y decide el signo del resultado.`
      : `Piensa en una recta numérica: ${a} y muévete según ${op} ${b}.`,
    `(${a}) ${op} ${b} = ${answer}.`,
  ];
}

// ── MCD / MCM / fracciones con distinto denominador ─────────────────────

export function mcdHints(a: number, b: number, answer: number): Hints {
  return [
    `Busca los divisores de cada número y compáralos.`,
    `Los divisores de ${a} y de ${b} tienen algunos en común — busca el más grande.`,
    `El mayor divisor común de ${a} y ${b} es ${answer}.`,
  ];
}

export function mcmHints(a: number, b: number, answer: number): Hints {
  return [
    `Busca la tabla de multiplicar de cada número.`,
    `Recorre los múltiplos de ${a} y de ${b} hasta encontrar uno que se repita.`,
    `El menor múltiplo común de ${a} y ${b} es ${answer}.`,
  ];
}

export function fraccionDistintoDenominadorHints(
  n1: number,
  d1: number,
  n2: number,
  d2: number,
  common: number,
  answer: number,
): Hints {
  return [
    `Antes de sumar, hay que convertir las dos fracciones al mismo denominador.`,
    `El denominador común es ${common}: convierte ${n1}/${d1} y ${n2}/${d2} a fracciones de ${common}.`,
    `Convertidas, se suman los numeradores: el resultado es ${answer}/${common}.`,
  ];
}

// ── Álgebra ─────────────────────────────────────────────────────────────

export function patronHints(): Hints {
  return [
    `Busca cuántos símbolos se repiten antes de empezar de nuevo.`,
    `Cuenta el patrón desde el principio y ve dónde te quedaste.`,
    `El símbolo que sigue es el que continúa el mismo ciclo desde el inicio.`,
  ];
}

export function balanzaHints(a: number, total: number, missing: number): Hints {
  return [
    `La balanza está equilibrada: los dos lados valen lo mismo.`,
    `Si un lado tiene ${a} + x y pesa igual que ${total}, x es lo que falta para llegar a ${total}.`,
    `${total} − ${a} = ${missing}.`,
  ];
}

export function ecuacionSumaHints(b: number, total: number, x: number): Hints {
  return [
    `Para despejar x, deshaz la suma con la operación contraria.`,
    `Resta ${b} de los dos lados de la ecuación.`,
    `${total} − ${b} = ${x}.`,
  ];
}

export function ecuacionRestaHints(b: number, diff: number, x: number): Hints {
  return [
    `Para despejar x, deshaz la resta con la operación contraria.`,
    `Suma ${b} de los dos lados de la ecuación.`,
    `${diff} + ${b} = ${x}.`,
  ];
}

export function ecuacionMultiplicacionHints(m: number, product: number, x: number): Hints {
  return [
    `Para despejar x, deshaz la multiplicación con la operación contraria.`,
    `Divide los dos lados de la ecuación entre ${m}.`,
    `${product} ÷ ${m} = ${x}.`,
  ];
}

export function proporcionesHints(unitQty: number, unitCost: number, targetQty: number, answer: number): Hints {
  return [
    `Encuentra primero cuánto cuesta uno solo.`,
    `${unitQty} cuestan ${unitCost}, así que uno cuesta ${unitCost} ÷ ${unitQty}.`,
    `${unitCost} ÷ ${unitQty} × ${targetQty} = ${answer}.`,
  ];
}

export function evaluarExpresionHints(x: number, m: number, b: number, answer: number): Hints {
  return [
    `Reemplaza x por su valor y sigue el orden: primero multiplicar, después sumar.`,
    `${m} × ${x} = ${m * x}.`,
    `${m * x} + ${b} = ${answer}.`,
  ];
}

export function ecuacionDosPasosHints(m: number, b: number, total: number, x: number): Hints {
  const paso1 = total - b;
  return [
    `Esta ecuación se despeja en dos pasos: primero deshaz la suma, después la multiplicación.`,
    `Resta ${b} de los dos lados: ${total} − ${b} = ${paso1}, así que ${m}x = ${paso1}.`,
    `${paso1} ÷ ${m} = ${x}.`,
  ];
}

export function desigualdadHints(b: number, answer: number): Hints {
  return [
    `x > ${b} significa "mayor que ${b}", no "igual a ${b}".`,
    `El menor número entero mayor que ${b} es el siguiente en la fila de números.`,
    `${b} + 1 = ${answer}.`,
  ];
}

export function funcionHints(m: number, b: number, x: number, answer: number): Hints {
  return [
    `Una función es una regla: reemplaza x por el valor que te dan.`,
    `${m} × ${x} = ${m * x}.`,
    `${m * x} ${b >= 0 ? "+" : "−"} ${Math.abs(b)} = ${answer}.`,
  ];
}

export function cuadraticaHints(square: number, root: number): Hints {
  return [
    `x² = ${square} significa que x multiplicado por sí mismo da ${square}.`,
    `Busca un número que multiplicado por sí mismo dé ${square}.`,
    `√${square} = ${root}.`,
  ];
}

// ── Geometría ───────────────────────────────────────────────────────────

export function ladosHints(nombre: string, sides: number): Hints {
  return [
    `Piensa en la forma del ${nombre} y cuenta sus lados rectos.`,
    `Dibuja un ${nombre} mentalmente y cuenta cada lado uno por uno.`,
    `El ${nombre} tiene ${sides} lados.`,
  ];
}

export function verticesHints(nombre: string, sides: number): Hints {
  return [
    `En un polígono, cada esquina (vértice) está donde se juntan dos lados.`,
    `El número de vértices es igual al número de lados del ${nombre}.`,
    `El ${nombre} tiene ${sides} vértices.`,
  ];
}

export function perimetroHints(largo: number, ancho: number, answer: number): Hints {
  return [
    `El perímetro es la suma de los cuatro lados del rectángulo.`,
    `Suma largo + ancho y luego duplica: (${largo} + ${ancho}) × 2.`,
    `(${largo} + ${ancho}) × 2 = ${answer}.`,
  ];
}

export function areaRectanguloHints(largo: number, ancho: number, answer: number): Hints {
  return [
    `El área de un rectángulo es largo por ancho.`,
    `Multiplica ${largo} × ${ancho}.`,
    `${largo} × ${ancho} = ${answer}.`,
  ];
}

export function areaTrianguloHints(base: number, altura: number, answer: number): Hints {
  return [
    `El área de un triángulo es la mitad de base por altura.`,
    `Multiplica ${base} × ${altura} y después divide entre 2.`,
    `(${base} × ${altura}) ÷ 2 = ${answer}.`,
  ];
}

export function anguloSuplementarioHints(grados: number, answer: number): Hints {
  return [
    `Los ángulos suplementarios suman 180°.`,
    `Resta ${grados} de 180.`,
    `180 − ${grados} = ${answer}.`,
  ];
}

export function anguloComplementarioHints(grados: number, answer: number): Hints {
  return [
    `Los ángulos complementarios suman 90°.`,
    `Resta ${grados} de 90.`,
    `90 − ${grados} = ${answer}.`,
  ];
}

export function volumenHints(largo: number, ancho: number, alto: number, answer: number): Hints {
  return [
    `El volumen de un prisma rectangular es largo × ancho × alto.`,
    `Multiplica ${largo} × ${ancho} primero, y después por ${alto}.`,
    `${largo} × ${ancho} × ${alto} = ${answer}.`,
  ];
}

export function coordenadasHints(x: number, dx: number, answer: number): Hints {
  const direccion = dx >= 0 ? "suma" : "resta";
  return [
    `Moverse a la derecha suma a la coordenada x; moverse a la izquierda resta.`,
    `${direccion === "suma" ? "Suma" : "Resta"} ${Math.abs(dx)} a ${x}.`,
    `${x} ${dx >= 0 ? "+" : "−"} ${Math.abs(dx)} = ${answer}.`,
  ];
}

export function pitagorasHipotenusaHints(a: number, b: number, answer: number): Hints {
  return [
    `El teorema de Pitágoras relaciona los catetos con la hipotenusa: a² + b² = c².`,
    `${a}² + ${b}² = ${a * a} + ${b * b} = ${a * a + b * b}.`,
    `√${a * a + b * b} = ${answer}.`,
  ];
}

export function pitagorasCatetoHints(c: number, a: number, answer: number): Hints {
  return [
    `El teorema de Pitágoras relaciona los catetos con la hipotenusa: a² + b² = c².`,
    `${c}² − ${a}² = ${c * c} − ${a * a} = ${c * c - a * a}.`,
    `√${c * c - a * a} = ${answer}.`,
  ];
}

export function semejanzaHints(scale: number, smallSide: number, answer: number): Hints {
  return [
    `En figuras semejantes, todos los lados se multiplican por la misma razón de escala.`,
    `Multiplica el lado pequeño por la razón de escala: ${smallSide} × ${scale}.`,
    `${smallSide} × ${scale} = ${answer}.`,
  ];
}

// ── Medición y datos ────────────────────────────────────────────────────

export function compararHints(a: number, b: number, answer: number): Hints {
  return [
    `Piensa cuál número está más adelante al contar.`,
    `Compara dígito por dígito, empezando por el de más peso.`,
    `El mayor entre ${a} y ${b} es ${answer}.`,
  ];
}

export function dineroHints(monedas5: number, monedas10: number, answer: number): Hints {
  return [
    `Suma el valor de cada tipo de moneda por separado.`,
    `${monedas5} × 5 = ${monedas5 * 5}, y ${monedas10} × 10 = ${monedas10 * 10}.`,
    `${monedas5 * 5} + ${monedas10 * 10} = ${answer}.`,
  ];
}

export function tiempoHints(inicio: number, duracion: number, answer: number): Hints {
  return [
    `El reloj da la vuelta después de las 12.`,
    `Suma ${inicio} + ${duracion} y, si pasa de 12, resta 12.`,
    `${inicio} + ${duracion} da como hora final ${answer}.`,
  ];
}

export function conversionUnidadesHints(from: string, to: string, amount: number, factor: number, answer: number): Hints {
  return [
    `Fíjate cuántos ${to} equivalen a un ${from.replace(/s$/, "")}.`,
    `Multiplica ${amount} por ${factor}.`,
    `${amount} × ${factor} = ${answer}.`,
  ];
}

export function mediaHints(values: number[], total: number, count: number, answer: number): Hints {
  return [
    `El promedio reparte el total en partes iguales.`,
    `Suma todos los valores (${values.join(" + ")} = ${total}) y divide entre cuántos son.`,
    `${total} ÷ ${count} = ${answer}.`,
  ];
}

export function medianaHints(sorted: number[], answer: number): Hints {
  return [
    `La mediana es el valor de en medio, una vez ordenados de menor a mayor.`,
    `Ordenados: ${sorted.join(", ")}. Busca el que queda justo en el centro.`,
    `El valor central es ${answer}.`,
  ];
}

export function modaHints(answer: number): Hints {
  return [
    `La moda es el valor que aparece más veces.`,
    `Cuenta cuántas veces se repite cada número de la lista.`,
    `El que más se repite es ${answer}.`,
  ];
}

export function rangoHints(max: number, min: number, answer: number): Hints {
  return [
    `El rango mide qué tan separados están los datos: el más grande menos el más chico.`,
    `Resta el mínimo (${min}) del máximo (${max}).`,
    `${max} − ${min} = ${answer}.`,
  ];
}

export function probabilidadHints(favorable: number, total: number, answer: number): Hints {
  return [
    `La probabilidad es "casos que sirven" entre "casos totales".`,
    `${favorable} de ${total} son rojas: eso es ${favorable}/${total}.`,
    `${favorable}/${total} × 100 = ${answer}%.`,
  ];
}

export function conteoHints(opciones1: number, opciones2: number, answer: number): Hints {
  return [
    `Por cada opción del primer grupo, puedes combinarla con cada opción del segundo.`,
    `Multiplica el número de camisetas por el número de pantalones.`,
    `${opciones1} × ${opciones2} = ${answer}.`,
  ];
}

// ── Lógica (problemas en palabras) ──────────────────────────────────────

export function problemaSumaHints(a: number, b: number, answer: number): Hints {
  return [
    `"Te regalan más" significa que el total crece: hay que sumar.`,
    `Suma lo que ya tenías (${a}) con lo nuevo (${b}).`,
    `${a} + ${b} = ${answer}.`,
  ];
}

export function problemaRestaHints(a: number, b: number, answer: number): Hints {
  return [
    `"Se reventaron" significa que el total baja: hay que restar.`,
    `Resta lo que se perdió (${b}) de lo que tenías (${a}).`,
    `${a} − ${b} = ${answer}.`,
  ];
}

export function problemaDivisionHints(totalGalletas: number, platos: number, answer: number): Hints {
  return [
    `"Repartir en partes iguales" es dividir.`,
    `Reparte ${totalGalletas} galletas entre ${platos} platos por igual.`,
    `${totalGalletas} ÷ ${platos} = ${answer}.`,
  ];
}

export function problemaDosPasosHints(inicial: number, gana: number, pierde: number, answer: number): Hints {
  return [
    `Este problema tiene dos movimientos: uno que suma y otro que resta.`,
    `Primero suma lo que ganaste: ${inicial} + ${gana} = ${inicial + gana}.`,
    `Después resta lo que perdiste: ${inicial + gana} − ${pierde} = ${answer}.`,
  ];
}

export function problemaMultiplicacionSumaHints(paquetes: number, porPaquete: number, yaTenia: number, answer: number): Hints {
  return [
    `Primero calcula cuántos lápices nuevos compraste, después súmalos a los que ya tenías.`,
    `${paquetes} × ${porPaquete} = ${paquetes * porPaquete}.`,
    `${paquetes * porPaquete} + ${yaTenia} = ${answer}.`,
  ];
}

export function datoIrrelevanteHints(edadA: number, edadB: number, answer: number): Hints {
  return [
    `No todos los datos del problema sirven — la estatura no tiene nada que ver con la edad.`,
    `Solo importan las edades: ${edadA} y ${edadB}.`,
    `${edadA} − ${edadB} = ${answer}.`,
  ];
}

export function presupuestoHints(dinero: number, gasto1: number, gasto2: number, answer: number): Hints {
  return [
    `Cada compra reduce el dinero que te queda.`,
    `Resta las dos compras: ${dinero} − ${gasto1} − ${gasto2}.`,
    `${dinero} − ${gasto1} − ${gasto2} = ${answer}.`,
  ];
}

export function redondeoHints(n: number, answer: number): Hints {
  return [
    `Fíjate en el dígito de las unidades para decidir si subes o bajas a la decena.`,
    `${n} está entre ${Math.floor(n / 10) * 10} y ${Math.floor(n / 10) * 10 + 10}.`,
    `Redondeado a la decena más cercana, ${n} es ${answer}.`,
  ];
}

export function deduccionHints(add: number, result: number, answer: number): Hints {
  return [
    `Si sumar te llevó al resultado, para volver al número original hay que restar.`,
    `Resta lo que se sumó (${add}) del resultado (${result}).`,
    `${result} − ${add} = ${answer}.`,
  ];
}

export function optimizacionHints(dinero: number, precio: number, answer: number): Hints {
  return [
    `Piensa cuántas veces cabe el precio dentro del dinero que tienes.`,
    `Divide ${dinero} entre ${precio} y quédate solo con la parte entera.`,
    `${dinero} ÷ ${precio} = ${answer} globos completos.`,
  ];
}
