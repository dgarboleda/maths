/**
 * Evaluador de expresiones para la Currícula personalizada — Fase 20
 * (docs/level-editor-plan-v2.md §7.6). Parser propio (descenso recursivo →
 * AST → eval), sin dependencias, ~200 líneas. **Nunca `eval` ni
 * `new Function`**, por dos razones documentadas en el plan:
 *
 * 1. Cloudflare Workers prohíbe `new Function` (ver el comentario de
 *    `src/lib/firebase.ts` sobre por qué `firebase/firestore` se importa
 *    perezosamente: `protobufjs` compila con `new Function` y rompe
 *    cualquier página).
 * 2. Una expresión acá es contenido escrito por el padre y persistido en
 *    Firestore — evaluarla como código sería una inyección.
 *
 * Soporta: `+ - * / % ^` (potencia, asociativa a la derecha), unario `- !`,
 * paréntesis, comparadores `< <= > >= == !=`, lógicos `&& ||`, y funciones
 * `abs min max round floor ceil gcd lcm sqrt pow`. Todos los valores son
 * `number`: las comparaciones y operadores lógicos producen `1`/`0`.
 */

export type ExprNode =
  | { kind: "num"; value: number }
  | { kind: "var"; name: string }
  | { kind: "unary"; op: "-" | "!"; arg: ExprNode }
  | { kind: "binary"; op: string; left: ExprNode; right: ExprNode }
  | { kind: "call"; name: string; args: ExprNode[] };

export type ExprParseResult = { ast: ExprNode } | { error: string; position: number };

export class ExprEvalError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ExprEvalError";
  }
}

/* ════════════════════════════════════════════════════════════════════════
 * TOKENIZER
 * ════════════════════════════════════════════════════════════════════════ */

type TokenType = "num" | "ident" | "op" | "lparen" | "rparen" | "comma" | "end";
interface Token {
  type: TokenType;
  value: string;
  position: number;
}

const MULTI_CHAR_OPS = ["<=", ">=", "==", "!=", "&&", "||"];

function tokenize(src: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (/\s/.test(c)) {
      i++;
      continue;
    }
    if (c === "(") {
      tokens.push({ type: "lparen", value: c, position: i });
      i++;
      continue;
    }
    if (c === ")") {
      tokens.push({ type: "rparen", value: c, position: i });
      i++;
      continue;
    }
    if (c === ",") {
      tokens.push({ type: "comma", value: c, position: i });
      i++;
      continue;
    }
    if (/[0-9]/.test(c) || (c === "." && /[0-9]/.test(src[i + 1] ?? ""))) {
      const start = i;
      while (i < src.length && /[0-9.]/.test(src[i])) i++;
      tokens.push({ type: "num", value: src.slice(start, i), position: start });
      continue;
    }
    if (/[a-zA-Z_]/.test(c)) {
      const start = i;
      while (i < src.length && /[a-zA-Z0-9_]/.test(src[i])) i++;
      tokens.push({ type: "ident", value: src.slice(start, i), position: start });
      continue;
    }
    const two = src.slice(i, i + 2);
    if (MULTI_CHAR_OPS.includes(two)) {
      tokens.push({ type: "op", value: two, position: i });
      i += 2;
      continue;
    }
    if ("+-*/%^<>!".includes(c)) {
      tokens.push({ type: "op", value: c, position: i });
      i++;
      continue;
    }
    throw new ParseSyntaxError(`Carácter inesperado "${c}"`, i);
  }
  tokens.push({ type: "end", value: "", position: src.length });
  return tokens;
}

class ParseSyntaxError extends Error {
  position: number;
  constructor(message: string, position: number) {
    super(message);
    this.position = position;
  }
}

/* ════════════════════════════════════════════════════════════════════════
 * PARSER — descenso recursivo, un nivel de función por nivel de precedencia
 * (de menor a mayor): or, and, equality, relational, additive,
 * multiplicative, unary, power, primary.
 * ════════════════════════════════════════════════════════════════════════ */

class Parser {
  private tokens: Token[];
  private pos = 0;

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  private peek(): Token {
    return this.tokens[this.pos];
  }

  private next(): Token {
    return this.tokens[this.pos++];
  }

