// El teclado de captura es una calculadora: se puede escribir 43+567+2056 y
// el total se recalcula en cada tecla. Todo vive aquí, sin React, para poder
// probarlo sin navegador y para que la hoja de captura solo se ocupe de la UI.
//
// No se usa eval ni Function: la entrada viene del teclado propio, pero un
// intérprete de doce líneas es más barato que razonar sobre por qué eval es
// seguro aquí y seguirá siéndolo.

export const OPERATORS = ["+", "-", "*", "/"] as const;
export type Operator = (typeof OPERATORS)[number];

const MAX_DECIMALS = 2;

function isOperator(char: string): char is Operator {
  return (OPERATORS as readonly string[]).includes(char);
}

/** El operando que se está escribiendo: lo que va después del último operador. */
function lastOperand(expression: string): string {
  for (let i = expression.length - 1; i >= 0; i--) {
    if (isOperator(expression[i])) return expression.slice(i + 1);
  }
  return expression;
}

/**
 * Aplica una tecla a la expresión y devuelve la nueva.
 *
 * Las reglas son las mismas que tenía el teclado de solo dígitos, pero ahora
 * valen **por operando** y no para toda la cadena: en 12.50+3.7 cada número
 * lleva su propio punto decimal.
 */
export function appendKey(expression: string, key: string): string {
  if (key === "back") return expression.slice(0, -1);

  if (isOperator(key)) {
    // Un operador al principio no significa nada, y dos seguidos son casi
    // siempre una corrección: gana el último que se tocó.
    if (expression === "") return "";
    if (isOperator(expression[expression.length - 1])) {
      return expression.slice(0, -1) + key;
    }
    return expression + key;
  }

  const operand = lastOperand(expression);

  if (key === ".") {
    if (operand.includes(".")) return expression;
    return operand === "" ? `${expression}0.` : `${expression}.`;
  }

  const [, decimals] = operand.split(".");
  if (decimals !== undefined && decimals.length >= MAX_DECIMALS) return expression;

  // Un cero solo se reemplaza por el dígito: nadie escribe 0543.
  if (operand === "0") return expression.slice(0, -1) + key;

  return expression + key;
}

/**
 * Evalúa la expresión respetando la jerarquía: primero × y ÷, después + y −.
 * Devuelve null si no hay nada que evaluar o si hay una división entre cero.
 *
 * Un operador al final se ignora en vez de invalidar la expresión, para que el
 * total siga a la vista mientras se escribe el siguiente número.
 */
export function evaluateExpression(expression: string): number | null {
  let trimmed = expression;
  while (trimmed.length > 0 && isOperator(trimmed[trimmed.length - 1])) {
    trimmed = trimmed.slice(0, -1);
  }
  if (trimmed === "") return null;

  const numbers: number[] = [];
  const operators: Operator[] = [];
  let current = "";

  for (const char of trimmed) {
    if (isOperator(char)) {
      const value = Number(current);
      if (current === "" || Number.isNaN(value)) return null;
      numbers.push(value);
      operators.push(char);
      current = "";
    } else {
      current += char;
    }
  }
  const last = Number(current);
  if (current === "" || Number.isNaN(last)) return null;
  numbers.push(last);

  // Primera pasada: multiplicaciones y divisiones, colapsando hacia atrás.
  for (let i = 0; i < operators.length; ) {
    const operator = operators[i];
    if (operator !== "*" && operator !== "/") {
      i++;
      continue;
    }
    const left = numbers[i];
    const right = numbers[i + 1];
    if (operator === "/" && right === 0) return null;
    numbers.splice(i, 2, operator === "*" ? left * right : left / right);
    operators.splice(i, 1);
  }

  let total = numbers[0];
  for (let i = 0; i < operators.length; i++) {
    total = operators[i] === "+" ? total + numbers[i + 1] : total - numbers[i + 1];
  }

  if (!Number.isFinite(total)) return null;
  // Los flotantes dejan basura (0.1+0.2), y el monto se guarda con dos
  // decimales de todos modos.
  return Math.round(total * 100) / 100;
}

const DISPLAY_SIGNS: Record<Operator, string> = {
  "+": "+",
  "-": "−",
  "*": "×",
  "/": "÷",
};

/** La expresión como se lee en pantalla, con los signos de verdad y espacios. */
export function formatExpression(expression: string): string {
  return expression.replace(/[+\-*/]/g, (char) => ` ${DISPLAY_SIGNS[char as Operator]} `).trim();
}

/** Si tiene al menos un operador, vale la pena enseñar la operación completa. */
export function hasOperation(expression: string): boolean {
  return expression.split("").some(isOperator);
}
