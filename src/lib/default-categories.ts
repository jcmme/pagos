// Fuente única de las categorías iniciales: la usan tanto el seed local como
// /api/setup en producción, para que ambos entornos arranquen igual.
//
// `essential` marca los gastos indispensables, que son la base del cálculo de
// meses de fondo de emergencia.
type DefaultCategory = {
  name: string;
  color: string;
  essential: boolean;
  /** Solo Ahorro la lleva: es la categoría donde cae lo que no se reparte. */
  savings?: boolean;
  children: string[];
};

export const DEFAULT_CATEGORIES: DefaultCategory[] = [
  {
    name: "Comida",
    color: "#d15c56",
    essential: true,
    children: ["Súper", "Restaurantes", "Café"],
  },
  {
    name: "Transporte",
    color: "#009bbe",
    essential: true,
    children: ["Gasolina", "Transporte público", "Taxi/App", "Mantenimiento"],
  },
  {
    name: "Vivienda",
    color: "#a38300",
    essential: true,
    children: ["Renta/Hipoteca", "Mantenimiento", "Muebles"],
  },
  {
    name: "Servicios",
    color: "#c65b93",
    essential: true,
    children: ["Luz", "Agua", "Internet", "Teléfono", "Suscripciones"],
  },
  {
    name: "Salud",
    color: "#4087de",
    essential: true,
    children: ["Consultas", "Medicamentos", "Seguro"],
  },
  {
    name: "Ocio",
    color: "#a269c9",
    essential: false,
    children: ["Salidas", "Viajes", "Compras"],
  },
  {
    name: "Ingresos",
    color: "#409d48",
    essential: false,
    children: ["Sueldo", "Extras"],
  },
  // Ahorro es la única con `savings`: es donde cae lo que no repartas al
  // asignar porcentajes. La marca va en la base y no en el nombre, para que
  // renombrarla no rompa el cálculo.
  {
    name: "Ahorro",
    color: "#0f8a7e",
    essential: false,
    savings: true,
    children: [],
  },
  { name: "Otros", color: "#a1a1a6", essential: false, children: [] },
];