  private expectOp(op: string): void {
    const t = this.peek();
    if (t.type !== "op" || t.value !== op) {
      throw new ParseSyntaxError(`Se esperaba "${op}"`, t.position);
    }
    this.pos++;
  }

  parse(): ExprNode {
    const node = this.parseOr();
    if (this.peek().type !== "end") {
      throw new ParseSyntaxError(`Token inesperado "${this.peek().value}"`, this.peek().position);
    }
    return node;
  }

  private parseOr(): ExprNode {
    let left = this.parseAnd();
    while (this.peek().type === "op" && this.peek().value === "||") {
      this.next();
      left = { kind: "binary", op: "||", left, right: this.parseAnd() };
    }
    return left;
  }

  private parseAnd(): ExprNode {
    let left = this.parseEquality();
    while (this.peek().type === "op" && this.peek().value === "&&") {
      this.next();
      left = { kind: "binary", op: "&&", left, right: this.parseEquality() };
    }
    return left;
  }

  private parseEquality(): ExprNode {
    let left = this.parseRelational();
    while (this.peek().type === "op" && (this.peek().value === "==" || this.peek().value === "!=")) {
      const op = this.next().value;
      left = { kind: "binary", op, left, right: this.parseRelational() };
    }
    return left;
  }

  private parseRelational(): ExprNode {
    let left = this.parseAdditive();
    while (this.peek().type === "op" && ["<", "<=", ">", ">="].includes(this.peek().value)) {
      const op = this.next().value;
      left = { kind: "binary", op, left, right: this.parseAdditive() };
    }
    return left;
  }

  private parseAdditive(): ExprNode {
    let left = this.parseMultiplicative();
    while (this.peek().type === "op" && (this.peek().value === "+" || this.peek().value === "-")) {
      const op = this.next().value;
      left = { kind: "binary", op, left, right: this.parseMultiplicative() };
    }
    return left;
  }

  private parseMultiplicative(): ExprNode {
    let left = this.parseUnary();
    while (this.peek().type === "op" && ["*", "/", "%"].includes(this.peek().value)) {
      const op = this.next().value;
      left = { kind: "binary", op, left, right: this.parseUnary() };
    }
    return left;
  }

  private parseUnary(): ExprNode {
    const t = this.peek();
    if (t.type === "op" && (t.value === "-" || t.value === "!")) {
      this.next();
      return { kind: "unary", op: t.value as "-" | "!", arg: this.parseUnary() };
    }
    return this.parsePower();
  }

  private parsePower(): ExprNode {
    const base = this.parsePrimary();
    if (this.peek().type === "op" && this.peek().value === "^") {
      this.next();
      // Asociativa a la derecha, y el exponente puede volver a tener unario
      // (2^-1) — por eso vuelve a `parseUnary`, no a `parsePower`.
      const exponent = this.parseUnary();
      return { kind: "binary", op: "^", left: base, right: exponent };
    }
    return base;
  }

  private parsePrimary(): ExprNode {
    const t = this.peek();
    if (t.type === "num") {
      this.next();
      return { kind: "num", value: Number(t.value) };
    }
    if (t.type === "lparen") {
      this.next();
      const inner = this.parseOr();
      if (this.peek().type !== "rparen") throw new ParseSyntaxError('Falta ")"', this.peek().position);
      this.next();
      return inner;
    }
    if (t.type === "ident") {
      this.next();
      if (this.peek().type === "lparen") {
        this.next();
        const args: ExprNode[] = [];
        if (this.peek().type !== "rparen") {
          args.push(this.parseOr());
          while (this.peek().type === "comma") {
            this.next();
            args.push(this.parseOr());
          }
        }
        if (this.peek().type !== "rparen") throw new ParseSyntaxError('Falta ")"', this.peek().position);
        this.next();
        return { kind: "call", name: t.value, args };
      }
      return { kind: "var", name: t.value };
    }
    throw new ParseSyntaxError(t.type === "end" ? "Expresión incompleta" : `Token inesperado "${t.value}"`, t.position);
  }
}

export function parseExpr(src: string): ExprParseResult {
  try {
    const tokens = tokenize(src);
    const ast = new Parser(tokens).parse();
    return { ast };
  } catch (err) {
    if (err instanceof ParseSyntaxError) return { error: err.message, position: err.position };
    return { error: err instanceof Error ? err.message : String(err), position: 0 };
  }
}

