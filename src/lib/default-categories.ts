// Fuente única de las categorías iniciales: la usan tanto el seed local como
// /api/setup en producción, para que ambos entornos arranquen igual.
//
// `essential` marca los gastos indispensables, que son la base del cálculo de
// meses de fondo de emergencia.
export const DEFAULT_CATEGORIES = [
  {
    name: "Comida",
    color: "#0a84ff",
    essential: true,
    children: ["Súper", "Restaurantes", "Café"],
  },
  {
    name: "Transporte",
    color: "#30d158",
    essential: true,
    children: ["Gasolina", "Transporte público", "Taxi/App", "Mantenimiento"],
  },
  {
    name: "Vivienda",
    color: "#ff9f0a",
    essential: true,
    children: ["Renta/Hipoteca", "Mantenimiento", "Muebles"],
  },
  {
    name: "Servicios",
    color: "#ff453a",
    essential: true,
    children: ["Luz", "Agua", "Internet", "Teléfono", "Suscripciones"],
  },
  {
    name: "Salud",
    color: "#64d2ff",
    essential: true,
    children: ["Consultas", "Medicamentos", "Seguro"],
  },
  {
    name: "Ocio",
    color: "#bf5af2",
    essential: false,
    children: ["Salidas", "Viajes", "Compras"],
  },
  {
    name: "Ingresos",
    color: "#30d158",
    essential: false,
    children: ["Sueldo", "Extras"],
  },
  { name: "Otros", color: "#a1a1a6", essential: false, children: [] },
];
