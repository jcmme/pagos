import {
  Baby,
  Banknote,
  Beef,
  Bike,
  BookOpen,
  Briefcase,
  Bus,
  Car,
  CarTaxiFront,
  CircleDollarSign,
  Coffee,
  CreditCard,
  Croissant,
  Dog,
  Droplet,
  Dumbbell,
  Film,
  Fuel,
  Gamepad2,
  Gift,
  GraduationCap,
  Hammer,
  HeartPulse,
  House,
  Landmark,
  Laptop,
  Lightbulb,
  Music,
  PartyPopper,
  PiggyBank,
  Pill,
  Plane,
  Receipt,
  Repeat,
  Scissors,
  Shirt,
  ShoppingBag,
  ShoppingCart,
  Smartphone,
  Sofa,
  Stethoscope,
  Tag,
  Ticket,
  TrainFront,
  TrendingUp,
  Utensils,
  Wallet,
  Wifi,
  Wrench,
  type LucideIcon,
} from "lucide-react";

// El catálogo de iconos de categoría. Lo que se guarda en Category.icon es la
// clave, no el componente, así que renombrar un icono aquí no rompe los datos
// mientras la clave siga existiendo.
//
// Los trazos son de lucide, que ya era la librería de iconos del proyecto. Lo
// propio de la app es cómo se dibujan (ver CategoryGlyph) y el color, que sale
// de la categoría.

export const CATEGORY_ICONS = {
  // Comida
  utensils: Utensils,
  cart: ShoppingCart,
  coffee: Coffee,
  croissant: Croissant,
  beef: Beef,
  // Transporte
  car: Car,
  fuel: Fuel,
  bus: Bus,
  taxi: CarTaxiFront,
  train: TrainFront,
  bike: Bike,
  // Casa
  house: House,
  sofa: Sofa,
  hammer: Hammer,
  wrench: Wrench,
  // Servicios
  bulb: Lightbulb,
  water: Droplet,
  wifi: Wifi,
  phone: Smartphone,
  subscription: Repeat,
  // Salud
  health: HeartPulse,
  doctor: Stethoscope,
  pill: Pill,
  gym: Dumbbell,
  // Ocio
  party: PartyPopper,
  plane: Plane,
  bag: ShoppingBag,
  ticket: Ticket,
  game: Gamepad2,
  music: Music,
  film: Film,
  // Personal
  school: GraduationCap,
  book: BookOpen,
  baby: Baby,
  pet: Dog,
  shirt: Shirt,
  haircut: Scissors,
  gift: Gift,
  laptop: Laptop,
  // Dinero
  wallet: Wallet,
  cash: Banknote,
  bank: Landmark,
  savings: PiggyBank,
  invest: TrendingUp,
  card: CreditCard,
  work: Briefcase,
  receipt: Receipt,
  money: CircleDollarSign,
  tag: Tag,
} satisfies Record<string, LucideIcon>;

export type CategoryIconName = keyof typeof CATEGORY_ICONS;

/** Agrupado para el selector, que si no son cincuenta iconos en desorden. */
export const ICON_GROUPS: { label: string; icons: CategoryIconName[] }[] = [
  { label: "Comida", icons: ["utensils", "cart", "coffee", "croissant", "beef"] },
  { label: "Transporte", icons: ["car", "fuel", "bus", "taxi", "train", "bike"] },
  { label: "Casa", icons: ["house", "sofa", "hammer", "wrench"] },
  { label: "Servicios", icons: ["bulb", "water", "wifi", "phone", "subscription"] },
  { label: "Salud", icons: ["health", "doctor", "pill", "gym"] },
  { label: "Ocio", icons: ["party", "plane", "bag", "ticket", "game", "music", "film"] },
  {
    label: "Personal",
    icons: ["school", "book", "baby", "pet", "shirt", "haircut", "gift", "laptop"],
  },
  {
    label: "Dinero",
    icons: ["wallet", "cash", "bank", "savings", "invest", "card", "work", "receipt", "money", "tag"],
  },
];

// Palabras que delatan de qué es una categoría. Se recorre en orden, así que
// lo específico va antes que lo general: "transporte público" debe dar bus y
// no el coche de "transporte".
const HINTS: [RegExp, CategoryIconName][] = [
  [/super|mercado|despensa|abarrot/i, "cart"],
  [/restaurant|comer fuera|taquer/i, "utensils"],
  [/caf[eé]|starbucks/i, "coffee"],
  [/comida|aliment/i, "utensils"],
  [/gasolina|combustible/i, "fuel"],
  [/transporte p[uú]blico|metro|autob[uú]s|cami[oó]n/i, "bus"],
  [/taxi|uber|didi/i, "taxi"],
  [/mantenimiento/i, "wrench"],
  [/transporte|coche|auto|veh[ií]culo/i, "car"],
  [/renta|hipoteca|vivienda|casa|hogar/i, "house"],
  [/mueble/i, "sofa"],
  [/luz|electricidad|cfe/i, "bulb"],
  [/agua/i, "water"],
  [/internet|cable/i, "wifi"],
  [/tel[eé]fono|celular|m[oó]vil/i, "phone"],
  [/suscripci/i, "subscription"],
  [/servicio/i, "bulb"],
  // Antes que el patrón de "médico": "medicamentos" contiene "medic".
  [/medicamento|farmacia|medicina/i, "pill"],
  [/consulta|m[eé]dic|doctor/i, "doctor"],
  [/gimnasio|gym|deporte/i, "gym"],
  [/salud|seguro/i, "health"],
  [/viaje|vuelo|vacacion/i, "plane"],
  [/salida|fiesta|bar|antro/i, "party"],
  [/compra|ropa|shopping/i, "bag"],
  [/cine|pel[ií]cula/i, "film"],
  [/m[uú]sica|spotify/i, "music"],
  [/juego|videojuego/i, "game"],
  [/ocio|entreten/i, "ticket"],
  [/escuela|colegiatura|colegio|universidad|educaci/i, "school"],
  [/libro|papeler/i, "book"],
  [/beb[eé]|guarder/i, "baby"],
  [/mascota|perro|gato|veterinar/i, "pet"],
  [/uniforme|ropa/i, "shirt"],
  [/corte|est[eé]tica|peluquer/i, "haircut"],
  [/regalo/i, "gift"],
  [/sueldo|salario|n[oó]mina/i, "work"],
  [/ingreso|extra/i, "money"],
  [/ahorro|meta/i, "savings"],
  [/inversi/i, "invest"],
  [/tarjeta/i, "card"],
  [/banco/i, "bank"],
  [/efectivo/i, "cash"],
  // El cajón de sastre, al final para que no le gane a nada específico.
  [/otros?|varios|miscel/i, "tag"],
];

/**
 * Adivina el icono por el nombre. Solo se usa al sembrar y al crear una
 * categoría: es una sugerencia inicial, nunca sobrescribe lo que se eligió a
 * mano. Para un nombre propio como "Loreto" devuelve null y se ve la inicial,
 * que es la respuesta correcta.
 */
export function guessIcon(name: string): CategoryIconName | null {
  // Sin acentos: si no, "Súper" no casaría con /super/ y la mitad de las
  // categorías en español se quedarían sin icono.
  const plain = name.normalize("NFD").replace(/\p{Diacritic}/gu, "");
  for (const [pattern, icon] of HINTS) {
    if (pattern.test(plain)) return icon;
  }
  return null;
}