/* ════════════════════════════════════════════════════════════════════════
 * EVAL
 * ════════════════════════════════════════════════════════════════════════ */

function gcd2(a: number, b: number): number {
  a = Math.abs(Math.trunc(a));
  b = Math.abs(Math.trunc(b));
  while (b !== 0) [a, b] = [b, a % b];
  return a;
}

const FUNCTIONS: Record<string, (args: number[]) => number> = {
  abs: ([a]) => Math.abs(a),
  min: (args) => Math.min(...args),
  max: (args) => Math.max(...args),
  round: ([a]) => Math.round(a),
  floor: ([a]) => Math.floor(a),
  ceil: ([a]) => Math.ceil(a),
  gcd: ([a, b]) => gcd2(a, b),
  lcm: ([a, b]) => (a === 0 || b === 0 ? 0 : Math.abs(a * b) / gcd2(a, b)),
  sqrt: ([a]) => Math.sqrt(a),
  pow: ([a, b]) => Math.pow(a, b),
};

function truthy(n: number): boolean {
  return n !== 0 && !Number.isNaN(n);
}

export function evalExpr(ast: ExprNode, vars: Record<string, number>): number {
  switch (ast.kind) {
    case "num":
      return ast.value;
    case "var": {
      const v = vars[ast.name];
      if (v === undefined) throw new ExprEvalError(`Variable no definida: "${ast.name}"`);
      return v;
    }
    case "unary": {
      const v = evalExpr(ast.arg, vars);
      return ast.op === "-" ? -v : truthy(v) ? 0 : 1;
    }
    case "call": {
      const fn = FUNCTIONS[ast.name];
      if (!fn) throw new ExprEvalError(`Función no reconocida: "${ast.name}"`);
      return fn(ast.args.map((a) => evalExpr(a, vars)));
    }
    case "binary": {
      const l = evalExpr(ast.left, vars);
      // Cortocircuito para && / || — evita evaluar el lado derecho si no hace falta.
      if (ast.op === "&&") return truthy(l) ? (truthy(evalExpr(ast.right, vars)) ? 1 : 0) : 0;
      if (ast.op === "||") return truthy(l) ? 1 : truthy(evalExpr(ast.right, vars)) ? 1 : 0;
      const r = evalExpr(ast.right, vars);
      switch (ast.op) {
        case "+":
          return l + r;
        case "-":
          return l - r;
        case "*":
          return l * r;
        case "/":
          return l / r;
        case "%":
          return l % r;
        case "^":
          return Math.pow(l, r);
        case "<":
          return l < r ? 1 : 0;
        case "<=":
          return l <= r ? 1 : 0;
        case ">":
          return l > r ? 1 : 0;
        case ">=":
          return l >= r ? 1 : 0;
        case "==":
          return l === r ? 1 : 0;
        case "!=":
          return l !== r ? 1 : 0;
        default:
          throw new ExprEvalError(`Operador no reconocido: "${ast.op}"`);
      }
    }
  }
}

/** Formatea un número resultado de plantilla: entero tal cual, decimal
 *  redondeado a 2 posiciones sin ceros de más (`3.50` → `3.5`). */
function formatTemplateNumber(n: number): string {
  if (Number.isInteger(n)) return String(n);
  return String(Math.round(n * 100) / 100);
}

/**
 * Reemplaza cada `{expr}` de `tpl` por el resultado de evaluar `expr` contra
 * `vars` — `{a}`, `{answer}` (si `vars.answer` está presente), o cualquier
 * expresión como `{a+b}`. Lanza si alguna expresión no parsea o no evalúa:
 * a esta altura ya se validó en `validateCustomModule`, así que un error acá
 * es un bug de datos, no algo que el jugador deba ver silenciado.
 */
export function fillTemplate(tpl: string, vars: Record<string, number>): string {
  return tpl.replace(/\{([^{}]+)\}/g, (_match, inner: string) => {
    const result = parseExpr(inner.trim());
    if ("error" in result) {
      throw new ExprEvalError(`Plantilla inválida en "{${inner}}": ${result.error}`);
    }
    return formatTemplateNumber(evalExpr(result.ast, vars));
  });
}
