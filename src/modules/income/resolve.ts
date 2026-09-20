import { toNumber } from "@/lib/utils";

// Con cuánto dinero cuenta la persona en un mes dado.
//
// El interruptor de la pantalla de presupuestos decide qué se espera:
//
//   FIJO      el sueldo base vale para todos los meses; nunca hay que capturar
//             nada y nunca sale el aviso.
//   VARIABLE  cada mes trae su fila; un mes sin capturar no se calcula.
//
// En los dos modos una fila explícita del mes **siempre gana**, que es lo que
// permite registrar el aguinaldo o la quincena corta sin tocar el sueldo base.

export type IncomeMode = "FIJO" | "VARIABLE";

/** De dónde salió la cifra. La pantalla lo dice, para que nadie se pregunte
 *  por qué el reparto cambió al capturar un mes. */
export type IncomeSource = "MES" | "BASE" | "FALTA";

export type ResolvedIncome = {
  amount: number | null;
  source: IncomeSource;
};

export function resolveIncome(
  mode: IncomeMode,
  baseIncome: number | string | { toString(): string } | null | undefined,
  monthRow: { amount: number | string | { toString(): string } } | null | undefined
): ResolvedIncome {
  if (monthRow) {
    const amount = toNumber(monthRow.amount);
    if (Number.isFinite(amount) && amount > 0) return { amount, source: "MES" };
  }

  if (mode === "FIJO" && baseIncome !== null && baseIncome !== undefined) {
    const amount = toNumber(baseIncome);
    if (Number.isFinite(amount) && amount > 0) return { amount, source: "BASE" };
  }

  return { amount: null, source: "FALTA" };
}
