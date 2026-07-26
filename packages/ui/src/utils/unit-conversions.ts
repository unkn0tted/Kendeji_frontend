type ConversionType =
  | "centsToDollars"
  | "dollarsToCents"
  | "bitsToMb"
  | "mbToBits"
  | "bytesToGb"
  | "gbToBytes";

const KIB = 1024;
const MIB = KIB * KIB;
const GIB = MIB * KIB;

const conversionConfig: Record<
  ConversionType,
  { convert: (value: number) => number; precision: number }
> = {
  centsToDollars: { convert: (value) => value / 100, precision: 2 },
  dollarsToCents: { convert: (value) => value * 100, precision: 0 },
  bitsToMb: { convert: (value) => value / MIB, precision: 2 },
  mbToBits: { convert: (value) => value * MIB, precision: 0 },
  bytesToGb: { convert: (value) => value / GIB, precision: 2 },
  gbToBytes: { convert: (value) => value * GIB, precision: 0 },
};

/**
 * Rounds to a fixed number of decimals, matching the previous
 * mathjs `format(x, { notation: "fixed", precision })` behaviour.
 *
 * `toFixed` cannot be used directly: it rounds the underlying binary double,
 * so 0.495 (stored as 0.49499999999999999556) becomes 0.49, whereas mathjs
 * rounds the shortest decimal representation and yields 0.50. Shifting the
 * decimal point textually reproduces mathjs' result.
 */
function toFixedNumber(value: number, precision: number) {
  if (!Number.isFinite(value)) return value;

  const representation = String(Math.abs(value));
  // Magnitudes that stringify in exponential form are far outside the range
  // where fixed-decimal rounding is meaningful; textual shifting cannot apply.
  if (representation.includes("e")) {
    return Number(value.toFixed(precision));
  }

  const shifted = Math.round(Number(`${representation}e${precision}`));
  const shiftedRepresentation = String(shifted);
  // The shifted magnitude can itself cross into exponential notation.
  if (!Number.isFinite(shifted) || shiftedRepresentation.includes("e")) {
    return Number(value.toFixed(precision));
  }

  const rounded = Number(`${shiftedRepresentation}e-${precision}`);
  return value < 0 ? -rounded : rounded;
}

export function unitConversion(type: ConversionType, value?: number | string) {
  if (!value) return 0;

  const config = conversionConfig[type];
  if (!config) throw new Error("Invalid conversion type");

  return toFixedNumber(config.convert(Number(value)), config.precision);
}

/**
 * Minimal arithmetic evaluator supporting `+ - * / ( )`, decimal literals and
 * unary sign. Replaces mathjs' `evaluate`, which cost ~185KB gzipped for what
 * callers only ever use as plain number arithmetic.
 */
function evaluateArithmetic(expression: string) {
  let cursor = 0;

  // `charAt` rather than indexing: it yields "" past the end instead of
  // `undefined`, so every scan loop terminates naturally on its own predicate.
  const peek = () => expression.charAt(cursor);

  const skipWhitespace = () => {
    while (/\s/.test(peek())) {
      cursor++;
    }
  };

  const parseExpression = (): number => {
    let left = parseTerm();
    skipWhitespace();
    while (peek() === "+" || peek() === "-") {
      const operator = peek();
      cursor++;
      const right = parseTerm();
      left = operator === "+" ? left + right : left - right;
      skipWhitespace();
    }
    return left;
  };

  const parseTerm = (): number => {
    let left = parseFactor();
    skipWhitespace();
    while (peek() === "*" || peek() === "/") {
      const operator = peek();
      cursor++;
      const right = parseFactor();
      left = operator === "*" ? left * right : left / right;
      skipWhitespace();
    }
    return left;
  };

  const parseFactor = (): number => {
    skipWhitespace();
    const char = peek();

    if (char === "+" || char === "-") {
      cursor++;
      const value = parseFactor();
      return char === "-" ? -value : value;
    }

    if (char === "(") {
      cursor++;
      const value = parseExpression();
      skipWhitespace();
      if (peek() !== ")") {
        throw new Error(`Unbalanced parenthesis in expression: ${expression}`);
      }
      cursor++;
      return value;
    }

    const start = cursor;
    while (/[\d.]/.test(peek())) {
      cursor++;
    }
    if (start === cursor) {
      throw new Error(`Invalid expression: ${expression}`);
    }
    const value = Number(expression.slice(start, cursor));
    if (Number.isNaN(value)) {
      throw new Error(`Invalid number in expression: ${expression}`);
    }
    return value;
  };

  const result = parseExpression();
  skipWhitespace();
  if (cursor !== expression.length) {
    throw new Error(`Unexpected token in expression: ${expression}`);
  }
  return result;
}

export function evaluateWithPrecision(expression: string) {
  return toFixedNumber(evaluateArithmetic(expression), 2);
}
