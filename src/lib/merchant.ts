// Normalización de descripciones bancarias. Es la pieza compartida por las
// reglas de categorización, la detección de duplicados y la de suscripciones:
// las tres necesitan que "OXXO GAS #4412 CDMX 15/09" y "OXXO GAS QRO" se
// reconozcan como el mismo comercio.

// Ruido típico de los estados de cuenta mexicanos.
const NOISE = [
  /\b\d{2}[/-]\d{2}([/-]\d{2,4})?\b/g, // fechas
  /\bref(erencia)?[:.]?\s*\w+/gi,
  /\baut(orizacion)?[:.]?\s*\w+/gi,
  /\bfolio[:.]?\s*\w+/gi,
  /\bno\.?\s*\d+/gi,
  /[*#]+\d+/g, // terminaciones de tarjeta
  /\b\d{4,}\b/g, // números largos sueltos
  /\bmxn?\b/gi,
  /\bspei\b/gi,
  /\bcompra\b/gi,
  /\bpago\b/gi,
  /\btarjeta\b/gi,
];

export function normalizeMerchant(raw: string | null | undefined): string | null {
  if (!raw) return null;

  let value = raw
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // acentos
    .toUpperCase();

  for (const pattern of NOISE) {
    value = value.replace(pattern, " ");
  }

  value = value
    .replace(/[^A-Z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!value) return null;

  // Dos palabras bastan para identificar el comercio y evitan que la sucursal
  // convierta cada cargo en un comercio distinto.
  return value.split(" ").slice(0, 2).join(" ");
}

export function matchesPattern(
  text: string,
  pattern: string,
  matchType: "CONTAINS" | "STARTS_WITH" | "EXACT" | "REGEX"
): boolean {
  const haystack = text.toUpperCase();
  const needle = pattern.toUpperCase();

  switch (matchType) {
    case "CONTAINS":
      return haystack.includes(needle);
    case "STARTS_WITH":
      return haystack.startsWith(needle);
    case "EXACT":
      return haystack === needle;
    case "REGEX":
      try {
        return new RegExp(pattern, "i").test(text);
      } catch {
        // Una regla con regex inválida no debe tumbar la importación entera.
        return false;
      }
  }
}
